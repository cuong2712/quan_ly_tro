using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;
using BCrypt.Net;

namespace SmartRent.Application.Services;

public class AdminService(AppDbContext db)
{
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

        return new SystemStatsDto(landlords, tenants, zones, rooms, occupied, vacant, revenue, invoices,
            rooms > 0 ? Math.Round((decimal)occupied / rooms * 100, 1) : 0,
            rooms > 0 ? Math.Round((decimal)vacant / rooms * 100, 1) : 0);
    }

    public async Task<IEnumerable<LandlordListDto>> GetLandlordsAsync(string? search = null, bool? isActive = null)
    {
        var query = db.Users.Where(u => u.Role == UserRole.Landlord).AsQueryable();
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
            result.Add(new LandlordListDto(u.Id, u.FullName, u.Email, u.Phone, u.AvatarUrl, u.IsActive, u.Role.ToString(), zonesCount, roomsCount, u.CreatedAt));
        }
        return result;
    }

    public async Task<LandlordListDto> CreateLandlordAsync(CreateLandlordRequest request)
    {
        if (await db.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email đã tồn tại trong hệ thống");

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
        await db.SaveChangesAsync();
        return new LandlordListDto(user.Id, user.FullName, user.Email, user.Phone, user.AvatarUrl, user.IsActive, user.Role.ToString(), 0, 0, user.CreatedAt);
    }

    public async Task<LandlordListDto> UpdateLandlordAsync(Guid id, UpdateLandlordRequest request)
    {
        var user = await db.Users.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy chủ trọ");
        user.FullName = request.FullName;
        user.Phone = request.Phone;
        user.AvatarUrl = request.AvatarUrl;
        await db.SaveChangesAsync();
        var zones = await db.Zones.CountAsync(z => z.LandlordId == id);
        var rooms = await db.Rooms.CountAsync(r => r.Zone.LandlordId == id);
        return new LandlordListDto(user.Id, user.FullName, user.Email, user.Phone, user.AvatarUrl, user.IsActive, user.Role.ToString(), zones, rooms, user.CreatedAt);
    }

    public async Task ToggleLockAsync(Guid id)
    {
        var user = await db.Users.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy chủ trọ");
        user.IsActive = !user.IsActive;
        await db.SaveChangesAsync();
    }

    public async Task ResetPasswordAsync(Guid id, string newPassword = "SmartRent@2026")
    {
        var user = await db.Users.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy chủ trọ");
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await db.SaveChangesAsync();
    }

    public async Task<IEnumerable<ComplaintDto>> GetComplaintsAsync()
    {
        var complaints = await db.Complaints.Include(c => c.Sender).OrderByDescending(c => c.CreatedAt).ToListAsync();
        return complaints.Select(c => new ComplaintDto(c.Id, c.Sender.FullName, c.Sender.Email, c.Sender.Role.ToString(),
            c.Title, c.Content, c.Status.ToString(), c.Reply, c.CreatedAt, c.RepliedAt));
    }

    public async Task<ComplaintDto> ReplyComplaintAsync(Guid id, Guid adminId, ReplyComplaintRequest request)
    {
        var complaint = await db.Complaints.Include(c => c.Sender).FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy phản hồi");
        complaint.Reply = request.Reply;
        complaint.Status = ComplaintStatus.Resolved;
        complaint.RepliedBy = adminId;
        complaint.RepliedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return new ComplaintDto(complaint.Id, complaint.Sender.FullName, complaint.Sender.Email, complaint.Sender.Role.ToString(),
            complaint.Title, complaint.Content, complaint.Status.ToString(), complaint.Reply, complaint.CreatedAt, complaint.RepliedAt);
    }

    public async Task UpdateComplaintStatusAsync(Guid id, string status)
    {
        var complaint = await db.Complaints.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy phản hồi");
        complaint.Status = Enum.Parse<ComplaintStatus>(status);
        await db.SaveChangesAsync();
    }
}

public class ZoneService(AppDbContext db)
{
    public async Task<IEnumerable<ZoneDto>> GetByLandlordAsync(Guid landlordId)
    {
        var zones = await db.Zones.Include(z => z.Rooms).Where(z => z.LandlordId == landlordId).ToListAsync();
        return zones.Select(z => new ZoneDto(z.Id, z.Name, z.Address, z.Description, z.TotalRooms, z.Rooms.Count, z.CreatedAt));
    }

    public async Task<ZoneDto> CreateAsync(Guid landlordId, CreateZoneRequest req)
    {
        var zone = new Zone { LandlordId = landlordId, Name = req.Name, Address = req.Address, Description = req.Description, TotalRooms = req.TotalRooms };
        db.Zones.Add(zone);
        await db.SaveChangesAsync();
        return new ZoneDto(zone.Id, zone.Name, zone.Address, zone.Description, zone.TotalRooms, 0, zone.CreatedAt);
    }

    public async Task<ZoneDto> UpdateAsync(Guid id, UpdateZoneRequest req)
    {
        var zone = await db.Zones.Include(z => z.Rooms).FirstOrDefaultAsync(z => z.Id == id) ?? throw new KeyNotFoundException();
        zone.Name = req.Name; zone.Address = req.Address; zone.Description = req.Description; zone.TotalRooms = req.TotalRooms;
        await db.SaveChangesAsync();
        return new ZoneDto(zone.Id, zone.Name, zone.Address, zone.Description, zone.TotalRooms, zone.Rooms.Count, zone.CreatedAt);
    }

    public async Task<bool> DeleteAsync(Guid id) { var z = await db.Zones.FindAsync(id); if (z is null) return false; db.Zones.Remove(z); await db.SaveChangesAsync(); return true; }
}

