using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Hợp đồng Thuê nhà (Tạo hợp đồng, thanh lý, gia hạn, cập nhật trạng thái phòng tự động).
public class ContractService(AppDbContext db)
{
    // Lấy danh sách hợp đồng thuê nhà thuộc các phòng của Chủ trọ (hỗ trợ phân trang).
    public async Task<object> GetByLandlordAsync(Guid landlordId, int? page = null, int? pageSize = null)
    {
        var query = db.Contracts
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
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.TenantProfileId == tenantProfileId).ToListAsync();
        return contracts.Select(MapContract);
    }

    // Lấy chi tiết một Hợp đồng theo ID
    public async Task<ContractDto?> GetByIdAsync(Guid id)
    {
        var contract = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == id);
        return contract is null ? null : MapContract(contract);
    }

    // Tạo mới Hợp đồng thuê nhà và tự động đổi trạng thái phòng thành Occupied (Đã ở).
    public async Task<ContractDto> CreateAsync(CreateContractRequest req)
    {
        var contract = new Contract { ContractCode = req.ContractCode, RoomId = req.RoomId, TenantProfileId = req.TenantProfileId, StartDate = req.StartDate, EndDate = req.EndDate, RentAmount = req.RentAmount, Deposit = req.Deposit, PaymentTermDay = req.PaymentTermDay, Terms = req.Terms };
        db.Contracts.Add(contract);

        var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.Id == req.TenantProfileId);
        if (tenant != null)
        {
            if (tenant.RoomId.HasValue && tenant.RoomId.Value != req.RoomId)
            {
                var oldRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Id == tenant.RoomId.Value);
                if (oldRoom != null) oldRoom.Status = RoomStatus.Vacant;
            }
            tenant.RoomId = req.RoomId;
            var newRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Id == req.RoomId);
            if (newRoom != null) newRoom.Status = RoomStatus.Occupied;
        }

        await db.SaveChangesAsync();
        var full = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstAsync(c => c.Id == contract.Id);

        // Tự động tạo thông báo gửi đến app cho khách thuê khi hợp đồng mới được tạo
        if (full.TenantProfile != null)
        {
            var notifNewContract = new Notification
            {
                SenderId = full.Room.Zone.LandlordId,
                Title = $"Thông báo tạo mới hợp đồng phòng {full.Room.RoomNumber}",
                Content = $"Hợp đồng mã {full.ContractCode} phòng {full.Room.RoomNumber} đã được khởi tạo thành công với thời hạn từ {full.StartDate:dd/MM/yyyy} đến {full.EndDate:dd/MM/yyyy}.",
                Target = NotificationTarget.User,
                TargetId = full.TenantProfile.UserId,
                CreatedAt = DateTime.UtcNow
            };
            db.Notifications.Add(notifNewContract);
            await db.SaveChangesAsync();
        }

        return MapContract(full);
    }

    // Cập nhật thông tin Hợp đồng thuê nhà.
    public async Task<ContractDto> UpdateAsync(Guid id, UpdateContractRequest req)
    {
        var c = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == id) ?? throw new KeyNotFoundException();
        c.StartDate = req.StartDate; c.EndDate = req.EndDate; c.RentAmount = req.RentAmount; c.PaymentTermDay = req.PaymentTermDay; c.Terms = req.Terms;

        if (req.RoomId.HasValue && c.RoomId != req.RoomId.Value)
        {
            var oldRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Id == c.RoomId);
            if (oldRoom != null) oldRoom.Status = RoomStatus.Vacant;

            c.RoomId = req.RoomId.Value;
            var newRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Id == req.RoomId.Value);
            if (newRoom != null) newRoom.Status = RoomStatus.Occupied;

            var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.Id == c.TenantProfileId);
            if (tenant != null) tenant.RoomId = req.RoomId.Value;
        }

        await db.SaveChangesAsync();
        return MapContract(c);
    }

    // Xóa một hợp đồng và cập nhật trạng thái phòng nếu không còn hợp đồng active khác.
    public async Task<bool> DeleteAsync(Guid id)
    {
        var c = await db.Contracts.Include(c => c.Room).FirstOrDefaultAsync(c => c.Id == id);
        if (c is null) return false;

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

    // Thanh lý hợp đồng thuê nhà (Đổi trạng thái hợp đồng thành Liquidated và phòng thành Vacant).
    public async Task TerminateAsync(Guid id)
    {
        var c = await db.Contracts.Include(c => c.Room).FirstOrDefaultAsync(c => c.Id == id) ?? throw new KeyNotFoundException();
        c.Status = ContractStatus.Liquidated;
        c.Room.Status = RoomStatus.Vacant;
        var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.RoomId == c.RoomId);
        if (tenant != null) { tenant.RoomId = null; }
        await db.SaveChangesAsync();
    }

    // Gia hạn hợp đồng (Thanh lý hợp đồng cũ và tạo tự động một hợp đồng mới gia hạn thêm số tháng).
    public async Task RenewAsync(Guid id, RenewContractRequest req)
    {
        var c = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile)
            .FirstOrDefaultAsync(c => c.Id == id) ?? throw new KeyNotFoundException();
        c.Status = ContractStatus.Liquidated;
        var newContract = new Contract { ContractCode = c.ContractCode + "-GH", RoomId = c.RoomId, TenantProfileId = c.TenantProfileId, StartDate = c.EndDate, EndDate = c.EndDate.AddMonths(req.ExtendMonths), RentAmount = req.NewRentAmount ?? c.RentAmount, Deposit = c.Deposit, PaymentTermDay = c.PaymentTermDay, Terms = c.Terms };
        db.Contracts.Add(newContract);

        if (c.TenantProfile != null)
        {
            var notifRenew = new Notification
            {
                SenderId = c.Room.Zone.LandlordId,
                Title = $"Thông báo gia hạn hợp đồng phòng {c.Room.RoomNumber}",
                Content = $"Hợp đồng phòng {c.Room.RoomNumber} đã được gia hạn thêm {req.ExtendMonths} tháng thành công.",
                Target = NotificationTarget.User,
                TargetId = c.TenantProfile.UserId,
                CreatedAt = DateTime.UtcNow
            };
            db.Notifications.Add(notifRenew);
        }

        await db.SaveChangesAsync();
    }

