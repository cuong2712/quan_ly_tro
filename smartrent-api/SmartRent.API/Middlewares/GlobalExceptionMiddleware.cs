using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace SmartRent.API.Middlewares
{
    // Middleware xử lý lỗi tập trung trên toàn hệ thống và bảo mật dữ liệu ngoại lệ
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                // Cho phép các middleware tiếp theo thực thi
                await _next(context);
            }
            catch (Exception ex)
            {
                // Ghi log ngoại lệ chi tiết ở phía server để phục vụ tra cứu lỗi
                _logger.LogError(ex, "Ngoại lệ chưa xử lý xuất hiện: {Message}", ex.Message);
                
                // Trả về response lỗi đã được chuẩn hóa và ẩn chi tiết mã nguồn
                await HandleExceptionAsync(context, ex);
            }
        }

        // Hàm định dạng phản hồi lỗi chuẩn cho phía client
        private Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

            // Phân loại mã lỗi HTTP dựa trên kiểu ngoại lệ
            var statusCode = exception switch
            {
                UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized,
                ArgumentException or InvalidOperationException => (int)HttpStatusCode.BadRequest,
                KeyNotFoundException => (int)HttpStatusCode.NotFound,
                _ => (int)HttpStatusCode.InternalServerError
            };

            context.Response.StatusCode = statusCode;

            // Mã vết request phục vụ tra cứu trong hệ thống log
            var traceId = context.TraceIdentifier;

            // Tạo đối tượng phản hồi lỗi an toàn (không để lộ chi tiết mã nguồn hoặc DB trong Production)
            var response = new
            {
                status = statusCode,
                message = statusCode == (int)HttpStatusCode.InternalServerError && !_env.IsDevelopment()
                    ? "Đã xảy ra lỗi hệ thống. Vui lòng liên hệ quản trị viên."
                    : exception.Message,
                traceId,
                timestamp = DateTime.UtcNow
            };

            var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            return context.Response.WriteAsync(JsonSerializer.Serialize(response, jsonOptions));
        }
    }
}
