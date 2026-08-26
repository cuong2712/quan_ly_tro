using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller quản lý Chỉ số Điện nước và Đơn giá Điện nước.
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Landlord")]
public class UtilitiesController(UtilityService utilityService) : ControllerBase
{
    private Guid LandlordId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Lấy nhật ký ghi nhận điện nước hàng tháng (có thể lọc theo phòng và phân trang).
    [HttpGet]
    public async Task<IActionResult> GetLogs([FromQuery] Guid? roomId, [FromQuery] int? page, [FromQuery] int? pageSize)
        => Ok(await utilityService.GetByLandlordAsync(LandlordId, roomId, page, pageSize));

    // Chốt chỉ số điện nước mới cho phòng (tự động tính tiền và tạo hóa đơn).
    [HttpPost]
    public async Task<IActionResult> Record([FromBody] RecordUtilityRequest request)
    {
        try { return Ok(await utilityService.RecordAsync(LandlordId, request)); }
        catch (KeyNotFoundException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Ghi nhận hàng loạt chỉ số điện nước từ file Excel và tự động tính toán, tạo hóa đơn hàng loạt
    [HttpPost("bulk-record")]
    public async Task<IActionResult> BulkRecord([FromBody] BulkRecordUtilityRequest request)
    {
        try
        {
            var result = await utilityService.BulkRecordAsync(LandlordId, request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Lỗi khi xử lý chốt điện nước hàng loạt: " + ex.Message });
        }
    }

    // Lấy bảng giá điện nước hiện tại của Chủ trọ.
    [HttpGet("rate")]
    public async Task<IActionResult> GetRate() => Ok(await utilityService.GetRateAsync(LandlordId));

    // Cập nhật bảng giá điện (đ/kWh) và giá nước (đ/m³).
    [HttpPut("rate")]
    public async Task<IActionResult> UpdateRate([FromBody] UpdateUtilityRateRequest request)
        => Ok(await utilityService.UpdateRateAsync(LandlordId, request));

    // Xóa bản ghi lịch sử điện nước
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteLog([FromRoute] Guid id)
    {
        var success = await utilityService.DeleteLogAsync(LandlordId, id);
        if (!success) return NotFound(new { message = "Không tìm thấy bản ghi điện nước hoặc không có quyền xóa" });
        return Ok(new { message = "Đã xóa bản ghi điện nước thành công" });
    }
}
