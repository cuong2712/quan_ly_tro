# 📄 BÁO CÁO THIẾT KẾ HỆ THỐNG QUẢN LÝ PHÒNG TRỌ (SMARTRENT)

---

## 📌 CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI & CÔNG NGHỆ

### 1.1. Giới thiệu đề tài
**SmartRent** là nền tảng quản lý nhà trọ và căn hộ dịch vụ cao cấp, giải quyết bài toán quản lý phân tán giữa Chủ trọ và Khách thuê. Hệ thống tự động hóa toàn bộ các khâu từ ký hợp đồng, ghi nhận chỉ số điện nước, tính toán hóa đơn, thanh toán tự động qua mã VietQR chuẩn NAPAS247, xử lý khiếu nại và phản ánh sự cố kỹ thuật theo thời gian thực (Realtime WebSocket).

### 1.2. Công nghệ sử dụng
- **Backend**: .NET 9 Web API, Clean Architecture (Domain, Application, Infrastructure, Presentation).
- **ORM & Database**: Entity Framework Core 9.0 + PostgreSQL.
- **Realtime**: ASP.NET Core SignalR (WebSockets & LongPolling).
- **Frontend**: React 18, Vite, Lucide Icons, jsPDF & Excel Export.
- **Bảo mật**: JWT Access/Refresh Token, BCrypt Password Hashing, Role-based Authorization.

---

## 🎯 CHƯƠNG 2: SƠ ĐỒ USE CASE & ĐẶC TẢ CHỨC NĂNG

### 2.1. Sơ đồ Use Case Tổng Thể Hệ Thống

```mermaid
graph LR
    %% Actors
    Admin(["👑 SuperAdmin"])
    Landlord(["🏢 Chủ Trọ"])
    Tenant(["👤 Khách Thuê"])

    %% Subsystems
    subgraph Auth_Module ["🔐 Phân Hệ Xác Thực"]
        UC_Login["Đăng nhập hệ thống"]
        UC_Logout["Đăng xuất"]
        UC_ChangePass["Đổi mật khẩu"]
    end

    subgraph SuperAdmin_Module ["👑 Phân Hệ Quản Trị Sàn"]
        UC_SA_Stats["Xem thống kê doanh thu sàn"]
        UC_SA_Landlord["Quản lý tài khoản Chủ trọ (Khóa/Mở)"]
        UC_SA_Tenant["Quản lý tài khoản Khách thuê"]
        UC_SA_Complaint["Tiếp nhận & Trả lời khiếu nại"]
        UC_SA_Notify["Phát thông báo toàn hệ thống"]
    end

    subgraph Landlord_Module ["🏢 Phân Hệ Chủ Trọ"]
        UC_LL_Zone["Quản lý Khu trọ & Phòng"]
        UC_LL_Equip["Quản lý Thiết bị/Nội thất phòng"]
        UC_LL_Occupant["Quản lý Thành viên ở ghép"]
        UC_LL_Deposit["Đặt cọc giữ chỗ & Hủy cọc"]
        UC_LL_Contract["Lập & Quản lý Hợp đồng"]
        UC_LL_CustomTemplate["Cấu hình Mẫu HĐ Tùy Biến (Dynamic Template)"]
        UC_LL_Transfer["Chuyển quyền đại diện hợp đồng"]
        UC_LL_Settle["Thanh lý & Quyết toán cọc"]
        UC_LL_Utility["Ghi điện nước & Chốt hàng loạt"]
        UC_LL_Invoice["Lập hóa đơn & Xuất PDF/Excel"]
        UC_LL_Dispute["Xử lý khiếu nại chỉ số hóa đơn"]
        UC_LL_Payment["Xem minh chứng & Duyệt VietQR"]
        UC_LL_Maint["Quản lý bảo trì & Phân công thợ"]
        UC_LL_Report["Báo cáo tài chính & Xuất Excel"]
    end

    subgraph Tenant_Module ["👤 Phân Hệ Khách Thuê"]
        UC_TN_Dash["Xem thông tin phòng & Công nợ"]
        UC_TN_Contract["Xem hợp đồng & Yêu cầu gia hạn"]
        UC_TN_Invoice["Tra cứu hóa đơn & Xuất PDF"]
        UC_TN_ReportInv["Báo sai lệch chỉ số / Khiếu nại HĐ"]
        UC_TN_PayQR["Quét VietQR & Gửi biên lai chuyển khoản"]
        UC_TN_Maint["Gửi báo hỏng sự cố kèm ảnh"]
        UC_TN_Profile["Cập nhật CCCD 2 mặt & Biển số xe"]
    end

    %% Actor Relationships
    Admin --> UC_Login
    Admin --> UC_Logout
    Admin --> UC_SA_Stats
    Admin --> UC_SA_Landlord
    Admin --> UC_SA_Tenant
    Admin --> UC_SA_Complaint
    Admin --> UC_SA_Notify

    Landlord --> UC_Login
    Landlord --> UC_Logout
    Landlord --> UC_ChangePass
    Landlord --> UC_LL_Zone
    Landlord --> UC_LL_Equip
    Landlord --> UC_LL_Occupant
    Landlord --> UC_LL_Deposit
    Landlord --> UC_LL_Contract
    Landlord --> UC_LL_Transfer
    Landlord --> UC_LL_Settle
    Landlord --> UC_LL_Utility
    Landlord --> UC_LL_Invoice
    Landlord --> UC_LL_Dispute
    Landlord --> UC_LL_Payment
    Landlord --> UC_LL_Maint
    Landlord --> UC_LL_Report

    Tenant --> UC_Login
    Tenant --> UC_Logout
    Tenant --> UC_ChangePass
    Tenant --> UC_TN_Dash
    Tenant --> UC_TN_Contract
    Tenant --> UC_TN_Invoice
    Tenant --> UC_TN_ReportInv
    Tenant --> UC_TN_PayQR
    Tenant --> UC_TN_Maint
    Tenant --> UC_TN_Profile
```

