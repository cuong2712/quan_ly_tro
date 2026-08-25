using Microsoft.EntityFrameworkCore;
using SmartRent.Application.Common.Mappings;
using SmartRent.Core.DTOs;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Contracts;

// Dịch vụ truy vấn và tìm kiếm Hợp đồng thuê nhà
public class ContractQueryService(AppDbContext db)
{
    // Lấy danh sách hợp đồng thuê nhà thuộc các phòng của Chủ trọ (hỗ trợ phân trang).
    public async Task<object> GetByLandlordAsync(Guid landlordId, int? page = null, int? pageSize = null)
    {
        // Tự động kiểm tra & đồng bộ: giải phóng RoomId của người thuê nếu hợp đồng duy nhất đã Liquidated
        try
        {
            var liquidatedContracts = await db.Contracts
                .Include(c => c.TenantProfile)
                .Where(c => c.Room.Zone.LandlordId == landlordId && c.Status == ContractStatus.Liquidated && c.TenantProfile.RoomId != null)
                .ToListAsync();

            if (liquidatedContracts.Count != 0)
            {
                bool modified = false;
                foreach (var lc in liquidatedContracts)
                {
                    var hasOtherActive = await db.Contracts.AnyAsync(other => other.TenantProfileId == lc.TenantProfileId && other.Id != lc.Id && other.Status == ContractStatus.Active);
                    if (!hasOtherActive && lc.TenantProfile != null && lc.TenantProfile.RoomId != null)
                    {
                        lc.TenantProfile.RoomId = null;
                        modified = true;
                    }
                }
                if (modified)
                {
                    await db.SaveChangesAsync();
                }
            }
        }
        catch { /* Bỏ qua lỗi nền nếu có để không ảnh hưởng truy vấn dữ liệu */ }

        var query = db.Contracts
            .AsNoTracking()
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.Room.Zone.LandlordId == landlordId);

        var totalItems = await query.CountAsync();
        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            var items = await query.OrderByDescending(c => c.CreatedAt)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = items.Select(c => c.ToContractDto());
            return PagedResult<ContractDto>.Create(dtos, totalItems, p, ps);
        }

        var contracts = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return contracts.Select(c => c.ToContractDto());
    }

    // Lấy danh sách hợp đồng thuê của một Khách thuê theo ID hồ sơ (TenantProfileId).
    public async Task<IEnumerable<ContractDto>> GetByTenantAsync(Guid tenantProfileId)
    {
        var contracts = await db.Contracts
            .AsNoTracking()
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.TenantProfileId == tenantProfileId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
        return contracts.Select(c => c.ToContractDto());
    }

    // Lấy danh sách hợp đồng của Khách thuê theo ID tài khoản (UserId).
    public async Task<IEnumerable<ContractDto>> GetByTenantUserIdAsync(Guid tenantUserId)
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

        if (profile == null)
        {
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == tenantUserId);
            if (user != null)
            {
                var directContracts = await db.Contracts
                    .AsNoTracking()
                    .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
                    .Include(c => c.TenantProfile).ThenInclude(t => t.User)
                    .Where(c => c.TenantProfile.UserId == tenantUserId || (c.TenantProfile.User != null && c.TenantProfile.User.Email == user.Email))
                    .OrderByDescending(c => c.CreatedAt)
                    .ToListAsync();
                return directContracts.Select(c => c.ToContractDto());
            }
            return [];
        }

        var contracts = await db.Contracts
            .AsNoTracking()
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.TenantProfileId == profile.Id || (c.TenantProfile != null && c.TenantProfile.UserId == tenantUserId))
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return contracts.Select(c => c.ToContractDto());
    }

    // Lấy chi tiết một Hợp đồng theo ID (kiểm tra quyền sở hữu).
    public async Task<ContractDto?> GetByIdAsync(Guid id, Guid currentUserId, string role)
    {
        var query = db.Contracts
            .AsNoTracking()
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .AsQueryable();

        if (role == "Landlord")
        {
            query = query.Where(c => c.Room.Zone.LandlordId == currentUserId);
        }
        else if (role == "Tenant")
        {
            var profile = await db.TenantProfiles.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == currentUserId);
            if (profile == null)
            {
                var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId);
                if (user != null)
                {
                    profile = await db.TenantProfiles.AsNoTracking().FirstOrDefaultAsync(t => t.User.Email == user.Email);
                }
            }

            if (profile != null)
            {
                query = query.Where(c => c.TenantProfileId == profile.Id || (c.TenantProfile != null && c.TenantProfile.UserId == currentUserId));
            }
            else
            {
                var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId);
                if (user != null)
                {
                    query = query.Where(c => (c.TenantProfile != null && c.TenantProfile.UserId == currentUserId) || (c.TenantProfile != null && c.TenantProfile.User != null && c.TenantProfile.User.Email == user.Email));
                }
                else
                {
                    query = query.Where(c => c.TenantProfile != null && c.TenantProfile.UserId == currentUserId);
                }
            }
        }

        var contract = await query.FirstOrDefaultAsync(c => c.Id == id);
        return contract is null ? null : contract.ToContractDto();
    }
}
