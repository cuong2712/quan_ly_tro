using Microsoft.AspNetCore.SignalR;
using SmartRent.API.Hubs;
using SmartRent.Core.DTOs;
using SmartRent.Core.Interfaces;

namespace SmartRent.API.Services;

// Dịch vụ gửi thông báo Realtime qua SignalR Hub (đảm bảo mỗi client nhận duy nhất 1 thông báo)
public class RealtimeNotifier(IHubContext<NotificationHub> hubContext, ILogger<RealtimeNotifier> logger) : IRealtimeNotifier
{
    public async Task SendToUserAsync(Guid userId, NotificationDto notification)
    {
        try
        {
            var strLower = userId.ToString().ToLower();
            // Gửi duy nhất qua group chuẩn hóa của user
            await hubContext.Clients.Group($"user_{strLower}").SendAsync("ReceiveNotification", notification);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Lỗi khi gửi thông báo realtime cho User {UserId}", userId);
        }
    }

    public async Task SendToRoleAsync(string role, NotificationDto notification)
    {
        try
        {
            var roleLower = (role ?? "").ToLower();
            await hubContext.Clients.Group(roleLower).SendAsync("ReceiveNotification", notification);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Lỗi khi gửi thông báo realtime cho Role group {Role}", role);
        }
    }

    public async Task SendToAllAsync(NotificationDto notification)
    {
        try
        {
            await hubContext.Clients.Group("AuthenticatedUsers").SendAsync("ReceiveNotification", notification);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Lỗi khi gửi thông báo realtime cho toàn bộ người dùng");
        }
    }

    public async Task SendNotificationAsync(NotificationDto notification)
    {
        if (notification.Target == "User" && notification.TargetId.HasValue && notification.TargetId.Value != Guid.Empty)
        {
            await SendToUserAsync(notification.TargetId.Value, notification);
        }
        else if (notification.Target == "AllLandlords")
        {
            await SendToRoleAsync("Landlord", notification);
        }
        else if (notification.Target == "SuperAdmin")
        {
            await SendToRoleAsync("SuperAdmin", notification);
        }
        else if (notification.Target == "SystemAll" || notification.Target == "All")
        {
            await SendToAllAsync(notification);
        }
        else if (notification.Target == "AllTenants" || notification.Target == "Zone" || notification.Target == "Room")
        {
            await SendToRoleAsync("Tenant", notification);
        }
        else
        {
            await SendToAllAsync(notification);
        }
    }
}
