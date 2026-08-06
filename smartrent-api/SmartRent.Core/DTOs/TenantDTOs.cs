namespace SmartRent.Core.DTOs;

public record TenantDto(
    Guid Id, Guid UserId, string FullName, string Email, string Phone,
    string? AvatarUrl, string CCCD, string? Hometown,
    DateTime? MoveInDate, decimal Deposit,
    Guid? RoomId, string? RoomNumber, string? ZoneName,
    string? CccdFrontUrl, string? CccdBackUrl, string? ContractCode
);

public record CreateTenantRequest(
    string FullName, string Email, string Phone, string Password,
    string CCCD, string? Hometown, Guid RoomId,
    DateTime MoveInDate, decimal Deposit,
    string? CccdFrontUrl, string? CccdBackUrl
);

public record UpdateTenantRequest(
    string FullName, string Phone, string? Hometown,
    string? CccdFrontUrl = null, string? CccdBackUrl = null,
    Guid? RoomId = null
);

public record TransferRoomRequest(Guid NewRoomId, DateTime TransferDate);
