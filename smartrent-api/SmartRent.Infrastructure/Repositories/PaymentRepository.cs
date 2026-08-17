using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Infrastructure.Repositories;

// Repository thao tác cơ sở dữ liệu cho Giao dịch thanh toán (Payment)
public class PaymentRepository(AppDbContext db) : IPaymentRepository
{
    // Lấy danh sách các giao dịch thanh toán thuộc Chủ trọ
    public async Task<IEnumerable<Payment>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.Payments.Include(p => p.Invoice).ThenInclude(i => i.Room).ThenInclude(r => r.Zone)
            .Where(p => p.Invoice.Room.Zone.LandlordId == landlordId).OrderByDescending(p => p.CreatedAt).ToListAsync();

    // Lấy danh sách các giao dịch thanh toán thuộc về một hóa đơn cụ thể
    public async Task<IEnumerable<Payment>> GetByInvoiceIdAsync(Guid invoiceId) =>
        await db.Payments.Where(p => p.InvoiceId == invoiceId).ToListAsync();

    // Lấy thông tin chi tiết một giao dịch thanh toán theo ID
    public async Task<Payment?> GetByIdAsync(Guid id) =>
        await db.Payments.Include(p => p.Invoice).FirstOrDefaultAsync(p => p.Id == id);

    // Thêm mới một giao dịch thanh toán (gửi minh chứng chuyển khoản)
    public async Task<Payment> CreateAsync(Payment p) { db.Payments.Add(p); await db.SaveChangesAsync(); return p; }

    // Cập nhật trạng thái giao dịch thanh toán (Duyệt hoặc Từ chối)
    public async Task<Payment> UpdateAsync(Payment p) { db.Payments.Update(p); await db.SaveChangesAsync(); return p; }
}
