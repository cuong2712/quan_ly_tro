namespace SmartRent.Core.DTOs;

public record InvoiceDto(
    Guid Id, string InvoiceCode, Guid RoomId, string RoomNumber,
    Guid TenantProfileId, string TenantName, string Month,
    decimal RentFee, decimal ElecFee, decimal WaterFee, decimal ServiceFee,
    decimal TotalAmount, string Status, DateTime DueDate,
    DateTime? PaidDate, DateTime CreatedAt,
    List<InvoiceItemDto> Items,
    bool IsReported = false,
    string? DisputeReason = null,
    string? DisputeDescription = null,
    string? DisputeImageUrl = null,
    string? DisputeStatus = null,
    DateTime? DisputeCreatedAt = null,
    DateTime? DisputeResolvedAt = null,
    string? DisputeReply = null,
    decimal? SuggestedElecNumber = null,
    decimal? SuggestedWaterNumber = null,
    string? LandlordBankName = null,
    string? LandlordBankAccountNumber = null,
    string? LandlordBankAccountName = null
);

public record InvoiceItemDto(Guid Id, string Name, decimal Amount);

public record CreateInvoiceRequest(
    Guid RoomId, string Month, decimal RentFee,
    decimal ElecFee, decimal WaterFee, decimal ServiceFee, DateTime DueDate
);

public record UpdateInvoiceRequest(
    decimal RentFee, decimal ElecFee, decimal WaterFee,
    decimal ServiceFee, DateTime DueDate, string Status
);

public record ReportInvoiceRequest(
    string Reason, 
    string Description, 
    string? ImageUrl = null,
    decimal? SuggestedElecNumber = null,
    decimal? SuggestedWaterNumber = null
);

public record ResolveInvoiceDisputeRequest(
    string Action, // "Accept" or "Reject"
    string? Reply = null,
    decimal? RentFee = null,
    decimal? ElecFee = null,
    decimal? WaterFee = null,
    decimal? ServiceFee = null,
    DateTime? DueDate = null
);

