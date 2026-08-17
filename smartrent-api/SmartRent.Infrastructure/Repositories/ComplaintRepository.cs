using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Infrastructure.Repositories;

// Repository thao tác cơ sở dữ liệu cho Góp ý / Khiếu nại (Complaint)
public class ComplaintRepository(AppDbContext db) : IComplaintRepository
{
    // Lấy danh sách toàn bộ các khiếu nại góp ý trong hệ thống
    public async Task<IEnumerable<Complaint>> GetAllAsync() =>
        await db.Complaints.Include(c => c.Sender).OrderByDescending(c => c.CreatedAt).ToListAsync();

    // Lấy chi tiết một khiếu nại theo ID
    public async Task<Complaint?> GetByIdAsync(Guid id) => await db.Complaints.Include(c => c.Sender).FirstOrDefaultAsync(c => c.Id == id);

    // Tạo mới một khiếu nại góp ý
    public async Task<Complaint> CreateAsync(Complaint c) { db.Complaints.Add(c); await db.SaveChangesAsync(); return c; }

    // Cập nhật trạng thái hoặc phản hồi giải quyết khiếu nại
    public async Task<Complaint> UpdateAsync(Complaint c) { db.Complaints.Update(c); await db.SaveChangesAsync(); return c; }
}
