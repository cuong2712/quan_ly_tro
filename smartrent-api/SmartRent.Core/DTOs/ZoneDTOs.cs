namespace SmartRent.Core.DTOs;

public record ZoneDto(
    Guid Id, string Name, string Address, string? Description,
    int TotalRooms, int CurrentRoomsCount, DateTime CreatedAt,
    decimal? ElecPrice = null, decimal? WaterPrice = null
);

public record CreateZoneRequest(string Name, string Address, string? Description, int TotalRooms, decimal? ElecPrice = null, decimal? WaterPrice = null);
public record UpdateZoneRequest(string Name, string Address, string? Description, int TotalRooms, decimal? ElecPrice = null, decimal? WaterPrice = null);
