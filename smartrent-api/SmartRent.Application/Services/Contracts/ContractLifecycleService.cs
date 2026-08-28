using Microsoft.EntityFrameworkCore;
using SmartRent.Application.Common.Mappings;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Contracts;

// Dịch vụ quản lý vòng đời Hợp đồng (Tạo, Sửa, Xóa, Thanh lý, Gia hạn & Cảnh báo hết hạn)
public class ContractLifecycleService(AppDbContext db, NotificationService notificationService)
{
    // Tạo mới Hợp đồng thuê nhà và tự động đổi trạng thái phòng thành Occupied (Đã ở).
    // NGHIỆP VỤ: Mỗi phòng chỉ có DUY NHẤT 1 Hợp đồng có hiệu lực tại một thời điểm.
    public async Task<ContractDto> CreateAsync(Guid landlordId, CreateContractRequest req)
    {
        var room = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == req.RoomId && r.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Phòng không tồn tại hoặc không thuộc quyền quản lý của bạn");

        // Kiểm tra ràng buộc: Phòng chỉ được có 1 Hợp đồng đang hiệu lực
        var existingActiveContract = await db.Contracts
            .AnyAsync(c => c.RoomId == req.RoomId &&
                          (c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested));
        if (existingActiveContract)
        {
            throw new InvalidOperationException(
                "Phòng này hiện đã có hợp đồng thuê đang hiệu lực. " +
                "Vui lòng thêm khách vào danh sách ở ghép hoặc thanh lý hợp đồng hiện tại trước khi tạo hợp đồng mới.");
        }

        var tenant = await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == req.TenantProfileId || t.UserId == req.TenantProfileId)
            ?? throw new KeyNotFoundException("Hồ sơ khách thuê không tồn tại");

        var landlord = await db.Users.FirstOrDefaultAsync(u => u.Id == landlordId);
        var utilityRate = await db.UtilityRates.FirstOrDefaultAsync(u => u.LandlordId == landlordId);

        var contract = new Contract
        {
            ContractCode = req.ContractCode,
            RoomId = req.RoomId,
            TenantProfileId = tenant.Id,  // Primary Tenant đứng tên hợp đồng
            StartDate = DateTime.SpecifyKind(req.StartDate, DateTimeKind.Utc),
            EndDate = DateTime.SpecifyKind(req.EndDate, DateTimeKind.Utc),
            RentAmount = req.RentAmount,
            Deposit = req.Deposit,
            PaymentTermDay = req.PaymentTermDay,
            Terms = req.Terms
        };

        // Render nội dung hợp đồng tùy biến theo mẫu của chủ trọ hoặc mẫu pháp lý chuẩn
        contract.CustomContent = !string.IsNullOrWhiteSpace(req.CustomContent)
            ? req.CustomContent
            : ContractTemplateEngine.Render(landlord?.CustomContractTemplate, contract, room, landlord, tenant, utilityRate);

        db.Contracts.Add(contract);

