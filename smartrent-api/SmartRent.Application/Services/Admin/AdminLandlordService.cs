using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Admin;

// Phân hệ Quản lý tài khoản Chủ trọ dành cho Super Admin.
public class AdminLandlordService(AppDbContext db)
{
    // Lấy danh sách tài khoản chủ trọ với bộ lọc tìm kiếm theo tên/email/sĐT và trạng thái hoạt động.
    public async Task<IEnumerable<LandlordListDto>> GetLandlordsAsync(string? search = null, bool? isActive = null)
    {
        var query = db.Users.AsNoTracking().Include(u => u.TenantProfile).Where(u => u.Role == UserRole.Landlord).AsQueryable();
        if (!string.IsNullOrEmpty(search))
            query = query.Where(u => u.FullName.Contains(search) || u.Email.Contains(search) || u.Phone.Contains(search));
        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        var users = await query.ToListAsync();
        var result = new List<LandlordListDto>();
        foreach (var u in users)
        {
            var zonesCount = await db.Zones.CountAsync(z => z.LandlordId == u.Id);
            var roomsCount = await db.Rooms.CountAsync(r => r.Zone.LandlordId == u.Id);
            result.Add(new LandlordListDto(
                u.Id, u.FullName, u.Email, u.Phone, u.AvatarUrl, u.IsActive, u.Role.ToString(),
                zonesCount, roomsCount, u.CreatedAt,
                u.TenantProfile?.CCCD, u.TenantProfile?.Hometown,
                u.TenantProfile?.CccdFrontUrl, u.TenantProfile?.CccdBackUrl
            ));
        }
        return result;
    }

    // Tạo mới một tài khoản Chủ trọ.
    public async Task<LandlordListDto> CreateLandlordAsync(CreateLandlordRequest request)
    {
        SmartRent.Application.Common.Validators.DataValidator.ValidateFullName(request.FullName, "Họ và tên chủ trọ");
        SmartRent.Application.Common.Validators.DataValidator.ValidatePhone(request.Phone, "Số điện thoại");
        SmartRent.Application.Common.Validators.DataValidator.ValidateEmail(request.Email, true, "Email");
        SmartRent.Application.Common.Validators.DataValidator.ValidateCccd(request.CCCD, true, "Số CCCD");

        if (await db.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email đã tồn tại trong hệ thống");

        if (string.IsNullOrWhiteSpace(request.CCCD))
            throw new InvalidOperationException("Vui lòng nhập số Căn cước công dân (CCCD) của chủ trọ");

        var cleanCccd = request.CCCD.Trim();
        if (await db.TenantProfiles.AnyAsync(tp => tp.CCCD == cleanCccd))
            throw new InvalidOperationException($"Số CCCD {cleanCccd} đã được đăng ký trong hệ thống");

        var user = new User
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            Phone = request.Phone,
            Role = UserRole.Landlord,
            AvatarUrl = request.AvatarUrl,
            IsActive = true
        };
        db.Users.Add(user);

        var profile = new TenantProfile
        {
            UserId = user.Id,
            CCCD = cleanCccd,
            Hometown = request.Hometown,
            CccdFrontUrl = request.CccdFrontUrl,
            CccdBackUrl = request.CccdBackUrl
        };
        db.TenantProfiles.Add(profile);

        await db.SaveChangesAsync();
        return new LandlordListDto(
            user.Id, user.FullName, user.Email, user.Phone, user.AvatarUrl, user.IsActive, user.Role.ToString(),
            0, 0, user.CreatedAt,
            profile.CCCD, profile.Hometown, profile.CccdFrontUrl, profile.CccdBackUrl
        );
    }

    // Cập nhật thông tin cá nhân của tài khoản Chủ trọ.
    public async Task<LandlordListDto> UpdateLandlordAsync(Guid id, UpdateLandlordRequest request)
    {
        SmartRent.Application.Common.Validators.DataValidator.ValidateFullName(request.FullName, "Họ và tên chủ trọ");
        SmartRent.Application.Common.Validators.DataValidator.ValidatePhone(request.Phone, "Số điện thoại");
        SmartRent.Application.Common.Validators.DataValidator.ValidateCccd(request.CCCD, false, "Số CCCD");

        var user = await db.Users.Include(u => u.TenantProfile).FirstOrDefaultAsync(u => u.Id == id) 
            ?? throw new KeyNotFoundException("Không tìm thấy chủ trọ");
        user.FullName = request.FullName;
        user.Phone = request.Phone;
        if (request.AvatarUrl != null) user.AvatarUrl = request.AvatarUrl;

        if (!string.IsNullOrWhiteSpace(request.CCCD))
        {
            var cleanCccd = request.CCCD.Trim();
            var duplicateCccd = await db.TenantProfiles.AnyAsync(tp => tp.CCCD == cleanCccd && tp.UserId != id);
            if (duplicateCccd)
                throw new InvalidOperationException($"Số CCCD {cleanCccd} đã được sử dụng bởi tài khoản khác");

            if (user.TenantProfile == null)
            {
                user.TenantProfile = new TenantProfile
                {
                    UserId = user.Id,
                    CCCD = cleanCccd,
                    Hometown = request.Hometown,
                    CccdFrontUrl = request.CccdFrontUrl,
                    CccdBackUrl = request.CccdBackUrl
                };
                db.TenantProfiles.Add(user.TenantProfile);
            }
            else
            {
                user.TenantProfile.CCCD = cleanCccd;
                if (request.Hometown != null) user.TenantProfile.Hometown = request.Hometown;
                if (request.CccdFrontUrl != null) user.TenantProfile.CccdFrontUrl = request.CccdFrontUrl;
                if (request.CccdBackUrl != null) user.TenantProfile.CccdBackUrl = request.CccdBackUrl;
            }
        }
        else if (user.TenantProfile != null)
        {
            if (request.Hometown != null) user.TenantProfile.Hometown = request.Hometown;
            if (request.CccdFrontUrl != null) user.TenantProfile.CccdFrontUrl = request.CccdFrontUrl;
            if (request.CccdBackUrl != null) user.TenantProfile.CccdBackUrl = request.CccdBackUrl;
        }

        await db.SaveChangesAsync();
        var zones = await db.Zones.CountAsync(z => z.LandlordId == id);
        var rooms = await db.Rooms.CountAsync(r => r.Zone.LandlordId == id);
        return new LandlordListDto(
            user.Id, user.FullName, user.Email, user.Phone, user.AvatarUrl, user.IsActive, user.Role.ToString(),
            zones, rooms, user.CreatedAt,
            user.TenantProfile?.CCCD, user.TenantProfile?.Hometown,
            user.TenantProfile?.CccdFrontUrl, user.TenantProfile?.CccdBackUrl
        );
    }

    // Khóa hoặc mở khóa tài khoản của Chủ trọ.
    public async Task ToggleLockAsync(Guid id)
    {
        var user = await db.Users.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy chủ trọ");
        user.IsActive = !user.IsActive;
        await db.SaveChangesAsync();
    }

    // Đặt lại mật khẩu tài khoản Chủ trọ về mật khẩu mặc định hoặc mật khẩu mới.
    public async Task ResetPasswordAsync(Guid id, string newPassword = "SmartRent@2026")
    {
        var user = await db.Users.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy chủ trọ");
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await db.SaveChangesAsync();
    }
}

