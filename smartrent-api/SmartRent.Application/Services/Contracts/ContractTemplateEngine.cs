using System;
using System.Collections.Generic;
using System.Globalization;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;

namespace SmartRent.Application.Services.Contracts;

// Động cơ xử lý Mẫu Hợp Đồng Động (Template Engine) với hệ thống Thẻ Biến Số (Placeholders)
public static class ContractTemplateEngine
{
    private static readonly CultureInfo VnCulture = new("vi-VN");

    public static readonly List<TemplateVariableHelpDto> Variables =
    [
        new("{{MA_HOP_DONG}}", "Mã hợp đồng thuê nhà", "HD-202609-P101"),
        new("{{NGAY_KY}}", "Ngày tạo / ký hợp đồng", "28/08/2026"),
        new("{{TEN_CHU_TRO}}", "Họ và tên Bên Cho Thuê (Chủ nhà / Đại diện)", "Phan Quốc Khải"),
        new("{{SDT_CHU_TRO}}", "Số điện thoại của Chủ nhà", "0987654321"),
        new("{{CCCD_CHU_TRO}}", "Số CCCD/CMND của Chủ nhà", "079201012345"),
        new("{{STK_CHU_TRO}}", "Số tài khoản ngân hàng nhận tiền nhà", "0987654321"),
        new("{{NGAN_HANG_CHU_TRO}}", "Tên ngân hàng nhận tiền nhà", "TPBank"),
        new("{{TEN_KHACH}}", "Họ và tên Bên Thuê (Người đại diện phòng)", "Nguyễn Minh Tuấn"),
        new("{{SDT_KHACH}}", "Số điện thoại của Khách thuê", "0912345678"),
        new("{{CCCD_KHACH}}", "Số CCCD/CMND của Khách thuê", "079202008899"),
        new("{{SO_PHONG}}", "Số phòng thuê", "202"),
        new("{{TEN_KHU_TRO}}", "Tên khu trọ / Tòa nhà", "Khu gần Gigamall"),
        new("{{DIA_CHI_KHU_TRO}}", "Địa chỉ chi tiết của khu trọ", "240 Phạm Văn Đồng, P. Hiệp Bình Chánh, TP. Thủ Đức"),
        new("{{DIEN_TICH}}", "Diện tích phòng thuê (m²)", "28 m²"),
        new("{{GIA_THUE}}", "Tiền thuê phòng hàng tháng (VNĐ)", "4.000.000 đ"),
        new("{{TIEN_COC}}", "Tiền đặt cọc bảo đảm hợp đồng (VNĐ)", "4.000.000 đ"),
        new("{{NGAY_BAT_DAU}}", "Ngày bắt đầu hợp đồng thuê", "01/09/2026"),
        new("{{NGAY_KET_THUC}}", "Ngày hết hạn hợp đồng thuê", "01/09/2027"),
        new("{{THOI_HAN_THUE}}", "Thời hạn thuê (số tháng)", "12 tháng"),
        new("{{NGAY_DONG_TIEN}}", "Hạn đóng tiền nhà định kỳ hàng tháng", "Ngày 05 hàng tháng"),
        new("{{GIA_DIEN}}", "Đơn giá điện sinh hoạt", "3.500 đ/kWh"),
        new("{{GIA_NUOC}}", "Đơn giá nước sinh hoạt", "18.000 đ/m³"),
        new("{{CHI_SO_DIEN_BAN_DAU}}", "Chỉ số đồng hồ điện bàn giao ban đầu", "120 kWh"),
        new("{{CHI_SO_NUOC_BAN_DAU}}", "Chỉ số đồng hồ nước bàn giao ban đầu", "45 m³"),
        new("{{DIEU_KHOAN_RIENG}}", "Các điều khoản và nội quy riêng do chủ trọ quy định", "Giữ gìn vệ sinh chung, không gây ồn sau 22h")
    ];

