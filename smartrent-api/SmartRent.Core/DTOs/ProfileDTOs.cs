namespace SmartRent.Core.DTOs;

public record UserProfileDto(
    Guid Id, string FullName, string Email, string Phone,
    string? AvatarUrl, string Role, DateTime CreatedAt,
    int VehicleCount = 0, string? VehicleInfo = null,
    string? Cccd = null, string? Hometown = null,
    string? RoomNumber = null, string? ZoneName = null,
    string? CccdFrontUrl = null, string? CccdBackUrl = null
);

public record UpdateProfileRequest(
    string FullName, 
    string Phone, 
    string? AvatarUrl,
    string? Cccd = null,
    string? Hometown = null,
    string? CccdFrontUrl = null,
    string? CccdBackUrl = null
);
