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
    public async Task<IActionResult> GetPayments([FromQuery] int? page, [FromQuery] int? pageSize)
    {
        if (CurrentRole == "Landlord")
            return Ok(await paymentService.GetByLandlordAsync(CurrentUserId, page, pageSize));

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

    // Webhook tiếp nhận biến động số dư ngân hàng SePay / Casso (Tài khoản BIDV 0397181879) để tự động gạch nợ
    [HttpPost("sepay-webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleSepayWebhook([FromBody] SepayWebhookDto webhook)
    {
        try
        {
            var result = await paymentService.ProcessSepayWebhookAsync(webhook);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // API Giả lập giao dịch chuyển khoản vào tài khoản để test / demo chức năng tự động gạch nợ hóa đơn tháng
    [HttpPost("simulate-auto-paid/{invoiceId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> SimulateAutoPaid(Guid invoiceId)
    {
        try
        {
            var result = await paymentService.SimulateAutoClearAsync(invoiceId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // API Giả lập giao dịch chuyển khoản cọc phòng (Deposit) để test tính năng tự động gạch nợ cọc
    [HttpPost("simulate-deposit/{roomId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> SimulateDeposit(Guid roomId, [FromBody] SimulateDepositRequestDto? request = null)
    {
        try
        {
            var req = request != null 
                ? request with { RoomId = roomId }
                : new SimulateDepositRequestDto(roomId);
            var result = await paymentService.SimulateDepositAsync(req);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
