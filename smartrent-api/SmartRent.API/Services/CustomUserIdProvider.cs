using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace SmartRent.API.Services;

// Custom User ID Provider để SignalR luôn lấy đúng ID người dùng từ ClaimsPrincipal
public class CustomUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        return connection.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? connection.User?.FindFirst("sub")?.Value
            ?? connection.User?.FindFirst("nameid")?.Value;
    }
}
