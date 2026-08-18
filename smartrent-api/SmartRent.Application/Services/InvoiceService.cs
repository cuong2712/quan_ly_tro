using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Hóa đơn tiền nhà (tạo mới hóa đơn, xem danh sách hóa đơn, cập nhật trạng thái thanh toán & thông báo realtime).
public class InvoiceService(AppDbContext db, NotificationService notificationService)
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

        var existingInvoice = await db.Invoices.FirstOrDefaultAsync(i => i.RoomId == req.RoomId && i.Month == req.Month);
        if (existingInvoice != null)
        {
            throw new InvalidOperationException($"Phòng {room.RoomNumber} đã có hóa đơn tiền nhà cho tháng {req.Month} (Mã hóa đơn: {existingInvoice.InvoiceCode}). Mỗi phòng chỉ được tạo 1 hóa đơn trong 1 tháng. Vui lòng cập nhật hóa đơn hiện tại nếu cần sửa đổi thông tin.");
        }

        var activeServices = await db.Services
            .Include(s => s.Zone)
            .Where(s => s.LandlordId == landlordId && s.IsActive && (s.ZoneId == room.ZoneId || s.ZoneId == null))
            .ToListAsync();

        var roomTenants = await db.TenantProfiles.Where(t => t.RoomId == req.RoomId).ToListAsync();
        int totalRoomVehicles = roomTenants.Sum(t => t.VehicleCount);

        decimal calculatedServiceFee = 0;
        var itemsList = new List<InvoiceItem>
        {
            new InvoiceItem { Name = $"Tiền thuê phòng {room.RoomNumber}", Amount = req.RentFee },
            new InvoiceItem { Name = "Tiền điện", Amount = req.ElecFee },
            new InvoiceItem { Name = "Tiền nước", Amount = req.WaterFee }
        };

        if (activeServices.Count > 0)
        {
            foreach (var svc in activeServices)
            {
                var isParking = svc.Name.Contains("xe", StringComparison.OrdinalIgnoreCase);
                var zoneTag = svc.Zone != null ? $" ({svc.Zone.Name})" : "";
                if (isParking && totalRoomVehicles > 0)
                {
                    decimal parkCost = totalRoomVehicles * svc.Price;
                    calculatedServiceFee += parkCost;
                    itemsList.Add(new InvoiceItem { Name = $"{svc.Name} ({totalRoomVehicles} xe){zoneTag}", Amount = parkCost });
                }
                else
                {
                    calculatedServiceFee += svc.Price;
                    itemsList.Add(new InvoiceItem { Name = $"{svc.Name}{zoneTag}", Amount = svc.Price });
                }
            }
        }

        if (activeServices.Count == 0 && req.ServiceFee > 0)
        {
            calculatedServiceFee = req.ServiceFee;
            var vehicleNote = totalRoomVehicles > 0 ? $" ({totalRoomVehicles} xe)" : "";
            itemsList.Add(new InvoiceItem { Name = $"Phí dịch vụ{vehicleNote}", Amount = calculatedServiceFee });
        }

        var totalAmount = req.RentFee + req.ElecFee + req.WaterFee + calculatedServiceFee;
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
        return MapInvoice(inv);
    }

    // Xóa một hóa đơn (dành cho chủ trọ dễ dàng quản lý và kiểm tra dữ liệu)
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

        // Gửi thông báo cập nhật hóa đơn cho khách thuê
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
        return MapInvoice(inv);
    }

    // Khách thuê gửi báo cáo / khiếu nại sai sót số liệu hóa đơn cho Chủ trọ.
    public async Task<InvoiceDto> ReportInvoiceAsync(Guid id, Guid currentUserId, ReportInvoiceRequest req)
    {
        var inv = await db.Invoices
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new KeyNotFoundException("Hóa đơn không tồn tại.");

        if (inv.TenantProfile?.UserId != currentUserId && (inv.TenantProfile?.RoomId == null || inv.RoomId != inv.TenantProfile.RoomId.Value))
        {
            var myProfile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == currentUserId);
            if (myProfile == null || myProfile.Id != inv.TenantProfileId)
                throw new UnauthorizedAccessException("Bạn không có quyền báo cáo sai sót cho hóa đơn này.");
        }

        var landlordId = inv.Room?.Zone?.LandlordId 
            ?? throw new InvalidOperationException("Không tìm thấy chủ trọ quản lý phòng này.");

        var senderName = inv.TenantProfile?.User?.FullName ?? "Khách thuê";
        var roomNumber = inv.Room?.RoomNumber ?? "";

        // 1. Cập nhật thông tin khiếu nại vào Invoice
        inv.IsReported = true;
        inv.DisputeReason = req.Reason;
        inv.DisputeDescription = req.Description;
        inv.DisputeImageUrl = req.ImageUrl;
        inv.DisputeStatus = "Pending";
        inv.DisputeCreatedAt = DateTime.UtcNow;
        inv.DisputeResolvedAt = null;
        inv.DisputeReply = null;
        inv.SuggestedElecNumber = req.SuggestedElecNumber;
        inv.SuggestedWaterNumber = req.SuggestedWaterNumber;

        // 2. Ghi nhận vào bảng Complaints để lưu vết lịch sử khiếu nại của hệ thống
        var complaint = new Complaint
        {
            SenderId = currentUserId,
            Title = $"[Báo cáo HĐ {inv.InvoiceCode}] {req.Reason} - Phòng {roomNumber}",
            Content = $"Mã hóa đơn: {inv.InvoiceCode} (Kỳ {inv.Month})\nPhòng: {roomNumber}\nTổng tiền: {inv.TotalAmount:N0} VNĐ\nLý do: {req.Reason}\nChi tiết: {req.Description}" + (!string.IsNullOrEmpty(req.ImageUrl) ? $"\nẢnh minh chứng: {req.ImageUrl}" : ""),
            Status = ComplaintStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        db.Complaints.Add(complaint);
        await db.SaveChangesAsync();

        // 3. Tạo Notification gửi riêng cho Chủ trọ và push realtime
        var details = $"Khách thuê {senderName} (Phòng {roomNumber}) đã gửi yêu cầu kiểm tra lại hóa đơn {inv.InvoiceCode} (Kỳ {inv.Month}).\n• Lý do: {req.Reason}\n• Mô tả: {req.Description}";
        if (req.SuggestedElecNumber.HasValue) details += $"\n• Chỉ số điện đề xuất: {req.SuggestedElecNumber.Value}";
        if (req.SuggestedWaterNumber.HasValue) details += $"\n• Chỉ số nước đề xuất: {req.SuggestedWaterNumber.Value}";
        if (!string.IsNullOrEmpty(req.ImageUrl)) details += $"\n• Có kèm ảnh minh chứng công tơ / biên lai.";

        await notificationService.SendNotificationAsync(
            currentUserId,
            $"⚠️ Yêu cầu kiểm tra lại HĐ {inv.InvoiceCode} - Phòng {roomNumber}",
            details,
            NotificationTarget.User,
            landlordId
        );

        return MapInvoice(inv);
    }

    // Khách thuê hủy yêu cầu kiểm tra lại hóa đơn
    public async Task<InvoiceDto> CancelReportInvoiceAsync(Guid id, Guid currentUserId)
    {
        var inv = await db.Invoices
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new KeyNotFoundException("Hóa đơn không tồn tại.");

        if (inv.TenantProfile?.UserId != currentUserId && (inv.TenantProfile?.RoomId == null || inv.RoomId != inv.TenantProfile.RoomId.Value))
        {
            var myProfile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == currentUserId);
            if (myProfile == null || myProfile.Id != inv.TenantProfileId)
                throw new UnauthorizedAccessException("Bạn không có quyền thao tác với hóa đơn này.");
        }

        inv.IsReported = false;
        inv.DisputeStatus = null;
        inv.DisputeReason = null;
        inv.DisputeDescription = null;
        inv.DisputeImageUrl = null;
        inv.SuggestedElecNumber = null;
        inv.SuggestedWaterNumber = null;

        await db.SaveChangesAsync();

        var landlordId = inv.Room?.Zone?.LandlordId;
        if (landlordId.HasValue)
        {
            await notificationService.SendNotificationAsync(
                currentUserId,
                $"ℹ️ Khách thuê đã hủy yêu cầu kiểm tra HĐ {inv.InvoiceCode}",
                $"Khách thuê Phòng {inv.Room?.RoomNumber} đã hủy yêu cầu kiểm tra lại hóa đơn {inv.InvoiceCode}.",
                NotificationTarget.User,
                landlordId.Value
            );
        }

        return MapInvoice(inv);
    }

    // Chủ trọ xử lý yêu cầu kiểm tra lại hóa đơn (Chấp nhận điều chỉnh hoặc Từ chối)
    public async Task<InvoiceDto> ResolveDisputeAsync(Guid id, Guid landlordId, ResolveInvoiceDisputeRequest req)
    {
        var inv = await db.Invoices
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id && i.Room.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Hóa đơn không tồn tại hoặc bạn không có quyền thao tác.");

        var isAccept = string.Equals(req.Action, "Accept", StringComparison.OrdinalIgnoreCase);

        if (isAccept)
        {
            if (req.RentFee.HasValue) inv.RentFee = req.RentFee.Value;
            if (req.ElecFee.HasValue) inv.ElecFee = req.ElecFee.Value;
            if (req.WaterFee.HasValue) inv.WaterFee = req.WaterFee.Value;
            if (req.ServiceFee.HasValue) inv.ServiceFee = req.ServiceFee.Value;
            if (req.DueDate.HasValue) inv.DueDate = req.DueDate.Value;

            inv.TotalAmount = inv.RentFee + inv.ElecFee + inv.WaterFee + inv.ServiceFee;

            var rentItem = inv.Items.FirstOrDefault(x => x.Name == "Tiền thuê phòng");
            if (rentItem != null) rentItem.Amount = inv.RentFee;

            var elecItem = inv.Items.FirstOrDefault(x => x.Name == "Tiền điện");
            if (elecItem != null) elecItem.Amount = inv.ElecFee;

            var waterItem = inv.Items.FirstOrDefault(x => x.Name == "Tiền nước");
            if (waterItem != null) waterItem.Amount = inv.WaterFee;

            var svcItem = inv.Items.FirstOrDefault(x => x.Name == "Phí dịch vụ" || x.Name.StartsWith("Phí dịch vụ"));
            if (svcItem != null) svcItem.Amount = inv.ServiceFee;

            inv.DisputeStatus = "Resolved";
            inv.DisputeResolvedAt = DateTime.UtcNow;
            inv.DisputeReply = !string.IsNullOrWhiteSpace(req.Reply) ? req.Reply : "Chủ trọ đã kiểm tra và điều chỉnh lại số liệu hóa đơn.";
            inv.DisputeHandledBy = landlordId;

            await db.SaveChangesAsync();

            // Gửi thông báo xác nhận điều chỉnh cho khách thuê
            if (inv.TenantProfile != null)
            {
                await notificationService.SendNotificationAsync(
                    landlordId,
                    $"✅ Đã điều chỉnh hóa đơn {inv.InvoiceCode} - Phòng {inv.Room?.RoomNumber}",
                    $"Chủ trọ đã kiểm tra và điều chỉnh hóa đơn {inv.InvoiceCode} (Kỳ {inv.Month}).\n• Tổng tiền mới: {inv.TotalAmount:N0} VNĐ (Điện: {inv.ElecFee:N0}đ, Nước: {inv.WaterFee:N0}đ, Phòng: {inv.RentFee:N0}đ, Dịch vụ: {inv.ServiceFee:N0}đ).\n• Phản hồi từ chủ trọ: {inv.DisputeReply}",
                    NotificationTarget.User,
                    inv.TenantProfile.UserId
                );
            }
        }
        else
        {
            inv.DisputeStatus = "Rejected";
            inv.DisputeResolvedAt = DateTime.UtcNow;
            inv.DisputeReply = !string.IsNullOrWhiteSpace(req.Reply) ? req.Reply : "Chủ trọ đã kiểm tra lại các chỉ số và xác nhận số liệu hóa đơn là chính xác.";
            inv.DisputeHandledBy = landlordId;

            await db.SaveChangesAsync();

            // Gửi thông báo từ chối / giải thích cho khách thuê
            if (inv.TenantProfile != null)
            {
                await notificationService.SendNotificationAsync(
                    landlordId,
                    $"ℹ️ Phản hồi kiểm tra HĐ {inv.InvoiceCode} - Phòng {inv.Room?.RoomNumber}",
                    $"Chủ trọ đã phản hồi yêu cầu kiểm tra hóa đơn {inv.InvoiceCode} (Kỳ {inv.Month}).\n• Phản hồi: {inv.DisputeReply}\n• Tổng tiền giữ nguyên: {inv.TotalAmount:N0} VNĐ.",
                    NotificationTarget.User,
                    inv.TenantProfile.UserId
                );
            }
        }

        return MapInvoice(inv);
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
        i.Items.Select(x => new InvoiceItemDto(x.Id, x.Name, x.Amount)).ToList(),
        i.IsReported,
        i.DisputeReason,
        i.DisputeDescription,
        i.DisputeImageUrl,
        i.DisputeStatus,
        i.DisputeCreatedAt,
        i.DisputeResolvedAt,
        i.DisputeReply,
        i.SuggestedElecNumber,
        i.SuggestedWaterNumber
    );
}