    // Mẫu Hợp Đồng Chuẩn Bộ Xây Dựng & Luật Nhà Ở Việt Nam
    public static string GetDefaultTemplate()
    {
        return @"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
------------------------

HỢP ĐỒNG THUÊ PHÒNG TRỌ / NHÀ Ở
Mã hợp đồng: {{MA_HOP_DONG}}
Ngày lập: {{NGAY_KY}}

Hôm nay, ngày {{NGAY_KY}}, tại địa chỉ: {{DIA_CHI_KHU_TRO}}
Chúng tôi gồm có:

BÊN CHO THUÊ (BÊN A):
- Họ và tên: {{TEN_CHU_TRO}}
- Số điện thoại: {{SDT_CHU_TRO}}
- Số CCCD/CMND: {{CCCD_CHU_TRO}}
- Tài khoản thanh toán: {{STK_CHU_TRO}} - Ngân hàng: {{NGAN_HANG_CHU_TRO}}

BÊN THUÊ (BÊN B):
- Họ và tên: {{TEN_KHACH}}
- Số điện thoại: {{SDT_KHACH}}
- Số CCCD/CMND: {{CCCD_KHACH}}

Hai bên cùng thỏa thuận và thống nhất ký kết Hợp đồng thuê phòng với các điều khoản chi tiết như sau:

ĐIỀU 1: ĐỐI TƯỢNG VÀ THỜI HẠN THUÊ
1.1. Bên A đồng ý cho Bên B thuê phòng số: P.{{SO_PHONG}} thuộc Tòa nhà/Khu trọ: {{TEN_KHU_TRO}} tại địa chỉ: {{DIA_CHI_KHU_TRO}}.
1.2. Diện tích sử dụng: {{DIEN_TICH}}.
1.3. Thời hạn thuê là {{THOI_HAN_THUE}}, bắt đầu từ ngày {{NGAY_BAT_DAU}} đến hết ngày {{NGAY_KET_THUC}}.

ĐIỀU 2: GIÁ THUÊ, TIỀN CỌC VÀ PHƯƠNG THỨC THANH TOÁN
2.1. Giá tiền thuê phòng: {{GIA_THUE}} / tháng.
2.2. Tiền đặt cọc bảo đảm: {{TIEN_COC}} (Khoản tiền này sẽ được hoàn trả cho Bên B sau khi thanh lý hợp đồng và trừ các chi phí hư hỏng nếu có).
2.3. Chi phí dịch vụ & điện nước:
  - Tiền điện: {{GIA_DIEN}} (Chỉ số điện bàn giao: {{CHI_SO_DIEN_BAN_DAU}}).
  - Tiền nước: {{GIA_NUOC}} (Chỉ số nước bàn giao: {{CHI_SO_NUOC_BAN_DAU}}).
2.4. Thời hạn thanh toán: Bên B có nghĩa vụ thanh toán đầy đủ tiền thuê và phí dịch vụ trước {{NGAY_DONG_TIEN}}. Hình thức thanh toán qua chuyển khoản VietQR hoặc tiền mặt.

ĐIỀU 3: TRÁCH NHIỆM VÀ NGHĨA VỤ CỦA BÊN A
3.1. Bàn giao phòng và trang thiết bị đầy đủ, đúng hiện trạng cho Bên B vào ngày bắt đầu hợp đồng.
3.2. Bảo đảm quyền sử dụng phòng trọn vẹn và an ninh trật tự trong khu trọ cho Bên B.
3.3. Hỗ trợ đăng ký tạm trú theo quy định pháp luật và khắc phục kịp thời các sự cố hư hỏng kết cấu nhà không do lỗi Bên B.

ĐIỀU 4: TRÁCH NHIỆM VÀ NGHĨA VỤ CỦA BÊN B
4.1. Sử dụng phòng đúng mục đích để ở, không thực hiện các hành vi vi phạm pháp luật, tàng trữ chất cấm, cờ bạc, cháy nổ.
4.2. Thanh toán đầy đủ và đúng hạn tiền thuê phòng và các khoản phí dịch vụ theo thông báo hóa đơn hàng tháng.
4.3. Giữ gìn vệ sinh chung, bảo quản tài sản trang thiết bị, không tự ý sửa chữa khoan đục tường khi chưa có sự đồng ý của Bên A.
4.4. Chấp hành các quy định về an toàn phòng cháy chữa cháy và trật tự an ninh khu phố.

ĐIỀU 5: ĐIỀU KHOẢN VÀ NỘI QUY BỔ SUNG CỦA KHU TRỌ
{{DIEU_KHOAN_RIENG}}

ĐIỀU 6: ĐIỀU KHOẢN CHUNG & HIỆU LỰC
6.1. Hai bên cam kết thực hiện đúng các điều khoản đã thỏa thuận trong hợp đồng này.
6.2. Hợp đồng có hiệu lực kể từ ngày ký. Hợp đồng được lập thành 02 bản điện tử có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để thực hiện.

           ĐẠI DIỆN BÊN A                               ĐẠI DIỆN BÊN B
          (Ký & ghi rõ họ tên)                         (Ký & ghi rõ họ tên)
          
          {{TEN_CHU_TRO}}                              {{TEN_KHACH}}
";
    }

