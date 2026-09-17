namespace SmartRent.Core.Interfaces;

// Giao diện dịch vụ gửi thông báo qua Telegram Bot dành cho Quản trị viên (SuperAdmin).
public interface ITelegramBotService
{
    // Gửi thông báo có tiêu đề, nội dung và người gửi tới tài khoản Telegram của Quản trị viên
    Task<bool> SendAdminNotificationAsync(string title, string content, string? senderName = null, CancellationToken cancellationToken = default);

    // Gửi tin nhắn thô định dạng HTML tới tài khoản Telegram của Quản trị viên
    Task<bool> SendMessageToAdminAsync(string messageHtml, CancellationToken cancellationToken = default);

    // Gửi thông báo Khiếu nại / Góp ý mới tới Telegram của Quản trị viên
    Task<bool> SendComplaintAlertAsync(string senderName, string? senderRole, string? senderEmail, string title, string content, CancellationToken cancellationToken = default);

    // Gửi thông báo Phản hồi khiếu nại / góp ý tới Telegram của Quản trị viên
    Task<bool> SendReplyAlertAsync(string originalSenderName, string title, string replyContent, string? adminName = "Ban Quản Trị", CancellationToken cancellationToken = default);

    // Gửi thông báo Tranh chấp / Báo cáo sai sót hóa đơn tới Telegram của Quản trị viên
    Task<bool> SendInvoiceDisputeAlertAsync(string tenantName, string roomNumber, string invoiceCode, string reason, string description, CancellationToken cancellationToken = default);
}
