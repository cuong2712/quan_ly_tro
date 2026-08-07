using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Hồ sơ Cá nhân và Đổi mật khẩu tài khoản người dùng.
public class ProfileService(AppDbContext db)
{
    // Lấy thông tin tài khoản cá nhân theo UserId.
    public async Task<UserProfileDto?> GetProfileAsync(Guid userId)
    {
        var u = await db.Users.FindAsync(userId);
        return u is null ? null : new UserProfileDto(u.Id, u.FullName, u.Email, u.Phone, u.AvatarUrl, u.Role.ToString(), u.CreatedAt);
    }

    // Cập nhật thông tin cá nhân (Họ tên, Số điện thoại, Ảnh đại diện).
    public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest req)
    {
        var u = await db.Users.FindAsync(userId) ?? throw new KeyNotFoundException();
        u.FullName = req.FullName; u.Phone = req.Phone; u.AvatarUrl = req.AvatarUrl;
        await db.SaveChangesAsync();
        return new UserProfileDto(u.Id, u.FullName, u.Email, u.Phone, u.AvatarUrl, u.Role.ToString(), u.CreatedAt);
    }

    // Đổi mật khẩu người dùng (xác thực mật khẩu cũ bằng BCrypt trước khi cập nhật mật khẩu mới).
    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest req)
    {
        if (req.NewPassword != req.ConfirmPassword) throw new InvalidOperationException("Mật khẩu xác nhận không khớp");
        var u = await db.Users.FindAsync(userId) ?? throw new KeyNotFoundException();
        if (!BCrypt.Net.BCrypt.Verify(req.OldPassword, u.PasswordHash)) throw new UnauthorizedAccessException("Mật khẩu cũ không đúng");
        u.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await db.SaveChangesAsync();
    }
}
