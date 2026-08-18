using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Thông báo hệ thống (gửi thông báo chung, thông báo riêng, đánh dấu đã đọc, xóa thông báo và phát Realtime).
public class NotificationService(AppDbContext db, IRealtimeNotifier notifier)
{
    // Lấy danh sách thông báo phù hợp với tài khoản và vai trò của người dùng.
    public async Task<IEnumerable<NotificationDto>> GetForUserAsync(Guid userId, string role)
    {
        Guid? landlordIdOfTenant = null;
        if (role == "Tenant")
        {
            landlordIdOfTenant = await db.TenantProfiles
                .Where(t => t.UserId == userId && t.Room != null)
                .Select(t => (Guid?)t.Room!.Zone.LandlordId)
                .FirstOrDefaultAsync();
        }

        var notifications = await db.Notifications
            .Include(n => n.Sender)
            .Include(n => n.Reads.Where(r => r.UserId == userId))
            .Where(n => 
                (n.Target == NotificationTarget.AllLandlords && role == "Landlord") ||
                (n.Target == NotificationTarget.AllTenants && role == "Tenant" && (n.Sender.Role == UserRole.SuperAdmin || (landlordIdOfTenant.HasValue && n.SenderId == landlordIdOfTenant.Value))) ||
                (n.Target == NotificationTarget.User && n.TargetId == userId) ||
                role == "SuperAdmin")
            .OrderByDescending(n => n.CreatedAt).ToListAsync();

        return notifications.Select(n => new NotificationDto(n.Id, n.Sender?.FullName ?? "Hệ thống", n.Title, n.Content, n.Target.ToString(), n.TargetId, n.Reads.Any(r => r.IsRead), n.CreatedAt));
    }

    // Tạo thông báo mới và phát tán Realtime qua SignalR
    public async Task<NotificationDto> CreateAsync(Guid senderId, CreateNotificationRequest req)
    {
        var target = Enum.Parse<NotificationTarget>(req.Target);
        var n = new Notification { SenderId = senderId, Title = req.Title, Content = req.Content, Target = target, TargetId = req.TargetId };
        db.Notifications.Add(n);
        await db.SaveChangesAsync();

        var sender = await db.Users.FindAsync(senderId);
        var dto = new NotificationDto(n.Id, sender?.FullName ?? "Hệ thống", n.Title, n.Content, n.Target.ToString(), n.TargetId, false, n.CreatedAt);

        // Phát thông báo Realtime
        await notifier.SendNotificationAsync(dto);

        return dto;
    }

    // Tiện ích gửi thông báo và push Realtime dùng nội bộ cho các Service khác
    public async Task<NotificationDto> SendNotificationAsync(Guid senderId, string title, string content, NotificationTarget target, Guid? targetId = null)
    {
        var n = new Notification
        {
            SenderId = senderId,
            Title = title,
            Content = content,
            Target = target,
            TargetId = targetId,
            CreatedAt = DateTime.UtcNow
        };
        db.Notifications.Add(n);
        await db.SaveChangesAsync();

        string senderName = "Hệ thống";
        var sender = await db.Users.FindAsync(senderId);
        if (sender != null) senderName = sender.FullName;

        var dto = new NotificationDto(n.Id, senderName, n.Title, n.Content, n.Target.ToString(), n.TargetId, false, n.CreatedAt);
        await notifier.SendNotificationAsync(dto);
        return dto;
    }

    // Đánh dấu thông báo là đã đọc bởi một người dùng.
    public async Task MarkReadAsync(Guid notifId, Guid userId)
    {
        var existing = await db.NotificationReads.FirstOrDefaultAsync(r => r.NotificationId == notifId && r.UserId == userId);
        if (existing is null) db.NotificationReads.Add(new NotificationRead { NotificationId = notifId, UserId = userId, IsRead = true, ReadAt = DateTime.UtcNow });
        else { existing.IsRead = true; existing.ReadAt = DateTime.UtcNow; }
        await db.SaveChangesAsync();
    }

    // Xóa thông báo khỏi hệ thống (kiểm tra quyền sở hữu).
    public async Task<bool> DeleteAsync(Guid id, Guid currentUserId, string role)
    {
        var n = await db.Notifications.FirstOrDefaultAsync(x => x.Id == id && (role == "SuperAdmin" || x.SenderId == currentUserId));
        if (n is null) return false;
        db.Notifications.Remove(n);
        await db.SaveChangesAsync();
        return true;
    }
}