<<<<<<< Updated upstream
    // Quyết toán hợp đồng & hoàn trả tiền cọc cho khách thuê
    public async Task<ContractSettlementDto> SettleContractAsync(Guid id, SettleContractRequest req)
    {
        var c = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == id) ?? throw new KeyNotFoundException("Không tìm thấy hợp đồng");

        var unpaidInvoices = await db.Invoices
            .Where(i => i.TenantProfileId == c.TenantProfileId && i.Status != InvoiceStatus.Paid)
            .SumAsync(i => (decimal?)i.TotalAmount) ?? 0m;

        var totalDeductions = unpaidInvoices + req.DamageDeductionAmount + req.OtherDeductionAmount;
        var refundAmount = Math.Max(0, c.Deposit - totalDeductions);

        c.Status = ContractStatus.Liquidated;
        if (c.Room != null)
        {
            var activeContracts = await db.Contracts.CountAsync(other => other.RoomId == c.RoomId && other.Id != c.Id && other.Status == ContractStatus.Active);
            if (activeContracts == 0)
            {
                c.Room.Status = RoomStatus.Vacant;
            }
        }

        var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.Id == c.TenantProfileId);
        if (tenant != null) { tenant.RoomId = null; }

        var settlement = new ContractSettlement
        {
            ContractId = c.Id,
            LandlordId = c.Room?.Zone?.LandlordId ?? Guid.Empty,
            TenantProfileId = c.TenantProfileId,
            RoomId = c.RoomId,
            DepositAmount = c.Deposit,
            UnpaidInvoicesAmount = unpaidInvoices,
=======
    // Quyết toán hợp đồng và tính toán tiền cọc hoàn lại cho khách thuê
    public async Task<ContractSettlementDto> SettleContractAsync(Guid contractId, SettleContractRequest req)
    {
        var contract = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == contractId)
            ?? throw new KeyNotFoundException("Hợp đồng không tồn tại");

        // Lấy tổng số nợ từ các hóa đơn chưa thanh toán của hợp đồng này
        var unpaidInvoicesSum = await db.Invoices
            .Where(i => i.RoomId == contract.RoomId && (i.Status == InvoiceStatus.Unpaid || i.Status == InvoiceStatus.Overdue))
            .SumAsync(i => i.TotalAmount);

        // Tính tiền hoàn lại = Tiền cọc - Nợ hóa đơn - Hư hỏng - Khấu trừ khác
        var refundAmount = contract.Deposit - unpaidInvoicesSum - req.DamageDeductionAmount - req.OtherDeductionAmount;

        var settlement = new ContractSettlement
        {
            ContractId = contract.Id,
            LandlordId = contract.Room.Zone.LandlordId,
            TenantProfileId = contract.TenantProfileId,
            RoomId = contract.RoomId,
            DepositAmount = contract.Deposit,
            UnpaidInvoicesAmount = unpaidInvoicesSum,
>>>>>>> Stashed changes
            DamageDeductionAmount = req.DamageDeductionAmount,
            OtherDeductionAmount = req.OtherDeductionAmount,
            RefundAmount = refundAmount,
            SettlementNotes = req.SettlementNotes,
            SettleDate = DateTime.UtcNow
        };

        db.ContractSettlements.Add(settlement);
<<<<<<< Updated upstream
=======

        // Cập nhật trạng thái hợp đồng thành Thanh lý (Liquidated) và phòng thành Trống (Vacant)
        contract.Status = ContractStatus.Liquidated;
        if (contract.Room != null)
        {
            contract.Room.Status = RoomStatus.Vacant;
        }

        var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.Id == contract.TenantProfileId);
        if (tenant != null)
        {
            tenant.RoomId = null;
        }

        // Tự động gửi thông báo kết quả quyết toán cọc vào ứng dụng cho khách thuê
        if (contract.TenantProfile != null)
        {
            var notifSettle = new Notification
            {
                SenderId = contract.Room?.Zone?.LandlordId ?? Guid.Empty,
                Title = $"Thông báo quyết toán cọc phòng {contract.Room?.RoomNumber}",
                Content = $"Hợp đồng phòng {contract.Room?.RoomNumber} đã hoàn tất quyết toán thanh lý. Số tiền cọc thực tế hoàn lại: {refundAmount:N0} VNĐ.",

                Target = NotificationTarget.User,
                TargetId = contract.TenantProfile.UserId,
                CreatedAt = DateTime.UtcNow
            };
            db.Notifications.Add(notifSettle);
        }

