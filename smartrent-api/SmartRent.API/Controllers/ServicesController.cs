using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller quản lý các Dịch vụ phụ trợ (Wi-Fi, Rác, Gửi xe, Vệ sinh...).
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Landlord")]
public class ServicesController(ServiceMgmtService serviceMgmt) : ControllerBase
{
    private Guid LandlordId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Lấy danh sách dịch vụ của Chủ trọ (hỗ trợ phân trang và lọc theo zoneId).
    [HttpGet]
    public async Task<IActionResult> GetServices([FromQuery] Guid? zoneId, [FromQuery] int? page, [FromQuery] int? pageSize)
        => Ok(await serviceMgmt.GetByLandlordAsync(LandlordId, zoneId, page, pageSize));

    // Thêm một loại dịch vụ mới.
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateServiceRequest req)
        => CreatedAtAction(nameof(GetServices), await serviceMgmt.CreateAsync(LandlordId, req));

    // Cập nhật thông tin loại dịch vụ (tên, giá tiền, icon, trạng thái sử dụng).
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateServiceRequest req)
    {
        try { return Ok(await serviceMgmt.UpdateAsync(id, LandlordId, req)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Xóa một dịch vụ khỏi danh mục.
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) 
        => await serviceMgmt.DeleteAsync(id, LandlordId) ? NoContent() : NotFound(new { message = "Không tìm thấy dịch vụ hoặc không có quyền xóa." });
}
