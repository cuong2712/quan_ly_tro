using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using SmartRent.Core.Interfaces;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller dành riêng cho Super Admin: Xem thống kê toàn hệ thống, quản lý tài khoản Chủ trọ, duyệt góp ý.
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin")]
public class AdminController(AdminService adminService, ITelegramBotService telegramBotService) : ControllerBase
{
    // Lấy tổng quan các chỉ số thống kê của hệ thống.
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats() => Ok(await adminService.GetSystemStatsAsync());

    // Lấy danh sách tài khoản Chủ trọ (có lọc tìm kiếm và trạng thái).
    [HttpGet("landlords")]
    public async Task<IActionResult> GetLandlords([FromQuery] string? search, [FromQuery] bool? isActive)
        => Ok(await adminService.GetLandlordsAsync(search, isActive));

    // Tạo mới tài khoản Chủ trọ.
    [HttpPost("landlords")]
    public async Task<IActionResult> CreateLandlord([FromBody] CreateLandlordRequest request)
    {
        try { return CreatedAtAction(nameof(GetLandlords), await adminService.CreateLandlordAsync(request)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Cập nhật thông tin tài khoản Chủ trọ.
    [HttpPut("landlords/{id:guid}")]
    public async Task<IActionResult> UpdateLandlord(Guid id, [FromBody] UpdateLandlordRequest request)
    {
        try { return Ok(await adminService.UpdateLandlordAsync(id, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // Khóa hoặc mở khóa tài khoản Chủ trọ.
    [HttpPatch("landlords/{id:guid}/toggle-lock")]
    public async Task<IActionResult> ToggleLock(Guid id)
    {
        await adminService.ToggleLockAsync(id);
        return Ok(new { message = "Cập nhật trạng thái thành công" });
    }

    // Đặt lại mật khẩu tài khoản Chủ trọ về mặc định.
    [HttpPatch("landlords/{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id)
    {
        await adminService.ResetPasswordAsync(id);
        return Ok(new { message = "Đặt lại mật khẩu thành công: SmartRent@2026" });
    }

    // Lấy danh sách góp ý/khiếu nại gửi tới Admin.
    [HttpGet("complaints")]
    public async Task<IActionResult> GetComplaints() => Ok(await adminService.GetComplaintsAsync());

    // Phản hồi góp ý/khiếu nại của người dùng.
    [HttpPost("complaints/{id:guid}/reply")]
    public async Task<IActionResult> ReplyComplaint(Guid id, [FromBody] ReplyComplaintRequest request)
    {
        try { return Ok(await adminService.ReplyComplaintAsync(id, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // Cập nhật trạng thái của góp ý/khiếu nại.
    [HttpPatch("complaints/{id:guid}/status")]
    public async Task<IActionResult> UpdateComplaintStatus(Guid id, [FromQuery] string status)
    {
        await adminService.UpdateComplaintStatusAsync(id, status);
        return Ok();
    }

    // ==========================================
    // QUẢN TRỊ KHÁCH THUÊ (TENANT MANAGEMENT)
    // ==========================================

    // Lấy danh sách toàn bộ khách thuê trong hệ thống
    [HttpGet("tenants")]
    public async Task<IActionResult> GetTenants(
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] Guid? landlordId,
        [FromQuery] string? rentStatus,
        [FromQuery] int? page,
        [FromQuery] int? pageSize)
        => Ok(await adminService.GetTenantsAsync(search, isActive, landlordId, rentStatus, page, pageSize));

    // Lấy chi tiết hồ sơ khách thuê kèm toàn bộ lịch sử
    [HttpGet("tenants/{id:guid}")]
    public async Task<IActionResult> GetTenantDetail(Guid id)
    {
        try { return Ok(await adminService.GetTenantDetailAsync(id)); }
        catch (KeyNotFoundException) { return NotFound(new { message = "Không tìm thấy hồ sơ khách thuê" }); }
    }

    // Khóa hoặc mở khóa tài khoản Khách thuê
    [HttpPatch("tenants/{id:guid}/toggle-lock")]
    public async Task<IActionResult> ToggleLockTenant(Guid id)
    {
        try
        {
            await adminService.ToggleLockTenantAsync(id);
            return Ok(new { message = "Cập nhật trạng thái tài khoản khách thuê thành công" });
        }
        catch (KeyNotFoundException) { return NotFound(new { message = "Không tìm thấy hồ sơ khách thuê" }); }
    }

    // Đặt lại mật khẩu tài khoản Khách thuê
    [HttpPatch("tenants/{id:guid}/reset-password")]
    public async Task<IActionResult> ResetTenantPassword(Guid id, [FromBody] ResetPasswordRequest? request = null)
    {
        try
        {
            var newPass = !string.IsNullOrWhiteSpace(request?.NewPassword) ? request.NewPassword : "Tenant@2026";
            await adminService.ResetTenantPasswordAsync(id, newPass);
            return Ok(new { message = $"Đặt lại mật khẩu thành công: {newPass}" });
        }
        catch (KeyNotFoundException) { return NotFound(new { message = "Không tìm thấy hồ sơ khách thuê" }); }
    }

    // ==========================================
    // TELEGRAM BOT TEST (ADMIN ONLY)
    // ==========================================

    // Gửi thử nghiệm một thông báo qua Telegram Bot để kiểm tra kết nối
    [HttpPost("telegram/test")]
    public async Task<IActionResult> TestTelegramNotification([FromBody] TestTelegramRequest? request = null)
    {
        var title = !string.IsNullOrWhiteSpace(request?.Title) ? request.Title : "Kiểm tra kết nối Telegram Bot";
        var content = !string.IsNullOrWhiteSpace(request?.Content) ? request.Content : "Hệ thống SmartRent đang hoạt động ổn định. Telegram Bot đã kết nối thành công!";
        
        var success = await telegramBotService.SendAdminNotificationAsync(title, content, "SuperAdmin");
        if (success)
        {
            return Ok(new { message = "Đã gửi thông báo thử nghiệm tới Telegram của Admin thành công!" });
        }
        return BadRequest(new { message = "Không thể gửi tin nhắn tới Telegram. Vui lòng kiểm tra lại cấu hình BotToken và AdminChatId." });
    }

    // Gửi thử nghiệm thông báo Khiếu nại qua Telegram Bot
    [HttpPost("telegram/test-complaint")]
    public async Task<IActionResult> TestComplaintTelegram([FromBody] TestTelegramRequest? request = null)
    {
        var title = !string.IsNullOrWhiteSpace(request?.Title) ? request.Title : "Hỏng điều hòa phòng 302 cần sửa gấp";
        var content = !string.IsNullOrWhiteSpace(request?.Content) ? request.Content : "Điều hòa phòng 302 không mát và chảy nước xuống sàn nhà từ tối qua.";
        
        var success = await telegramBotService.SendComplaintAlertAsync("Lê Thị Mai", "Tenant", "lethimai@gmail.com", title, content);
        if (success)
        {
            return Ok(new { message = "Đã gửi thông báo khiếu nại thử nghiệm tới Telegram thành công!" });
        }
        return BadRequest(new { message = "Không thể gửi tin nhắn tới Telegram. Vui lòng kiểm tra lại cấu hình BotToken và AdminChatId." });
    }

    // Gửi thử nghiệm thông báo Phản hồi khiếu nại qua Telegram Bot
    [HttpPost("telegram/test-reply")]
    public async Task<IActionResult> TestReplyTelegram([FromBody] TestTelegramRequest? request = null)
    {
        var title = !string.IsNullOrWhiteSpace(request?.Title) ? request.Title : "Hỏng điều hòa phòng 302 cần sửa gấp";
        var content = !string.IsNullOrWhiteSpace(request?.Content) ? request.Content : "Ban quản trị đã tiếp nhận và cử thợ điện lạnh qua kiểm tra sửa chữa vào lúc 14:00 chiều nay.";
        
        var success = await telegramBotService.SendReplyAlertAsync("Lê Thị Mai", title, content, "SuperAdmin");
        if (success)
        {
            return Ok(new { message = "Đã gửi thông báo phản hồi khiếu nại thử nghiệm tới Telegram thành công!" });
        }
        return BadRequest(new { message = "Không thể gửi tin nhắn tới Telegram. Vui lòng kiểm tra lại cấu hình BotToken và AdminChatId." });
    }
}

