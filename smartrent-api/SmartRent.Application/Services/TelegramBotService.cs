using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartRent.Core.Interfaces;

namespace SmartRent.Application.Services;

// Triển khai dịch vụ gửi thông báo tự động qua Telegram Bot tới Quản trị viên (SuperAdmin).
public class TelegramBotService(HttpClient httpClient, IConfiguration config, ILogger<TelegramBotService> logger) : ITelegramBotService
{
    private readonly string? _botToken = config["Telegram:BotToken"];
    private readonly string? _adminChatId = config["Telegram:AdminChatId"];
    private readonly bool _isEnabled = config.GetValue("Telegram:IsEnabled", true);

    public async Task<bool> SendAdminNotificationAsync(string title, string content, string? senderName = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var timeVn = DateTime.UtcNow.AddHours(7).ToString("dd/MM/yyyy HH:mm:ss");
            var sb = new StringBuilder();
            sb.AppendLine("🔔 <b>[SmartRent] THÔNG BÁO QUẢN TRỊ</b>");
            sb.AppendLine($"⏰ <i>Thời gian: {timeVn} (GMT+7)</i>");
            
            if (!string.IsNullOrWhiteSpace(senderName))
            {
                sb.AppendLine($"👤 <b>Người gửi:</b> {WebUtility.HtmlEncode(senderName)}");
            }
            
            sb.AppendLine($"📌 <b>Tiêu đề:</b> {WebUtility.HtmlEncode(title)}");
            sb.AppendLine();
            sb.AppendLine($"📝 <b>Nội dung:</b>\n{WebUtility.HtmlEncode(content)}");

            return await SendMessageToAdminAsync(sb.ToString(), cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[TelegramBotService] Không thể định dạng hoặc gửi thông báo Admin qua Telegram.");
            return false;
        }
    }

    public async Task<bool> SendMessageToAdminAsync(string messageHtml, CancellationToken cancellationToken = default)
    {
        if (!_isEnabled)
        {
            logger.LogDebug("[TelegramBotService] Telegram Bot đang bị vô hiệu hóa trong cấu hình (Telegram:IsEnabled = false).");
            return false;
        }

        if (string.IsNullOrWhiteSpace(_botToken) || string.IsNullOrWhiteSpace(_adminChatId))
        {
            logger.LogWarning("[TelegramBotService] Chưa cấu hình Telegram:BotToken hoặc Telegram:AdminChatId.");
            return false;
        }

        try
        {
            var url = $"https://api.telegram.org/bot{_botToken}/sendMessage";
            var payload = new
            {
                chat_id = _adminChatId,
                text = messageHtml,
                parse_mode = "HTML"
            };

            var json = JsonSerializer.Serialize(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await httpClient.PostAsync(url, content, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning("[TelegramBotService] Telegram API trả về lỗi {StatusCode}: {Error}", response.StatusCode, errorContent);
                return false;
            }

            logger.LogInformation("[TelegramBotService] Đã gửi thông báo thành công tới Admin ChatId: {ChatId}", _adminChatId);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[TelegramBotService] Lỗi kết nối khi gửi thông báo tới Telegram.");
            return false;
        }
    }
}

