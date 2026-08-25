using SmartRent.Application.Services.Rooms;
using SmartRent.Core.DTOs;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Phòng trọ (Facade điều phối các Sub-Services chuyên biệt)
public class RoomService(
    RoomQueryService queryService,
    RoomLifecycleService lifecycleService,
    RoomOccupantService occupantService)
{
    // Lấy danh sách các phòng trọ của Chủ trọ
    public Task<object> GetByLandlordAsync(Guid landlordId, Guid? zoneId = null, int? page = null, int? pageSize = null)
        => queryService.GetByLandlordAsync(landlordId, zoneId, page, pageSize);

    // Lấy thông tin cơ bản của phòng trọ theo ID
    public Task<RoomDto?> GetByIdAsync(Guid id, Guid landlordId)
        => queryService.GetByIdAsync(id, landlordId);

    // Lấy chi tiết toàn bộ thông tin phòng
    public Task<RoomDetailDto?> GetRoomDetailAsync(Guid roomId, Guid landlordId)
        => queryService.GetRoomDetailAsync(roomId, landlordId);

    // Tạo mới một phòng trọ
    public Task<RoomDto> CreateAsync(Guid landlordId, CreateRoomRequest req)
        => lifecycleService.CreateAsync(landlordId, req);

    // Cập nhật thông tin phòng trọ
    public Task<RoomDto> UpdateAsync(Guid id, Guid landlordId, UpdateRoomRequest req)
        => lifecycleService.UpdateAsync(id, landlordId, req);

    // Xóa một phòng trọ
    public Task<bool> DeleteAsync(Guid id, Guid landlordId)
        => lifecycleService.DeleteAsync(id, landlordId);

    // Quản lý Trang thiết bị / Nội thất phòng
    public Task<RoomEquipmentDto> AddEquipmentAsync(Guid roomId, Guid landlordId, CreateEquipmentRequest req)
        => lifecycleService.AddEquipmentAsync(roomId, landlordId, req);

    public Task<RoomEquipmentDto> UpdateEquipmentAsync(Guid equipmentId, Guid landlordId, CreateEquipmentRequest req)
        => lifecycleService.UpdateEquipmentAsync(equipmentId, landlordId, req);

    public Task<bool> DeleteEquipmentAsync(Guid equipmentId, Guid landlordId)
        => lifecycleService.DeleteEquipmentAsync(equipmentId, landlordId);

    // Thêm thành viên ở ghép (Occupant)
    public Task<TenantDto> AddOccupantAsync(Guid roomId, Guid landlordId, AddOccupantRequest req)
        => occupantService.AddOccupantAsync(roomId, landlordId, req);

    // Gỡ thành viên ở ghép (Occupant)
    public Task RemoveOccupantAsync(Guid roomId, Guid landlordId, Guid tenantProfileId)
        => occupantService.RemoveOccupantAsync(roomId, landlordId, tenantProfileId);
}
