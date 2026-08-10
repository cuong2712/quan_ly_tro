using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Báo cáo Sự cố & Yêu cầu Bảo trì sửa chữa phòng trọ.
public class MaintenanceService(AppDbContext db)
{
    // Lấy danh sách sự cố bảo trì dành cho Chủ trọ (hỗ trợ phân trang).
    public async Task<object> GetByLandlordAsync(Guid landlordId, int? page = null, int? pageSize = null)
    {
        var query = db.MaintenanceRequests
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
        var profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == tenantUserId);
        if (profile == null)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == tenantUserId);
            if (user != null)
            {
                profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.User.Email == user.Email);
            }
        }

        if (profile == null) return [];

        var list = await db.MaintenanceRequests
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
        var profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == tenantUserId);
        if (profile == null)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == tenantUserId);
            if (user != null)
            {
                profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.User.Email == user.Email);
                if (profile == null)
                {
                    profile = new TenantProfile { UserId = user.Id, CCCD = "000000000000", MoveInDate = DateTime.UtcNow };
                    db.TenantProfiles.Add(profile);
                    await db.SaveChangesAsync();
                }
            }
        }

        if (profile == null) throw new KeyNotFoundException("Không tìm thấy hồ sơ người thuê.");
        
        Guid roomId = Guid.Empty;
        if (profile.RoomId.HasValue && profile.RoomId.Value != Guid.Empty)
        {
            roomId = profile.RoomId.Value;
        }
        else
        {
            var activeContract = await db.Contracts.FirstOrDefaultAsync(c => c.TenantProfileId == profile.Id && c.Status == ContractStatus.Active);
            if (activeContract != null)
            {
                roomId = activeContract.RoomId;
                profile.RoomId = roomId;
            }
            else
            {
                var anyRoom = await db.Rooms.FirstOrDefaultAsync();
                if (anyRoom != null)
                {
                    roomId = anyRoom.Id;
                    profile.RoomId = roomId;
                }
                else
                {
                    throw new InvalidOperationException("Chưa có phòng nào trong hệ thống để báo sự cố.");
                }
            }
            await db.SaveChangesAsync();
        }

        var priority = Enum.Parse<MaintenancePriority>(req.Priority, ignoreCase: true);
        var m = new MaintenanceRequest
        {
            RoomId = roomId,
            TenantProfileId = profile.Id,
            IssueType = req.IssueType,
            Title = req.Title,
            Description = req.Description,
            Priority = priority,
            ImageUrl = req.ImageUrl
        };
        db.MaintenanceRequests.Add(m);
        await db.SaveChangesAsync();

        var full = await db.MaintenanceRequests
            .Include(x => x.Room).ThenInclude(r => r.Zone)
            .Include(x => x.TenantProfile).ThenInclude(t => t.User)
            .FirstAsync(x => x.Id == m.Id);

        return MapReq(full);
    }

    // Chủ trọ cập nhật tiến độ sửa chữa, người thực hiện và ghi chú hoàn thành bảo trì.
    public async Task<MaintenanceRequestDto> UpdateAsync(Guid id, UpdateMaintenanceRequest req)
    {
        var m = await db.MaintenanceRequests
            .Include(x => x.Room)
            .Include(x => x.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(x => x.Id == id) ?? throw new KeyNotFoundException();

        m.Status = Enum.Parse<MaintenanceStatus>(req.Status, ignoreCase: true);
        if (req.AssignedTo != null) m.AssignedTo = req.AssignedTo;
        if (req.CompletionNote != null) m.CompletionNote = req.CompletionNote;
        if (m.Status == MaintenanceStatus.Completed) m.CompletedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
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
