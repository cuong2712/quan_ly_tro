using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Infrastructure.Repositories;

public class UserRepository(AppDbContext db) : IUserRepository
{
    public async Task<User?> GetByEmailAsync(string email) =>
        await db.Users.FirstOrDefaultAsync(u => u.Email == email);

    public async Task<User?> GetByIdAsync(Guid id) =>
        await db.Users.FindAsync(id);

    public async Task<IEnumerable<User>> GetAllByRoleAsync(string role) =>
        await db.Users.Where(u => u.Role.ToString() == role).ToListAsync();

    public async Task<User> CreateAsync(User user)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public async Task<User> UpdateAsync(User user)
    {
        db.Users.Update(user);
        await db.SaveChangesAsync();
        return user;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return false;
        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return true;
    }
}

public class ZoneRepository(AppDbContext db) : IZoneRepository
{
    public async Task<IEnumerable<Zone>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.Zones.Include(z => z.Rooms).Where(z => z.LandlordId == landlordId).ToListAsync();

    public async Task<Zone?> GetByIdAsync(Guid id) =>
        await db.Zones.Include(z => z.Rooms).FirstOrDefaultAsync(z => z.Id == id);

    public async Task<Zone> CreateAsync(Zone zone) { db.Zones.Add(zone); await db.SaveChangesAsync(); return zone; }
    public async Task<Zone> UpdateAsync(Zone zone) { db.Zones.Update(zone); await db.SaveChangesAsync(); return zone; }
    public async Task<bool> DeleteAsync(Guid id)
    {
        var z = await db.Zones.FindAsync(id);
        if (z is null) return false;
        db.Zones.Remove(z); await db.SaveChangesAsync(); return true;
    }
}

public class RoomRepository(AppDbContext db) : IRoomRepository
{
    public async Task<IEnumerable<Room>> GetByZoneIdAsync(Guid zoneId) =>
        await db.Rooms.Include(r => r.Tenants).ThenInclude(t => t!.User)
            .Where(r => r.ZoneId == zoneId).ToListAsync();

    public async Task<IEnumerable<Room>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.Rooms.Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t!.User)
            .Where(r => r.Zone.LandlordId == landlordId).ToListAsync();

    public async Task<Room?> GetByIdAsync(Guid id) =>
        await db.Rooms.Include(r => r.Zone).Include(r => r.Tenants).ThenInclude(t => t!.User)
            .FirstOrDefaultAsync(r => r.Id == id);

    public async Task<Room> CreateAsync(Room room) { db.Rooms.Add(room); await db.SaveChangesAsync(); return room; }
    public async Task<Room> UpdateAsync(Room room) { db.Rooms.Update(room); await db.SaveChangesAsync(); return room; }
    public async Task<bool> DeleteAsync(Guid id)
    {
        var r = await db.Rooms.FindAsync(id);
        if (r is null) return false;
        db.Rooms.Remove(r); await db.SaveChangesAsync(); return true;
    }
}

public class TenantRepository(AppDbContext db) : ITenantRepository
{
    public async Task<IEnumerable<TenantProfile>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.TenantProfiles.Include(t => t.User).Include(t => t.Room).ThenInclude(r => r!.Zone)
            .Where(t => t.Room != null && t.Room.Zone.LandlordId == landlordId).ToListAsync();

    public async Task<TenantProfile?> GetByIdAsync(Guid id) =>
        await db.TenantProfiles.Include(t => t.User).Include(t => t.Room).ThenInclude(r => r!.Zone)
            .Include(t => t.Contracts)
            .FirstOrDefaultAsync(t => t.Id == id);

    public async Task<TenantProfile?> GetByUserIdAsync(Guid userId) =>
        await db.TenantProfiles.Include(t => t.User).Include(t => t.Room).ThenInclude(r => r!.Zone)
            .Include(t => t.Contracts)
            .FirstOrDefaultAsync(t => t.UserId == userId);

    public async Task<TenantProfile?> GetByRoomIdAsync(Guid roomId) =>
        await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.RoomId == roomId);

    public async Task<TenantProfile> CreateAsync(TenantProfile tenant) { db.TenantProfiles.Add(tenant); await db.SaveChangesAsync(); return tenant; }
    public async Task<TenantProfile> UpdateAsync(TenantProfile tenant) { db.TenantProfiles.Update(tenant); await db.SaveChangesAsync(); return tenant; }
    public async Task<bool> DeleteAsync(Guid id)
    {
        var t = await db.TenantProfiles.FindAsync(id);
        if (t is null) return false;
        db.TenantProfiles.Remove(t); await db.SaveChangesAsync(); return true;
    }
}

