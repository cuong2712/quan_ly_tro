using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;

namespace SmartRent.Application.Common.Mappings;

public static class RoomMappingExtensions
{
    public static RoomDto ToRoomDto(this Room r)
    {
        // 1. Ưu tiên hàng đầu: Người đứng tên Hợp đồng đang có hiệu lực (Active hoặc RenewRequested)
        var activeContract = r.Contracts?.FirstOrDefault(c => c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested);
        var repTenant = (activeContract != null
            ? r.Tenants?.FirstOrDefault(t => t.Id == activeContract.TenantProfileId)
            : null)
            ?? r.Tenants?.OrderBy(t => t.MoveInDate ?? t.CreatedAt).FirstOrDefault();

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
            repTenant?.User?.Phone,
            r.DepositAmount,
            r.DepositTenantName,
            r.DepositTenantPhone,
            r.ExpectedMoveInDate,
            r.DepositNote
        );
    }
}


