using Microsoft.EntityFrameworkCore;
using SmartRent.Application.Common.Mappings;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Invoices;

// Dịch vụ quản lý vòng đời Hóa đơn (Phát hành, Cập nhật, Đổi trạng thái & Xóa)
public class InvoiceLifecycleService(AppDbContext db, BillingEngine billingEngine, NotificationService notificationService)
{
    // Tạo mới một hóa đơn thủ công.
    // NGHIỆP VỤ: Mỗi phòng chỉ có DUY NHẤT 1 Hóa đơn tổng mỗi chu kỳ (Month), phát hành cho Primary Tenant đứng tên hợp đồng.
    public async Task<InvoiceDto> CreateAsync(Guid landlordId, CreateInvoiceRequest req)
    {
        var room = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == req.RoomId && r.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Phòng không tồn tại hoặc không thuộc quyền quản lý của bạn");

        // Ưu tiên lấy Primary Tenant từ hợp đồng Active đang hiệu lực của phòng
        var activeContract = await db.Contracts
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.RoomId == req.RoomId &&
                                      (c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested));

        TenantProfile tenant;
        if (activeContract != null)
        {
            tenant = activeContract.TenantProfile
                ?? await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == activeContract.TenantProfileId)
                ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ khách thuê đứng tên hợp đồng");
        }
        else
        {
            tenant = await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.RoomId == req.RoomId)
                ?? throw new KeyNotFoundException("Không có khách thuê trong phòng này. Vui lòng tạo hợp đồng trước khi phát hành hóa đơn.");
        }

        var existingInvoice = await db.Invoices.FirstOrDefaultAsync(i => i.RoomId == req.RoomId && i.Month == req.Month);
        if (existingInvoice != null)
        {
            throw new InvalidOperationException($"Phòng {room.RoomNumber} đã có hóa đơn tiền nhà cho tháng {req.Month} (Mã hóa đơn: {existingInvoice.InvoiceCode}). Mỗi phòng chỉ được tạo 1 hóa đơn trong 1 tháng. Vui lòng cập nhật hóa đơn hiện tại nếu cần sửa đổi thông tin.");
        }

        var (itemsList, calculatedServiceFee, totalAmount) = await billingEngine.CalculateChargesAsync(
            landlordId, room, req.RentFee, req.ElecFee, req.WaterFee, req.ServiceFee);

        var code = $"HD-{req.Month.Replace("-", "")}-{room.RoomNumber}";

        var inv = new Invoice
        {
            InvoiceCode = code,
            RoomId = req.RoomId,
            TenantProfileId = tenant.Id,
            Month = req.Month,
            RentFee = req.RentFee,
            ElecFee = req.ElecFee,
            WaterFee = req.WaterFee,
            ServiceFee = calculatedServiceFee,
            TotalAmount = totalAmount,
            DueDate = req.DueDate,
            Status = InvoiceStatus.Unpaid,
            Items = itemsList
        };

        db.Invoices.Add(inv);
        await db.SaveChangesAsync();

        // Tự động tạo thông báo gửi đến app cho khách thuê khi hóa đơn tiền nhà được phát hành
        await notificationService.SendNotificationAsync(
            landlordId,
            $"Thông báo hóa đơn tiền nhà tháng {req.Month}",
            $"Phòng {room.RoomNumber}: Hóa đơn mã {code} với tổng số tiền {totalAmount:N0} VNĐ đã được phát hành. Hạn đóng: {req.DueDate:dd/MM/yyyy}.",
            NotificationTarget.User,
            tenant.UserId
        );

        inv.Room = room;
        inv.TenantProfile = tenant;
        return inv.ToInvoiceDto();
    }

    // Xóa một hóa đơn
    public async Task<bool> DeleteAsync(Guid id, Guid landlordId)
    {
        var inv = await db.Invoices
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id && i.Room.Zone.LandlordId == landlordId);

        if (inv == null) return false;

        var payments = await db.Payments.Where(p => p.InvoiceId == id).ToListAsync();
        if (payments.Count > 0)
        {
            db.Payments.RemoveRange(payments);
        }

        db.Invoices.Remove(inv);
        await db.SaveChangesAsync();
        return true;
    }

    // Cập nhật thông tin chi tiết hóa đơn
    public async Task<InvoiceDto> UpdateAsync(Guid id, Guid landlordId, UpdateInvoiceRequest req)
    {
        var inv = await db.Invoices
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id && i.Room.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Hóa đơn không tồn tại hoặc bạn không có quyền chỉnh sửa.");

        inv.RentFee = req.RentFee;
        inv.ElecFee = req.ElecFee;
        inv.WaterFee = req.WaterFee;
        inv.ServiceFee = req.ServiceFee;
        inv.TotalAmount = req.RentFee + req.ElecFee + req.WaterFee + req.ServiceFee;
        inv.DueDate = req.DueDate;

        if (Enum.TryParse<InvoiceStatus>(req.Status, true, out var parsedStatus))
        {
            inv.Status = parsedStatus;
            if (inv.Status == InvoiceStatus.Paid && inv.PaidDate == null)
            {
                inv.PaidDate = DateTime.UtcNow;
            }
        }

        var rentItem = inv.Items.FirstOrDefault(x => x.Name == "Tiền thuê phòng");
        if (rentItem != null) rentItem.Amount = req.RentFee;

        var elecItem = inv.Items.FirstOrDefault(x => x.Name == "Tiền điện");
        if (elecItem != null) elecItem.Amount = req.ElecFee;

        var waterItem = inv.Items.FirstOrDefault(x => x.Name == "Tiền nước");
        if (waterItem != null) waterItem.Amount = req.WaterFee;

        var svcItem = inv.Items.FirstOrDefault(x => x.Name == "Phí dịch vụ" || x.Name.StartsWith("Phí dịch vụ"));
        if (svcItem != null) svcItem.Amount = req.ServiceFee;

        await db.SaveChangesAsync();

        if (inv.TenantProfile != null)
        {
            await notificationService.SendNotificationAsync(
                landlordId,
                $"Thông báo cập nhật hóa đơn {inv.InvoiceCode}",
                $"Hóa đơn tháng {inv.Month} (Phòng {inv.Room?.RoomNumber}) đã được chủ trọ cập nhật lại thông tin. Tổng tiền: {inv.TotalAmount:N0} VNĐ. Hạn đóng: {inv.DueDate:dd/MM/yyyy}.",
                NotificationTarget.User,
                inv.TenantProfile.UserId
            );
        }

        return inv.ToInvoiceDto();
    }

    // Cập nhật trạng thái hóa đơn
    public async Task<InvoiceDto> UpdateStatusAsync(Guid id, Guid landlordId, string status)
    {
        var inv = await db.Invoices
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id && i.Room.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Hóa đơn không tồn tại hoặc bạn không có quyền thao tác.");

        inv.Status = Enum.Parse<InvoiceStatus>(status, ignoreCase: true);
        if (inv.Status == InvoiceStatus.Paid)
        {
            inv.PaidDate = DateTime.UtcNow;

            if (inv.TenantProfile != null)
            {
                await notificationService.SendNotificationAsync(
                    landlordId,
                    $"Xác nhận thanh toán hóa đơn {inv.InvoiceCode}",
                    $"Hóa đơn tiền nhà tháng {inv.Month} (Phòng {inv.Room?.RoomNumber}) số tiền {inv.TotalAmount:N0} VNĐ đã được xác nhận thanh toán thành công.",
                    NotificationTarget.User,
                    inv.TenantProfile.UserId
                );
            }
        }

        await db.SaveChangesAsync();
        return inv.ToInvoiceDto();
    }
}
