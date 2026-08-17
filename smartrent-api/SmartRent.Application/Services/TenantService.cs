using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Hồ sơ Khách thuê (Tạo tài khoản khách thuê, chuyển phòng, cập nhật giấy tờ CCCD, xóa dữ liệu).
public class TenantService(AppDbContext db)
{
    // Lấy danh sách tất cả người thuê thuộc quyền quản lý của Chủ trọ (hỗ trợ phân trang).
    public async Task<object> GetByLandlordAsync(Guid landlordId, int? page = null, int? pageSize = null)
    {
        var query = db.TenantProfiles
            .Include(t => t.User)
            .Include(t => t.Room).ThenInclude(r => r!.Zone)
            .Include(t => t.Contracts)
            .Where(t => (t.Room != null && t.Room.Zone.LandlordId == landlordId) || t.Contracts.Any(c => c.Room.Zone.LandlordId == landlordId));
        var totalItems = await query.CountAsync();
        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            var items = await query.OrderByDescending(t => t.MoveInDate)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = items.Select(MapTenant);
            return PagedResult<TenantDto>.Create(dtos, totalItems, p, ps);
        }
        var tenants = await query.OrderByDescending(t => t.MoveInDate).ToListAsync();
        return tenants.Select(MapTenant);
    }

    // Lấy thông tin chi tiết người thuê theo ID hồ sơ (TenantProfileId), bảo đảm thuộc quyền quản lý của Chủ trọ.
    public async Task<TenantDto?> GetByIdAsync(Guid id, Guid landlordId)
    {
        var t = await db.TenantProfiles
            .Include(t => t.User)
            .Include(t => t.Room).ThenInclude(r => r!.Zone)
            .Include(t => t.Contracts)
            .FirstOrDefaultAsync(t => t.Id == id && ((t.Room != null && t.Room.Zone.LandlordId == landlordId) || t.Contracts.Any(c => c.Room.Zone.LandlordId == landlordId)));
        return t is null ? null : MapTenant(t);
    }

    // Lấy thông tin hồ sơ người thuê theo ID tài khoản đăng nhập (UserId).
    public async Task<TenantDto?> GetByUserIdAsync(Guid userId)
    {
        var t = await db.TenantProfiles.Include(t => t.User).Include(t => t.Room).ThenInclude(r => r!.Zone)
            .Include(t => t.Contracts).FirstOrDefaultAsync(t => t.UserId == userId);
        return t is null ? null : MapTenant(t);
    }

    // Tạo mới một tài khoản và hồ sơ Khách thuê (gán phòng, kiểm tra sức chứa tối đa của phòng).
    public async Task<TenantDto> CreateAsync(Guid landlordId, CreateTenantRequest req)
    {
        var room = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == req.RoomId && r.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Phòng không tồn tại hoặc không thuộc khu của bạn");

        if (room.Status == RoomStatus.Locked || room.Status == RoomStatus.Maintenance)
            throw new InvalidOperationException($"Phòng {room.RoomNumber} đang ở trạng thái bảo trì hoặc khóa, không thể thêm người ở mới.");

        var currentTenantsCount = await db.TenantProfiles.CountAsync(t => t.RoomId == req.RoomId);
        if (currentTenantsCount >= room.MaxTenants)
            throw new InvalidOperationException($"Phòng {room.RoomNumber} đã đạt sức chứa tối đa ({room.MaxTenants} người). Vui lòng chọn phòng khác.");

        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            throw new InvalidOperationException("Email đã tồn tại trong hệ thống");

        var password = string.IsNullOrWhiteSpace(req.Password) ? "Tenant@123456" : req.Password;
        var user = new User { Email = req.Email, PasswordHash = BCrypt.Net.BCrypt.HashPassword(password), FullName = req.FullName, Phone = req.Phone, Role = UserRole.Tenant };
        db.Users.Add(user);

        var profile = new TenantProfile
        {
            UserId = user.Id,
            RoomId = req.RoomId,
            CCCD = req.CCCD,
            Hometown = req.Hometown,
            MoveInDate = req.MoveInDate,
            Deposit = req.Deposit,
            CccdFrontUrl = req.CccdFrontUrl,
            CccdBackUrl = req.CccdBackUrl,
            VehicleCount = req.VehicleCount,
            VehicleInfo = req.VehicleInfo
        };
        db.TenantProfiles.Add(profile);

        room.Status = RoomStatus.Occupied;
        await db.SaveChangesAsync();
        profile.User = user; profile.Room = room;
        return MapTenant(profile);
    }

    // Cập nhật thông tin người thuê (đổi tên, SĐT, quê quán, ảnh CCCD, chuyển sang phòng mới).
    public async Task<TenantDto> UpdateAsync(Guid id, Guid landlordId, UpdateTenantRequest req)
    {
        var t = await db.TenantProfiles.Include(t => t.User).Include(t => t.Room).ThenInclude(r => r!.Zone).Include(t => t.Contracts)
            .FirstOrDefaultAsync(t => t.Id == id && ((t.Room != null && t.Room.Zone.LandlordId == landlordId) || t.Contracts.Any(c => c.Room.Zone.LandlordId == landlordId)))
            ?? throw new KeyNotFoundException("Không tìm thấy khách thuê hoặc bạn không có quyền thao tác.");

        t.User.FullName = req.FullName; t.User.Phone = req.Phone; t.Hometown = req.Hometown;
        t.VehicleCount = req.VehicleCount;
        if (!string.IsNullOrEmpty(req.VehicleInfo)) t.VehicleInfo = req.VehicleInfo;
        if (!string.IsNullOrEmpty(req.CccdFrontUrl)) t.CccdFrontUrl = req.CccdFrontUrl;
        if (!string.IsNullOrEmpty(req.CccdBackUrl)) t.CccdBackUrl = req.CccdBackUrl;

        if (req.RoomId.HasValue && t.RoomId != req.RoomId.Value)
        {
            var newRoom = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == req.RoomId.Value && r.Zone.LandlordId == landlordId)
                ?? throw new KeyNotFoundException("Phòng chuyển đến không tồn tại hoặc không thuộc quyền quản lý của bạn.");

            if (t.RoomId.HasValue)
            {
                var oldRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Id == t.RoomId.Value);
                if (oldRoom != null)
                {
                    var otherCount = await db.TenantProfiles.CountAsync(other => other.RoomId == oldRoom.Id && other.Id != t.Id);
                    if (otherCount == 0) oldRoom.Status = RoomStatus.Vacant;
                }
            }
            t.RoomId = req.RoomId.Value;
            newRoom.Status = RoomStatus.Occupied;
        }

        await db.SaveChangesAsync();
        return MapTenant(t);
    }

    // Xóa hồ sơ khách thuê và xóa liên quan (hợp đồng, hóa đơn, sự cố, giải phóng phòng nếu trống).
    public async Task<bool> DeleteAsync(Guid id, Guid landlordId)
    {
        var t = await db.TenantProfiles.Include(t => t.Room).ThenInclude(r => r!.Zone).Include(t => t.Contracts).ThenInclude(c => c.Room).ThenInclude(r => r.Zone)
            .FirstOrDefaultAsync(t => t.Id == id && ((t.Room != null && t.Room.Zone.LandlordId == landlordId) || t.Contracts.Any(c => c.Room.Zone.LandlordId == landlordId)));
        if (t is null) return false;

        // 1. Release room status if no remaining tenants
        if (t.RoomId.HasValue)
        {
            var otherTenantsCount = await db.TenantProfiles.CountAsync(other => other.RoomId == t.RoomId.Value && other.Id != t.Id);
            if (otherTenantsCount == 0 && t.Room != null)
            {
                t.Room.Status = RoomStatus.Vacant;
            }
        }

        // 2. Cascade delete all contracts belonging to this tenant profile
        var tenantContracts = await db.Contracts.Where(c => c.TenantProfileId == id).ToListAsync();
        if (tenantContracts.Any())
        {
            db.Contracts.RemoveRange(tenantContracts);
        }

        // 3. Cascade delete invoices & maintenance requests for this tenant
        var tenantInvoices = await db.Invoices.Where(i => i.TenantProfileId == id).ToListAsync();
        if (tenantInvoices.Any())
        {
            db.Invoices.RemoveRange(tenantInvoices);
        }

        var tenantMaintenance = await db.MaintenanceRequests.Where(m => m.TenantProfileId == id).ToListAsync();
        if (tenantMaintenance.Any())
        {
            db.MaintenanceRequests.RemoveRange(tenantMaintenance);
        }

        // 4. Remove TenantProfile & User account
        var user = await db.Users.FindAsync(t.UserId);
        db.TenantProfiles.Remove(t);
        if (user != null)
        {
            db.Users.Remove(user);
        }

        await db.SaveChangesAsync();
        return true;
    }

    private static TenantDto MapTenant(TenantProfile t) => new(
        t.Id,
        t.UserId,
        t.User?.FullName ?? "",
        t.User?.Email ?? "",
        t.User?.Phone ?? "",
        t.User?.AvatarUrl,
        t.CCCD,
        t.Hometown,
        t.MoveInDate,
        t.Deposit,
        t.RoomId,
        t.Room?.RoomNumber,
        t.Room?.Zone?.Name,
        t.CccdFrontUrl,
        t.CccdBackUrl,
        t.Contracts.FirstOrDefault(c => c.Status == ContractStatus.Active)?.ContractCode,
        t.VehicleCount,
        t.VehicleInfo
    );
}
