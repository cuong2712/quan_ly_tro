using SmartRent.Application.Services.Admin;
using SmartRent.Core.DTOs;

namespace SmartRent.Application.Services;

// Facade trung tâm điều phối các phân hệ nghiệp vụ dành riêng cho Super Admin.
public class AdminService(
    AdminAnalyticsService analyticsService,
    AdminLandlordService landlordService,
    AdminTenantService tenantService,
    AdminComplaintService complaintService)
{
    // 1. Thống kê & Báo cáo sàn
    public Task<SystemStatsDto> GetSystemStatsAsync() =>
        analyticsService.GetSystemStatsAsync();

    // 2. Quản lý tài khoản Chủ trọ
    public Task<IEnumerable<LandlordListDto>> GetLandlordsAsync(string? search = null, bool? isActive = null) =>
        landlordService.GetLandlordsAsync(search, isActive);

    public Task<LandlordListDto> CreateLandlordAsync(CreateLandlordRequest request) =>
        landlordService.CreateLandlordAsync(request);

    public Task<LandlordListDto> UpdateLandlordAsync(Guid id, UpdateLandlordRequest request) =>
        landlordService.UpdateLandlordAsync(id, request);

    public Task ToggleLockAsync(Guid id) =>
        landlordService.ToggleLockAsync(id);

    public Task ResetPasswordAsync(Guid id, string newPassword = "SmartRent@2026") =>
        landlordService.ResetPasswordAsync(id, newPassword);

    // 3. Quản lý tài khoản Khách thuê
    public Task<object> GetTenantsAsync(string? search = null, bool? isActive = null, Guid? landlordId = null, string? rentStatus = null, int? page = null, int? pageSize = null) =>
        tenantService.GetTenantsAsync(search, isActive, landlordId, rentStatus, page, pageSize);

    public Task<AdminTenantDetailDto> GetTenantDetailAsync(Guid tenantProfileId) =>
        tenantService.GetTenantDetailAsync(tenantProfileId);

    public Task ToggleLockTenantAsync(Guid tenantProfileId) =>
        tenantService.ToggleLockTenantAsync(tenantProfileId);

    public Task ResetTenantPasswordAsync(Guid tenantProfileId, string newPassword = "Tenant@2026") =>
        tenantService.ResetTenantPasswordAsync(tenantProfileId, newPassword);

    // 4. Xử lý Khiếu nại & Góp ý
    public Task<IEnumerable<ComplaintDto>> GetComplaintsAsync() =>
        complaintService.GetComplaintsAsync();

    public Task<ComplaintDto> ReplyComplaintAsync(Guid id, ReplyComplaintRequest request) =>
        complaintService.ReplyComplaintAsync(id, request);

    public Task UpdateComplaintStatusAsync(Guid id, string status) =>
        complaintService.UpdateComplaintStatusAsync(id, status);
}
