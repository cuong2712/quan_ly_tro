using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Utilities;

// Phân hệ Tra cứu & Lịch sử Chỉ số Điện Nước.
public class UtilityQueryService(AppDbContext db)
{
    // Lấy nhật ký chỉ số điện nước (hỗ trợ phân trang và lọc theo phòng).
    public async Task<object> GetByLandlordAsync(Guid landlordId, Guid? roomId = null, int? page = null, int? pageSize = null)
    {
        var query = db.UtilityLogs
            .AsNoTracking()
            .Include(u => u.Room).ThenInclude(r => r.Zone)
            .Where(u => u.Room.Zone.LandlordId == landlordId).AsQueryable();

        if (roomId.HasValue) query = query.Where(u => u.RoomId == roomId);

        var totalItems = await query.CountAsync();
        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            var items = await query.OrderByDescending(u => u.Month)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = items.Select(MapLog);
            return PagedResult<UtilityLogDto>.Create(dtos, totalItems, p, ps);
        }

        var logs = await query.OrderByDescending(u => u.Month).ToListAsync();
        return logs.Select(MapLog);
    }

    // Xóa bản ghi lịch sử điện nước (phục vụ kiểm thử & điều chỉnh) và hoàn tác số đồng hồ cũ.
    public async Task<bool> DeleteLogAsync(Guid landlordId, Guid id)
    {
        var log = await db.UtilityLogs.Include(u => u.Room).ThenInclude(r => r.Zone)
            .FirstOrDefaultAsync(u => u.Id == id && u.Room.Zone.LandlordId == landlordId);
        if (log == null) return false;

        var room = log.Room;
        if (room != null)
        {
            var hasNewerLog = await db.UtilityLogs.AnyAsync(u => u.RoomId == room.Id && u.Id != id && u.RecordedAt > log.RecordedAt);
            if (!hasNewerLog)
            {
                room.ElecMeter = log.OldElec;
                room.WaterMeter = log.OldWater;
            }
        }

        db.UtilityLogs.Remove(log);
        await db.SaveChangesAsync();
        return true;
    }

    public static UtilityLogDto MapLog(UtilityLog u) => new(
        u.Id,
        u.RoomId,
        u.Room?.RoomNumber ?? "",
        u.Month,
        u.OldElec,
        u.NewElec,
        u.ElecUsed,
        u.OldWater,
        u.NewWater,
        u.WaterUsed,
        u.ElecCost,
        u.WaterCost,
        u.RecordedAt
    );
}

