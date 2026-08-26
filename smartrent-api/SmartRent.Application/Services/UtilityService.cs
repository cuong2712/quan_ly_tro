using Microsoft.EntityFrameworkCore;
using SmartRent.Application.Common.Mappings;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Điện nước (Ghi chỉ số hàng tháng, cài đặt đơn giá điện nước và tự động tính/tạo Hóa đơn).
public class UtilityService(AppDbContext db, NotificationService notificationService)
{
    // Lấy nhật ký chỉ số điện nước (hỗ trợ phân trang và lọc theo phòng).
    public async Task<object> GetByLandlordAsync(Guid landlordId, Guid? roomId = null, int? page = null, int? pageSize = null)
    {
        var query = db.UtilityLogs
            .AsNoTracking()
            .Include(u => u.Room).ThenInclude(r => r.Zone)
            .Where(u => u.Room.Zone.LandlordId == landlordId).AsQueryable();
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

                if (existingInvoice.Items != null && existingInvoice.Items.Count > 0)
                {
                    db.InvoiceItems.RemoveRange(existingInvoice.Items);
                    existingInvoice.Items.Clear();
                }

                foreach (var itm in itemsList)
                {
                    itm.InvoiceId = existingInvoice.Id;
                    existingInvoice.Items.Add(itm);
                }
            }
        }

        await db.SaveChangesAsync();
        log.Room = room;
        return MapLog(log);
    }

    // Ghi nhận hàng loạt chỉ số điện nước từ Excel và tự động tính toán, phát hành hóa đơn cho tất cả các phòng.
    public async Task<BulkRecordResultDto> BulkRecordAsync(Guid landlordId, BulkRecordUtilityRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Month))
        {
            throw new InvalidOperationException("Vui lòng chọn tháng chốt số điện nước.");
        }

        if (req.Items == null || req.Items.Count == 0)
        {
            throw new InvalidOperationException("Danh sách phòng chốt điện nước trống.");
        }

        var rate = await db.UtilityRates.AsNoTracking().FirstOrDefaultAsync(r => r.LandlordId == landlordId);
        decimal elecPrice = rate?.ElecPrice ?? 3500;
        decimal waterPrice = rate?.WaterPrice ?? 18000;

        var landlordRooms = await db.Rooms
            .Include(r => r.Zone)
            .Include(r => r.Tenants).ThenInclude(t => t.User)
            .Where(r => r.Zone.LandlordId == landlordId)
            .ToListAsync();

        var activeServices = await db.Services
            .Include(s => s.Zone)
            .Where(s => s.LandlordId == landlordId && s.IsActive)
            .ToListAsync();

        var activeContracts = await db.Contracts
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.Room.Zone.LandlordId == landlordId && 
                       (c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested))
            .ToListAsync();

        var existingInvoices = await db.Invoices
            .Include(i => i.Items)
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Where(i => i.Room.Zone.LandlordId == landlordId && i.Month == req.Month)
            .ToListAsync();

        int totalProcessed = req.Items.Count;
        int successCount = 0;
        int errorCount = 0;
        decimal totalRevenue = 0;
        var errorMessages = new List<string>();
        var createdInvoices = new List<Invoice>();
        var notificationsToSend = new List<(Guid senderId, string title, string message, Guid targetUserId)>();

        var defaultDueDate = req.DueDate ?? DateTime.UtcNow.AddDays(7);

        foreach (var item in req.Items)
        {
            // 1. Tìm phòng tương ứng
            Room? room = null;
            if (item.RoomId.HasValue && item.RoomId.Value != Guid.Empty)
            {
                room = landlordRooms.FirstOrDefault(r => r.Id == item.RoomId.Value);
            }

            if (room == null && !string.IsNullOrWhiteSpace(item.RoomNumber))
            {
                room = landlordRooms.FirstOrDefault(r =>
                    string.Equals(r.RoomNumber, item.RoomNumber.Trim(), StringComparison.OrdinalIgnoreCase) &&
                    (string.IsNullOrWhiteSpace(item.ZoneName) || string.Equals(r.Zone?.Name, item.ZoneName.Trim(), StringComparison.OrdinalIgnoreCase))
                );

                if (room == null)
                {
                    room = landlordRooms.FirstOrDefault(r => string.Equals(r.RoomNumber, item.RoomNumber.Trim(), StringComparison.OrdinalIgnoreCase));
                }
            }

            if (room == null)
            {
                errorCount++;
                errorMessages.Add($"Phòng '{item.RoomNumber ?? item.RoomId?.ToString()}' không tồn tại hoặc không thuộc khu trọ của bạn.");
                continue;
            }

            // 2. Validate chỉ số mới >= chỉ số cũ
            if (item.NewElec < room.ElecMeter)
            {
                errorCount++;
                errorMessages.Add($"Phòng P.{room.RoomNumber}: Số điện mới ({item.NewElec}) nhỏ hơn số điện cũ ({room.ElecMeter}).");
                continue;
            }

            if (item.NewWater < room.WaterMeter)
            {
                errorCount++;
                errorMessages.Add($"Phòng P.{room.RoomNumber}: Số nước mới ({item.NewWater}) nhỏ hơn số nước cũ ({room.WaterMeter}).");
                continue;
            }

            // 3. Tính toán lượng tiêu thụ & chi phí
            var elecUsed = item.NewElec - room.ElecMeter;
            var waterUsed = item.NewWater - room.WaterMeter;
            var elecCost = elecUsed * elecPrice;
            var waterCost = waterUsed * waterPrice;

            var existingLog = await db.UtilityLogs.FirstOrDefaultAsync(u => u.RoomId == room.Id && u.Month == req.Month);
            if (existingLog == null)
            {
                var log = new UtilityLog
                {
                    RoomId = room.Id,
                    Month = req.Month,
                    OldElec = room.ElecMeter,
                    NewElec = item.NewElec,
                    ElecUsed = elecUsed,
                    OldWater = room.WaterMeter,
                    NewWater = item.NewWater,
                    WaterUsed = waterUsed,
                    ElecCost = elecCost,
                    WaterCost = waterCost
                };
                db.UtilityLogs.Add(log);
            }
            else
            {
                existingLog.OldElec = room.ElecMeter;
                existingLog.NewElec = item.NewElec;
                existingLog.ElecUsed = elecUsed;
                existingLog.OldWater = room.WaterMeter;
                existingLog.NewWater = item.NewWater;
                existingLog.WaterUsed = waterUsed;
                existingLog.ElecCost = elecCost;
                existingLog.WaterCost = waterCost;
            }

            room.ElecMeter = item.NewElec;
            room.WaterMeter = item.NewWater;

            // 4. Tạo hoặc cập nhật hóa đơn nếu phòng có khách thuê
            var activeContract = activeContracts.FirstOrDefault(c => c.RoomId == room.Id);
            var tenant = activeContract?.TenantProfile 
                         ?? room.Tenants.FirstOrDefault(t => t.UserId != Guid.Empty) 
                         ?? room.Tenants.FirstOrDefault();

            if (tenant != null)
            {
                decimal rentFee = room.Price;
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

                var roomServices = activeServices
                    .Where(s => s.ZoneId == room.ZoneId || s.ZoneId == null)
                    .ToList();

                int totalVehicles = room.Tenants.Sum(t => t.VehicleCount);

                foreach (var svc in roomServices)
                {
                    var isParking = svc.Name.Contains("xe", StringComparison.OrdinalIgnoreCase);
                    var zoneTag = svc.Zone != null ? $" ({svc.Zone.Name})" : "";
                    if (isParking && totalVehicles > 0)
                    {
                        decimal parkCost = totalVehicles * svc.Price;
                        serviceFee += parkCost;
                        itemsList.Add(new InvoiceItem { Name = $"{svc.Name} ({totalVehicles} xe){zoneTag}", Amount = parkCost });
                    }
                    else
                    {
                        serviceFee += svc.Price;
                        itemsList.Add(new InvoiceItem { Name = $"{svc.Name}{zoneTag}", Amount = svc.Price });
                    }
                }

                if (roomServices.Count == 0 && room.ServiceFee > 0)
                {
                    serviceFee += room.ServiceFee;
                    itemsList.Add(new InvoiceItem { Name = "Phí dịch vụ chung", Amount = room.ServiceFee });
                }

                decimal totalAmount = rentFee + elecCost + waterCost + serviceFee;
                totalRevenue += totalAmount;

                var existingInvoice = existingInvoices.FirstOrDefault(i => i.RoomId == room.Id);
                if (existingInvoice == null)
                {
                    var code = $"HD-{req.Month.Replace("-", "")}-{room.RoomNumber}";
                    var inv = new Invoice
                    {
                        InvoiceCode = code,
                        RoomId = room.Id,
                        TenantProfileId = tenant.Id,
                        Month = req.Month,
                        RentFee = rentFee,
                        ElecFee = elecCost,
                        WaterFee = waterCost,
                        ServiceFee = serviceFee,
                        TotalAmount = totalAmount,
                        DueDate = defaultDueDate,
                        Status = InvoiceStatus.Unpaid,
                        Items = itemsList,
                        Room = room,
                        TenantProfile = tenant
                    };
                    db.Invoices.Add(inv);
                    createdInvoices.Add(inv);
                }
                else
                {
                    existingInvoice.ElecFee = elecCost;
                    existingInvoice.WaterFee = waterCost;
                    existingInvoice.RentFee = rentFee;
                    existingInvoice.ServiceFee = serviceFee;
                    existingInvoice.TotalAmount = totalAmount;
                    existingInvoice.DueDate = defaultDueDate;
                    existingInvoice.TenantProfileId = tenant.Id;
                    existingInvoice.TenantProfile = tenant;

                    if (existingInvoice.Items != null && existingInvoice.Items.Count > 0)
                    {
                        db.InvoiceItems.RemoveRange(existingInvoice.Items);
                        existingInvoice.Items.Clear();
                    }

                    foreach (var itm in itemsList)
                    {
                        itm.InvoiceId = existingInvoice.Id;
                        existingInvoice.Items.Add(itm);
                    }
                    createdInvoices.Add(existingInvoice);
                }

                if (tenant.UserId != Guid.Empty)
                {
                    notificationsToSend.Add((
                        landlordId,
                        $"🧾 Hóa đơn tiền nhà tháng {req.Month} - Phòng P.{room.RoomNumber}",
                        $"Hóa đơn tháng {req.Month} của phòng P.{room.RoomNumber} đã được phát hành với tổng tiền: {totalAmount:N0} đ. Hạn nộp: {defaultDueDate:dd/MM/yyyy}.",
                        tenant.UserId
                    ));
                }
            }
            else
            {
                errorMessages.Add($"Phòng P.{room.RoomNumber}: Đã ghi nhận số điện nước ({elecUsed} kWh, {waterUsed} m³) nhưng phòng đang trống (chưa có khách thuê), không tạo hóa đơn.");
            }

            successCount++;
        }

        await db.SaveChangesAsync();

        // Gửi thông báo background cho từng khách thuê
        foreach (var notif in notificationsToSend)
        {
            try
            {
                await notificationService.SendNotificationAsync(
                    notif.senderId,
                    notif.title,
                    notif.message,
                    NotificationTarget.User,
                    notif.targetUserId
                );
            }
            catch { /* non-blocking */ }
        }

        var dtos = createdInvoices.Select(i => i.ToInvoiceDto()).ToList();
        return new BulkRecordResultDto(totalProcessed, successCount, errorCount, totalRevenue, errorMessages, dtos);
    }

    // Lấy đơn giá điện nước hiện tại của Chủ trọ.
    public async Task<UtilityRateDto?> GetRateAsync(Guid landlordId)
    {
        var r = await db.UtilityRates.AsNoTracking().FirstOrDefaultAsync(r => r.LandlordId == landlordId);
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
