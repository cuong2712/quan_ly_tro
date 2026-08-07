using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller quản lý các Giao dịch Thanh toán & Duyệt minh chứng biên lai.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentsController(PaymentService paymentService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    // Lấy danh sách giao dịch thanh toán (Chủ trọ xem các khoản thu, Khách thuê xem lịch sử thanh toán của mình).
    [HttpGet]
    public async Task<IActionResult> GetPayments()
    {
        if (CurrentRole == "Landlord")
            return Ok(await paymentService.GetByLandlordAsync(CurrentUserId));

        return Ok(await paymentService.GetByTenantUserIdAsync(CurrentUserId));
    }

    // Khách thuê tải minh chứng chuyển khoản (ảnh biên lai) và gửi yêu cầu thanh toán hóa đơn.
    [HttpPost]
    [Authorize(Roles = "Tenant")]
    public async Task<IActionResult> Submit([FromBody] SubmitPaymentRequest request)
    {
        try { return Ok(await paymentService.SubmitAsync(CurrentUserId, request)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Chủ trọ duyệt (Chấp nhận/Từ chối) biên lai thanh toán của Khách thuê.
    [HttpPatch("{id:guid}/confirm")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> Confirm(Guid id, [FromBody] ConfirmPaymentRequest request)
    {
        try { return Ok(await paymentService.ConfirmAsync(id, CurrentUserId, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }
}
