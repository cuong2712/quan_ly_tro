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

    private static string FormatVnd(decimal amount)
    {
        return string.Format(VnCulture, "{0:N0} đ", amount);
    }
}