public class RoomService(AppDbContext db)
{
    public async Task<IEnumerable<RoomDto>> GetByLandlordAsync(Guid landlordId, Guid? zoneId = null)
    {
        var query = db.Rooms.Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t.User)
            .Where(r => r.Zone.LandlordId == landlordId);
        if (zoneId.HasValue) query = query.Where(r => r.ZoneId == zoneId);
        var rooms = await query.ToListAsync();
        return rooms.Select(r => MapRoom(r));
    }

    public async Task<RoomDto?> GetByIdAsync(Guid id)
    {
        var r = await db.Rooms.Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t.User).FirstOrDefaultAsync(r => r.Id == id);
        return r is null ? null : MapRoom(r);
    }

    public async Task<RoomDto> CreateAsync(Guid landlordId, CreateRoomRequest req)
    {
        var zone = await db.Zones.FirstOrDefaultAsync(z => z.Id == req.ZoneId && z.LandlordId == landlordId) ?? throw new KeyNotFoundException("Zone không tồn tại");
        var status = Enum.Parse<RoomStatus>(req.Status, ignoreCase: true);
        var room = new Room { ZoneId = req.ZoneId, RoomNumber = req.RoomNumber, Floor = req.Floor, Price = req.Price, Area = req.Area, MaxTenants = req.MaxTenants, Status = status, ElecMeter = req.ElecMeter, WaterMeter = req.WaterMeter, Description = req.Description };
        db.Rooms.Add(room);
        await db.SaveChangesAsync();
        room.Zone = zone;
        return MapRoom(room);
    }

    public async Task<RoomDto> UpdateAsync(Guid id, UpdateRoomRequest req)
    {
        var room = await db.Rooms.Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t.User).FirstOrDefaultAsync(r => r.Id == id) ?? throw new KeyNotFoundException();
        room.RoomNumber = req.RoomNumber; room.Floor = req.Floor; room.Price = req.Price; room.Area = req.Area;
        room.MaxTenants = req.MaxTenants; room.Status = Enum.Parse<RoomStatus>(req.Status, ignoreCase: true);
        room.ElecMeter = req.ElecMeter; room.WaterMeter = req.WaterMeter; room.Description = req.Description;
        await db.SaveChangesAsync();
        return MapRoom(room);
    }

    public async Task<bool> DeleteAsync(Guid id) { var r = await db.Rooms.FindAsync(id); if (r is null) return false; db.Rooms.Remove(r); await db.SaveChangesAsync(); return true; }

    public async Task<RoomDetailDto?> GetRoomDetailAsync(Guid roomId)
    {
        var r = await db.Rooms
            .Include(r => r.Zone)
            .Include(r => r.Tenants).ThenInclude(t => t.User)
            .Include(r => r.Tenants).ThenInclude(t => t.Contracts)
            .FirstOrDefaultAsync(r => r.Id == roomId);

        if (r is null) return null;

        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
        var recentInvoices = await db.Invoices
            .Include(i => i.Room)
            .Include(i => i.TenantProfile!).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .Where(i => i.RoomId == roomId && i.CreatedAt >= sixMonthsAgo)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var utilityLogs = await db.UtilityLogs
            .Include(u => u.Room)
            .Where(u => u.RoomId == roomId)
            .OrderByDescending(u => u.RecordedAt)
            .Take(3)
            .ToListAsync();

        var activeContract = await db.Contracts
            .Include(c => c.Room)
            .Include(c => c.TenantProfile!).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.RoomId == roomId && c.Status == ContractStatus.Active);

        var tenantDtos = r.Tenants.Select(t => {
            var activeContractCode = t.Contracts?.FirstOrDefault(c => c.Status == ContractStatus.Active)?.ContractCode;
            return new TenantDto(
                t.Id, t.UserId, t.User?.FullName ?? "", t.User?.Email ?? "", t.User?.Phone ?? "",
                t.User?.AvatarUrl, t.CCCD, t.Hometown, t.MoveInDate, t.Deposit,
                t.RoomId, r.RoomNumber, r.Zone?.Name,
                t.CccdFrontUrl, t.CccdBackUrl, activeContractCode
            );
        }).ToList();

        var invoiceDtos = recentInvoices.Select(i => new InvoiceDto(
            i.Id, i.InvoiceCode, i.RoomId, i.Room?.RoomNumber ?? "", i.TenantProfileId,
            i.TenantProfile?.User?.FullName ?? "", i.Month, i.RentFee, i.ElecFee, i.WaterFee,
            i.ServiceFee, i.TotalAmount, i.Status.ToString(), i.DueDate, i.PaidDate,
            i.CreatedAt, i.Items.Select(x => new InvoiceItemDto(x.Id, x.Name, x.Amount)).ToList()
        )).ToList();

        var utilityDtos = utilityLogs.Select(u => new UtilityLogDto(
            u.Id, u.RoomId, u.Room?.RoomNumber ?? "", u.Month, u.OldElec, u.NewElec,
            u.ElecUsed, u.OldWater, u.NewWater, u.WaterUsed, u.ElecCost, u.WaterCost, u.RecordedAt
        )).ToList();

        ContractDto? activeContractDto = null;
        if (activeContract != null)
        {
            var c = activeContract;
            activeContractDto = new ContractDto(
                c.Id, c.ContractCode, c.RoomId, c.Room?.RoomNumber ?? "", c.TenantProfileId,
                c.TenantProfile?.User?.FullName ?? "", c.TenantProfile?.User?.Phone ?? "",
                c.StartDate, c.EndDate, c.RentAmount, c.Deposit, c.Status.ToString(),
                c.PaymentTermDay, c.Terms, c.FileUrl, c.CreatedAt
            );
        }

        return new RoomDetailDto(
            r.Id, r.ZoneId, r.Zone?.Name ?? "", r.RoomNumber,
            r.Floor, r.Price, r.Area, r.MaxTenants,
            r.Status.ToString(), r.ElecMeter, r.WaterMeter,
            r.Description, r.CreatedAt,
            tenantDtos, invoiceDtos, utilityDtos, activeContractDto
        );
    }

    private static RoomDto MapRoom(Room r) => new(r.Id, r.ZoneId, r.Zone?.Name ?? "", r.RoomNumber, r.Floor, r.Price, r.Area, r.MaxTenants, r.Status.ToString(), r.ElecMeter, r.WaterMeter, r.Description, r.CreatedAt, r.Tenants.FirstOrDefault()?.User?.FullName);
}

