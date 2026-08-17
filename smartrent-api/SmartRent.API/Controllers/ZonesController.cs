using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller quản lý Khu trọ / Tòa nhà của Chủ trọ.
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Landlord")]
public class ZonesController(ZoneService zoneService) : ControllerBase
{
    private Guid LandlordId => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

    // Lấy danh sách các khu trọ của Chủ trọ hiện tại (hỗ trợ phân trang).
    [HttpGet]
    public async Task<IActionResult> GetZones([FromQuery] int? page, [FromQuery] int? pageSize)
        => Ok(await zoneService.GetByLandlordAsync(LandlordId, page, pageSize));

    // Tạo mới một Khu trọ / Tòa nhà.
    [HttpPost]
    public async Task<IActionResult> CreateZone([FromBody] CreateZoneRequest request)
        => CreatedAtAction(nameof(GetZones), await zoneService.CreateAsync(LandlordId, request));

    // Cập nhật thông tin Khu trọ.
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateZone(Guid id, [FromBody] UpdateZoneRequest request)
    {
        try { return Ok(await zoneService.UpdateAsync(id, LandlordId, request)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Xóa một Khu trọ theo ID.
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteZone(Guid id)
        => await zoneService.DeleteAsync(id, LandlordId) ? NoContent() : NotFound(new { message = "Không tìm thấy khu trọ hoặc không có quyền xóa." });
}
