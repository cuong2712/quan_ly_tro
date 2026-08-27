using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller quản lý Phòng trọ (xem danh sách, chi tiết phòng, thêm/sửa/xóa phòng).
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Landlord")]
public class RoomsController(RoomService roomService) : ControllerBase
{
    private Guid LandlordId => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

    // Lấy danh sách phòng trọ của Chủ trọ (có thể lọc theo khu trọ zoneId và phân trang).
    [HttpGet]
    public async Task<IActionResult> GetRooms([FromQuery] Guid? zoneId, [FromQuery] int? page, [FromQuery] int? pageSize)
        => Ok(await roomService.GetByLandlordAsync(LandlordId, zoneId, page, pageSize));

    // Lấy thông tin cơ bản của một phòng trọ theo ID (đảm bảo thuộc quyền quản lý của chủ trọ).
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetRoom(Guid id)
    {
        var room = await roomService.GetByIdAsync(id, LandlordId);
        return room is null ? NotFound(new { message = "Không tìm thấy phòng hoặc không có quyền truy cập" }) : Ok(room);
    }

    // Lấy chi tiết toàn bộ thông tin phòng (bao gồm danh sách khách ở, lịch sử hóa đơn 6 tháng, chỉ số điện nước và hợp đồng).
    [HttpGet("{id:guid}/detail")]
    public async Task<IActionResult> GetRoomDetail(Guid id)
    {
        var detail = await roomService.GetRoomDetailAsync(id, LandlordId);
        return detail is null ? NotFound(new { message = "Không tìm thấy chi tiết phòng hoặc không có quyền truy cập" }) : Ok(detail);
    }

    // Tạo mới một phòng trọ trong khu.
    [HttpPost]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
    {
        try { return CreatedAtAction(nameof(GetRoom), new { id = Guid.Empty }, await roomService.CreateAsync(LandlordId, request)); }
        catch (KeyNotFoundException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Cập nhật thông tin phòng trọ.
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateRoom(Guid id, [FromBody] UpdateRoomRequest request)
    {
        try { return Ok(await roomService.UpdateAsync(id, LandlordId, request)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Xóa một phòng trọ khỏi hệ thống.
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteRoom(Guid id)
        => await roomService.DeleteAsync(id, LandlordId) ? NoContent() : NotFound(new { message = "Không tìm thấy phòng hoặc không có quyền xóa." });

    // Thêm mới thiết bị bàn giao cho phòng trọ.
    [HttpPost("{id:guid}/equipments")]
    public async Task<IActionResult> AddEquipment(Guid id, [FromBody] CreateEquipmentRequest request)
    {
        try { return Ok(await roomService.AddEquipmentAsync(id, LandlordId, request)); }
        catch (KeyNotFoundException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Cập nhật thông tin/tình trạng thiết bị bàn giao.
    [HttpPut("equipments/{equipmentId:guid}")]
    public async Task<IActionResult> UpdateEquipment(Guid equipmentId, [FromBody] CreateEquipmentRequest request)
    {
        try { return Ok(await roomService.UpdateEquipmentAsync(equipmentId, LandlordId, request)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Xóa thiết bị bàn giao khỏi phòng.
    [HttpDelete("equipments/{equipmentId:guid}")]
    public async Task<IActionResult> DeleteEquipment(Guid equipmentId)
        => await roomService.DeleteEquipmentAsync(equipmentId, LandlordId) ? NoContent() : NotFound(new { message = "Không tìm thấy thiết bị hoặc không có quyền xóa." });

    // Thêm thành viên ở ghép (Occupant) vào phòng mà KHÔNG tạo Hợp đồng mới.
    // Chỉ cập nhật TenantProfile.RoomId để liên kết người thuê với phòng.
    [HttpPost("{roomId:guid}/occupants")]
    public async Task<IActionResult> AddOccupant(Guid roomId, [FromBody] AddOccupantRequest request)
    {
        try
        {
            var result = await roomService.AddOccupantAsync(roomId, LandlordId, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Gỡ thành viên ở ghép (Occupant) khỏi phòng khi họ rời đi.
    // Không ảnh hưởng đến Hợp đồng chính của phòng.
    // Sẽ từ chối nếu người được gỡ là Primary Tenant (người đứng tên Hợp đồng chính).
    [HttpDelete("{roomId:guid}/occupants/{tenantId:guid}")]
    public async Task<IActionResult> RemoveOccupant(Guid roomId, Guid tenantId)
    {
        try
        {
            await roomService.RemoveOccupantAsync(roomId, LandlordId, tenantId);
            return Ok(new { message = "Đã gỡ thành viên ở ghép khỏi phòng thành công." });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Nhận đặt cọc giữ chỗ phòng (Booking Deposit)
    [HttpPost("{id:guid}/deposit")]
    public async Task<IActionResult> BookDeposit(Guid id, [FromBody] BookRoomDepositRequest request)
    {
        try { return Ok(await roomService.BookDepositAsync(id, LandlordId, request)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Hủy cọc giữ chỗ phòng (Trả về Còn trống)
    [HttpPost("{id:guid}/cancel-deposit")]
    public async Task<IActionResult> CancelDeposit(Guid id, [FromBody] CancelRoomDepositRequest? request)
    {
        try { return Ok(await roomService.CancelDepositAsync(id, LandlordId, request ?? new CancelRoomDepositRequest())); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }
}
