using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller tiếp nhận và xử lý Báo cáo Sự cố & Bảo trì sửa chữa phòng trọ.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MaintenanceController(MaintenanceService maintenanceService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    // Lấy danh sách yêu cầu bảo trì (Chủ trọ xem toàn bộ yêu cầu, Khách thuê xem các yêu cầu của phòng mình).
    [HttpGet]
    public async Task<IActionResult> GetRequests([FromQuery] int? page, [FromQuery] int? pageSize)
    {
        if (CurrentRole == "Landlord")
            return Ok(await maintenanceService.GetByLandlordAsync(CurrentUserId, page, pageSize));
            
        return Ok(await maintenanceService.GetByTenantUserIdAsync(CurrentUserId));
    }

    // Khách thuê gửi báo cáo hỏng hóc/bảo trì kèm ảnh chụp thực tế.
    [HttpPost]
    [Authorize(Roles = "Tenant")]
    public async Task<IActionResult> Create([FromBody] CreateMaintenanceRequest request)
    {
        try { return Ok(await maintenanceService.CreateAsync(CurrentUserId, request)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Chủ trọ cập nhật tiến độ xử lý, người sửa chữa và ghi chú hoàn thành bảo trì.
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMaintenanceRequest request)
    {
        try { return Ok(await maintenanceService.UpdateAsync(id, CurrentUserId, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }
}
