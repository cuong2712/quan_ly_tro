using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;

namespace SmartRent.Application.Common.Mappings;

public static class RoomMappingExtensions
{
    public static RoomDto ToRoomDto(this Room r)
    {
        var repTenant = r.Tenants?.OrderBy(t => t.MoveInDate ?? t.CreatedAt).FirstOrDefault();
        return new(
            r.Id,
            r.ZoneId,
            r.Zone?.Name ?? "",
            r.RoomNumber,
            r.Floor,
            r.Price,
            r.Area,
            r.MaxTenants,
            r.Status.ToString(),
            r.ElecMeter,
            r.WaterMeter,
            r.Description,
            r.Amenities,
            r.CreatedAt,
            repTenant?.User?.FullName,
            r.Equipments?.Select(e => new RoomEquipmentDto(e.Id, e.RoomId, e.Name, e.Brand, e.Quantity, e.Condition)).ToList(),
            r.ServiceFee,
            repTenant?.User?.Phone
        );
    }
}
