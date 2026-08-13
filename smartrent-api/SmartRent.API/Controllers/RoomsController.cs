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

    // Lấy thông tin cơ bản của một phòng trọ theo ID.
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetRoom(Guid id)
    {
        var room = await roomService.GetByIdAsync(id);
        return room is null ? NotFound() : Ok(room);
    }

    // Lấy chi tiết toàn bộ thông tin phòng (bao gồm danh sách khách ở, lịch sử hóa đơn 6 tháng, chỉ số điện nước và hợp đồng).
    [HttpGet("{id:guid}/detail")]
    public async Task<IActionResult> GetRoomDetail(Guid id)
    {
        var detail = await roomService.GetRoomDetailAsync(id);
        return detail is null ? NotFound() : Ok(detail);
    }

    // Tạo mới một phòng trọ trong khu.
    [HttpPost]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
    {
        try { return CreatedAtAction(nameof(GetRoom), new { id = Guid.Empty }, await roomService.CreateAsync(LandlordId, request)); }
        catch (KeyNotFoundException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Cập nhật thông tin phòng trọ.
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateRoom(Guid id, [FromBody] UpdateRoomRequest request)
    {
        try { return Ok(await roomService.UpdateAsync(id, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // Xóa một phòng trọ khỏi hệ thống.
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteRoom(Guid id)
        => await roomService.DeleteAsync(id) ? NoContent() : NotFound();

    // Thêm mới thiết bị bàn giao cho phòng trọ.
    [HttpPost("{id:guid}/equipments")]
    public async Task<IActionResult> AddEquipment(Guid id, [FromBody] CreateEquipmentRequest request)
    {
        try { return Ok(await roomService.AddEquipmentAsync(id, request)); }
        catch (KeyNotFoundException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // Cập nhật thông tin/tình trạng thiết bị bàn giao.
    [HttpPut("equipments/{equipmentId:guid}")]
    public async Task<IActionResult> UpdateEquipment(Guid equipmentId, [FromBody] CreateEquipmentRequest request)
    {
        try { return Ok(await roomService.UpdateEquipmentAsync(equipmentId, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // Xóa thiết bị bàn giao khỏi phòng.
    [HttpDelete("equipments/{equipmentId:guid}")]
    public async Task<IActionResult> DeleteEquipment(Guid equipmentId)
        => await roomService.DeleteEquipmentAsync(equipmentId) ? NoContent() : NotFound();
}