---

### 2.2. Đặc tả các Use Case cốt lõi

#### UC-01: Chốt điện nước & Phát hành hóa đơn hàng loạt
- **Tác tử chính**: Chủ trọ (Landlord).
- **Mục đích**: Nhập chỉ số điện, nước mới của toàn bộ các phòng trong khu và tự động tính tiền, phát hành hóa đơn đồng loạt.
- **Tiền điều kiện**: Phòng có hợp đồng hiệu lực hoặc đang có khách ở.
- **Luồng sự kiện chính**:
  1. Chủ trọ chọn Khu trọ và Kỳ tháng phát hành (VD: `2026-08`).
  2. Hệ thống tải chỉ số cũ từ kỳ trước.
  3. Chủ trọ nhập chỉ số điện/nước mới cho từng phòng.
  4. Hệ thống tính số tiêu thụ: $\text{Số dùng} = \text{Chỉ số mới} - \text{Chỉ số cũ}$.
  5. Hệ thống tính tổng tiền = Tiền phòng + Tiền điện + Tiền nước + Phí dịch vụ cố định của khu.
  6. Chủ trọ bấm "Xác nhận phát hành".
  7. Hệ thống lưu hóa đơn vào CSDL và phát tín hiệu **SignalR Realtime** tới từng khách thuê.
- **Hậu điều kiện**: Hóa đơn mới chuyển trạng thái `Unpaid`, khách thuê nhận thông báo toast nổi và hóa đơn xuất hiện trên ứng dụng mà không cần F5.

#### UC-02: Thanh toán hóa đơn qua VietQR & Duyệt tiền Realtime
- **Tác tử chính**: Khách thuê (Tenant), Chủ trọ (Landlord).
- **Mục đích**: Khách quét mã QR chuyển khoản và nộp ảnh biên lai, chủ trọ xác nhận tiền về tài khoản.
- **Luồng sự kiện chính**:
  1. Khách thuê chọn hóa đơn `Unpaid`.
  2. Ứng dụng tự động sinh mã **VietQR động** chuẩn NAPAS247 (chứa Số tài khoản chủ trọ, Ngân hàng, Số tiền chính xác và Nội dung: `Phong {P} thanh toan {MaHD}`).
  3. Khách thuê thực hiện chuyển khoản trên App ngân hàng và tải ảnh chụp màn hình biên lai giao dịch lên hệ thống.
  4. Giao dịch được lưu với trạng thái `PendingApproval`.
  5. Hệ thống gửi thông báo Realtime kèm âm thanh tới màn hình Chủ trọ.
  6. Chủ trọ mở tab Thanh toán, bấm xem ảnh biên lai ngân hàng qua Lightbox.
  7. Chủ trọ bấm **"Xác nhận duyệt tiền"**.
  8. Hệ thống cập nhật giao dịch sang `Completed`, hóa đơn đổi sang `Paid`.
  9. Hệ thống gửi tín hiệu Realtime về App khách thuê: Hóa đơn đổi thành `Paid`, công nợ giảm về 0đ.

