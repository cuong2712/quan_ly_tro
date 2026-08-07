using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Khiếu nại / Phản hồi của Người dùng gửi đến Ban quản trị hệ thống.
public class ComplaintService(AppDbContext db)
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
        return MapComplaint(full);
    }

    // Phản hồi khiếu nại (dành cho Admin).
    public async Task<ComplaintDto> ReplyAsync(Guid id, Guid adminId, string reply)
    {
        var c = await db.Complaints.Include(x => x.Sender).FirstOrDefaultAsync(x => x.Id == id) ?? throw new KeyNotFoundException();
        c.Reply = reply; c.Status = ComplaintStatus.Resolved; c.RepliedBy = adminId; c.RepliedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return MapComplaint(c);
    }

    private static ComplaintDto MapComplaint(Complaint c) => new(c.Id, c.Sender?.FullName ?? "", c.Sender?.Email ?? "", c.Sender?.Role.ToString() ?? "", c.Title, c.Content, c.Status.ToString(), c.Reply, c.CreatedAt, c.RepliedAt);
}
