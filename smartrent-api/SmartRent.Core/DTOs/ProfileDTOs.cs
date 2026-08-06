namespace SmartRent.Core.DTOs;

public record UserProfileDto(
    Guid Id, string FullName, string Email, string Phone,
    string? AvatarUrl, string Role, DateTime CreatedAt
);

public record UpdateProfileRequest(string FullName, string Phone, string? AvatarUrl);
