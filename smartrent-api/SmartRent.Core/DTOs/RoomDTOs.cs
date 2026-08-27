using SmartRent.Core.Enums;
namespace SmartRent.Core.DTOs;

public record RoomEquipmentDto(
    Guid Id, Guid RoomId, string Name, string? Brand, int Quantity, string Condition
);

public record CreateEquipmentRequest(
    string Name, string? Brand, int Quantity, string Condition
);

public record RoomDto(
    Guid Id, Guid ZoneId, string ZoneName, string RoomNumber,
    int Floor, decimal Price, decimal Area, int MaxTenants,
    string Status, decimal ElecMeter, decimal WaterMeter,
    string? Description, string? Amenities, DateTime CreatedAt,
    string? CurrentTenantName,
    List<RoomEquipmentDto>? Equipments = null,
    decimal ServiceFee = 0,
    string? CurrentTenantPhone = null,
    decimal? DepositAmount = null,
    string? DepositTenantName = null,
    string? DepositTenantPhone = null,
    DateTime? ExpectedMoveInDate = null,
    string? DepositNote = null
);

public record CreateRoomRequest(
    Guid ZoneId, string RoomNumber, int Floor, decimal Price,
    decimal Area, int MaxTenants, string Status, decimal ElecMeter,
    decimal WaterMeter, string? Description, string? Amenities = null,
    List<CreateEquipmentRequest>? Equipments = null,
    decimal ServiceFee = 0
);

public record UpdateRoomRequest(
    string RoomNumber, int Floor, decimal Price, decimal Area,
    int MaxTenants, string Status, decimal ElecMeter,
    decimal WaterMeter, string? Description, string? Amenities = null,
    List<CreateEquipmentRequest>? Equipments = null,
    decimal ServiceFee = 0
);

public record RoomDetailDto(
    Guid Id, Guid ZoneId, string ZoneName, string RoomNumber,
    int Floor, decimal Price, decimal Area, int MaxTenants,
    string Status, decimal ElecMeter, decimal WaterMeter,
    string? Description, string? Amenities, DateTime CreatedAt,
    List<TenantDto> Tenants,           // Toàn bộ thành viên trong phòng (Primary + Occupants)
    List<InvoiceDto> RecentInvoices,
    List<UtilityLogDto> UtilityLogs,
    ContractDto? ActiveContract,
    List<RoomEquipmentDto> Equipments,
    decimal ServiceFee = 0,
    TenantDto? PrimaryTenant = null,   // Người đứng tên hợp đồng chính
    List<TenantDto>? Occupants = null,  // Danh sách thành viên ở ghép (không đứng tên HĐ)
    decimal? DepositAmount = null,
    string? DepositTenantName = null,
    string? DepositTenantPhone = null,
    DateTime? ExpectedMoveInDate = null,
    string? DepositNote = null
);

// Yêu cầu đặt cọc giữ phòng
public class BookRoomDepositRequest
{
    public string TenantName { get; set; } = string.Empty;
    public string TenantPhone { get; set; } = string.Empty;
    public decimal DepositAmount { get; set; }
    public DateTime? ExpectedMoveInDate { get; set; }
    public string? Note { get; set; }
}

// Yêu cầu hủy cọc giữ chỗ
public class CancelRoomDepositRequest
{
    public string? Reason { get; set; }
}

// Yêu cầu thêm thành viên ở ghép vào phòng (không tạo hợp đồng mới)
public record AddOccupantRequest(Guid TenantProfileId);
