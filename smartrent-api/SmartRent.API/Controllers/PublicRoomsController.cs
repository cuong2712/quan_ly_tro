using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartRent.Application.Common.Mappings;
using SmartRent.Application.Services;
using SmartRent.Core.DTOs;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace SmartRent.API.Controllers;

// Controller công khai phục vụ Cổng Khám Phá & Tìm Phòng Trọ SmartRent
// Dành cho khách thuê, sinh viên tìm kiếm, trải nghiệm Cam 360 và cọc phòng online
[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class PublicRoomsController(AppDbContext db, NotificationService notificationService) : ControllerBase
{
    // Lấy danh sách các phòng trọ đang được đăng công khai
    [HttpGet]
    public async Task<IActionResult> GetPublicRooms(
        [FromQuery] string? keyword,
        [FromQuery] Guid? zoneId,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] bool? has360,
        [FromQuery] string? amenity,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12)
    {
        var query = db.Rooms.AsNoTracking()
            .Include(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(r => r.Equipments)
            .Where(r => r.IsPublic);

        if (zoneId.HasValue)
        {
            query = query.Where(r => r.ZoneId == zoneId.Value);
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLower();
            query = query.Where(r =>
                r.RoomNumber.ToLower().Contains(kw) ||
                r.Zone.Name.ToLower().Contains(kw) ||
                r.Zone.Address.ToLower().Contains(kw) ||
                (r.Description != null && r.Description.ToLower().Contains(kw)));
        }

        if (minPrice.HasValue && minPrice.Value > 0)
        {
            query = query.Where(r => r.Price >= minPrice.Value);
        }

        if (maxPrice.HasValue && maxPrice.Value > 0)
        {
            query = query.Where(r => r.Price <= maxPrice.Value);
        }

        if (has360 == true)
        {
            query = query.Where(r => !string.IsNullOrEmpty(r.Panorama360Url));
        }

        if (!string.IsNullOrWhiteSpace(amenity))
        {
            var am = amenity.Trim().ToLower();
            query = query.Where(r => r.Amenities != null && r.Amenities.ToLower().Contains(am));
        }

        var totalItems = await query.CountAsync();

        // Ưu tiên hiển thị: Phòng có Cam 360 lên trước, sau đó tới phòng Còn trống, rồi mới nhất
        var rooms = await query
            .OrderByDescending(r => !string.IsNullOrEmpty(r.Panorama360Url))
            .ThenBy(r => r.Status == RoomStatus.Vacant ? 0 : (r.Status == RoomStatus.Deposit ? 1 : 2))
            .ThenByDescending(r => r.CreatedAt)
            .Skip((Math.Max(1, page) - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = rooms.Select(MapToPublicDto).ToList();
        return Ok(dtos);
    }

    // Lấy thông tin chi tiết một phòng trọ công khai kèm thông tin chủ trọ & ngân hàng
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetPublicRoom(Guid id)
    {
        var room = await db.Rooms.AsNoTracking()
            .Include(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(r => r.Equipments)
            .FirstOrDefaultAsync(r => r.Id == id && r.IsPublic);

        if (room is null)
        {
            return NotFound(new { message = "Không tìm thấy phòng trọ hoặc phòng chưa được công khai." });
        }

        return Ok(MapToPublicDto(room));
    }

    // Lấy danh sách các Khu trọ công khai để làm bộ lọc khu vực
    [HttpGet("zones")]
    public async Task<IActionResult> GetPublicZones()
    {
        var zones = await db.Zones.AsNoTracking()
            .Where(z => z.Rooms.Any(r => r.IsPublic))
            .Select(z => new
            {
                z.Id,
                z.Name,
                z.Address,
                TotalPublicRooms = z.Rooms.Count(r => r.IsPublic)
            })
            .OrderBy(z => z.Name)
            .ToListAsync();

        return Ok(zones);
    }

    // API xác nhận đặt cọc giữ phòng trực tuyến (khi khách chuyển khoản VietQR thành công hoặc test giả lập)
    [HttpPost("{id:guid}/confirm-deposit")]
    public async Task<IActionResult> ConfirmDeposit(Guid id, [FromBody] PublicDepositBookingRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.TenantName))
            return BadRequest(new { success = false, message = "Vui lòng nhập họ và tên người cọc" });

        if (string.IsNullOrWhiteSpace(req.TenantPhone))
            return BadRequest(new { success = false, message = "Vui lòng nhập số điện thoại người cọc" });

        if (req.DepositAmount <= 0)
            return BadRequest(new { success = false, message = "Số tiền cọc phải lớn hơn 0" });

        var room = await db.Rooms
            .Include(r => r.Zone).ThenInclude(z => z.Landlord)
            .FirstOrDefaultAsync(r => r.Id == id && r.IsPublic);

        if (room is null)
            return NotFound(new { success = false, message = "Không tìm thấy phòng trọ yêu cầu cọc." });

        if (room.Status == RoomStatus.Occupied)
            return BadRequest(new { success = false, message = $"Phòng {room.RoomNumber} hiện đang có người ở, không thể nhận cọc." });

        if (room.Status == RoomStatus.Deposit)
            return BadRequest(new { success = false, message = $"Phòng {room.RoomNumber} đã được khách khác giữ chỗ trước đó." });

        // Cập nhật trạng thái phòng sang ĐÃ CỌC (Deposit)
        room.Status = RoomStatus.Deposit;
        room.DepositAmount = req.DepositAmount;
        room.DepositTenantName = req.TenantName.Trim();
        room.DepositTenantPhone = req.TenantPhone.Trim();
        room.ExpectedMoveInDate = req.ExpectedMoveInDate.HasValue 
            ? DateTime.SpecifyKind(req.ExpectedMoveInDate.Value, DateTimeKind.Utc) 
            : null;
        
        var txCode = string.IsNullOrWhiteSpace(req.TransactionCode) 
            ? $"VietQR-{DateTime.UtcNow:yyyyMMddHHmmss}" 
            : req.TransactionCode.Trim();

        room.DepositNote = $"[Cọc VietQR Online] {req.Note?.Trim()} | Mã GD: {txCode}".Trim();

        await db.SaveChangesAsync();

        // Gửi thông báo Notification thời gian thực tới Chủ trọ quản lý
        try
        {
            var moveInText = req.ExpectedMoveInDate.HasValue 
                ? req.ExpectedMoveInDate.Value.ToString("dd/MM/yyyy") 
                : "Chưa xác định";

            await notificationService.SendNotificationAsync(
                senderId: room.Zone.LandlordId,
                title: $"🎉 Có cọc mới: Phòng {room.RoomNumber} ({room.Zone.Name})",
                content: $"Khách thuê {req.TenantName} ({req.TenantPhone}) đã chuyển cọc giữ chỗ {req.DepositAmount:N0}đ qua VietQR (Mã GD: {txCode}). Ngày dự kiến vào ở: {moveInText}.",
                target: NotificationTarget.User,
                targetId: room.Zone.LandlordId
            );
        }
        catch
        {
            // Không làm ngắt luồng cọc phòng nếu thông báo gặp sự cố
        }

        return Ok(MapToPublicDto(room));
    }

    // Webhook đón tín hiệu chuyển khoản ngân hàng (Casso/SePay/VietQR IPN)
    [HttpPost("deposit-webhook")]
    public async Task<IActionResult> DepositWebhook([FromBody] JsonElement payload)
    {
        // Nhận payload từ cổng ngân hàng, tìm nội dung chuyển khoản "COC [RoomNumber] [Phone]"
        var rawJson = payload.ToString();
        var match = Regex.Match(rawJson, @"COC[\s_-]+([a-zA-Z0-9]+)[\s_-]+([0-9]{9,11})", RegexOptions.IgnoreCase);
        
        if (match.Success)
        {
            var roomNumber = match.Groups[1].Value.Trim();
            var phone = match.Groups[2].Value.Trim();

            var room = await db.Rooms
                .Include(r => r.Zone).ThenInclude(z => z.Landlord)
                .FirstOrDefaultAsync(r => r.RoomNumber.ToLower() == roomNumber.ToLower() && r.Status == RoomStatus.Vacant);

            if (room != null)
            {
                room.Status = RoomStatus.Deposit;
                room.DepositTenantPhone = phone;
                room.DepositTenantName = $"Khách cọc (SĐT: {phone})";
                room.DepositAmount = 500000;
                room.DepositNote = $"[Webhook Ngân hàng tự động] Khớp nội dung {match.Value}";
                await db.SaveChangesAsync();

                await notificationService.SendNotificationAsync(
                    senderId: room.Zone.LandlordId,
                    title: $"🎉 [Webhook] Nhận cọc phòng {room.RoomNumber}",
                    content: $"Ngân hàng vừa báo có giao dịch cọc phòng {room.RoomNumber} từ SĐT {phone}. Hệ thống đã tự động chuyển trạng thái phòng sang ĐÃ CỌC.",
                    target: NotificationTarget.User,
                    targetId: room.Zone.LandlordId
                );

                return Ok(new { success = true, message = "Đã xử lý cọc thành công qua Webhook" });
            }
        }

        return Ok(new { success = true, message = "Webhook received (no matching pending deposit room)" });
    }

    // Helper map entity sang PublicRoomDto
    private static PublicRoomDto MapToPublicDto(Core.Entities.Room r)
    {
        var imageList = new List<string>();
        if (!string.IsNullOrWhiteSpace(r.Images))
        {
            try
            {
                if (r.Images.Trim().StartsWith("["))
                {
                    imageList = JsonSerializer.Deserialize<List<string>>(r.Images) ?? [];
                }
                else
                {
                    imageList = r.Images.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
                }
            }
            catch
            {
                imageList = [r.Images];
            }
        }

        return new PublicRoomDto(
            r.Id,
            r.ZoneId,
            r.Zone?.Name ?? "",
            r.Zone?.Address ?? "",
            r.RoomNumber,
            r.Floor,
            r.Price,
            r.Area,
            r.MaxTenants,
            r.Status.ToString(),
            r.Description,
            r.Amenities,
            r.Panorama360Url,
            imageList,
            r.ServiceFee,
            r.Zone?.Landlord?.FullName ?? "Chủ trọ",
            r.Zone?.Landlord?.Phone ?? "",
            r.Zone?.Landlord?.AvatarUrl,
            r.Zone?.Landlord?.BankName,
            r.Zone?.Landlord?.BankAccountNumber,
            r.Zone?.Landlord?.BankAccountName,
            r.Equipments?.Select(e => new RoomEquipmentDto(e.Id, e.RoomId, e.Name, e.Brand, e.Quantity, e.Condition)).ToList() ?? [],
            r.CreatedAt
        );
    }
}
