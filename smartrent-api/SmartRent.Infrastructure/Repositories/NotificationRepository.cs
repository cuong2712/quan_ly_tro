using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Infrastructure.Repositories;

// Repository thao tác cơ sở dữ liệu cho Thông báo hệ thống (Notification)
public class NotificationRepository(AppDbContext db) : INotificationRepository
{
    // Lấy danh sách thông báo hệ thống phù hợp với tài khoản và vai trò của Người dùng
    public async Task<IEnumerable<Notification>> GetForUserAsync(Guid userId, string role) =>
        await db.Notifications
            .Include(n => n.Sender)
            .Include(n => n.Reads.Where(r => r.UserId == userId))
            .Where(n =>
                n.Target == Core.Enums.NotificationTarget.SystemAll ||
                n.Target == Core.Enums.NotificationTarget.AllLandlords && role == "Landlord" ||
                n.Target == Core.Enums.NotificationTarget.AllTenants && role == "Tenant" ||
                n.Target == Core.Enums.NotificationTarget.User && n.TargetId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

    // Lấy thông tin chi tiết một thông báo theo ID
    public async Task<Notification?> GetByIdAsync(Guid id) => await db.Notifications.Include(n => n.Sender).FirstOrDefaultAsync(n => n.Id == id);

    // Tạo mới một thông báo
    public async Task<Notification> CreateAsync(Notification n) { db.Notifications.Add(n); await db.SaveChangesAsync(); return n; }

    // Cập nhật thông tin thông báo
    public async Task<Notification> UpdateAsync(Notification n) { db.Notifications.Update(n); await db.SaveChangesAsync(); return n; }

    // Xóa một thông báo theo ID
    public async Task<bool> DeleteAsync(Guid id)
    {
        var n = await db.Notifications.FindAsync(id);
        if (n is null) return false;
        db.Notifications.Remove(n); await db.SaveChangesAsync(); return true;
    }

    // Đánh dấu thông báo là đã đọc cho Người dùng
    public async Task MarkAsReadAsync(Guid notificationId, Guid userId)
    {
        var read = await db.NotificationReads.FirstOrDefaultAsync(r => r.NotificationId == notificationId && r.UserId == userId);
        if (read is null)
        {
            db.NotificationReads.Add(new NotificationRead { NotificationId = notificationId, UserId = userId, IsRead = true, ReadAt = DateTime.UtcNow });
        }
        else { read.IsRead = true; read.ReadAt = DateTime.UtcNow; }
        await db.SaveChangesAsync();
    }
}
