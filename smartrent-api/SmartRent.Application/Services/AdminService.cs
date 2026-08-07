using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý dành riêng cho Super Admin: Xem thống kê hệ thống, quản lý tài khoản chủ trọ, xử lý góp ý.
public class AdminService(AppDbContext db)
{
    // Lấy tổng quan các chỉ số thống kê của toàn bộ hệ thống (Số chủ trọ, khách thuê, khu trọ, phòng, doanh thu...).
    public async Task<SystemStatsDto> GetSystemStatsAsync()
    {
        var landlords = await db.Users.CountAsync(u => u.Role == UserRole.Landlord);
        var tenants = await db.Users.CountAsync(u => u.Role == UserRole.Tenant);
        var zones = await db.Zones.CountAsync();
        var rooms = await db.Rooms.CountAsync();
        var occupied = await db.Rooms.CountAsync(r => r.Status == RoomStatus.Occupied);
        var vacant = await db.Rooms.CountAsync(r => r.Status == RoomStatus.Vacant);
        var revenue = await db.Payments.Where(p => p.Status == PaymentStatus.Completed).SumAsync(p => p.Amount);
        var invoices = await db.Invoices.CountAsync();

        return new SystemStatsDto(
            landlords, tenants, zones, rooms, occupied, vacant, revenue, invoices,
            rooms > 0 ? Math.Round((decimal)occupied / rooms * 100, 1) : 0,
            rooms > 0 ? Math.Round((decimal)vacant / rooms * 100, 1) : 0
        );
    }

    // Lấy danh sách tài khoản chủ trọ với bộ lọc tìm kiếm theo tên/email/sĐT và trạng thái hoạt động.
    public async Task<IEnumerable<LandlordListDto>> GetLandlordsAsync(string? search = null, bool? isActive = null)
    {
        var query = db.Users.Where(u => u.Role == UserRole.Landlord).AsQueryable();
        if (!string.IsNullOrEmpty(search))
            query = query.Where(u => u.FullName.Contains(search) || u.Email.Contains(search) || u.Phone.Contains(search));
        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        var users = await query.ToListAsync();
        var result = new List<LandlordListDto>();
        foreach (var u in users)
        {
            var zonesCount = await db.Zones.CountAsync(z => z.LandlordId == u.Id);
            var roomsCount = await db.Rooms.CountAsync(r => r.Zone.LandlordId == u.Id);
            result.Add(new LandlordListDto(u.Id, u.FullName, u.Email, u.Phone, u.AvatarUrl, u.IsActive, u.Role.ToString(), zonesCount, roomsCount, u.CreatedAt));
        }
        return result;
    }

    // Tạo mới một tài khoản Chủ trọ.
    public async Task<LandlordListDto> CreateLandlordAsync(CreateLandlordRequest request)
    {
        if (await db.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email đã tồn tại trong hệ thống");

        var user = new User
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            Phone = request.Phone,
            Role = UserRole.Landlord,
            AvatarUrl = request.AvatarUrl,
            IsActive = true
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return new LandlordListDto(user.Id, user.FullName, user.Email, user.Phone, user.AvatarUrl, user.IsActive, user.Role.ToString(), 0, 0, user.CreatedAt);
    }

    // Cập nhật thông tin cá nhân của tài khoản Chủ trọ.
    public async Task<LandlordListDto> UpdateLandlordAsync(Guid id, UpdateLandlordRequest request)
    {
        var user = await db.Users.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy chủ trọ");
        user.FullName = request.FullName;
        user.Phone = request.Phone;
        user.AvatarUrl = request.AvatarUrl;
        await db.SaveChangesAsync();
        var zones = await db.Zones.CountAsync(z => z.LandlordId == id);
        var rooms = await db.Rooms.CountAsync(r => r.Zone.LandlordId == id);
        return new LandlordListDto(user.Id, user.FullName, user.Email, user.Phone, user.AvatarUrl, user.IsActive, user.Role.ToString(), zones, rooms, user.CreatedAt);
    }

    // Khóa hoặc mở khóa tài khoản của Chủ trọ.
    public async Task ToggleLockAsync(Guid id)
    {
        var user = await db.Users.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy chủ trọ");
        user.IsActive = !user.IsActive;
        await db.SaveChangesAsync();
    }

    // Đặt lại mật khẩu tài khoản Chủ trọ về mật khẩu mặc định hoặc mật khẩu mới.
    public async Task ResetPasswordAsync(Guid id, string newPassword = "SmartRent@2026")
    {
        var user = await db.Users.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy chủ trọ");
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await db.SaveChangesAsync();
    }

    // Lấy danh sách tất cả các góp ý/khiếu nại gửi tới Admin.
    public async Task<IEnumerable<ComplaintDto>> GetComplaintsAsync()
    {
        var complaints = await db.Complaints.Include(c => c.Sender).OrderByDescending(c => c.CreatedAt).ToListAsync();
        return complaints.Select(c => new ComplaintDto(c.Id, c.Sender.FullName, c.Sender.Email, c.Sender.Role.ToString(),
            c.Title, c.Content, c.Status.ToString(), c.Reply, c.CreatedAt, c.RepliedAt));
    }

    // Phản hồi thông tin góp ý/khiếu nại của người dùng.
    public async Task<ComplaintDto> ReplyComplaintAsync(Guid id, Guid adminId, ReplyComplaintRequest request)
    {
        var complaint = await db.Complaints.Include(c => c.Sender).FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy phản hồi");
        complaint.Reply = request.Reply;
        complaint.Status = ComplaintStatus.Resolved;
        complaint.RepliedBy = adminId;
        complaint.RepliedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return new ComplaintDto(complaint.Id, complaint.Sender.FullName, complaint.Sender.Email, complaint.Sender.Role.ToString(),
            complaint.Title, complaint.Content, complaint.Status.ToString(), complaint.Reply, complaint.CreatedAt, complaint.RepliedAt);
    }

    // Cập nhật trạng thái xử lý của góp ý/khiếu nại.
    public async Task UpdateComplaintStatusAsync(Guid id, string status)
    {
        var complaint = await db.Complaints.FindAsync(id) ?? throw new KeyNotFoundException("Không tìm thấy phản hồi");
        complaint.Status = Enum.Parse<ComplaintStatus>(status);
        await db.SaveChangesAsync();
    }
}
