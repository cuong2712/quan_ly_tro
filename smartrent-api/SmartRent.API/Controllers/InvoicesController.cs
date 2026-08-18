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
    public async Task<IActionResult> GetInvoices([FromQuery] string? status, [FromQuery] string? month, [FromQuery] int? page, [FromQuery] int? pageSize)
    {
        if (CurrentRole == "Landlord")
            return Ok(await invoiceService.GetByLandlordAsync(CurrentUserId, status, month, page, pageSize));

        return Ok(await invoiceService.GetByTenantUserIdAsync(CurrentUserId));
    }

    // Xem chi tiết một hóa đơn cụ thể theo ID (kiểm tra quyền truy cập).
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetInvoice(Guid id)
    {
        var inv = await invoiceService.GetByIdAsync(id, CurrentUserId, CurrentRole);
        return inv is null ? NotFound(new { message = "Không tìm thấy hóa đơn hoặc bạn không có quyền truy cập." }) : Ok(inv);
    }

    // Tạo mới một Hóa đơn tiền nhà cho phòng (dành riêng cho Chủ trọ).
    [HttpPost]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest request)
    {
        try { return Ok(await invoiceService.CreateAsync(CurrentUserId, request)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Cập nhật thông tin chi tiết hóa đơn (Chỉnh sửa số tiền điện/nước/phòng khi điền sai).
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> UpdateInvoice(Guid id, [FromBody] UpdateInvoiceRequest request)
    {
        try { return Ok(await invoiceService.UpdateAsync(id, CurrentUserId, request)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Cập nhật trạng thái hóa đơn (Chưa thanh toán -> Đã thanh toán...).
    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] string status)
    {
        try { return Ok(await invoiceService.UpdateStatusAsync(id, CurrentUserId, status)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Khách thuê gửi báo cáo / khiếu nại sai sót số liệu hóa đơn cho Chủ trọ.
    [HttpPost("{id:guid}/report")]
    [Authorize(Roles = "Tenant")]
    public async Task<IActionResult> ReportInvoice(Guid id, [FromBody] ReportInvoiceRequest request)
    {
        try { return Ok(await invoiceService.ReportInvoiceAsync(id, CurrentUserId, request)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Khách thuê hủy yêu cầu kiểm tra lại hóa đơn
    [HttpPost("{id:guid}/report/cancel")]
    [Authorize(Roles = "Tenant")]
    public async Task<IActionResult> CancelReport(Guid id)
    {
        try { return Ok(await invoiceService.CancelReportInvoiceAsync(id, CurrentUserId)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Chủ trọ xử lý / phản hồi yêu cầu kiểm tra lại hóa đơn (Chấp nhận & sửa tiền, hoặc Từ chối)
    [HttpPost("{id:guid}/resolve-dispute")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> ResolveDispute(Guid id, [FromBody] ResolveInvoiceDisputeRequest request)
    {
        try { return Ok(await invoiceService.ResolveDisputeAsync(id, CurrentUserId, request)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Xóa một hóa đơn tiền nhà (dành riêng cho Chủ trọ)
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> DeleteInvoice(Guid id)
    {
        try 
        { 
            var deleted = await invoiceService.DeleteAsync(id, CurrentUserId);
            return deleted ? Ok(new { message = "Xóa hóa đơn thành công." }) : NotFound(new { message = "Không tìm thấy hóa đơn hoặc bạn không có quyền xóa." });
        }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }
}
