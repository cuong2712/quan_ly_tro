using Microsoft.EntityFrameworkCore;
using SmartRent.Application.Common.Mappings;
using SmartRent.Core.DTOs;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Contracts;

// Dịch vụ quản lý Chuyển quyền đại diện Hợp đồng sang thành viên ở ghép
public class ContractTransferService(AppDbContext db, NotificationService notificationService)
{
    // Chuyển giao quyền đại diện hợp đồng sang thành viên ở ghép trong phòng.
    // Dùng khi người đứng tên rời đi nhưng các thành viên khác vẫn ở lại tiếp tục thuê phòng.
    public async Task<ContractDto> TransferRepresentativeAsync(Guid contractId, Guid landlordId, TransferRepresentativeRequest req)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var c = await db.Contracts
                .Include(c => c.Room).ThenInclude(r => r.Zone)
                .Include(c => c.TenantProfile).ThenInclude(t => t.User)
                .FirstOrDefaultAsync(c => c.Id == contractId && c.Room.Zone.LandlordId == landlordId)
                ?? throw new KeyNotFoundException("Hợp đồng không tồn tại hoặc bạn không có quyền thao tác.");

            if (c.Status != ContractStatus.Active && c.Status != ContractStatus.RenewRequested)
                throw new InvalidOperationException("Chỉ có thể chuyển quyền đại diện cho hợp đồng đang có hiệu lực.");

            // Tìm người đại diện mới
            var newTenant = await db.TenantProfiles
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Id == req.NewTenantProfileId)
                ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ khách thuê mới đại diện.");

            if (newTenant.Id == c.TenantProfileId)
                throw new InvalidOperationException("Người đại diện mới trùng với người đại diện hiện tại của hợp đồng.");

            var oldTenantId = c.TenantProfileId;
            var oldTenantProfile = c.TenantProfile;

            // 1. Gán phòng cho người đại diện mới (nếu chưa ở trong phòng)
            newTenant.RoomId = c.RoomId;
            if (newTenant.MoveInDate == null) newTenant.MoveInDate = DateTime.UtcNow;

            // 2. Chuyển quyền đứng tên hợp đồng
            c.TenantProfileId = newTenant.Id;

            // 3. Chuyển toàn bộ hóa đơn Unpaid của phòng sang người đại diện mới
            var unpaidInvoices = await db.Invoices
                .Where(i => i.RoomId == c.RoomId && i.Status == InvoiceStatus.Unpaid)
                .ToListAsync();
            foreach (var inv in unpaidInvoices)
            {
                inv.TenantProfileId = newTenant.Id;
            }

            // 4. Xử lý người đại diện cũ theo tùy chọn
            if (req.RemoveOldTenantFromRoom)
            {
                var oldTenant = await db.TenantProfiles.FirstOrDefaultAsync(t => t.Id == oldTenantId);
                if (oldTenant != null) oldTenant.RoomId = null;
            }

            await db.SaveChangesAsync();
            await tx.CommitAsync();

            // Gửi thông báo cho tất cả các bên liên quan
            if (oldTenantProfile != null)
            {
                await notificationService.SendNotificationAsync(
                    landlordId,
                    $"Thông báo chuyển quyền đại diện hợp đồng phòng {c.Room?.RoomNumber}",
                    $"Quyền đứng tên hợp đồng {c.ContractCode} phòng {c.Room?.RoomNumber} đã được chuyển sang người thuê khác." +
                    (req.RemoveOldTenantFromRoom ? " Bạn đã được gỡ khỏi phòng." : " Bạn vẫn ở lại phòng với tư cách thành viên ở ghép.") +
                    (!string.IsNullOrEmpty(req.Note) ? $" Ghi chú: {req.Note}" : ""),
                    NotificationTarget.User,
                    oldTenantProfile.UserId
                );
            }
            await notificationService.SendNotificationAsync(
                landlordId,
                $"Thông báo bạn được chuyển thành người đại diện hợp đồng phòng {c.Room?.RoomNumber}",
                $"Bạn đã được chuyển thành người đứng tên hợp đồng {c.ContractCode} phòng {c.Room?.RoomNumber}. Từ nay các hóa đơn tiền nhà sẽ được phát hành cho bạn.",
                NotificationTarget.User,
                newTenant.UserId
            );

            // Reload để trả về DTO đầy đủ
            var updated = await db.Contracts
                .Include(c => c.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
                .Include(c => c.TenantProfile).ThenInclude(t => t.User)
                .FirstAsync(x => x.Id == contractId);

            return updated.ToContractDto();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}
