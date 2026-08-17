using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller quản lý Hồ sơ cá nhân và Mật khẩu tài khoản.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController(ProfileService profileService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Lấy thông tin tài khoản cá nhân hiện tại.
    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var profile = await profileService.GetProfileAsync(CurrentUserId);
        return profile is null ? NotFound() : Ok(profile);
    }

    // Cập nhật thông tin cá nhân (họ tên, SĐT, ảnh đại diện).
    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        try { return Ok(await profileService.UpdateProfileAsync(CurrentUserId, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // Thực hiện đổi mật khẩu tài khoản.
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        try { await profileService.ChangePasswordAsync(CurrentUserId, request); return Ok(new { message = "Đổi mật khẩu thành công" }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Cập nhật thông tin phương tiện/xe cộ của khách thuê.
    [HttpPut("vehicle")]
    [Authorize(Roles = "Tenant")]
    public async Task<IActionResult> UpdateVehicle([FromBody] UpdateVehicleRequest request)
    {
        try { return Ok(await profileService.UpdateVehicleInfoAsync(CurrentUserId, request)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }
}
