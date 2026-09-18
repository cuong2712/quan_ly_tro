using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Enums;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Admin;

// Phân hệ Tiếp nhận và Xử lý Khiếu nại toàn hệ thống dành cho Super Admin.
public class AdminComplaintService(AppDbContext db, NotificationService notificationService, ITelegramBotService telegramBot)
{
    // Lấy danh sách tất cả các góp ý/khiếu nại gửi tới Admin.
    public async Task<IEnumerable<ComplaintDto>> GetComplaintsAsync()
    {
        var complaints = await db.Complaints.AsNoTracking().Include(c => c.Sender).OrderByDescending(c => c.CreatedAt).ToListAsync();
        return complaints.Select(c => new ComplaintDto(c.Id, c.Sender.FullName, c.Sender.Email, c.Sender.Role.ToString(),
            c.Title, c.Content, c.Status.ToString(), c.Reply, c.CreatedAt, c.RepliedAt));
    }

    // Phản hồi thông tin góp ý/khiếu nại của người dùng.
    public async Task<ComplaintDto> ReplyComplaintAsync(Guid id, ReplyComplaintRequest request, Guid? adminId = null)
    {
        var complaint = await db.Complaints.Include(c => c.Sender).FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy phản hồi");
        complaint.Reply = request.Reply;
        complaint.Status = ComplaintStatus.Resolved;
        complaint.RepliedAt = DateTime.UtcNow;
        if (adminId.HasValue) complaint.RepliedBy = adminId.Value;
        await db.SaveChangesAsync();

        var admin = adminId.HasValue ? await db.Users.FindAsync(adminId.Value) : null;
        var adminName = admin?.FullName ?? "Ban Quản Trị";

        // Gửi thông báo trong hệ thống cho người gửi (senderId là admin để người nhận thấy đúng tên Ban Quản Trị)
        await notificationService.SendNotificationAsync(
            adminId ?? complaint.SenderId,
            $"Phản hồi khiếu nại / góp ý: {complaint.Title}",
            $"Ban quản trị đã phản hồi yêu cầu của bạn:\n\"{request.Reply}\"",
            NotificationTarget.User,
            complaint.SenderId
        );

        // Gửi thông báo Phản hồi thành công lên Telegram Bot của Admin
        await telegramBot.SendReplyAlertAsync(
            complaint.Sender?.FullName ?? "Người dùng",
            complaint.Title,
            request.Reply,
            adminName
        );

        return new ComplaintDto(complaint.Id, complaint.Sender?.FullName ?? "Người dùng", complaint.Sender?.Email ?? "", complaint.Sender?.Role.ToString() ?? "",
            complaint.Title, complaint.Content, complaint.Status.ToString(), complaint.Reply, complaint.CreatedAt, complaint.RepliedAt);
    }

    // Cập nhật trạng thái xử lý của góp ý/khiếu nại.
    public async Task UpdateComplaintStatusAsync(Guid id, string status)
    {
        var complaint = await db.Complaints.Include(c => c.Sender).FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy phản hồi");
        complaint.Status = Enum.Parse<ComplaintStatus>(status);
        await db.SaveChangesAsync();
    }
}

