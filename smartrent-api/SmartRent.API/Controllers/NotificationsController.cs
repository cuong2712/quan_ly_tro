using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller quản lý Thông báo hệ thống.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController(NotificationService notifService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    // Lấy danh sách thông báo phù hợp với vai trò của tài khoản hiện tại.
    [HttpGet]
    public async Task<IActionResult> GetNotifications()
        => Ok(await notifService.GetForUserAsync(CurrentUserId, CurrentRole));

    // Tạo mới một Thông báo (dành riêng cho Chủ trọ hoặc Super Admin).
    [HttpPost]
    [Authorize(Roles = "Landlord,SuperAdmin")]
    public async Task<IActionResult> Create([FromBody] CreateNotificationRequest request)
        => Ok(await notifService.CreateAsync(CurrentUserId, request));

    // Đánh dấu một thông báo là đã đọc.
    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        await notifService.MarkReadAsync(id, CurrentUserId);
        return Ok();
    }

    // Xóa một thông báo (chỉ người gửi hoặc SuperAdmin).
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Landlord,SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id)
        => await notifService.DeleteAsync(id, CurrentUserId, CurrentRole) ? NoContent() : NotFound(new { message = "Không tìm thấy thông báo hoặc bạn không có quyền xóa." });
}
