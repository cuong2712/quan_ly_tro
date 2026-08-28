using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Admin;

// Phân hệ Thống kê số liệu toàn sàn dành cho Super Admin.
public class AdminAnalyticsService(AppDbContext db)
{
    // Lấy tổng quan các chỉ số thống kê của toàn bộ hệ thống (Số chủ trọ, khách thuê, khu trọ, phòng, doanh thu...).
    public async Task<SystemStatsDto> GetSystemStatsAsync()
    {
        var landlords = await db.Users.CountAsync(u => u.Role == UserRole.Landlord);
        var tenants = await db.Users.CountAsync(u => u.Role == UserRole.Tenant);
        var zones = await db.Zones.CountAsync();
        var rooms = await db.Rooms.CountAsync();
        var occupied = await db.Rooms.CountAsync(r => r.Status == RoomStatus.Occupied);
        var vacant = await db.Rooms.CountAsync(r => r.Status == RoomStatus.Vacant);
        var revenue = await db.Payments.Where(p => p.Status == PaymentStatus.Completed).SumAsync(p => p.Amount);
        var invoices = await db.Invoices.CountAsync();

        return new SystemStatsDto(
            landlords, tenants, zones, rooms, occupied, vacant, revenue, invoices,
            rooms > 0 ? Math.Round((decimal)occupied / rooms * 100, 1) : 0,
            rooms > 0 ? Math.Round((decimal)vacant / rooms * 100, 1) : 0
        );
    }
}

