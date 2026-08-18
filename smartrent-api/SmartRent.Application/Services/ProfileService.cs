using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Hồ sơ Cá nhân và Đổi mật khẩu tài khoản người dùng.
public class ProfileService(AppDbContext db)
{
    // Lấy thông tin tài khoản cá nhân theo UserId (kèm dữ liệu hồ sơ xe/CCCD/phòng trọ của khách thuê nếu có).
    public async Task<UserProfileDto?> GetProfileAsync(Guid userId)
    {
        var u = await db.Users.FindAsync(userId);
        if (u is null) return null;

        var tp = await db.TenantProfiles
            .Include(t => t.Room).ThenInclude(r => r!.Zone)
            .FirstOrDefaultAsync(t => t.UserId == userId);

        return new UserProfileDto(
            u.Id,
            u.FullName,
            u.Email,
            u.Phone,
            u.AvatarUrl,
            u.Role.ToString(),
            u.CreatedAt,
            tp?.VehicleCount ?? 0,
            tp?.VehicleInfo,
            tp?.CCCD,
            tp?.Hometown,
            tp?.Room?.RoomNumber,
            tp?.Room?.Zone?.Name,
            tp?.CccdFrontUrl,
            tp?.CccdBackUrl
        );
    }

    // Lấy riêng thông tin đăng ký xe của khách thuê
    public async Task<UpdateVehicleRequest> GetVehicleInfoAsync(Guid userId)
    {
        var tp = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == userId)
            ?? throw new KeyNotFoundException("Hồ sơ khách thuê không tồn tại");

        return new UpdateVehicleRequest(tp.VehicleCount, tp.VehicleInfo);
    }

    // Cập nhật thông tin cá nhân (Họ tên, Số điện thoại, Ảnh đại diện, CCCD).
    public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest req)
    {
        var u = await db.Users.FindAsync(userId) ?? throw new KeyNotFoundException("Không tìm thấy người dùng");
        u.FullName = req.FullName;
        u.Phone = req.Phone;
        u.AvatarUrl = req.AvatarUrl;

        var tp = await db.TenantProfiles
            .Include(t => t.Room).ThenInclude(r => r!.Zone)
            .FirstOrDefaultAsync(t => t.UserId == userId);

        if (tp == null && (req.Cccd != null || req.Hometown != null || req.CccdFrontUrl != null || req.CccdBackUrl != null || u.Role == Core.Enums.UserRole.Tenant))
        {
            tp = new Core.Entities.TenantProfile
            {
                UserId = userId,
                CCCD = req.Cccd ?? string.Empty,
                Hometown = req.Hometown,
                CccdFrontUrl = req.CccdFrontUrl,
                CccdBackUrl = req.CccdBackUrl
            };
            db.TenantProfiles.Add(tp);
        }
        else if (tp != null)
        {
            if (req.Cccd != null) tp.CCCD = req.Cccd;
            if (req.Hometown != null) tp.Hometown = req.Hometown;
            if (req.CccdFrontUrl != null) tp.CccdFrontUrl = req.CccdFrontUrl;
            if (req.CccdBackUrl != null) tp.CccdBackUrl = req.CccdBackUrl;
        }

        await db.SaveChangesAsync();

        return new UserProfileDto(
            u.Id,
            u.FullName,
            u.Email,
            u.Phone,
            u.AvatarUrl,
            u.Role.ToString(),
            u.CreatedAt,
            tp?.VehicleCount ?? 0,
            tp?.VehicleInfo,
            tp?.CCCD,
            tp?.Hometown,
            tp?.Room?.RoomNumber,
            tp?.Room?.Zone?.Name,
            tp?.CccdFrontUrl,
            tp?.CccdBackUrl
        );
    }

    // Đổi mật khẩu người dùng (xác thực mật khẩu cũ bằng BCrypt trước khi cập nhật mật khẩu mới).
    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest req)
    {
        if (req.NewPassword != req.ConfirmPassword) throw new InvalidOperationException("Mật khẩu xác nhận không khớp");
        var u = await db.Users.FindAsync(userId) ?? throw new KeyNotFoundException("Không tìm thấy người dùng");
        if (!BCrypt.Net.BCrypt.Verify(req.OldPassword, u.PasswordHash)) throw new UnauthorizedAccessException("Mật khẩu cũ không đúng");
        u.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await db.SaveChangesAsync();
    }

    // Cập nhật thông tin xe cộ đăng ký của khách thuê (Số lượng xe & Biển số xe)
    public async Task<TenantDto> UpdateVehicleInfoAsync(Guid userId, UpdateVehicleRequest req)
    {
        var profile = await db.TenantProfiles
            .Include(t => t.User)
            .Include(t => t.Room).ThenInclude(r => r!.Zone)
            .Include(t => t.Contracts)
            .FirstOrDefaultAsync(t => t.UserId == userId)
            ?? throw new KeyNotFoundException("Hồ sơ khách thuê không tồn tại");

        profile.VehicleCount = req.VehicleCount >= 0 ? req.VehicleCount : 0;
        profile.VehicleInfo = req.VehicleInfo;

        await db.SaveChangesAsync();
        var activeContract = profile.Contracts.FirstOrDefault(c => c.Status == Core.Enums.ContractStatus.Active);
        return new TenantDto(
            profile.Id,
            profile.UserId,
            profile.User?.FullName ?? "",
            profile.User?.Email ?? "",
            profile.User?.Phone ?? "",
            profile.User?.AvatarUrl,
            profile.CCCD,
            profile.Hometown,
            profile.MoveInDate,
            profile.Deposit,
            profile.RoomId,
            profile.Room?.RoomNumber,
            profile.Room?.Zone?.Name,
            profile.CccdFrontUrl,
            profile.CccdBackUrl,
            activeContract?.ContractCode,
            profile.VehicleCount,
            profile.VehicleInfo
        );
    }
}
