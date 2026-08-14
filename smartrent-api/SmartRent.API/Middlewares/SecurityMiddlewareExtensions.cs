namespace SmartRent.API.Middlewares;

// Các phương thức mở rộng giúp đăng ký và kích hoạt hệ thống Middleware & Exception Handler chuẩn .NET 9
public static class SecurityMiddlewareExtensions
{
    // Đăng ký các dịch vụ xử lý lỗi tập trung và bảo mật vào DI Container
    public static IServiceCollection AddSecurityServices(this IServiceCollection services)
    {
        services.AddMemoryCache();
        services.AddExceptionHandler<GlobalExceptionHandler>();
        services.AddProblemDetails();
        return services;
    }

    // Kích hoạt bộ xử lý ngoại lệ tập trung chuẩn IExceptionHandler của .NET 9
    public static IApplicationBuilder UseGlobalExceptionHandling(this IApplicationBuilder app)
    {
        return app.UseExceptionHandler(_ => { });
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

    // Kích hoạt toàn bộ các Middleware bảo mật & Exception Handler theo thứ tự chuẩn
    public static IApplicationBuilder UseAllSecurityMiddlewares(this IApplicationBuilder app)
    {
        app.UseGlobalExceptionHandling();
        app.UseSecurityHeaders();
        app.UseRateLimiting();
        return app;
    }
}


