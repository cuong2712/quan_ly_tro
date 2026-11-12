using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Infrastructure.Data;
using System.Text.RegularExpressions;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý Giao dịch Thanh toán & Duyệt minh chứng biên lai (ProofImageUrl) & thông báo realtime.
public class PaymentService(AppDbContext db, NotificationService notificationService)
{
    // Lấy danh sách giao dịch thanh toán thuộc quyền quản lý của Chủ trọ (hỗ trợ phân trang).
    public async Task<object> GetByLandlordAsync(Guid landlordId, int? page = null, int? pageSize = null)
    {
        var query = db.Payments
            .AsNoTracking()
            .Include(p => p.Invoice).ThenInclude(i => i.Room).ThenInclude(r => r.Zone)
            .Include(p => p.Invoice).ThenInclude(i => i.TenantProfile).ThenInclude(t => t.User)
            .Where(p => p.Invoice.Room.Zone.LandlordId == landlordId);
        var totalItems = await query.CountAsync();
        if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
        {
            var p = page.Value > 0 ? page.Value : 1;
            var ps = pageSize.Value;
            var items = await query.OrderByDescending(p => p.CreatedAt)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();
            var dtos = items.Select(MapPayment);
            return PagedResult<PaymentDto>.Create(dtos, totalItems, p, ps);
        }
        var payments = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
        return payments.Select(MapPayment);
    }

    // Lấy danh sách giao dịch thanh toán của Khách thuê theo ID hồ sơ (TenantProfileId).
    public async Task<IEnumerable<PaymentDto>> GetByTenantAsync(Guid tenantProfileId)
    {
        var payments = await db.Payments
            .AsNoTracking()
            .Include(p => p.Invoice).ThenInclude(i => i.Room)
            .Where(p => p.Invoice.TenantProfileId == tenantProfileId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
        return payments.Select(MapPayment);
    }

    // Lấy danh sách giao dịch thanh toán của Khách thuê theo ID tài khoản (UserId).
    public async Task<IEnumerable<PaymentDto>> GetByTenantUserIdAsync(Guid tenantUserId)
    {
        var profile = await db.TenantProfiles.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == tenantUserId);
        if (profile == null)
        {
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == tenantUserId);
            if (user != null)
            {
                profile = await db.TenantProfiles.AsNoTracking().FirstOrDefaultAsync(t => t.User.Email == user.Email);
            }
        }

        if (profile == null) return [];