#### UC-03: Khiếu nại sai lệch chỉ số hóa đơn (Invoice Dispute)
- **Tác tử chính**: Khách thuê, Chủ trọ.
- **Mục đích**: Khách phát hiện ghi sai số điện/nước gửi yêu cầu kiểm tra lại trước khi đóng tiền.
- **Luồng sự kiện chính**:
  1. Khách bấm "Báo sai sót hóa đơn".
  2. Khách nhập lý do, số điện/nước đề xuất và đính kèm ảnh chụp công tơ thực tế.
  3. Hóa đơn đánh dấu `IsReported = true`, gửi thông báo Realtime đến Chủ trọ.
  4. Chủ trọ vào mục Hóa đơn kiểm tra ảnh công tơ:
     - Nếu chấp nhận: Nhập lại số tiền/chỉ số chính xác ➔ Hệ thống cập nhật tổng tiền mới và gửi thông báo cho khách.
     - Nếu từ chối: Nhập lý do giải trình ➔ Trạng thái khiếu nại chuyển `Rejected`.

---

## 🗄️ CHƯƠNG 3: SƠ ĐỒ THỰC THỂ QUAN HỆ (ERD) & CƠ SỞ DỮ LIỆU

### 3.1. Sơ đồ ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    USERS ||--o{ ZONES : "owns (1:N)"
    USERS ||--o{ SERVICES : "defines (1:N)"
    USERS ||--o| UTILITY_RATES : "configures (1:1)"
    USERS ||--o| TENANT_PROFILES : "has_profile (1:1)"
    USERS ||--o{ NOTIFICATIONS : "sends (1:N)"
    USERS ||--o{ NOTIFICATION_READS : "reads (1:N)"
    USERS ||--o{ COMPLAINTS : "files (1:N)"
    USERS ||--o{ REFRESH_TOKENS : "owns (1:N)"

    ZONES ||--o{ ROOMS : "contains (1:N)"
    ZONES ||--o{ SERVICES : "applies_to (0:N)"

    ROOMS ||--o{ TENANT_PROFILES : "houses (0:N)"
    ROOMS ||--o{ ROOM_EQUIPMENTS : "equipped_with (0:N)"
    ROOMS ||--o{ CONTRACTS : "leased_under (0:N)"
    ROOMS ||--o{ UTILITY_LOGS : "measured_in (0:N)"
    ROOMS ||--o{ INVOICES : "billed_for (0:N)"
    ROOMS ||--o{ MAINTENANCE_REQUESTS : "reported_at (0:N)"
    ROOMS ||--o{ CONTRACT_SETTLEMENTS : "settled_at (0:N)"

    TENANT_PROFILES ||--o{ CONTRACTS : "signs (1:N)"
    TENANT_PROFILES ||--o{ INVOICES : "responsible_for (1:N)"
    TENANT_PROFILES ||--o{ MAINTENANCE_REQUESTS : "requests (1:N)"
    TENANT_PROFILES ||--o{ CONTRACT_SETTLEMENTS : "settles (1:N)"

    CONTRACTS ||--o| CONTRACT_SETTLEMENTS : "terminates_with (0:1)"

    INVOICES ||--o{ INVOICE_ITEMS : "consists_of (1:N)"
    INVOICES ||--o{ PAYMENTS : "paid_via (0:N)"

    NOTIFICATIONS ||--o{ NOTIFICATION_READS : "tracked_by (1:N)"

    %% Entity Attributes
    USERS {
        uuid Id PK
        string Email UK
        string PasswordHash
        string FullName
        string Phone
        string Role "SuperAdmin|Landlord|Tenant"
        string AvatarUrl
        string BankName
        string BankAccountNumber
        string BankAccountName
        boolean IsActive
        datetime CreatedAt
        datetime LastLoginAt
    }

    ZONES {
        uuid Id PK
        uuid LandlordId FK
        string Name
        string Address
        string Description
        int TotalRooms
        datetime CreatedAt
    }

    ROOMS {
        uuid Id PK
        uuid ZoneId FK
        string RoomNumber
        int Floor
        decimal Price
        decimal Area
        int MaxTenants
        string Status "Vacant|Occupied|UnderMaintenance|Deposited"
        decimal ElecMeter
        decimal WaterMeter
        decimal ServiceFee
        string Amenities
        decimal DepositAmount
        string DepositTenantName
        string DepositTenantPhone
        datetime ExpectedMoveInDate
        datetime CreatedAt
    }

    ROOM_EQUIPMENTS {
        uuid Id PK
        uuid RoomId FK
        string Name
        string Brand
        int Quantity
        string Condition
        datetime CreatedAt
    }

    TENANT_PROFILES {
        uuid Id PK
        uuid UserId FK
        uuid RoomId FK
        uuid LandlordId FK
        string CCCD
        string Hometown
        datetime MoveInDate
        decimal Deposit
        string CccdFrontUrl
        string CccdBackUrl
        int VehicleCount
        string VehicleInfo
        datetime CreatedAt
    }

    CONTRACTS {
        uuid Id PK
        string ContractCode UK
        uuid RoomId FK
        uuid TenantProfileId FK
        datetime StartDate
        datetime EndDate
        decimal RentAmount
        decimal Deposit
        string Status "Active|Expired|Liquidated|RenewRequested"
        int PaymentTermDay
        string Terms
        int RequestedRenewMonths
        datetime CreatedAt
    }

    CONTRACT_SETTLEMENTS {
        uuid Id PK
        uuid ContractId FK
        uuid LandlordId FK
        uuid TenantProfileId FK
        uuid RoomId FK
        decimal DepositAmount
        decimal UnpaidInvoicesAmount
        decimal DamageDeductionAmount
        decimal OtherDeductionAmount
        decimal RefundAmount
        string SettlementNotes
        datetime SettleDate
    }

    INVOICES {
        uuid Id PK
        string InvoiceCode UK
        uuid RoomId FK
        uuid TenantProfileId FK
        string Month
        decimal RentFee
        decimal ElecFee
        decimal WaterFee
        decimal ServiceFee
        decimal TotalAmount
        string Status "Unpaid|Paid|Overdue|Cancelled"
        datetime DueDate
        datetime PaidDate
        boolean IsReported
        string DisputeReason
        string DisputeDescription
        string DisputeImageUrl
        string DisputeStatus "Pending|Resolved|Rejected"
        string DisputeReply
        datetime CreatedAt
    }

    INVOICE_ITEMS {
        uuid Id PK
        uuid InvoiceId FK
        string Name
        decimal Amount
    }

    PAYMENTS {
        uuid Id PK
        uuid InvoiceId FK
        decimal Amount
        string Method "VietQR|Cash|Banking|MoMo"
        string Status "PendingApproval|Completed|Rejected"
        string ProofImageUrl
        string Note
        datetime CreatedAt
        datetime ConfirmedAt
        uuid ConfirmedBy
    }

    UTILITY_LOGS {
        uuid Id PK
        uuid RoomId FK
        string Month
        decimal OldElec
        decimal NewElec
        decimal ElecUsed
        decimal OldWater
        decimal NewWater
        decimal WaterUsed
        decimal ElecCost
        decimal WaterCost
        datetime RecordedAt
    }

    UTILITY_RATES {
        uuid Id PK
        uuid LandlordId FK
        decimal ElecPrice
        decimal WaterPrice
        datetime UpdatedAt
    }

    SERVICES {
        uuid Id PK
        uuid LandlordId FK
        uuid ZoneId FK
        string Name
        decimal Price
        string Unit
        string Icon
        boolean IsActive
        datetime CreatedAt
    }

    MAINTENANCE_REQUESTS {
        uuid Id PK
        uuid RoomId FK
        uuid TenantProfileId FK
        string IssueType
        string Title
        string Description
        string Priority "Low|Medium|High|Emergency"
        string Status "Pending|InProgress|Completed|Cancelled"
        string AssignedTo
        string ImageUrl
        string CompletionNote
        datetime CreatedAt
        datetime CompletedAt
    }

    NOTIFICATIONS {
        uuid Id PK
        uuid SenderId FK
        string Title
        string Content
        string Target "SystemAll|AllLandlords|AllTenants|Zone|Room|User"
        uuid TargetId
        datetime CreatedAt
    }

    NOTIFICATION_READS {
        uuid Id PK
        uuid NotificationId FK
        uuid UserId FK
        boolean IsRead
        datetime ReadAt
    }

    COMPLAINTS {
        uuid Id PK
        uuid SenderId FK
        string Title
        string Content
        string Status "Pending|Replied|Closed"
        string Reply
        uuid RepliedBy
        datetime RepliedAt
        datetime CreatedAt
    }

    REFRESH_TOKENS {
        uuid Id PK
        uuid UserId FK
        string Token UK
        datetime ExpiryDate
        boolean IsRevoked
        datetime CreatedAt
    }
```

---

## 🏛️ CHƯƠNG 4: KIẾN TRÚC & QUY TRÌNH REALTIME

```mermaid
sequenceDiagram
    autonumber
    actor Tenant as 👤 Khách Thuê
    participant FE_Tenant as 💻 Web Tenant (React)
    participant Hub as ⚡ SignalR Hub (.NET 9)
    participant API as 🚀 Web API Service
    participant DB as 🗄️ PostgreSQL
    participant FE_Landlord as 💻 Web Chủ Trọ (React)
    actor Landlord as 🏢 Chủ Trọ

    Note over FE_Tenant,FE_Landlord: Kết nối SignalR Hub khi đăng nhập (/hubs/notifications)

    %% LUỒNG CHỐT HÓA ĐƠN
    rect rgb(240, 248, 255)
        Landlord->>FE_Landlord: Bấm "Chốt điện nước & Phát hành HĐ"
        FE_Landlord->>API: POST /api/utilities/bulk-record
        API->>DB: Lưu Invoices, UtilityLogs, Items (Transaction)
        API->>Hub: Phát tín hiệu ReceiveNotification(newNotif)
        Hub-->>FE_Tenant: Push Notification Realtime qua WebSocket
        Note over FE_Tenant: Bắn event smartrent:realtime-update<br/>Tự động refetch danh sách HĐ không cần F5
        FE_Tenant->>Tenant: Hiển thị Toast thông báo nổi & phát âm thanh
    end

    %% LUỒNG THANH TOÁN VIETQR
    rect rgb(255, 250, 240)
        Tenant->>FE_Tenant: Quét VietQR & Upload ảnh biên lai
        FE_Tenant->>API: POST /api/payments
        API->>DB: Lưu Payment (Status: PendingApproval)
        API->>Hub: Gửi thông báo tới Landlord
        Hub-->>FE_Landlord: Push Notification Realtime
        Note over FE_Landlord: Tự động refresh tab Thanh toán & Hóa đơn
        FE_Landlord->>Landlord: Toast: "Khách nộp minh chứng chuyển khoản"
    end

    %% LUỒNG DUYỆT TIỀN
    rect rgb(240, 255, 240)
        Landlord->>FE_Landlord: Bấm "Xác nhận duyệt tiền"
        FE_Landlord->>API: PATCH /api/payments/{id}/confirm (approve: true)
        API->>DB: Cập nhật Payment: Completed, Invoice: Paid
        API->>Hub: Gửi thông báo tới Tenant
        Hub-->>FE_Tenant: Push Notification Realtime
        Note over FE_Tenant: Tự động cập nhật Hóa đơn sang "Paid"
        FE_Tenant->>Tenant: Toast: "Hóa đơn đã được xác nhận thanh toán"
    end
```

---

## 🧪 CHƯƠNG 5: KẾT QUẢ KIỂM THỬ HỆ THỐNG

### 5.1. Bảng kết quả kiểm thử API Endpoints (28/28 Pass)

| STT | Phân hệ | Endpoint kiểm thử | Phương thức | Kết quả | Trạng thái |
| :---: | :--- | :--- | :---: | :---: | :---: |
| 1 | Auth | `/api/auth/login` (Landlord, Tenant, Admin) | `POST` | 200 OK | ✅ PASS |
| 2 | Khu trọ | `/api/zones` (Lấy danh sách khu trọ) | `GET` | 200 OK | ✅ PASS |
| 3 | Phòng | `/api/rooms` (Lấy danh sách phòng) | `GET` | 200 OK | ✅ PASS |
| 4 | Phòng | `/api/rooms/{id}/detail` (Chi tiết phòng & thiết bị) | `GET` | 200 OK | ✅ PASS |
| 5 | Thiết bị | `/api/rooms/{id}/equipments` (Thêm thiết bị) | `POST` | 200 OK | ✅ PASS |
| 6 | Thiết bị | `/api/rooms/equipments/{id}` (Sửa thiết bị) | `PUT` | 200 OK | ✅ PASS |
| 7 | Thiết bị | `/api/rooms/equipments/{id}` (Xóa thiết bị) | `DELETE` | 200 OK | ✅ PASS |
| 8 | Khách thuê | `/api/tenants` (Danh sách khách thuê) | `GET` | 200 OK | ✅ PASS |
| 9 | Hợp đồng | `/api/contracts` (Danh sách hợp đồng chủ trọ) | `GET` | 200 OK | ✅ PASS |
| 10 | Hợp đồng | `/api/contracts` (Hợp đồng của khách thuê) | `GET` | 200 OK | ✅ PASS |
| 11 | Hợp đồng | `/api/contracts/check-expiring` (Kiểm tra hết hạn) | `POST` | 200 OK | ✅ PASS |
| 12 | Hóa đơn | `/api/invoices` (Danh sách hóa đơn chủ trọ) | `GET` | 200 OK | ✅ PASS |
| 13 | Hóa đơn | `/api/invoices` (Hóa đơn cá nhân khách thuê) | `GET` | 200 OK | ✅ PASS |
| 14 | Điện nước | `/api/utilities` (Lịch sử chỉ số điện nước) | `GET` | 200 OK | ✅ PASS |
| 15 | Điện nước | `/api/utilities/rate` (Đơn giá điện nước) | `GET` | 200 OK | ✅ PASS |
| 16 | Dịch vụ | `/api/services` (Danh mục dịch vụ phòng) | `GET` | 200 OK | ✅ PASS |
| 17 | Thanh toán | `/api/payments` (Danh sách giao dịch chủ trọ) | `GET` | 200 OK | ✅ PASS |
| 18 | Thanh toán | `/api/payments` (Lịch sử nộp tiền khách thuê) | `GET` | 200 OK | ✅ PASS |
| 19 | Bảo trì | `/api/maintenance` (Danh sách phiếu bảo trì chủ trọ) | `GET` | 200 OK | ✅ PASS |
| 20 | Bảo trì | `/api/maintenance` (Sự cố của khách thuê) | `GET` | 200 OK | ✅ PASS |
| 21 | Thông báo | `/api/notifications` (Thông báo chủ trọ) | `GET` | 200 OK | ✅ PASS |
| 22 | Thông báo | `/api/notifications` (Thông báo khách thuê) | `GET` | 200 OK | ✅ PASS |
| 23 | Báo cáo | `/api/reports/financial` (Tổng quan tài chính) | `GET` | 200 OK | ✅ PASS |
| 24 | Báo cáo | `/api/reports/financial/export` (Xuất file CSV/Excel) | `GET` | 200 OK | ✅ PASS |
| 25 | Hồ sơ | `/api/profile` (Hồ sơ chủ trọ & VietQR) | `GET` | 200 OK | ✅ PASS |
| 26 | Hồ sơ | `/api/profile/vehicle` (Thông tin xe khách thuê) | `GET` | 200 OK | ✅ PASS |
| 27 | SuperAdmin | `/api/admin/stats` (Thống kê toàn sàn) | `GET` | 200 OK | ✅ PASS |
| 28 | SuperAdmin | `/api/admin/landlords` (Quản lý chủ trọ) | `GET` | 200 OK | ✅ PASS |

---

## 🎯 KẾT LUẬN
Báo cáo trên cung cấp đầy đủ sơ đồ **Use Case**, **ERD 16 bảng CSDL**, **Kiến trúc Realtime SignalR**, và **Bảng chứng minh 28/28 API kiểm thử thành công**, đáp ứng trọn vẹn mọi yêu cầu học thuật và thực tiễn để nộp và bảo vệ dự án.