    // Thay thế toàn bộ các biến số trong Mẫu hợp đồng bằng dữ liệu thực tế
    public static string Render(string? template, Contract contract, Room? room, User? landlord, TenantProfile? tenant, UtilityRate? rate = null)
    {
        var rawTemplate = string.IsNullOrWhiteSpace(template) ? GetDefaultTemplate() : template;

        int months = 12;
        if (contract.EndDate > contract.StartDate)
        {
            months = Math.Max(1, (int)Math.Round((contract.EndDate - contract.StartDate).TotalDays / 30.0));
        }

        var replacements = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["{{MA_HOP_DONG}}"] = contract.ContractCode ?? "HD-" + contract.Id.ToString()[..8].ToUpper(),
            ["{{NGAY_KY}}"] = contract.CreatedAt.ToString("dd/MM/yyyy", VnCulture),
            ["{{TEN_CHU_TRO}}"] = landlord?.FullName ?? "Chủ trọ",
            ["{{SDT_CHU_TRO}}"] = landlord?.Phone ?? "—",
            ["{{CCCD_CHU_TRO}}"] = "Đã xác thực",
            ["{{STK_CHU_TRO}}"] = landlord?.BankAccountNumber ?? "Chưa cập nhật",
            ["{{NGAN_HANG_CHU_TRO}}"] = landlord?.BankName ?? "BIDV",
            ["{{TEN_KHACH}}"] = tenant?.User?.FullName ?? "Khách thuê",
            ["{{SDT_KHACH}}"] = tenant?.User?.Phone ?? "—",
            ["{{CCCD_KHACH}}"] = tenant?.CCCD ?? "Đã xác thực",
            ["{{SO_PHONG}}"] = room?.RoomNumber ?? "—",
            ["{{TEN_KHU_TRO}}"] = room?.Zone?.Name ?? "Khu trọ",
            ["{{DIA_CHI_KHU_TRO}}"] = room?.Zone?.Address ?? "—",
            ["{{DIEN_TICH}}"] = room != null ? $"{room.Area:N0} m²" : "25 m²",
            ["{{GIA_THUE}}"] = FormatVnd(contract.RentAmount),
            ["{{TIEN_COC}}"] = FormatVnd(contract.Deposit),
            ["{{NGAY_BAT_DAU}}"] = contract.StartDate.ToString("dd/MM/yyyy", VnCulture),
            ["{{NGAY_KET_THUC}}"] = contract.EndDate.ToString("dd/MM/yyyy", VnCulture),
            ["{{THOI_HAN_THUE}}"] = $"{months} tháng",
            ["{{NGAY_DONG_TIEN}}"] = $"Ngày {contract.PaymentTermDay:D2} hàng tháng",
            ["{{GIA_DIEN}}"] = rate != null ? $"{FormatVnd(rate.ElecPrice)}/kWh" : "3.500 đ/kWh",
            ["{{GIA_NUOC}}"] = rate != null ? $"{FormatVnd(rate.WaterPrice)}/m³" : "18.000 đ/m³",
            ["{{CHI_SO_DIEN_BAN_DAU}}"] = room != null ? $"{room.ElecMeter:N0} kWh" : "0 kWh",
            ["{{CHI_SO_NUOC_BAN_DAU}}"] = room != null ? $"{room.WaterMeter:N0} m³" : "0 m³",
            ["{{DIEU_KHOAN_RIENG}}"] = !string.IsNullOrWhiteSpace(contract.Terms) ? contract.Terms : "Bên B chấp hành đúng nội quy tòa nhà, giữ gìn trật tự và vệ sinh chung."
        };

