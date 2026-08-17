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
    private Guid CurrentUserId => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

    // Lấy thông tin tài khoản cá nhân hiện tại (kèm thông tin xe & CCCD của khách thuê).
    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var profile = await profileService.GetProfileAsync(CurrentUserId);
        return profile is null ? NotFound(new { message = "Không tìm thấy hồ sơ người dùng" }) : Ok(profile);
    }

    // Cập nhật thông tin cá nhân (họ tên, SĐT, ảnh đại diện).
    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        try { return Ok(await profileService.UpdateProfileAsync(CurrentUserId, request)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    // Thực hiện đổi mật khẩu tài khoản.
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        try { await profileService.ChangePasswordAsync(CurrentUserId, request); return Ok(new { message = "Đổi mật khẩu thành công" }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Khách thuê lấy riêng thông tin xe cộ
    [HttpGet("vehicle")]
    [Authorize(Roles = "Tenant")]
    public async Task<IActionResult> GetVehicle()
    {
        try { return Ok(await profileService.GetVehicleInfoAsync(CurrentUserId)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Khách thuê tự cập nhật số lượng xe & thông tin biển số xe gửi tại nhà trọ.
    [HttpPut("vehicle")]
    [Authorize(Roles = "Tenant")]
    public async Task<IActionResult> UpdateVehicle([FromBody] UpdateVehicleRequest request)
    {
        try { return Ok(await profileService.UpdateVehicleInfoAsync(CurrentUserId, request)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }
}
