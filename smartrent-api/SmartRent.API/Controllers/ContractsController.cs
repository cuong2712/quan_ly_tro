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
        if (profile is null) return NotFound(new { message = "Không tìm thấy hồ sơ khách thuê" });
        return Ok(await contractService.GetByTenantAsync(profile.Id));
    }

    // Lấy chi tiết một Hợp đồng theo ID (kiểm tra quyền sở hữu).
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetContractById(Guid id)
    {
        var contract = await contractService.GetByIdAsync(id, CurrentUserId, CurrentRole);
        if (contract is null) return NotFound(new { message = "Không tìm thấy hợp đồng hoặc bạn không có quyền truy cập." });
        return Ok(contract);
    }

    // Tạo mới một Hợp đồng thuê nhà (chỉ dành cho Chủ trọ).
    [HttpPost]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> CreateContract([FromBody] CreateContractRequest request)
    {
        try { return Ok(await contractService.CreateAsync(CurrentUserId, request)); }
        catch (KeyNotFoundException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Cập nhật điều khoản hoặc thông tin hợp đồng.
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> UpdateContract(Guid id, [FromBody] UpdateContractRequest request)
    {
        try { return Ok(await contractService.UpdateAsync(id, CurrentUserId, request)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Xóa một hợp đồng.
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> DeleteContract(Guid id)
        => await contractService.DeleteAsync(id, CurrentUserId) ? NoContent() : NotFound(new { message = "Không tìm thấy hợp đồng hoặc không có quyền xóa." });

    // Thanh lý hợp đồng thuê nhà trước hoặc đúng hạn.
    [HttpPatch("{id:guid}/terminate")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> Terminate(Guid id)
    {
        try 
        {
            await contractService.TerminateAsync(id, CurrentUserId);
            return Ok(new { message = "Thanh lý hợp đồng thành công" });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    // Gia hạn thời gian hợp đồng thuê nhà (Chủ trọ).
    [HttpPost("{id:guid}/renew")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> Renew(Guid id, [FromBody] RenewContractRequest request)
    {
        try
        {
            await contractService.RenewAsync(id, CurrentUserId, request);
            return Ok(new { message = "Gia hạn hợp đồng thành công" });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    // Từ chối yêu cầu gia hạn hợp đồng (Chủ trọ).
    [HttpPost("{id:guid}/reject-renew")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> RejectRenew(Guid id, [FromBody] RejectRenewContractRequest? request)
    {
        try
        {
            await contractService.RejectRenewAsync(id, CurrentUserId, request ?? new RejectRenewContractRequest());
            return Ok(new { message = "Đã từ chối yêu cầu gia hạn hợp đồng và thông báo cho khách thuê." });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Khách thuê gửi yêu cầu đăng ký gia hạn hợp đồng
    [HttpPost("{id:guid}/request-renew")]
    [Authorize(Roles = "Tenant")]
    public async Task<IActionResult> RequestRenew(Guid id, [FromBody] RequestRenewContractRequest request)
    {
        try
        {
            var result = await contractService.RequestRenewAsync(id, CurrentUserId, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Khách thuê hủy yêu cầu đăng ký gia hạn hợp đồng
    [HttpPost("{id:guid}/cancel-renew")]
    [Authorize(Roles = "Tenant")]
    public async Task<IActionResult> CancelRenew(Guid id)
    {
        try
        {
            var result = await contractService.CancelRenewRequestAsync(id, CurrentUserId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Quyết toán hợp đồng & hoàn trả tiền cọc cho khách thuê
    [HttpPost("{id:guid}/settle")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> Settle(Guid id, [FromBody] SettleContractRequest request)
    {
        try
        {
            var result = await contractService.SettleContractAsync(id, CurrentUserId, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // Tự động quét và phát hành thông báo hợp đồng sắp hết hạn trong 30 ngày
    [HttpPost("check-expiring")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> CheckExpiringContracts()
    {
        int count = await contractService.CheckAndNotifyExpiringContractsAsync(CurrentUserId);
        return Ok(new { message = $"Đã kiểm tra và phát hành {count} thông báo hợp đồng sắp hết hạn.", notifiedCount = count });
    }
}
