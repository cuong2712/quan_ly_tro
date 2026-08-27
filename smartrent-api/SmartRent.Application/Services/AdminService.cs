using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý dành riêng cho Super Admin: Xem thống kê hệ thống, quản lý tài khoản chủ trọ, xử lý góp ý.
public class AdminService(AppDbContext db)
{
    // Lấy tổng quan các chỉ số thống kê của toàn bộ hệ thống (Số chủ trọ, khách thuê, khu trọ, phòng, doanh thu...).
    public async Task<SystemStatsDto> GetSystemStatsAsync()
    {
        var landlords = await db.Users.CountAsync(u => u.Role == UserRole.Landlord);
        var tenants = await db.Users.CountAsync(u => u.Role == UserRole.Tenant);
        var zones = await db.Zones.CountAsync();
        var rooms = await db.Rooms.CountAsync();
        var occupied = await db.Rooms.CountAsync(r => r.Status == RoomStatus.Occupied);
        var vacant = await db.Rooms.CountAsync(r => r.Status == RoomStatus.Vacant);
        var revenue = await db.Payments.Where(p => p.Status == PaymentStatus.Completed).SumAsync(p => p.Amount);
        var invoices = await db.Invoices.CountAsync();

        return new SystemStatsDto(
            landlords, tenants, zones, rooms, occupied, vacant, revenue, invoices,
            rooms > 0 ? Math.Round((decimal)occupied / rooms * 100, 1) : 0,
            rooms > 0 ? Math.Round((decimal)vacant / rooms * 100, 1) : 0
        );
    }

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

        var user = await db.Users.Include(u => u.TenantProfile).FirstOrDefaultAsync(u => u.Id == id) ?? throw new KeyNotFoundException("Không tìm thấy chủ trọ");
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

    // Lấy danh sách tất cả các góp ý/khiếu nại gửi tới Admin.
    public async Task<IEnumerable<ComplaintDto>> GetComplaintsAsync()
    {
        var complaints = await db.Complaints.AsNoTracking().Include(c => c.Sender).OrderByDescending(c => c.CreatedAt).ToListAsync();
        return complaints.Select(c => new ComplaintDto(c.Id, c.Sender.FullName, c.Sender.Email, c.Sender.Role.ToString(),
            c.Title, c.Content, c.Status.ToString(), c.Reply, c.CreatedAt, c.RepliedAt));
    }

    // Phản hồi thông tin góp ý/khiếu nại của người dùng.
    public async Task<ComplaintDto> ReplyComplaintAsync(Guid id, ReplyComplaintRequest request)
    {
        var complaint = await db.Complaints.Include(c => c.Sender).FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy phản hồi");
        complaint.Reply = request.Reply;
        complaint.Status = ComplaintStatus.Resolved;
        complaint.RepliedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return new ComplaintDto(complaint.Id, complaint.Sender.FullName, complaint.Sender.Email, complaint.Sender.Role.ToString(),
            complaint.Title, complaint.Content, complaint.Status.ToString(), complaint.Reply, complaint.CreatedAt, complaint.RepliedAt);
    }

    // Cập nhật trạng thái xử lý của góp ý/khiếu nại.
    public async Task UpdateComplaintStatusAsync(Guid id, string status)
    {
        var complaint = await db.Complaints.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy phản hồi");
        complaint.Status = Enum.Parse<ComplaintStatus>(status);
        await db.SaveChangesAsync();
    }

    // ==========================================
    // QUẢN TRỊ KHÁCH THUÊ (TENANT MANAGEMENT FOR SUPERADMIN)
    // ==========================================