public class TenantService(AppDbContext db)
{
    public async Task<IEnumerable<TenantDto>> GetByLandlordAsync(Guid landlordId)
    {
        var tenants = await db.TenantProfiles
            .Include(t => t.User)
            .Include(t => t.Room).ThenInclude(r => r!.Zone)
            .Include(t => t.Contracts)
            .Where(t => (t.Room != null && t.Room.Zone.LandlordId == landlordId) || t.Contracts.Any(c => c.Room.Zone.LandlordId == landlordId))
            .ToListAsync();
        return tenants.Select(MapTenant);
    }

    public async Task<TenantDto?> GetByIdAsync(Guid id)
    {
        var t = await db.TenantProfiles.Include(t => t.User).Include(t => t.Room).ThenInclude(r => r!.Zone)
            .Include(t => t.Contracts).FirstOrDefaultAsync(t => t.Id == id);
        return t is null ? null : MapTenant(t);
    }

    public async Task<TenantDto?> GetByUserIdAsync(Guid userId)
    {
        var t = await db.TenantProfiles.Include(t => t.User).Include(t => t.Room).ThenInclude(r => r!.Zone)
            .Include(t => t.Contracts).FirstOrDefaultAsync(t => t.UserId == userId);
        return t is null ? null : MapTenant(t);
    }

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

        var profile = new TenantProfile { UserId = user.Id, RoomId = req.RoomId, CCCD = req.CCCD, Hometown = req.Hometown, MoveInDate = req.MoveInDate, Deposit = req.Deposit, CccdFrontUrl = req.CccdFrontUrl, CccdBackUrl = req.CccdBackUrl };
        db.TenantProfiles.Add(profile);

        room.Status = RoomStatus.Occupied;
        await db.SaveChangesAsync();
        profile.User = user; profile.Room = room;
        return MapTenant(profile);
    }

    public async Task<TenantDto> UpdateAsync(Guid id, UpdateTenantRequest req)
    {
        var t = await db.TenantProfiles.Include(t => t.User).Include(t => t.Room).ThenInclude(r => r!.Zone).Include(t => t.Contracts)
            .FirstOrDefaultAsync(t => t.Id == id) ?? throw new KeyNotFoundException();
        t.User.FullName = req.FullName; t.User.Phone = req.Phone; t.Hometown = req.Hometown;
        if (!string.IsNullOrEmpty(req.CccdFrontUrl)) t.CccdFrontUrl = req.CccdFrontUrl;
        if (!string.IsNullOrEmpty(req.CccdBackUrl)) t.CccdBackUrl = req.CccdBackUrl;

        if (req.RoomId.HasValue && t.RoomId != req.RoomId.Value)
        {
            if (t.RoomId.HasValue)
            {
                var oldRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Id == t.RoomId.Value);
                if (oldRoom != null) oldRoom.Status = RoomStatus.Vacant;
            }
            t.RoomId = req.RoomId.Value;
            var newRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Id == req.RoomId.Value);
            if (newRoom != null) newRoom.Status = RoomStatus.Occupied;
        }

        await db.SaveChangesAsync();
        return MapTenant(t);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var t = await db.TenantProfiles.Include(t => t.Room).FirstOrDefaultAsync(t => t.Id == id);
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

    private static TenantDto MapTenant(TenantProfile t) => new(t.Id, t.UserId, t.User?.FullName ?? "", t.User?.Email ?? "", t.User?.Phone ?? "", t.User?.AvatarUrl, t.CCCD, t.Hometown, t.MoveInDate, t.Deposit, t.RoomId, t.Room?.RoomNumber, t.Room?.Zone?.Name, t.CccdFrontUrl, t.CccdBackUrl, t.Contracts.FirstOrDefault(c => c.Status == ContractStatus.Active)?.ContractCode);
}

