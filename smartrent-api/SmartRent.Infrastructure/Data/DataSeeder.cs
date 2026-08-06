using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;

namespace SmartRent.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        await context.Database.MigrateAsync();

        try
        {
            await context.Database.ExecuteSqlRawAsync("DROP INDEX IF EXISTS \"IX_TenantProfiles_RoomId\"; CREATE INDEX IF NOT EXISTS \"IX_TenantProfiles_RoomId\" ON \"TenantProfiles\"(\"RoomId\");");
        }
        catch (Exception ex)
        {
            Console.WriteLine("Index fix warning: " + ex.Message);
        }

        if (await context.Users.AnyAsync()) return;

        // ============ USERS ============
        var superAdmin = new User
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
            Email = "admin@smartrent.vn",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123456"),
            FullName = "Super Admin",
            Phone = "0900000001",
            Role = UserRole.SuperAdmin,
            AvatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            IsActive = true
        };

        var landlord1 = new User
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000002"),
            Email = "landlord@smartrent.vn",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Landlord@123456"),
            FullName = "Nguyễn Văn Hải",
            Phone = "0908123456",
            Role = UserRole.Landlord,
            AvatarUrl = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
            IsActive = true
        };

        var landlord2 = new User
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000003"),
            Email = "maitran@smartrent.vn",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Landlord@123456"),
            FullName = "Trần Thị Mai",
            Phone = "0912987654",
            Role = UserRole.Landlord,
            AvatarUrl = "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
            IsActive = true
        };

        var tenant1User = new User
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000004"),
            Email = "tenant1@smartrent.vn",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Tenant@123456"),
            FullName = "Nguyễn Văn Minh",
            Phone = "0938111222",
            Role = UserRole.Tenant,
            AvatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
            IsActive = true
        };

        var tenant2User = new User
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000005"),
            Email = "tenant2@smartrent.vn",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Tenant@123456"),
            FullName = "Lê Thị Thu Thảo",
            Phone = "0977222333",
            Role = UserRole.Tenant,
            AvatarUrl = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
            IsActive = true
        };

        var tenant3User = new User
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000006"),
            Email = "tenant3@smartrent.vn",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Tenant@123456"),
            FullName = "Phạm Đức Anh",
            Phone = "0966444555",
            Role = UserRole.Tenant,
            AvatarUrl = "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
            IsActive = true
        };

        await context.Users.AddRangeAsync(superAdmin, landlord1, landlord2, tenant1User, tenant2User, tenant3User);
        await context.SaveChangesAsync();

        // ============ ZONES ============
        var zone1 = new Zone
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000001"),
            LandlordId = landlord1.Id,
            Name = "Khu Trọ SmartRent Quận 1",
            Address = "123 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM",
            Description = "Chung cư mini cao cấp đầy đủ nội thất, camera an ninh 24/7",
            TotalRooms = 10
        };

        var zone2 = new Zone
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000002"),
            LandlordId = landlord1.Id,
            Name = "Khu Trọ Xanh Bình Thạnh",
            Address = "45/12 D2, Phường 25, Bình Thạnh, TP.HCM",
            Description = "Gần các trường ĐH HUTECH, Ngoại Thương, giao thông thuận tiện",
            TotalRooms = 8
        };

        var zone3 = new Zone
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000003"),
            LandlordId = landlord2.Id,
            Name = "Khu Trọ Tân Bình Star",
            Address = "88 Cộng Hòa, Phường 4, Tân Bình, TP.HCM",
            Description = "Phòng studio ban công thoáng mát, thang máy",
            TotalRooms = 6
        };

        await context.Zones.AddRangeAsync(zone1, zone2, zone3);
        await context.SaveChangesAsync();

        // ============ ROOMS ============
        var room101 = new Room
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000001"),
            ZoneId = zone1.Id,
            RoomNumber = "P.101",
            Floor = 1,
            Price = 4200000,
            Area = 25,
            MaxTenants = 2,
            Status = RoomStatus.Occupied,
            ElecMeter = 1240,
            WaterMeter = 310,
            Description = "Phòng tầng 1, máy lạnh Inverter, tủ lạnh, bếp từ"
        };
        var room102 = new Room
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000002"),
            ZoneId = zone1.Id,
            RoomNumber = "P.102",
            Floor = 1,
            Price = 4500000,
            Area = 28,
            MaxTenants = 3,
            Status = RoomStatus.Occupied,
            ElecMeter = 980,
            WaterMeter = 245,
            Description = "Phòng studio rộng, gác lửng cao, tủ quần áo âm tường"
        };
        var room103 = new Room
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000003"),
            ZoneId = zone1.Id,
            RoomNumber = "P.103",
            Floor = 1,
            Price = 3800000,
            Area = 22,
            MaxTenants = 2,
            Status = RoomStatus.Vacant,
            ElecMeter = 450,
            WaterMeter = 110,
            Description = "Phòng thoáng, cửa sổ lớn hướng Nam"
        };
        var room201 = new Room
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000004"),
            ZoneId = zone1.Id,
            RoomNumber = "P.201",
            Floor = 2,
            Price = 5000000,
            Area = 32,
            MaxTenants = 3,
            Status = RoomStatus.Maintenance,
            ElecMeter = 1560,
            WaterMeter = 410,
            Description = "Phòng VIP ban công rộng, view phố"
        };
        var roomBT1 = new Room
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000005"),
            ZoneId = zone2.Id,
            RoomNumber = "P.301",
            Floor = 3,
            Price = 3900000,
            Area = 23,
            MaxTenants = 2,
            Status = RoomStatus.Occupied,
            ElecMeter = 820,
            WaterMeter = 195,
            Description = "Phòng Bình Thạnh thoáng tĩnh lặng"
        };
        var roomBT2 = new Room
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000006"),
            ZoneId = zone2.Id,
            RoomNumber = "P.302",
            Floor = 3,
            Price = 4100000,
            Area = 26,
            MaxTenants = 2,
            Status = RoomStatus.Vacant,
            ElecMeter = 310,
            WaterMeter = 85,
            Description = "Phòng mới sơn sửa cực đẹp"
        };

        await context.Rooms.AddRangeAsync(room101, room102, room103, room201, roomBT1, roomBT2);
        await context.SaveChangesAsync();

        // ============ TENANT PROFILES ============
        var tp1 = new TenantProfile
        {
            Id = Guid.Parse("30000000-0000-0000-0000-000000000001"),
            UserId = tenant1User.Id,
            RoomId = room101.Id,
            CCCD = "079201008899",
            Hometown = "Long An",
            MoveInDate = new DateTime(2025, 6, 1),
            Deposit = 4200000,
            CccdFrontUrl = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400",
            CccdBackUrl = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400"
        };
        var tp2 = new TenantProfile
        {
            Id = Guid.Parse("30000000-0000-0000-0000-000000000002"),
            UserId = tenant2User.Id,
            RoomId = room102.Id,
            CCCD = "038302001122",
            Hometown = "Đồng Nai",
            MoveInDate = new DateTime(2025, 9, 15),
            Deposit = 4500000,
            CccdFrontUrl = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400",
            CccdBackUrl = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400"
        };
        var tp3 = new TenantProfile
        {
            Id = Guid.Parse("30000000-0000-0000-0000-000000000003"),
            UserId = tenant3User.Id,
            RoomId = roomBT1.Id,
            CCCD = "001200004455",
            Hometown = "Hà Nội",
            MoveInDate = new DateTime(2026, 1, 10),
            Deposit = 3900000,
            CccdFrontUrl = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400",
            CccdBackUrl = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400"
        };

        await context.TenantProfiles.AddRangeAsync(tp1, tp2, tp3);
        await context.SaveChangesAsync();

        // ============ CONTRACTS ============
        var contract1 = new Contract
        {
            Id = Guid.Parse("40000000-0000-0000-0000-000000000001"),
            ContractCode = "HD-2025-P101",
            RoomId = room101.Id,
            TenantProfileId = tp1.Id,
            StartDate = new DateTime(2025, 6, 1),
            EndDate = new DateTime(2026, 6, 1),
            RentAmount = 4200000,
            Deposit = 4200000,
            Status = ContractStatus.Active,
            PaymentTermDay = 5,
            Terms = "Bên B giữ vệ sinh chung, không nuôi thú cưng gây ồn, thanh toán trước ngày 05."
        };
        var contract2 = new Contract
        {
            Id = Guid.Parse("40000000-0000-0000-0000-000000000002"),
            ContractCode = "HD-2025-P102",
            RoomId = room102.Id,
            TenantProfileId = tp2.Id,
            StartDate = new DateTime(2025, 9, 15),
            EndDate = new DateTime(2026, 9, 15),
            RentAmount = 4500000,
            Deposit = 4500000,
            Status = ContractStatus.Active,
            PaymentTermDay = 5,
            Terms = "Trả phòng báo trước 30 ngày. Không sửa kết cấu phòng."
        };
        var contract3 = new Contract
        {
            Id = Guid.Parse("40000000-0000-0000-0000-000000000003"),
            ContractCode = "HD-2026-P301",
            RoomId = roomBT1.Id,
            TenantProfileId = tp3.Id,
            StartDate = new DateTime(2026, 1, 10),
            EndDate = new DateTime(2027, 1, 10),
            RentAmount = 3900000,
            Deposit = 3900000,
            Status = ContractStatus.Active,
            PaymentTermDay = 5,
            Terms = "Giữ yên tĩnh sau 22h. Thanh toán điện nước đầy đủ hàng tháng."
        };

        await context.Contracts.AddRangeAsync(contract1, contract2, contract3);

        // ============ UTILITY RATES ============
        var rate1 = new UtilityRate { LandlordId = landlord1.Id, ElecPrice = 3500, WaterPrice = 18000 };
        var rate2 = new UtilityRate { LandlordId = landlord2.Id, ElecPrice = 3800, WaterPrice = 20000 };
        await context.UtilityRates.AddRangeAsync(rate1, rate2);

        // ============ UTILITY LOGS ============
        var ul1 = new UtilityLog { RoomId = room101.Id, Month = "2026-07", OldElec = 1140, NewElec = 1240, ElecUsed = 100, OldWater = 295, NewWater = 310, WaterUsed = 15, ElecCost = 350000, WaterCost = 270000, RecordedAt = new DateTime(2026, 7, 25) };
        var ul2 = new UtilityLog { RoomId = room102.Id, Month = "2026-07", OldElec = 880, NewElec = 980, ElecUsed = 100, OldWater = 230, NewWater = 245, WaterUsed = 15, ElecCost = 350000, WaterCost = 270000, RecordedAt = new DateTime(2026, 7, 25) };
        var ul3 = new UtilityLog { RoomId = roomBT1.Id, Month = "2026-07", OldElec = 730, NewElec = 820, ElecUsed = 90, OldWater = 183, NewWater = 195, WaterUsed = 12, ElecCost = 315000, WaterCost = 216000, RecordedAt = new DateTime(2026, 7, 25) };
        await context.UtilityLogs.AddRangeAsync(ul1, ul2, ul3);

        // ============ SERVICES ============
        var svc1 = new Service { LandlordId = landlord1.Id, Name = "Internet / Wi-Fi Tốc độ cao", Price = 100000, Unit = "phòng/tháng", Icon = "Wifi" };
        var svc2 = new Service { LandlordId = landlord1.Id, Name = "Giữ xe máy", Price = 120000, Unit = "xe/tháng", Icon = "Bike" };
        var svc3 = new Service { LandlordId = landlord1.Id, Name = "Rác & Vệ sinh hành lang", Price = 50000, Unit = "phòng/tháng", Icon = "Trash2" };
        var svc4 = new Service { LandlordId = landlord1.Id, Name = "Dùng Máy giặt chung", Price = 80000, Unit = "người/tháng", Icon = "WashingMachine" };
        var svc5 = new Service { LandlordId = landlord1.Id, Name = "Phí Quản lý & An ninh", Price = 60000, Unit = "phòng/tháng", Icon = "ShieldCheck" };
        await context.Services.AddRangeAsync(svc1, svc2, svc3, svc4, svc5);

        // ============ INVOICES ============
        var inv1 = new Invoice
        {
            Id = Guid.Parse("50000000-0000-0000-0000-000000000001"),
            InvoiceCode = "HD-0726-P101",
            RoomId = room101.Id,
            TenantProfileId = tp1.Id,
            Month = "2026-07",
            RentFee = 4200000, ElecFee = 350000, WaterFee = 270000, ServiceFee = 270000,
            TotalAmount = 5090000,
            Status = InvoiceStatus.Unpaid,
            DueDate = new DateTime(2026, 8, 5),
            CreatedAt = new DateTime(2026, 7, 26),
            Items = [
                new InvoiceItem { Name = "Tiền thuê phòng P.101", Amount = 4200000 },
                new InvoiceItem { Name = "Tiền điện (100 kWh x 3,500đ)", Amount = 350000 },
                new InvoiceItem { Name = "Tiền nước (15 m³ x 18,000đ)", Amount = 270000 },
                new InvoiceItem { Name = "Dịch vụ: Wi-Fi, Rác, Giữ xe", Amount = 270000 }
            ]
        };
        var inv2 = new Invoice
        {
            Id = Guid.Parse("50000000-0000-0000-0000-000000000002"),
            InvoiceCode = "HD-0726-P102",
            RoomId = room102.Id,
            TenantProfileId = tp2.Id,
            Month = "2026-07",
            RentFee = 4500000, ElecFee = 350000, WaterFee = 270000, ServiceFee = 310000,
            TotalAmount = 5430000,
            Status = InvoiceStatus.Paid,
            PaidDate = new DateTime(2026, 7, 27),
            DueDate = new DateTime(2026, 8, 5),
            CreatedAt = new DateTime(2026, 7, 26)
        };

        await context.Invoices.AddRangeAsync(inv1, inv2);

        // ============ PAYMENTS ============
        var pay1 = new Payment
        {
            InvoiceId = inv2.Id,
            Amount = 5430000,
            Method = PaymentMethod.VietQR,
            Status = PaymentStatus.Completed,
            Note = "Chuyển khoản VietQR thành công",
            CreatedAt = new DateTime(2026, 7, 27, 9, 30, 0),
            ConfirmedAt = new DateTime(2026, 7, 27, 10, 0, 0)
        };
        await context.Payments.AddAsync(pay1);

        // ============ MAINTENANCE REQUESTS ============
        var mt1 = new MaintenanceRequest
        {
            RoomId = room101.Id,
            TenantProfileId = tp1.Id,
            IssueType = "Máy lạnh",
            Title = "Máy lạnh phòng P.101 không lạnh",
            Description = "Dàn lạnh thổi ra hơi gió nhưng không lạnh. Nhờ chủ trọ cho thợ kiểm tra.",
            Priority = MaintenancePriority.High,
            Status = MaintenanceStatus.InProgress,
            AssignedTo = "Thợ điện lạnh Tuấn (0909112233)",
            ImageUrl = "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400",
            CreatedAt = new DateTime(2026, 7, 27, 10, 15, 0)
        };
        var mt2 = new MaintenanceRequest
        {
            RoomId = roomBT1.Id,
            TenantProfileId = tp3.Id,
            IssueType = "Vòi nước",
            Title = "Bồn rửa chén bị rò rỉ nước",
            Description = "Vòi củ sen nhà vệ sinh bị rỉ giọt liên tục.",
            Priority = MaintenancePriority.Medium,
            Status = MaintenanceStatus.Pending,
            AssignedTo = "Chưa phân công",
            CreatedAt = new DateTime(2026, 7, 28, 8, 20, 0)
        };
        await context.MaintenanceRequests.AddRangeAsync(mt1, mt2);

        // ============ NOTIFICATIONS ============
        var notif1 = new Notification
        {
            SenderId = landlord1.Id,
            Title = "Thông báo thu tiền nhà tháng 08/2026",
            Content = "Kính gửi quý khách thuê, hệ thống đã phát hành hóa đơn tháng 07/2026. Vui lòng thanh toán trước ngày 05/08/2026.",
            Target = NotificationTarget.AllTenants,
            CreatedAt = new DateTime(2026, 7, 26, 14, 0, 0)
        };
        var notif2 = new Notification
        {
            SenderId = superAdmin.Id,
            Title = "SmartRent 2.0 - Cập nhật tính năng mới",
            Content = "Hệ thống vừa cập nhật tính năng QR VietQR động và xuất PDF hóa đơn.",
            Target = NotificationTarget.AllLandlords,
            CreatedAt = new DateTime(2026, 7, 24, 16, 30, 0)
        };
        await context.Notifications.AddRangeAsync(notif1, notif2);

        // ============ COMPLAINTS ============
        var cmp1 = new Complaint
        {
            SenderId = landlord2.Id,
            Title = "Góp ý thêm tính năng xuất báo cáo Excel nâng cao",
            Content = "Nhờ AD hỗ trợ thêm tùy chọn lọc theo khoảng ngày khi xuất file Excel.",
            Status = ComplaintStatus.Resolved,
            Reply = "Đã cập nhật tính năng xuất Excel trong phiên bản mới!",
            RepliedAt = new DateTime(2026, 7, 22)
        };
        var cmp2 = new Complaint
        {
            SenderId = tenant1User.Id,
            Title = "Đề xuất nâng cấp đường truyền Wi-Fi tầng 1",
            Content = "Mong ban quản trị trao đổi với chủ trọ tăng băng thông mạng vào buổi tối.",
            Status = ComplaintStatus.Pending
        };
        await context.Complaints.AddRangeAsync(cmp1, cmp2);

        await context.SaveChangesAsync();
    }
}