        var payments = await db.Payments
            .AsNoTracking()
            .Include(p => p.Invoice).ThenInclude(i => i.Room)
            .Where(p => p.Invoice.TenantProfileId == profile.Id || (p.Invoice.TenantProfile != null && p.Invoice.TenantProfile.UserId == tenantUserId))
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return payments.Select(MapPayment);
    }

    // Khách thuê gửi thông tin thanh toán kèm ảnh minh chứng biên lai (ProofImageUrl).
    public async Task<PaymentDto> SubmitAsync(Guid tenantUserId, SubmitPaymentRequest req)
    {
        var profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.UserId == tenantUserId);
        if (profile == null)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == tenantUserId);
            if (user != null)
            {
                profile = await db.TenantProfiles.FirstOrDefaultAsync(t => t.User.Email == user.Email);
            }
        }

        if (profile == null) throw new KeyNotFoundException("Không tìm thấy thông tin khách thuê.");

        var inv = await db.Invoices.Include(i => i.Room).ThenInclude(r => r.Zone)
            .FirstOrDefaultAsync(i => i.Id == req.InvoiceId && (i.TenantProfileId == profile.Id || (i.TenantProfile != null && i.TenantProfile.UserId == tenantUserId)))
            ?? throw new KeyNotFoundException("Hóa đơn không tồn tại hoặc không thuộc quyền thanh toán của bạn.");

        var method = Enum.Parse<PaymentMethod>(req.Method, ignoreCase: true);
        var pay = new Payment
        {
            InvoiceId = req.InvoiceId,
            Amount = req.Amount > 0 ? req.Amount : inv.TotalAmount,
            Method = method,
            Status = PaymentStatus.PendingApproval,
            ProofImageUrl = req.ProofImageUrl,
            Note = req.Note
        };

        db.Payments.Add(pay);
        await db.SaveChangesAsync();

        // Tự động tạo thông báo gửi đến Chủ trọ khi Khách thuê gửi minh chứng thanh toán
        var landlordId = inv.Room?.Zone?.LandlordId;
        if (landlordId.HasValue && landlordId.Value != Guid.Empty)
        {
            await notificationService.SendNotificationAsync(
                tenantUserId,
                $"Khách thuê gửi minh chứng thanh toán hóa đơn {inv.InvoiceCode}",
                $"Phòng {inv.Room?.RoomNumber}: Khách thuê đã gửi minh chứng thanh toán số tiền {pay.Amount:N0} VNĐ cho hóa đơn {inv.InvoiceCode}. Vui lòng kiểm tra và duyệt.",
                NotificationTarget.User,
                landlordId.Value
            );
        }

        pay.Invoice = inv;
        return MapPayment(pay);
    }

    // Chủ trọ duyệt (Approve = true) hoặc từ chối (Approve = false) giao dịch thanh toán của khách thuê.
    public async Task<PaymentDto> ConfirmAsync(Guid id, Guid landlordId, ConfirmPaymentRequest req)
    {
        var pay = await db.Payments
            .Include(p => p.Invoice).ThenInclude(i => i.Room).ThenInclude(r => r.Zone)
            .Include(p => p.Invoice).ThenInclude(i => i.TenantProfile)
            .FirstOrDefaultAsync(p => p.Id == id && p.Invoice.Room.Zone.LandlordId == landlordId)
            ?? throw new KeyNotFoundException("Giao dịch thanh toán không tồn tại hoặc bạn không có quyền duyệt.");

        pay.Status = req.Approve ? PaymentStatus.Completed : PaymentStatus.Rejected;
        pay.ConfirmedBy = landlordId;
        pay.ConfirmedAt = DateTime.UtcNow;

        if (req.Approve && pay.Invoice != null)
        {
            pay.Invoice.Status = InvoiceStatus.Paid;
            pay.Invoice.PaidDate = DateTime.UtcNow;

            if (pay.Invoice.Room != null && pay.Invoice.Room.Status == RoomStatus.Vacant)
            {
                pay.Invoice.Room.Status = RoomStatus.Occupied;
            }
        }

        if (!string.IsNullOrEmpty(req.Note))
        {
            pay.Note = req.Note;
        }

        await db.SaveChangesAsync();

        // Tự động tạo thông báo kết quả duyệt thanh toán gửi đến Khách thuê
        if (pay.Invoice?.TenantProfile != null)
        {
            await notificationService.SendNotificationAsync(
                landlordId,
                req.Approve ? $"Duyệt thanh toán thành công hóa đơn {pay.Invoice.InvoiceCode}" : $"Từ chối thanh toán hóa đơn {pay.Invoice.InvoiceCode}",
                req.Approve 
                    ? $"Chủ trọ đã xác nhận thanh toán thành công số tiền {pay.Amount:N0} VNĐ cho hóa đơn tháng {pay.Invoice.Month} (Phòng {pay.Invoice.Room?.RoomNumber})."
                    : $"Chủ trọ đã từ chối xác nhận thanh toán hóa đơn {pay.Invoice.InvoiceCode}. Lý do: {req.Note ?? "Minh chứng không hợp lệ"}.",
                NotificationTarget.User,
                pay.Invoice.TenantProfile.UserId
            );
        }

        return MapPayment(pay);
    }

    // Xử lý Webhook Biến động số dư tự động gạch nợ Đa Chủ Trọ (Multi-Landlord)
    // Tự động nhận diện và gạch nợ:
    // 1. Tiền Cọc Phòng (Deposit): Khách cọc phòng qua VietQR (cú pháp: COC [Số_phòng] [SĐT])
    // 2. Tiền Phòng Hàng Tháng (Monthly Rent): Khách đóng tiền theo mã hóa đơn hoặc số phòng
    public async Task<AutoReconcileResultDto> ProcessSepayWebhookAsync(SepayWebhookDto webhook)
    {
        // 1. Kiểm tra loại giao dịch: chỉ xử lý tiền vào (in)
        if (!string.IsNullOrEmpty(webhook.TransferType) && webhook.TransferType.Trim().ToLower() != "in")
        {
            return new AutoReconcileResultDto(true, "Bỏ qua giao dịch tiền ra (out).");
        }

        // 2. Nội dung giao dịch & STK nhận
        var content = (webhook.Content ?? webhook.Description ?? "").Trim();
        if (string.IsNullOrEmpty(content) && !string.IsNullOrEmpty(webhook.Code))
        {
            content = webhook.Code;
        }

        if (string.IsNullOrWhiteSpace(content))
        {
            return new AutoReconcileResultDto(false, "Nội dung chuyển khoản rỗng, không thể đối soát.");
        }

        var incomingAcc = (webhook.AccountNumber ?? webhook.SubAccount ?? "").Trim().Replace(" ", "").Replace("-", "");

        // 3. Tìm Chủ trọ tương ứng theo STK nhận tiền (nếu có cung cấp STK)
        User? matchedLandlord = null;
        if (!string.IsNullOrEmpty(incomingAcc))
        {
            var landlords = await db.Users.AsNoTracking()
                .Where(u => u.Role == UserRole.Landlord && !string.IsNullOrEmpty(u.BankAccountNumber))
                .ToListAsync();

            matchedLandlord = landlords.FirstOrDefault(l =>
            {
                var cleanDbAcc = (l.BankAccountNumber ?? "").Trim().Replace(" ", "").Replace("-", "");
                return cleanDbAcc.Equals(incomingAcc, StringComparison.OrdinalIgnoreCase) ||
                       cleanDbAcc.EndsWith(incomingAcc, StringComparison.OrdinalIgnoreCase) ||
                       incomingAcc.EndsWith(cleanDbAcc, StringComparison.OrdinalIgnoreCase);
            });
        }

        var cleanContent = content.Replace(" ", "").Replace("-", "").ToUpperInvariant();

        // 4. KIỂM TRA NGHIỆP VỤ 1: ĐẶT CỌC GIỮ PHÒNG (DEPOSIT)
        // Cú pháp cọc thông dụng: "COC 101 03971818799", "COC 101", "DAT COC PHONG 101", "TIEN COC 101", "COC-101"
        var isDepositPattern = cleanContent.StartsWith("COC") || 
                               cleanContent.Contains("DATCOC") || 
                               cleanContent.Contains("TIENCOC") || 
                               cleanContent.Contains("GIUCHO") ||
                               Regex.IsMatch(content, @"\b(?:COC|CỌC)\b", RegexOptions.IgnoreCase);

        if (isDepositPattern)
        {
            // Bóc tách số phòng và số điện thoại từ nội dung
            string? parsedRoomNumber = null;
            string? parsedPhone = null;

            // Pattern A: "COC 101 03971818799" hoặc "COC P101 0987654321"
            var matchA = Regex.Match(content, @"(?:COC|CỌC|DAT\s*COC|TIEN\s*COC)[\s_\-\.]*(?:PHONG|P)?[\s_\-\.]*([A-Za-z0-9]+)[\s_\-\.]+([0-9]{9,11})", RegexOptions.IgnoreCase);
            if (matchA.Success)
            {
                parsedRoomNumber = matchA.Groups[1].Value.Trim();
                parsedPhone = matchA.Groups[2].Value.Trim();
            }
            else
            {
                // Pattern B: "COC 101" hoặc "COC P101"
                var matchB = Regex.Match(content, @"(?:COC|CỌC|DAT\s*COC|TIEN\s*COC)[\s_\-\.]*(?:PHONG|P)?[\s_\-\.]*([A-Za-z0-9]+)", RegexOptions.IgnoreCase);
                if (matchB.Success)
                {
                    parsedRoomNumber = matchB.Groups[1].Value.Trim();
                }
                var phoneMatch = Regex.Match(content, @"\b(0[0-9]{9,10})\b");
                if (phoneMatch.Success)
                {
                    parsedPhone = phoneMatch.Groups[1].Value.Trim();
                }
            }

            // Tìm phòng tương ứng
            var roomQuery = db.Rooms
                .Include(r => r.Zone).ThenInclude(z => z.Landlord)
                .AsQueryable();

            if (matchedLandlord != null)
            {
                roomQuery = roomQuery.Where(r => r.Zone.LandlordId == matchedLandlord.Id);
            }

            var candidateRooms = await roomQuery.ToListAsync();

            Room? matchedRoom = null;
            if (!string.IsNullOrEmpty(parsedRoomNumber))
            {
                var normParsed = parsedRoomNumber.Replace("P", "").Replace("PHONG", "").ToUpperInvariant();
                matchedRoom = candidateRooms.FirstOrDefault(r =>
                {
                    var normR = r.RoomNumber.Replace("P", "").Replace("PHONG", "").ToUpperInvariant();
                    return normR == normParsed || r.RoomNumber.Equals(parsedRoomNumber, StringComparison.OrdinalIgnoreCase);
                });
            }

            // Nếu chưa tìm thấy phòng và đã lọc theo chủ trọ, thử tìm trên toàn bộ hệ thống
            if (matchedRoom == null && matchedLandlord != null && !string.IsNullOrEmpty(parsedRoomNumber))
            {
                var normParsed = parsedRoomNumber.Replace("P", "").Replace("PHONG", "").ToUpperInvariant();
                matchedRoom = await db.Rooms
                    .Include(r => r.Zone).ThenInclude(z => z.Landlord)
                    .FirstOrDefaultAsync(r => r.RoomNumber.Replace("P", "").Replace("PHONG", "").ToUpperInvariant() == normParsed);
            }

            if (matchedRoom != null)
            {
                var landlord = matchedRoom.Zone?.Landlord ?? matchedLandlord;
                var transferAmount = webhook.TransferAmount > 0 
                    ? webhook.TransferAmount 
                    : (matchedRoom.DepositAmount.HasValue && matchedRoom.DepositAmount.Value > 0 ? matchedRoom.DepositAmount.Value : 500000m);

                var bankDisplay = landlord != null && !string.IsNullOrEmpty(landlord.BankAccountNumber)
                    ? $"{landlord.BankName ?? webhook.Gateway ?? "Ngân hàng"} (STK {landlord.BankAccountNumber} - {landlord.FullName})"
                    : $"{webhook.Gateway ?? "Ngân hàng"} (STK {webhook.AccountNumber ?? "chưa rõ"})";

                var txCode = webhook.ReferenceCode ?? webhook.Id?.ToString() ?? "SEPAY-" + DateTime.UtcNow.Ticks;

                matchedRoom.Status = RoomStatus.Deposit;
                matchedRoom.DepositAmount = transferAmount;
                if (!string.IsNullOrEmpty(parsedPhone))
                {
                    matchedRoom.DepositTenantPhone = parsedPhone;
                    if (string.IsNullOrEmpty(matchedRoom.DepositTenantName) || matchedRoom.DepositTenantName.Contains("Khách"))
                    {
                        matchedRoom.DepositTenantName = $"Khách cọc (SĐT: {parsedPhone})";
                    }
                }
                else if (string.IsNullOrEmpty(matchedRoom.DepositTenantName))
                {
                    matchedRoom.DepositTenantName = "Khách cọc VietQR";
                }

                matchedRoom.DepositNote = $"[Tự động gạch nợ Cọc VietQR] {bankDisplay} | Mã GD: {txCode} | ND: {content}";

                await db.SaveChangesAsync();

                // Gửi thông báo Realtime cho Chủ trọ
                if (landlord != null)
                {
                    await notificationService.SendNotificationAsync(
                        senderId: landlord.Id,
                        title: $"🎉 Có cọc mới: Phòng {matchedRoom.RoomNumber} ({matchedRoom.Zone?.Name ?? "Khu trọ"})",
                        content: $"Tài khoản {bankDisplay} vừa nhận số tiền {transferAmount:N0}đ cọc giữ chỗ phòng {matchedRoom.RoomNumber}. Hệ thống SmartRent đã tự động gạch nợ và đổi trạng thái phòng sang ĐÃ CỌC.",
                        target: NotificationTarget.User,
                        targetId: landlord.Id
                    );
                }

                // Nếu có SĐT khách và trùng với tài khoản Tenant đã đăng ký: gửi thông báo Realtime cho Tenant
                if (!string.IsNullOrEmpty(parsedPhone))
                {
                    var tenantUser = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Phone == parsedPhone);
                    if (tenantUser != null)
                    {
                        await notificationService.SendNotificationAsync(
                            senderId: landlord?.Id ?? Guid.Empty,
                            title: $"✅ Cọc giữ chỗ thành công phòng {matchedRoom.RoomNumber}",
                            content: $"Giao dịch chuyển cọc {transferAmount:N0}đ cho phòng {matchedRoom.RoomNumber} đã được hệ thống SmartRent tự động ghi nhận và giữ chỗ thành công cho bạn.",
                            target: NotificationTarget.User,
                            targetId: tenantUser.Id
                        );
                    }
                }

                return new AutoReconcileResultDto(
                    Success: true,
                    Message: $"Tự động gạch nợ cọc phòng {matchedRoom.RoomNumber} thành công qua {bankDisplay}",
                    RoomNumber: matchedRoom.RoomNumber,
                    Amount: transferAmount,
                    BankAccount: landlord?.BankAccountNumber ?? webhook.AccountNumber,
                    Type: "Deposit",
                    RoomId: matchedRoom.Id,
                    LandlordName: landlord?.FullName
                );
            }
        }

        // 5. KIỂM TRA NGHIỆP VỤ 2: THANH TOÁN TIỀN PHÒNG HÀNG THÁNG (INVOICE)
        var invoiceQuery = db.Invoices
            .Include(i => i.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(i => i.TenantProfile).ThenInclude(t => t.User)
            .Where(i => i.Status == InvoiceStatus.Unpaid)
            .AsQueryable();

        if (matchedLandlord != null)
        {
            invoiceQuery = invoiceQuery.Where(i => i.Room.Zone.LandlordId == matchedLandlord.Id);
        }

        var unpaidInvoices = await invoiceQuery.ToListAsync();

        Invoice? matchedInvoice = null;

        // Ưu tiên 1: Khớp chính xác InvoiceCode
        matchedInvoice = unpaidInvoices.FirstOrDefault(i =>
            cleanContent.Contains(i.InvoiceCode.Replace(" ", "").Replace("-", "").ToUpperInvariant())
        );

        // Ưu tiên 2: Tìm theo số phòng trong danh sách hóa đơn của chủ trọ
        if (matchedInvoice == null)
        {
            matchedInvoice = unpaidInvoices.FirstOrDefault(i =>
            {
                var rNum = i.Room?.RoomNumber?.Replace(" ", "").Replace(".", "").ToUpperInvariant();
                return !string.IsNullOrEmpty(rNum) && (
                    cleanContent.Contains($"PHONG{rNum}") ||
                    cleanContent.Contains($"P{rNum}") ||
                    cleanContent.Contains(rNum)
                );
            });
        }

        // Nếu chưa tìm thấy và đã lọc theo chủ trọ, mở rộng tìm kiếm toàn hệ thống
        if (matchedInvoice == null && matchedLandlord != null)
        {
            var globalUnpaids = await db.Invoices
                .Include(i => i.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
                .Include(i => i.TenantProfile).ThenInclude(t => t.User)
                .Where(i => i.Status == InvoiceStatus.Unpaid)
                .ToListAsync();

            matchedInvoice = globalUnpaids.FirstOrDefault(i =>
                cleanContent.Contains(i.InvoiceCode.Replace(" ", "").Replace("-", "").ToUpperInvariant())
            ) ?? globalUnpaids.FirstOrDefault(i =>
            {
                var rNum = i.Room?.RoomNumber?.Replace(" ", "").Replace(".", "").ToUpperInvariant();
                return !string.IsNullOrEmpty(rNum) && (
                    cleanContent.Contains($"PHONG{rNum}") ||
                    cleanContent.Contains($"P{rNum}")
                );
            });
        }

        if (matchedInvoice == null)
        {
            return new AutoReconcileResultDto(
                false,
                $"Không tìm thấy hóa đơn hoặc phòng cọc phù hợp với nội dung chuyển khoản: '{content}'.",
                BankAccount: incomingAcc
            );
        }

        var invLandlord = matchedInvoice.Room?.Zone?.Landlord ?? matchedLandlord;
        var invTransferAmount = webhook.TransferAmount > 0 ? webhook.TransferAmount : matchedInvoice.TotalAmount;
        var invBankDisplay = invLandlord != null && !string.IsNullOrEmpty(invLandlord.BankAccountNumber)
            ? $"{invLandlord.BankName ?? webhook.Gateway ?? "Ngân hàng"} (STK {invLandlord.BankAccountNumber} - {invLandlord.FullName})"
            : $"{webhook.Gateway ?? "Ngân hàng"} (STK {webhook.AccountNumber ?? "chưa rõ"})";

        var payment = new Payment
        {
            InvoiceId = matchedInvoice.Id,
            Amount = invTransferAmount,
            Method = PaymentMethod.BankTransfer,
            Status = PaymentStatus.Completed,
            Note = $"[Tự động gạch nợ Webhook] {invBankDisplay} | Cổng: {webhook.Gateway ?? "VietQR"} | Mã GD: {webhook.ReferenceCode ?? webhook.Id?.ToString() ?? "SEPAY-" + DateTime.UtcNow.Ticks}. ND: {content}",
            ConfirmedAt = DateTime.UtcNow,
            ConfirmedBy = invLandlord?.Id
        };

        db.Payments.Add(payment);

        matchedInvoice.Status = InvoiceStatus.Paid;
        matchedInvoice.PaidDate = DateTime.UtcNow;

        if (matchedInvoice.Room != null && matchedInvoice.Room.Status == RoomStatus.Vacant)
        {
            matchedInvoice.Room.Status = RoomStatus.Occupied;
        }

        await db.SaveChangesAsync();

        // Gửi thông báo tự động đến Chủ trọ & Khách thuê
        var landlordId = invLandlord?.Id ?? matchedInvoice.Room?.Zone?.LandlordId;
        var tenantUserId = matchedInvoice.TenantProfile?.UserId;

        if (landlordId.HasValue && landlordId.Value != Guid.Empty)
        {
            await notificationService.SendNotificationAsync(
                tenantUserId ?? Guid.Empty,
                $"⚡ Tự động gạch nợ: Hóa đơn {matchedInvoice.InvoiceCode} (Phòng {matchedInvoice.Room?.RoomNumber})",
                $"Tài khoản {invBankDisplay} vừa nhận số tiền {invTransferAmount:N0}đ. Hệ thống SmartRent đã tự động đối soát và gạch nợ thành công cho hóa đơn {matchedInvoice.InvoiceCode}.",
                NotificationTarget.User,
                landlordId.Value
            );
        }

        if (tenantUserId.HasValue && tenantUserId.Value != Guid.Empty)
        {
            await notificationService.SendNotificationAsync(
                landlordId ?? Guid.Empty,
                $"✅ Thanh toán thành công hóa đơn {matchedInvoice.InvoiceCode}",
                $"Hệ thống đã nhận diện giao dịch chuyển khoản vào tài khoản {invBankDisplay} và tự động gạch nợ số tiền {invTransferAmount:N0}đ cho phòng {matchedInvoice.Room?.RoomNumber}.",
                NotificationTarget.User,
                tenantUserId.Value
            );
        }

        return new AutoReconcileResultDto(
            Success: true,
            Message: $"Tự động gạch nợ thành công hóa đơn {matchedInvoice.InvoiceCode} qua {invBankDisplay}",
            InvoiceId: matchedInvoice.Id,
            InvoiceCode: matchedInvoice.InvoiceCode,
            RoomNumber: matchedInvoice.Room?.RoomNumber,
            Amount: invTransferAmount,
            BankAccount: invLandlord?.BankAccountNumber ?? webhook.AccountNumber,
            Type: "Invoice",
            RoomId: matchedInvoice.RoomId,
            LandlordName: invLandlord?.FullName
        );
    }

    // Giả lập giao dịch chuyển khoản tiền phòng tháng để test tính năng tự động gạch nợ
    public async Task<AutoReconcileResultDto> SimulateAutoClearAsync(Guid invoiceId)
    {
        var inv = await db.Invoices
            .Include(i => i.Room).ThenInclude(r => r.Zone).ThenInclude(z => z.Landlord)
            .Include(i => i.TenantProfile)
            .FirstOrDefaultAsync(i => i.Id == invoiceId)
            ?? throw new KeyNotFoundException("Không tìm thấy hóa đơn cần thanh toán.");

        var landlord = inv.Room?.Zone?.Landlord;
        var bankName = landlord?.BankName ?? "MB";
        var accNo = landlord?.BankAccountNumber ?? "0379513393";

        var mockWebhook = new SepayWebhookDto
        {
            Id = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            Gateway = bankName,
            AccountNumber = accNo,
            TransferType = "in",
            TransferAmount = inv.TotalAmount,
            Content = $"Phong {inv.Room?.RoomNumber ?? "101"} thanh toan {inv.InvoiceCode}",
            ReferenceCode = "SIM-" + new Random().Next(100000, 999999),
            TransactionDate = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")
        };

        return await ProcessSepayWebhookAsync(mockWebhook);
    }

    // Giả lập giao dịch chuyển khoản tiền cọc phòng để test tính năng tự động gạch nợ cọc
    public async Task<AutoReconcileResultDto> SimulateDepositAsync(SimulateDepositRequestDto req)
    {
        var room = await db.Rooms
            .Include(r => r.Zone).ThenInclude(z => z.Landlord)
            .FirstOrDefaultAsync(r => r.Id == req.RoomId)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng trọ cần cọc.");

        var landlord = room.Zone?.Landlord;
        var bankName = landlord?.BankName ?? "MB";
        var accNo = landlord?.BankAccountNumber ?? "0379513393";
        var phone = !string.IsNullOrWhiteSpace(req.TenantPhone) ? req.TenantPhone.Trim() : "03971818799";
        var depositAmount = req.Amount > 0 
            ? req.Amount 
            : (room.DepositAmount.HasValue && room.DepositAmount.Value > 0 ? room.DepositAmount.Value : 500000m);

        var mockWebhook = new SepayWebhookDto
        {
            Id = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            Gateway = bankName,
            AccountNumber = accNo,
            TransferType = "in",
            TransferAmount = depositAmount,
            Content = $"COC {room.RoomNumber} {phone}",
            ReferenceCode = "SIM-COC-" + new Random().Next(100000, 999999),
            TransactionDate = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")
        };

        return await ProcessSepayWebhookAsync(mockWebhook);
    }

    private static PaymentDto MapPayment(Payment p) => new(
        p.Id,
        p.InvoiceId,
        p.Invoice?.InvoiceCode ?? "",
        p.Amount,
        p.Method.ToString(),
        p.Status.ToString(),
        p.ProofImageUrl,
        p.Note,
        p.CreatedAt,
        p.ConfirmedAt,
        p.Invoice?.Room?.RoomNumber,
        p.Invoice?.Room?.ZoneId,
        p.Invoice?.Room?.Zone?.Name,
        p.Invoice?.TenantProfile?.User?.FullName,
        p.Invoice?.Month
    );
}
