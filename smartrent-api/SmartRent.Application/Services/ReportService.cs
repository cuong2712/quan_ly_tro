using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;
using System.Text;

namespace SmartRent.Application.Services;

// Dịch vụ Thống kê Báo cáo Tài chính & Lợi nhuận
public class ReportService(AppDbContext db)
{
    // Lấy tổng quan báo cáo tài chính (Doanh thu, Nợ đọng, Chi phí bảo trì, Lợi nhuận ròng)
    public async Task<FinancialSummaryDto> GetFinancialSummaryAsync(Guid landlordId)
    {
        // 1. Lấy danh sách các phòng thuộc quyền quản lý của Landlord
        var landlordZoneIds = await db.Zones
            .Where(z => z.LandlordId == landlordId)
            .Select(z => z.Id)
            .ToListAsync();

        var roomIds = await db.Rooms
            .Where(r => landlordZoneIds.Contains(r.ZoneId))
            .Select(r => r.Id)
            .ToListAsync();

        // 2. Doanh thu thực tế đã thu (từ các Invoice có trạng thái Paid)
        var paidInvoices = await db.Invoices
            .Where(i => roomIds.Contains(i.RoomId) && i.Status == InvoiceStatus.Paid)
            .ToListAsync();

        var totalRevenue = paidInvoices.Sum(i => i.TotalAmount);

        // 3. Tổng tiền nợ chưa thu (Invoices trạng thái Unpaid hoặc Overdue)
        var unpaidInvoices = await db.Invoices
            .Where(i => roomIds.Contains(i.RoomId) && (i.Status == InvoiceStatus.Unpaid || i.Status == InvoiceStatus.Overdue))
            .ToListAsync();

        var totalUnpaidDebt = unpaidInvoices.Sum(i => i.TotalAmount);

        // 4. Chi phí bảo trì sửa chữa đã hoàn thành
        var maintenanceCount = await db.MaintenanceRequests
            .Where(m => roomIds.Contains(m.RoomId) && m.Status == MaintenanceStatus.Completed)
            .CountAsync();

        var totalExpense = maintenanceCount * 150000m; // Ước tính chi phí trung bình bảo trì

        var netProfit = totalRevenue - totalExpense;

        // Group theo từng tháng
        var monthlyGroup = paidInvoices
            .GroupBy(i => i.Month)
            .Select(g => new MonthlyFinancialItemDto(
                g.Key,
                g.Sum(x => x.TotalAmount),
                unpaidInvoices.Where(u => u.Month == g.Key).Sum(u => u.TotalAmount),
                0,
                g.Sum(x => x.TotalAmount)
            ))
            .OrderByDescending(m => m.Month)
            .ToList();

        return new FinancialSummaryDto(
            totalRevenue,
            totalUnpaidDebt,
            totalExpense,
            netProfit,
            paidInvoices.Count,
            unpaidInvoices.Count,
            monthlyGroup
        );
    }

    // Xuất file CSV/Excel báo cáo doanh thu tài chính (hỗ trợ UTF-8)
    public async Task<byte[]> ExportFinancialCsvAsync(Guid landlordId)
    {
        var landlordZoneIds = await db.Zones
            .Where(z => z.LandlordId == landlordId)
            .Select(z => z.Id)
            .ToListAsync();

        var invoices = await db.Invoices
            .Include(i => i.Room)
            .Include(i => i.TenantProfile).ThenInclude(t => t!.User)
            .Where(i => db.Rooms.Where(r => landlordZoneIds.Contains(r.ZoneId)).Select(r => r.Id).Contains(i.RoomId))
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var sb = new StringBuilder();
        // Ghi dòng tiêu đề cột CSV
        sb.AppendLine("Mã Hóa Đơn,Tháng,Số Phòng,Khách Thuê,Số Tiền (VNĐ),Trạng Thái,Ngày Tạo");

        foreach (var inv in invoices)
        {
            var statusText = inv.Status switch
            {
                InvoiceStatus.Paid => "Đã thanh toán",
                InvoiceStatus.Unpaid => "Chưa thanh toán",
                InvoiceStatus.Overdue => "Quá hạn",
                _ => "Đã hủy"
            };

            var tenantName = !string.IsNullOrWhiteSpace(inv.TenantProfile?.User?.FullName)
                ? inv.TenantProfile.User.FullName
                : "Khách thuê";
            sb.AppendLine($"\"{inv.InvoiceCode}\",\"{inv.Month}\",\"{inv.Room?.RoomNumber}\",\"{tenantName}\",\"{inv.TotalAmount}\",\"{statusText}\",\"{inv.CreatedAt:dd/MM/yyyy}\"");
        }

        // Đính kèm UTF-8 BOM để Excel hiển thị tiếng Việt không bị lỗi font
        var encoding = new UTF8Encoding(true);
        return encoding.GetBytes(sb.ToString());
    }
}
