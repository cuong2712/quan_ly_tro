using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Infrastructure.Repositories;

// Repository thao tác cơ sở dữ liệu cho Hóa đơn tiền nhà (Invoice)
public class InvoiceRepository(AppDbContext db) : IInvoiceRepository
{
    // Lấy danh sách hóa đơn hàng tháng thuộc quyền quản lý của Chủ trọ
    public async Task<IEnumerable<Invoice>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items)
            .Where(i => i.Room.Zone.LandlordId == landlordId).OrderByDescending(i => i.CreatedAt).ToListAsync();

    // Lấy danh sách hóa đơn của một Khách thuê theo ID hồ sơ
    public async Task<IEnumerable<Invoice>> GetByTenantIdAsync(Guid tenantProfileId) =>
        await db.Invoices.Include(i => i.Room).Include(i => i.Items)
            .Where(i => i.TenantProfileId == tenantProfileId).OrderByDescending(i => i.CreatedAt).ToListAsync();

    // Lấy chi tiết một hóa đơn tiền nhà theo ID (kèm danh mục phí và lịch sử thanh toán)
    public async Task<Invoice?> GetByIdAsync(Guid id) =>
        await db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Include(i => i.Items).Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.Id == id);

    // Tạo mới hóa đơn tiền nhà
    public async Task<Invoice> CreateAsync(Invoice inv) { db.Invoices.Add(inv); await db.SaveChangesAsync(); return inv; }

    // Cập nhật thông tin hoặc trạng thái hóa đơn
    public async Task<Invoice> UpdateAsync(Invoice inv) { db.Invoices.Update(inv); await db.SaveChangesAsync(); return inv; }

    // Xóa một hóa đơn theo ID
    public async Task<bool> DeleteAsync(Guid id)
    {
        var inv = await db.Invoices.FindAsync(id);
        if (inv is null) return false;
        db.Invoices.Remove(inv); await db.SaveChangesAsync(); return true;
    }
}
