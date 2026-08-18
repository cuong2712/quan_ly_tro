using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SmartRent.API.Hubs;

// Hub SignalR quản lý kết nối WebSocket và phát thông báo Realtime cho người dùng
[Authorize]
public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value 
            ?? Context.User?.FindFirst("role")?.Value;
        if (!string.IsNullOrEmpty(role))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, role);
            await Groups.AddToGroupAsync(Context.ConnectionId, role.ToLower());
        }

        var userId = Context.UserIdentifier 
            ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value 
            ?? Context.User?.FindFirst("sub")?.Value 
            ?? Context.User?.FindFirst("nameid")?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);
            await Groups.AddToGroupAsync(Context.ConnectionId, userId.ToLower());
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId.ToLower()}");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, "AuthenticatedUsers");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value 
            ?? Context.User?.FindFirst("role")?.Value;
        if (!string.IsNullOrEmpty(role))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, role);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, role.ToLower());
        }

        var userId = Context.UserIdentifier 
            ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value 
            ?? Context.User?.FindFirst("sub")?.Value 
            ?? Context.User?.FindFirst("nameid")?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId.ToLower());
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId.ToLower()}");
        }

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "AuthenticatedUsers");
        await base.OnDisconnectedAsync(exception);
    }
}
