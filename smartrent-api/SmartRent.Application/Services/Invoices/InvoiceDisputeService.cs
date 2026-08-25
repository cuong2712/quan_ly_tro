using Microsoft.EntityFrameworkCore;
using SmartRent.Application.Common.Mappings;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Invoices;

// Dịch vụ xử lý Khiếu nại / Báo cáo sai lệch số liệu hóa đơn
public class InvoiceDisputeService(AppDbContext db, NotificationService notificationService)
{
    // Khách thuê gửi báo cáo / khiếu nại sai sót số liệu hóa đơn cho Chủ trọ.
    public async Task<InvoiceDto> ReportInvoiceAsync(Guid id, Guid currentUserId, ReportInvoiceRequest req)
    {
        var inv = await db.Invoices
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new KeyNotFoundException("Hóa đơn không tồn tại.");

        var myProfile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == currentUserId);
        if (inv.TenantProfileId != (myProfile != null ? myProfile.Id : Guid.Empty) && inv.TenantProfile?.UserId != currentUserId)
        {
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

        // 2. Ghi nhận vào bảng Complaints để lưu vết lịch sử khiếu nại
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

        // 3. Tạo Notification gửi cho Chủ trọ
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

        return inv.ToInvoiceDto();
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

        var myProfile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == currentUserId);
        if (inv.TenantProfileId != (myProfile != null ? myProfile.Id : Guid.Empty) && inv.TenantProfile?.UserId != currentUserId)
        {
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

        return inv.ToInvoiceDto();
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
            inv.DisputeReply = req.Reply;
            inv.IsReported = false;

            await db.SaveChangesAsync();

            if (inv.TenantProfile != null)
            {
                await notificationService.SendNotificationAsync(
                    landlordId,
                    $"✅ Đã điều chỉnh HĐ {inv.InvoiceCode} - Phòng {inv.Room?.RoomNumber}",
                    $"Chủ trọ đã chấp nhận yêu cầu kiểm tra và điều chỉnh hóa đơn {inv.InvoiceCode} (Kỳ {inv.Month}).\n• Tổng tiền mới: {inv.TotalAmount:N0} VNĐ\n• Phản hồi: {req.Reply}",
                    NotificationTarget.User,
                    inv.TenantProfile.UserId
                );
            }
        }
        else
        {
            inv.DisputeStatus = "Rejected";
            inv.DisputeResolvedAt = DateTime.UtcNow;
            inv.DisputeReply = string.IsNullOrWhiteSpace(req.Reply)
                ? "Chủ trọ đã kiểm tra lại các chỉ số điện/nước/dịch vụ và xác nhận hóa đơn chính xác."
                : req.Reply;
            inv.IsReported = false;

            await db.SaveChangesAsync();

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

        return inv.ToInvoiceDto();
    }
}
