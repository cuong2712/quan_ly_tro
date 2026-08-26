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

public record BulkRecordUtilityItem(
    Guid? RoomId,
    string? RoomNumber,
    string? ZoneName,
    decimal NewElec,
    decimal NewWater,
    string? Note = null
);

public record BulkRecordUtilityRequest(
    string Month,
    DateTime? DueDate,
    List<BulkRecordUtilityItem> Items
);

public record BulkRecordResultDto(
    int TotalProcessed,
    int SuccessCount,
    int ErrorCount,
    decimal TotalRevenue,
    List<string> ErrorMessages,
    List<InvoiceDto> CreatedInvoices
);
