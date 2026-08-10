using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller quản lý Hợp đồng thuê nhà (tạo mới, xem danh sách, thanh lý, gia hạn hợp đồng).
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ContractsController(ContractService contractService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    // Lấy danh sách hợp đồng (tùy theo vai trò: Chủ trọ xem hợp đồng khu mình, Khách thuê xem hợp đồng của bản thân).
    [HttpGet]
    public async Task<IActionResult> GetContracts([FromQuery] int? page, [FromQuery] int? pageSize)
    {
        if (CurrentRole == "Landlord")
            return Ok(await contractService.GetByLandlordAsync(CurrentUserId, page, pageSize));
        var tenantSvc = HttpContext.RequestServices.GetRequiredService<TenantService>();
        var profile = await tenantSvc.GetByUserIdAsync(CurrentUserId);
        if (profile is null) return NotFound();
        return Ok(await contractService.GetByTenantAsync(profile.Id));
    }

    // Tạo mới một Hợp đồng thuê nhà.
    [HttpPost]
    public async Task<IActionResult> CreateContract([FromBody] CreateContractRequest request)
    {
        try { return Ok(await contractService.CreateAsync(request)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Cập nhật điều khoản hoặc thông tin hợp đồng.
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateContract(Guid id, [FromBody] UpdateContractRequest request)
    {
        try { return Ok(await contractService.UpdateAsync(id, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // Xóa một hợp đồng.
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteContract(Guid id)
        => await contractService.DeleteAsync(id) ? NoContent() : NotFound();

    // Thanh lý hợp đồng thuê nhà trước hoặc đúng hạn.
    [HttpPatch("{id:guid}/terminate")]
    public async Task<IActionResult> Terminate(Guid id)
    {
        await contractService.TerminateAsync(id);
        return Ok(new { message = "Thanh lý hợp đồng thành công" });
    }

    // Gia hạn thời gian hợp đồng thuê nhà.
    [HttpPost("{id:guid}/renew")]
    public async Task<IActionResult> Renew(Guid id, [FromBody] RenewContractRequest request)
    {
        await contractService.RenewAsync(id, request);
        return Ok(new { message = "Gia hạn hợp đồng thành công" });
    }
}
