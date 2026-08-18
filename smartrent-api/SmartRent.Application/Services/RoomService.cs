using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Phòng trọ (thêm, sửa, xóa phòng, xem chi tiết phòng, lịch sử điện nước, hợp đồng và hóa đơn).
public class RoomService(AppDbContext db)
{
    // Lấy danh sách các phòng trọ của Chủ trọ (hỗ trợ phân trang và lọc theo khu trọ).
    public async Task<object> GetByLandlordAsync(Guid landlordId, Guid? zoneId = null, int? page = null, int? pageSize = null)
    {
        var query = db.Rooms.Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t.User).Include(r => r.Equipments).AsSplitQuery()
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
            var dtos = items.Select(MapRoom);
            return PagedResult<RoomDto>.Create(dtos, totalItems, p, ps);
        }
        var rooms = await query.OrderBy(r => r.RoomNumber).ToListAsync();
        return rooms.Select(MapRoom);
    }

    // Lấy thông tin cơ bản của phòng trọ theo ID (đảm bảo thuộc quyền quản lý của chủ trọ).
    public async Task<RoomDto?> GetByIdAsync(Guid id, Guid landlordId)
    {
        var r = await db.Rooms.Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t.User).Include(r => r.Equipments).AsSplitQuery()
            .FirstOrDefaultAsync(r => r.Id == id && r.Zone.LandlordId == landlordId);
        return r is null ? null : MapRoom(r);
    }

    // Tạo mới một phòng trọ trong Khu trọ.
    public async Task<RoomDto> CreateAsync(Guid landlordId, CreateRoomRequest req)
    {
        var zone = await db.Zones.FirstOrDefaultAsync(z => z.Id == req.ZoneId && z.LandlordId == landlordId) 
            ?? throw new KeyNotFoundException("Khu trọ không tồn tại hoặc không thuộc quyền quản lý của bạn");
        var status = Enum.Parse<RoomStatus>(req.Status, ignoreCase: true);
        var room = new Room 
        { 
            ZoneId = req.ZoneId, 
            RoomNumber = req.RoomNumber, 
            Floor = req.Floor, 
            Price = req.Price, 
            Area = req.Area, 
            MaxTenants = req.MaxTenants, 
            Status = status, 
            ElecMeter = req.ElecMeter, 
            WaterMeter = req.WaterMeter, 
            ServiceFee = req.ServiceFee,
            Description = req.Description, 
            Amenities = req.Amenities 
        };
        
        if (req.Equipments != null && req.Equipments.Any())
        {
            foreach (var eq in req.Equipments)
            {
                room.Equipments.Add(new RoomEquipment
                {
                    Name = eq.Name,
                    Brand = eq.Brand,
                    Quantity = eq.Quantity,
                    Condition = eq.Condition
                });
            }
        }

        db.Rooms.Add(room);
        await db.SaveChangesAsync();
        room.Zone = zone;
        return MapRoom(room);
    }

    // Cập nhật thông tin phòng trọ (kiểm tra quyền sở hữu).
    public async Task<RoomDto> UpdateAsync(Guid id, Guid landlordId, UpdateRoomRequest req)
    {
        var room = await db.Rooms.Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t.User).Include(r => r.Equipments)
            .FirstOrDefaultAsync(r => r.Id == id && r.Zone.LandlordId == landlordId) 
            ?? throw new KeyNotFoundException("Phòng không tồn tại hoặc không thuộc quyền quản lý của bạn");

        room.RoomNumber = req.RoomNumber; 
        room.Floor = req.Floor; 
        room.Price = req.Price; 
        room.Area = req.Area;
        room.MaxTenants = req.MaxTenants; 
        room.Status = Enum.Parse<RoomStatus>(req.Status, ignoreCase: true);
        room.ElecMeter = req.ElecMeter; 
        room.WaterMeter = req.WaterMeter; 
        room.ServiceFee = req.ServiceFee;
        room.Description = req.Description;
        room.Amenities = req.Amenities;
        await db.SaveChangesAsync();
        return MapRoom(room);
    }

    // Xóa một phòng trọ khỏi hệ thống (kiểm tra quyền sở hữu).
    public async Task<bool> DeleteAsync(Guid id, Guid landlordId)
    {
        var r = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == id && r.Zone.LandlordId == landlordId);
        if (r is null) return false;
        db.Rooms.Remove(r);
        await db.SaveChangesAsync();
        return true;
    }

    // Lấy chi tiết toàn bộ thông tin phòng (kiểm tra quyền sở hữu).
    public async Task<RoomDetailDto?> GetRoomDetailAsync(Guid roomId, Guid landlordId)
    {
        var r = await db.Rooms
            .Include(r => r.Zone)
            .Include(r => r.Tenants).ThenInclude(t => t.User)
            .Include(r => r.Tenants).ThenInclude(t => t.Contracts)
            .Include(r => r.Equipments)
            .AsSplitQuery()
            .FirstOrDefaultAsync(r => r.Id == roomId && r.Zone.LandlordId == landlordId);

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
                c.Id, c.ContractCode, c.RoomId, c.Room?.RoomNumber ?? "",
                c.Room?.ZoneId ?? Guid.Empty, c.Room?.Zone?.Name ?? "", c.Room?.Zone?.Address ?? "",
                c.Room?.Zone?.LandlordId ?? Guid.Empty, c.Room?.Zone?.Landlord?.FullName ?? "", c.Room?.Zone?.Landlord?.Phone ?? "", c.Room?.Zone?.Landlord?.Email,
                c.TenantProfileId, c.TenantProfile?.User?.FullName ?? "", c.TenantProfile?.User?.Phone ?? "", c.TenantProfile?.CCCD,
                c.StartDate, c.EndDate, c.RentAmount, c.Deposit, c.Status.ToString(),
                c.PaymentTermDay, c.Terms, c.FileUrl, c.CreatedAt
            );
        }

        var equipmentDtos = r.Equipments.Select(e => new RoomEquipmentDto(
            e.Id, e.RoomId, e.Name, e.Brand, e.Quantity, e.Condition
        )).ToList();

        return new RoomDetailDto(
            r.Id, r.ZoneId, r.Zone?.Name ?? "", r.RoomNumber,
            r.Floor, r.Price, r.Area, r.MaxTenants,
            r.Status.ToString(), r.ElecMeter, r.WaterMeter,
            r.Description, r.Amenities, r.CreatedAt,
            tenantDtos, invoiceDtos, utilityDtos, activeContractDto,
            equipmentDtos,
            r.ServiceFee
        );
    }

    // Quản lý Trang thiết bị / Nội thất phòng (kiểm tra quyền sở hữu)
    public async Task<RoomEquipmentDto> AddEquipmentAsync(Guid roomId, Guid landlordId, CreateEquipmentRequest req)
    {
        var room = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == roomId && r.Zone.LandlordId == landlordId) 
            ?? throw new KeyNotFoundException("Phòng không tồn tại hoặc không thuộc quyền quản lý của bạn");

        var eq = new RoomEquipment
        {
            RoomId = roomId,
            Name = req.Name,
            Brand = req.Brand,
            Quantity = req.Quantity,
            Condition = req.Condition
        };
        db.RoomEquipments.Add(eq);
        await db.SaveChangesAsync();
        return new RoomEquipmentDto(eq.Id, eq.RoomId, eq.Name, eq.Brand, eq.Quantity, eq.Condition);
    }

    public async Task<RoomEquipmentDto> UpdateEquipmentAsync(Guid equipmentId, Guid landlordId, CreateEquipmentRequest req)
    {
        var eq = await db.RoomEquipments.Include(e => e.Room).ThenInclude(r => r.Zone)
            .FirstOrDefaultAsync(e => e.Id == equipmentId && e.Room.Zone.LandlordId == landlordId) 
            ?? throw new KeyNotFoundException("Thiết bị không tồn tại hoặc bạn không có quyền chỉnh sửa");

        eq.Name = req.Name;
        eq.Brand = req.Brand;
        eq.Quantity = req.Quantity;
        eq.Condition = req.Condition;
        await db.SaveChangesAsync();
        return new RoomEquipmentDto(eq.Id, eq.RoomId, eq.Name, eq.Brand, eq.Quantity, eq.Condition);
    }

    public async Task<bool> DeleteEquipmentAsync(Guid equipmentId, Guid landlordId)
    {
        var eq = await db.RoomEquipments.Include(e => e.Room).ThenInclude(r => r.Zone)
            .FirstOrDefaultAsync(e => e.Id == equipmentId && e.Room.Zone.LandlordId == landlordId);
        if (eq is null) return false;
        db.RoomEquipments.Remove(eq);
        await db.SaveChangesAsync();
        return true;
    }

    private static RoomDto MapRoom(Room r)
    {
        var repTenant = r.Tenants?.OrderBy(t => t.MoveInDate ?? t.CreatedAt).FirstOrDefault();
        return new(
            r.Id, r.ZoneId, r.Zone?.Name ?? "", r.RoomNumber, r.Floor, r.Price, r.Area, r.MaxTenants,
            r.Status.ToString(), r.ElecMeter, r.WaterMeter, r.Description, r.Amenities, r.CreatedAt,
            repTenant?.User?.FullName,
            r.Equipments?.Select(e => new RoomEquipmentDto(e.Id, e.RoomId, e.Name, e.Brand, e.Quantity, e.Condition)).ToList(),
            r.ServiceFee,
            repTenant?.User?.Phone
        );
    }
}
