using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Hợp đồng Thuê nhà (Tạo hợp đồng, thanh lý, gia hạn, cập nhật trạng thái phòng tự động & thông báo realtime).
public class ContractService(AppDbContext db, NotificationService notificationService)
{
    // Lấy danh sách hợp đồng thuê nhà thuộc các phòng của Chủ trọ (hỗ trợ phân trang).
    public async Task<object> GetByLandlordAsync(Guid landlordId, int? page = null, int? pageSize = null)
    {
        // Tự động kiểm tra & đồng bộ: giải phóng RoomId của người thuê nếu hợp đồng duy nhất đã Liquidated
        try
        {
            var liquidatedContracts = await db.Contracts
                .Include(c => c.TenantProfile)
                .Where(c => c.Room.Zone.LandlordId == landlordId && c.Status == ContractStatus.Liquidated && c.TenantProfile.RoomId != null)
                .ToListAsync();

            if (liquidatedContracts.Count != 0)
            {
                bool modified = false;
                foreach (var lc in liquidatedContracts)
                {
                    var hasOtherActive = await db.Contracts.AnyAsync(other => other.TenantProfileId == lc.TenantProfileId && other.Id != lc.Id && other.Status == ContractStatus.Active);
                    if (!hasOtherActive && lc.TenantProfile != null && lc.TenantProfile.RoomId != null)
                    {
                        lc.TenantProfile.RoomId = null;
                        modified = true;
                    }
                }
                if (modified)
                {
                    await db.SaveChangesAsync();
                }
            }
        }
        catch { /* Bỏ qua lỗi nền nếu có để không ảnh hưởng truy vấn dữ liệu */ }

        var query = db.Contracts
            .AsNoTracking()
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.Room.Zone.LandlordId == landlordId);
        var totalItems = await query.CountAsync();
        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            var items = await query.OrderByDescending(c => c.CreatedAt)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = items.Select(MapContract);
            return PagedResult<ContractDto>.Create(dtos, totalItems, p, ps);
        }
        var contracts = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return contracts.Select(MapContract);
    }

    // Lấy danh sách hợp đồng thuê của một Khách thuê theo ID hồ sơ (TenantProfileId).
    public async Task<IEnumerable<ContractDto>> GetByTenantAsync(Guid tenantProfileId)
    {
        var contracts = await db.Contracts
            .AsNoTracking()
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.TenantProfileId == tenantProfileId).ToListAsync();
        return contracts.Select(MapContract);
    }

    // Lấy chi tiết một Hợp đồng theo ID (kiểm tra quyền sở hữu).
    public async Task<ContractDto?> GetByIdAsync(Guid id, Guid currentUserId, string role)
    {
        var query = db.Contracts
            .AsNoTracking()
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .AsQueryable();

        if (role == "Landlord")
        {
            query = query.Where(c => c.Room.Zone.LandlordId == currentUserId);
        }
        else if (role == "Tenant")
        {
            query = query.Where(c => c.TenantProfile.UserId == currentUserId);
        }

        var contract = await query.FirstOrDefaultAsync(c => c.Id == id);
        return contract is null ? null : MapContract(contract);
    }

    // Tạo mới Hợp đồng thuê nhà và tự động đổi trạng thái phòng thành Occupied (Đã ở).
    public async Task<ContractDto> CreateAsync(Guid landlordId, CreateContractRequest req)
    {
        var room = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == req.RoomId && r.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Phòng không tồn tại hoặc không thuộc quyền quản lý của bạn");

        var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.Id == req.TenantProfileId)
            ?? throw new KeyNotFoundException("Hồ sơ khách thuê không tồn tại");

        var contract = new Contract 
        { 
            ContractCode = req.ContractCode, 
            RoomId = req.RoomId, 
            TenantProfileId = req.TenantProfileId, 
            StartDate = req.StartDate, 
            EndDate = req.EndDate, 
            RentAmount = req.RentAmount, 
            Deposit = req.Deposit, 
            PaymentTermDay = req.PaymentTermDay, 
            Terms = req.Terms 
        };
        db.Contracts.Add(contract);

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

        return MapContract(full);
    }

    // Cập nhật thông tin Hợp đồng thuê nhà (kiểm tra quyền sở hữu).
    public async Task<ContractDto> UpdateAsync(Guid id, Guid landlordId, UpdateContractRequest req)
    {
        var c = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == id && c.Room.Zone.LandlordId == landlordId) 
            ?? throw new KeyNotFoundException("Hợp đồng không tồn tại hoặc bạn không có quyền thao tác.");

        c.StartDate = req.StartDate; 
        c.EndDate = req.EndDate; 
        c.RentAmount = req.RentAmount; 
        c.PaymentTermDay = req.PaymentTermDay; 
        c.Terms = req.Terms;

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
        return MapContract(c);
    }

    // Xóa một hợp đồng và cập nhật trạng thái phòng nếu không còn hợp đồng active khác.
    // Không cho phép xóa nếu hợp đồng đã được quyết toán cọc (có bản ghi ContractSettlement).
    public async Task<bool> DeleteAsync(Guid id, Guid landlordId)
    {
        var c = await db.Contracts.Include(c => c.Room).ThenInclude(r => r.Zone)
            .FirstOrDefaultAsync(c => c.Id == id && c.Room.Zone.LandlordId == landlordId);
        if (c is null) return false;

        // Kiểm tra: nếu hợp đồng đã có bản ghi quyết toán cọc thì không cho phép xóa
        // để bảo toàn lịch sử thu chi và kiểm toán
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

    // Thanh lý hợp đồng thuê nhà (Đổi trạng thái hợp đồng thành Liquidated, hủy liên kết phòng của khách thuê và phòng thành Vacant).
    public async Task TerminateAsync(Guid id, Guid landlordId)
    {
        var c = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == id && c.Room.Zone.LandlordId == landlordId) 
            ?? throw new KeyNotFoundException("Hợp đồng không tồn tại hoặc bạn không có quyền thao tác.");

        c.Status = ContractStatus.Liquidated;

        // 1. Hủy liên kết phòng của người thuê chính trong hợp đồng này
        var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.Id == c.TenantProfileId);
        if (tenant != null) 
        { 
            tenant.RoomId = null; 
        }

        // 2. Nếu phòng không còn hợp đồng active nào, đổi trạng thái phòng thành Trống và gỡ toàn bộ người ở còn lại
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

    // Gia hạn hợp đồng (Chủ trọ phê duyệt gia hạn hợp đồng thêm số tháng và cập nhật hạn chót mới).
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

        c.Status = ContractStatus.Active;
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
        var c = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == contractId && c.TenantProfile.UserId == tenantUserId)
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

        return MapContract(c);
    }

    // Khách thuê hủy yêu cầu gia hạn hợp đồng
    public async Task<ContractDto> CancelRenewRequestAsync(Guid contractId, Guid tenantUserId)
    {
        var c = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == contractId && c.TenantProfile.UserId == tenantUserId)
            ?? throw new KeyNotFoundException("Không tìm thấy hợp đồng của bạn.");

        if (c.Status == ContractStatus.Liquidated)
        {
            throw new InvalidOperationException("Hợp đồng này đã được thanh lý.");
        }

        if (c.Status == ContractStatus.RenewRequested)
        {
            c.Status = ContractStatus.Active;
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

        return MapContract(c);
    }

    // Quyết toán hợp đồng & hoàn trả tiền cọc cho khách thuê
    public async Task<ContractSettlementDto> SettleContractAsync(Guid id, Guid landlordId, SettleContractRequest req)
    {
        var c = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == id && c.Room.Zone.LandlordId == landlordId) 
            ?? throw new KeyNotFoundException("Hợp đồng không tồn tại hoặc bạn không có quyền thao tác.");

        var unpaidInvoices = await db.Invoices
            .Where(i => i.TenantProfileId == c.TenantProfileId && i.Status != InvoiceStatus.Paid)
            .SumAsync(i => (decimal?)i.TotalAmount) ?? 0m;

        var totalDeductions = unpaidInvoices + req.DamageDeductionAmount + req.OtherDeductionAmount;
        var refundAmount = Math.Max(0, c.Deposit - totalDeductions);

        c.Status = ContractStatus.Liquidated;

        // 1. Hủy liên kết phòng của người thuê chính trong hợp đồng này
        var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.Id == c.TenantProfileId);
        if (tenant != null) 
        { 
            tenant.RoomId = null; 
        }

        // 2. Nếu phòng không còn hợp đồng active nào, đổi trạng thái phòng thành Trống và gỡ toàn bộ người ở còn lại
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

        var settlement = new ContractSettlement
        {
            ContractId = c.Id,
            LandlordId = landlordId,
            TenantProfileId = c.TenantProfileId,
            RoomId = c.RoomId,
            DepositAmount = c.Deposit,
            UnpaidInvoicesAmount = unpaidInvoices,
            DamageDeductionAmount = req.DamageDeductionAmount,
            OtherDeductionAmount = req.OtherDeductionAmount,
            RefundAmount = refundAmount,
            SettlementNotes = req.SettlementNotes,
            SettleDate = DateTime.UtcNow
        };

        db.ContractSettlements.Add(settlement);
        await db.SaveChangesAsync();

        // Tự động tạo thông báo kết quả quyết toán gửi đến khách thuê
        if (c.TenantProfile != null)
        {
            await notificationService.SendNotificationAsync(
                landlordId,
                $"Thông báo quyết toán cọc phòng {c.Room?.RoomNumber}",
                $"Hợp đồng phòng {c.Room?.RoomNumber} đã hoàn tất quyết toán thanh lý. Số tiền cọc thực tế hoàn lại: {refundAmount:N0} VNĐ.",
                NotificationTarget.User,
                c.TenantProfile.UserId
            );
        }

        return new ContractSettlementDto(
            settlement.Id,
            settlement.ContractId,
            settlement.LandlordId,
            settlement.TenantProfileId,
            c.TenantProfile?.User?.FullName ?? "",
            settlement.RoomId,
            c.Room?.RoomNumber ?? "",
            settlement.DepositAmount,
            settlement.UnpaidInvoicesAmount,
            settlement.DamageDeductionAmount,
            settlement.OtherDeductionAmount,
            settlement.RefundAmount,
            settlement.SettlementNotes,
            settlement.SettleDate
        );
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
            var alreadyNotified = await db.Notifications.AnyAsync(n =>
                n.TargetId == contract.TenantProfile.UserId &&
                n.Title.Contains("sắp hết hạn") &&
                n.CreatedAt >= today);

            if (!alreadyNotified)
            {
                var daysRemaining = (contract.EndDate.Date - DateTime.UtcNow.Date).Days;
                await notificationService.SendNotificationAsync(
                    landlordId,
                    $"Hợp đồng phòng {contract.Room?.RoomNumber} sắp hết hạn",
                    $"Hợp đồng {contract.ContractCode} của khách {contract.TenantProfile?.User?.FullName} sẽ hết hạn vào ngày {contract.EndDate:dd/MM/yyyy} (còn {Math.Max(0, daysRemaining)} ngày). Vui lòng liên hệ chủ trọ để gia hạn.",
                    NotificationTarget.User,
                    contract.TenantProfile.UserId
                );
                count++;
            }
        }

        return count;
    }

    private static ContractDto MapContract(Contract c) => new(
        c.Id,
        c.ContractCode,
        c.RoomId,
        c.Room?.RoomNumber ?? "",
        c.Room?.ZoneId ?? Guid.Empty,
        c.Room?.Zone?.Name ?? "",
        c.Room?.Zone?.Address ?? "",
        c.Room?.Zone?.LandlordId ?? Guid.Empty,
        c.Room?.Zone?.Landlord?.FullName ?? "",
        c.Room?.Zone?.Landlord?.Phone ?? "",
        c.Room?.Zone?.Landlord?.Email,
        c.TenantProfileId,
        c.TenantProfile?.User?.FullName ?? "",
        c.TenantProfile?.User?.Phone ?? "",
        c.TenantProfile?.CCCD,
        c.StartDate,
        c.EndDate,
        c.RentAmount,
        c.Deposit,
        c.Status.ToString(),
        c.PaymentTermDay,
        c.Terms,
        c.FileUrl,
        c.CreatedAt,
        c.RequestedRenewMonths,
        c.RenewNotes,
        c.RenewRequestedAt
    );
}
