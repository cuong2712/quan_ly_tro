using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Thông báo hệ thống (phân tách rõ ràng giữa Admin toàn sàn, Chủ trọ và Khách thuê).
public class NotificationService(AppDbContext db, IRealtimeNotifier notifier)
{
    // Lấy danh sách thông báo phù hợp chuẩn xác với tài khoản và vai trò của người dùng.
    public async Task<IEnumerable<NotificationDto>> GetForUserAsync(Guid userId, string role)
    {
        Guid? landlordIdOfTenant = null;
        Guid? zoneIdOfTenant = null;
        Guid? roomIdOfTenant = null;
        if (role == "Tenant")
        {
            var tp = await db.TenantProfiles
                .Include(t => t.Room).ThenInclude(r => r!.Zone)
                .FirstOrDefaultAsync(t => t.UserId == userId);
            if (tp?.Room != null)
            {
                landlordIdOfTenant = tp.Room.Zone.LandlordId;
                zoneIdOfTenant = tp.Room.ZoneId;
                roomIdOfTenant = tp.RoomId;
            }
        }

        var notifications = await db.Notifications
            .Include(n => n.Sender)
            .Include(n => n.Reads.Where(r => r.UserId == userId))
            .Where(n => 
                // 1. SuperAdmin: Quản lý các thông báo hệ thống do Admin tạo hoặc gửi tới Admin
                (role == "SuperAdmin" && (
                    n.Sender.Role == UserRole.SuperAdmin || 
                    n.SenderId == userId || 
                    n.Target == NotificationTarget.SuperAdmin || 
                    (n.Target == NotificationTarget.User && n.TargetId == userId)
                )) ||
                // 2. Landlord: Xem thông báo do chính mình phát hành + Thông báo hệ thống gửi cho Landlords / All
                (role == "Landlord" && (
                    n.SenderId == userId || 
                    n.Target == NotificationTarget.AllLandlords || 
                    n.Target == NotificationTarget.SystemAll || 
                    (n.Target == NotificationTarget.User && n.TargetId == userId)
                )) ||
                // 3. Tenant: Xem thông báo toàn sàn (Admin) + Thông báo từ Chủ trọ của mình (AllTenants/Zone/Room) + Cá nhân
                (role == "Tenant" && (
                    n.Target == NotificationTarget.SystemAll ||
                    (n.Target == NotificationTarget.AllTenants && (n.Sender.Role == UserRole.SuperAdmin || (landlordIdOfTenant.HasValue && n.SenderId == landlordIdOfTenant.Value))) ||
                    (n.Target == NotificationTarget.Zone && zoneIdOfTenant.HasValue && n.TargetId == zoneIdOfTenant.Value) ||
                    (n.Target == NotificationTarget.Room && roomIdOfTenant.HasValue && n.TargetId == roomIdOfTenant.Value) ||
                    (n.Target == NotificationTarget.User && n.TargetId == userId)
                )))
            .OrderByDescending(n => n.CreatedAt).ToListAsync();

        return notifications.Select(n => new NotificationDto(
            n.Id, 
            n.Sender?.FullName ?? "Hệ thống", 
            n.Title, 
            n.Content, 
            n.Target.ToString(), 
            n.TargetId, 
            n.Reads.Any(r => r.IsRead), 
            DateTime.SpecifyKind(n.CreatedAt, DateTimeKind.Utc)
        ));
    }

    // Tạo thông báo mới và phát tán Realtime qua SignalR
    public async Task<NotificationDto> CreateAsync(Guid senderId, CreateNotificationRequest req)
    {
        NotificationTarget target;
        if (req.Target == "All" || req.Target == "SystemAll")
        {
            target = NotificationTarget.SystemAll;
        }
        else
        {
            target = Enum.Parse<NotificationTarget>(req.Target);
        }

        var n = new Notification
        {
            SenderId = senderId,
            Title = req.Title,
            Content = req.Content,
            Target = target,
            TargetId = req.TargetId,
            CreatedAt = DateTime.UtcNow
        };
        db.Notifications.Add(n);
        await db.SaveChangesAsync();

        var sender = await db.Users.FindAsync(senderId);
        var dto = new NotificationDto(n.Id, sender?.FullName ?? "Hệ thống", n.Title, n.Content, n.Target.ToString(), n.TargetId, false, DateTime.SpecifyKind(n.CreatedAt, DateTimeKind.Utc));

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

        var dto = new NotificationDto(n.Id, senderName, n.Title, n.Content, n.Target.ToString(), n.TargetId, false, DateTime.SpecifyKind(n.CreatedAt, DateTimeKind.Utc));
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
