namespace SmartRent.Core.DTOs;

public record PaymentDto(
    Guid Id, Guid InvoiceId, string InvoiceCode,
    decimal Amount, string Method, string Status,
    string? ProofImageUrl, string? Note,
    DateTime CreatedAt, DateTime? ConfirmedAt,
    string? RoomNumber = null,
    Guid? ZoneId = null,
    string? ZoneName = null,
    string? TenantName = null,
    string? Month = null
);

public record SubmitPaymentRequest(
    Guid InvoiceId, decimal Amount, string Method,
    string? ProofImageUrl, string? Note
);

public record ConfirmPaymentRequest(bool Approve, string? Note);
