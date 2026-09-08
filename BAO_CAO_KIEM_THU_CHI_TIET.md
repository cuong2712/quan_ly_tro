# 📊 BÁO CÁO KẾT QUẢ KIỂM THỬ HỆ THỐNG SMARTRENT
**Hệ Thống Quản Lý Phòng Trọ & Thu Chi Tự Động Toàn Diện**  
*Thời gian thực hiện kiểm thử: Ngày 08 Tháng 09 Năm 2026*  
*Đơn vị phát triển / Sinh viên thực hiện: Nguyễn Mạnh Cường*

---

## 📌 PHẦN 1: MÔI TRƯỜNG & CHIẾN LƯỢC KIỂM THỬ

### 1.1. Môi trường kiểm thử (Test Environment)
| Thành phần | Công nghệ / Phiên bản | Ghi chú cấu hình |
| :--- | :--- | :--- |
| **Hệ điều hành** | Windows 11 Pro 64-bit | Local Testbed |
| **Backend Runtime** | .NET 9.0 LTS (C# 13) | Kestrel Web Server, cổng `http://localhost:5000` |
| **Cơ sở dữ liệu** | PostgreSQL 15 | Database `Quan_li_phong_tro`, cổng `5432` |
| **Frontend Runtime** | React 19.2 + Vite 8.2 | Single Page App, cổng `http://127.0.0.1:3000` |
| **Unit Test Framework** | Vitest v4.1.10 + JSDOM | Kiểm thử giao diện React & hàm Utility |
| **Automated API Runner**| Node.js v22.14.0 Suite | Tự động quét và xác thực 35 endpoint tích hợp |
| **Tài liệu API Spec** | OpenAPI 3.0 (Swashbuckle 8.1.1)| Swagger UI tương tác tại `/swagger` |

### 1.2. Chiến lược & Phương pháp kiểm thử
1. **Kiểm thử Đơn vị (Unit Testing)**: Kiểm thử tính đúng đắn của các hàm tiện ích xử lý định dạng tiền tệ, ngày tháng, trạng thái phòng trọ và cơ chế bẫy lỗi giao diện `ErrorBoundary`.
2. **Kiểm thử Tích hợp & API (API Integration Testing)**: Sử dụng kịch bản kiểm thử tự động giả lập đầy đủ 3 đối tượng tác tử (**SuperAdmin**, **Chủ trọ**, **Khách thuê**), thực hiện xác thực JWT, gọi API và kiểm tra cấu trúc dữ liệu trả về theo chuẩn `ApiResponse<T>`.
3. **Kiểm thử An ninh & Phân quyền (Security & RBAC Testing)**:
   - Xác thực khi không có JWT Token -> Mong đợi mã `401 Unauthorized`.
   - Xác thực sai mật khẩu đăng nhập -> Mong đợi mã `401 Unauthorized`.
   - Kiểm tra phân quyền chéo (Role-Based Access Control) khi Khách thuê cố tình gọi API Thống kê của SuperAdmin -> Mong đợi mã `403 Forbidden`.
4. **Kiểm thử Chức năng (Functional / Black-box Testing)**: Kiểm thử các luồng nghiệp vụ cốt lõi theo Use Case (Chốt điện nước, thanh toán VietQR, khiếu nại chỉ số, tạo hợp đồng...).

---

## 🧪 PHẦN 2: KẾT QUẢ KIỂM THỬ ĐƠN VỊ (UNIT TESTS)

### 2.1. Kiểm thử Đơn vị Frontend (Vitest - React)
- **Lệnh thực thi**: `npm run test` (tại thư mục `quan-ly-phong-tro`)
- **Bộ kiểm thử**: 2 Test Files
- **Tổng số testcase**: 10 tests
- **Trạng thái**: **10/10 PASS (Tỷ lệ thành công: 100%)**
- **Thời gian thực thi**: 9.71s

| STT | Tập tin kiểm thử | Ca kiểm thử (Test Description) | Kết quả | Thời gian |
| :---: | :--- | :--- | :---: | :---: |
| 1 | `ErrorBoundary.test.jsx` | Hiển thị giao diện fallback khi component con gặp ngoại lệ | ✅ PASS | 234ms |
| 2 | `ErrorBoundary.test.jsx` | Không hiển thị lỗi nếu component con render bình thường | ✅ PASS | 45ms |
| 3 | `ErrorBoundary.test.jsx` | Nút "Thử lại / Tải lại trang" hoạt động chính xác khi gặp sự cố | ✅ PASS | 32ms |
| 4 | `formatters.test.js` | Định dạng tiền tệ VNĐ chuẩn định dạng Việt Nam (`100.000 đ`) | ✅ PASS | 12ms |
| 5 | `formatters.test.js` | Xử lý an toàn khi giá trị tiền tệ null/undefined/số âm | ✅ PASS | 8ms |
| 6 | `formatters.test.js` | Định dạng ngày tháng năm chuẩn `DD/MM/YYYY` | ✅ PASS | 10ms |
| 7 | `formatters.test.js` | Chuyển đổi mã trạng thái phòng (Vacant -> "Còn trống", Occupied -> "Đang thuê") | ✅ PASS | 9ms |
| 8 | `formatters.test.js` | Chuyển đổi mã trạng thái hợp đồng (Active -> "Hiệu lực", ExpiringSoon -> "Sắp hết hạn") | ✅ PASS | 11ms |
| 9 | `formatters.test.js` | Chuyển đổi mã trạng thái hóa đơn (Paid -> "Đã thanh toán", Unpaid -> "Chưa thanh toán") | ✅ PASS | 8ms |
| 10 | `formatters.test.js` | Tạo URL tải ảnh hoặc avatar dự phòng an toàn | ✅ PASS | 11ms |

### 2.2. Kiểm thử Đơn vị Backend (.NET 9 xUnit)
- **Lệnh thực thi**: `dotnet test` (tại thư mục `smartrent-api`)
- **Dự án kiểm thử**: `SmartRent.Tests` (xUnit Framework)
- **Tổng số testcase**: 12 tests
- **Trạng thái**: **12/12 PASS (Tỷ lệ thành công: 100%)**
- **Thời gian thực thi**: 86ms

| STT | Phân lớp kiểm thử | Ca kiểm thử (Test Description) | Kết quả | Thời gian |
| :---: | :--- | :--- | :---: | :---: |
| 1 | `ApiResponseTests` | `ApiResponse.Ok`: Đóng gói thành công mã 200 kèm payload dữ liệu | ✅ PASS | 22ms |
| 2 | `ApiResponseTests` | `ApiResponse.Fail`: Đóng gói lỗi nghiệp vụ mã 400 kèm thông báo | ✅ PASS | 4ms |
| 3 | `ApiResponseTests` | `ApiResponse.Unauthorized`: Trả về mã 401 khi chưa đăng nhập | ✅ PASS | 3ms |
| 4 | `ApiResponseTests` | `ApiResponse.Forbidden`: Trả về mã 403 khi không đủ quyền hạn | ✅ PASS | 3ms |
| 5 | `BillingCalculationTests` | `ElectricityCost`: Tính lũy kế điện tiêu thụ ($SốMới - SốCũ \times ĐơnGiá$) (100 -> 150 kWh) | ✅ PASS | 5ms |
| 6 | `BillingCalculationTests` | `ElectricityCost`: Tính điện tiêu thụ giá bậc cao (200 -> 280 kWh) | ✅ PASS | 2ms |
| 7 | `BillingCalculationTests` | `ElectricityCost`: Xử lý trường hợp không tiêu thụ điện ($0$ kWh) | ✅ PASS | 2ms |
| 8 | `BillingCalculationTests` | `WaterCost`: Tính lũy kế nước tiêu thụ ($20 \to 35$ m³ $\times 25.000$ đ) | ✅ PASS | 3ms |
| 9 | `BillingCalculationTests` | `WaterCost`: Tính tiền nước gia đình tiêu thụ ($10 \to 18$ m³) | ✅ PASS | 2ms |
| 10 | `BillingCalculationTests` | `InvoiceTotalAmount`: Tính tổng tiền hóa đơn đa mục (Phòng + Điện + Nước + Dịch vụ) | ✅ PASS | 4ms |
| 11 | `RoomDomainTests` | `Room_InitialStatus`: Phòng mới khởi tạo mặc định trạng thái `Vacant` (Còn trống) | ✅ PASS | 5ms |
| 12 | `RoomDomainTests` | `Room_WhenDepositBooked`: Cập nhật chính xác số tiền cọc, tên và SĐT người giữ chỗ | ✅ PASS | 4ms |

---

## 🚀 PHẦN 3: KẾT QUẢ KIỂM THỬ TỰ ĐỘNG API ENDPOINTS (35/35 PASS)

- **Công cụ thực thi**: Test Runner Script `test_suite.mjs`
- **Tổng số ca kiểm thử**: 35 Test Cases
- **Số ca kiểm thử đạt**: **35 / 35 PASS (100%)**
- **Số ca kiểm thử lỗi**: **0 FAIL**
- **Thời gian phản hồi trung bình**: **24 ms / request**

### Bảng Kết Quả Ma Trận Kiểm Thử API Chi Tiết:

| Mã TC | Phân hệ | Phương thức | Endpoint API | Quyền (Role) | Kịch bản kiểm thử | Mã HTTP | Kết quả | T/g (ms) |
| :---: | :--- | :---: | :--- | :---: | :--- | :---: | :---: | :---: |
| **TC-01** | Auth | `POST` | `/api/auth/login` | Public | Đăng nhập Admin (`admin@smartrent.vn`) | 200 OK | ✅ PASS | 202ms |
| **TC-02** | Auth | `POST` | `/api/auth/login` | Public | Đăng nhập Chủ trọ (`landlord@smartrent.vn`) | 200 OK | ✅ PASS | 134ms |
| **TC-03** | Auth | `POST` | `/api/auth/login` | Public | Đăng nhập Khách thuê (`tenant1@smartrent.vn`) | 200 OK | ✅ PASS | 137ms |
| **TC-04** | Auth (Security) | `POST` | `/api/auth/login` | Public | Đăng nhập với mật khẩu sai -> Chặn đăng nhập | 401 Unauth | ✅ PASS | 129ms |
| **TC-05** | Auth (Security) | `GET` | `/api/zones` | Anonymous | Truy cập không có Bearer Token -> Chặn truy cập | 401 Unauth | ✅ PASS | 4ms |
| **TC-06** | Auth (RBAC) | `GET` | `/api/admin/stats` | Tenant | Khách thuê gọi API Admin -> Từ chối quyền | 403 Forbid | ✅ PASS | 3ms |
| **TC-07** | Khu trọ | `GET` | `/api/zones` | Landlord | Lấy danh sách toàn bộ khu trọ của chủ trọ | 200 OK | ✅ PASS | 5ms |
| **TC-08** | Phòng trọ | `GET` | `/api/rooms` | Landlord | Lấy danh sách phòng trọ kèm trạng thái | 200 OK | ✅ PASS | 12ms |
| **TC-09** | Phòng trọ | `GET` | `/api/rooms/{id}/detail` | Landlord | Xem chi tiết phòng, khách ở & danh sách thiết bị | 200 OK | ✅ PASS | 17ms |
| **TC-10** | Khách thuê | `GET` | `/api/tenants` | Landlord | Lấy danh sách khách thuê và CCCD/SĐT | 200 OK | ✅ PASS | 13ms |
| **TC-11** | Hợp đồng | `GET` | `/api/contracts` | Landlord | Lấy danh sách hợp đồng thuê nhà của khu trọ | 200 OK | ✅ PASS | 7ms |
| **TC-12** | Hợp đồng | `GET` | `/api/contracts` | Tenant | Khách thuê xem hợp đồng cá nhân | 200 OK | ✅ PASS | 5ms |
| **TC-13** | Hợp đồng | `POST` | `/api/contracts/check-expiring`| Landlord | Quét tự động các hợp đồng sắp hết hạn | 200 OK | ✅ PASS | 9ms |
| **TC-14** | Điện nước | `GET` | `/api/utilities/rate` | Landlord | Lấy bảng đơn giá điện (đ/kWh) và nước (đ/m³) | 200 OK | ✅ PASS | 6ms |
| **TC-15** | Điện nước | `GET` | `/api/utilities` | Landlord | Lấy nhật ký lịch sử ghi chỉ số điện nước | 200 OK | ✅ PASS | 5ms |
| **TC-16** | Dịch vụ | `GET` | `/api/services` | Landlord | Danh mục dịch vụ bổ trợ (Wi-Fi, Xe, Rác...) | 200 OK | ✅ PASS | 5ms |
| **TC-17** | Hóa đơn | `GET` | `/api/invoices` | Landlord | Danh sách hóa đơn tiền phòng toàn khu | 200 OK | ✅ PASS | 9ms |
| **TC-18** | Hóa đơn | `GET` | `/api/invoices` | Tenant | Khách thuê tra cứu hóa đơn tiền nhà cá nhân | 200 OK | ✅ PASS | 8ms |
| **TC-19** | Thanh toán | `GET` | `/api/payments` | Landlord | Danh sách biên lai giao dịch chờ duyệt | 200 OK | ✅ PASS | 7ms |
| **TC-20** | Thanh toán | `GET` | `/api/payments` | Tenant | Lịch sử nộp tiền phòng của khách thuê | 200 OK | ✅ PASS | 5ms |
| **TC-21** | Bảo trì | `GET` | `/api/maintenance` | Landlord | Quản lý danh sách sự cố hỏng hóc phòng trọ | 200 OK | ✅ PASS | 13ms |
| **TC-22** | Bảo trì | `GET` | `/api/maintenance` | Tenant | Khách thuê xem trạng thái phiếu sửa chữa đã gửi | 200 OK | ✅ PASS | 5ms |
| **TC-23** | Thông báo | `GET` | `/api/notifications` | Landlord | Danh sách thông báo hệ thống của Chủ trọ | 200 OK | ✅ PASS | 4ms |
| **TC-24** | Thông báo | `GET` | `/api/notifications` | Tenant | Danh sách thông báo gửi tới Khách thuê | 200 OK | ✅ PASS | 6ms |
| **TC-25** | Báo cáo | `GET` | `/api/reports/financial` | Landlord | Tổng hợp doanh thu, nợ đọng, chi phí | 200 OK | ✅ PASS | 8ms |
| **TC-26** | Báo cáo | `GET` | `/api/reports/financial/export` | Landlord | Xuất dữ liệu tài chính ra tệp CSV/Excel | 200 OK | ✅ PASS | 6ms |
| **TC-27** | Dashboard | `GET` | `/api/dashboard/landlord` | Landlord | Chỉ số KPI tổng quan (tỷ lệ lấp đầy, doanh thu)| 200 OK | ✅ PASS | 11ms |
| **TC-28** | Dashboard | `GET` | `/api/dashboard/tenant` | Tenant | Thông tin tổng quan phòng đang ở & nợ đọng | 200 OK | ✅ PASS | 15ms |
| **TC-29** | Hồ sơ | `GET` | `/api/profile` | Landlord | Xem hồ sơ chủ trọ & tài khoản nhận VietQR | 200 OK | ✅ PASS | 4ms |
| **TC-30** | Hồ sơ | `GET` | `/api/profile/vehicle` | Tenant | Tra cứu biển số xe và thông tin gửi xe | 200 OK | ✅ PASS | 3ms |
| **TC-31** | SuperAdmin | `GET` | `/api/admin/stats` | SuperAdmin | Thống kê toàn cảnh vĩ mô nền tảng | 200 OK | ✅ PASS | 9ms |
| **TC-32** | SuperAdmin | `GET` | `/api/admin/landlords` | SuperAdmin | Quản trị danh sách tài khoản Chủ trọ toàn sàn | 200 OK | ✅ PASS | 17ms |
| **TC-33** | SuperAdmin | `GET` | `/api/admin/tenants` | SuperAdmin | Quản lý người dùng khách thuê toàn sàn | 200 OK | ✅ PASS | 9ms |
| **TC-34** | SuperAdmin | `GET` | `/api/admin/complaints` | SuperAdmin | Tiếp nhận & phản hồi khiếu nại tới BQT sàn | 200 OK | ✅ PASS | 4ms |
| **TC-35** | Swagger Spec | `GET` | `/swagger/v1/swagger.json` | Public | Tự động phát sinh đặc tả OpenAPI (78 APIs) | 200 OK | ✅ PASS | 19ms |

---

## 🎯 PHẦN 4: ĐẶC TẢ CÁC CA KIỂM THỬ CHỨC NĂNG NGHIỆP VỤ (FUNCTIONAL USE CASE TESTS)

### Ca 1: Chốt điện nước hàng loạt & Tự động phát hành hóa đơn (UC-01)
- **Mã kịch bản**: `FTC-01`
- **Tác tử**: Chủ trọ (`landlord@smartrent.vn`)
- **Các bước thực hiện**:
  1. Đăng nhập vào cổng Chủ trọ, chọn tab "Điện nước".
  2. Chọn Khu trọ và Kỳ tháng phát hành.
  3. Nhập số điện mới: `125 kWh` (chỉ số cũ: `100 kWh` -> Tiêu thụ `25 kWh`).
  4. Nhập số nước mới: `35 m³` (chỉ số cũ: `30 m³` -> Tiêu thụ `5 m³`).
  5. Bấm "Xác nhận chốt điện nước & phát hành hóa đơn".
- **Dữ liệu mong đợi**:
  - Tiền điện = $25 \times 3.500 = 87.500$ đ.
  - Tiền nước = $5 \times 25.000 = 125.000$ đ.
  - Tổng hóa đơn = Tiền phòng + Tiền điện + Tiền nước + Dịch vụ cố định.
  - Hóa đơn chuyển trạng thái `Unpaid`.
  - SignalR phát thông báo Realtime tới phòng khách thuê.
- **Kết quả thực tế**: Hệ thống lưu vào cơ sở dữ liệu chính xác, bảng Invoices và UtilityLogs được cập nhật đồng thời trong Database Transaction. Khách thuê nhận thông báo toast ngay lập tức.
- **Đánh giá**: ✅ **ĐẠT (PASS)**.

### Ca 2: Thanh toán hóa đơn qua VietQR & Xác nhận duyệt tiền (UC-02)
- **Mã kịch bản**: `FTC-02`
- **Tác tử**: Khách thuê & Chủ trọ
- **Các bước thực hiện**:
  1. Khách thuê mở mục "Hóa đơn cá nhân", chọn hóa đơn `Unpaid`.
  2. Bấm "Thanh toán VietQR".
  3. Hệ thống tạo mã QR động chứa số tài khoản chủ trọ, tên ngân hàng và số tiền chính xác kèm nội dung chuyển khoản.
  4. Khách thuê upload ảnh chụp biên lai giao dịch thành công.
  5. Chủ trọ mở tab "Thanh toán", xem ảnh biên lai và bấm "Xác nhận duyệt tiền".
- **Dữ liệu mong đợi**:
  - Giao dịch chuyển sang `Completed`.
  - Hóa đơn chuyển sang `Paid`.
  - Công nợ của phòng khách thuê giảm về 0 đ.
- **Kết quả thực tế**: Trạng thái hóa đơn và thanh toán được cập nhật đồng bộ, SignalR tự động cập nhật giao diện mà không cần F5 trang.
- **Đánh giá**: ✅ **ĐẠT (PASS)**.

### Ca 3: Khách thuê khiếu nại sai lệch chỉ số hóa đơn (UC-03)
- **Mã kịch bản**: `FTC-03`
- **Tác tử**: Khách thuê & Chủ trọ
- **Các bước thực hiện**:
  1. Khách thuê phát hiện số điện ghi sai trên hóa đơn, bấm "Báo sai sót hóa đơn".
  2. Nhập số điện thực tế trên công tơ, đính kèm ảnh minh chứng đồng hồ.
  3. Hóa đơn được đánh dấu `IsReported = true`.
  4. Chủ trọ kiểm tra ảnh và tiến hành điều chỉnh lại hóa đơn hoặc từ chối kèm lý do.
- **Kết quả thực tế**: Dữ liệu khiếu nại được ghi nhận chính xác, trường `DisputeReason` và `DisputeProofUrl` lưu đầy đủ, hỗ trợ giải quyết minh bạch giữa hai bên.
- **Đánh giá**: ✅ **ĐẠT (PASS)**.

---

## 📸 PHẦN 5: MINH CHỨNG TRUY CẬP HỆ THỐNG & TÀI LIỆU KIỂM THỬ

Hệ thống đang hoạt động ổn định và sẵn sàng cung cấp các minh chứng kiểm thử:
1. **Giao diện Swagger UI (78 Endpoints đầy đủ đặc tả OpenAPI 3.0)**:
   - URL: `http://localhost:5000/swagger`
   - Cung cấp đầy đủ Schema DTO, Request/Response mẫu, cho phép gửi request trực tiếp trên trình duyệt.
2. **Giao diện Web Ứng Dụng (React 19 + Vite)**:
   - URL: `http://127.0.0.1:3000/`
   - Đăng nhập thử nghiệm:
     * Quản trị viên sàn: `admin@smartrent.vn` / `Admin@123456`
     * Chủ trọ: `landlord@smartrent.vn` / `Landlord@123456`
     * Khách thuê: `tenant1@smartrent.vn` / `Tenant@123456`
3. **Tệp sao lưu dữ liệu kiểm thử**:
   - `test_suite.mjs`: Script chạy kiểm thử tự động toàn bộ 35 API test cases.
   - `test_results.json`: Tệp lưu trữ chi tiết toàn bộ dữ liệu phản hồi, mã trạng thái và thời gian thực thi (ms) của từng endpoint.

---

## 🏆 KẾT LUẬN

Qua quá trình kiểm thử toàn diện trên cả tầng Frontend và Backend:
- **10/10** ca kiểm thử Đơn vị giao diện (Vitest) **ĐẠT (100%)**.
- **35/35** ca kiểm thử Tích hợp API và Phân quyền **ĐẠT (100%)**.
- Độ trễ phản hồi API trung bình đạt mức lý tưởng: **24ms**.
- Hệ thống xử lý hoàn hảo cả trường hợp hợp lệ (Positive Test) và trường hợp an ninh, sai mật khẩu, truy cập trái phép (Negative & RBAC Test).
- Toàn bộ kết quả và bảng biểu trên đáp ứng hoàn toàn yêu cầu học thuật để đưa vào **Chương Kiểm Thử Hệ Thống** trong đồ án / báo cáo tốt nghiệp.

