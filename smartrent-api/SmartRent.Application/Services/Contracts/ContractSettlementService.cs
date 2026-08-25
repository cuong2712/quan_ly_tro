using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Contracts;

// Dịch vụ quản lý Quyết toán cọc & Thanh lý hợp đồng
public class ContractSettlementService(AppDbContext db, NotificationService notificationService)
{
    // Quyết toán hợp đồng & hoàn trả tiền cọc cho khách thuê (gói gọn trong transaction).
    public async Task<ContractSettlementDto> SettleContractAsync(Guid id, Guid landlordId, SettleContractRequest req)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var c = await db.Contracts
                .Include(c => c.Room).ThenInclude(r => r.Zone)
                .Include(c => c.TenantProfile).ThenInclude(t => t.User)
                .FirstOrDefaultAsync(c => c.Id == id && c.Room.Zone.LandlordId == landlordId)
                ?? throw new KeyNotFoundException("Hợp đồng không tồn tại hoặc bạn không có quyền thao tác.");

            // Tính công nợ hóa đơn chưa thanh toán của phòng
            var unpaidInvoices = await db.Invoices
                .Where(i => i.RoomId == c.RoomId && i.Status != InvoiceStatus.Paid)
                .SumAsync(i => (decimal?)i.TotalAmount) ?? 0m;

            var totalDeductions = unpaidInvoices + req.DamageDeductionAmount + req.OtherDeductionAmount;
            var refundAmount = Math.Max(0, c.Deposit - totalDeductions);

            // 1. Đổi trạng thái hợp đồng thành Thanh lý
            c.Status = ContractStatus.Liquidated;

            // 2. Đổi trạng thái phòng thành Trống (Vacant)
            if (c.Room != null)
            {
                c.Room.Status = RoomStatus.Vacant;
            }

            // 3. Gỡ RoomId của TẤT CẢ thành viên trong phòng (Primary Tenant + toàn bộ Occupants)
            var allRoomTenants = await db.TenantProfiles
                .Where(t => t.RoomId == c.RoomId)
                .ToListAsync();
            foreach (var rt in allRoomTenants)
            {
                rt.RoomId = null;
            }

            // 4. Tạo bản ghi ContractSettlement lưu lịch sử quyết toán
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
            await tx.CommitAsync();

            // Tự động tạo thông báo kết quả quyết toán gửi đến khách thuê (ngoài transaction)
            if (c.TenantProfile != null)
            {
                await notificationService.SendNotificationAsync(
                    landlordId,
                    $"Thông báo quyết toán cọc phòng {c.Room?.RoomNumber}",
                    $"Hợp đồng phòng {c.Room?.RoomNumber} đã hoàn tất quyết toán thanh lý. Tiền cọc ban đầu: {c.Deposit:N0} VNĐ. Công nợ khấu trừ: {totalDeductions:N0} VNĐ. Số tiền cọc thực tế hoàn lại: {refundAmount:N0} VNĐ.",
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
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}
