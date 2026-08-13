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
    List<RoomEquipmentDto>? Equipments = null
);

public record CreateRoomRequest(
    Guid ZoneId, string RoomNumber, int Floor, decimal Price,
    decimal Area, int MaxTenants, string Status, decimal ElecMeter,
    decimal WaterMeter, string? Description, string? Amenities = null,
    List<CreateEquipmentRequest>? Equipments = null
);

public record UpdateRoomRequest(
    string RoomNumber, int Floor, decimal Price, decimal Area,
    int MaxTenants, string Status, decimal ElecMeter,
    decimal WaterMeter, string? Description, string? Amenities = null,
    List<CreateEquipmentRequest>? Equipments = null
);

public record RoomDetailDto(
    Guid Id, Guid ZoneId, string ZoneName, string RoomNumber,
    int Floor, decimal Price, decimal Area, int MaxTenants,
    string Status, decimal ElecMeter, decimal WaterMeter,
    string? Description, string? Amenities, DateTime CreatedAt,
    List<TenantDto> Tenants,
    List<InvoiceDto> RecentInvoices,
    List<UtilityLogDto> UtilityLogs,
    ContractDto? ActiveContract,
    List<RoomEquipmentDto> Equipments
);
