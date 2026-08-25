using SmartRent.Core.DTOs;

namespace SmartRent.Core.Interfaces;

// Giao diện Dịch vụ Xác thực & Phân quyền
public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<LoginResponse> RefreshTokenAsync(string refreshToken);
    Task LogoutAsync(Guid userId);
}
