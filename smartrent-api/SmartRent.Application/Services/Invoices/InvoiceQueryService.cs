using Microsoft.EntityFrameworkCore;
using SmartRent.Application.Common.Mappings;
using SmartRent.Core.DTOs;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Invoices;

// Dịch vụ truy vấn và tìm kiếm Hóa đơn tiền nhà
public class InvoiceQueryService(AppDbContext db)
{
    // Lấy danh sách hóa đơn của Chủ trọ (hỗ trợ phân trang và lọc theo trạng thái/tháng).
    public async Task<object> GetByLandlordAsync(Guid landlordId, string? status = null, string? month = null, int? page = null, int? pageSize = null)
    {
        var query = db.Invoices
            .AsNoTracking()
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .Where(i => i.Room.Zone.LandlordId == landlordId).AsQueryable();

        if (!string.IsNullOrEmpty(status)) query = query.Where(i => i.Status.ToString() == status);
        if (!string.IsNullOrEmpty(month)) query = query.Where(i => i.Month == month);

        var totalItems = await query.CountAsync();
        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            var items = await query.OrderByDescending(i => i.CreatedAt)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = items.Select(i => i.ToInvoiceDto());
            return PagedResult<InvoiceDto>.Create(dtos, totalItems, p, ps);
        }

        var invoices = await query.OrderByDescending(i => i.CreatedAt).ToListAsync();
        return invoices.Select(i => i.ToInvoiceDto());
    }

    // Lấy danh sách hóa đơn của Khách thuê theo ID hồ sơ (TenantProfileId).
    public async Task<IEnumerable<InvoiceDto>> GetByTenantAsync(Guid tenantProfileId)
    {
        var invoices = await db.Invoices
            .AsNoTracking()
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.Items)
            .Where(i => i.TenantProfileId == tenantProfileId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
        return invoices.Select(i => i.ToInvoiceDto());
    }

    // Lấy danh sách hóa đơn của Khách thuê theo ID tài khoản (UserId).
    public async Task<IEnumerable<InvoiceDto>> GetByTenantUserIdAsync(Guid tenantUserId)
    {
        var profile = await db.TenantProfiles.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == tenantUserId);
        if (profile == null)
        {
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == tenantUserId);
            if (user != null)
            {
                profile = await db.TenantProfiles.AsNoTracking().FirstOrDefaultAsync(t => t.User.Email == user.Email);
            }
        }

        if (profile == null) return [];

        var invoices = await db.Invoices
            .AsNoTracking()
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .Where(i => i.TenantProfileId == profile.Id || (i.TenantProfile != null && i.TenantProfile.UserId == tenantUserId))
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return invoices.Select(i => i.ToInvoiceDto());
    }

    // Lấy chi tiết một hóa đơn theo ID hóa đơn (kiểm tra quyền truy cập).
    public async Task<InvoiceDto?> GetByIdAsync(Guid id, Guid currentUserId, string role)
    {
        var query = db.Invoices
            .AsNoTracking()
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .AsQueryable();

        if (role == "Landlord")
        {
            query = query.Where(i => i.Room.Zone.LandlordId == currentUserId);
        }
        else if (role == "Tenant")
        {
            query = query.Where(i => (i.TenantProfile != null && i.TenantProfile.UserId == currentUserId) || i.TenantProfileId == currentUserId);
        }

        var invoice = await query.FirstOrDefaultAsync(i => i.Id == id);
        return invoice is null ? null : invoice.ToInvoiceDto();
    }
}
