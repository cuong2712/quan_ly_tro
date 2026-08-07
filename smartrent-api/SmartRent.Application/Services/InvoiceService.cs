using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Hóa đơn tiền nhà (tạo mới hóa đơn, xem danh sách hóa đơn, cập nhật trạng thái thanh toán).
public class InvoiceService(AppDbContext db)
{
    // Lấy danh sách hóa đơn dành cho Chủ trọ (lọc theo trạng thái và tháng).
    public async Task<IEnumerable<InvoiceDto>> GetByLandlordAsync(Guid landlordId, string? status = null, string? month = null)
    {
        var query = db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone).Include(i => i.TenantProfile).ThenInclude(t => t.User).Include(i => i.Items)
            .Where(i => i.Room.Zone.LandlordId == landlordId).AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(i => i.Status.ToString() == status);
        if (!string.IsNullOrEmpty(month)) query = query.Where(i => i.Month == month);
        return (await query.OrderByDescending(i => i.CreatedAt).ToListAsync()).Select(MapInvoice);
    }

    // Lấy danh sách hóa đơn của Khách thuê theo ID hồ sơ (TenantProfileId).
    public async Task<IEnumerable<InvoiceDto>> GetByTenantAsync(Guid tenantProfileId)
    {
        var invoices = await db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone).Include(i => i.Items)
            .Where(i => i.TenantProfileId == tenantProfileId).OrderByDescending(i => i.CreatedAt).ToListAsync();
        return invoices.Select(MapInvoice);
    }

    // Lấy danh sách hóa đơn của Khách thuê theo ID tài khoản (UserId).
    public async Task<IEnumerable<InvoiceDto>> GetByTenantUserIdAsync(Guid tenantUserId)
    {
        var profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == tenantUserId);
        if (profile == null)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == tenantUserId);
            if (user != null)
            {
                profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.User.Email == user.Email);
            }
        }

        if (profile == null) return [];

        var invoices = await db.Invoices
            .Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .Where(i => i.TenantProfileId == profile.Id || (profile.RoomId.HasValue && i.RoomId == profile.RoomId.Value))
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return invoices.Select(MapInvoice);
    }

    // Lấy chi tiết một hóa đơn theo ID hóa đơn.
    public async Task<InvoiceDto?> GetByIdAsync(Guid id)
    {
        var i = await db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone).Include(i => i.TenantProfile).ThenInclude(t => t.User).Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == id);
        return i is null ? null : MapInvoice(i);
    }

    // Tạo mới một hóa đơn thủ công.
    public async Task<InvoiceDto> CreateAsync(Guid landlordId, CreateInvoiceRequest req)
    {
        var room = await db.Rooms.Include(r => r.Zone).FirstOrDefaultAsync(r => r.Id == req.RoomId && r.Zone.LandlordId == landlordId) ?? throw new KeyNotFoundException("Phòng không tồn tại");
        var tenant = await db.TenantProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.RoomId == req.RoomId) ?? throw new KeyNotFoundException("Không có khách thuê trong phòng này");

        var activeServices = await db.Services
            .Include(s => s.Zone)
            .Where(s => s.LandlordId == landlordId && s.IsActive && (s.ZoneId == room.ZoneId || s.ZoneId == null))
            .ToListAsync();

        decimal serviceFee = req.ServiceFee;
        if (serviceFee == 0 && activeServices.Count > 0)
        {
            serviceFee = activeServices.Sum(s => s.Price);
        }

        var totalAmount = req.RentFee + req.ElecFee + req.WaterFee + serviceFee;
        var code = $"HD-{req.Month.Replace("-", "")}-{room.RoomNumber}";

        var itemsList = new List<InvoiceItem>
        {
            new InvoiceItem { Name = "Tiền thuê phòng", Amount = req.RentFee },
            new InvoiceItem { Name = "Tiền điện", Amount = req.ElecFee },
            new InvoiceItem { Name = "Tiền nước", Amount = req.WaterFee }
        };

        if (activeServices.Count > 0)
        {
            foreach (var svc in activeServices)
            {
                var zoneTag = svc.Zone != null ? $" ({svc.Zone.Name})" : "";
                itemsList.Add(new InvoiceItem { Name = $"{svc.Name}{zoneTag}", Amount = svc.Price });
            }
        }
        else
        {
            itemsList.Add(new InvoiceItem { Name = "Phí dịch vụ", Amount = serviceFee });
        }

        var inv = new Invoice
        {
            InvoiceCode = code,
            RoomId = req.RoomId,
            TenantProfileId = tenant.Id,
            Month = req.Month,
            RentFee = req.RentFee,
            ElecFee = req.ElecFee,
            WaterFee = req.WaterFee,
            ServiceFee = serviceFee,
            TotalAmount = totalAmount,
            DueDate = req.DueDate,
            Items = itemsList
        };
        db.Invoices.Add(inv);
        await db.SaveChangesAsync();
        inv.Room = room; inv.TenantProfile = tenant;
        return MapInvoice(inv);
    }

    // Cập nhật trạng thái hóa đơn (ví dụ: Chuyển sang Paid - Đã thanh toán).
    public async Task<InvoiceDto> UpdateStatusAsync(Guid id, string status)
    {
        var inv = await db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone).Include(i => i.TenantProfile).ThenInclude(t => t.User).Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == id) ?? throw new KeyNotFoundException();
        inv.Status = Enum.Parse<InvoiceStatus>(status, ignoreCase: true);
        if (inv.Status == InvoiceStatus.Paid) inv.PaidDate = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return MapInvoice(inv);
    }

    private static InvoiceDto MapInvoice(Invoice i) => new(i.Id, i.InvoiceCode, i.RoomId, i.Room?.RoomNumber ?? "", i.TenantProfileId, i.TenantProfile?.User?.FullName ?? "", i.Month, i.RentFee, i.ElecFee, i.WaterFee, i.ServiceFee, i.TotalAmount, i.Status.ToString(), i.DueDate, i.PaidDate, i.CreatedAt, i.Items.Select(x => new InvoiceItemDto(x.Id, x.Name, x.Amount)).ToList());
}
