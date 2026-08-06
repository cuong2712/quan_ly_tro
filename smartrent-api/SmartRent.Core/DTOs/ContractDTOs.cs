using SmartRent.Core.Enums;
namespace SmartRent.Core.DTOs;

public record ContractDto(
    Guid Id, string ContractCode, Guid RoomId, string RoomNumber,
    Guid TenantProfileId, string TenantName, string TenantPhone,
    DateTime StartDate, DateTime EndDate,
    decimal RentAmount, decimal Deposit, string Status,
    int PaymentTermDay, string? Terms, string? FileUrl,
    DateTime CreatedAt
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

public record RenewContractRequest(int ExtendMonths, decimal? NewRentAmount);
