using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Khu trọ / Tòa nhà của Chủ trọ.
public class ZoneService(AppDbContext db)
{
    // Lấy danh sách tất cả các khu trọ thuộc về một Chủ trọ.
    public async Task<IEnumerable<ZoneDto>> GetByLandlordAsync(Guid landlordId)
    {
        var zones = await db.Zones.Include(z => z.Rooms).Where(z => z.LandlordId == landlordId).ToListAsync();
        return zones.Select(z => new ZoneDto(z.Id, z.Name, z.Address, z.Description, z.TotalRooms, z.Rooms.Count, z.CreatedAt));
    }

    // Tạo mới một Khu trọ / Tòa nhà.
    public async Task<ZoneDto> CreateAsync(Guid landlordId, CreateZoneRequest req)
    {
        var zone = new Zone { LandlordId = landlordId, Name = req.Name, Address = req.Address, Description = req.Description, TotalRooms = req.TotalRooms };
        db.Zones.Add(zone);
        await db.SaveChangesAsync();
        return new ZoneDto(zone.Id, zone.Name, zone.Address, zone.Description, zone.TotalRooms, 0, zone.CreatedAt);
    }

    // Cập nhật thông tin Khu trọ / Tòa nhà.
    public async Task<ZoneDto> UpdateAsync(Guid id, UpdateZoneRequest req)
    {
        var zone = await db.Zones.Include(z => z.Rooms).FirstOrDefaultAsync(z => z.Id == id) ?? throw new KeyNotFoundException();
        zone.Name = req.Name; zone.Address = req.Address; zone.Description = req.Description; zone.TotalRooms = req.TotalRooms;
        await db.SaveChangesAsync();
        return new ZoneDto(zone.Id, zone.Name, zone.Address, zone.Description, zone.TotalRooms, zone.Rooms.Count, zone.CreatedAt);
    }

    // Xóa một Khu trọ theo ID.
    public async Task<bool> DeleteAsync(Guid id)
    {
        var z = await db.Zones.FindAsync(id);
        if (z is null) return false;
        db.Zones.Remove(z);
        await db.SaveChangesAsync();
        return true;
    }
}
