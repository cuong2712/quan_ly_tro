using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartRent.Core.DTOs;
using System.Security.Authentication;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace SmartRent.API.Middlewares;

// Bộ xử lý ngoại lệ tập trung toàn ứng dụng (Centralized Global Exception Handler) chuẩn .NET 9
// Bắt mọi Unhandled Exception, log chi tiết lỗi tại server, map Exception sang mã lỗi thực tế
// và ÉP CỨNG HTTP Status Code trả về cho Client luôn luôn là 200 OK theo Envelope Response Pattern
public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IHostEnvironment env) : IExceptionHandler
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        WriteIndented = false
    };

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        // 1. Phân loại mã lỗi nghiệp vụ (Code) tương ứng theo Exception Type
        var (code, defaultMessage) = exception switch
        {
            UnauthorizedAccessException or AuthenticationException => 
                (StatusCodes.Status401Unauthorized, "Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn."),
            
            KeyNotFoundException => 
                (StatusCodes.Status404NotFound, "Không tìm thấy dữ liệu yêu cầu."),
            
            ArgumentNullException or ArgumentException or InvalidOperationException or BadHttpRequestException => 
                (StatusCodes.Status400BadRequest, "Dữ liệu yêu cầu không hợp lệ."),
            
            NotImplementedException => 
                (StatusCodes.Status501NotImplemented, "Chức năng đang được phát triển."),
            
            TimeoutException or TaskCanceledException when !cancellationToken.IsCancellationRequested => 
                (StatusCodes.Status504GatewayTimeout, "Yêu cầu xử lý quá thời gian quy định. Vui lòng thử lại sau."),
            
            _ => 
                (StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.")
        };

        // 2. Ghi log ngoại lệ phía server (bao gồm TraceId, Route, Method, và StackTrace đầy đủ)
        var traceId = httpContext.TraceIdentifier;
        var requestPath = httpContext.Request.Path;
        var requestMethod = httpContext.Request.Method;

        if (code >= 500)
        {
            logger.LogError(exception, "[ERROR 500] [{TraceId}] {Method} {Path} - Ngoại lệ hệ thống chưa xử lý: {Message}", 
                traceId, requestMethod, requestPath, exception.Message);
        }
        else
        {
            logger.LogWarning("[WARN {Code}] [{TraceId}] {Method} {Path} - Lỗi nghiệp vụ: {Message}", 
                code, traceId, requestMethod, requestPath, exception.Message);
        }

        // 3. Chuẩn bị thông điệp hiển thị cho người dùng (Ẩn chi tiết nhạy cảm trong Production nếu lỗi 500)
        string clientMessage = !string.IsNullOrWhiteSpace(exception.Message) && (code < 500 || env.IsDevelopment())
            ? exception.Message
            : defaultMessage;

        // 4. ÉP CỨNG HTTP Response Status Code gửi về cho Frontend / Trình duyệt LUÔN LUÔN LÀ 200 OK
        httpContext.Response.StatusCode = StatusCodes.Status200OK;
        httpContext.Response.ContentType = "application/json; charset=utf-8";

        // 5. Đóng gói vào Envelope ApiResponse chuẩn
        var envelopeResponse = ApiResponse.Fail(clientMessage, code);

        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(envelopeResponse, JsonOptions), cancellationToken);

        // Trả về true để báo hiệu Exception đã được xử lý hoàn tất
        return true;
    }
}

