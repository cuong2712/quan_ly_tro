using Microsoft.EntityFrameworkCore;
using SmartRent.Application.Common.Mappings;
using SmartRent.Application.Services.Contracts;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Rooms;

// Dịch vụ quản lý Thành viên ở ghép (Occupants / Roommates) trong phòng
public class RoomOccupantService(AppDbContext db)
{
    // Thêm thành viên ở ghép (Occupant) vào phòng.
    // Nếu req.CreateCoTenantContract == true, tự động tạo Hợp đồng / Phụ lục Ở Ghép liên kết HĐ Master.
    public async Task<TenantDto> AddOccupantAsync(Guid roomId, Guid landlordId, AddOccupantRequest req)
    {
        var room = await db.Rooms
            .Include(r => r.Zone)
            .FirstOrDefaultAsync(r => r.Id == roomId && r.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Phòng không tồn tại hoặc không thuộc quyền quản lý của bạn.");

        if (room.Status == RoomStatus.Locked)
            throw new InvalidOperationException($"Phòng {room.RoomNumber} đang bị khóa, không thể thêm người ở mới.");
        if (room.Status == RoomStatus.Maintenance)
            throw new InvalidOperationException($"Phòng {room.RoomNumber} đang ở trạng thái bảo trì, không thể thêm người ở mới.");

        var tenant = await db.TenantProfiles
            .Include(t => t.User)
            .Include(t => t.Room)
            .FirstOrDefaultAsync(t => t.Id == req.TenantProfileId)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ khách thuê.");

        if (tenant.RoomId == roomId)
            throw new InvalidOperationException($"Khách thuê này đã ở trong phòng {room.RoomNumber}.");

        // Kiểm tra sức chứa tối đa của phòng
        var currentCount = await db.TenantProfiles.CountAsync(t => t.RoomId == roomId);
        if (currentCount >= room.MaxTenants)
            throw new InvalidOperationException(
                $"Phòng {room.RoomNumber} đã đạt sức chứa tối đa ({currentCount}/{room.MaxTenants} người). " +
                "Không thể thêm thành viên ở ghép mới.");

        tenant.RoomId = roomId;
        tenant.LandlordId = landlordId;
        var moveIn = req.StartDate ?? DateTime.UtcNow;
        if (tenant.MoveInDate == null) tenant.MoveInDate = DateTime.SpecifyKind(moveIn, DateTimeKind.Utc);
        if (req.IndividualDeposit > 0) tenant.Deposit = req.IndividualDeposit;

        // Nếu chủ trọ chọn lập Hợp đồng ở ghép ngay khi thêm thành viên
        if (req.CreateCoTenantContract)
        {
            var masterContract = await db.Contracts
                .Include(c => c.TenantProfile).ThenInclude(t => t.User)
                .FirstOrDefaultAsync(c => c.RoomId == roomId && c.Type == ContractType.Master &&
                                          (c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested));

            if (masterContract != null)
            {
                var landlord = await db.Users.FirstOrDefaultAsync(u => u.Id == landlordId);
                var utilityRate = await db.UtilityRates.FirstOrDefaultAsync(u => u.LandlordId == landlordId);
                var endDate = req.EndDate ?? masterContract.EndDate;
                var coTenantCode = $"OG-{room.RoomNumber}-{DateTime.UtcNow:yyyyMMddHHmm}";

                var coContract = new Contract
                {
                    ContractCode = coTenantCode,
                    RoomId = roomId,
                    TenantProfileId = tenant.Id,
                    StartDate = DateTime.SpecifyKind(moveIn, DateTimeKind.Utc),
                    EndDate = DateTime.SpecifyKind(endDate, DateTimeKind.Utc),
                    RentAmount = masterContract.RentAmount,
                    Deposit = req.IndividualDeposit,
                    PaymentTermDay = masterContract.PaymentTermDay,
                    Status = ContractStatus.Active,
                    Type = ContractType.CoTenant,
                    ParentContractId = masterContract.Id,
                    IndividualDeposit = req.IndividualDeposit,
                    SharedRentAmount = req.SharedRentAmount,
                    IsSignedByTenant = false,
                    Terms = req.Terms
                };

                coContract.CustomContent = ContractTemplateEngine.RenderCoTenantTemplate(
                    coContract, room, landlord, tenant, masterContract, utilityRate);

                db.Contracts.Add(coContract);
            }
        }

        // Đổi trạng thái phòng thành Occupied nếu đang Vacant
        if (room.Status == RoomStatus.Vacant)
            room.Status = RoomStatus.Occupied;

        await db.SaveChangesAsync();

        tenant.Room = room;
        return tenant.ToTenantDto();
    }

    // Gỡ thành viên ở ghép (Occupant) khỏi phòng khi họ rời đi.
    // Không cho phép gỡ Primary Tenant (người đứng tên HĐ chính Master) - phải chuyển quyền đại diện trước.
    // Tự động thanh lý các Hợp đồng CoTenant của thành viên này trong phòng.
    public async Task RemoveOccupantAsync(Guid roomId, Guid landlordId, Guid tenantProfileId)
    {
        var room = await db.Rooms
            .Include(r => r.Zone)
            .FirstOrDefaultAsync(r => r.Id == roomId && r.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Phòng không tồn tại hoặc không thuộc quyền quản lý của bạn.");

        var tenant = await db.TenantProfiles
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == tenantProfileId && t.RoomId == roomId)
            ?? throw new KeyNotFoundException("Không tìm thấy khách thuê trong phòng này.");

        // Kiểm tra: nếu người này là Primary Tenant (Hợp đồng Master), không cho phép gỡ trực tiếp
        var isRepresentative = await db.Contracts
            .AnyAsync(c => c.RoomId == roomId && c.TenantProfileId == tenantProfileId &&
                          c.Type == ContractType.Master &&
                          (c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested));
        if (isRepresentative)
        {
            throw new InvalidOperationException(
                "Khách thuê này đang là người đại diện đứng tên hợp đồng chính (Master) của phòng. " +
                "Vui lòng sử dụng chức năng \"Chuyển quyền đại diện\" hoặc thanh lý hợp đồng trước khi gỡ người này khỏi phòng.");
        }

        // Tự động thanh lý các Hợp đồng Ở Ghép (CoTenant) đang active của thành viên này trong phòng
        var coTenantContracts = await db.Contracts
            .Where(c => c.RoomId == roomId && c.TenantProfileId == tenantProfileId &&
                        c.Type == ContractType.CoTenant &&
                        (c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested))
            .ToListAsync();
        foreach (var ctc in coTenantContracts)
        {
            ctc.Status = ContractStatus.Liquidated;
        }

        // Gỡ liên kết phòng (Occupant rời đi), nhưng giữ lại LandlordId để chủ trọ có thể xếp lại phòng sau này
        tenant.RoomId = null;
        tenant.LandlordId = landlordId;

        // Kiểm tra nếu phòng không còn ai ở và không có hợp đồng active -> chuyển trạng thái phòng về Vacant
        var remainingCount = await db.TenantProfiles.CountAsync(t => t.RoomId == roomId && t.Id != tenantProfileId);
        var hasActiveContract = await db.Contracts
            .AnyAsync(c => c.RoomId == roomId &&
                          (c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested));
        if (remainingCount == 0 && !hasActiveContract)
        {
            room.Status = RoomStatus.Vacant;
        }

        await db.SaveChangesAsync();
    }
}

