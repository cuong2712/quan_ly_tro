using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Khu trọ / Tòa nhà của Chủ trọ.
public class ZoneService(AppDbContext db)
{
    // Lấy danh sách tất cả các khu trọ thuộc về một Chủ trọ (hỗ trợ phân trang).
    public async Task<object> GetByLandlordAsync(Guid landlordId, int? page = null, int? pageSize = null)
    {
        var query = db.Zones.AsNoTracking().Include(z => z.Rooms).Where(z => z.LandlordId == landlordId);
        var totalItems = await query.CountAsync();
        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            var items = await query.OrderByDescending(z => z.CreatedAt)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = items.Select(z => new ZoneDto(z.Id, z.Name, z.Address, z.Description, z.TotalRooms, z.Rooms.Count, z.CreatedAt));
            return PagedResult<ZoneDto>.Create(dtos, totalItems, p, ps);
        }
        var list = await query.OrderByDescending(z => z.CreatedAt).ToListAsync();
        return list.Select(z => new ZoneDto(z.Id, z.Name, z.Address, z.Description, z.TotalRooms, z.Rooms.Count, z.CreatedAt));
    }

    // Tạo mới một Khu trọ / Tòa nhà.
    public async Task<ZoneDto> CreateAsync(Guid landlordId, CreateZoneRequest req)
    {
        var zone = new Zone { LandlordId = landlordId, Name = req.Name, Address = req.Address, Description = req.Description, TotalRooms = req.TotalRooms };
        db.Zones.Add(zone);
        await db.SaveChangesAsync();
        return new ZoneDto(zone.Id, zone.Name, zone.Address, zone.Description, zone.TotalRooms, 0, zone.CreatedAt);
    }

    // Cập nhật thông tin Khu trọ / Tòa nhà (kiểm tra quyền sở hữu).
    public async Task<ZoneDto> UpdateAsync(Guid id, Guid landlordId, UpdateZoneRequest req)
    {
        var zone = await db.Zones.Include(z => z.Rooms).FirstOrDefaultAsync(z => z.Id == id && z.LandlordId == landlordId) 
            ?? throw new KeyNotFoundException("Khu trọ không tồn tại hoặc bạn không có quyền thao tác.");

        zone.Name = req.Name; 
        zone.Address = req.Address; 
        zone.Description = req.Description; 
        zone.TotalRooms = req.TotalRooms;
        await db.SaveChangesAsync();
        return new ZoneDto(zone.Id, zone.Name, zone.Address, zone.Description, zone.TotalRooms, zone.Rooms.Count, zone.CreatedAt);
    }

    // Xóa một Khu trọ theo ID (kiểm tra quyền sở hữu).
    public async Task<bool> DeleteAsync(Guid id, Guid landlordId)
    {
        var z = await db.Zones.FirstOrDefaultAsync(z => z.Id == id && z.LandlordId == landlordId);
        if (z is null) return false;
        db.Zones.Remove(z);
        await db.SaveChangesAsync();
        return true;
    }
}
