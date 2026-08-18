using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Giao dịch Thanh toán & Duyệt minh chứng biên lai (ProofImageUrl) & thông báo realtime.
public class PaymentService(AppDbContext db, NotificationService notificationService)
{
    // Lấy danh sách giao dịch thanh toán thuộc quyền quản lý của Chủ trọ (hỗ trợ phân trang).
    public async Task<object> GetByLandlordAsync(Guid landlordId, int? page = null, int? pageSize = null)
    {
        var query = db.Payments
            .Include(p => p.Invoice).ThenInclude(i => i.Room).ThenInclude(r => r.Zone)
            .Include(p => p.Invoice).ThenInclude(i => i.TenantProfile).ThenInclude(t => t.User)
            .Where(p => p.Invoice.Room.Zone.LandlordId == landlordId);
        var totalItems = await query.CountAsync();
        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            var items = await query.OrderByDescending(p => p.CreatedAt)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = items.Select(MapPayment);
            return PagedResult<PaymentDto>.Create(dtos, totalItems, p, ps);
        }
        var payments = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
        return payments.Select(MapPayment);
    }

    // Lấy danh sách giao dịch thanh toán của Khách thuê theo ID hồ sơ (TenantProfileId).
    public async Task<IEnumerable<PaymentDto>> GetByTenantAsync(Guid tenantProfileId)
    {
        var payments = await db.Payments
            .Include(p => p.Invoice).ThenInclude(i => i.Room)
            .Where(p => p.Invoice.TenantProfileId == tenantProfileId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
        return payments.Select(MapPayment);
    }

    // Lấy danh sách giao dịch thanh toán của Khách thuê theo ID tài khoản (UserId).
    public async Task<IEnumerable<PaymentDto>> GetByTenantUserIdAsync(Guid tenantUserId)
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

        var payments = await db.Payments
            .Include(p => p.Invoice).ThenInclude(i => i.Room)
            .Where(p => p.Invoice.TenantProfileId == profile.Id || (profile.RoomId.HasValue && p.Invoice.RoomId == profile.RoomId.Value))
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return payments.Select(MapPayment);
    }

    // Khách thuê gửi thông tin thanh toán kèm ảnh minh chứng biên lai (ProofImageUrl).
    public async Task<PaymentDto> SubmitAsync(Guid tenantUserId, SubmitPaymentRequest req)
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

        if (profile == null) throw new KeyNotFoundException("Không tìm thấy thông tin khách thuê.");

        var inv = await db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone)
            .FirstOrDefaultAsync(i => i.Id == req.InvoiceId && (i.TenantProfileId == profile.Id || (profile.RoomId.HasValue && i.RoomId == profile.RoomId.Value)))
            ?? throw new KeyNotFoundException("Hóa đơn không tồn tại hoặc không thuộc quyền thanh toán của bạn.");

        var method = Enum.Parse<PaymentMethod>(req.Method, ignoreCase: true);
        var pay = new Payment
        {
            InvoiceId = req.InvoiceId,
            Amount = req.Amount > 0 ? req.Amount : inv.TotalAmount,
            Method = method,
            Status = PaymentStatus.PendingApproval,
            ProofImageUrl = req.ProofImageUrl,
            Note = req.Note
        };

        db.Payments.Add(pay);
        await db.SaveChangesAsync();

        // Tự động tạo thông báo gửi đến Chủ trọ khi Khách thuê gửi minh chứng thanh toán
        var landlordId = inv.Room?.Zone?.LandlordId;
        if (landlordId.HasValue && landlordId.Value != Guid.Empty)
        {
            await notificationService.SendNotificationAsync(
                tenantUserId,
                $"Khách thuê gửi minh chứng thanh toán hóa đơn {inv.InvoiceCode}",
                $"Phòng {inv.Room?.RoomNumber}: Khách thuê đã gửi minh chứng thanh toán số tiền {pay.Amount:N0} VNĐ cho hóa đơn {inv.InvoiceCode}. Vui lòng kiểm tra và duyệt.",
                NotificationTarget.User,
                landlordId.Value
            );
        }

        pay.Invoice = inv;
        return MapPayment(pay);
    }

    // Chủ trọ duyệt (Approve = true) hoặc từ chối (Approve = false) giao dịch thanh toán của khách thuê.
    public async Task<PaymentDto> ConfirmAsync(Guid id, Guid landlordId, ConfirmPaymentRequest req)
    {
        var pay = await db.Payments
            .Include(p => p.Invoice).ThenInclude(i => i.Room).ThenInclude(r => r.Zone)
            .Include(p => p.Invoice).ThenInclude(i => i.TenantProfile)
            .FirstOrDefaultAsync(p => p.Id == id && p.Invoice.Room.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Giao dịch thanh toán không tồn tại hoặc bạn không có quyền duyệt.");

        pay.Status = req.Approve ? PaymentStatus.Completed : PaymentStatus.Rejected;
        pay.ConfirmedBy = landlordId;
        pay.ConfirmedAt = DateTime.UtcNow;

        if (req.Approve && pay.Invoice != null)
        {
            pay.Invoice.Status = InvoiceStatus.Paid;
            pay.Invoice.PaidDate = DateTime.UtcNow;

            if (pay.Invoice.Room != null && pay.Invoice.Room.Status == RoomStatus.Vacant)
            {
                pay.Invoice.Room.Status = RoomStatus.Occupied;
            }
        }

        if (!string.IsNullOrEmpty(req.Note))
        {
            pay.Note = req.Note;
        }

        await db.SaveChangesAsync();

        // Tự động tạo thông báo kết quả duyệt thanh toán gửi đến Khách thuê
        if (pay.Invoice?.TenantProfile != null)
        {
            await notificationService.SendNotificationAsync(
                landlordId,
                req.Approve ? $"Duyệt thanh toán thành công hóa đơn {pay.Invoice.InvoiceCode}" : $"Từ chối thanh toán hóa đơn {pay.Invoice.InvoiceCode}",
                req.Approve 
                    ? $"Chủ trọ đã xác nhận thanh toán thành công số tiền {pay.Amount:N0} VNĐ cho hóa đơn tháng {pay.Invoice.Month} (Phòng {pay.Invoice.Room?.RoomNumber})."
                    : $"Chủ trọ đã từ chối xác nhận thanh toán hóa đơn {pay.Invoice.InvoiceCode}. Lý do: {req.Note ?? "Minh chứng không hợp lệ"}.",
                NotificationTarget.User,
                pay.Invoice.TenantProfile.UserId
            );
        }

        return MapPayment(pay);
    }

    private static PaymentDto MapPayment(Payment p) => new(
        p.Id,
        p.InvoiceId,
        p.Invoice?.InvoiceCode ?? "",
        p.Amount,
        p.Method.ToString(),
        p.Status.ToString(),
        p.ProofImageUrl,
        p.Note,
        p.CreatedAt,
        p.ConfirmedAt
    );
}
