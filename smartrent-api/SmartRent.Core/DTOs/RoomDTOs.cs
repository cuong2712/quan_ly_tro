using SmartRent.Core.Enums;
namespace SmartRent.Core.DTOs;

public record RoomDto(
    Guid Id, Guid ZoneId, string ZoneName, string RoomNumber,
    int Floor, decimal Price, decimal Area, int MaxTenants,
    string Status, decimal ElecMeter, decimal WaterMeter,
    string? Description, DateTime CreatedAt,
    string? CurrentTenantName
);

public record CreateRoomRequest(
    Guid ZoneId, string RoomNumber, int Floor, decimal Price,
    decimal Area, int MaxTenants, string Status, decimal ElecMeter,
    decimal WaterMeter, string? Description
);

public record UpdateRoomRequest(
    string RoomNumber, int Floor, decimal Price, decimal Area,
    int MaxTenants, string Status, decimal ElecMeter,
    decimal WaterMeter, string? Description
);

public record RoomDetailDto(
    Guid Id, Guid ZoneId, string ZoneName, string RoomNumber,
    int Floor, decimal Price, decimal Area, int MaxTenants,
    string Status, decimal ElecMeter, decimal WaterMeter,
    string? Description, DateTime CreatedAt,
    List<TenantDto> Tenants,
    List<InvoiceDto> RecentInvoices,
    List<UtilityLogDto> UtilityLogs,
    ContractDto? ActiveContract
);
