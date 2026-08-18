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
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
        if (!string.IsNullOrEmpty(role))
        {
            // Thêm kết nối vào group theo vai trò (Landlord, Tenant, SuperAdmin)
            await Groups.AddToGroupAsync(Context.ConnectionId, role);
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, "AuthenticatedUsers");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
        if (!string.IsNullOrEmpty(role))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, role);
        }

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "AuthenticatedUsers");
        await base.OnDisconnectedAsync(exception);
    }
}
