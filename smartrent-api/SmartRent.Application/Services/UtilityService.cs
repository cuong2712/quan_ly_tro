using SmartRent.Application.Services.Utilities;
using SmartRent.Core.DTOs;

namespace SmartRent.Application.Services;

// Facade trung tâm điều phối các phân hệ nghiệp vụ Quản lý Điện Nước & Chỉ số.
public class UtilityService(
    UtilityQueryService queryService,
    UtilityRateService rateService,
    UtilityRecordService recordService)
{
    // 1. Tra cứu nhật ký chỉ số điện nước
    public Task<object> GetByLandlordAsync(Guid landlordId, Guid? roomId = null, int? page = null, int? pageSize = null) =>
        queryService.GetByLandlordAsync(landlordId, roomId, page, pageSize);

    public Task<bool> DeleteLogAsync(Guid landlordId, Guid id) =>
        queryService.DeleteLogAsync(landlordId, id);

    // 2. Quản lý bảng giá điện nước
    public Task<UtilityRateDto?> GetRateAsync(Guid landlordId) =>
        rateService.GetRateAsync(landlordId);

    public Task<UtilityRateDto> UpdateRateAsync(Guid landlordId, UpdateUtilityRateRequest req) =>
        rateService.UpdateRateAsync(landlordId, req);

    // 3. Ghi nhận chỉ số đơn lẻ & Chốt hàng loạt
    public Task<UtilityLogDto> RecordAsync(Guid landlordId, RecordUtilityRequest req) =>
        recordService.RecordAsync(landlordId, req);

    public Task<BulkRecordResultDto> BulkRecordAsync(Guid landlordId, BulkRecordUtilityRequest req) =>
        recordService.BulkRecordAsync(landlordId, req);
}
