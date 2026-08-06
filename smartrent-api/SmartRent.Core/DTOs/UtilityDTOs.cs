namespace SmartRent.Core.DTOs;

public record UtilityLogDto(
    Guid Id, Guid RoomId, string RoomNumber, string Month,
    decimal OldElec, decimal NewElec, decimal ElecUsed,
    decimal OldWater, decimal NewWater, decimal WaterUsed,
    decimal ElecCost, decimal WaterCost, DateTime RecordedAt
);

public record RecordUtilityRequest(
    Guid RoomId, string Month,
    decimal NewElec, decimal NewWater
);

public record UtilityRateDto(Guid Id, decimal ElecPrice, decimal WaterPrice, DateTime UpdatedAt);
public record UpdateUtilityRateRequest(decimal ElecPrice, decimal WaterPrice);
