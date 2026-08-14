using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Infrastructure.Repositories;

// Repository thao tác cơ sở dữ liệu cho Hồ sơ Khách thuê (TenantProfile)
public class TenantRepository(AppDbContext db) : ITenantRepository
{
    // Lấy danh sách hồ sơ khách thuê trọ thuộc quyền quản lý của một Chủ trọ
    public async Task<IEnumerable<TenantProfile>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.TenantProfiles.Include(t => t.User).Include(t => t.Room).ThenInclude(r => r!.Zone)
            .Where(t => t.Room != null && t.Room.Zone.LandlordId == landlordId).ToListAsync();

    // Lấy chi tiết hồ sơ khách thuê theo ID hồ sơ
    public async Task<TenantProfile?> GetByIdAsync(Guid id) =>
        await db.TenantProfiles.Include(t => t.User).Include(t => t.Room).ThenInclude(r => r!.Zone)
            .Include(t => t.Contracts)
            .FirstOrDefaultAsync(t => t.Id == id);

    // Lấy hồ sơ khách thuê theo ID tài khoản đăng nhập (UserId)
    public async Task<TenantProfile?> GetByUserIdAsync(Guid userId) =>
        await db.TenantProfiles.Include(t => t.User).Include(t => t.Room).ThenInclude(r => r!.Zone)
            .Include(t => t.Contracts)
            .FirstOrDefaultAsync(t => t.UserId == userId);

    // Lấy hồ sơ khách thuê đang thuộc một phòng trọ cụ thể
    public async Task<TenantProfile?> GetByRoomIdAsync(Guid roomId) =>
        await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.RoomId == roomId);

    // Tạo mới hồ sơ khách thuê
    public async Task<TenantProfile> CreateAsync(TenantProfile tenant) { db.TenantProfiles.Add(tenant); await db.SaveChangesAsync(); return tenant; }

    // Cập nhật hồ sơ khách thuê
    public async Task<TenantProfile> UpdateAsync(TenantProfile tenant) { db.TenantProfiles.Update(tenant); await db.SaveChangesAsync(); return tenant; }

    // Xóa hồ sơ khách thuê theo ID
    public async Task<bool> DeleteAsync(Guid id)
    {
        var t = await db.TenantProfiles.FindAsync(id);
        if (t is null) return false;
        db.TenantProfiles.Remove(t); await db.SaveChangesAsync(); return true;
    }
}
