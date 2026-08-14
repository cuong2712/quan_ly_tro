using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Infrastructure.Repositories;

// Repository thao tác cơ sở dữ liệu cho Dịch vụ cộng thêm (Service)
public class ServiceRepository(AppDbContext db) : IServiceRepository
{
    // Lấy danh sách dịch vụ (rác, wifi, vệ sinh...) của Chủ trọ
    public async Task<IEnumerable<Service>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.Services.Where(s => s.LandlordId == landlordId).ToListAsync();

    // Lấy chi tiết một dịch vụ theo ID
    public async Task<Service?> GetByIdAsync(Guid id) => await db.Services.FindAsync(id);

    // Tạo mới một dịch vụ
    public async Task<Service> CreateAsync(Service s) { db.Services.Add(s); await db.SaveChangesAsync(); return s; }

    // Cập nhật thông tin dịch vụ
    public async Task<Service> UpdateAsync(Service s) { db.Services.Update(s); await db.SaveChangesAsync(); return s; }

    // Xóa một dịch vụ theo ID
    public async Task<bool> DeleteAsync(Guid id)
    {
        var s = await db.Services.FindAsync(id);
        if (s is null) return false;
        db.Services.Remove(s); await db.SaveChangesAsync(); return true;
    }
}
