using Microsoft.AspNetCore.SignalR;
using SmartRent.API.Hubs;
using SmartRent.Core.DTOs;
using SmartRent.Core.Interfaces;

namespace SmartRent.API.Services;

// Dịch vụ gửi thông báo Realtime qua SignalR Hub
public class RealtimeNotifier(IHubContext<NotificationHub> hubContext, ILogger<RealtimeNotifier> logger) : IRealtimeNotifier
{
    public async Task SendToUserAsync(Guid userId, NotificationDto notification)
    {
        try
        {
            var strId = userId.ToString();
            var strLower = strId.ToLower();
            // Gửi cả qua User ID và qua group của user để đảm bảo 100% nhận được
            await hubContext.Clients.Users(strId, strLower).SendAsync("ReceiveNotification", notification);
            await hubContext.Clients.Groups(strId, strLower, $"user_{strLower}").SendAsync("ReceiveNotification", notification);
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
            await hubContext.Clients.Groups(role, role.ToLower(), role.ToUpper()).SendAsync("ReceiveNotification", notification);
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
        else if (notification.Target == "AllTenants")
        {
            await SendToRoleAsync("Tenant", notification);
        }
        else if (notification.Target == "SuperAdmin")
        {
            await SendToRoleAsync("SuperAdmin", notification);
        }
        else
        {
            await SendToAllAsync(notification);
        }
    }
}