public class ContractService(AppDbContext db)
{
    public async Task<IEnumerable<ContractDto>> GetByLandlordAsync(Guid landlordId)
    {
        var contracts = await db.Contracts.Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.Room.Zone.LandlordId == landlordId).ToListAsync();
        return contracts.Select(MapContract);
    }

    public async Task<IEnumerable<ContractDto>> GetByTenantAsync(Guid tenantProfileId)
    {
        var contracts = await db.Contracts.Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.TenantProfileId == tenantProfileId).ToListAsync();
        return contracts.Select(MapContract);
    }

    public async Task<ContractDto> CreateAsync(CreateContractRequest req)
    {
        var contract = new Contract { ContractCode = req.ContractCode, RoomId = req.RoomId, TenantProfileId = req.TenantProfileId, StartDate = req.StartDate, EndDate = req.EndDate, RentAmount = req.RentAmount, Deposit = req.Deposit, PaymentTermDay = req.PaymentTermDay, Terms = req.Terms };
        db.Contracts.Add(contract);

        var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.Id == req.TenantProfileId);
        if (tenant != null)
        {
            if (tenant.RoomId.HasValue && tenant.RoomId.Value != req.RoomId)
            {
                var oldRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Id == tenant.RoomId.Value);
                if (oldRoom != null) oldRoom.Status = RoomStatus.Vacant;
            }
            tenant.RoomId = req.RoomId;
            var newRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Id == req.RoomId);
            if (newRoom != null) newRoom.Status = RoomStatus.Occupied;
        }

        await db.SaveChangesAsync();
        var full = await db.Contracts.Include(c => c.Room).ThenInclude(r => r.Zone).Include(c => c.TenantProfile).ThenInclude(t => t.User).FirstAsync(c => c.Id == contract.Id);
        return MapContract(full);
    }

    public async Task<ContractDto> UpdateAsync(Guid id, UpdateContractRequest req)
    {
        var c = await db.Contracts.Include(c => c.Room).ThenInclude(r => r.Zone).Include(c => c.TenantProfile).ThenInclude(t => t.User).FirstOrDefaultAsync(c => c.Id == id) ?? throw new KeyNotFoundException();
        c.StartDate = req.StartDate; c.EndDate = req.EndDate; c.RentAmount = req.RentAmount; c.PaymentTermDay = req.PaymentTermDay; c.Terms = req.Terms;

        if (req.RoomId.HasValue && c.RoomId != req.RoomId.Value)
        {
            var oldRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Id == c.RoomId);
            if (oldRoom != null) oldRoom.Status = RoomStatus.Vacant;

            c.RoomId = req.RoomId.Value;
            var newRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Id == req.RoomId.Value);
            if (newRoom != null) newRoom.Status = RoomStatus.Occupied;

            var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.Id == c.TenantProfileId);
            if (tenant != null) tenant.RoomId = req.RoomId.Value;
        }

        await db.SaveChangesAsync();
        return MapContract(c);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var c = await db.Contracts.Include(c => c.Room).FirstOrDefaultAsync(c => c.Id == id);
        if (c is null) return false;

        // If deleting active contract, check if room still has other active contracts
        if (c.Status == ContractStatus.Active && c.Room != null)
        {
            var activeContracts = await db.Contracts.CountAsync(other => other.RoomId == c.RoomId && other.Id != c.Id && other.Status == ContractStatus.Active);
            if (activeContracts == 0)
            {
                c.Room.Status = RoomStatus.Vacant;
            }
        }

        db.Contracts.Remove(c);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task TerminateAsync(Guid id)
    {
        var c = await db.Contracts.Include(c => c.Room).FirstOrDefaultAsync(c => c.Id == id) ?? throw new KeyNotFoundException();
        c.Status = ContractStatus.Liquidated;
        c.Room.Status = RoomStatus.Vacant;
        var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.RoomId == c.RoomId);
        if (tenant != null) { tenant.RoomId = null; }
        await db.SaveChangesAsync();
    }

    public async Task RenewAsync(Guid id, RenewContractRequest req)
    {
        var c = await db.Contracts.FirstOrDefaultAsync(c => c.Id == id) ?? throw new KeyNotFoundException();
        c.Status = ContractStatus.Liquidated;
        var newContract = new Contract { ContractCode = c.ContractCode + "-GH", RoomId = c.RoomId, TenantProfileId = c.TenantProfileId, StartDate = c.EndDate, EndDate = c.EndDate.AddMonths(req.ExtendMonths), RentAmount = req.NewRentAmount ?? c.RentAmount, Deposit = c.Deposit, PaymentTermDay = c.PaymentTermDay, Terms = c.Terms };
        db.Contracts.Add(newContract);
        await db.SaveChangesAsync();
    }

    private static ContractDto MapContract(Contract c) => new(c.Id, c.ContractCode, c.RoomId, c.Room?.RoomNumber ?? "", c.TenantProfileId, c.TenantProfile?.User?.FullName ?? "", c.TenantProfile?.User?.Phone ?? "", c.StartDate, c.EndDate, c.RentAmount, c.Deposit, c.Status.ToString(), c.PaymentTermDay, c.Terms, c.FileUrl, c.CreatedAt);
}

public class UtilityService(AppDbContext db)
{
    public async Task<IEnumerable<UtilityLogDto>> GetByLandlordAsync(Guid landlordId, Guid? roomId = null)
    {
        var query = db.UtilityLogs.Include(u => u.Room).ThenInclude(r => r.Zone).Where(u => u.Room.Zone.LandlordId == landlordId).AsQueryable();
        if (roomId.HasValue) query = query.Where(u => u.RoomId == roomId);
        var logs = await query.OrderByDescending(u => u.Month).ToListAsync();
        return logs.Select(MapLog);
    }

    public async Task<UtilityLogDto> RecordAsync(Guid landlordId, RecordUtilityRequest req)
    {
        var room = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == req.RoomId && r.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Phòng không tồn tại");
        var rate = await db.UtilityRates.FirstOrDefaultAsync(r => r.LandlordId == landlordId);
        decimal elecPrice = rate?.ElecPrice ?? 3500;
        decimal waterPrice = rate?.WaterPrice ?? 18000;

        var elecUsed = req.NewElec - room.ElecMeter;
        var waterUsed = req.NewWater - room.WaterMeter;
        var elecCost = elecUsed * elecPrice;
        var waterCost = waterUsed * waterPrice;
        var log = new UtilityLog { RoomId = req.RoomId, Month = req.Month, OldElec = room.ElecMeter, NewElec = req.NewElec, ElecUsed = elecUsed, OldWater = room.WaterMeter, NewWater = req.NewWater, WaterUsed = waterUsed, ElecCost = elecCost, WaterCost = waterCost };
        room.ElecMeter = req.NewElec; room.WaterMeter = req.NewWater;
        db.UtilityLogs.Add(log);

        // ================================================================
        // TỰ ĐỘNG TẠO / CẬP NHẬT HÓA ĐƠN TIỀN NHÀ CHO PHÒNG KHI CHỐT ĐIỆN NƯỚC
        // ================================================================
        var tenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.RoomId == req.RoomId);
        if (tenant != null)
        {
            var existingInvoice = await db.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.RoomId == req.RoomId && i.Month == req.Month);
            decimal serviceFee = 150000;
            decimal rentFee = room.Price;

