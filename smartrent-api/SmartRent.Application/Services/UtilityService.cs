using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Điện nước (Ghi chỉ số hàng tháng, cài đặt đơn giá điện nước và tự động tính/tạo Hóa đơn).
public class UtilityService(AppDbContext db)
{
    // Lấy lịch sử chỉ số điện nước theo Chủ trọ (có thể lọc theo ID phòng cụ thể).
    public async Task<IEnumerable<UtilityLogDto>> GetByLandlordAsync(Guid landlordId, Guid? roomId = null)
    {
        var query = db.UtilityLogs.Include(u => u.Room).ThenInclude(r => r.Zone).Where(u => u.Room.Zone.LandlordId == landlordId).AsQueryable();
        if (roomId.HasValue) query = query.Where(u => u.RoomId == roomId);
        var logs = await query.OrderByDescending(u => u.Month).ToListAsync();
        return logs.Select(MapLog);
    }

    // Ghi nhận chỉ số điện nước mới cho phòng, tự động tính số kWh/m³ tiêu thụ và tự động tạo/cập nhật Hóa đơn tương ứng.
    public async Task<UtilityLogDto> RecordAsync(Guid landlordId, RecordUtilityRequest req)
    {
        var room = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == req.RoomId && r.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Phòng không tồn tại");
        var rate = await db.UtilityRates.FirstOrDefaultAsync(r => r.LandlordId == landlordId);
        decimal elecPrice = rate?.ElecPrice ?? 3500;
        decimal waterPrice = rate?.WaterPrice ?? 18000;

        var elecUsed = req.NewElec - room.ElecMeter;
        var waterUsed = req.NewWater - room.WaterMeter;
        var elecCost = elecUsed * elecPrice;
        var waterCost = waterUsed * waterPrice;
        var log = new UtilityLog { RoomId = req.RoomId, Month = req.Month, OldElec = room.ElecMeter, NewElec = req.NewElec, ElecUsed = elecUsed, OldWater = room.WaterMeter, NewWater = req.NewWater, WaterUsed = waterUsed, ElecCost = elecCost, WaterCost = waterCost };
        room.ElecMeter = req.NewElec; room.WaterMeter = req.NewWater;
        db.UtilityLogs.Add(log);

        // ================================================================
        // TỰ ĐỘNG TẠO / CẬP NHẬT HÓA ĐƠN TIỀN NHÀ CHO PHÒNG KHI CHỐT ĐIỆN NƯỚC
        // ================================================================
        var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.RoomId == req.RoomId);
        if (tenant != null)
        {
            var existingInvoice = await db.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.RoomId == req.RoomId && i.Month == req.Month);
            decimal serviceFee = 150000;
            decimal rentFee = room.Price;

            var activeContract = await db.Contracts.FirstOrDefaultAsync(c => c.RoomId == req.RoomId && c.Status == ContractStatus.Active);
            if (activeContract != null && activeContract.RentAmount > 0)
            {
                rentFee = activeContract.RentAmount;
            }

            decimal totalAmount = rentFee + elecCost + waterCost + serviceFee;
            var dueDate = DateTime.UtcNow.AddDays(7);

            if (existingInvoice == null)
            {
                var code = $"HD-{req.Month.Replace("-", "")}-{room.RoomNumber}";
                var inv = new Invoice
                {
                    InvoiceCode = code,
                    RoomId = req.RoomId,
                    TenantProfileId = tenant.Id,
                    Month = req.Month,
                    RentFee = rentFee,
                    ElecFee = elecCost,
                    WaterFee = waterCost,
                    ServiceFee = serviceFee,
                    TotalAmount = totalAmount,
                    DueDate = dueDate,
                    Status = InvoiceStatus.Unpaid,
                    Items = new List<InvoiceItem>
                    {
                        new InvoiceItem { Name = $"Tiền thuê phòng {room.RoomNumber}", Amount = rentFee },
                        new InvoiceItem { Name = $"Tiền điện ({elecUsed} kWh x {elecPrice:N0}đ)", Amount = elecCost },
                        new InvoiceItem { Name = $"Tiền nước ({waterUsed} m³ x {waterPrice:N0}đ)", Amount = waterCost },
                        new InvoiceItem { Name = "Phí dịch vụ cố định (Wi-Fi, rác)", Amount = serviceFee },
                    }
                };
                db.Invoices.Add(inv);
            }
            else
            {
                existingInvoice.ElecFee = elecCost;
                existingInvoice.WaterFee = waterCost;
                existingInvoice.RentFee = rentFee;
                existingInvoice.ServiceFee = serviceFee;
                existingInvoice.TotalAmount = totalAmount;

                existingInvoice.Items.Clear();
                existingInvoice.Items.Add(new InvoiceItem { Name = $"Tiền thuê phòng {room.RoomNumber}", Amount = rentFee });
                existingInvoice.Items.Add(new InvoiceItem { Name = $"Tiền điện ({elecUsed} kWh x {elecPrice:N0}đ)", Amount = elecCost });
                existingInvoice.Items.Add(new InvoiceItem { Name = $"Tiền nước ({waterUsed} m³ x {waterPrice:N0}đ)", Amount = waterCost });
                existingInvoice.Items.Add(new InvoiceItem { Name = "Phí dịch vụ cố định (Wi-Fi, rác)", Amount = serviceFee });
            }
        }

        await db.SaveChangesAsync();
        log.Room = room;
        return MapLog(log);
    }

    // Lấy đơn giá điện nước hiện tại của Chủ trọ.
    public async Task<UtilityRateDto?> GetRateAsync(Guid landlordId)
    {
        var r = await db.UtilityRates.FirstOrDefaultAsync(r => r.LandlordId == landlordId);
        return r is null ? null : new UtilityRateDto(r.Id, r.ElecPrice, r.WaterPrice, r.UpdatedAt);
    }

    // Cập nhật đơn giá điện (đ/kWh) và giá nước (đ/m³) của Chủ trọ.
    public async Task<UtilityRateDto> UpdateRateAsync(Guid landlordId, UpdateUtilityRateRequest req)
    {
        var r = await db.UtilityRates.FirstOrDefaultAsync(x => x.LandlordId == landlordId);
        if (r is null) { r = new UtilityRate { LandlordId = landlordId, ElecPrice = req.ElecPrice, WaterPrice = req.WaterPrice }; db.UtilityRates.Add(r); }
        else { r.ElecPrice = req.ElecPrice; r.WaterPrice = req.WaterPrice; r.UpdatedAt = DateTime.UtcNow; }
        await db.SaveChangesAsync();
        return new UtilityRateDto(r.Id, r.ElecPrice, r.WaterPrice, r.UpdatedAt);
    }

    private static UtilityLogDto MapLog(UtilityLog u) => new(u.Id, u.RoomId, u.Room?.RoomNumber ?? "", u.Month, u.OldElec, u.NewElec, u.ElecUsed, u.OldWater, u.NewWater, u.WaterUsed, u.ElecCost, u.WaterCost, u.RecordedAt);
}
