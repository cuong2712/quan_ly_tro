namespace SmartRent.Core.DTOs;

public record MaintenanceRequestDto(
    Guid Id, Guid RoomId, string RoomNumber,
    string TenantName, string TenantPhone,
    string IssueType, string Title, string? Description,
    string Priority, string Status, string? AssignedTo,
    string? ImageUrl, string? CompletionNote,
    DateTime CreatedAt, DateTime? CompletedAt
);

public record CreateMaintenanceRequest(
    Guid? RoomId,
    string? IssueType,
    string Title,
    string? Description,
    string Priority,
    string? ImageUrl,
    string? AssignedTo = null
);

public record UpdateMaintenanceRequest(
    string Status, string? AssignedTo, string? CompletionNote
);
