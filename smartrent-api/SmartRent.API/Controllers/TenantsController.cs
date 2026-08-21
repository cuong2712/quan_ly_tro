using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller quản lý Hồ sơ Khách thuê (lấy danh sách, thêm khách thuê mới, sửa thông tin, đổi phòng, xóa khách thuê).
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Landlord")]
public class TenantsController(TenantService tenantService) : ControllerBase
{
    private Guid LandlordId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Lấy danh sách tất cả người thuê trọ thuộc quyền quản lý của Chủ trọ (hỗ trợ phân trang).
    [HttpGet]
    public async Task<IActionResult> GetTenants([FromQuery] int? page, [FromQuery] int? pageSize)
        => Ok(await tenantService.GetByLandlordAsync(LandlordId, page, pageSize));

    // Lấy chi tiết hồ sơ người thuê theo ID (đảm bảo thuộc quyền quản lý của chủ trọ).
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetTenant(Guid id)
    {
        var t = await tenantService.GetByIdAsync(id, LandlordId);
        return t is null ? NotFound(new { message = "Không tìm thấy khách thuê" }) : Ok(t);
    }

    // Thêm một người thuê mới vào phòng trọ (tự động tạo tài khoản đăng nhập).
    [HttpPost]
    public async Task<IActionResult> CreateTenant([FromBody] CreateTenantRequest request)
    {
        try 
        { 
            var created = await tenantService.CreateAsync(LandlordId, request);
            return CreatedAtAction(nameof(GetTenant), new { id = created.Id }, created); 
        }
        catch (Exception ex) 
        { 
            return BadRequest(new { message = ex.Message }); 
        }
    }

    // Cập nhật thông tin người thuê (họ tên, SĐT, quê quán, ảnh CCCD, chuyển phòng mới).
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateTenant(Guid id, [FromBody] UpdateTenantRequest request)
    {
        try { return Ok(await tenantService.UpdateAsync(id, LandlordId, request)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Xóa người thuê khỏi phòng trọ (tự động cập nhật lại trạng thái phòng và dữ liệu liên quan).
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTenant(Guid id)
        => await tenantService.DeleteAsync(id, LandlordId) ? NoContent() : NotFound(new { message = "Không tìm thấy khách thuê hoặc không có quyền xóa." });

    // Đặt lại mật khẩu cho tài khoản người thuê (Mặc định: Tenant@123456 hoặc mật khẩu mới do chủ trọ nhập)
    [HttpPatch("{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetTenantPasswordRequest? request)
    {
        var success = await tenantService.ResetPasswordAsync(id, LandlordId, request?.NewPassword);
        var passwordUsed = string.IsNullOrWhiteSpace(request?.NewPassword) ? "Tenant@123456" : request.NewPassword;
        return success 
            ? Ok(new { message = $"Đặt lại mật khẩu thành công. Mật khẩu mới là: {passwordUsed}", newPassword = passwordUsed }) 
            : NotFound(new { message = "Không tìm thấy khách thuê hoặc không có quyền thao tác." });
    }
}
