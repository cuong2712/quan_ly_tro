using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller quản lý Khiếu nại & Phản hồi gửi tới Ban Quản Trị Hệ Thống.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ComplaintsController(ComplaintService complaintService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Lấy danh sách toàn bộ khiếu nại (dành riêng cho Super Admin).
    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAll() => Ok(await complaintService.GetAllAsync());

    // Gửi một góp ý/khiếu nại mới tới Ban Quản Trị.
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNotificationRequest request)
        => Ok(await complaintService.CreateAsync(CurrentUserId, request.Title, request.Content));

    // Trả lời góp ý/khiếu nại của người dùng (dành cho Super Admin).
    [HttpPost("{id:guid}/reply")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Reply(Guid id, [FromBody] ReplyComplaintRequest request)
        => Ok(await complaintService.ReplyAsync(id, CurrentUserId, request.Reply));
}
