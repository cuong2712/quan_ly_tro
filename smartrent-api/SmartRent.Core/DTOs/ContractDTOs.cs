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

public class CreateContractRequest
{
    public string ContractCode { get; set; } = string.Empty;
    public Guid RoomId { get; set; }
    public Guid TenantProfileId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal RentAmount { get; set; }
    public decimal Deposit { get; set; }
    public int PaymentTermDay { get; set; } = 5;
    public string? Terms { get; set; }
    public decimal? InitialElecMeter { get; set; }
    public decimal? InitialWaterMeter { get; set; }
}

public record UpdateContractRequest(
    DateTime StartDate, DateTime EndDate,
    decimal RentAmount, int PaymentTermDay, string? Terms,
    Guid? RoomId = null
);

public record RequestRenewContractRequest(int ExtendMonths = 12, string? Notes = null);

public record RejectRenewContractRequest(string? Reason = null);

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

// Yêu cầu chuyển giao quyền đại diện hợp đồng sang thành viên ở ghép khác trong phòng
// RemoveOldTenantFromRoom = true  -> gỡ người cũ ra khỏi phòng hoàn toàn
// RemoveOldTenantFromRoom = false -> người cũ ở lại làm thành viên ở ghép (Occupant)
public record TransferRepresentativeRequest(
    Guid NewTenantProfileId,
    bool RemoveOldTenantFromRoom = true,
    string? Note = null
);
