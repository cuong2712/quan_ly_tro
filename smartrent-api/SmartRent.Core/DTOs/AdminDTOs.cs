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
