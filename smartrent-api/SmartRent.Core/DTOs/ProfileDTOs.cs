namespace SmartRent.Core.DTOs;

public record UserProfileDto(
    Guid Id, string FullName, string Email, string Phone,
    string? AvatarUrl, string Role, DateTime CreatedAt,
    int VehicleCount = 0, string? VehicleInfo = null,
    string? Cccd = null, string? Hometown = null,
    string? RoomNumber = null, string? ZoneName = null,
    string? CccdFrontUrl = null, string? CccdBackUrl = null,
    string? BankName = null, string? BankAccountNumber = null, string? BankAccountName = null
);

public class UpdateProfileRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Cccd { get; set; }
    public string? Hometown { get; set; }
    public string? CccdFrontUrl { get; set; }
    public string? CccdBackUrl { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankAccountName { get; set; }
}
