using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Danh mục Dịch vụ bổ sung của Chủ trọ (Wi-Fi, Rác, Gửi xe, Vệ sinh...).
public class ServiceMgmtService(AppDbContext db)
{
    // Lấy danh sách dịch vụ của Chủ trọ.
    public async Task<IEnumerable<ServiceDto>> GetByLandlordAsync(Guid landlordId) =>
        (await db.Services.Where(s => s.LandlordId == landlordId).ToListAsync()).Select(MapSvc);

    // Tạo mới một loại Dịch vụ (tên, giá tiền, đơn vị tính, icon).
    public async Task<ServiceDto> CreateAsync(Guid landlordId, CreateServiceRequest req)
    {
        var s = new Service { LandlordId = landlordId, Name = req.Name, Price = req.Price, Unit = req.Unit, Icon = req.Icon };
        db.Services.Add(s); await db.SaveChangesAsync(); return MapSvc(s);
    }

    // Cập nhật thông tin Dịch vụ.
    public async Task<ServiceDto> UpdateAsync(Guid id, UpdateServiceRequest req)
    {
        var s = await db.Services.FindAsync(id) ?? throw new KeyNotFoundException();
        s.Name = req.Name; s.Price = req.Price; s.Unit = req.Unit; s.Icon = req.Icon; s.IsActive = req.IsActive;
        await db.SaveChangesAsync(); return MapSvc(s);
    }

    // Xóa một Dịch vụ khỏi danh mục.
    public async Task<bool> DeleteAsync(Guid id)
    {
        var s = await db.Services.FindAsync(id);
        if (s is null) return false;
        db.Services.Remove(s);
        await db.SaveChangesAsync();
        return true;
    }

    private static ServiceDto MapSvc(Service s) => new(s.Id, s.Name, s.Price, s.Unit, s.Icon, s.IsActive, s.CreatedAt);
}
