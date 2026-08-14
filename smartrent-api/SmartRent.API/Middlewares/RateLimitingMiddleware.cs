using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace SmartRent.API.Middlewares
{
    // Middleware giới hạn tần suất gửi request theo IP (chống tấn công DoS và Brute-force)
    public class RateLimitingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IMemoryCache _cache;
        private readonly ILogger<RateLimitingMiddleware> _logger;

        // Cửa sổ thời gian theo dõi lượt gọi API (1 phút)
        private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

        public RateLimitingMiddleware(RequestDelegate next, IMemoryCache cache, ILogger<RateLimitingMiddleware> logger)
        {
            _next = next;
            _cache = cache;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Lấy địa chỉ IP của client truy cập
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
            var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";

            // Áp dụng giới hạn 200 request/phút cho endpoint xác thực và 300 request/phút cho endpoint thường
            bool isAuthEndpoint = path.Contains("/auth") || path.Contains("/change-password");
            int maxRequests = isAuthEndpoint ? 200 : 300;



            // Khóa lưu trong bộ nhớ đệm phân biệt theo IP và loại endpoint
            var cacheKey = $"rate_limit_{ip}_{(isAuthEndpoint ? "auth" : "gen")}";

            // Lấy số lượng request hiện tại của IP trong khung thời gian 1 phút
            int requestCount = _cache.GetOrCreate(cacheKey, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = Window;
                return 0;
            });

            requestCount++;
            _cache.Set(cacheKey, requestCount, Window);

            // Kiểm tra nếu vượt quá hạn ngạch cho phép
            if (requestCount > maxRequests)
            {
                _logger.LogWarning("Vượt quá giới hạn request cho IP: {IP} tại đường dẫn: {Path}. Số lượt: {Count}", ip, path, requestCount);

                context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
                context.Response.ContentType = "application/json";
                context.Response.Headers["Retry-After"] = "60";

                var errorResponse = new
                {
                    status = 429,
                    message = "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.",
                    retryAfterSeconds = 60,
                    timestamp = DateTime.UtcNow
                };

                var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
                await context.Response.WriteAsync(JsonSerializer.Serialize(errorResponse, jsonOptions));
                return;
            }

            // Chuyển tiếp request sang middleware tiếp theo nếu trong hạn ngạch
            await _next(context);
        }
    }
}
