using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;

namespace SmartRent.Application.Common.Mappings;

public static class TenantMappingExtensions
{
    public static TenantDto ToTenantDto(this TenantProfile t)
    {
        var activeContract = t.Contracts?
            .Where(c => c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefault();

        var effectiveMoveInDate = (t.MoveInDate.HasValue && t.MoveInDate.Value.Year > 1900)
            ? t.MoveInDate
            : (activeContract?.StartDate ?? t.Contracts?.OrderByDescending(c => c.CreatedAt).FirstOrDefault()?.StartDate ?? t.CreatedAt);

        return new(
            t.Id,
            t.UserId,
            t.User?.FullName ?? "",
            t.User?.Email ?? "",
            t.User?.Phone ?? "",
            t.User?.AvatarUrl,
            t.CCCD,
            t.Hometown,
            effectiveMoveInDate,
            t.Deposit,
            t.RoomId,
            t.Room?.RoomNumber,
            t.Room?.Zone?.Name,
            t.CccdFrontUrl,
            t.CccdBackUrl,
            activeContract?.ContractCode,
            t.VehicleCount,
            t.VehicleInfo
        );
    }
}

