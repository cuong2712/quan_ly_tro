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

    // Lấy danh sách các loại dịch vụ do Chủ trọ cấu hình.
    [HttpGet]
    public async Task<IActionResult> GetServices() => Ok(await serviceMgmt.GetByLandlordAsync(LandlordId));

    // Thêm một loại dịch vụ mới.
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateServiceRequest req)
        => CreatedAtAction(nameof(GetServices), await serviceMgmt.CreateAsync(LandlordId, req));

    // Cập nhật thông tin loại dịch vụ (tên, giá tiền, icon, trạng thái sử dụng).
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateServiceRequest req)
    {
        try { return Ok(await serviceMgmt.UpdateAsync(id, req)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // Xóa một dịch vụ khỏi danh mục.
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) => await serviceMgmt.DeleteAsync(id) ? NoContent() : NotFound();
}
