namespace SmartRent.Core.DTOs;

public record NotificationDto(
    Guid Id, string SenderName, string Title, string Content,
    string Target, Guid? TargetId, bool IsRead,
    DateTime CreatedAt
);

public record CreateNotificationRequest(
    string Title, string Content, string Target, Guid? TargetId
);
