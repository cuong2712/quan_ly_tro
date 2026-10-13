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
    DateTime? RenewRequestedAt = null,
    string? CustomContent = null,
    // Co-Tenant fields
    string ContractType = "Master",
    Guid? ParentContractId = null,
    string? ParentContractCode = null,
    decimal IndividualDeposit = 0,
    decimal SharedRentAmount = 0,
    bool IsSignedByTenant = false,
    DateTime? SignedAt = null,
    string? SignatureNote = null
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
    public string? CustomContent { get; set; }
    public decimal? InitialElecMeter { get; set; }
    public decimal? InitialWaterMeter { get; set; }
}

public record UpdateContractRequest(
    DateTime StartDate, DateTime EndDate,
    decimal RentAmount, int PaymentTermDay, string? Terms,
    Guid? RoomId = null,
    string? CustomContent = null
);

public record ContractTemplateDto(
    string Content,
    bool IsCustom,
    List<TemplateVariableHelpDto> AvailableVariables,
    DateTime? UpdatedAt = null
);

public record TemplateVariableHelpDto(string Tag, string Description, string Example);

public record SaveContractTemplateRequest(string Content);

public record PreviewContractTemplateRequest(
    string? TemplateContent = null,
    Guid? RoomId = null,
    Guid? TenantProfileId = null
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

// Yêu cầu tạo Hợp đồng Ở Ghép (CoTenant) khi thêm thành viên ở ghép vào phòng
public class CreateCoTenantContractRequest
{
    public Guid TenantProfileId { get; set; }
    public Guid RoomId { get; set; }
    public Guid ParentContractId { get; set; }       // ID Hợp đồng Master của phòng
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }            // Null = kế thừa ngày kết thúc từ HĐ Master
    public decimal IndividualDeposit { get; set; } = 0;   // Tiền cọc riêng (nếu có)
    public decimal SharedRentAmount { get; set; } = 0;    // Phần đóng góp tiền phòng (nếu chia)
    public string? Terms { get; set; }                // Nội quy, cam kết bổ sung
    public string? CustomContent { get; set; }        // Nội dung HĐ tuỳ biến
}

// Yêu cầu khách thuê ký xác nhận hợp đồng online
public record SignContractRequest(string? Note = null);
