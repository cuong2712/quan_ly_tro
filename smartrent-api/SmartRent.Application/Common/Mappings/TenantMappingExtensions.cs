using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;

namespace SmartRent.Application.Common.Mappings;

public static class TenantMappingExtensions
{
    public static TenantDto ToTenantDto(this TenantProfile t)
    {
        var activeContractCode = t.Contracts?
            .Where(c => c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefault()?.ContractCode;

        return new(
            t.Id,
            t.UserId,
            t.User?.FullName ?? "",
            t.User?.Email ?? "",
            t.User?.Phone ?? "",
            t.User?.AvatarUrl,
            t.CCCD,
            t.Hometown,
            t.MoveInDate,
            t.Deposit,
            t.RoomId,
            t.Room?.RoomNumber,
            t.Room?.Zone?.Name,
            t.CccdFrontUrl,
            t.CccdBackUrl,
            activeContractCode,
            t.VehicleCount,
            t.VehicleInfo
        );
    }
}

