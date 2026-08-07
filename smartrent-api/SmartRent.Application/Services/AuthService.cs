using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;
using BCrypt.Net;

namespace SmartRent.Application.Services;

// Dịch vụ Xác thực & Phân quyền (Đăng nhập, cấp phát JWT AccessToken & RefreshToken, Đăng xuất).
public class AuthService(AppDbContext db, IConfiguration config) : IAuthService
{
    private readonly string _jwtKey = config["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
    private readonly string _jwtIssuer = config["Jwt:Issuer"] ?? "SmartRent";
    private readonly int _jwtExpireMinutes = int.Parse(config["Jwt:ExpireMinutes"] ?? "1440");

    // Xử lý đăng nhập tài khoản bằng Email và Mật khẩu (trả về AccessToken, RefreshToken và thông tin User).
    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email)
            ?? throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Tài khoản đã bị khóa");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng");

        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var (accessToken, refreshToken) = GenerateTokens(user);
        return new LoginResponse(accessToken, refreshToken, user.Role.ToString(), user.FullName, user.Email, user.AvatarUrl, user.Id);
    }

    // Làm mới AccessToken bằng RefreshToken còn hạn.
    public async Task<LoginResponse> RefreshTokenAsync(string refreshToken)
    {
        var principal = ValidateToken(refreshToken);
        var userId = Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.FindAsync(userId)
            ?? throw new UnauthorizedAccessException("Người dùng không tồn tại");

        var (newAccess, newRefresh) = GenerateTokens(user);
        return new LoginResponse(newAccess, newRefresh, user.Role.ToString(), user.FullName, user.Email, user.AvatarUrl, user.Id);
    }

    public Task LogoutAsync(Guid userId) => Task.CompletedTask;

    private (string AccessToken, string RefreshToken) GenerateTokens(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var accessToken = new JwtSecurityToken(
            _jwtIssuer, _jwtIssuer, claims,
            expires: DateTime.UtcNow.AddMinutes(_jwtExpireMinutes),
            signingCredentials: creds);

        var refreshToken = new JwtSecurityToken(
            _jwtIssuer, _jwtIssuer, claims,
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(accessToken),
                new JwtSecurityTokenHandler().WriteToken(refreshToken));
    }

    private ClaimsPrincipal ValidateToken(string token)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtKey));
        var handler = new JwtSecurityTokenHandler();
        return handler.ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = key,
            ValidateIssuer = true,
            ValidIssuer = _jwtIssuer,
            ValidateAudience = true,
            ValidAudience = _jwtIssuer,
            ValidateLifetime = true
        }, out _);
    }
}
