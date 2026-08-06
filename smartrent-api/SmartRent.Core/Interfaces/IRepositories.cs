using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;

namespace SmartRent.Core.Interfaces;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<LoginResponse> RefreshTokenAsync(string refreshToken);
    Task LogoutAsync(Guid userId);
}

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdAsync(Guid id);
    Task<IEnumerable<User>> GetAllByRoleAsync(string role);
    Task<User> CreateAsync(User user);
    Task<User> UpdateAsync(User user);
    Task<bool> DeleteAsync(Guid id);
}

public interface IZoneRepository
{
    Task<IEnumerable<Zone>> GetByLandlordIdAsync(Guid landlordId);
    Task<Zone?> GetByIdAsync(Guid id);
    Task<Zone> CreateAsync(Zone zone);
    Task<Zone> UpdateAsync(Zone zone);
    Task<bool> DeleteAsync(Guid id);
}

public interface IRoomRepository
{
    Task<IEnumerable<Room>> GetByZoneIdAsync(Guid zoneId);
    Task<IEnumerable<Room>> GetByLandlordIdAsync(Guid landlordId);
    Task<Room?> GetByIdAsync(Guid id);
    Task<Room> CreateAsync(Room room);
    Task<Room> UpdateAsync(Room room);
    Task<bool> DeleteAsync(Guid id);
}

public interface ITenantRepository
{
    Task<IEnumerable<TenantProfile>> GetByLandlordIdAsync(Guid landlordId);
    Task<TenantProfile?> GetByIdAsync(Guid id);
    Task<TenantProfile?> GetByUserIdAsync(Guid userId);
    Task<TenantProfile?> GetByRoomIdAsync(Guid roomId);
    Task<TenantProfile> CreateAsync(TenantProfile tenant);
    Task<TenantProfile> UpdateAsync(TenantProfile tenant);
    Task<bool> DeleteAsync(Guid id);
}

public interface IContractRepository
{
    Task<IEnumerable<Contract>> GetByLandlordIdAsync(Guid landlordId);
    Task<IEnumerable<Contract>> GetByTenantIdAsync(Guid tenantProfileId);
    Task<Contract?> GetByIdAsync(Guid id);
    Task<Contract?> GetActiveByRoomIdAsync(Guid roomId);
    Task<Contract> CreateAsync(Contract contract);
    Task<Contract> UpdateAsync(Contract contract);
    Task<bool> DeleteAsync(Guid id);
}

public interface IUtilityRepository
{
    Task<IEnumerable<UtilityLog>> GetByRoomIdAsync(Guid roomId);
    Task<IEnumerable<UtilityLog>> GetByLandlordIdAsync(Guid landlordId);
    Task<UtilityLog?> GetByIdAsync(Guid id);
    Task<UtilityLog> CreateAsync(UtilityLog log);
    Task<UtilityLog> UpdateAsync(UtilityLog log);
    Task<UtilityRate?> GetRateByLandlordIdAsync(Guid landlordId);
    Task<UtilityRate> UpsertRateAsync(UtilityRate rate);
}

public interface IServiceRepository
{
    Task<IEnumerable<Service>> GetByLandlordIdAsync(Guid landlordId);
    Task<Service?> GetByIdAsync(Guid id);
    Task<Service> CreateAsync(Service service);
    Task<Service> UpdateAsync(Service service);
    Task<bool> DeleteAsync(Guid id);
}

public interface IInvoiceRepository
{
    Task<IEnumerable<Invoice>> GetByLandlordIdAsync(Guid landlordId);
    Task<IEnumerable<Invoice>> GetByTenantIdAsync(Guid tenantProfileId);
    Task<Invoice?> GetByIdAsync(Guid id);
    Task<Invoice> CreateAsync(Invoice invoice);
    Task<Invoice> UpdateAsync(Invoice invoice);
    Task<bool> DeleteAsync(Guid id);
}

public interface IPaymentRepository
{
    Task<IEnumerable<Payment>> GetByLandlordIdAsync(Guid landlordId);
    Task<IEnumerable<Payment>> GetByInvoiceIdAsync(Guid invoiceId);
    Task<Payment?> GetByIdAsync(Guid id);
    Task<Payment> CreateAsync(Payment payment);
    Task<Payment> UpdateAsync(Payment payment);
}

public interface IMaintenanceRepository
{
    Task<IEnumerable<MaintenanceRequest>> GetByLandlordIdAsync(Guid landlordId);
    Task<IEnumerable<MaintenanceRequest>> GetByTenantIdAsync(Guid tenantProfileId);
    Task<MaintenanceRequest?> GetByIdAsync(Guid id);
    Task<MaintenanceRequest> CreateAsync(MaintenanceRequest request);
    Task<MaintenanceRequest> UpdateAsync(MaintenanceRequest request);
    Task<bool> DeleteAsync(Guid id);
}

public interface INotificationRepository
{
    Task<IEnumerable<Notification>> GetForUserAsync(Guid userId, string role);
    Task<Notification?> GetByIdAsync(Guid id);
    Task<Notification> CreateAsync(Notification notification);
    Task<Notification> UpdateAsync(Notification notification);
    Task<bool> DeleteAsync(Guid id);
    Task MarkAsReadAsync(Guid notificationId, Guid userId);
}

public interface IComplaintRepository
{
    Task<IEnumerable<Complaint>> GetAllAsync();
    Task<Complaint?> GetByIdAsync(Guid id);
    Task<Complaint> CreateAsync(Complaint complaint);
    Task<Complaint> UpdateAsync(Complaint complaint);
}
