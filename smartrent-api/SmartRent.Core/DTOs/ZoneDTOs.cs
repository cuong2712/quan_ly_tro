namespace SmartRent.Core.DTOs;

public record ZoneDto(
    Guid Id, string Name, string Address, string? Description,
    int TotalRooms, int CurrentRoomsCount, DateTime CreatedAt
);

public record CreateZoneRequest(string Name, string Address, string? Description, int TotalRooms);
public record UpdateZoneRequest(string Name, string Address, string? Description, int TotalRooms);
