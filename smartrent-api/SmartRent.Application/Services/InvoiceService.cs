using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Hóa đơn tiền nhà (tạo mới hóa đơn, xem danh sách hóa đơn, cập nhật trạng thái thanh toán).
public class InvoiceService(AppDbContext db)
{
    // Lấy danh sách hóa đơn của Chủ trọ (hỗ trợ phân trang và lọc theo trạng thái/tháng).
    public async Task<object> GetByLandlordAsync(Guid landlordId, string? status = null, string? month = null, int? page = null, int? pageSize = null)
    {
        var query = db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone).Include(i => i.TenantProfile).ThenInclude(t => t.User).Include(i => i.Items)
            .Where(i => i.Room.Zone.LandlordId == landlordId).AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(i => i.Status.ToString() == status);
        if (!string.IsNullOrEmpty(month)) query = query.Where(i => i.Month == month);
        var totalItems = await query.CountAsync();
        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            var items = await query.OrderByDescending(i => i.CreatedAt)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = items.Select(MapInvoice);
            return PagedResult<InvoiceDto>.Create(dtos, totalItems, p, ps);
        }
        return (await query.OrderByDescending(i => i.CreatedAt).ToListAsync()).Select(MapInvoice);
    }

    // Lấy danh sách hóa đơn của Khách thuê theo ID hồ sơ (TenantProfileId).
    public async Task<IEnumerable<InvoiceDto>> GetByTenantAsync(Guid tenantProfileId)
    {
        var invoices = await db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone).Include(i => i.Items)
            .Where(i => i.TenantProfileId == tenantProfileId).OrderByDescending(i => i.CreatedAt).ToListAsync();
        return invoices.Select(MapInvoice);
    }

    // Lấy danh sách hóa đơn của Khách thuê theo ID tài khoản (UserId).
    public async Task<IEnumerable<InvoiceDto>> GetByTenantUserIdAsync(Guid tenantUserId)
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

        var invoices = await db.Invoices
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .Where(i => i.TenantProfileId == profile.Id || (profile.RoomId.HasValue && i.RoomId == profile.RoomId.Value))
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return invoices.Select(MapInvoice);
    }

    // Lấy chi tiết một hóa đơn theo ID hóa đơn (kiểm tra quyền truy cập).
    public async Task<InvoiceDto?> GetByIdAsync(Guid id, Guid currentUserId, string role)
    {
        var query = db.Invoices
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .AsQueryable();

        if (role == "Landlord")
        {
            query = query.Where(i => i.Room.Zone.LandlordId == currentUserId);
        }
        else if (role == "Tenant")
        {
            query = query.Where(i => i.TenantProfile.UserId == currentUserId || (i.TenantProfile.RoomId.HasValue && i.RoomId == i.TenantProfile.RoomId.Value));
        }

        var i = await query.FirstOrDefaultAsync(i => i.Id == id);
        return i is null ? null : MapInvoice(i);
    }

    // Tạo mới một hóa đơn thủ công (Kiểm tra chống trùng hóa đơn cùng 1 phòng trong 1 tháng).
    public async Task<InvoiceDto> CreateAsync(Guid landlordId, CreateInvoiceRequest req)
    {
        var room = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == req.RoomId && r.Zone.LandlordId == landlordId) 
            ?? throw new KeyNotFoundException("Phòng không tồn tại hoặc không thuộc quyền quản lý của bạn");
        var tenant = await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.RoomId == req.RoomId) 
            ?? throw new KeyNotFoundException("Không có khách thuê trong phòng này");

        // Kiểm tra xem phòng này trong tháng đã có hóa đơn chưa (ngăn trùng lặp hóa đơn 2 lần trong 1 tháng)
        var existingInvoice = await db.Invoices.FirstOrDefaultAsync(i => i.RoomId == req.RoomId && i.Month == req.Month);
        if (existingInvoice != null)
        {
            throw new InvalidOperationException($"Phòng {room.RoomNumber} đã có hóa đơn tiền nhà cho tháng {req.Month} (Mã hóa đơn: {existingInvoice.InvoiceCode}). Mỗi phòng chỉ được tạo 1 hóa đơn trong 1 tháng. Vui lòng cập nhật hóa đơn hiện tại nếu cần sửa đổi thông tin.");
        }

        var activeServices = await db.Services
            .Include(s => s.Zone)
            .Where(s => s.LandlordId == landlordId && s.IsActive && (s.ZoneId == room.ZoneId || s.ZoneId == null))
            .ToListAsync();

        // Lấy danh sách tất cả người thuê trong phòng để tổng hợp số lượng xe
        var roomTenants = await db.TenantProfiles.Where(t => t.RoomId == req.RoomId).ToListAsync();
        int totalRoomVehicles = roomTenants.Sum(t => t.VehicleCount);

        decimal serviceFee = req.ServiceFee;
        var parkingService = activeServices.FirstOrDefault(s => s.Name.Contains("xe", StringComparison.OrdinalIgnoreCase));

        if (serviceFee == 0 && activeServices.Count > 0)
        {
            serviceFee = activeServices.Sum(s => s.Price);
            // Nếu có xe đăng ký và có dịch vụ xe, tự động nhân số lượng xe với đơn giá xe
            if (totalRoomVehicles > 0 && parkingService != null)
            {
                serviceFee = (serviceFee - parkingService.Price) + (totalRoomVehicles * parkingService.Price);
            }
        }

        var totalAmount = req.RentFee + req.ElecFee + req.WaterFee + serviceFee;
        var code = $"HD-{req.Month.Replace("-", "")}-{room.RoomNumber}";

        var itemsList = new List<InvoiceItem>
        {
            new InvoiceItem { Name = "Tiền thuê phòng", Amount = req.RentFee },
            new InvoiceItem { Name = "Tiền điện", Amount = req.ElecFee },
            new InvoiceItem { Name = "Tiền nước", Amount = req.WaterFee }
        };

        if (activeServices.Count > 0)
        {
            foreach (var svc in activeServices)
            {
                var zoneTag = svc.Zone != null ? $" ({svc.Zone.Name})" : "";
                if (svc.Id == parkingService?.Id && totalRoomVehicles > 0)
                {
                    itemsList.Add(new InvoiceItem { Name = $"{svc.Name} ({totalRoomVehicles} xe){zoneTag}", Amount = totalRoomVehicles * svc.Price });
                }
                else
                {
                    itemsList.Add(new InvoiceItem { Name = $"{svc.Name}{zoneTag}", Amount = svc.Price });
                }
            }
        }
        else
        {
            var vehicleNote = totalRoomVehicles > 0 ? $" ({totalRoomVehicles} xe)" : "";
            itemsList.Add(new InvoiceItem { Name = $"Phí dịch vụ{vehicleNote}", Amount = serviceFee });
        }


        var inv = new Invoice
        {
            InvoiceCode = code,
            RoomId = req.RoomId,
            TenantProfileId = tenant.Id,
            Month = req.Month,
            RentFee = req.RentFee,
            ElecFee = req.ElecFee,
            WaterFee = req.WaterFee,
            ServiceFee = serviceFee,
            TotalAmount = totalAmount,
            DueDate = req.DueDate,
            Items = itemsList
        };
        db.Invoices.Add(inv);
        
        // Tự động tạo thông báo gửi đến app cho khách thuê khi hóa đơn tiền nhà được phát hành
        var notif = new Notification
        {
            SenderId = landlordId,
            Title = $"Thông báo hóa đơn tiền nhà tháng {req.Month}",
            Content = $"Phòng {room.RoomNumber}: Hóa đơn mã {code} với tổng số tiền {totalAmount:N0} VNĐ đã được phát hành. Hạn đóng: {req.DueDate:dd/MM/yyyy}.",
            Target = NotificationTarget.User,
            TargetId = tenant.UserId,
            CreatedAt = DateTime.UtcNow
        };
        db.Notifications.Add(notif);

        await db.SaveChangesAsync();
        inv.Room = room; inv.TenantProfile = tenant;
        return MapInvoice(inv);
    }

    // Cập nhật thông tin chi tiết hóa đơn (kiểm tra quyền sở hữu).
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
        return MapInvoice(inv);
    }

    // Cập nhật trạng thái hóa đơn (kiểm tra quyền sở hữu).
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

            // Tự động tạo thông báo xác nhận đã đóng tiền nhà thành công
            if (inv.TenantProfile != null)
            {
                var notifPaid = new Notification
                {
                    SenderId = landlordId,
                    Title = $"Xác nhận thanh toán hóa đơn {inv.InvoiceCode}",
                    Content = $"Hóa đơn tiền nhà tháng {inv.Month} (Phòng {inv.Room?.RoomNumber}) số tiền {inv.TotalAmount:N0} VNĐ đã được xác nhận thanh toán thành công.",
                    Target = NotificationTarget.User,
                    TargetId = inv.TenantProfile.UserId,
                    CreatedAt = DateTime.UtcNow
                };
                db.Notifications.Add(notifPaid);
            }
        }

        await db.SaveChangesAsync();
        return MapInvoice(inv);
    }

    // Khách thuê gửi báo cáo / khiếu nại sai sót số liệu hóa đơn cho Chủ trọ.
    public async Task<object> ReportInvoiceAsync(Guid id, Guid currentUserId, ReportInvoiceRequest req)
    {
        var inv = await db.Invoices
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new KeyNotFoundException("Hóa đơn không tồn tại.");

        // Kiểm tra quyền: Hóa đơn này phải thuộc về khách thuê hiện tại
        if (inv.TenantProfile?.UserId != currentUserId && (!inv.TenantProfile.RoomId.HasValue || inv.RoomId != inv.TenantProfile.RoomId.Value))
        {
            var myProfile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == currentUserId);
            if (myProfile == null || myProfile.Id != inv.TenantProfileId)
                throw new UnauthorizedAccessException("Bạn không có quyền báo cáo sai sót cho hóa đơn này.");
        }

        var landlordId = inv.Room?.Zone?.LandlordId 
            ?? throw new InvalidOperationException("Không tìm thấy chủ trọ quản lý phòng này.");

        var senderName = inv.TenantProfile?.User?.FullName ?? "Khách thuê";
        var roomNumber = inv.Room?.RoomNumber ?? "";

        // 1. Tạo Notification gửi riêng cho Chủ trọ
        var notif = new Notification
        {
            SenderId = currentUserId,
            Title = $"⚠️ Báo cáo sai sót HĐ {inv.InvoiceCode} - Phòng {roomNumber}",
            Content = $"Khách thuê {senderName} (Phòng {roomNumber}) đã gửi báo cáo sai sót cho hóa đơn {inv.InvoiceCode} (Kỳ {inv.Month}).\n• Lý do: {req.Reason}\n• Nội dung: {req.Description}" + (!string.IsNullOrEmpty(req.ImageUrl) ? $"\n• Ảnh đính kèm: {req.ImageUrl}" : ""),
            Target = NotificationTarget.User,
            TargetId = landlordId,
            CreatedAt = DateTime.UtcNow
        };
        db.Notifications.Add(notif);

        // 2. Ghi nhận vào bảng Complaints để lưu vết lịch sử khiếu nại của hệ thống
        var complaint = new Complaint
        {
            SenderId = currentUserId,
            Title = $"[Báo cáo HĐ {inv.InvoiceCode}] {req.Reason} - Phòng {roomNumber}",
            Content = $"Mã hóa đơn: {inv.InvoiceCode} (Kỳ {inv.Month})\nPhòng: {roomNumber}\nTổng tiền: {inv.TotalAmount:N0} VNĐ\nLý do báo sai: {req.Reason}\nChi tiết: {req.Description}" + (!string.IsNullOrEmpty(req.ImageUrl) ? $"\nẢnh minh chứng: {req.ImageUrl}" : ""),
            Status = ComplaintStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        db.Complaints.Add(complaint);

        await db.SaveChangesAsync();

        return new
        {
            success = true,
            message = $"Đã gửi báo cáo sai sót hóa đơn {inv.InvoiceCode} thành công tới chủ trọ!",
            invoiceCode = inv.InvoiceCode,
            reportedAt = DateTime.UtcNow
        };
    }

    private static InvoiceDto MapInvoice(Invoice i) => new(
        i.Id, 
        i.InvoiceCode, 
        i.RoomId, 
        i.Room?.RoomNumber ?? "", 
        i.TenantProfileId, 
        i.TenantProfile?.User?.FullName ?? "", 
        i.Month, 
        i.RentFee, 
        i.ElecFee, 
        i.WaterFee, 
        i.ServiceFee, 
        i.TotalAmount, 
        i.Status.ToString(), 
        i.DueDate, 
        i.PaidDate, 
        i.CreatedAt, 
        i.Items.Select(x => new InvoiceItemDto(x.Id, x.Name, x.Amount)).ToList()
    );
}
