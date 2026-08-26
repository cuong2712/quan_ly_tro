using Microsoft.EntityFrameworkCore;
using SmartRent.Application.Common.Mappings;
using SmartRent.Core.DTOs;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Rooms;

// Dịch vụ quản lý Thành viên ở ghép (Occupants / Roommates) trong phòng
public class RoomOccupantService(AppDbContext db)
{
    // Thêm thành viên ở ghép (Occupant) vào phòng mà không tạo hợp đồng mới.
    // Chỉ cập nhật TenantProfile.RoomId = roomId để liên kết người thuê với phòng.
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

        // Không kiểm tra hợp đồng - chỉ cập nhật liên kết phòng
        tenant.RoomId = roomId;
        tenant.LandlordId = landlordId;
        if (tenant.MoveInDate == null) tenant.MoveInDate = DateTime.UtcNow;

        // Đổi trạng thái phòng thành Occupied nếu đang Vacant
        if (room.Status == RoomStatus.Vacant)
            room.Status = RoomStatus.Occupied;

        await db.SaveChangesAsync();

        tenant.Room = room;
        return tenant.ToTenantDto();
    }

    // Gỡ thành viên ở ghép (Occupant) khỏi phòng khi họ rời đi.
    // Không ảnh hưởng đến hợp đồng chính của phòng.
    // Không cho phép gỡ Primary Tenant (người đứng tên HĐ) - phải chuyển quyền đại diện trước.
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

        // Kiểm tra: nếu người này là Primary Tenant của hợp đồng đang hiệu lực, không cho phép gỡ
        var isRepresentative = await db.Contracts
            .AnyAsync(c => c.RoomId == roomId && c.TenantProfileId == tenantProfileId &&
                          (c.Status == ContractStatus.Active || c.Status == ContractStatus.RenewRequested));
        if (isRepresentative)
        {
            throw new InvalidOperationException(
                "Khách thuê này đang là người đại diện đứng tên hợp đồng chính của phòng. " +
                "Vui lòng sử dụng chức năng \"Chuyển quyền đại diện\" hoặc thanh lý hợp đồng trước khi gỡ người này khỏi phòng.");
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
