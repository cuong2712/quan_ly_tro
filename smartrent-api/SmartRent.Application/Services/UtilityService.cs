using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Điện nước (Ghi chỉ số hàng tháng, cài đặt đơn giá điện nước và tự động tính/tạo Hóa đơn).
public class UtilityService(AppDbContext db)
{
    // Lấy nhật ký chỉ số điện nước (hỗ trợ phân trang và lọc theo phòng).
    public async Task<object> GetByLandlordAsync(Guid landlordId, Guid? roomId = null, int? page = null, int? pageSize = null)
    {
        var query = db.UtilityLogs.Include(u => u.Room).ThenInclude(r => r.Zone).Where(u => u.Room.Zone.LandlordId == landlordId).AsQueryable();
        if (roomId.HasValue) query = query.Where(u => u.RoomId == roomId);
        var totalItems = await query.CountAsync();
        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            var items = await query.OrderByDescending(u => u.Month)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = items.Select(MapLog);
            return PagedResult<UtilityLogDto>.Create(dtos, totalItems, p, ps);
        }
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
            
            // 1. Lấy danh sách Dịch vụ của Khu vực / Chủ trọ
            var activeServices = await db.Services
                .Include(s => s.Zone)
                .Where(s => s.LandlordId == landlordId && s.IsActive && (s.ZoneId == room.ZoneId || s.ZoneId == null))
                .ToListAsync();

            var roomTenants = await db.TenantProfiles.Where(t => t.RoomId == req.RoomId).ToListAsync();
            int totalRoomVehicles = roomTenants.Sum(t => t.VehicleCount);

            decimal rentFee = room.Price;
            var activeContract = await db.Contracts.FirstOrDefaultAsync(c => c.RoomId == req.RoomId && c.Status == ContractStatus.Active);
            if (activeContract != null && activeContract.RentAmount > 0)
            {
                rentFee = activeContract.RentAmount;
            }

            decimal serviceFee = 0;
            var itemsList = new List<InvoiceItem>
            {
                new InvoiceItem { Name = $"Tiền thuê phòng {room.RoomNumber}", Amount = rentFee },
                new InvoiceItem { Name = $"Tiền điện ({elecUsed} kWh x {elecPrice:N0}đ)", Amount = elecCost },
                new InvoiceItem { Name = $"Tiền nước ({waterUsed} m³ x {waterPrice:N0}đ)", Amount = waterCost },
            };

            // 2. Tính tiền dịch vụ: Cả khu trọ đều dùng chung các dịch vụ đã thiết lập trong Khu (Wi-Fi, Rác, Gửi xe, Vệ sinh...)
            if (activeServices.Count > 0)
            {
                foreach (var svc in activeServices)
                {
                    var isParking = svc.Name.Contains("xe", StringComparison.OrdinalIgnoreCase);
                    var zoneTag = svc.Zone != null ? $" ({svc.Zone.Name})" : "";
                    if (isParking && totalRoomVehicles > 0)
                    {
                        decimal parkCost = totalRoomVehicles * svc.Price;
                        serviceFee += parkCost;
                        itemsList.Add(new InvoiceItem { Name = $"{svc.Name} ({totalRoomVehicles} xe){zoneTag}", Amount = parkCost });
                    }
                    else
                    {
                        serviceFee += svc.Price;
                        itemsList.Add(new InvoiceItem { Name = $"{svc.Name}{zoneTag}", Amount = svc.Price });
                    }
                }
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
                    Items = itemsList
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

                db.InvoiceItems.RemoveRange(existingInvoice.Items);
                existingInvoice.Items = itemsList;
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

    // Xóa bản ghi lịch sử điện nước (phục vụ kiểm thử & điều chỉnh) và hoàn tác số đồng hồ cũ
    public async Task<bool> DeleteLogAsync(Guid landlordId, Guid id)
    {
        var log = await db.UtilityLogs.Include(u => u.Room).ThenInclude(r => r.Zone)
            .FirstOrDefaultAsync(u => u.Id == id && u.Room.Zone.LandlordId == landlordId);
        if (log == null) return false;

        var room = log.Room;
        if (room != null)
        {
            var hasNewerLog = await db.UtilityLogs.AnyAsync(u => u.RoomId == room.Id && u.Id != id && u.RecordedAt > log.RecordedAt);
            if (!hasNewerLog)
            {
                room.ElecMeter = log.OldElec;
                room.WaterMeter = log.OldWater;
            }
        }

        db.UtilityLogs.Remove(log);
        await db.SaveChangesAsync();
        return true;
    }

    private static UtilityLogDto MapLog(UtilityLog u) => new(u.Id, u.RoomId, u.Room?.RoomNumber ?? "", u.Month, u.OldElec, u.NewElec, u.ElecUsed, u.OldWater, u.NewWater, u.WaterUsed, u.ElecCost, u.WaterCost, u.RecordedAt);
}
