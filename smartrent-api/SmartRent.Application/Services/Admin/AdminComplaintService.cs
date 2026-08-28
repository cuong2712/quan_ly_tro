using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Admin;

// Phân hệ Tiếp nhận và Xử lý Khiếu nại toàn hệ thống dành cho Super Admin.
public class AdminComplaintService(AppDbContext db)
{
    // Lấy danh sách tất cả các góp ý/khiếu nại gửi tới Admin.
    public async Task<IEnumerable<ComplaintDto>> GetComplaintsAsync()
    {
        var complaints = await db.Complaints.AsNoTracking().Include(c => c.Sender).OrderByDescending(c => c.CreatedAt).ToListAsync();
        return complaints.Select(c => new ComplaintDto(c.Id, c.Sender.FullName, c.Sender.Email, c.Sender.Role.ToString(),
            c.Title, c.Content, c.Status.ToString(), c.Reply, c.CreatedAt, c.RepliedAt));
    }

    // Phản hồi thông tin góp ý/khiếu nại của người dùng.
    public async Task<ComplaintDto> ReplyComplaintAsync(Guid id, ReplyComplaintRequest request)
    {
        var complaint = await db.Complaints.Include(c => c.Sender).FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy phản hồi");
        complaint.Reply = request.Reply;
        complaint.Status = ComplaintStatus.Resolved;
        complaint.RepliedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return new ComplaintDto(complaint.Id, complaint.Sender.FullName, complaint.Sender.Email, complaint.Sender.Role.ToString(),
            complaint.Title, complaint.Content, complaint.Status.ToString(), complaint.Reply, complaint.CreatedAt, complaint.RepliedAt);
    }

    // Cập nhật trạng thái xử lý của góp ý/khiếu nại.
    public async Task UpdateComplaintStatusAsync(Guid id, string status)
    {
        var complaint = await db.Complaints.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy phản hồi");
        complaint.Status = Enum.Parse<ComplaintStatus>(status);
        await db.SaveChangesAsync();
    }
}