        var result = rawTemplate;
        foreach (var (key, value) in replacements)
        {
            result = result.Replace(key, value, StringComparison.OrdinalIgnoreCase);
        }

        return result;
    }

    // Mẫu Phụ Lục Hợp Đồng Ở Ghép / Cam Kết Cư Trú
    public static string GetDefaultCoTenantTemplate()
    {
        return @"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
------------------------

PHỤ LỤC HỢP ĐỒNG THUÊ NHÀ / CAM KẾT CƯ TRÚ Ở GHÉP
Mã phụ lục: {{MA_HOP_DONG}}
Ngày lập: {{NGAY_KY}}

Căn cứ Hợp đồng thuê nhà chính số: {{MA_HOP_DONG_CHINH}}
Đứng tên Người đại diện phòng: {{TEN_DAI_DIEN_PHONG}} (SĐT: {{SDT_DAI_DIEN_PHONG}})

Hôm nay, ngày {{NGAY_KY}}, tại địa chỉ: {{DIA_CHI_KHU_TRO}}
Chúng tôi gồm có:

BÊN CHO THUÊ (BÊN A):
- Họ và tên: {{TEN_CHU_TRO}}
- Số điện thoại: {{SDT_CHU_TRO}}
- Số CCCD/CMND: {{CCCD_CHU_TRO}}
- Tài khoản nhận tiền: {{STK_CHU_TRO}} - Ngân hàng: {{NGAN_HANG_CHU_TRO}}

BÊN Ở GHÉP (BÊN B):
- Họ và tên: {{TEN_KHACH}}
- Số điện thoại: {{SDT_KHACH}}
- Số CCCD/CMND: {{CCCD_KHACH}}
- Quê quán: {{QUE_QUAN_KHACH}}
- Thông tin phương tiện: {{PHUONG_TIEN_KHACH}}

Hai bên thống nhất ký kết Phụ lục hợp đồng cư trú ở ghép với các điều khoản sau:

ĐIỀU 1: PHÒNG THUÊ VÀ THỜI HẠN CƯ TRÚ
1.1. Bên B được chấp thuận cư trú và sinh hoạt tại Phòng số: P.{{SO_PHONG}}, thuộc Tòa nhà/Khu trọ: {{TEN_KHU_TRO}}, địa chỉ: {{DIA_CHI_KHU_TRO}}.
1.2. Bên B cư trú cùng người đại diện phòng ({{TEN_DAI_DIEN_PHONG}}) theo Hợp đồng chính số {{MA_HOP_DONG_CHINH}}.
1.3. Thời hạn cư trú: Từ ngày {{NGAY_BAT_DAU}} đến hết ngày {{NGAY_KET_THUC}}.

ĐIỀU 2: TÀI CHÍNH, ĐẶT CỌC & CHI PHÍ SINH HOẠT
2.1. Tiền đặt cọc cá nhân: {{TIEN_COC_RIENG}} (Khoản cọc này do Bên B nộp để bảo đảm thực hiện nội quy và trách nhiệm tài sản, hoàn trả khi thanh lý hợp đồng hợp lệ).
2.2. Trách nhiệm đóng tiền phòng thỏa thuận: {{TIEN_PHONG_CHIA_SE}} / tháng (Tổng giá thuê cả phòng: {{GIA_THUE}} / tháng).
2.3. Chi phí dịch vụ & điện nước:
  - Giá điện sinh hoạt: {{GIA_DIEN}}
  - Giá nước sinh hoạt: {{GIA_NUOC}}
  - Bên B có trách nhiệm chia sẻ chi phí điện, nước và dịch vụ cùng các thành viên trong phòng theo thỏa thuận nội bộ phòng hoặc bình quân đầu người.

ĐIỀU 3: QUY ĐỊNH NỘI QUY, AN NINH & PCCC
3.1. Bên B có nghĩa vụ cung cấp đầy đủ thông tin định danh (CCCD 2 mặt) để Bên A làm thủ tục đăng ký tạm trú với cơ quan Công an có thẩm quyền.
3.2. Chấp hành nghiêm chỉnh nội quy khu trọ, bảo đảm trật tự trị an, không gây mất trật tự sau 22h00.
3.3. Tuyệt đối tuân thủ quy định Phòng cháy chữa cháy (PCCC): không sạc xe điện qua đêm tại nơi không được phép, không sử dụng thiết bị sinh nhiệt nguy hiểm, tắt thiết bị điện khi ra khỏi phòng.
3.4. Không tàng trữ, sử dụng chất cấm, cờ bạc, hung khí; không dẫn người lạ vào ngủ qua đêm khi chưa có sự đồng ý của Bên A và các bạn cùng phòng.
3.5. Có trách nhiệm bảo vệ và sử dụng đúng cách các trang thiết bị chung của phòng và khu trọ. Trường hợp làm hư hại tài sản chung, Bên B liên đới bồi thường thiệt hại.

ĐIỀU 4: CHẤM DỨT VÀ RỜI KHỎI PHÒNG
4.1. Khi có nguyện vọng chuyển đi trước hoặc khi hết hạn hợp đồng, Bên B cần thông báo trước cho Bên A tối thiểu 30 ngày.
4.2. Bên A tiến hành kiểm tra tài sản phòng, bàn giao và quyết toán khoản tiền cọc riêng của Bên B theo quy định.

ĐIỀU 5: ĐIỀU KHOẢN RIÊNG BỔ SUNG
{{DIEU_KHOAN_RIENG}}

ĐIỀU 6: HIỆU LỰC CAM KẾT
Phụ lục này có giá trị pháp lý gắn liền với Hợp đồng thuê phòng số {{MA_HOP_DONG_CHINH}}. Hai bên cam kết thực hiện đúng nội dung đã ký kết.

           ĐẠI DIỆN BÊN A                               BÊN Ở GHÉP (BÊN B)
          (Ký & ghi rõ họ tên)                         (Ký xác nhận online / chữ ký)
          
          {{TEN_CHU_TRO}}                              {{TEN_KHACH}}
";
    }

    // Render Phụ lục hợp đồng ở ghép
    public static string RenderCoTenantTemplate(Contract contract, Room? room, User? landlord, TenantProfile? tenant, Contract? parentContract, UtilityRate? rate = null)
    {
        var rawTemplate = GetDefaultCoTenantTemplate();

        int months = 12;
        if (contract.EndDate > contract.StartDate)
        {
            months = Math.Max(1, (int)Math.Round((contract.EndDate - contract.StartDate).TotalDays / 30.0));
        }

        var sharedRent = contract.SharedRentAmount > 0 ? FormatVnd(contract.SharedRentAmount) : "Thỏa thuận nội bộ phòng";
        var indivDeposit = contract.IndividualDeposit > 0 ? FormatVnd(contract.IndividualDeposit) : "0 đ (đã tính theo HĐ chính)";

        var replacements = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["{{MA_HOP_DONG}}"] = contract.ContractCode ?? "OG-" + contract.Id.ToString()[..8].ToUpper(),
            ["{{MA_HOP_DONG_CHINH}}"] = parentContract?.ContractCode ?? "HD-MASTER",
            ["{{TEN_DAI_DIEN_PHONG}}"] = parentContract?.TenantProfile?.User?.FullName ?? "Đại diện phòng",
            ["{{SDT_DAI_DIEN_PHONG}}"] = parentContract?.TenantProfile?.User?.Phone ?? "—",
            ["{{NGAY_KY}}"] = contract.CreatedAt.ToString("dd/MM/yyyy", VnCulture),
            ["{{TEN_CHU_TRO}}"] = landlord?.FullName ?? "Chủ trọ",
            ["{{SDT_CHU_TRO}}"] = landlord?.Phone ?? "—",
            ["{{CCCD_CHU_TRO}}"] = "Đã xác thực",
            ["{{STK_CHU_TRO}}"] = landlord?.BankAccountNumber ?? "Chưa cập nhật",
            ["{{NGAN_HANG_CHU_TRO}}"] = landlord?.BankName ?? "BIDV",
            ["{{TEN_KHACH}}"] = tenant?.User?.FullName ?? "Thành viên ở ghép",
            ["{{SDT_KHACH}}"] = tenant?.User?.Phone ?? "—",
            ["{{CCCD_KHACH}}"] = tenant?.CCCD ?? "Đã xác thực",
            ["{{QUE_QUAN_KHACH}}"] = tenant?.Hometown ?? "Chưa cập nhật",
            ["{{PHUONG_TIEN_KHACH}}"] = !string.IsNullOrWhiteSpace(tenant?.VehicleInfo) ? $"{tenant.VehicleCount} xe ({tenant.VehicleInfo})" : (tenant?.VehicleCount > 0 ? $"{tenant.VehicleCount} xe máy" : "Không có xe máy"),
            ["{{SO_PHONG}}"] = room?.RoomNumber ?? "—",
            ["{{TEN_KHU_TRO}}"] = room?.Zone?.Name ?? "Khu trọ",
            ["{{DIA_CHI_KHU_TRO}}"] = room?.Zone?.Address ?? "—",
            ["{{GIA_THUE}}"] = FormatVnd(contract.RentAmount),
            ["{{TIEN_COC_RIENG}}"] = indivDeposit,
            ["{{TIEN_PHONG_CHIA_SE}}"] = sharedRent,
            ["{{NGAY_BAT_DAU}}"] = contract.StartDate.ToString("dd/MM/yyyy", VnCulture),
            ["{{NGAY_KET_THUC}}"] = contract.EndDate.ToString("dd/MM/yyyy", VnCulture),
            ["{{THOI_HAN_THUE}}"] = $"{months} tháng",
            ["{{GIA_DIEN}}"] = rate != null ? $"{FormatVnd(rate.ElecPrice)}/kWh" : "3.500 đ/kWh",
            ["{{GIA_NUOC}}"] = rate != null ? $"{FormatVnd(rate.WaterPrice)}/m³" : "18.000 đ/m³",
            ["{{DIEU_KHOAN_RIENG}}"] = !string.IsNullOrWhiteSpace(contract.Terms) ? contract.Terms : "Thành viên chấp hành nghiêm nội quy phòng trọ, bảo quản tài sản chung và giữ gìn nếp sống văn minh."
        };

        var result = rawTemplate;
        foreach (var (key, value) in replacements)
        {
            result = result.Replace(key, value, StringComparison.OrdinalIgnoreCase);
        }

        return result;
    }

    private static string FormatVnd(decimal amount)
    {
        return string.Format(VnCulture, "{0:N0} đ", amount);
    }
}