public class ContractRepository(AppDbContext db) : IContractRepository
{
    public async Task<IEnumerable<Contract>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.Contracts.Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.Room.Zone.LandlordId == landlordId).ToListAsync();

    public async Task<IEnumerable<Contract>> GetByTenantIdAsync(Guid tenantProfileId) =>
        await db.Contracts.Include(c => c.Room).ThenInclude(r => r.Zone)
            .Where(c => c.TenantProfileId == tenantProfileId).ToListAsync();

    public async Task<Contract?> GetByIdAsync(Guid id) =>
        await db.Contracts.Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == id);

    public async Task<Contract?> GetActiveByRoomIdAsync(Guid roomId) =>
        await db.Contracts.Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.RoomId == roomId && c.Status == ContractStatus.Active);

    public async Task<Contract> CreateAsync(Contract contract) { db.Contracts.Add(contract); await db.SaveChangesAsync(); return contract; }
    public async Task<Contract> UpdateAsync(Contract contract) { db.Contracts.Update(contract); await db.SaveChangesAsync(); return contract; }
    public async Task<bool> DeleteAsync(Guid id)
    {
        var c = await db.Contracts.FindAsync(id);
        if (c is null) return false;
        db.Contracts.Remove(c); await db.SaveChangesAsync(); return true;
    }
}

public class UtilityRepository(AppDbContext db) : IUtilityRepository
{
    public async Task<IEnumerable<UtilityLog>> GetByRoomIdAsync(Guid roomId) =>
        await db.UtilityLogs.Include(u => u.Room).Where(u => u.RoomId == roomId).OrderByDescending(u => u.Month).ToListAsync();

    public async Task<IEnumerable<UtilityLog>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.UtilityLogs.Include(u => u.Room).ThenInclude(r => r.Zone)
            .Where(u => u.Room.Zone.LandlordId == landlordId).OrderByDescending(u => u.RecordedAt).ToListAsync();

    public async Task<UtilityLog?> GetByIdAsync(Guid id) => await db.UtilityLogs.FindAsync(id);
    public async Task<UtilityLog> CreateAsync(UtilityLog log) { db.UtilityLogs.Add(log); await db.SaveChangesAsync(); return log; }
    public async Task<UtilityLog> UpdateAsync(UtilityLog log) { db.UtilityLogs.Update(log); await db.SaveChangesAsync(); return log; }
    public async Task<UtilityRate?> GetRateByLandlordIdAsync(Guid landlordId) =>
        await db.UtilityRates.FirstOrDefaultAsync(r => r.LandlordId == landlordId);
    public async Task<UtilityRate> UpsertRateAsync(UtilityRate rate)
    {
        var existing = await db.UtilityRates.FirstOrDefaultAsync(r => r.LandlordId == rate.LandlordId);
        if (existing is null) { db.UtilityRates.Add(rate); }
        else { existing.ElecPrice = rate.ElecPrice; existing.WaterPrice = rate.WaterPrice; existing.UpdatedAt = DateTime.UtcNow; }
        await db.SaveChangesAsync();
        return existing ?? rate;
    }
}

public class ServiceRepository(AppDbContext db) : IServiceRepository
{
    public async Task<IEnumerable<Service>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.Services.Where(s => s.LandlordId == landlordId).ToListAsync();
    public async Task<Service?> GetByIdAsync(Guid id) => await db.Services.FindAsync(id);
    public async Task<Service> CreateAsync(Service s) { db.Services.Add(s); await db.SaveChangesAsync(); return s; }
    public async Task<Service> UpdateAsync(Service s) { db.Services.Update(s); await db.SaveChangesAsync(); return s; }
    public async Task<bool> DeleteAsync(Guid id)
    {
        var s = await db.Services.FindAsync(id);
        if (s is null) return false;
        db.Services.Remove(s); await db.SaveChangesAsync(); return true;
    }
}

public class InvoiceRepository(AppDbContext db) : IInvoiceRepository
{
    public async Task<IEnumerable<Invoice>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .Where(i => i.Room.Zone.LandlordId == landlordId).OrderByDescending(i => i.CreatedAt).ToListAsync();

    public async Task<IEnumerable<Invoice>> GetByTenantIdAsync(Guid tenantProfileId) =>
        await db.Invoices.Include(i => i.Room).Include(i => i.Items)
            .Where(i => i.TenantProfileId == tenantProfileId).OrderByDescending(i => i.CreatedAt).ToListAsync();

    public async Task<Invoice?> GetByIdAsync(Guid id) =>
        await db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items).Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.Id == id);

    public async Task<Invoice> CreateAsync(Invoice inv) { db.Invoices.Add(inv); await db.SaveChangesAsync(); return inv; }
    public async Task<Invoice> UpdateAsync(Invoice inv) { db.Invoices.Update(inv); await db.SaveChangesAsync(); return inv; }
    public async Task<bool> DeleteAsync(Guid id)
    {
        var inv = await db.Invoices.FindAsync(id);
        if (inv is null) return false;
        db.Invoices.Remove(inv); await db.SaveChangesAsync(); return true;
    }
}

public class PaymentRepository(AppDbContext db) : IPaymentRepository
{
    public async Task<IEnumerable<Payment>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.Payments.Include(p => p.Invoice).ThenInclude(i => i.Room).ThenInclude(r => r.Zone)
            .Where(p => p.Invoice.Room.Zone.LandlordId == landlordId).OrderByDescending(p => p.CreatedAt).ToListAsync();

