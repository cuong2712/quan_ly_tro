using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Infrastructure.Repositories;

// Repository thao tác cơ sở dữ liệu cho Khu trọ / Tòa nhà (Zone)
public class ZoneRepository(AppDbContext db) : IZoneRepository
{
    // Lấy danh sách các khu trọ thuộc quyền quản lý của một Chủ trọ
    public async Task<IEnumerable<Zone>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.Zones.Include(z => z.Rooms).Where(z => z.LandlordId == landlordId).ToListAsync();

    // Lấy thông tin chi tiết một khu trọ kèm danh sách phòng thuộc khu trọ đó
    public async Task<Zone?> GetByIdAsync(Guid id) =>
        await db.Zones.Include(z => z.Rooms).FirstOrDefaultAsync(z => z.Id == id);

    // Thêm mới khu trọ
    public async Task<Zone> CreateAsync(Zone zone) { db.Zones.Add(zone); await db.SaveChangesAsync(); return zone; }

    // Cập nhật thông tin khu trọ
    public async Task<Zone> UpdateAsync(Zone zone) { db.Zones.Update(zone); await db.SaveChangesAsync(); return zone; }

    // Xóa khu trọ theo ID
    public async Task<bool> DeleteAsync(Guid id)
    {
        var z = await db.Zones.FindAsync(id);
        if (z is null) return false;
        db.Zones.Remove(z); await db.SaveChangesAsync(); return true;
    }
}
