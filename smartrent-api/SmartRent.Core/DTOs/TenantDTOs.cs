namespace SmartRent.Core.DTOs;

public record TenantDto(
    Guid Id, Guid UserId, string FullName, string Email, string Phone,
    string? AvatarUrl, string CCCD, string? Hometown,
    DateTime? MoveInDate, decimal Deposit,
    Guid? RoomId, string? RoomNumber, string? ZoneName,
    string? CccdFrontUrl, string? CccdBackUrl, string? ContractCode,
    int VehicleCount = 0, string? VehicleInfo = null
);

public record CreateTenantRequest(
    string FullName, string Email, string Phone, string Password,
    string CCCD, string? Hometown, Guid RoomId,
    DateTime MoveInDate, decimal Deposit,
    string? CccdFrontUrl, string? CccdBackUrl,
    int VehicleCount = 0, string? VehicleInfo = null,
    string? AvatarUrl = null
);

public record UpdateTenantRequest(
    string FullName, string Phone, string? Hometown,
    string? CccdFrontUrl = null, string? CccdBackUrl = null,
    Guid? RoomId = null,
    int VehicleCount = 0, string? VehicleInfo = null,
    string? AvatarUrl = null,
    string? CCCD = null
);

public record TransferRoomRequest(Guid NewRoomId, DateTime TransferDate);

public record UpdateVehicleRequest(int VehicleCount, string? VehicleInfo);