            var activeContract = await db.Contracts.FirstOrDefaultAsync(c => c.RoomId == req.RoomId && c.Status == ContractStatus.Active);
            if (activeContract != null && activeContract.RentAmount > 0)
            {
                rentFee = activeContract.RentAmount;
            }

            decimal totalAmount = rentFee + elecCost + waterCost + serviceFee;
            var dueDate = DateTime.UtcNow.AddDays(7);

            if (existingInvoice == null)
            {
                var code = $"HD-{req.Month.Replace("-", "")}-{room.RoomNumber}";
                var inv = new Invoice
                {
                    InvoiceCode = code,
                    RoomId = req.RoomId,
                    TenantProfileId = tenant.Id,
                    Month = req.Month,
                    RentFee = rentFee,
                    ElecFee = elecCost,
                    WaterFee = waterCost,
                    ServiceFee = serviceFee,
                    TotalAmount = totalAmount,
                    DueDate = dueDate,
                    Status = InvoiceStatus.Unpaid,
                    Items = new List<InvoiceItem>
                    {
                        new InvoiceItem { Name = $"Tiền thuê phòng {room.RoomNumber}", Amount = rentFee },
                        new InvoiceItem { Name = $"Tiền điện ({elecUsed} kWh x {elecPrice:N0}đ)", Amount = elecCost },
                        new InvoiceItem { Name = $"Tiền nước ({waterUsed} m³ x {waterPrice:N0}đ)", Amount = waterCost },
                        new InvoiceItem { Name = "Phí dịch vụ cố định (Wi-Fi, rác)", Amount = serviceFee },
                    }
                };
                db.Invoices.Add(inv);
            }
            else
            {
                existingInvoice.ElecFee = elecCost;
                existingInvoice.WaterFee = waterCost;
                existingInvoice.RentFee = rentFee;
                existingInvoice.ServiceFee = serviceFee;
                existingInvoice.TotalAmount = totalAmount;

                existingInvoice.Items.Clear();
                existingInvoice.Items.Add(new InvoiceItem { Name = $"Tiền thuê phòng {room.RoomNumber}", Amount = rentFee });
                existingInvoice.Items.Add(new InvoiceItem { Name = $"Tiền điện ({elecUsed} kWh x {elecPrice:N0}đ)", Amount = elecCost });
                existingInvoice.Items.Add(new InvoiceItem { Name = $"Tiền nước ({waterUsed} m³ x {waterPrice:N0}đ)", Amount = waterCost });
                existingInvoice.Items.Add(new InvoiceItem { Name = "Phí dịch vụ cố định (Wi-Fi, rác)", Amount = serviceFee });
            }
        }

        await db.SaveChangesAsync();
        log.Room = room;
        return MapLog(log);
    }

    public async Task<UtilityRateDto?> GetRateAsync(Guid landlordId)
    {
        var r = await db.UtilityRates.FirstOrDefaultAsync(r => r.LandlordId == landlordId);
        return r is null ? null : new UtilityRateDto(r.Id, r.ElecPrice, r.WaterPrice, r.UpdatedAt);
    }

    public async Task<UtilityRateDto> UpdateRateAsync(Guid landlordId, UpdateUtilityRateRequest req)
    {
        var r = await db.UtilityRates.FirstOrDefaultAsync(x => x.LandlordId == landlordId);
        if (r is null) { r = new UtilityRate { LandlordId = landlordId, ElecPrice = req.ElecPrice, WaterPrice = req.WaterPrice }; db.UtilityRates.Add(r); }
        else { r.ElecPrice = req.ElecPrice; r.WaterPrice = req.WaterPrice; r.UpdatedAt = DateTime.UtcNow; }
        await db.SaveChangesAsync();
        return new UtilityRateDto(r.Id, r.ElecPrice, r.WaterPrice, r.UpdatedAt);
    }

    private static UtilityLogDto MapLog(UtilityLog u) => new(u.Id, u.RoomId, u.Room?.RoomNumber ?? "", u.Month, u.OldElec, u.NewElec, u.ElecUsed, u.OldWater, u.NewWater, u.WaterUsed, u.ElecCost, u.WaterCost, u.RecordedAt);
}

public class ServiceMgmtService(AppDbContext db)
{
    public async Task<IEnumerable<ServiceDto>> GetByLandlordAsync(Guid landlordId) =>
        (await db.Services.Where(s => s.LandlordId == landlordId).ToListAsync()).Select(MapSvc);

    public async Task<ServiceDto> CreateAsync(Guid landlordId, CreateServiceRequest req)
    {
        var s = new Service { LandlordId = landlordId, Name = req.Name, Price = req.Price, Unit = req.Unit, Icon = req.Icon };
        db.Services.Add(s); await db.SaveChangesAsync(); return MapSvc(s);
    }

    public async Task<ServiceDto> UpdateAsync(Guid id, UpdateServiceRequest req)
    {
        var s = await db.Services.FindAsync(id) ?? throw new KeyNotFoundException();
        s.Name = req.Name; s.Price = req.Price; s.Unit = req.Unit; s.Icon = req.Icon; s.IsActive = req.IsActive;
        await db.SaveChangesAsync(); return MapSvc(s);
    }

    public async Task<bool> DeleteAsync(Guid id) { var s = await db.Services.FindAsync(id); if (s is null) return false; db.Services.Remove(s); await db.SaveChangesAsync(); return true; }

    private static ServiceDto MapSvc(Service s) => new(s.Id, s.Name, s.Price, s.Unit, s.Icon, s.IsActive, s.CreatedAt);
}

