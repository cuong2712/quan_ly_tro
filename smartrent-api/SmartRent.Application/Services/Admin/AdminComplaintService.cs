using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Enums;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Admin;

// Phân hệ Tiếp nhận và Xử lý Khiếu nại toàn hệ thống dành cho Super Admin.
public class AdminComplaintService(AppDbContext db, NotificationService notificationService, ITelegramBotService telegramBot)
{
    // Lấy danh sách tất cả các góp ý/khiếu nại gửi tới Admin kèm thông tin Chủ trọ quản lý của khách thuê.
    public async Task<IEnumerable<ComplaintDto>> GetComplaintsAsync()
    {
        var complaints = await db.Complaints.AsNoTracking().Include(c => c.Sender).OrderByDescending(c => c.CreatedAt).ToListAsync();

        var tenantUserIds = complaints.Where(c => c.Sender?.Role == UserRole.Tenant).Select(c => c.SenderId).Distinct().ToList();
        var tenantProfiles = await db.TenantProfiles.AsNoTracking()
            .Include(t => t.Room).ThenInclude(r => r!.Zone).ThenInclude(z => z.Landlord)
            .Include(t => t.Landlord)
            .Where(t => tenantUserIds.Contains(t.UserId))
            .ToDictionaryAsync(t => t.UserId);

        return complaints.Select(c =>
        {
            string? landlordInfo = null;
            if (c.Sender?.Role == UserRole.Tenant)
            {
                if (tenantProfiles.TryGetValue(c.SenderId, out var tp))
                {
                    if (tp.Room?.Zone?.Landlord != null)
                    {
                        var ll = tp.Room.Zone.Landlord;
                        var phoneText = !string.IsNullOrEmpty(ll.Phone) ? $" ({ll.Phone})" : "";
                        var roomDisplay = tp.Room.RoomNumber.StartsWith("P.", StringComparison.OrdinalIgnoreCase)
                            ? tp.Room.RoomNumber
                            : $"P.{tp.Room.RoomNumber}";
                        landlordInfo = $"{ll.FullName}{phoneText} - {tp.Room.Zone.Name} ({roomDisplay})";
                    }
                    else if (tp.Landlord != null)
                    {
                        var ll = tp.Landlord;
                        var phoneText = !string.IsNullOrEmpty(ll.Phone) ? $" ({ll.Phone})" : "";
                        landlordInfo = $"{ll.FullName}{phoneText}";
                    }
                }

                if (string.IsNullOrEmpty(landlordInfo) && !string.IsNullOrEmpty(c.Content) && c.Content.Contains("Chủ trọ quản lý:"))
                {
                    var match = System.Text.RegularExpressions.Regex.Match(c.Content, @"Chủ trọ quản lý:\s*([^\r\n]+)");
                    if (match.Success)
                    {
                        landlordInfo = match.Groups[1].Value.Trim();
                    }
                }
            }
            else if (c.Sender?.Role == UserRole.Landlord)
            {
                landlordInfo = "Chính chủ trọ gửi phản ánh";
            }

            return new ComplaintDto(c.Id, c.Sender?.FullName ?? "Người dùng", c.Sender?.Email ?? "", c.Sender?.Role.ToString() ?? "",
                c.Title, c.Content, c.Status.ToString(), c.Reply, c.CreatedAt, c.RepliedAt, landlordInfo);
        });
    }

    // Phản hồi thông tin góp ý/khiếu nại của người dùng.
    public async Task<ComplaintDto> ReplyComplaintAsync(Guid id, ReplyComplaintRequest request, Guid? adminId = null)
    {
        var complaint = await db.Complaints.Include(c => c.Sender).FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy phản hồi");
        complaint.Reply = request.Reply;
        complaint.Status = ComplaintStatus.Resolved;
        complaint.RepliedAt = DateTime.UtcNow;
        if (adminId.HasValue) complaint.RepliedBy = adminId.Value;
        await db.SaveChangesAsync();

        var admin = adminId.HasValue ? await db.Users.FindAsync(adminId.Value) : null;
        var adminName = admin?.FullName ?? "Ban Quản Trị";

        // Gửi thông báo trong hệ thống cho người gửi (senderId là admin để người nhận thấy đúng tên Ban Quản Trị)
        await notificationService.SendNotificationAsync(
            adminId ?? complaint.SenderId,
            $"Phản hồi khiếu nại / góp ý: {complaint.Title}",
            $"Ban quản trị đã phản hồi yêu cầu của bạn:\n\"{request.Reply}\"",
            NotificationTarget.User,
            complaint.SenderId
        );

        // Gửi thông báo Phản hồi thành công lên Telegram Bot của Admin
        await telegramBot.SendReplyAlertAsync(
            complaint.Sender?.FullName ?? "Người dùng",
            complaint.Title,
            request.Reply,
            adminName
        );

        string? landlordInfo = null;
        if (complaint.Sender?.Role == UserRole.Tenant)
        {
            var tp = await db.TenantProfiles.AsNoTracking()
                .Include(t => t.Room).ThenInclude(r => r!.Zone).ThenInclude(z => z.Landlord)
                .Include(t => t.Landlord)
                .FirstOrDefaultAsync(t => t.UserId == complaint.SenderId);
            if (tp?.Room?.Zone?.Landlord != null)
            {
                var ll = tp.Room.Zone.Landlord;
                var phoneText = !string.IsNullOrEmpty(ll.Phone) ? $" ({ll.Phone})" : "";
                var roomDisplay = tp.Room.RoomNumber.StartsWith("P.", StringComparison.OrdinalIgnoreCase)
                    ? tp.Room.RoomNumber
                    : $"P.{tp.Room.RoomNumber}";
                landlordInfo = $"{ll.FullName}{phoneText} - {tp.Room.Zone.Name} ({roomDisplay})";
            }
            else if (tp?.Landlord != null)
            {
                var ll = tp.Landlord;
                var phoneText = !string.IsNullOrEmpty(ll.Phone) ? $" ({ll.Phone})" : "";
                landlordInfo = $"{ll.FullName}{phoneText}";
            }

            if (string.IsNullOrEmpty(landlordInfo) && !string.IsNullOrEmpty(complaint.Content) && complaint.Content.Contains("Chủ trọ quản lý:"))
            {
                var match = System.Text.RegularExpressions.Regex.Match(complaint.Content, @"Chủ trọ quản lý:\s*([^\r\n]+)");
                if (match.Success)
                {
                    landlordInfo = match.Groups[1].Value.Trim();
                }
            }
        }
        else if (complaint.Sender?.Role == UserRole.Landlord)
        {
            landlordInfo = "Chính chủ trọ gửi phản ánh";
        }

        return new ComplaintDto(complaint.Id, complaint.Sender?.FullName ?? "Người dùng", complaint.Sender?.Email ?? "", complaint.Sender?.Role.ToString() ?? "",
            complaint.Title, complaint.Content, complaint.Status.ToString(), complaint.Reply, complaint.CreatedAt, complaint.RepliedAt, landlordInfo);
    }

    // Cập nhật trạng thái xử lý của góp ý/khiếu nại.
    public async Task UpdateComplaintStatusAsync(Guid id, string status)
    {
        var complaint = await db.Complaints.Include(c => c.Sender).FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy phản hồi");
        complaint.Status = Enum.Parse<ComplaintStatus>(status);
        await db.SaveChangesAsync();
    }
}

