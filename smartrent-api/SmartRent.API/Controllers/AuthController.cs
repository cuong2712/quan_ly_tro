using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller xử lý Xác thực & Phân quyền (Đăng nhập, làm mới Token, Đăng xuất).
[ApiController]
[Route("api/[controller]")]
public class AuthController(AuthService authService) : ControllerBase
{
    // Đăng nhập hệ thống bằng Email và Mật khẩu.
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try { return Ok(await authService.LoginAsync(request)); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
    }

    // Làm mới AccessToken khi bị hết hạn bằng RefreshToken.
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
    {
        try { return Ok(await authService.RefreshTokenAsync(request.RefreshToken)); }
        catch { return Unauthorized(new { message = "Token không hợp lệ hoặc đã hết hạn" }); }
    }

    // Đăng xuất khỏi hệ thống.
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await authService.LogoutAsync(userId);
        return Ok(new { message = "Đăng xuất thành công" });
    }
}
