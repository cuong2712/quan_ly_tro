using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Infrastructure.Repositories;

// Repository thao tác cơ sở dữ liệu cho Yêu cầu sửa chữa & bảo trì (MaintenanceRequest)
public class MaintenanceRepository(AppDbContext db) : IMaintenanceRepository
{
    // Lấy danh sách yêu cầu bảo trì sửa chữa thuộc quyền quản lý của Chủ trọ
    public async Task<IEnumerable<MaintenanceRequest>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.MaintenanceRequests.Include(m => m.Room).ThenInclude(r => r.Zone)
            .Include(m => m.TenantProfile).ThenInclude(t => t.User)
            .Where(m => m.Room.Zone.LandlordId == landlordId).OrderByDescending(m => m.CreatedAt).ToListAsync();

    // Lấy danh sách yêu cầu bảo trì do một Khách thuê gửi
    public async Task<IEnumerable<MaintenanceRequest>> GetByTenantIdAsync(Guid tenantProfileId) =>
        await db.MaintenanceRequests.Include(m => m.Room)
            .Where(m => m.TenantProfileId == tenantProfileId).OrderByDescending(m => m.CreatedAt).ToListAsync();

    // Lấy chi tiết một yêu cầu bảo trì theo ID
    public async Task<MaintenanceRequest?> GetByIdAsync(Guid id) =>
        await db.MaintenanceRequests.Include(m => m.Room).Include(m => m.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(m => m.Id == id);

    // Tạo mới yêu cầu bảo trì
    public async Task<MaintenanceRequest> CreateAsync(MaintenanceRequest m) { db.MaintenanceRequests.Add(m); await db.SaveChangesAsync(); return m; }

    // Cập nhật trạng thái hoặc thông tin xử lý bảo trì
    public async Task<MaintenanceRequest> UpdateAsync(MaintenanceRequest m) { db.MaintenanceRequests.Update(m); await db.SaveChangesAsync(); return m; }

    // Xóa một yêu cầu bảo trì theo ID
    public async Task<bool> DeleteAsync(Guid id)
    {
        var m = await db.MaintenanceRequests.FindAsync(id);
        if (m is null) return false;
        db.MaintenanceRequests.Remove(m); await db.SaveChangesAsync(); return true;
    }
}
