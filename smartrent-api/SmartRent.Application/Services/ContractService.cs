using SmartRent.Application.Services.Contracts;
using SmartRent.Core.DTOs;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Hợp đồng Thuê nhà (Facade điều phối các Sub-Services chuyên biệt)
public class ContractService(
    ContractQueryService queryService,
    ContractLifecycleService lifecycleService,
    ContractSettlementService settlementService,
    ContractTransferService transferService)
{
    // Truy vấn danh sách hợp đồng của chủ trọ
    public Task<object> GetByLandlordAsync(Guid landlordId, int? page = null, int? pageSize = null)
        => queryService.GetByLandlordAsync(landlordId, page, pageSize);

    // Truy vấn danh sách hợp đồng của khách thuê
    public Task<IEnumerable<ContractDto>> GetByTenantAsync(Guid tenantProfileId)
        => queryService.GetByTenantAsync(tenantProfileId);

    // Truy vấn hợp đồng theo UserId của khách
    public Task<IEnumerable<ContractDto>> GetByTenantUserIdAsync(Guid tenantUserId)
        => queryService.GetByTenantUserIdAsync(tenantUserId);

    // Lấy chi tiết hợp đồng
    public Task<ContractDto?> GetByIdAsync(Guid id, Guid currentUserId, string role)
        => queryService.GetByIdAsync(id, currentUserId, role);

    // Tạo mới hợp đồng
    public Task<ContractDto> CreateAsync(Guid landlordId, CreateContractRequest req)
        => lifecycleService.CreateAsync(landlordId, req);

    // Cập nhật hợp đồng
    public Task<ContractDto> UpdateAsync(Guid id, Guid landlordId, UpdateContractRequest req)
        => lifecycleService.UpdateAsync(id, landlordId, req);

    // Xóa hợp đồng
    public Task<bool> DeleteAsync(Guid id, Guid landlordId)
        => lifecycleService.DeleteAsync(id, landlordId);

    // Thanh lý hợp đồng
    public Task TerminateAsync(Guid id, Guid landlordId)
        => lifecycleService.TerminateAsync(id, landlordId);

    // Gia hạn hợp đồng
    public Task RenewAsync(Guid id, Guid landlordId, RenewContractRequest req)
        => lifecycleService.RenewAsync(id, landlordId, req);

    // Từ chối gia hạn hợp đồng
    public Task RejectRenewAsync(Guid id, Guid landlordId, RejectRenewContractRequest req)
        => lifecycleService.RejectRenewAsync(id, landlordId, req);

    // Khách gửi yêu cầu gia hạn
    public Task<ContractDto> RequestRenewAsync(Guid contractId, Guid tenantUserId, RequestRenewContractRequest req)
        => lifecycleService.RequestRenewAsync(contractId, tenantUserId, req);

    // Khách hủy yêu cầu gia hạn
    public Task<ContractDto> CancelRenewRequestAsync(Guid contractId, Guid tenantUserId)
        => lifecycleService.CancelRenewRequestAsync(contractId, tenantUserId);

    // Quét cảnh báo hợp đồng sắp hết hạn
    public Task<int> CheckAndNotifyExpiringContractsAsync(Guid landlordId)
        => lifecycleService.CheckAndNotifyExpiringContractsAsync(landlordId);

    // Quyết toán cọc & thanh lý hợp đồng
    public Task<ContractSettlementDto> SettleContractAsync(Guid id, Guid landlordId, SettleContractRequest req)
        => settlementService.SettleContractAsync(id, landlordId, req);

    // Chuyển quyền đại diện hợp đồng
    public Task<ContractDto> TransferRepresentativeAsync(Guid contractId, Guid landlordId, TransferRepresentativeRequest req)
        => transferService.TransferRepresentativeAsync(contractId, landlordId, req);

    // Quản lý mẫu hợp đồng tùy biến
    public Task<ContractTemplateDto> GetTemplateAsync(Guid landlordId)
        => lifecycleService.GetTemplateAsync(landlordId);

    public Task<ContractTemplateDto> SaveTemplateAsync(Guid landlordId, SaveContractTemplateRequest req)
        => lifecycleService.SaveTemplateAsync(landlordId, req);

    public Task<ContractTemplateDto> ResetTemplateAsync(Guid landlordId)
        => lifecycleService.ResetTemplateAsync(landlordId);

    public Task<string> PreviewTemplateAsync(Guid landlordId, PreviewContractTemplateRequest req)
        => lifecycleService.PreviewTemplateAsync(landlordId, req);
}
