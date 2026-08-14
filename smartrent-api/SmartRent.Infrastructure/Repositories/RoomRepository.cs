using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Infrastructure.Repositories;

// Repository thao tác cơ sở dữ liệu cho Phòng trọ (Room)
public class RoomRepository(AppDbContext db) : IRoomRepository
{
    // Lấy danh sách các phòng trọ nằm trong một khu trọ (kèm thông tin khách đang thuê)
    public async Task<IEnumerable<Room>> GetByZoneIdAsync(Guid zoneId) =>
        await db.Rooms.Include(r => r.Tenants).ThenInclude(t => t!.User)
            .Where(r => r.ZoneId == zoneId).ToListAsync();

    // Lấy danh sách toàn bộ phòng trọ thuộc các khu trọ của một Chủ trọ
    public async Task<IEnumerable<Room>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.Rooms.Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t!.User)
            .Where(r => r.Zone.LandlordId == landlordId).ToListAsync();

    // Lấy thông tin chi tiết một phòng trọ theo ID
    public async Task<Room?> GetByIdAsync(Guid id) =>
        await db.Rooms.Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t!.User)
            .FirstOrDefaultAsync(r => r.Id == id);

    // Tạo mới một phòng trọ
    public async Task<Room> CreateAsync(Room room) { db.Rooms.Add(room); await db.SaveChangesAsync(); return room; }

    // Cập nhật thông tin phòng trọ
    public async Task<Room> UpdateAsync(Room room) { db.Rooms.Update(room); await db.SaveChangesAsync(); return room; }

    // Xóa phòng trọ theo ID
    public async Task<bool> DeleteAsync(Guid id)
    {
        var r = await db.Rooms.FindAsync(id);
        if (r is null) return false;
        db.Rooms.Remove(r); await db.SaveChangesAsync(); return true;
    }
}
