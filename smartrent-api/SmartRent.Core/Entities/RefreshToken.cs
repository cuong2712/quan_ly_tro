using System;

namespace SmartRent.Core.Entities;

// Thực thể lưu trữ Refresh Token để phục vụ thu hồi (Revocation) và xoay vòng (Token Rotation)
public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
    public bool IsRevoked { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByToken { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
