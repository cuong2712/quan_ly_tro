using SmartRent.Core.Enums;

namespace SmartRent.Core.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string? AvatarUrl { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankAccountName { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    // Navigation
    public ICollection<Zone> Zones { get; set; } = [];
    public ICollection<Service> Services { get; set; } = [];
    public UtilityRate? UtilityRate { get; set; }
    public TenantProfile? TenantProfile { get; set; }
    public ICollection<Notification> SentNotifications { get; set; } = [];
    public ICollection<NotificationRead> NotificationReads { get; set; } = [];
    public ICollection<Complaint> Complaints { get; set; } = [];
}

public class Zone
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LandlordId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TotalRooms { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User Landlord { get; set; } = null!;
    public ICollection<Room> Rooms { get; set; } = [];
}

public class Room
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ZoneId { get; set; }
    public string RoomNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public decimal Price { get; set; }
    public decimal Area { get; set; }
    public int MaxTenants { get; set; }
    public RoomStatus Status { get; set; } = RoomStatus.Vacant;
    public decimal ElecMeter { get; set; }
    public decimal WaterMeter { get; set; }
    public decimal ServiceFee { get; set; } = 0;
    public string? Description { get; set; }
    public string? Amenities { get; set; }
    public decimal? DepositAmount { get; set; }
    public string? DepositTenantName { get; set; }
    public string? DepositTenantPhone { get; set; }
    public DateTime? ExpectedMoveInDate { get; set; }
    public string? DepositNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Zone Zone { get; set; } = null!;
    public ICollection<TenantProfile> Tenants { get; set; } = [];
    public ICollection<Contract> Contracts { get; set; } = [];
    public ICollection<UtilityLog> UtilityLogs { get; set; } = [];
    public ICollection<Invoice> Invoices { get; set; } = [];
    public ICollection<MaintenanceRequest> MaintenanceRequests { get; set; } = [];
    public ICollection<RoomEquipment> Equipments { get; set; } = [];
}

public class RoomEquipment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoomId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Brand { get; set; }
    public int Quantity { get; set; } = 1;
    public string Condition { get; set; } = "Hoạt động tốt";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Room Room { get; set; } = null!;
}

public class TenantProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid? RoomId { get; set; }
    public Guid? LandlordId { get; set; }
    public string CCCD { get; set; } = string.Empty;
    public string? Hometown { get; set; }
    public DateTime? MoveInDate { get; set; }
    public decimal Deposit { get; set; }
    public string? CccdFrontUrl { get; set; }
    public string? CccdBackUrl { get; set; }
    public int VehicleCount { get; set; } = 0;
    public string? VehicleInfo { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;


    // Navigation
    public User User { get; set; } = null!;
    public User? Landlord { get; set; }
    public Room? Room { get; set; }
    public ICollection<Contract> Contracts { get; set; } = [];
    public ICollection<Invoice> Invoices { get; set; } = [];
    public ICollection<MaintenanceRequest> MaintenanceRequests { get; set; } = [];
}

public class Contract
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ContractCode { get; set; } = string.Empty;
    public Guid RoomId { get; set; }
    public Guid TenantProfileId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal RentAmount { get; set; }
    public decimal Deposit { get; set; }
    public ContractStatus Status { get; set; } = ContractStatus.Active;
    public int PaymentTermDay { get; set; } = 5;
    public string? Terms { get; set; }
    public string? FileUrl { get; set; }
    public int? RequestedRenewMonths { get; set; }
    public string? RenewNotes { get; set; }
    public DateTime? RenewRequestedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Room Room { get; set; } = null!;
    public TenantProfile TenantProfile { get; set; } = null!;
}

public class UtilityLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoomId { get; set; }
    public string Month { get; set; } = string.Empty; // "2026-07"
    public decimal OldElec { get; set; }
    public decimal NewElec { get; set; }
    public decimal ElecUsed { get; set; }
    public decimal OldWater { get; set; }
    public decimal NewWater { get; set; }
    public decimal WaterUsed { get; set; }
    public decimal ElecCost { get; set; }
    public decimal WaterCost { get; set; }
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Room Room { get; set; } = null!;
}

public class Service
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LandlordId { get; set; }
    public Guid? ZoneId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Unit { get; set; } = "phòng/tháng";
    public string? Icon { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User Landlord { get; set; } = null!;
    public Zone? Zone { get; set; }
}

public class Invoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string InvoiceCode { get; set; } = string.Empty;
    public Guid RoomId { get; set; }
    public Guid TenantProfileId { get; set; }
    public string Month { get; set; } = string.Empty; // "2026-07"
    public decimal RentFee { get; set; }
    public decimal ElecFee { get; set; }
    public decimal WaterFee { get; set; }
    public decimal ServiceFee { get; set; }
    public decimal TotalAmount { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Unpaid;
    public DateTime DueDate { get; set; }
    public DateTime? PaidDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Dispute / Report Invoice Review
    public bool IsReported { get; set; } = false;
    public string? DisputeReason { get; set; }
    public string? DisputeDescription { get; set; }
    public string? DisputeImageUrl { get; set; }
    public string? DisputeStatus { get; set; } // "Pending", "Resolved", "Rejected"
    public DateTime? DisputeCreatedAt { get; set; }
    public DateTime? DisputeResolvedAt { get; set; }
    public string? DisputeReply { get; set; }
    public Guid? DisputeHandledBy { get; set; }
    public decimal? SuggestedElecNumber { get; set; }
    public decimal? SuggestedWaterNumber { get; set; }

    // Navigation
    public Room Room { get; set; } = null!;
    public TenantProfile TenantProfile { get; set; } = null!;
    public ICollection<InvoiceItem> Items { get; set; } = [];
    public ICollection<Payment> Payments { get; set; } = [];
}

public class InvoiceItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InvoiceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }

    // Navigation
    public Invoice Invoice { get; set; } = null!;
}

public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InvoiceId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.PendingApproval;
    public string? ProofImageUrl { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ConfirmedAt { get; set; }
    public Guid? ConfirmedBy { get; set; }

    // Navigation
    public Invoice Invoice { get; set; } = null!;
}

public class MaintenanceRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoomId { get; set; }
    public Guid TenantProfileId { get; set; }
    public string IssueType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public MaintenancePriority Priority { get; set; } = MaintenancePriority.Medium;
    public MaintenanceStatus Status { get; set; } = MaintenanceStatus.Pending;
    public string? AssignedTo { get; set; }
    public string? ImageUrl { get; set; }
    public string? CompletionNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    // Navigation
    public Room Room { get; set; } = null!;
    public TenantProfile TenantProfile { get; set; } = null!;
}

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SenderId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public NotificationTarget Target { get; set; }
    public Guid? TargetId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User Sender { get; set; } = null!;
    public ICollection<NotificationRead> Reads { get; set; } = [];
}

public class NotificationRead
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid NotificationId { get; set; }
    public Guid UserId { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime? ReadAt { get; set; }

    // Navigation
    public Notification Notification { get; set; } = null!;
    public User User { get; set; } = null!;
}

public class Complaint
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SenderId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public ComplaintStatus Status { get; set; } = ComplaintStatus.Pending;
    public string? Reply { get; set; }
    public Guid? RepliedBy { get; set; }
    public DateTime? RepliedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User Sender { get; set; } = null!;
}

public class UtilityRate
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LandlordId { get; set; }
    public decimal ElecPrice { get; set; } = 3500;
    public decimal WaterPrice { get; set; } = 18000;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User Landlord { get; set; } = null!;
}
