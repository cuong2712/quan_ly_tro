using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using SmartRent.Core.Enums;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;
using System.Security.Claims;


namespace SmartRent.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AuthService authService) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try { return Ok(await authService.LoginAsync(request)); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
    {
        try { return Ok(await authService.RefreshTokenAsync(request.RefreshToken)); }
        catch { return Unauthorized(new { message = "Token không hợp lệ hoặc đã hết hạn" }); }
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await authService.LogoutAsync(userId);
        return Ok(new { message = "Đăng xuất thành công" });
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin")]
public class AdminController(AdminService adminService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats() => Ok(await adminService.GetSystemStatsAsync());

    [HttpGet("landlords")]
    public async Task<IActionResult> GetLandlords([FromQuery] string? search, [FromQuery] bool? isActive)
        => Ok(await adminService.GetLandlordsAsync(search, isActive));

    [HttpPost("landlords")]
    public async Task<IActionResult> CreateLandlord([FromBody] CreateLandlordRequest request)
    {
        try { return CreatedAtAction(nameof(GetLandlords), await adminService.CreateLandlordAsync(request)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("landlords/{id:guid}")]
    public async Task<IActionResult> UpdateLandlord(Guid id, [FromBody] UpdateLandlordRequest request)
    {
        try { return Ok(await adminService.UpdateLandlordAsync(id, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPatch("landlords/{id:guid}/toggle-lock")]
    public async Task<IActionResult> ToggleLock(Guid id)
    {
        await adminService.ToggleLockAsync(id);
        return Ok(new { message = "Cập nhật trạng thái thành công" });
    }

    [HttpPatch("landlords/{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id)
    {
        await adminService.ResetPasswordAsync(id);
        return Ok(new { message = "Đặt lại mật khẩu thành công: SmartRent@2026" });
    }

    [HttpGet("complaints")]
    public async Task<IActionResult> GetComplaints() => Ok(await adminService.GetComplaintsAsync());

    [HttpPost("complaints/{id:guid}/reply")]
    public async Task<IActionResult> ReplyComplaint(Guid id, [FromBody] ReplyComplaintRequest request)
    {
        try { return Ok(await adminService.ReplyComplaintAsync(id, CurrentUserId, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPatch("complaints/{id:guid}/status")]
    public async Task<IActionResult> UpdateComplaintStatus(Guid id, [FromQuery] string status)
    {
        await adminService.UpdateComplaintStatusAsync(id, status);
        return Ok();
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Landlord")]
public class ZonesController(ZoneService zoneService) : ControllerBase
{
    private Guid LandlordId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetZones() => Ok(await zoneService.GetByLandlordAsync(LandlordId));

    [HttpPost]
    public async Task<IActionResult> CreateZone([FromBody] CreateZoneRequest request)
        => CreatedAtAction(nameof(GetZones), await zoneService.CreateAsync(LandlordId, request));

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateZone(Guid id, [FromBody] UpdateZoneRequest request)
    {
        try { return Ok(await zoneService.UpdateAsync(id, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteZone(Guid id)
        => await zoneService.DeleteAsync(id) ? NoContent() : NotFound();
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Landlord")]
public class RoomsController(RoomService roomService) : ControllerBase
{
    private Guid LandlordId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetRooms([FromQuery] Guid? zoneId)
        => Ok(await roomService.GetByLandlordAsync(LandlordId, zoneId));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetRoom(Guid id)
    {
        var room = await roomService.GetByIdAsync(id);
        return room is null ? NotFound() : Ok(room);
    }

    [HttpGet("{id:guid}/detail")]
    public async Task<IActionResult> GetRoomDetail(Guid id)
    {
        var detail = await roomService.GetRoomDetailAsync(id);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
    {
        try { return CreatedAtAction(nameof(GetRoom), new { id = Guid.Empty }, await roomService.CreateAsync(LandlordId, request)); }
        catch (KeyNotFoundException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateRoom(Guid id, [FromBody] UpdateRoomRequest request)
    {
        try { return Ok(await roomService.UpdateAsync(id, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteRoom(Guid id)
        => await roomService.DeleteAsync(id) ? NoContent() : NotFound();
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Landlord")]
public class TenantsController(TenantService tenantService) : ControllerBase
{
    private Guid LandlordId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetTenants() => Ok(await tenantService.GetByLandlordAsync(LandlordId));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetTenant(Guid id)
    {
        var t = await tenantService.GetByIdAsync(id);
        return t is null ? NotFound() : Ok(t);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTenant([FromBody] CreateTenantRequest request)
    {
        try { return CreatedAtAction(nameof(GetTenant), new { id = Guid.Empty }, await tenantService.CreateAsync(LandlordId, request)); }
        catch (Exception ex) { return BadRequest(new { message = ex.InnerException?.Message ?? ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateTenant(Guid id, [FromBody] UpdateTenantRequest request)
    {
        try { return Ok(await tenantService.UpdateAsync(id, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTenant(Guid id)
        => await tenantService.DeleteAsync(id) ? NoContent() : NotFound();
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ContractsController(ContractService contractService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<IActionResult> GetContracts()
    {
        if (CurrentRole == "Landlord")
            return Ok(await contractService.GetByLandlordAsync(CurrentUserId));
        var tenantSvc = HttpContext.RequestServices.GetRequiredService<TenantService>();
        var profile = await tenantSvc.GetByUserIdAsync(CurrentUserId);
        if (profile is null) return NotFound();
        return Ok(await contractService.GetByTenantAsync(profile.Id));
    }

    [HttpPost]
    public async Task<IActionResult> CreateContract([FromBody] CreateContractRequest request)
    {
        try { return Ok(await contractService.CreateAsync(request)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateContract(Guid id, [FromBody] UpdateContractRequest request)
    {
        try { return Ok(await contractService.UpdateAsync(id, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteContract(Guid id)
        => await contractService.DeleteAsync(id) ? NoContent() : NotFound();

    [HttpPatch("{id:guid}/terminate")]
    public async Task<IActionResult> Terminate(Guid id)
    {
        await contractService.TerminateAsync(id);
        return Ok(new { message = "Thanh lý hợp đồng thành công" });
    }

    [HttpPost("{id:guid}/renew")]
    public async Task<IActionResult> Renew(Guid id, [FromBody] RenewContractRequest request)
    {
        await contractService.RenewAsync(id, request);
        return Ok(new { message = "Gia hạn hợp đồng thành công" });
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Landlord")]
public class UtilitiesController(UtilityService utilityService) : ControllerBase
{
    private Guid LandlordId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetLogs([FromQuery] Guid? roomId)
        => Ok(await utilityService.GetByLandlordAsync(LandlordId, roomId));

    [HttpPost]
    public async Task<IActionResult> Record([FromBody] RecordUtilityRequest request)
    {
        try { return Ok(await utilityService.RecordAsync(LandlordId, request)); }
        catch (KeyNotFoundException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("rate")]
    public async Task<IActionResult> GetRate() => Ok(await utilityService.GetRateAsync(LandlordId));

    [HttpPut("rate")]
    public async Task<IActionResult> UpdateRate([FromBody] UpdateUtilityRateRequest request)
        => Ok(await utilityService.UpdateRateAsync(LandlordId, request));
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Landlord")]
public class ServicesController(ServiceMgmtService serviceMgmt) : ControllerBase
{
    private Guid LandlordId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetServices() => Ok(await serviceMgmt.GetByLandlordAsync(LandlordId));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateServiceRequest req)
        => CreatedAtAction(nameof(GetServices), await serviceMgmt.CreateAsync(LandlordId, req));

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateServiceRequest req)
    {
        try { return Ok(await serviceMgmt.UpdateAsync(id, req)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) => await serviceMgmt.DeleteAsync(id) ? NoContent() : NotFound();
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController(InvoiceService invoiceService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<IActionResult> GetInvoices([FromQuery] string? status, [FromQuery] string? month)
    {
        if (CurrentRole == "Landlord")
            return Ok(await invoiceService.GetByLandlordAsync(CurrentUserId, status, month));

        return Ok(await invoiceService.GetByTenantUserIdAsync(CurrentUserId));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetInvoice(Guid id)
    {
        var inv = await invoiceService.GetByIdAsync(id);
        return inv is null ? NotFound() : Ok(inv);
    }

    [HttpPost]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest request)
    {
        try { return Ok(await invoiceService.CreateAsync(CurrentUserId, request)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] string status)
    {
        try { return Ok(await invoiceService.UpdateStatusAsync(id, status)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentsController(PaymentService paymentService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<IActionResult> GetPayments()
    {
        if (CurrentRole == "Landlord")
            return Ok(await paymentService.GetByLandlordAsync(CurrentUserId));

        return Ok(await paymentService.GetByTenantUserIdAsync(CurrentUserId));
    }

    [HttpPost]
    [Authorize(Roles = "Tenant")]
    public async Task<IActionResult> Submit([FromBody] SubmitPaymentRequest request)
    {
        try { return Ok(await paymentService.SubmitAsync(CurrentUserId, request)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPatch("{id:guid}/confirm")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> Confirm(Guid id, [FromBody] ConfirmPaymentRequest request)
    {
        try { return Ok(await paymentService.ConfirmAsync(id, CurrentUserId, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MaintenanceController(MaintenanceService maintenanceService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<IActionResult> GetRequests()
    {
        if (CurrentRole == "Landlord")
            return Ok(await maintenanceService.GetByLandlordAsync(CurrentUserId));
            
        return Ok(await maintenanceService.GetByTenantUserIdAsync(CurrentUserId));
    }

    [HttpPost]
    [Authorize(Roles = "Tenant")]
    public async Task<IActionResult> Create([FromBody] CreateMaintenanceRequest request)
    {
        try { return Ok(await maintenanceService.CreateAsync(CurrentUserId, request)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Landlord")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMaintenanceRequest request)
    {
        try { return Ok(await maintenanceService.UpdateAsync(id, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController(NotificationService notifService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<IActionResult> GetNotifications()
        => Ok(await notifService.GetForUserAsync(CurrentUserId, CurrentRole));

    [HttpPost]
    [Authorize(Roles = "Landlord,SuperAdmin")]
    public async Task<IActionResult> Create([FromBody] CreateNotificationRequest request)
        => Ok(await notifService.CreateAsync(CurrentUserId, request));

    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        await notifService.MarkReadAsync(id, CurrentUserId);
        return Ok();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Landlord,SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id)
        => await notifService.DeleteAsync(id) ? NoContent() : NotFound();
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ComplaintsController(ComplaintService complaintService, AdminService adminService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAll() => Ok(await complaintService.GetAllAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNotificationRequest request)
        => Ok(await complaintService.CreateAsync(CurrentUserId, request.Title, request.Content));

    [HttpPost("{id:guid}/reply")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Reply(Guid id, [FromBody] ReplyComplaintRequest request)
        => Ok(await complaintService.ReplyAsync(id, CurrentUserId, request.Reply));
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController(ProfileService profileService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var profile = await profileService.GetProfileAsync(CurrentUserId);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        try { return Ok(await profileService.UpdateProfileAsync(CurrentUserId, request)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        try { await profileService.ChangePasswordAsync(CurrentUserId, request); return Ok(new { message = "Đổi mật khẩu thành công" }); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController(AppDbContext db) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

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

    [HttpGet("tenant")]
    [Authorize(Roles = "Tenant")]
    public async Task<IActionResult> GetTenantDashboard()
    {
        var profile = await db.TenantProfiles.Include(t => t.Room).ThenInclude(r => r!.Zone).Include(t => t.Contracts).FirstOrDefaultAsync(t => t.UserId == CurrentUserId);
        if (profile is null) return NotFound();
        var unpaidInvoices = await db.Invoices.CountAsync(i => i.TenantProfileId == profile.Id && i.Status == InvoiceStatus.Unpaid);
        var totalPaid = await db.Payments.Where(p => p.Invoice.TenantProfileId == profile.Id && p.Status == PaymentStatus.Completed).SumAsync(p => p.Amount);
        var maintenanceCount = await db.MaintenanceRequests.CountAsync(m => m.TenantProfileId == profile.Id);
        var activeContract = profile.Contracts.FirstOrDefault(c => c.Status == ContractStatus.Active);

        return Ok(new { roomNumber = profile.Room?.RoomNumber, zoneName = profile.Room?.Zone?.Name, rentAmount = profile.Room?.Price, deposit = profile.Deposit, moveInDate = profile.MoveInDate, unpaidInvoices, totalPaid, maintenanceCount, contractEndDate = activeContract?.EndDate });
    }
}
