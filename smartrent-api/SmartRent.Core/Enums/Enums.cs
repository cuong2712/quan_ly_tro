namespace SmartRent.Core.Enums;

public enum UserRole
{
    SuperAdmin = 1,
    Landlord = 2,
    Tenant = 3
}

public enum RoomStatus
{
    Vacant = 1,
    Occupied = 2,
    Maintenance = 3,
    Deposit = 4,
    Locked = 5
}

public enum ContractStatus
{
    Active = 1,
    Expired = 2,
    RenewRequested = 3,
    Liquidated = 4
}

public enum InvoiceStatus
{
    Unpaid = 1,
    Paid = 2,
    Overdue = 3
}

public enum PaymentMethod
{
    Cash = 1,
    BankTransfer = 2,
    VietQR = 3
}

public enum PaymentStatus
{
    PendingApproval = 1,
    Completed = 2,
    Rejected = 3
}

public enum MaintenancePriority
{
    Low = 1,
    Medium = 2,
    High = 3
}

public enum MaintenanceStatus
{
    Pending = 1,
    InProgress = 2,
    Completed = 3,
    Cancelled = 4
}

public enum NotificationTarget
{
    AllLandlords = 1,
    AllTenants = 2,
    Zone = 3,
    Room = 4,
    User = 5,
    SuperAdmin = 6
}

public enum ComplaintStatus
{
    Pending = 1,
    InProgress = 2,
    Resolved = 3
}