public class InvoiceService(AppDbContext db)
{
    public async Task<IEnumerable<InvoiceDto>> GetByLandlordAsync(Guid landlordId, string? status = null, string? month = null)
    {
        var query = db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone).Include(i => i.TenantProfile).ThenInclude(t => t.User).Include(i => i.Items)
            .Where(i => i.Room.Zone.LandlordId == landlordId).AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(i => i.Status.ToString() == status);
        if (!string.IsNullOrEmpty(month)) query = query.Where(i => i.Month == month);
        return (await query.OrderByDescending(i => i.CreatedAt).ToListAsync()).Select(MapInvoice);
    }

    public async Task<IEnumerable<InvoiceDto>> GetByTenantAsync(Guid tenantProfileId)
    {
        var invoices = await db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone).Include(i => i.Items)
            .Where(i => i.TenantProfileId == tenantProfileId).OrderByDescending(i => i.CreatedAt).ToListAsync();
        return invoices.Select(MapInvoice);
    }

    public async Task<IEnumerable<InvoiceDto>> GetByTenantUserIdAsync(Guid tenantUserId)
    {
        var profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == tenantUserId);
        if (profile == null)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == tenantUserId);
            if (user != null)
            {
                profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.User.Email == user.Email);
            }
        }

        if (profile == null) return [];

        var invoices = await db.Invoices
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .Where(i => i.TenantProfileId == profile.Id || (profile.RoomId.HasValue && i.RoomId == profile.RoomId.Value))
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return invoices.Select(MapInvoice);
    }

    public async Task<InvoiceDto?> GetByIdAsync(Guid id)
    {
        var i = await db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone).Include(i => i.TenantProfile).ThenInclude(t => t.User).Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == id);
        return i is null ? null : MapInvoice(i);
    }

    public async Task<InvoiceDto> CreateAsync(Guid landlordId, CreateInvoiceRequest req)
    {
        var room = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == req.RoomId && r.Zone.LandlordId == landlordId) ?? throw new KeyNotFoundException("Phòng không tồn tại");
        var tenant = await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.RoomId == req.RoomId) ?? throw new KeyNotFoundException("Không có khách thuê trong phòng này");
        var totalAmount = req.RentFee + req.ElecFee + req.WaterFee + req.ServiceFee;
        var code = $"HD-{req.Month.Replace("-", "")}-{room.RoomNumber}";
        var inv = new Invoice { InvoiceCode = code, RoomId = req.RoomId, TenantProfileId = tenant.Id, Month = req.Month, RentFee = req.RentFee, ElecFee = req.ElecFee, WaterFee = req.WaterFee, ServiceFee = req.ServiceFee, TotalAmount = totalAmount, DueDate = req.DueDate, Items = [new InvoiceItem { Name = "Tiền thuê phòng", Amount = req.RentFee }, new InvoiceItem { Name = "Tiền điện", Amount = req.ElecFee }, new InvoiceItem { Name = "Tiền nước", Amount = req.WaterFee }, new InvoiceItem { Name = "Phí dịch vụ", Amount = req.ServiceFee }] };
        db.Invoices.Add(inv);
        await db.SaveChangesAsync();
        inv.Room = room; inv.TenantProfile = tenant;
        return MapInvoice(inv);
    }

    public async Task<InvoiceDto> UpdateStatusAsync(Guid id, string status)
    {
        var inv = await db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone).Include(i => i.TenantProfile).ThenInclude(t => t.User).Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == id) ?? throw new KeyNotFoundException();
        inv.Status = Enum.Parse<InvoiceStatus>(status, ignoreCase: true);
        if (inv.Status == InvoiceStatus.Paid) inv.PaidDate = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return MapInvoice(inv);
    }

    private static InvoiceDto MapInvoice(Invoice i) => new(i.Id, i.InvoiceCode, i.RoomId, i.Room?.RoomNumber ?? "", i.TenantProfileId, i.TenantProfile?.User?.FullName ?? "", i.Month, i.RentFee, i.ElecFee, i.WaterFee, i.ServiceFee, i.TotalAmount, i.Status.ToString(), i.DueDate, i.PaidDate, i.CreatedAt, i.Items.Select(x => new InvoiceItemDto(x.Id, x.Name, x.Amount)).ToList());
}

