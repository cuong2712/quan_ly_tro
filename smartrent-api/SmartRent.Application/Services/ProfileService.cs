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
        var u = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (u is null) return null;

        var tp = await db.TenantProfiles
            .AsNoTracking()
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
            tp?.CccdBackUrl,
            u.BankName,
            u.BankAccountNumber,
            u.BankAccountName
        );
    }

    // Lấy riêng thông tin đăng ký xe của khách thuê
    public async Task<UpdateVehicleRequest> GetVehicleInfoAsync(Guid userId)
    {
        var tp = await db.TenantProfiles.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == userId)
            ?? throw new KeyNotFoundException("Hồ sơ khách thuê không tồn tại");

        return new UpdateVehicleRequest(tp.VehicleCount, tp.VehicleInfo);
    }

    // Cập nhật thông tin cá nhân (Họ tên, Số điện thoại, Ảnh đại diện, CCCD, Tài khoản ngân hàng).
    public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest req)
    {
        var u = await db.Users.FindAsync(userId) ?? throw new KeyNotFoundException("Không tìm thấy người dùng");

        // 1. Kiểm tra họ và tên (chỉ gồm chữ cái và khoảng trắng, không có số và ký tự đặc biệt)
        if (string.IsNullOrWhiteSpace(req.FullName) || req.FullName.Trim().Length < 2)
        {
            throw new InvalidOperationException("Họ và tên không được để trống (tối thiểu 2 ký tự).");
        }
        if (!System.Text.RegularExpressions.Regex.IsMatch(req.FullName.Trim(), @"^[\p{L}\s]+$"))
        {
            throw new InvalidOperationException("Họ và tên không hợp lệ! Tên chỉ được chứa chữ cái, không được chứa số hoặc ký tự đặc biệt.");
        }

        // 2. Kiểm tra số điện thoại (đúng 10 chữ số và bắt đầu bằng số 0)
        if (string.IsNullOrWhiteSpace(req.Phone) || !System.Text.RegularExpressions.Regex.IsMatch(req.Phone.Trim(), @"^0\d{9}$"))
        {
            throw new InvalidOperationException("Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 chữ số và bắt đầu bằng số 0.");
        }

        // 3. Kiểm tra số CCCD nếu có nhập (đúng 12 chữ số và bắt đầu bằng số 0)
        if (!string.IsNullOrWhiteSpace(req.Cccd) && !System.Text.RegularExpressions.Regex.IsMatch(req.Cccd.Trim(), @"^0\d{11}$"))
        {
            throw new InvalidOperationException("Số CCCD không hợp lệ! Vui lòng nhập đúng 12 chữ số và bắt đầu bằng số 0.");
        }

        // 4. Kiểm tra Tên chủ tài khoản ngân hàng nếu có nhập (chỉ gồm chữ cái, không có số và ký tự đặc biệt)
        if (!string.IsNullOrWhiteSpace(req.BankAccountName))
        {
            var cleanBankAccName = req.BankAccountName.Trim();
            if (cleanBankAccName.Length < 2 || !System.Text.RegularExpressions.Regex.IsMatch(cleanBankAccName, @"^[\p{L}\s]+$"))
            {
                throw new InvalidOperationException("Tên chủ tài khoản ngân hàng không hợp lệ! Tên chỉ được chứa chữ cái, không được chứa số hoặc ký tự đặc biệt.");
            }
        }

        // 5. Kiểm tra Số tài khoản ngân hàng nếu có nhập (chỉ gồm chữ số từ 6 đến 20 số)
        if (!string.IsNullOrWhiteSpace(req.BankAccountNumber))
        {
            var cleanBankAccNum = req.BankAccountNumber.Trim();
            if (!System.Text.RegularExpressions.Regex.IsMatch(cleanBankAccNum, @"^\d{6,20}$"))
            {
                throw new InvalidOperationException("Số tài khoản ngân hàng không hợp lệ! Số tài khoản chỉ gồm các chữ số (từ 6 đến 20 số).");
            }
        }

        u.FullName = req.FullName.Trim();
        u.Phone = req.Phone.Trim();
        u.AvatarUrl = req.AvatarUrl;

        // Cập nhật thông tin ngân hàng của chủ trọ (nếu có)
        if (req.BankName != null) u.BankName = req.BankName.Trim();
        if (req.BankAccountNumber != null) u.BankAccountNumber = req.BankAccountNumber.Trim();
        if (req.BankAccountName != null) u.BankAccountName = req.BankAccountName.Trim().ToUpper();

        var tp = await db.TenantProfiles
            .Include(t => t.Room).ThenInclude(r => r!.Zone)
            .FirstOrDefaultAsync(t => t.UserId == userId);

        if (tp == null && (req.Cccd != null || req.Hometown != null || req.CccdFrontUrl != null || req.CccdBackUrl != null || u.Role == Core.Enums.UserRole.Tenant || u.Role == Core.Enums.UserRole.Landlord))
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
            tp?.CccdBackUrl,
            u.BankName,
            u.BankAccountNumber,
            u.BankAccountName
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
        int count = req.VehicleCount >= 0 ? req.VehicleCount : 0;
        string? info = req.VehicleInfo?.Trim();

        if (count > 0)
        {
            if (string.IsNullOrWhiteSpace(info))
            {
                throw new ArgumentException($"Bạn đã đăng ký {count} xe, vui lòng nhập đầy đủ biển số cho {count} xe.");
            }

            var plates = info.Split(new[] { ',', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                             .Select(p => p.Trim())
                             .Where(p => !string.IsNullOrEmpty(p))
                             .ToList();

            if (plates.Count < count)
            {
                throw new ArgumentException($"Bạn đã đăng ký {count} xe nhưng mới chỉ nhập {plates.Count} biển số. Vui lòng nhập đủ {count} biển số xe.");
            }
        }
        else
        {
            info = null;
        }

        profile.VehicleCount = count;
        profile.VehicleInfo = info;

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
