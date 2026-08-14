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
        var c = await db.Contracts.FirstOrDefaultAsync(c => c.Id == id) ?? throw new KeyNotFoundException();
        c.Status = ContractStatus.Liquidated;
        var newContract = new Contract { ContractCode = c.ContractCode + "-GH", RoomId = c.RoomId, TenantProfileId = c.TenantProfileId, StartDate = c.EndDate, EndDate = c.EndDate.AddMonths(req.ExtendMonths), RentAmount = req.NewRentAmount ?? c.RentAmount, Deposit = c.Deposit, PaymentTermDay = c.PaymentTermDay, Terms = c.Terms };
        db.Contracts.Add(newContract);
        await db.SaveChangesAsync();
    }

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
            DamageDeductionAmount = req.DamageDeductionAmount,
            OtherDeductionAmount = req.OtherDeductionAmount,
            RefundAmount = refundAmount,
            SettlementNotes = req.SettlementNotes,
            SettleDate = DateTime.UtcNow
        };

        db.ContractSettlements.Add(settlement);
        await db.SaveChangesAsync();

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
        }

        if (count > 0)
        {
            await db.SaveChangesAsync();
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
        c.CreatedAt
    );
}

