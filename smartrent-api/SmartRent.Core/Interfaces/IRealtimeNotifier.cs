using SmartRent.Core.DTOs;

namespace SmartRent.Core.Interfaces;

// Giao diện điều phối và phát thông báo Realtime (SignalR / WebSockets)
public interface IRealtimeNotifier
{
    // Gửi thông báo đến một User cụ thể qua UserId
    Task SendToUserAsync(Guid userId, NotificationDto notification);

    // Gửi thông báo đến một nhóm theo Vai trò (Landlord, Tenant, SuperAdmin)
    Task SendToRoleAsync(string role, NotificationDto notification);

    // Gửi thông báo đến toàn bộ người dùng đang trực tuyến
    Task SendToAllAsync(NotificationDto notification);

    // Tự động phân loại và gửi thông báo theo Target ("User", "AllLandlords", "AllTenants", "All")
    Task SendNotificationAsync(NotificationDto notification);
}
