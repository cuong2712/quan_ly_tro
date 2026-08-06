namespace SmartRent.Core.DTOs;

public record LoginRequest(string Email, string Password);

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    string Role,
    string FullName,
    string Email,
    string? AvatarUrl,
    Guid UserId
);

public record RefreshTokenRequest(string RefreshToken);

public record ChangePasswordRequest(string OldPassword, string NewPassword, string ConfirmPassword);
