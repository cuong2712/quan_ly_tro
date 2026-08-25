using Microsoft.EntityFrameworkCore;
using SmartRent.Application.Common.Mappings;
using SmartRent.Core.DTOs;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Rooms;

// Dịch vụ truy vấn và tìm kiếm thông tin Phòng trọ
public class RoomQueryService(AppDbContext db)
{
    // Lấy danh sách các phòng trọ của Chủ trọ (hỗ trợ phân trang và lọc theo khu trọ).
    public async Task<object> GetByLandlordAsync(Guid landlordId, Guid? zoneId = null, int? page = null, int? pageSize = null)
    {
        var query = db.Rooms.AsNoTracking().Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t.User).Include(r => r.Equipments).AsSplitQuery()
            .Where(r => r.Zone.LandlordId == landlordId);
        if (zoneId.HasValue) query = query.Where(r => r.ZoneId == zoneId);
        var totalItems = await query.CountAsync();
        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            var items = await query.OrderBy(r => r.RoomNumber)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = items.Select(r => r.ToRoomDto());
            return PagedResult<RoomDto>.Create(dtos, totalItems, p, ps);
        }
        var rooms = await query.OrderBy(r => r.RoomNumber).ToListAsync();
        return rooms.Select(r => r.ToRoomDto());
    }

    // Lấy thông tin cơ bản của phòng trọ theo ID
    public async Task<RoomDto?> GetByIdAsync(Guid id, Guid landlordId)
    {
        var r = await db.Rooms.AsNoTracking().Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t.User).Include(r => r.Equipments).AsSplitQuery()
            .FirstOrDefaultAsync(r => r.Id == id && r.Zone.LandlordId == landlordId);
        return r is null ? null : r.ToRoomDto();
    }

    // Lấy chi tiết toàn bộ thông tin phòng (gồm hóa đơn, điện nước, thành viên, thiết bị)
    public async Task<RoomDetailDto?> GetRoomDetailAsync(Guid roomId, Guid landlordId)
    {
        var r = await db.Rooms
            .AsNoTracking()
            .Include(r => r.Zone)
            .Include(r => r.Tenants).ThenInclude(t => t.User)
            .Include(r => r.Tenants).ThenInclude(t => t.Contracts)
            .Include(r => r.Equipments)
            .AsSplitQuery()
            .FirstOrDefaultAsync(r => r.Id == roomId && r.Zone.LandlordId == landlordId);

        if (r is null) return null;

        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
        var recentInvoices = await db.Invoices
            .AsNoTracking()
            .Include(i => i.Room)
            .Include(i => i.TenantProfile!).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .Where(i => i.RoomId == roomId && i.CreatedAt >= sixMonthsAgo)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var utilityLogs = await db.UtilityLogs
            .AsNoTracking()
            .Include(u => u.Room)
            .Where(u => u.RoomId == roomId)
            .OrderByDescending(u => u.RecordedAt)
            .Take(3)
            .ToListAsync();

        var activeContract = await db.Contracts
            .AsNoTracking()
            .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(c => c.TenantProfile!).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.RoomId == roomId && c.Status == ContractStatus.Active);

        var tenantDtos = r.Tenants.Select(t => {
            var activeContractCode = t.Contracts?.FirstOrDefault(c => c.Status == ContractStatus.Active)?.ContractCode;
            return new TenantDto(
                t.Id, t.UserId, t.User?.FullName ?? "", t.User?.Email ?? "", t.User?.Phone ?? "",
                t.User?.AvatarUrl, t.CCCD, t.Hometown, t.MoveInDate, t.Deposit,
                t.RoomId, r.RoomNumber, r.Zone?.Name,
                t.CccdFrontUrl, t.CccdBackUrl, activeContractCode,
                t.VehicleCount, t.VehicleInfo
            );
        }).ToList();

        var invoiceDtos = recentInvoices.Select(i => i.ToInvoiceDto()).ToList();

        var utilityDtos = utilityLogs.Select(u => new UtilityLogDto(
            u.Id, u.RoomId, u.Room?.RoomNumber ?? "", u.Month, u.OldElec, u.NewElec,
            u.ElecUsed, u.OldWater, u.NewWater, u.WaterUsed, u.ElecCost, u.WaterCost, u.RecordedAt
        )).ToList();

        ContractDto? activeContractDto = activeContract?.ToContractDto();

        var equipmentDtos = r.Equipments.Select(e => new RoomEquipmentDto(
            e.Id, e.RoomId, e.Name, e.Brand, e.Quantity, e.Condition
        )).ToList();

        // Phân tách Primary Tenant (người đứng tên HĐ) và Occupants (người ở ghép)
        Guid? primaryTenantId = activeContract?.TenantProfileId;
        TenantDto? primaryTenantDto = null;
        var occupantDtos = new List<TenantDto>();

        foreach (var td in tenantDtos)
        {
            if (primaryTenantId.HasValue && td.Id == primaryTenantId.Value)
                primaryTenantDto = td;
            else
                occupantDtos.Add(td);
        }

        return new RoomDetailDto(
            r.Id, r.ZoneId, r.Zone?.Name ?? "", r.RoomNumber,
            r.Floor, r.Price, r.Area, r.MaxTenants,
            r.Status.ToString(), r.ElecMeter, r.WaterMeter,
            r.Description, r.Amenities, r.CreatedAt,
            tenantDtos, invoiceDtos, utilityDtos, activeContractDto,
            equipmentDtos,
            r.ServiceFee,
            primaryTenantDto,
            occupantDtos
        );
    }
}
