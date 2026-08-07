using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Phòng trọ (thêm, sửa, xóa phòng, xem chi tiết phòng, lịch sử điện nước, hợp đồng và hóa đơn).
public class RoomService(AppDbContext db)
{
    // Lấy danh sách các phòng trọ của Chủ trọ (có thể lọc theo ID khu trọ).
    public async Task<IEnumerable<RoomDto>> GetByLandlordAsync(Guid landlordId, Guid? zoneId = null)
    {
        var query = db.Rooms.Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t.User)
            .Where(r => r.Zone.LandlordId == landlordId);
        if (zoneId.HasValue) query = query.Where(r => r.ZoneId == zoneId);
        var rooms = await query.ToListAsync();
        return rooms.Select(MapRoom);
    }

    // Lấy thông tin cơ bản của phòng trọ theo ID.
    public async Task<RoomDto?> GetByIdAsync(Guid id)
    {
        var r = await db.Rooms.Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t.User).FirstOrDefaultAsync(r => r.Id == id);
        return r is null ? null : MapRoom(r);
    }

    // Tạo mới một phòng trọ trong Khu trọ.
    public async Task<RoomDto> CreateAsync(Guid landlordId, CreateRoomRequest req)
    {
        var zone = await db.Zones.FirstOrDefaultAsync(z => z.Id == req.ZoneId && z.LandlordId == landlordId) ?? throw new KeyNotFoundException("Zone không tồn tại");
        var status = Enum.Parse<RoomStatus>(req.Status, ignoreCase: true);
        var room = new Room { ZoneId = req.ZoneId, RoomNumber = req.RoomNumber, Floor = req.Floor, Price = req.Price, Area = req.Area, MaxTenants = req.MaxTenants, Status = status, ElecMeter = req.ElecMeter, WaterMeter = req.WaterMeter, Description = req.Description };
        db.Rooms.Add(room);
        await db.SaveChangesAsync();
        room.Zone = zone;
        return MapRoom(room);
    }

    // Cập nhật thông tin phòng trọ.
    public async Task<RoomDto> UpdateAsync(Guid id, UpdateRoomRequest req)
    {
        var room = await db.Rooms.Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t.User).FirstOrDefaultAsync(r => r.Id == id) ?? throw new KeyNotFoundException();
        room.RoomNumber = req.RoomNumber; room.Floor = req.Floor; room.Price = req.Price; room.Area = req.Area;
        room.MaxTenants = req.MaxTenants; room.Status = Enum.Parse<RoomStatus>(req.Status, ignoreCase: true);
        room.ElecMeter = req.ElecMeter; room.WaterMeter = req.WaterMeter; room.Description = req.Description;
        await db.SaveChangesAsync();
        return MapRoom(room);
    }

    // Xóa một phòng trọ khỏi hệ thống.
    public async Task<bool> DeleteAsync(Guid id)
    {
        var r = await db.Rooms.FindAsync(id);
        if (r is null) return false;
        db.Rooms.Remove(r);
        await db.SaveChangesAsync();
        return true;
    }

    // Lấy chi tiết toàn bộ thông tin phòng bao gồm: Khách thuê hiện tại, Hóa đơn 6 tháng gần nhất, Nhật ký điện nước và Hợp đồng active.
    public async Task<RoomDetailDto?> GetRoomDetailAsync(Guid roomId)
    {
        var r = await db.Rooms
            .Include(r => r.Zone)
            .Include(r => r.Tenants).ThenInclude(t => t.User)
            .Include(r => r.Tenants).ThenInclude(t => t.Contracts)
            .FirstOrDefaultAsync(r => r.Id == roomId);

        if (r is null) return null;

        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
        var recentInvoices = await db.Invoices
            .Include(i => i.Room)
            .Include(i => i.TenantProfile!).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .Where(i => i.RoomId == roomId && i.CreatedAt >= sixMonthsAgo)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var utilityLogs = await db.UtilityLogs
            .Include(u => u.Room)
            .Where(u => u.RoomId == roomId)
            .OrderByDescending(u => u.RecordedAt)
            .Take(3)
            .ToListAsync();

        var activeContract = await db.Contracts
            .Include(c => c.Room)
            .Include(c => c.TenantProfile!).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.RoomId == roomId && c.Status == ContractStatus.Active);

        var tenantDtos = r.Tenants.Select(t => {
            var activeContractCode = t.Contracts?.FirstOrDefault(c => c.Status == ContractStatus.Active)?.ContractCode;
            return new TenantDto(
                t.Id, t.UserId, t.User?.FullName ?? "", t.User?.Email ?? "", t.User?.Phone ?? "",
                t.User?.AvatarUrl, t.CCCD, t.Hometown, t.MoveInDate, t.Deposit,
                t.RoomId, r.RoomNumber, r.Zone?.Name,
                t.CccdFrontUrl, t.CccdBackUrl, activeContractCode
            );
        }).ToList();

        var invoiceDtos = recentInvoices.Select(i => new InvoiceDto(
            i.Id, i.InvoiceCode, i.RoomId, i.Room?.RoomNumber ?? "", i.TenantProfileId,
            i.TenantProfile?.User?.FullName ?? "", i.Month, i.RentFee, i.ElecFee, i.WaterFee,
            i.ServiceFee, i.TotalAmount, i.Status.ToString(), i.DueDate, i.PaidDate,
            i.CreatedAt, i.Items.Select(x => new InvoiceItemDto(x.Id, x.Name, x.Amount)).ToList()
        )).ToList();

        var utilityDtos = utilityLogs.Select(u => new UtilityLogDto(
            u.Id, u.RoomId, u.Room?.RoomNumber ?? "", u.Month, u.OldElec, u.NewElec,
            u.ElecUsed, u.OldWater, u.NewWater, u.WaterUsed, u.ElecCost, u.WaterCost, u.RecordedAt
        )).ToList();

        ContractDto? activeContractDto = null;
        if (activeContract != null)
        {
            var c = activeContract;
            activeContractDto = new ContractDto(
                c.Id, c.ContractCode, c.RoomId, c.Room?.RoomNumber ?? "", c.TenantProfileId,
                c.TenantProfile?.User?.FullName ?? "", c.TenantProfile?.User?.Phone ?? "",
                c.StartDate, c.EndDate, c.RentAmount, c.Deposit, c.Status.ToString(),
                c.PaymentTermDay, c.Terms, c.FileUrl, c.CreatedAt
            );
        }

        return new RoomDetailDto(
            r.Id, r.ZoneId, r.Zone?.Name ?? "", r.RoomNumber,
            r.Floor, r.Price, r.Area, r.MaxTenants,
            r.Status.ToString(), r.ElecMeter, r.WaterMeter,
            r.Description, r.CreatedAt,
            tenantDtos, invoiceDtos, utilityDtos, activeContractDto
        );
    }

    private static RoomDto MapRoom(Room r) => new(r.Id, r.ZoneId, r.Zone?.Name ?? "", r.RoomNumber, r.Floor, r.Price, r.Area, r.MaxTenants, r.Status.ToString(), r.ElecMeter, r.WaterMeter, r.Description, r.CreatedAt, r.Tenants.FirstOrDefault()?.User?.FullName);
}
