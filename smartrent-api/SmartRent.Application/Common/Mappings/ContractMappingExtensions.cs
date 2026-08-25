using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;

namespace SmartRent.Application.Common.Mappings;

public static class ContractMappingExtensions
{
    public static ContractDto ToContractDto(this Contract c)
    {
        var statusStr = c.Status.ToString();
        if (c.Status == ContractStatus.Active && c.EndDate.Date < DateTime.UtcNow.Date)
        {
            statusStr = ContractStatus.Expired.ToString();
        }

        return new(
            c.Id,
            c.ContractCode,
            c.RoomId,
            c.Room?.RoomNumber ?? "",
            c.Room?.ZoneId ?? Guid.Empty,
            c.Room?.Zone?.Name ?? "",
            c.Room?.Zone?.Address ?? "",
            c.Room?.Zone?.LandlordId ?? Guid.Empty,
            c.Room?.Zone?.Landlord?.FullName ?? "",
            c.Room?.Zone?.Landlord?.Phone ?? "",
            c.Room?.Zone?.Landlord?.Email,
            c.TenantProfileId,
            c.TenantProfile?.User?.FullName ?? "",
            c.TenantProfile?.User?.Phone ?? "",
            c.TenantProfile?.CCCD,
            c.StartDate,
            c.EndDate,
            c.RentAmount,
            c.Deposit,
            statusStr,
            c.PaymentTermDay,
            c.Terms,
            c.FileUrl,
            c.CreatedAt,
            c.RequestedRenewMonths,
            c.RenewNotes,
            c.RenewRequestedAt
        );
    }
}