        // Gán phòng cho Primary Tenant, cập nhật phòng cũ nếu chuyển phòng
        if (tenant.RoomId.HasValue && tenant.RoomId.Value != req.RoomId)
        {
            var oldRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Id == tenant.RoomId.Value);
            if (oldRoom != null)
            {
                var otherCount = await db.TenantProfiles.CountAsync(other => other.RoomId == oldRoom.Id && other.Id != tenant.Id);
                if (otherCount == 0) oldRoom.Status = RoomStatus.Vacant;
            }
        }
        tenant.RoomId = req.RoomId;
        if (tenant.MoveInDate == null) tenant.MoveInDate = DateTime.SpecifyKind(req.StartDate, DateTimeKind.Utc);
        if (tenant.Deposit == 0 && req.Deposit > 0) tenant.Deposit = req.Deposit;

        // Cập nhật chỉ số điện nước ban đầu nếu có cung cấp
        if (req.InitialElecMeter.HasValue && req.InitialElecMeter.Value >= 0)
        {
            room.ElecMeter = req.InitialElecMeter.Value;
        }
        if (req.InitialWaterMeter.HasValue && req.InitialWaterMeter.Value >= 0)
        {
            room.WaterMeter = req.InitialWaterMeter.Value;
        }

        // Chuyển cọc giữ chỗ thành hợp đồng chính thức & dọn dẹp thông tin cọc giữ chỗ
        room.DepositAmount = null;
        room.DepositTenantName = null;
        room.DepositTenantPhone = null;
        room.ExpectedMoveInDate = null;
        room.DepositNote = null;
        room.Status = RoomStatus.Occupied;

        await db.SaveChangesAsync();
        var full = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstAsync(c => c.Id == contract.Id);

        // Tự động tạo thông báo gửi đến app cho khách thuê khi hợp đồng mới được tạo
        if (full.TenantProfile != null)
        {
            await notificationService.SendNotificationAsync(
                landlordId,
                $"Thông báo tạo mới hợp đồng phòng {full.Room.RoomNumber}",
                $"Hợp đồng mã {full.ContractCode} phòng {full.Room.RoomNumber} đã được khởi tạo thành công với thời hạn từ {full.StartDate:dd/MM/yyyy} đến {full.EndDate:dd/MM/yyyy}.",
                NotificationTarget.User,
                full.TenantProfile.UserId
            );
        }

        return full.ToContractDto();
    }

    // Cập nhật thông tin Hợp đồng thuê nhà (kiểm tra quyền sở hữu).
    public async Task<ContractDto> UpdateAsync(Guid id, Guid landlordId, UpdateContractRequest req)
    {
        var c = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == id && c.Room.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Hợp đồng không tồn tại hoặc bạn không có quyền thao tác.");

        c.StartDate = DateTime.SpecifyKind(req.StartDate, DateTimeKind.Utc);
        c.EndDate = DateTime.SpecifyKind(req.EndDate, DateTimeKind.Utc);
        c.RentAmount = req.RentAmount;
        c.PaymentTermDay = req.PaymentTermDay;
        c.Terms = req.Terms;
        if (!string.IsNullOrWhiteSpace(req.CustomContent))
        {
            c.CustomContent = req.CustomContent;
        }

        if (req.RoomId.HasValue && c.RoomId != req.RoomId.Value)
        {
            var newRoom = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == req.RoomId.Value && r.Zone.LandlordId == landlordId)
                ?? throw new KeyNotFoundException("Phòng chuyển đến không tồn tại hoặc không thuộc quyền quản lý của bạn.");

            var oldRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Id == c.RoomId);
            if (oldRoom != null)
            {
                var otherCount = await db.TenantProfiles.CountAsync(other => other.RoomId == oldRoom.Id && other.Id != c.TenantProfileId);
                if (otherCount == 0) oldRoom.Status = RoomStatus.Vacant;
            }

            c.RoomId = req.RoomId.Value;
            newRoom.Status = RoomStatus.Occupied;

            var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.Id == c.TenantProfileId);
            if (tenant != null) tenant.RoomId = req.RoomId.Value;
        }

        await db.SaveChangesAsync();
        return c.ToContractDto();
    }

    // Xóa một hợp đồng và cập nhật trạng thái phòng nếu không còn hợp đồng active khác.
    public async Task<bool> DeleteAsync(Guid id, Guid landlordId)
    {
        var c = await db.Contracts.Include(c => c.Room).ThenInclude(r => r.Zone)
            .FirstOrDefaultAsync(c => c.Id == id && c.Room.Zone.LandlordId == landlordId);
        if (c is null) return false;

        var hasSettlement = await db.ContractSettlements.AnyAsync(s => s.ContractId == id);
        if (hasSettlement)
        {
            throw new InvalidOperationException(
                $"Hợp đồng {c.ContractCode} đã được quyết toán cọc và lưu lịch sử thanh lý. " +
                "Không thể xóa để bảo toàn dữ liệu kiểm toán. " +
                "Nếu vẫn muốn xóa, vui lòng liên hệ quản trị viên hệ thống.");
        }

        if (c.Status == ContractStatus.Active && c.Room != null)
        {
            var activeContracts = await db.Contracts.CountAsync(other => other.RoomId == c.RoomId && other.Id != c.Id && other.Status == ContractStatus.Active);
            if (activeContracts == 0)
            {
                c.Room.Status = RoomStatus.Vacant;
            }
        }

        db.Contracts.Remove(c);
        await db.SaveChangesAsync();
        return true;
    }

    // Thanh lý hợp đồng thuê nhà trực tiếp
    public async Task TerminateAsync(Guid id, Guid landlordId)
    {
        var c = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == id && c.Room.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Hợp đồng không tồn tại hoặc bạn không có quyền thao tác.");

        c.Status = ContractStatus.Liquidated;

        var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.Id == c.TenantProfileId);
        if (tenant != null)
        {
            tenant.RoomId = null;
        }

        if (c.Room != null)
        {
            var activeContracts = await db.Contracts.CountAsync(other => other.RoomId == c.RoomId && other.Id != c.Id && other.Status == ContractStatus.Active);
            if (activeContracts == 0)
            {
                c.Room.Status = RoomStatus.Vacant;
                var remainingTenants = await db.TenantProfiles.Where(t => t.RoomId == c.RoomId).ToListAsync();
                foreach (var rt in remainingTenants)
                {
                    rt.RoomId = null;
                }
            }
        }

        await db.SaveChangesAsync();

        if (c.TenantProfile != null)
        {
            await notificationService.SendNotificationAsync(
                landlordId,
                $"⚠️ Thông báo thanh lý hợp đồng phòng {c.Room?.RoomNumber}",
                $"Hợp đồng thuê phòng {c.Room?.RoomNumber} (Mã: {c.ContractCode}) đã được hoàn tất thủ tục thanh lý chấm dứt hợp đồng.",
                NotificationTarget.User,
                c.TenantProfile.UserId
            );
        }
    }

    // Gia hạn hợp đồng (Chủ trọ phê duyệt)
    public async Task RenewAsync(Guid id, Guid landlordId, RenewContractRequest req)
    {
        var c = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == id && c.Room.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Hợp đồng không tồn tại hoặc bạn không có quyền thao tác.");

        c.EndDate = c.EndDate.AddMonths(req.ExtendMonths);
        if (req.NewRentAmount.HasValue && req.NewRentAmount.Value > 0)
        {
            c.RentAmount = req.NewRentAmount.Value;
        }
        c.Status = ContractStatus.Active;
        c.RequestedRenewMonths = null;
        c.RenewNotes = null;
        c.RenewRequestedAt = null;

        await db.SaveChangesAsync();

        if (c.TenantProfile != null)
        {
            await notificationService.SendNotificationAsync(
                landlordId,
                $"🎉 Hợp đồng phòng {c.Room?.RoomNumber} đã được gia hạn",
                $"Chủ trọ đã phê duyệt gia hạn hợp đồng {c.ContractCode} thêm {req.ExtendMonths} tháng. Thời hạn hợp đồng mới đến ngày {c.EndDate:dd/MM/yyyy}.",
                NotificationTarget.User,
                c.TenantProfile.UserId
            );
        }
    }

    // Chủ trọ từ chối yêu cầu gia hạn hợp đồng
    public async Task RejectRenewAsync(Guid id, Guid landlordId, RejectRenewContractRequest req)
    {
        var c = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == id && c.Room.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Hợp đồng không tồn tại hoặc bạn không có quyền thao tác.");

        c.Status = c.EndDate.Date < DateTime.UtcNow.Date ? ContractStatus.Expired : ContractStatus.Active;
        c.RequestedRenewMonths = null;
        c.RenewNotes = null;
        c.RenewRequestedAt = null;

        await db.SaveChangesAsync();

        if (c.TenantProfile != null)
        {
            var reasonText = string.IsNullOrWhiteSpace(req?.Reason) ? "Hiện tại chủ trọ chưa thể đáp ứng gia hạn hợp đồng theo yêu cầu." : req.Reason;
            await notificationService.SendNotificationAsync(
                landlordId,
                $"❌ Yêu cầu gia hạn HĐ phòng {c.Room?.RoomNumber} không được chấp thuận",
                $"Chủ trọ đã từ chối yêu cầu gia hạn hợp đồng {c.ContractCode}. Lý do: {reasonText}",
                NotificationTarget.User,
                c.TenantProfile.UserId
            );
        }
    }

    // Khách thuê gửi yêu cầu đăng ký gia hạn hợp đồng
    public async Task<ContractDto> RequestRenewAsync(Guid contractId, Guid tenantUserId, RequestRenewContractRequest req)
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

        var query = db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.Id == contractId);

        if (profile != null)
        {
            query = query.Where(c => c.TenantProfileId == profile.Id || (c.TenantProfile != null && c.TenantProfile.UserId == tenantUserId));
        }
        else
        {
            query = query.Where(c => c.TenantProfile != null && c.TenantProfile.UserId == tenantUserId);
        }

        var c = await query.FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy hợp đồng của bạn.");

        if (c.Status == ContractStatus.Liquidated)
        {
            throw new InvalidOperationException("Hợp đồng này đã được thanh lý, không thể gửi yêu cầu gia hạn.");
        }

        c.Status = ContractStatus.RenewRequested;
        c.RequestedRenewMonths = req.ExtendMonths;
        c.RenewNotes = req.Notes;
        c.RenewRequestedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        var landlordId = c.Room?.Zone?.LandlordId;
        if (landlordId.HasValue && landlordId.Value != Guid.Empty)
        {
            var notesText = string.IsNullOrWhiteSpace(req.Notes) ? "" : $" Lời nhắn: \"{req.Notes}\"";
            await notificationService.SendNotificationAsync(
                tenantUserId,
                $"🔔 Yêu cầu gia hạn HĐ: Phòng {c.Room?.RoomNumber}",
                $"Khách thuê {c.TenantProfile?.User?.FullName} (Phòng {c.Room?.RoomNumber}) vừa gửi yêu cầu gia hạn hợp đồng {c.ContractCode} thêm {req.ExtendMonths} tháng.{notesText}",
                NotificationTarget.User,
                landlordId.Value
            );
        }

        return c.ToContractDto();
    }

    // Khách thuê hủy yêu cầu gia hạn hợp đồng
    public async Task<ContractDto> CancelRenewRequestAsync(Guid contractId, Guid tenantUserId)
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

        var query = db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.Id == contractId);

        if (profile != null)
        {
            query = query.Where(c => c.TenantProfileId == profile.Id || (c.TenantProfile != null && c.TenantProfile.UserId == tenantUserId));
        }
        else
        {
            query = query.Where(c => c.TenantProfile != null && c.TenantProfile.UserId == tenantUserId);
        }

        var c = await query.FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy hợp đồng của bạn.");

        if (c.Status == ContractStatus.Liquidated)
        {
            throw new InvalidOperationException("Hợp đồng này đã được thanh lý.");
        }

        if (c.Status == ContractStatus.RenewRequested)
        {
            c.Status = c.EndDate.Date < DateTime.UtcNow.Date ? ContractStatus.Expired : ContractStatus.Active;
            c.RequestedRenewMonths = null;
            c.RenewNotes = null;
            c.RenewRequestedAt = null;
            await db.SaveChangesAsync();

            var landlordId = c.Room?.Zone?.LandlordId;
            if (landlordId.HasValue)
            {
                await notificationService.SendNotificationAsync(
                    tenantUserId,
                    $"ℹ️ Khách thuê đã hủy yêu cầu gia hạn HĐ phòng {c.Room?.RoomNumber}",
                    $"Khách thuê {c.TenantProfile?.User?.FullName} (Phòng {c.Room?.RoomNumber}) đã hủy yêu cầu gia hạn hợp đồng {c.ContractCode}.",
                    NotificationTarget.User,
                    landlordId.Value
                );
            }
        }

        return c.ToContractDto();
    }

    // Tự động quét và phát hành thông báo hợp đồng sắp hết hạn trong vòng 30 ngày tới
    public async Task<int> CheckAndNotifyExpiringContractsAsync(Guid landlordId)
    {
        var thirtyDaysFromNow = DateTime.UtcNow.AddDays(30);
        var expiringContracts = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.Room.Zone.LandlordId == landlordId &&
                        c.Status == ContractStatus.Active &&
                        c.EndDate <= thirtyDaysFromNow &&
                        c.EndDate >= DateTime.UtcNow.Date)
            .ToListAsync();

        int count = 0;
        foreach (var contract in expiringContracts)
        {
            if (contract.TenantProfile == null) continue;

            var today = DateTime.UtcNow.Date;
            var userId = contract.TenantProfile.UserId;
            var alreadyNotified = await db.Notifications.AnyAsync(n =>
                n.TargetId == userId &&
                n.Title.Contains("sắp hết hạn") &&
                n.CreatedAt >= today);

            if (!alreadyNotified)
            {
                var daysRemaining = (contract.EndDate.Date - DateTime.UtcNow.Date).Days;
                await notificationService.SendNotificationAsync(
                    landlordId,
                    $"Hợp đồng phòng {contract.Room?.RoomNumber} sắp hết hạn",
                    $"Hợp đồng {contract.ContractCode} của khách {contract.TenantProfile.User?.FullName} sẽ hết hạn vào ngày {contract.EndDate:dd/MM/yyyy} (còn {Math.Max(0, daysRemaining)} ngày). Vui lòng liên hệ chủ trọ để gia hạn.",
                    NotificationTarget.User,
                    userId
                );
                count++;
            }
        }

        return count;
    }

    // ─── QUẢN LÝ MẪU HỢP ĐỒNG TÙY BIẾN (CUSTOM CONTRACT TEMPLATE) ───

    // Lấy Mẫu hợp đồng hiện tại của Chủ trọ (hoặc Mẫu chuẩn mặc định)
    public async Task<ContractTemplateDto> GetTemplateAsync(Guid landlordId)
    {
        var landlord = await db.Users.FirstOrDefaultAsync(u => u.Id == landlordId)
            ?? throw new KeyNotFoundException("Chủ trọ không tồn tại");

        bool isCustom = !string.IsNullOrWhiteSpace(landlord.CustomContractTemplate);
        string content = isCustom ? landlord.CustomContractTemplate! : ContractTemplateEngine.GetDefaultTemplate();

        return new ContractTemplateDto(
            content,
            isCustom,
            ContractTemplateEngine.Variables
        );
    }

    // Lưu Mẫu hợp đồng tùy biến mới của Chủ trọ
    public async Task<ContractTemplateDto> SaveTemplateAsync(Guid landlordId, SaveContractTemplateRequest req)
    {
        var landlord = await db.Users.FirstOrDefaultAsync(u => u.Id == landlordId)
            ?? throw new KeyNotFoundException("Chủ trọ không tồn tại");

        if (string.IsNullOrWhiteSpace(req.Content))
        {
            throw new ArgumentException("Nội dung mẫu hợp đồng không được để trống.");
        }

        landlord.CustomContractTemplate = req.Content.Trim();
        await db.SaveChangesAsync();

        return new ContractTemplateDto(
            landlord.CustomContractTemplate,
            true,
            ContractTemplateEngine.Variables,
            DateTime.UtcNow
        );
    }

    // Khôi phục Mẫu hợp đồng về Mẫu pháp lý chuẩn Bộ Xây Dựng
    public async Task<ContractTemplateDto> ResetTemplateAsync(Guid landlordId)
    {
        var landlord = await db.Users.FirstOrDefaultAsync(u => u.Id == landlordId)
            ?? throw new KeyNotFoundException("Chủ trọ không tồn tại");

        landlord.CustomContractTemplate = null;
        await db.SaveChangesAsync();

        return new ContractTemplateDto(
            ContractTemplateEngine.GetDefaultTemplate(),
            false,
            ContractTemplateEngine.Variables,
            DateTime.UtcNow
        );
    }

    // Xem trước nội dung hợp đồng sau khi điền dữ liệu mẫu hoặc dữ liệu phòng thực tế
    public async Task<string> PreviewTemplateAsync(Guid landlordId, PreviewContractTemplateRequest req)
    {
        var landlord = await db.Users.FirstOrDefaultAsync(u => u.Id == landlordId)
            ?? throw new KeyNotFoundException("Chủ trọ không tồn tại");

        var template = !string.IsNullOrWhiteSpace(req.TemplateContent)
            ? req.TemplateContent
            : (!string.IsNullOrWhiteSpace(landlord.CustomContractTemplate) ? landlord.CustomContractTemplate : ContractTemplateEngine.GetDefaultTemplate());

        Room? room = null;
        if (req.RoomId.HasValue)
        {
            room = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == req.RoomId.Value);
        }

        TenantProfile? tenant = null;
        if (req.TenantProfileId.HasValue)
        {
            tenant = await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == req.TenantProfileId.Value);
        }

        var utilityRate = await db.UtilityRates.FirstOrDefaultAsync(u => u.LandlordId == landlordId);

        var sampleContract = new Contract
        {
            ContractCode = "HD-MAU-" + DateTime.Now.ToString("yyyyMM"),
            RoomId = room?.Id ?? Guid.Empty,
            TenantProfileId = tenant?.Id ?? Guid.Empty,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddYears(1),
            RentAmount = room?.Price ?? 4000000,
            Deposit = room?.Price ?? 4000000,
            PaymentTermDay = 5,
            Terms = "Bên B giữ gìn vệ sinh chung, không gây ồn sau 22h, thanh toán đúng hạn trước ngày 05 hàng tháng.",
            CreatedAt = DateTime.UtcNow
        };

        return ContractTemplateEngine.Render(template, sampleContract, room, landlord, tenant, utilityRate);
    }
}
