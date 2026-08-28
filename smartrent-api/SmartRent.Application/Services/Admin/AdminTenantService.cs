using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Admin;

// Phân hệ Quản trị khách thuê toàn hệ thống dành cho Super Admin.
public class AdminTenantService(AppDbContext db)
{
    // Lấy danh sách toàn bộ khách thuê trong hệ thống với bộ lọc nâng cao
    public async Task<object> GetTenantsAsync(
        string? search = null,
        bool? isActive = null,
        Guid? landlordId = null,
        string? rentStatus = null, // "renting", "vacated", "all"
        int? page = null,
        int? pageSize = null)
    {
        var query = db.TenantProfiles
            .AsNoTracking()
            .Include(t => t.User)
            .Include(t => t.Room).ThenInclude(r => r!.Zone).ThenInclude(z => z.Landlord)
            .Include(t => t.Contracts)
            .Where(t => t.User != null && t.User.Role == UserRole.Tenant)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(t =>
                (t.User != null && (t.User.FullName.Contains(s) || t.User.Email.Contains(s) || t.User.Phone.Contains(s))) ||
                (t.CCCD != null && t.CCCD.Contains(s)) ||
                (t.Hometown != null && t.Hometown.Contains(s)) ||
                (t.Room != null && t.Room.RoomNumber.Contains(s)) ||
                (t.Room != null && t.Room.Zone != null && t.Room.Zone.Name.Contains(s)) ||
                (t.Room != null && t.Room.Zone != null && t.Room.Zone.Landlord != null && t.Room.Zone.Landlord.FullName.Contains(s))
            );
        }

        if (isActive.HasValue)
        {
            query = query.Where(t => t.User != null && t.User.IsActive == isActive.Value);
        }

        if (landlordId.HasValue && landlordId.Value != Guid.Empty)
        {
            query = query.Where(t => t.Room != null && t.Room.Zone.LandlordId == landlordId.Value);
        }

        if (!string.IsNullOrWhiteSpace(rentStatus))
        {
            var rs = rentStatus.Trim().ToLower();
            if (rs == "renting")
                query = query.Where(t => t.RoomId != null);
            else if (rs == "vacated")
                query = query.Where(t => t.RoomId == null);
        }

