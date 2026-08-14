using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Infrastructure.Repositories;

// Repository thao tác cơ sở dữ liệu cho Chỉ số điện nước & Đơn giá (UtilityLog & UtilityRate)
public class UtilityRepository(AppDbContext db) : IUtilityRepository
{
    // Lấy lịch sử chốt chỉ số điện nước của một phòng trọ
    public async Task<IEnumerable<UtilityLog>> GetByRoomIdAsync(Guid roomId) =>
        await db.UtilityLogs.Include(u => u.Room).Where(u => u.RoomId == roomId).OrderByDescending(u => u.Month).ToListAsync();

    // Lấy lịch sử chốt chỉ số điện nước toàn bộ các phòng thuộc Chủ trọ
    public async Task<IEnumerable<UtilityLog>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.UtilityLogs.Include(u => u.Room).ThenInclude(r => r.Zone)
            .Where(u => u.Room.Zone.LandlordId == landlordId).OrderByDescending(u => u.RecordedAt).ToListAsync();

    // Lấy chi tiết một bản ghi chỉ số điện nước theo ID
    public async Task<UtilityLog?> GetByIdAsync(Guid id) => await db.UtilityLogs.FindAsync(id);

    // Thêm mới ghi chép chỉ số điện nước
    public async Task<UtilityLog> CreateAsync(UtilityLog log) { db.UtilityLogs.Add(log); await db.SaveChangesAsync(); return log; }

    // Cập nhật ghi chép chỉ số điện nước
    public async Task<UtilityLog> UpdateAsync(UtilityLog log) { db.UtilityLogs.Update(log); await db.SaveChangesAsync(); return log; }

    // Lấy đơn giá điện nước mặc định thiết lập bởi Chủ trọ
    public async Task<UtilityRate?> GetRateByLandlordIdAsync(Guid landlordId) =>
        await db.UtilityRates.FirstOrDefaultAsync(r => r.LandlordId == landlordId);

    // Cập nhật hoặc thêm mới đơn giá điện nước của Chủ trọ
    public async Task<UtilityRate> UpsertRateAsync(UtilityRate rate)
    {
        var existing = await db.UtilityRates.FirstOrDefaultAsync(r => r.LandlordId == rate.LandlordId);
        if (existing is null) { db.UtilityRates.Add(rate); }
        else { existing.ElecPrice = rate.ElecPrice; existing.WaterPrice = rate.WaterPrice; existing.UpdatedAt = DateTime.UtcNow; }
        await db.SaveChangesAsync();
        return existing ?? rate;
    }
}
