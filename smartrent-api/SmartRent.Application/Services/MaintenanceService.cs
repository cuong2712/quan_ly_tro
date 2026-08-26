using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Báo cáo Sự cố & Yêu cầu Bảo trì sửa chữa phòng trọ & thông báo realtime.
public class MaintenanceService(AppDbContext db, NotificationService notificationService)
{
    // Lấy danh sách sự cố bảo trì dành cho Chủ trọ (hỗ trợ phân trang).
    public async Task<object> GetByLandlordAsync(Guid landlordId, int? page = null, int? pageSize = null)
    {
        var query = db.MaintenanceRequests
            .AsNoTracking()
            .Include(m => m.Room).ThenInclude(r => r.Zone)
            .Include(m => m.TenantProfile).ThenInclude(t => t.User)
            .Where(m => m.Room.Zone.LandlordId == landlordId || (m.TenantProfile != null && m.TenantProfile.Room != null && m.TenantProfile.Room.Zone.LandlordId == landlordId));
        var totalItems = await query.CountAsync();
        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            var items = await query.OrderByDescending(m => m.CreatedAt)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = items.Select(MapReq);
            return PagedResult<MaintenanceRequestDto>.Create(dtos, totalItems, p, ps);
        }
        var list = await query.OrderByDescending(m => m.CreatedAt).ToListAsync();
        return list.Select(MapReq);
    }

    // Lấy danh sách các báo cáo sự cố do chính Khách thuê tạo (theo UserId).
    public async Task<IEnumerable<MaintenanceRequestDto>> GetByTenantUserIdAsync(Guid tenantUserId)
    {
        var profile = await db.TenantProfiles.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == tenantUserId);
        if (profile == null)
        {
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == tenantUserId);
            if (user != null)
            {
                profile = await db.TenantProfiles.AsNoTracking().FirstOrDefaultAsync(t => t.User.Email == user.Email);
            }
        }

        if (profile == null) return [];

        var list = await db.MaintenanceRequests
            .AsNoTracking()
            .Include(m => m.Room)
            .Include(m => m.TenantProfile).ThenInclude(t => t.User)
            .Where(m => m.TenantProfileId == profile.Id)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();

        return list.Select(MapReq);
    }

    // Khách thuê gửi báo cáo sự cố hư hỏng (điện, nước, cơ sở vật chất...) kèm hình ảnh minh họa.
    public async Task<MaintenanceRequestDto> CreateAsync(Guid tenantUserId, CreateMaintenanceRequest req)
    {
        var profile = await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.UserId == tenantUserId);
        if (profile == null)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == tenantUserId);
            if (user != null)
            {
                profile = await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.User.Email == user.Email);
            }
        }

        if (profile == null) throw new KeyNotFoundException("Không tìm thấy hồ sơ người thuê.");
        
        var today = DateTime.UtcNow.Date;
        var currentContract = await db.Contracts
            .Where(c => c.TenantProfileId == profile.Id || (c.TenantProfile != null && c.TenantProfile.UserId == tenantUserId))
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync();

        if (currentContract == null || currentContract.Status == ContractStatus.Liquidated)
        {
            throw new InvalidOperationException("Hợp đồng phòng trọ của bạn đã kết thúc hoặc bạn chưa được gán phòng nên không thể gửi yêu cầu bảo trì mới.");
        }

        // Kiểm tra hợp đồng hết hạn
        if (currentContract.Status == ContractStatus.Expired || 
            (currentContract.Status != ContractStatus.RenewRequested && currentContract.EndDate.Date < today))
        {
            throw new InvalidOperationException("Hợp đồng hết hạn vui lòng gia hạn hợp đồng");
        }

        Guid roomId = Guid.Empty;
        if (profile.RoomId.HasValue && profile.RoomId.Value != Guid.Empty)
        {
            roomId = profile.RoomId.Value;
        }
        else
        {
            roomId = currentContract.RoomId;
            profile.RoomId = roomId;
            await db.SaveChangesAsync();
        }

        if (roomId == Guid.Empty)
        {
            throw new InvalidOperationException("Hợp đồng phòng trọ của bạn đã kết thúc hoặc bạn chưa được gán phòng nên không thể gửi yêu cầu bảo trì mới.");
        }

        var room = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == roomId)
            ?? throw new KeyNotFoundException("Phòng trọ không tồn tại.");

        var priority = Enum.TryParse<MaintenancePriority>(req.Priority, true, out var pr) ? pr : MaintenancePriority.Medium;
        var issueType = string.IsNullOrWhiteSpace(req.IssueType) ? "Cơ sở vật chất" : req.IssueType;
        var m = new MaintenanceRequest
        {
            RoomId = roomId,
            TenantProfileId = profile.Id,
            IssueType = issueType,
            Title = req.Title,
            Description = req.Description,
            Priority = priority,
            ImageUrl = req.ImageUrl
        };
        db.MaintenanceRequests.Add(m);
        await db.SaveChangesAsync();

        // Tự động tạo thông báo gửi đến Chủ trọ quản lý khu này
        Guid landlordId = room.Zone?.LandlordId ?? Guid.Empty;
        if (landlordId == Guid.Empty && room.ZoneId != Guid.Empty)
        {
            landlordId = await db.Zones.Where(z => z.Id == room.ZoneId).Select(z => z.LandlordId).FirstOrDefaultAsync();
        }

        if (landlordId != Guid.Empty)
        {
            var senderName = profile.User?.FullName ?? "Khách thuê";
            var zoneName = room.Zone?.Name ?? "Khu trọ";
            await notificationService.SendNotificationAsync(
                tenantUserId,
                $"🛠️ Báo cáo sự cố: Phòng P.{room.RoomNumber} - {req.Title}",
                $"Khách thuê {senderName} (Phòng P.{room.RoomNumber} - {zoneName}) vừa gửi báo cáo sự cố '{req.Title}' (Loại: {issueType}, Mức độ: {priority}). Vui lòng vào mục Bảo trì để kiểm tra và xử lý.",
                NotificationTarget.User,
                landlordId
            );
        }

        var full = await db.MaintenanceRequests
            .Include(x => x.Room).ThenInclude(r => r.Zone)
            .Include(x => x.TenantProfile).ThenInclude(t => t.User)
            .FirstAsync(x => x.Id == m.Id);

        return MapReq(full);
    }

    // Chủ trọ chủ động tạo phiếu bảo trì / sửa chữa cho phòng
    public async Task<MaintenanceRequestDto> CreateByLandlordAsync(Guid landlordId, CreateMaintenanceRequest req)
    {
        if (!req.RoomId.HasValue || req.RoomId.Value == Guid.Empty)
        {
            throw new InvalidOperationException("Vui lòng chọn phòng cần bảo trì.");
        }

        var room = await db.Rooms
            .Include(r => r.Zone)
            .Include(r => r.Tenants).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(r => r.Id == req.RoomId.Value && r.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Phòng trọ không tồn tại hoặc bạn không có quyền quản lý.");

        var tenantProfile = await db.TenantProfiles
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.RoomId == room.Id)
            ?? await db.Contracts
                .Where(c => c.RoomId == room.Id && c.Status == ContractStatus.Active)
                .Select(c => c.TenantProfile)
                .Include(t => t.User)
                .FirstOrDefaultAsync()
            ?? await db.TenantProfiles.FirstOrDefaultAsync(t => t.LandlordId == landlordId || (t.Room != null && t.Room.Zone.LandlordId == landlordId))
            ?? await db.TenantProfiles.FirstOrDefaultAsync();

        if (tenantProfile == null)
        {
            tenantProfile = new TenantProfile
            {
                UserId = landlordId,
                LandlordId = landlordId,
                CCCD = "000000000000",
                RoomId = room.Id
            };
            db.TenantProfiles.Add(tenantProfile);
            await db.SaveChangesAsync();
        }

        var priority = Enum.TryParse<MaintenancePriority>(req.Priority, true, out var p) ? p : MaintenancePriority.Medium;
        var issueType = string.IsNullOrWhiteSpace(req.IssueType) ? "Cơ sở vật chất" : req.IssueType;

        var m = new MaintenanceRequest
        {
            RoomId = room.Id,
            TenantProfileId = tenantProfile.Id,
            IssueType = issueType,
            Title = req.Title,
            Description = req.Description,
            Priority = priority,
            Status = !string.IsNullOrWhiteSpace(req.AssignedTo) ? MaintenanceStatus.InProgress : MaintenanceStatus.Pending,
            AssignedTo = req.AssignedTo,
            ImageUrl = req.ImageUrl
        };

        db.MaintenanceRequests.Add(m);
        await db.SaveChangesAsync();

        // Gửi thông báo đến khách thuê nếu phòng đang có khách ở
        var activeTenantUser = room.Tenants.FirstOrDefault()?.User;
        if (activeTenantUser != null && activeTenantUser.Id != landlordId)
        {
            await notificationService.SendNotificationAsync(
                landlordId,
                $"🛠️ Thông báo bảo trì: Phòng P.{room.RoomNumber} - {req.Title}",
                $"Chủ trọ đã lên lịch bảo trì/sửa chữa: '{req.Title}' cho phòng của bạn. Mức độ ưu tiên: {priority}.",
                NotificationTarget.User,
                activeTenantUser.Id
            );
        }

        var full = await db.MaintenanceRequests
            .Include(x => x.Room).ThenInclude(r => r.Zone)
            .Include(x => x.TenantProfile).ThenInclude(t => t.User)
            .FirstAsync(x => x.Id == m.Id);

        return MapReq(full);
    }

    // Chủ trọ xóa yêu cầu bảo trì
    public async Task<bool> DeleteAsync(Guid id, Guid landlordId)
    {
        var m = await db.MaintenanceRequests
            .Include(x => x.Room).ThenInclude(r => r.Zone)
            .FirstOrDefaultAsync(x => x.Id == id && x.Room.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Yêu cầu bảo trì không tồn tại hoặc bạn không có quyền xóa.");

        db.MaintenanceRequests.Remove(m);
        await db.SaveChangesAsync();
        return true;
    }

    // Chủ trọ cập nhật tiến độ sửa chữa, người thực hiện và ghi chú hoàn thành bảo trì (kiểm tra quyền sở hữu).
    public async Task<MaintenanceRequestDto> UpdateAsync(Guid id, Guid landlordId, UpdateMaintenanceRequest req)
    {
        var m = await db.MaintenanceRequests
            .Include(x => x.Room).ThenInclude(r => r.Zone)
            .Include(x => x.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(x => x.Id == id && x.Room.Zone.LandlordId == landlordId) 
            ?? throw new KeyNotFoundException("Yêu cầu bảo trì không tồn tại hoặc bạn không có quyền cập nhật.");

        m.Status = Enum.Parse<MaintenanceStatus>(req.Status, ignoreCase: true);
        if (req.AssignedTo != null) m.AssignedTo = req.AssignedTo;
        if (req.CompletionNote != null) m.CompletionNote = req.CompletionNote;
        if (m.Status == MaintenanceStatus.Completed) m.CompletedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        // Tự động tạo thông báo gửi đến Khách thuê khi trạng thái được cập nhật
        if (m.TenantProfile != null)
        {
            var statusLabel = m.Status switch
            {
                MaintenanceStatus.Completed => "✅ Đã hoàn thành",
                MaintenanceStatus.InProgress => "⚙️ Đang xử lý",
                MaintenanceStatus.Cancelled => "❌ Đã hủy",
                _ => "⏳ Đang chờ xử lý"
            };

            await notificationService.SendNotificationAsync(
                landlordId,
                $"Cập nhật tiến độ sự cố phòng {m.Room?.RoomNumber}",
                $"Sự cố '{m.Title}' đã được cập nhật sang: {statusLabel}. Ghi chú từ chủ trọ: {m.CompletionNote ?? "Đang được xử lý"}.",
                NotificationTarget.User,
                m.TenantProfile.UserId
            );
        }

        return MapReq(m);
    }

    // Khách thuê hủy yêu cầu báo sự cố (chỉ hủy được khi trạng thái đang là Pending)
    public async Task<MaintenanceRequestDto> CancelAsync(Guid id, Guid tenantUserId)
    {
        var profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == tenantUserId);
        if (profile == null)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == tenantUserId);
            if (user != null)
            {
                profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.User.Email == user.Email);
            }
        }

        var m = await db.MaintenanceRequests
            .Include(x => x.Room).ThenInclude(r => r.Zone)
            .Include(x => x.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(x => x.Id == id && (x.TenantProfileId == (profile != null ? profile.Id : Guid.Empty) || x.TenantProfile.UserId == tenantUserId))
            ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu bảo trì hoặc bạn không có quyền thao tác.");

        if (m.Status != MaintenanceStatus.Pending)
        {
            throw new InvalidOperationException("Chỉ có thể hủy yêu cầu khi đang ở trạng thái 'Chờ xử lý'.");
        }

        m.Status = MaintenanceStatus.Cancelled;
        await db.SaveChangesAsync();

        // Tự động thông báo cho Chủ trọ biết khách đã hủy yêu cầu
        Guid landlordId = m.Room?.Zone?.LandlordId ?? Guid.Empty;
        if (landlordId != Guid.Empty)
        {
            var senderName = m.TenantProfile?.User?.FullName ?? "Khách thuê";
            await notificationService.SendNotificationAsync(
                tenantUserId,
                $"[Hủy Yêu Cầu] Khách thuê hủy báo hỏng phòng P.{m.Room?.RoomNumber}",
                $"Khách thuê {senderName} (Phòng P.{m.Room?.RoomNumber}) đã hủy yêu cầu sự cố '{m.Title}'.",
                NotificationTarget.User,
                landlordId
            );
        }

        return MapReq(m);
    }

    private static MaintenanceRequestDto MapReq(MaintenanceRequest m) => new(
        m.Id,
        m.RoomId,
        m.Room?.RoomNumber ?? "101",
        m.TenantProfile?.User?.FullName ?? "Khách thuê",
        m.TenantProfile?.User?.Phone ?? "",
        m.IssueType,
        m.Title,
        m.Description,
        m.Priority.ToString(),
        m.Status.ToString(),
        m.AssignedTo,
        m.ImageUrl,
        m.CompletionNote,
        m.CreatedAt,
        m.CompletedAt
    );
}