    public async Task<IEnumerable<Payment>> GetByInvoiceIdAsync(Guid invoiceId) =>
        await db.Payments.Where(p => p.InvoiceId == invoiceId).ToListAsync();

    public async Task<Payment?> GetByIdAsync(Guid id) =>
        await db.Payments.Include(p => p.Invoice).FirstOrDefaultAsync(p => p.Id == id);

    public async Task<Payment> CreateAsync(Payment p) { db.Payments.Add(p); await db.SaveChangesAsync(); return p; }
    public async Task<Payment> UpdateAsync(Payment p) { db.Payments.Update(p); await db.SaveChangesAsync(); return p; }
}

public class MaintenanceRepository(AppDbContext db) : IMaintenanceRepository
{
    public async Task<IEnumerable<MaintenanceRequest>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.MaintenanceRequests.Include(m => m.Room).ThenInclude(r => r.Zone)
            .Include(m => m.TenantProfile).ThenInclude(t => t.User)
            .Where(m => m.Room.Zone.LandlordId == landlordId).OrderByDescending(m => m.CreatedAt).ToListAsync();

    public async Task<IEnumerable<MaintenanceRequest>> GetByTenantIdAsync(Guid tenantProfileId) =>
        await db.MaintenanceRequests.Include(m => m.Room)
            .Where(m => m.TenantProfileId == tenantProfileId).OrderByDescending(m => m.CreatedAt).ToListAsync();

    public async Task<MaintenanceRequest?> GetByIdAsync(Guid id) =>
        await db.MaintenanceRequests.Include(m => m.Room).Include(m => m.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(m => m.Id == id);

    public async Task<MaintenanceRequest> CreateAsync(MaintenanceRequest m) { db.MaintenanceRequests.Add(m); await db.SaveChangesAsync(); return m; }
    public async Task<MaintenanceRequest> UpdateAsync(MaintenanceRequest m) { db.MaintenanceRequests.Update(m); await db.SaveChangesAsync(); return m; }
    public async Task<bool> DeleteAsync(Guid id)
    {
        var m = await db.MaintenanceRequests.FindAsync(id);
        if (m is null) return false;
        db.MaintenanceRequests.Remove(m); await db.SaveChangesAsync(); return true;
    }
}

public class NotificationRepository(AppDbContext db) : INotificationRepository
{
    public async Task<IEnumerable<Notification>> GetForUserAsync(Guid userId, string role) =>
        await db.Notifications
            .Include(n => n.Sender)
            .Include(n => n.Reads.Where(r => r.UserId == userId))
            .Where(n =>
                n.Target == Core.Enums.NotificationTarget.AllLandlords && role == "Landlord" ||
                n.Target == Core.Enums.NotificationTarget.AllTenants && role == "Tenant" ||
                n.Target == Core.Enums.NotificationTarget.User && n.TargetId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

    public async Task<Notification?> GetByIdAsync(Guid id) => await db.Notifications.Include(n => n.Sender).FirstOrDefaultAsync(n => n.Id == id);
    public async Task<Notification> CreateAsync(Notification n) { db.Notifications.Add(n); await db.SaveChangesAsync(); return n; }
    public async Task<Notification> UpdateAsync(Notification n) { db.Notifications.Update(n); await db.SaveChangesAsync(); return n; }
    public async Task<bool> DeleteAsync(Guid id)
    {
        var n = await db.Notifications.FindAsync(id);
        if (n is null) return false;
        db.Notifications.Remove(n); await db.SaveChangesAsync(); return true;
    }
    public async Task MarkAsReadAsync(Guid notificationId, Guid userId)
    {
        var read = await db.NotificationReads.FirstOrDefaultAsync(r => r.NotificationId == notificationId && r.UserId == userId);
        if (read is null)
        {
            db.NotificationReads.Add(new NotificationRead { NotificationId = notificationId, UserId = userId, IsRead = true, ReadAt = DateTime.UtcNow });
        }
        else { read.IsRead = true; read.ReadAt = DateTime.UtcNow; }
        await db.SaveChangesAsync();
    }
}

public class ComplaintRepository(AppDbContext db) : IComplaintRepository
{
    public async Task<IEnumerable<Complaint>> GetAllAsync() =>
        await db.Complaints.Include(c => c.Sender).OrderByDescending(c => c.CreatedAt).ToListAsync();
    public async Task<Complaint?> GetByIdAsync(Guid id) => await db.Complaints.Include(c => c.Sender).FirstOrDefaultAsync(c => c.Id == id);
    public async Task<Complaint> CreateAsync(Complaint c) { db.Complaints.Add(c); await db.SaveChangesAsync(); return c; }
    public async Task<Complaint> UpdateAsync(Complaint c) { db.Complaints.Update(c); await db.SaveChangesAsync(); return c; }
}
