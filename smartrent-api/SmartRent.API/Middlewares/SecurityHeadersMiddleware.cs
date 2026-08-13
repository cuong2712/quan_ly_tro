using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace SmartRent.API.Middlewares
{
    // Middleware tự động bổ sung các HTTP Response Headers bảo mật cho ứng dụng
    public class SecurityHeadersMiddleware
    {
        private readonly RequestDelegate _next;

        public SecurityHeadersMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Đăng ký callback OnStarting để đính kèm các header bảo mật trước khi response được gửi đi
            context.Response.OnStarting(() =>
            {
                var headers = context.Response.Headers;

                // Ngăn chặn trình duyệt đoán sai loại định dạng file (MIME-sniffing)
                headers["X-Content-Type-Options"] = "nosniff";

                // Ngăn chặn website bị nhúng vào iframe của trang web khác (chống Clickjacking)
                headers["X-Frame-Options"] = "DENY";

                // Bật bộ lọc chống tấn công Cross-Site Scripting (XSS) trên trình duyệt
                headers["X-XSS-Protection"] = "1; mode=block";

                // Hạn chế việc gửi thông tin nguồn trang truy cập (Referrer) sang tên miền khác
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

                // Chính sách bảo mật nội dung: Chỉ cho phép tải tài nguyên hợp lệ và an toàn
                headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http: https:; frame-ancestors 'none'; object-src 'none';";

                // Tắt các tính năng phần cứng không cần thiết đối với API
                headers["Permissions-Policy"] = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";

                // Ép buộc trình duyệt chỉ kết nối qua HTTPS nếu request hiện tại sử dụng HTTPS
                if (context.Request.IsHttps)
                {
                    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
                }

                // Xóa bỏ header tiết lộ thông tin công nghệ máy chủ
                headers.Remove("X-Powered-By");

                return Task.CompletedTask;
            });

            // Chuyển tiếp request sang middleware tiếp theo trong pipeline
            await _next(context);
        }
    }
}
