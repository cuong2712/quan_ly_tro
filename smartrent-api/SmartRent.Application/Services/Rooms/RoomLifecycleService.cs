using Microsoft.EntityFrameworkCore;
using SmartRent.Application.Common.Mappings;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Rooms;

// Dịch vụ quản lý vòng đời Phòng trọ (Tạo phòng, Sửa phòng, Xóa phòng, Quản lý thiết bị)
public class RoomLifecycleService(AppDbContext db)
{
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
        return room.ToRoomDto();
    }

    // Cập nhật thông tin phòng trọ
    public async Task<RoomDto> UpdateAsync(Guid id, Guid landlordId, UpdateRoomRequest req)
    {
        var room = await db.Rooms.Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t.User).Include(r => r.Contracts).Include(r => r.Equipments)
            .FirstOrDefaultAsync(r => r.Id == id && r.Zone.LandlordId == landlordId) 
            ?? throw new KeyNotFoundException("Phòng không tồn tại hoặc không thuộc quyền quản lý của bạn");

        var newStatus = Enum.Parse<RoomStatus>(req.Status, ignoreCase: true);

        // Kiểm tra điều kiện: Không cho phép chuyển phòng sang 'Còn trống' hoặc 'Bảo trì' nếu vẫn còn khách thuê hoặc hợp đồng đang có hiệu lực
        if (newStatus == RoomStatus.Vacant || newStatus == RoomStatus.Maintenance)
        {
            var hasActiveContract = await db.Contracts.AnyAsync(c => c.RoomId == id && (c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested));
            var hasTenants = room.Tenants.Any();
            if (hasActiveContract || hasTenants)
            {
                var tenantCount = room.Tenants.Count;
                var statusText = newStatus == RoomStatus.Vacant ? "Còn trống" : "Bảo trì";
                throw new InvalidOperationException($"Không thể chuyển phòng {room.RoomNumber} sang trạng thái '{statusText}' khi vẫn còn {tenantCount} người đang ở hoặc hợp đồng còn hiệu lực. Vui lòng thanh lý hợp đồng và gỡ khách khỏi phòng trước khi đổi trạng thái phòng.");
            }
        }

        room.RoomNumber = req.RoomNumber; 
        room.Floor = req.Floor; 
        room.Price = req.Price; 
        room.Area = req.Area;
        room.MaxTenants = req.MaxTenants; 
        room.Status = newStatus;
        room.ElecMeter = req.ElecMeter; 
        room.WaterMeter = req.WaterMeter; 
        room.ServiceFee = req.ServiceFee;
        room.Description = req.Description;
        room.Amenities = req.Amenities;
        await db.SaveChangesAsync();
        return room.ToRoomDto();
    }

    // Xóa một phòng trọ
    public async Task<bool> DeleteAsync(Guid id, Guid landlordId)
    {
        var r = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == id && r.Zone.LandlordId == landlordId);
        if (r is null) return false;
        db.Rooms.Remove(r);
        await db.SaveChangesAsync();
        return true;
    }

    // Quản lý Trang thiết bị / Nội thất phòng
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
}
