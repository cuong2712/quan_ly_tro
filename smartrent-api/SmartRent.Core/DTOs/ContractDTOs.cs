using SmartRent.Core.Enums;
namespace SmartRent.Core.DTOs;

public record ContractDto(
    Guid Id, string ContractCode, Guid RoomId, string RoomNumber,
    Guid ZoneId, string ZoneName, string ZoneAddress,
    Guid LandlordId, string LandlordName, string LandlordPhone, string? LandlordEmail,
    Guid TenantProfileId, string TenantName, string TenantPhone, string? TenantCccd,
    DateTime StartDate, DateTime EndDate,
    decimal RentAmount, decimal Deposit, string Status,
    int PaymentTermDay, string? Terms, string? FileUrl,
    DateTime CreatedAt,
    int? RequestedRenewMonths = null,
    string? RenewNotes = null,
    DateTime? RenewRequestedAt = null
);

public record CreateContractRequest(
    string ContractCode, Guid RoomId, Guid TenantProfileId,
    DateTime StartDate, DateTime EndDate,
    decimal RentAmount, decimal Deposit,
    int PaymentTermDay, string? Terms
);

public record UpdateContractRequest(
    DateTime StartDate, DateTime EndDate,
    decimal RentAmount, int PaymentTermDay, string? Terms,
    Guid? RoomId = null
);

public record RequestRenewContractRequest(int ExtendMonths = 12, string? Notes = null);

public record RenewContractRequest(int ExtendMonths, decimal? NewRentAmount);

public record SettleContractRequest(
    decimal DamageDeductionAmount = 0,
    decimal OtherDeductionAmount = 0,
    string? SettlementNotes = null
);

public record ContractSettlementDto(
    Guid Id,
    Guid ContractId,
    Guid LandlordId,
    Guid TenantProfileId,
    string TenantName,
    Guid RoomId,
    string RoomNumber,
    decimal DepositAmount,
    decimal UnpaidInvoicesAmount,
    decimal DamageDeductionAmount,
    decimal OtherDeductionAmount,
    decimal RefundAmount,
    string? SettlementNotes,
    DateTime SettleDate
);