public class PaymentService(AppDbContext db)
{
    public async Task<IEnumerable<PaymentDto>> GetByLandlordAsync(Guid landlordId)
    {
        var payments = await db.Payments
            .Include(p => p.Invoice).ThenInclude(i => i.Room).ThenInclude(r => r.Zone)
            .Include(p => p.Invoice).ThenInclude(i => i.TenantProfile).ThenInclude(t => t.User)
            .Where(p => p.Invoice.Room.Zone.LandlordId == landlordId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
        return payments.Select(MapPayment);
    }

    public async Task<IEnumerable<PaymentDto>> GetByTenantAsync(Guid tenantProfileId)
    {
        var payments = await db.Payments
            .Include(p => p.Invoice).ThenInclude(i => i.Room)
            .Where(p => p.Invoice.TenantProfileId == tenantProfileId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
        return payments.Select(MapPayment);
    }

    public async Task<IEnumerable<PaymentDto>> GetByTenantUserIdAsync(Guid tenantUserId)
    {
        var profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == tenantUserId);
        if (profile == null)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == tenantUserId);
            if (user != null)
            {
                profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.User.Email == user.Email);
            }
        }

        if (profile == null) return [];

        var payments = await db.Payments
            .Include(p => p.Invoice).ThenInclude(i => i.Room)
            .Where(p => p.Invoice.TenantProfileId == profile.Id || (profile.RoomId.HasValue && p.Invoice.RoomId == profile.RoomId.Value))
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return payments.Select(MapPayment);
    }

    public async Task<PaymentDto> SubmitAsync(Guid tenantUserId, SubmitPaymentRequest req)
    {
        var inv = await db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone)
            .FirstOrDefaultAsync(i => i.Id == req.InvoiceId)
            ?? throw new KeyNotFoundException("Hóa đơn không tồn tại");

        var method = Enum.Parse<PaymentMethod>(req.Method, ignoreCase: true);
        var pay = new Payment
        {
            InvoiceId = req.InvoiceId,
            Amount = req.Amount > 0 ? req.Amount : inv.TotalAmount,
            Method = method,
            Status = PaymentStatus.PendingApproval,
            ProofImageUrl = req.ProofImageUrl,
            Note = req.Note
        };

        db.Payments.Add(pay);
        await db.SaveChangesAsync();
        pay.Invoice = inv;
        return MapPayment(pay);
    }

    public async Task<PaymentDto> ConfirmAsync(Guid id, Guid landlordId, ConfirmPaymentRequest req)
    {
        var pay = await db.Payments
            .Include(p => p.Invoice).ThenInclude(i => i.Room)
            .FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new KeyNotFoundException("Giao dịch thanh toán không tồn tại");

        pay.Status = req.Approve ? PaymentStatus.Completed : PaymentStatus.Rejected;
        pay.ConfirmedBy = landlordId;
        pay.ConfirmedAt = DateTime.UtcNow;

        if (req.Approve && pay.Invoice != null)
        {
            pay.Invoice.Status = InvoiceStatus.Paid;
            pay.Invoice.PaidDate = DateTime.UtcNow;

            if (pay.Invoice.Room != null && pay.Invoice.Room.Status == RoomStatus.Vacant)
            {
                pay.Invoice.Room.Status = RoomStatus.Occupied;
            }
        }

        if (!string.IsNullOrEmpty(req.Note))
        {
            pay.Note = req.Note;
        }

        await db.SaveChangesAsync();
        return MapPayment(pay);
    }

    private static PaymentDto MapPayment(Payment p) => new(
        p.Id,
        p.InvoiceId,
        p.Invoice?.InvoiceCode ?? "",
        p.Amount,
        p.Method.ToString(),
        p.Status.ToString(),
        p.ProofImageUrl,
        p.Note,
        p.CreatedAt,
        p.ConfirmedAt
    );
}

public class MaintenanceService(AppDbContext db)
{
    public async Task<IEnumerable<MaintenanceRequestDto>> GetByLandlordAsync(Guid landlordId)
    {
        var list = await db.MaintenanceRequests
            .Include(m => m.Room).ThenInclude(r => r.Zone)
            .Include(m => m.TenantProfile).ThenInclude(t => t.User)
            .Where(m => m.Room.Zone.LandlordId == landlordId || (m.TenantProfile != null && m.TenantProfile.Room != null && m.TenantProfile.Room.Zone.LandlordId == landlordId))
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();

        return list.Select(MapReq);
    }

    public async Task<IEnumerable<MaintenanceRequestDto>> GetByTenantUserIdAsync(Guid tenantUserId)
    {
        var profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == tenantUserId);
        if (profile == null)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == tenantUserId);
            if (user != null)
            {
                profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.User.Email == user.Email);
            }
        }

        if (profile == null) return [];

        var list = await db.MaintenanceRequests
            .Include(m => m.Room)
            .Include(m => m.TenantProfile).ThenInclude(t => t.User)
            .Where(m => m.TenantProfileId == profile.Id)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();

        return list.Select(MapReq);
    }

    public async Task<MaintenanceRequestDto> CreateAsync(Guid tenantUserId, CreateMaintenanceRequest req)
    {
        var profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == tenantUserId);
        if (profile == null)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == tenantUserId);
            if (user != null)
            {
                profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.User.Email == user.Email);
                if (profile == null)
                {
                    profile = new TenantProfile { UserId = user.Id, CCCD = "000000000000", MoveInDate = DateTime.UtcNow };
                    db.TenantProfiles.Add(profile);
                    await db.SaveChangesAsync();
                }
            }
        }

        if (profile == null) throw new KeyNotFoundException("Không tìm thấy hồ sơ người thuê.");
        
        Guid roomId = Guid.Empty;
        if (profile.RoomId.HasValue && profile.RoomId.Value != Guid.Empty)
        {
            roomId = profile.RoomId.Value;
        }
        else
        {
            var activeContract = await db.Contracts.FirstOrDefaultAsync(c => c.TenantProfileId == profile.Id && c.Status == ContractStatus.Active);
            if (activeContract != null)
            {
                roomId = activeContract.RoomId;
                profile.RoomId = roomId;
            }
            else
            {
                var anyRoom = await db.Rooms.FirstOrDefaultAsync();
                if (anyRoom != null)
                {
                    roomId = anyRoom.Id;
                    profile.RoomId = roomId;
                }
                else
                {
                    throw new InvalidOperationException("Chưa có phòng nào trong hệ thống để báo sự cố.");
                }
            }
            await db.SaveChangesAsync();
        }

        var priority = Enum.Parse<MaintenancePriority>(req.Priority, ignoreCase: true);
        var m = new MaintenanceRequest
        {
            RoomId = roomId,
            TenantProfileId = profile.Id,
            IssueType = req.IssueType,
            Title = req.Title,
            Description = req.Description,
            Priority = priority,
            ImageUrl = req.ImageUrl
        };
        db.MaintenanceRequests.Add(m);
        await db.SaveChangesAsync();

        var full = await db.MaintenanceRequests
            .Include(x => x.Room).ThenInclude(r => r.Zone)
            .Include(x => x.TenantProfile).ThenInclude(t => t.User)
            .FirstAsync(x => x.Id == m.Id);

        return MapReq(full);
    }

    public async Task<MaintenanceRequestDto> UpdateAsync(Guid id, UpdateMaintenanceRequest req)
    {
        var m = await db.MaintenanceRequests
            .Include(x => x.Room)
            .Include(x => x.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(x => x.Id == id) ?? throw new KeyNotFoundException();

        m.Status = Enum.Parse<MaintenanceStatus>(req.Status, ignoreCase: true);
        if (req.AssignedTo != null) m.AssignedTo = req.AssignedTo;
        if (req.CompletionNote != null) m.CompletionNote = req.CompletionNote;
        if (m.Status == MaintenanceStatus.Completed) m.CompletedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return MapReq(m);
    }

    private static MaintenanceRequestDto MapReq(MaintenanceRequest m) => new(
        m.Id,
        m.RoomId,
        m.Room?.RoomNumber ?? "101",
        m.TenantProfile?.User?.FullName ?? "Khách thuê",
        m.TenantProfile?.User?.Phone ?? "",
        m.IssueType,
        m.Title,
        m.Description,
        m.Priority.ToString(),
        m.Status.ToString(),
        m.AssignedTo,
        m.ImageUrl,
        m.CompletionNote,
        m.CreatedAt,
        m.CompletedAt
    );
}