        var totalItems = await query.CountAsync();
        List<TenantProfile> profiles;

        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            profiles = await query.OrderByDescending(t => t.CreatedAt)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
        }
        else
        {
            profiles = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
        }

        var profileIds = profiles.Select(t => t.Id).ToList();
        var roomIds = profiles.Where(t => t.RoomId != null).Select(t => t.RoomId!.Value).Distinct().ToList();

        // 1. Lấy hóa đơn unpaid theo tenant an toàn
        var unpaidInvoicesList = await db.Invoices
            .AsNoTracking()
            .Where(i => profileIds.Contains(i.TenantProfileId) && i.Status == InvoiceStatus.Unpaid)
            .GroupBy(i => i.TenantProfileId)
            .Select(g => new { TenantProfileId = g.Key, Count = g.Count(), Total = g.Sum(x => x.TotalAmount) })
            .ToListAsync();
        var unpaidInvoicesGroup = unpaidInvoicesList.ToDictionary(x => x.TenantProfileId, x => x);

        // 2. Lấy các hợp đồng active theo phòng an toàn không gây trùng Key
        var activeContractsList = await db.Contracts
            .AsNoTracking()
            .Where(c => roomIds.Contains(c.RoomId) && (c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested))
            .ToListAsync();
        var activeContractsMap = activeContractsList
            .GroupBy(c => c.RoomId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.CreatedAt).First());

        var dtos = profiles.Select(t =>
        {
            var hasUnpaid = unpaidInvoicesGroup.TryGetValue(t.Id, out var unpaid);
            var unpaidCount = hasUnpaid ? unpaid!.Count : 0;
            var unpaidTotal = hasUnpaid ? unpaid!.Total : 0m;

            var activeContract = t.RoomId != null && activeContractsMap.TryGetValue(t.RoomId.Value, out var ac) ? ac : null;
            var isPrimary = activeContract != null && activeContract.TenantProfileId == t.Id;
            var activeCode = activeContract?.ContractCode ?? t.Contracts.FirstOrDefault(c => c.Status == ContractStatus.Active)?.ContractCode;

            return new AdminTenantListDto(
                t.Id,
                t.UserId,
                t.User?.FullName ?? "N/A",
                t.User?.Email ?? "N/A",
                t.User?.Phone ?? "N/A",
                t.User?.AvatarUrl,
                t.User?.IsActive ?? true,
                t.RoomId,
                t.Room?.RoomNumber,
                t.Room?.Zone?.Name,
                t.Room?.Zone?.LandlordId,
                t.Room?.Zone?.Landlord?.FullName,
                t.CCCD,
                t.Hometown,
                t.CccdFrontUrl,
                t.CccdBackUrl,
                t.MoveInDate,
                t.Deposit,
                activeCode,
                isPrimary,
                unpaidCount,
                unpaidTotal,
                t.VehicleCount,
                t.VehicleInfo,
                t.CreatedAt
            );
        }).ToList();

        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            return PagedResult<AdminTenantListDto>.Create(dtos, totalItems, page.Value, pageSize.Value);
        }

        return dtos;
    }

    // Lấy chi tiết hồ sơ khách thuê kèm toàn bộ lịch sử hợp đồng và hóa đơn
    public async Task<AdminTenantDetailDto> GetTenantDetailAsync(Guid tenantProfileId)
    {
        var t = await db.TenantProfiles
            .AsNoTracking()
            .Include(t => t.User)
            .Include(t => t.Room).ThenInclude(r => r!.Zone).ThenInclude(z => z.Landlord)
            .Include(t => t.Contracts).ThenInclude(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .FirstOrDefaultAsync(t => t.Id == tenantProfileId || t.UserId == tenantProfileId)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ khách thuê");

        var contracts = t.Contracts.OrderByDescending(c => c.CreatedAt).Select(c => new AdminTenantContractDto(
            c.Id,
            c.ContractCode,
            c.Room?.RoomNumber ?? "",
            c.Room?.Zone?.Name ?? "",
            c.Room?.Zone?.Landlord?.FullName ?? "",
            c.StartDate,
            c.EndDate,
            c.RentAmount,
            c.Deposit,
            c.Status.ToString(),
            c.CreatedAt
        )).ToList();

        var unpaidInvoices = await db.Invoices
            .AsNoTracking()
            .Where(i => i.TenantProfileId == t.Id && i.Status == InvoiceStatus.Unpaid)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new AdminTenantInvoiceDto(
                i.Id,
                i.InvoiceCode,
                i.Month,
                i.TotalAmount,
                i.Status.ToString(),
                i.DueDate,
                i.PaidDate,
                i.CreatedAt
            )).ToListAsync();

        var isPrimary = false;
        if (t.RoomId != null)
        {
            isPrimary = await db.Contracts.AnyAsync(c =>
                c.RoomId == t.RoomId.Value &&
                c.TenantProfileId == t.Id &&
                (c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested));
        }

        return new AdminTenantDetailDto(
            t.Id,
            t.UserId,
            t.User?.FullName ?? "N/A",
            t.User?.Email ?? "N/A",
            t.User?.Phone ?? "N/A",
            t.User?.AvatarUrl,
            t.User?.IsActive ?? true,
            t.RoomId,
            t.Room?.RoomNumber,
            t.Room?.Zone?.Name,
            t.Room?.Zone?.LandlordId,
            t.Room?.Zone?.Landlord?.FullName,
            t.Room?.Zone?.Landlord?.Phone,
            t.CCCD,
            t.Hometown,
            t.CccdFrontUrl,
            t.CccdBackUrl,
            t.MoveInDate,
            t.Deposit,
            t.VehicleCount,
            t.VehicleInfo,
            isPrimary,
            contracts,
            unpaidInvoices,
            t.CreatedAt
        );
    }

    // Khóa hoặc mở khóa tài khoản của Khách thuê
    public async Task ToggleLockTenantAsync(Guid tenantProfileId)
    {
        var tenant = await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == tenantProfileId || t.UserId == tenantProfileId)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ khách thuê");

        if (tenant.User == null)
            throw new KeyNotFoundException("Không tìm thấy tài khoản người dùng của khách thuê");

        tenant.User.IsActive = !tenant.User.IsActive;
        await db.SaveChangesAsync();
    }

    // Đặt lại mật khẩu tài khoản Khách thuê về mật khẩu mặc định hoặc mới
    public async Task ResetTenantPasswordAsync(Guid tenantProfileId, string newPassword = "Tenant@2026")
    {
        var tenant = await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == tenantProfileId || t.UserId == tenantProfileId)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ khách thuê");

        if (tenant.User == null)
            throw new KeyNotFoundException("Không tìm thấy tài khoản người dùng của khách thuê");

        tenant.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await db.SaveChangesAsync();
    }
}

