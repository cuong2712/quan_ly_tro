using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
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

// Dịch vụ Xác thực & Phân quyền (Đăng nhập, làm mới Token với Token Rotation, Đăng xuất & Thu hồi Token).
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

        // Tạo JWT Access Token
        var accessToken = GenerateAccessToken(user);
        
        // Tạo và lưu trữ Refresh Token mới vào Database
        var refreshTokenString = GenerateSecureRandomToken();
        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenString,
            ExpiryDate = DateTime.UtcNow.AddDays(30),
            IsRevoked = false,
            CreatedAt = DateTime.UtcNow
        };

        db.RefreshTokens.Add(refreshTokenEntity);
        await db.SaveChangesAsync();

        return new LoginResponse(accessToken, refreshTokenString, user.Role.ToString(), user.FullName, user.Email, user.AvatarUrl, user.Id);
    }

    // Làm mới AccessToken bằng RefreshToken còn hạn (Áp dụng Token Rotation & Revocation)
    public async Task<LoginResponse> RefreshTokenAsync(string refreshToken)
    {
        // Tra cứu Refresh Token trong Database
        var tokenEntity = await db.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == refreshToken)
            ?? throw new UnauthorizedAccessException("Refresh token không tồn tại");

        // Kiểm tra xem Refresh Token đã bị thu hồi hoặc hết hạn hay chưa
        if (tokenEntity.IsRevoked)
            throw new UnauthorizedAccessException("Refresh token đã bị thu hồi");

        if (tokenEntity.ExpiryDate <= DateTime.UtcNow)
            throw new UnauthorizedAccessException("Refresh token đã hết hạn");

        if (!tokenEntity.User.IsActive)
            throw new UnauthorizedAccessException("Tài khoản đã bị khóa");

        // Vô hiệu hóa Refresh Token cũ (Token Rotation)
        tokenEntity.IsRevoked = true;
        tokenEntity.RevokedAt = DateTime.UtcNow;

        // Tạo Access Token mới và Refresh Token mới
        var newAccessToken = GenerateAccessToken(tokenEntity.User);
        var newRefreshTokenString = GenerateSecureRandomToken();

        tokenEntity.ReplacedByToken = newRefreshTokenString;

        var newRefreshTokenEntity = new RefreshToken
        {
            UserId = tokenEntity.UserId,
            Token = newRefreshTokenString,
            ExpiryDate = DateTime.UtcNow.AddDays(30),
            IsRevoked = false,
            CreatedAt = DateTime.UtcNow
        };

        db.RefreshTokens.Add(newRefreshTokenEntity);
        await db.SaveChangesAsync();

        return new LoginResponse(newAccessToken, newRefreshTokenString, tokenEntity.User.Role.ToString(), tokenEntity.User.FullName, tokenEntity.User.Email, tokenEntity.User.AvatarUrl, tokenEntity.UserId);
    }

    // Đăng xuất khỏi hệ thống: Thu hồi toàn bộ Refresh Token của User
    public async Task LogoutAsync(Guid userId)
    {
        var activeTokens = await db.RefreshTokens
            .Where(r => r.UserId == userId && !r.IsRevoked)
            .ToListAsync();

        foreach (var token in activeTokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
    }

    // Tạo JWT Access Token chứa thông tin Claims và thời hạn
    private string GenerateAccessToken(User user)
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

        return new JwtSecurityTokenHandler().WriteToken(accessToken);
    }

    // Tạo chuỗi ngẫu nhiên mã hóa an toàn làm Refresh Token
    private static string GenerateSecureRandomToken()
    {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }
}
