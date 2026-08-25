using SmartRent.Application.Services.Invoices;
using SmartRent.Core.DTOs;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Hóa đơn tiền nhà (Facade điều phối các Sub-Services chuyên biệt)
public class InvoiceService(
    InvoiceQueryService queryService,
    InvoiceLifecycleService lifecycleService,
    InvoiceDisputeService disputeService)
{
    // Truy vấn danh sách hóa đơn của chủ trọ
    public Task<object> GetByLandlordAsync(Guid landlordId, string? status = null, string? month = null, int? page = null, int? pageSize = null)
        => queryService.GetByLandlordAsync(landlordId, status, month, page, pageSize);

    // Truy vấn danh sách hóa đơn của khách thuê theo ProfileId
    public Task<IEnumerable<InvoiceDto>> GetByTenantAsync(Guid tenantProfileId)
        => queryService.GetByTenantAsync(tenantProfileId);

    // Truy vấn danh sách hóa đơn của khách thuê theo UserId
    public Task<IEnumerable<InvoiceDto>> GetByTenantUserIdAsync(Guid tenantUserId)
        => queryService.GetByTenantUserIdAsync(tenantUserId);

    // Lấy chi tiết hóa đơn
    public Task<InvoiceDto?> GetByIdAsync(Guid id, Guid currentUserId, string role)
        => queryService.GetByIdAsync(id, currentUserId, role);

    // Tạo mới hóa đơn
    public Task<InvoiceDto> CreateAsync(Guid landlordId, CreateInvoiceRequest req)
        => lifecycleService.CreateAsync(landlordId, req);

    // Xóa hóa đơn
    public Task<bool> DeleteAsync(Guid id, Guid landlordId)
        => lifecycleService.DeleteAsync(id, landlordId);

    // Cập nhật thông tin chi tiết hóa đơn
    public Task<InvoiceDto> UpdateAsync(Guid id, Guid landlordId, UpdateInvoiceRequest req)
        => lifecycleService.UpdateAsync(id, landlordId, req);

    // Cập nhật trạng thái hóa đơn
    public Task<InvoiceDto> UpdateStatusAsync(Guid id, Guid landlordId, string status)
        => lifecycleService.UpdateStatusAsync(id, landlordId, status);

    // Khách gửi báo cáo/khiếu nại hóa đơn
    public Task<InvoiceDto> ReportInvoiceAsync(Guid id, Guid currentUserId, ReportInvoiceRequest req)
        => disputeService.ReportInvoiceAsync(id, currentUserId, req);

    // Khách hủy yêu cầu kiểm tra hóa đơn
    public Task<InvoiceDto> CancelReportInvoiceAsync(Guid id, Guid currentUserId)
        => disputeService.CancelReportInvoiceAsync(id, currentUserId);

    // Chủ trọ xử lý khiếu nại hóa đơn
    public Task<InvoiceDto> ResolveDisputeAsync(Guid id, Guid landlordId, ResolveInvoiceDisputeRequest req)
        => disputeService.ResolveDisputeAsync(id, landlordId, req);
}
