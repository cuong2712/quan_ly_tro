using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller cung cấp chỉ số thống kê Dashboard cho Chủ trọ và Khách thuê.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController(AppDbContext db) : ControllerBase
{
    private Guid CurrentUserId => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

    // Lấy chỉ số tổng quan Dashboard dành cho Chủ trọ (tổng số phòng, phòng trống, doanh thu, hóa đơn chưa thu...).
    [HttpGet("landlord")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> GetLandlordDashboard()
    {
        var totalZones = await db.Zones.CountAsync(z => z.LandlordId == CurrentUserId);
        var totalRooms = await db.Rooms.CountAsync(r => r.Zone.LandlordId == CurrentUserId);
        var occupied = await db.Rooms.CountAsync(r => r.Zone.LandlordId == CurrentUserId && r.Status == RoomStatus.Occupied);
        var vacant = await db.Rooms.CountAsync(r => r.Zone.LandlordId == CurrentUserId && r.Status == RoomStatus.Vacant);
        var tenants = await db.TenantProfiles.CountAsync(t => t.Room != null && t.Room.Zone.LandlordId == CurrentUserId);
        var unpaidInvoices = await db.Invoices.CountAsync(i => i.Room.Zone.LandlordId == CurrentUserId && i.Status == InvoiceStatus.Unpaid);
        var revenue = await db.Payments.Where(p => p.Invoice.Room.Zone.LandlordId == CurrentUserId && p.Status == PaymentStatus.Completed).SumAsync(p => p.Amount);
        var pendingMaintenance = await db.MaintenanceRequests.CountAsync(m => m.Room.Zone.LandlordId == CurrentUserId && m.Status == MaintenanceStatus.Pending);

        return Ok(new { totalZones, totalRooms, occupied, vacant, tenants, unpaidInvoices, revenue, pendingMaintenance, occupancyRate = totalRooms > 0 ? Math.Round((double)occupied / totalRooms * 100, 1) : 0 });
    }

    // Lấy chỉ số tổng quan Dashboard dành cho Khách thuê (thông tin phòng ở, tiền phòng, xe cộ, số hóa đơn nợ, tổng tiền đã đóng...).
    [HttpGet("tenant")]
    [Authorize(Roles = "Tenant")]
    public async Task<IActionResult> GetTenantDashboard()
    {
        var profile = await db.TenantProfiles.AsNoTracking().Include(t => t.Room).ThenInclude(r => r!.Zone).Include(t => t.Contracts).FirstOrDefaultAsync(t => t.UserId == CurrentUserId);
        if (profile == null)
        {
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == CurrentUserId);
            if (user != null)
            {
                profile = await db.TenantProfiles.AsNoTracking().Include(t => t.Room).ThenInclude(r => r!.Zone).Include(t => t.Contracts).FirstOrDefaultAsync(t => t.User.Email == user.Email);
            }
        }
        if (profile is null) return NotFound(new { message = "Không tìm thấy hồ sơ người thuê." });

        var unpaidInvoices = await db.Invoices.CountAsync(i => (i.TenantProfileId == profile.Id || (profile.RoomId.HasValue && i.RoomId == profile.RoomId.Value)) && i.Status == InvoiceStatus.Unpaid);
        var totalPaid = await db.Payments.Where(p => (p.Invoice.TenantProfileId == profile.Id || (profile.RoomId.HasValue && p.Invoice.RoomId == profile.RoomId.Value)) && p.Status == PaymentStatus.Completed).SumAsync(p => p.Amount);
        var maintenanceCount = await db.MaintenanceRequests.CountAsync(m => m.TenantProfileId == profile.Id);
        var activeContract = profile.Contracts.FirstOrDefault(c => c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested);

        return Ok(new { 
            roomNumber = profile.Room?.RoomNumber, 
            zoneName = profile.Room?.Zone?.Name, 
            rentAmount = profile.Room?.Price, 
            deposit = profile.Deposit, 
            moveInDate = profile.MoveInDate, 
            unpaidInvoices, 
            totalPaid, 
            maintenanceCount, 
            contractEndDate = activeContract?.EndDate,
            vehicleCount = profile.VehicleCount,
            vehicleInfo = profile.VehicleInfo,
            cccd = profile.CCCD,
            hometown = profile.Hometown
        });
    }
}
