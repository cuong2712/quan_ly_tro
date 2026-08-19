using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Danh mục Dịch vụ bổ sung của Chủ trọ (Wi-Fi, Rác, Gửi xe, Vệ sinh...).
public class ServiceMgmtService(AppDbContext db)
{
    // Lấy danh sách dịch vụ của Chủ trọ (hỗ trợ phân trang và lọc theo khu vực/ZoneId).
    public async Task<object> GetByLandlordAsync(Guid landlordId, Guid? zoneId = null, int? page = null, int? pageSize = null)
    {
        var query = db.Services.AsNoTracking().Include(s => s.Zone).Where(s => s.LandlordId == landlordId);
        if (zoneId.HasValue)
        {
            query = query.Where(s => s.ZoneId == zoneId || s.ZoneId == null);
        }
        var totalItems = await query.CountAsync();
        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            var items = await query.OrderByDescending(s => s.CreatedAt)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = items.Select(MapSvc);
            return PagedResult<ServiceDto>.Create(dtos, totalItems, p, ps);
        }
        var list = await query.OrderByDescending(s => s.CreatedAt).ToListAsync();
        return list.Select(MapSvc);
    }

    // Tạo mới một loại Dịch vụ (tên, giá tiền, đơn vị tính, icon, khu vực).
    public async Task<ServiceDto> CreateAsync(Guid landlordId, CreateServiceRequest req)
    {
        var s = new Service
        {
            LandlordId = landlordId,
            ZoneId = req.ZoneId,
            Name = req.Name,
            Price = req.Price,
            Unit = req.Unit,
            Icon = req.Icon
        };
        db.Services.Add(s);
        await db.SaveChangesAsync();
        if (s.ZoneId.HasValue)
        {
            await db.Entry(s).Reference(x => x.Zone).LoadAsync();
        }
        return MapSvc(s);
    }

    // Cập nhật thông tin Dịch vụ (kiểm tra quyền sở hữu).
    public async Task<ServiceDto> UpdateAsync(Guid id, Guid landlordId, UpdateServiceRequest req)
    {
        var s = await db.Services.Include(x => x.Zone).FirstOrDefaultAsync(x => x.Id == id && x.LandlordId == landlordId) 
            ?? throw new KeyNotFoundException("Dịch vụ không tồn tại hoặc bạn không có quyền thao tác.");

        s.Name = req.Name;
        s.Price = req.Price;
        s.Unit = req.Unit;
        s.Icon = req.Icon;
        s.IsActive = req.IsActive;
        s.ZoneId = req.ZoneId;
        await db.SaveChangesAsync();
        if (s.ZoneId.HasValue && (s.Zone == null || s.Zone.Id != s.ZoneId))
        {
            await db.Entry(s).Reference(x => x.Zone).LoadAsync();
        }
        return MapSvc(s);
    }

    // Xóa một Dịch vụ khỏi danh mục (kiểm tra quyền sở hữu).
    public async Task<bool> DeleteAsync(Guid id, Guid landlordId)
    {
        var s = await db.Services.FirstOrDefaultAsync(s => s.Id == id && s.LandlordId == landlordId);
        if (s is null) return false;
        db.Services.Remove(s);
        await db.SaveChangesAsync();
        return true;
    }

    private static ServiceDto MapSvc(Service s) => new(s.Id, s.Name, s.Price, s.Unit, s.Icon, s.IsActive, s.CreatedAt, s.ZoneId, s.Zone?.Name);
}
