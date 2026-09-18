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

    // Gửi thông báo Khiếu nại / Góp ý mới tới Telegram của Quản trị viên
    public async Task<bool> SendComplaintAlertAsync(string senderName, string? senderRole, string? senderEmail, string title, string content, CancellationToken cancellationToken = default)
    {
        try
        {
            var timeVn = DateTime.UtcNow.AddHours(7).ToString("dd/MM/yyyy HH:mm:ss");
            var sb = new StringBuilder();
            sb.AppendLine("🚨 <b>[SmartRent] CÓ KHIẾU NẠI / GÓP Ý MỚI</b>");
            sb.AppendLine($"⏰ <i>Thời gian: {timeVn} (GMT+7)</i>");
            sb.AppendLine($"👤 <b>Người gửi:</b> {WebUtility.HtmlEncode(senderName)}");
            
            if (!string.IsNullOrWhiteSpace(senderRole))
            {
                var roleLabel = senderRole.ToLower() switch
                {
                    "tenant" => "Khách thuê",
                    "landlord" => "Chủ trọ",
                    _ => senderRole
                };
                sb.AppendLine($"🏷️ <b>Vai trò:</b> {WebUtility.HtmlEncode(roleLabel)}");
            }

            if (!string.IsNullOrWhiteSpace(senderEmail))
            {
                sb.AppendLine($"📧 <b>Email:</b> {WebUtility.HtmlEncode(senderEmail)}");
            }

            sb.AppendLine($"📌 <b>Tiêu đề:</b> {WebUtility.HtmlEncode(title)}");
            sb.AppendLine();
            sb.AppendLine($"📝 <b>Nội dung khiếu nại:</b>\n{WebUtility.HtmlEncode(content)}");
            sb.AppendLine();
            sb.AppendLine("👉 <i>Quản trị viên vui lòng truy cập trang Quản trị SmartRent để xem và xử lý.</i>");

            return await SendMessageToAdminAsync(sb.ToString(), cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[TelegramBotService] Không thể định dạng hoặc gửi cảnh báo khiếu nại qua Telegram.");
            return false;
        }
    }

    // Gửi thông báo Phản hồi khiếu nại / góp ý tới Telegram của Quản trị viên
    public async Task<bool> SendReplyAlertAsync(string originalSenderName, string title, string replyContent, string? adminName = "Ban Quản Trị", CancellationToken cancellationToken = default)
    {
        try
        {
            var timeVn = DateTime.UtcNow.AddHours(7).ToString("dd/MM/yyyy HH:mm:ss");
            var sb = new StringBuilder();
            sb.AppendLine("💬 <b>[SmartRent] PHẢN HỒI KHIẾU NẠI THÀNH CÔNG</b>");
            sb.AppendLine($"⏰ <i>Thời gian: {timeVn} (GMT+7)</i>");
            sb.AppendLine($"👮 <b>Người phản hồi:</b> {WebUtility.HtmlEncode(adminName ?? "Ban Quản Trị")}");
            sb.AppendLine($"👤 <b>Người nhận:</b> {WebUtility.HtmlEncode(originalSenderName)}");
            sb.AppendLine($"📌 <b>Khiếu nại:</b> {WebUtility.HtmlEncode(title)}");
            sb.AppendLine();
            sb.AppendLine($"📝 <b>Nội dung phản hồi:</b>\n{WebUtility.HtmlEncode(replyContent)}");
            sb.AppendLine();
            sb.AppendLine("✅ <i>Trạng thái: Đã giải quyết (Resolved)</i>");

            return await SendMessageToAdminAsync(sb.ToString(), cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[TelegramBotService] Không thể định dạng hoặc gửi thông báo phản hồi khiếu nại qua Telegram.");
            return false;
        }
    }

    // Gửi thông báo Tranh chấp / Báo cáo sai sót hóa đơn tới Telegram của Quản trị viên
    public async Task<bool> SendInvoiceDisputeAlertAsync(string tenantName, string roomNumber, string invoiceCode, string reason, string description, string? landlordName = null, string? zoneName = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var timeVn = DateTime.UtcNow.AddHours(7).ToString("dd/MM/yyyy HH:mm:ss");
            var sb = new StringBuilder();
            sb.AppendLine("⚠️ <b>[SmartRent] BÁO CÁO SAI SÓT HÓA ĐƠN</b>");
            sb.AppendLine($"⏰ <i>Thời gian: {timeVn} (GMT+7)</i>");
            
            var location = !string.IsNullOrWhiteSpace(zoneName) 
                ? $"Phòng {WebUtility.HtmlEncode(roomNumber)} ({WebUtility.HtmlEncode(zoneName)})"
                : $"Phòng {WebUtility.HtmlEncode(roomNumber)}";
            sb.AppendLine($"🏠 <b>Vị trí:</b> {location}");
            sb.AppendLine($"👤 <b>Khách thuê:</b> {WebUtility.HtmlEncode(tenantName)}");

            if (!string.IsNullOrWhiteSpace(landlordName))
            {
                sb.AppendLine($"🏢 <b>Chủ trọ quản lý:</b> {WebUtility.HtmlEncode(landlordName)}");
            }

            sb.AppendLine($"🧾 <b>Mã Hóa đơn:</b> {WebUtility.HtmlEncode(invoiceCode)}");
            sb.AppendLine($"📌 <b>Lý do báo cáo:</b> {WebUtility.HtmlEncode(reason)}");
            sb.AppendLine();
            sb.AppendLine($"📝 <b>Mô tả chi tiết:</b>\n{WebUtility.HtmlEncode(description)}");
            sb.AppendLine();
            sb.AppendLine("👉 <i>Chủ trọ và Quản trị viên vui lòng kiểm tra đối soát số liệu.</i>");

            return await SendMessageToAdminAsync(sb.ToString(), cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[TelegramBotService] Không thể định dạng hoặc gửi báo cáo tranh chấp hóa đơn qua Telegram.");
            return false;
        }
    }
}