public class NotificationService(AppDbContext db)
{
    public async Task<IEnumerable<NotificationDto>> GetForUserAsync(Guid userId, string role)
    {
        var notifications = await db.Notifications.Include(n => n.Sender)
            .Include(n => n.Reads.Where(r => r.UserId == userId))
            .Where(n => (n.Target == NotificationTarget.AllLandlords && role == "Landlord") ||
                        (n.Target == NotificationTarget.AllTenants && role == "Tenant") ||
                        (n.Target == NotificationTarget.User && n.TargetId == userId) ||
                        role == "SuperAdmin")
            .OrderByDescending(n => n.CreatedAt).ToListAsync();
        return notifications.Select(n => new NotificationDto(n.Id, n.Sender?.FullName ?? "Hệ thống", n.Title, n.Content, n.Target.ToString(), n.TargetId, n.Reads.Any(r => r.IsRead), n.CreatedAt));
    }

    public async Task<NotificationDto> CreateAsync(Guid senderId, CreateNotificationRequest req)
    {
        var target = Enum.Parse<NotificationTarget>(req.Target);
        var n = new Notification { SenderId = senderId, Title = req.Title, Content = req.Content, Target = target, TargetId = req.TargetId };
        db.Notifications.Add(n);
        await db.SaveChangesAsync();
        var sender = await db.Users.FindAsync(senderId);
        return new NotificationDto(n.Id, sender?.FullName ?? "", n.Title, n.Content, n.Target.ToString(), n.TargetId, false, n.CreatedAt);
    }

    public async Task MarkReadAsync(Guid notifId, Guid userId)
    {
        var existing = await db.NotificationReads.FirstOrDefaultAsync(r => r.NotificationId == notifId && r.UserId == userId);
        if (existing is null) db.NotificationReads.Add(new NotificationRead { NotificationId = notifId, UserId = userId, IsRead = true, ReadAt = DateTime.UtcNow });
        else { existing.IsRead = true; existing.ReadAt = DateTime.UtcNow; }
        await db.SaveChangesAsync();
    }

    public async Task<bool> DeleteAsync(Guid id) { var n = await db.Notifications.FindAsync(id); if (n is null) return false; db.Notifications.Remove(n); await db.SaveChangesAsync(); return true; }
}

public class ComplaintService(AppDbContext db)
{
    public async Task<IEnumerable<ComplaintDto>> GetAllAsync()
    {
        var list = await db.Complaints.Include(c => c.Sender).OrderByDescending(c => c.CreatedAt).ToListAsync();
        return list.Select(MapComplaint);
    }

    public async Task<ComplaintDto> CreateAsync(Guid userId, string title, string content)
    {
        var c = new Complaint { SenderId = userId, Title = title, Content = content };
        db.Complaints.Add(c);
        await db.SaveChangesAsync();
        var full = await db.Complaints.Include(x => x.Sender).FirstAsync(x => x.Id == c.Id);
        return MapComplaint(full);
    }

    public async Task<ComplaintDto> ReplyAsync(Guid id, Guid adminId, string reply)
    {
        var c = await db.Complaints.Include(x => x.Sender).FirstOrDefaultAsync(x => x.Id == id) ?? throw new KeyNotFoundException();
        c.Reply = reply; c.Status = ComplaintStatus.Resolved; c.RepliedBy = adminId; c.RepliedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return MapComplaint(c);
    }

    private static ComplaintDto MapComplaint(Complaint c) => new(c.Id, c.Sender?.FullName ?? "", c.Sender?.Email ?? "", c.Sender?.Role.ToString() ?? "", c.Title, c.Content, c.Status.ToString(), c.Reply, c.CreatedAt, c.RepliedAt);
}

public class ProfileService(AppDbContext db)
{
    public async Task<UserProfileDto?> GetProfileAsync(Guid userId)
    {
        var u = await db.Users.FindAsync(userId);
        return u is null ? null : new UserProfileDto(u.Id, u.FullName, u.Email, u.Phone, u.AvatarUrl, u.Role.ToString(), u.CreatedAt);
    }

    public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest req)
    {
        var u = await db.Users.FindAsync(userId) ?? throw new KeyNotFoundException();
        u.FullName = req.FullName; u.Phone = req.Phone; u.AvatarUrl = req.AvatarUrl;
        await db.SaveChangesAsync();
        return new UserProfileDto(u.Id, u.FullName, u.Email, u.Phone, u.AvatarUrl, u.Role.ToString(), u.CreatedAt);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest req)
    {
        if (req.NewPassword != req.ConfirmPassword) throw new InvalidOperationException("Mật khẩu xác nhận không khớp");
        var u = await db.Users.FindAsync(userId) ?? throw new KeyNotFoundException();
        if (!BCrypt.Net.BCrypt.Verify(req.OldPassword, u.PasswordHash)) throw new UnauthorizedAccessException("Mật khẩu cũ không đúng");
        u.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await db.SaveChangesAsync();
    }
}