>>>>>>> Stashed changes
        await db.SaveChangesAsync();

        return new ContractSettlementDto(
            settlement.Id,
<<<<<<< Updated upstream
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
=======
            contract.Id,
            contract.ContractCode,
            contract.RoomId,
            contract.Room?.RoomNumber ?? "",
            contract.TenantProfileId,
            contract.TenantProfile?.User?.FullName ?? "",
            contract.Deposit,
            unpaidInvoicesSum,
            req.DamageDeductionAmount,
            req.OtherDeductionAmount,
            refundAmount,
            req.SettlementNotes,
>>>>>>> Stashed changes
            settlement.SettleDate
        );
    }

<<<<<<< Updated upstream
    // Tự động quét và phát hành thông báo hợp đồng sắp hết hạn trong 30 ngày
    public async Task<int> CheckAndNotifyExpiringContractsAsync(Guid landlordId)
    {
        var threshold = DateTime.UtcNow.AddDays(30);
        var expiringContracts = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.Room.Zone.LandlordId == landlordId && c.Status == ContractStatus.Active && c.EndDate <= threshold)
            .ToListAsync();

        int count = 0;
        foreach (var contract in expiringContracts)
        {
            var daysRemaining = (contract.EndDate.Date - DateTime.UtcNow.Date).Days;
            var notif = new Notification
            {
                SenderId = landlordId,
                Title = $"Hợp đồng phòng {contract.Room?.RoomNumber} sắp hết hạn",
                Content = $"Hợp đồng {contract.ContractCode} của khách {contract.TenantProfile?.User?.FullName} sẽ hết hạn vào ngày {contract.EndDate:dd/MM/yyyy} (còn {Math.Max(0, daysRemaining)} ngày).",
                Target = NotificationTarget.User,
                TargetId = contract.TenantProfile?.UserId ?? landlordId,
                CreatedAt = DateTime.UtcNow
            };
            db.Notifications.Add(notif);
            count++;
=======
    // Tự động quét và phát hành thông báo hợp đồng sắp hết hạn trong vòng 30 ngày tới
    public async Task<int> CheckAndNotifyExpiringContractsAsync(Guid landlordId)
    {
        var thirtyDaysFromNow = DateTime.UtcNow.AddDays(30);
        var expiringContracts = await db.Contracts
            .Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile)
            .Where(c => c.Room.Zone.LandlordId == landlordId &&
                        c.Status == ContractStatus.Active &&
                        c.EndDate <= thirtyDaysFromNow &&
                        c.EndDate >= DateTime.UtcNow)
            .ToListAsync();

        int count = 0;
        foreach (var c in expiringContracts)
        {
            if (c.TenantProfile == null) continue;

            var today = DateTime.UtcNow.Date;
            var alreadyNotified = await db.Notifications.AnyAsync(n =>
                n.TargetId == c.TenantProfile.UserId &&
                n.Title.Contains("hợp đồng sắp hết hạn") &&
                n.CreatedAt >= today);

            if (!alreadyNotified)
            {
                var notif = new Notification
                {
                    SenderId = landlordId,
                    Title = $"Cảnh báo hợp đồng sắp hết hạn - Phòng {c.Room?.RoomNumber}",
                    Content = $"Hợp đồng mã {c.ContractCode} phòng {c.Room?.RoomNumber} sẽ hết hạn vào ngày {c.EndDate:dd/MM/yyyy}. Vui lòng liên hệ chủ trọ để gia hạn.",
                    Target = NotificationTarget.User,
                    TargetId = c.TenantProfile.UserId,
                    CreatedAt = DateTime.UtcNow
                };
                db.Notifications.Add(notif);
                count++;
            }
>>>>>>> Stashed changes
        }

        if (count > 0)
        {
            await db.SaveChangesAsync();
        }
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
        return count;
    }


<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
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
        c.CreatedAt
    );
}