    // Lấy danh sách toàn bộ khách thuê trong hệ thống với bộ lọc nâng cao
    public async Task<object> GetTenantsAsync(
        string? search = null,
        bool? isActive = null,
        Guid? landlordId = null,
        string? rentStatus = null, // "renting", "vacated", "all"
        int? page = null,
        int? pageSize = null)
    {
        var query = db.TenantProfiles
            .AsNoTracking()
            .Include(t => t.User)
            .Include(t => t.Room).ThenInclude(r => r!.Zone).ThenInclude(z => z.Landlord)
            .Include(t => t.Contracts)
            .Where(t => t.User != null && t.User.Role == UserRole.Tenant)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(t =>
                (t.User != null && (t.User.FullName.Contains(s) || t.User.Email.Contains(s) || t.User.Phone.Contains(s))) ||
                (t.CCCD != null && t.CCCD.Contains(s)) ||
                (t.Hometown != null && t.Hometown.Contains(s)) ||
                (t.Room != null && t.Room.RoomNumber.Contains(s)) ||
                (t.Room != null && t.Room.Zone != null && t.Room.Zone.Name.Contains(s)) ||
                (t.Room != null && t.Room.Zone != null && t.Room.Zone.Landlord != null && t.Room.Zone.Landlord.FullName.Contains(s))
            );
        }

        if (isActive.HasValue)
        {
            query = query.Where(t => t.User != null && t.User.IsActive == isActive.Value);
        }

        if (landlordId.HasValue && landlordId.Value != Guid.Empty)
        {
            query = query.Where(t => t.Room != null && t.Room.Zone.LandlordId == landlordId.Value);
        }

        if (!string.IsNullOrWhiteSpace(rentStatus))
        {
            var rs = rentStatus.Trim().ToLower();
            if (rs == "renting")
                query = query.Where(t => t.RoomId != null);
            else if (rs == "vacated")
                query = query.Where(t => t.RoomId == null);
        }

