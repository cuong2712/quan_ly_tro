namespace SmartRent.Core.Interfaces;

// Giao diện dịch vụ gửi thông báo qua Telegram Bot dành cho Quản trị viên (SuperAdmin).
public interface ITelegramBotService
{
    // Gửi thông báo có tiêu đề, nội dung và người gửi tới tài khoản Telegram của Quản trị viên
    Task<bool> SendAdminNotificationAsync(string title, string content, string? senderName = null, CancellationToken cancellationToken = default);

    // Gửi tin nhắn thô định dạng HTML tới tài khoản Telegram của Quản trị viên
    Task<bool> SendMessageToAdminAsync(string messageHtml, CancellationToken cancellationToken = default);
}

