namespace SmartRent.Core.DTOs;

public record InvoiceDto(
    Guid Id, string InvoiceCode, Guid RoomId, string RoomNumber,
    Guid TenantProfileId, string TenantName, string Month,
    decimal RentFee, decimal ElecFee, decimal WaterFee, decimal ServiceFee,
    decimal TotalAmount, string Status, DateTime DueDate,
    DateTime? PaidDate, DateTime CreatedAt,
    List<InvoiceItemDto> Items
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
    string? ImageUrl = null
);