        var totalItems = await query.CountAsync();
        List<TenantProfile> profiles;

        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            profiles = await query.OrderByDescending(t => t.CreatedAt)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
        }
        else
        {
            profiles = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
        }

        var profileIds = profiles.Select(t => t.Id).ToList();
        var roomIds = profiles.Where(t => t.RoomId != null).Select(t => t.RoomId!.Value).Distinct().ToList();

        // 1. Lấy hóa đơn unpaid theo tenant an toàn
        var unpaidInvoicesList = await db.Invoices
            .AsNoTracking()
            .Where(i => profileIds.Contains(i.TenantProfileId) && i.Status == InvoiceStatus.Unpaid)
            .GroupBy(i => i.TenantProfileId)
            .Select(g => new { TenantProfileId = g.Key, Count = g.Count(), Total = g.Sum(x => x.TotalAmount) })
            .ToListAsync();
        var unpaidInvoicesGroup = unpaidInvoicesList.ToDictionary(x => x.TenantProfileId, x => x);

        // 2. Lấy các hợp đồng active theo phòng an toàn không gây trùng Key
        var activeContractsList = await db.Contracts
            .AsNoTracking()
            .Where(c => roomIds.Contains(c.RoomId) && (c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested))
            .ToListAsync();
        var activeContractsMap = activeContractsList
            .GroupBy(c => c.RoomId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.CreatedAt).First());

        var dtos = profiles.Select(t =>
        {
            var hasUnpaid = unpaidInvoicesGroup.TryGetValue(t.Id, out var unpaid);
            var unpaidCount = hasUnpaid ? unpaid!.Count : 0;
            var unpaidTotal = hasUnpaid ? unpaid!.Total : 0m;

            var activeContract = t.RoomId != null && activeContractsMap.TryGetValue(t.RoomId.Value, out var ac) ? ac : null;
            var isPrimary = activeContract != null && activeContract.TenantProfileId == t.Id;
            var activeCode = activeContract?.ContractCode ?? t.Contracts.FirstOrDefault(c => c.Status == ContractStatus.Active)?.ContractCode;

            return new AdminTenantListDto(
                t.Id,
                t.UserId,
                t.User?.FullName ?? "N/A",
                t.User?.Email ?? "N/A",
                t.User?.Phone ?? "N/A",
                t.User?.AvatarUrl,
                t.User?.IsActive ?? true,
                t.RoomId,
                t.Room?.RoomNumber,
                t.Room?.Zone?.Name,
                t.Room?.Zone?.LandlordId,
                t.Room?.Zone?.Landlord?.FullName,
                t.CCCD,
                t.Hometown,
                t.CccdFrontUrl,
                t.CccdBackUrl,
                t.MoveInDate,
                t.Deposit,
                activeCode,
                isPrimary,
                unpaidCount,
                unpaidTotal,
                t.VehicleCount,
                t.VehicleInfo,
                t.CreatedAt
            );
        }).ToList();

        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            return PagedResult<AdminTenantListDto>.Create(dtos, totalItems, page.Value, pageSize.Value);
        }

        return dtos;
    }

    // Lấy chi tiết hồ sơ khách thuê kèm toàn bộ lịch sử hợp đồng và hóa đơn
    public async Task<AdminTenantDetailDto> GetTenantDetailAsync(Guid tenantProfileId)
    {
        var t = await db.TenantProfiles
            .AsNoTracking()
            .Include(t => t.User)
            .Include(t => t.Room).ThenInclude(r => r!.Zone).ThenInclude(z => z.Landlord)
            .Include(t => t.Contracts).ThenInclude(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .FirstOrDefaultAsync(t => t.Id == tenantProfileId || t.UserId == tenantProfileId)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ khách thuê");

        var contracts = t.Contracts.OrderByDescending(c => c.CreatedAt).Select(c => new AdminTenantContractDto(
            c.Id,
            c.ContractCode,
            c.Room?.RoomNumber ?? "",
            c.Room?.Zone?.Name ?? "",
            c.Room?.Zone?.Landlord?.FullName ?? "",
            c.StartDate,
            c.EndDate,
            c.RentAmount,
            c.Deposit,
            c.Status.ToString(),
            c.CreatedAt
        )).ToList();

        var unpaidInvoices = await db.Invoices
            .AsNoTracking()
            .Where(i => i.TenantProfileId == t.Id && i.Status == InvoiceStatus.Unpaid)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new AdminTenantInvoiceDto(
                i.Id,
                i.InvoiceCode,
                i.Month,
                i.TotalAmount,
                i.Status.ToString(),
                i.DueDate,
                i.PaidDate,
                i.CreatedAt
            )).ToListAsync();

        var isPrimary = false;
        if (t.RoomId != null)
        {
            isPrimary = await db.Contracts.AnyAsync(c =>
                c.RoomId == t.RoomId.Value &&
                c.TenantProfileId == t.Id &&
                (c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested));
        }

        return new AdminTenantDetailDto(
            t.Id,
            t.UserId,
            t.User?.FullName ?? "N/A",
            t.User?.Email ?? "N/A",
            t.User?.Phone ?? "N/A",
            t.User?.AvatarUrl,
            t.User?.IsActive ?? true,
            t.RoomId,
            t.Room?.RoomNumber,
            t.Room?.Zone?.Name,
            t.Room?.Zone?.LandlordId,
            t.Room?.Zone?.Landlord?.FullName,
            t.Room?.Zone?.Landlord?.Phone,
            t.CCCD,
            t.Hometown,
            t.CccdFrontUrl,
            t.CccdBackUrl,
            t.MoveInDate,
            t.Deposit,
            t.VehicleCount,
            t.VehicleInfo,
            isPrimary,
            contracts,
            unpaidInvoices,
            t.CreatedAt
        );
    }

    // Khóa hoặc mở khóa tài khoản của Khách thuê
    public async Task ToggleLockTenantAsync(Guid tenantProfileId)
    {
        var tenant = await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == tenantProfileId || t.UserId == tenantProfileId)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ khách thuê");

        if (tenant.User == null)
            throw new KeyNotFoundException("Không tìm thấy tài khoản người dùng của khách thuê");

        tenant.User.IsActive = !tenant.User.IsActive;
        await db.SaveChangesAsync();
    }

    // Đặt lại mật khẩu tài khoản Khách thuê về mật khẩu mặc định hoặc mới
    public async Task ResetTenantPasswordAsync(Guid tenantProfileId, string newPassword = "Tenant@2026")
    {
        var tenant = await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == tenantProfileId || t.UserId == tenantProfileId)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ khách thuê");

        if (tenant.User == null)
            throw new KeyNotFoundException("Không tìm thấy tài khoản người dùng của khách thuê");

        tenant.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await db.SaveChangesAsync();
    }
}

