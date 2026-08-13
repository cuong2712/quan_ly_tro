using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace SmartRent.API.Middlewares
{
    // Lớp chứa các extension methods giúp đăng ký và kích hoạt middleware bảo mật một cách gọn gàng
    public static class SecurityMiddlewareExtensions
    {
        // Đăng ký dịch vụ bộ nhớ đệm MemoryCache cho Rate Limiting
        public static IServiceCollection AddSecurityServices(this IServiceCollection services)
        {
            services.AddMemoryCache();
            return services;
        }

        // Thêm GlobalExceptionMiddleware vào pipeline
        public static IApplicationBuilder UseGlobalExceptionHandling(this IApplicationBuilder app)
        {
            return app.UseMiddleware<GlobalExceptionMiddleware>();
        }

        // Thêm SecurityHeadersMiddleware vào pipeline
        public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
        {
            return app.UseMiddleware<SecurityHeadersMiddleware>();
        }

        // Thêm RateLimitingMiddleware vào pipeline
        public static IApplicationBuilder UseRateLimiting(this IApplicationBuilder app)
        {
            return app.UseMiddleware<RateLimitingMiddleware>();
        }

        // Thêm toàn bộ các middleware bảo mật vào HTTP Request Pipeline theo đúng thứ tự ưu tiên
        public static IApplicationBuilder UseAllSecurityMiddlewares(this IApplicationBuilder app)
        {
            app.UseGlobalExceptionHandling();
            app.UseSecurityHeaders();
            app.UseRateLimiting();
            return app;
        }
    }
}
