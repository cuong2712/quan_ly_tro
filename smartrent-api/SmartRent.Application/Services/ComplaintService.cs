using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Khiếu nại / Phản hồi của Người dùng gửi đến Ban quản trị hệ thống & thông báo realtime.
public class ComplaintService(AppDbContext db, NotificationService notificationService)
{
    // Lấy danh sách tất cả góp ý/khiếu nại.
    public async Task<IEnumerable<ComplaintDto>> GetAllAsync()
    {
        var list = await db.Complaints.Include(c => c.Sender).OrderByDescending(c => c.CreatedAt).ToListAsync();
        return list.Select(MapComplaint);
    }

    // Tạo mới một góp ý/khiếu nại gửi tới hệ thống.
    public async Task<ComplaintDto> CreateAsync(Guid userId, string title, string content)
    {
        var c = new Complaint { SenderId = userId, Title = title, Content = content };
        db.Complaints.Add(c);
        await db.SaveChangesAsync();

        var full = await db.Complaints.Include(x => x.Sender).FirstAsync(x => x.Id == c.Id);

        // Gửi thông báo đến Ban quản trị / SuperAdmin
        await notificationService.SendNotificationAsync(
            userId,
            $"Khiếu nại / Góp ý mới: {title}",
            $"Người gửi: {full.Sender?.FullName} ({full.Sender?.Role})\nNội dung: {content}",
            NotificationTarget.SuperAdmin,
            null
        );

        return MapComplaint(full);
    }

    // Phản hồi khiếu nại (dành cho Admin).
    public async Task<ComplaintDto> ReplyAsync(Guid id, Guid adminId, string reply)
    {
        var c = await db.Complaints.Include(x => x.Sender).FirstOrDefaultAsync(x => x.Id == id) ?? throw new KeyNotFoundException();
        c.Reply = reply; 
        c.Status = ComplaintStatus.Resolved; 
        c.RepliedBy = adminId; 
        c.RepliedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Gửi thông báo phản hồi lại cho người khiếu nại
        await notificationService.SendNotificationAsync(
            adminId,
            $"Phản hồi khiếu nại / góp ý: {c.Title}",
            $"Ban quản trị đã phản hồi yêu cầu của bạn:\n\"{reply}\"",
            NotificationTarget.User,
            c.SenderId
        );

        return MapComplaint(c);
    }

    private static ComplaintDto MapComplaint(Complaint c) => new(c.Id, c.Sender?.FullName ?? "", c.Sender?.Email ?? "", c.Sender?.Role.ToString() ?? "", c.Title, c.Content, c.Status.ToString(), c.Reply, c.CreatedAt, c.RepliedAt);
}
