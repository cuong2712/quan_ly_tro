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
        var maintenance = await db.Rooms.CountAsync(r => r.Status == RoomStatus.Maintenance);
        var deposit = await db.Rooms.CountAsync(r => r.Status == RoomStatus.Deposit);

        var paymentRevenue = await db.Payments.Where(p => p.Status == PaymentStatus.Completed).SumAsync(p => (decimal?)p.Amount) ?? 0;
        var invoiceRevenue = await db.Invoices.Where(i => i.Status == InvoiceStatus.Paid).SumAsync(i => (decimal?)i.TotalAmount) ?? 0;
        var totalRevenue = Math.Max(paymentRevenue, invoiceRevenue);
        var invoices = await db.Invoices.CountAsync();

        // Tính toán doanh thu thực tế theo từng tháng cho biểu đồ (6 tháng gần nhất)
        var now = DateTime.UtcNow;
        var monthKeys = new List<(string Key, string Label)>();
        for (int i = 5; i >= 0; i--)
        {
            var date = now.AddMonths(-i);
            var key = $"{date.Year}-{date.Month:D2}";
            var label = i == 0 ? $"T{date.Month}/{date.Year} (Hiện tại)" : $"T{date.Month}/{date.Year}";
            monthKeys.Add((key, label));
        }

        var paidInvoices = await db.Invoices
            .AsNoTracking()
            .Where(i => i.Status == InvoiceStatus.Paid)
            .Select(i => new { i.Month, i.TotalAmount })
            .ToListAsync();

        var monthlyRevenueList = monthKeys.Select(m =>
        {
            var sum = paidInvoices
                .Where(i => NormalizeMonthKey(i.Month) == m.Key)
                .Sum(i => i.TotalAmount);
            return new AdminMonthlyRevenueDto(m.Key, m.Label, sum);
        }).ToList();

        return new SystemStatsDto(
            landlords, tenants, zones, rooms, occupied, vacant, totalRevenue, invoices,
            rooms > 0 ? Math.Round((decimal)occupied / rooms * 100, 1) : 0,
            rooms > 0 ? Math.Round((decimal)vacant / rooms * 100, 1) : 0,
            maintenance,
            deposit,
            monthlyRevenueList
        );
    }

    private static string NormalizeMonthKey(string? rawMonth)
    {
        if (string.IsNullOrWhiteSpace(rawMonth)) return string.Empty;
        var trimmed = rawMonth.Trim();
        if (trimmed.Contains('/'))
        {
            var parts = trimmed.Split('/');
            if (parts.Length == 2 && parts[0].Length <= 2 && parts[1].Length == 4)
            {
                return $"{parts[1]}-{parts[0].PadLeft(2, '0')}";
            }
        }
        return trimmed;
    }
}

