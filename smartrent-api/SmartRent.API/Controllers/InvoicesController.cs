using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller quản lý Hóa đơn tiền nhà hàng tháng.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController(InvoiceService invoiceService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    // Lấy danh sách hóa đơn (Chủ trọ xem toàn bộ hóa đơn khu mình quản lý, Khách thuê xem hóa đơn phòng mình).
    [HttpGet]
    public async Task<IActionResult> GetInvoices([FromQuery] string? status, [FromQuery] string? month)
    {
        if (CurrentRole == "Landlord")
            return Ok(await invoiceService.GetByLandlordAsync(CurrentUserId, status, month));

        return Ok(await invoiceService.GetByTenantUserIdAsync(CurrentUserId));
    }

    // Xem chi tiết một hóa đơn cụ thể theo ID.
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetInvoice(Guid id)
    {
        var inv = await invoiceService.GetByIdAsync(id);
        return inv is null ? NotFound() : Ok(inv);
    }

    // Tạo mới một Hóa đơn tiền nhà cho phòng (dành riêng cho Chủ trọ).
    [HttpPost]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest request)
    {
        try { return Ok(await invoiceService.CreateAsync(CurrentUserId, request)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Cập nhật trạng thái hóa đơn (Chưa thanh toán -> Đã thanh toán...).
    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] string status)
    {
        try { return Ok(await invoiceService.UpdateStatusAsync(id, status)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }
}
