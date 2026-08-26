using SmartRent.Core.Enums;
namespace SmartRent.Core.DTOs;

public record SystemStatsDto(
    int TotalLandlords,
    int TotalTenants,
    int TotalZones,
    int TotalRooms,
    int OccupiedRooms,
    int VacantRooms,
    decimal TotalRevenue,
    int TotalInvoices,
    decimal OccupancyRate,
    decimal VacancyRate
);

public record LandlordListDto(
    Guid Id, string FullName, string Email, string Phone,
    string? AvatarUrl, bool IsActive, string Role,
    int ZonesCount, int RoomsCount, DateTime CreatedAt,
    string? Cccd = null, string? Hometown = null,
    string? CccdFrontUrl = null, string? CccdBackUrl = null
);

public record CreateLandlordRequest(
    string FullName, string Email, string Phone,
    string Password, string CCCD, string? Hometown = null,
    string? AvatarUrl = null, string? CccdFrontUrl = null, string? CccdBackUrl = null
);

public record UpdateLandlordRequest(
    string FullName, string Phone, string? AvatarUrl = null,
    string? CCCD = null, string? Hometown = null,
    string? CccdFrontUrl = null, string? CccdBackUrl = null
);

public record ComplaintDto(
    Guid Id, string SenderName, string SenderEmail, string Role,
    string Title, string Content, string Status,
    string? Reply, DateTime CreatedAt, DateTime? RepliedAt
);

public record ReplyComplaintRequest(string Reply);
public record ResetPasswordRequest(string? NewPassword = null);

// DTOs dành cho SuperAdmin quản lý Khách thuê
public record AdminTenantListDto(
    Guid Id,
    Guid UserId,
    string FullName,
    string Email,
    string Phone,
    string? AvatarUrl,
    bool IsActive,
    Guid? RoomId,
    string? RoomNumber,
    string? ZoneName,
    Guid? LandlordId,
    string? LandlordName,
    string? CCCD,
    string? Hometown,
    string? CccdFrontUrl,
    string? CccdBackUrl,
    DateTime? MoveInDate,
    decimal Deposit,
    string? ActiveContractCode,
    bool IsPrimaryTenant,
    int UnpaidInvoicesCount,
    decimal TotalUnpaidAmount,
    int VehicleCount,
    string? VehicleInfo,
    DateTime CreatedAt
);

public record AdminTenantContractDto(
    Guid Id,
    string ContractCode,
    string RoomNumber,
    string ZoneName,
    string LandlordName,
    DateTime StartDate,
    DateTime EndDate,
    decimal RentAmount,
    decimal Deposit,
    string Status,
    DateTime CreatedAt
);

public record AdminTenantInvoiceDto(
    Guid Id,
    string InvoiceCode,
    string Month,
    decimal TotalAmount,
    string Status,
    DateTime DueDate,
    DateTime? PaidDate,
    DateTime CreatedAt
);

public record AdminTenantDetailDto(
    Guid Id,
    Guid UserId,
    string FullName,
    string Email,
    string Phone,
    string? AvatarUrl,
    bool IsActive,
    Guid? RoomId,
    string? RoomNumber,
    string? ZoneName,
    Guid? LandlordId,
    string? LandlordName,
    string? LandlordPhone,
    string? CCCD,
    string? Hometown,
    string? CccdFrontUrl,
    string? CccdBackUrl,
    DateTime? MoveInDate,
    decimal Deposit,
    int VehicleCount,
    string? VehicleInfo,
    bool IsPrimaryTenant,
    List<AdminTenantContractDto> Contracts,
    List<AdminTenantInvoiceDto> UnpaidInvoices,
    DateTime CreatedAt
);

