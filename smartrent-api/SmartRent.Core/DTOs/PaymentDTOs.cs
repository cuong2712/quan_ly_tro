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

// DTO tiếp nhận dữ liệu Webhook biến động số dư từ SePay / Casso / Ngân hàng
public class SepayWebhookDto
{
    public long? Id { get; set; }
    public string? Gateway { get; set; } = "BIDV";
    public string? TransactionDate { get; set; }
    public string? AccountNumber { get; set; } = "0397181879";
    public string? SubAccount { get; set; }
    public string? TransferType { get; set; } = "in"; // "in" là tiền vào, "out" là tiền ra
    public decimal TransferAmount { get; set; }
    public decimal? Accumulated { get; set; }
    public string? Code { get; set; }
    public string? Content { get; set; }
    public string? ReferenceCode { get; set; }
    public string? Description { get; set; }
}

public record AutoReconcileResultDto(
    bool Success,
    string Message,
    Guid? InvoiceId = null,
    string? InvoiceCode = null,
    string? RoomNumber = null,
    decimal? Amount = null,
    string? BankAccount = null,
    string? Type = null,
    Guid? RoomId = null,
    string? LandlordName = null
);

public record SimulateDepositRequestDto(
    Guid RoomId,
    decimal Amount = 500000,
    string? TenantPhone = null,
    string? TenantName = null,
    string? Note = null
);

