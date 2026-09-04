# 🏠 SmartRent - Hệ Thống Quản Lý Phòng Trọ & Thu Chi Tự Động Toàn Diện

> **SmartRent** là nền tảng quản lý phòng trọ cao cấp được thiết kế theo kiến trúc **Clean Architecture (.NET 9)** kết hợp giao diện hiện đại **React 19 + Vite**. Hệ thống giải quyết trọn vẹn bài toán vận hành nhà trọ: từ quản lý phòng, hợp đồng điện tử, chốt chỉ số điện nước tự động, phát hành hóa đơn, **thanh toán VietQR chuẩn NAPAS 247**, đến **đồng bộ dữ liệu thời gian thực (SignalR WebSocket)** không cần tải lại trang.

---

## 📌 Bảng Thông Tin Kỹ Thuật

| Thành phần | Công nghệ / Nền tảng | Phiên bản | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Backend** | .NET / ASP.NET Core Web API | **.NET 9.0 LTS** | C# 13, Clean Architecture 4 tầng |
| **ORM** | Entity Framework Core | **9.0** | PostgreSQL Provider (`Npgsql`) |
| **Cơ sở dữ liệu** | PostgreSQL | **15.0+** | Tên DB: `Quan_li_phong_tro` |
| **Realtime** | ASP.NET Core SignalR | **9.0** | WebSocket Hub `/hubs/notifications` |
| **Frontend** | React + Vite | **React 19.2 / Vite 8** | Single Page Application (SPA) |
| **Icon & UI** | Lucide React, Chart.js, HTML2PDF | Mới nhất | Glassmorphism Dark/Light Mode |

---

## 📦 Yêu Cầu Môi Trường (Prerequisites)

Trước khi khởi chạy dự án, hãy đảm bảo máy tính của bạn đã cài đặt:
1. **.NET SDK 9.0+** ([Tải về tại đây](https://dotnet.microsoft.com/download/dotnet/9.0))
2. **Node.js 18+** (Khuyên dùng Node.js 20 LTS) & **npm** ([Tải về tại đây](https://nodejs.org/))
3. **PostgreSQL 15+** kèm pgAdmin 4 hoặc công cụ quản lý cơ sở dữ liệu tương đương ([Tải về tại đây](https://www.postgresql.org/download/))

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy Từng Bước

### Bước 1: Chuẩn bị Cơ Sở Dữ Liệu PostgreSQL

1. Mở terminal `psql` hoặc công cụ pgAdmin, tiến hành tạo Database:
```sql
CREATE DATABASE "Quan_li_phong_tro";
```

2. Kiểm tra chuỗi kết nối trong tệp [`smartrent-api/SmartRent.API/appsettings.json`](smartrent-api/SmartRent.API/appsettings.json):
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=Quan_li_phong_tro;Username=postgres;Password=isiadmin"
}
```
*(Hãy điều chỉnh `Username`, `Password` và `Port` phù hợp với cấu hình PostgreSQL trên máy tính của bạn nếu có thay đổi).*

---

### Bước 2: Khởi chạy Backend (.NET 9 Web API)

Mở cửa sổ Terminal tại thư mục gốc dự án:
```powershell
cd smartrent-api

# Áp dụng Migration & Tự động nạp dữ liệu mẫu (Seed Data)
dotnet ef database update --project SmartRent.Infrastructure --startup-project SmartRent.API

# Khởi chạy Backend Server
dotnet run --project SmartRent.API
```

Sau khi khởi chạy thành công:
* **Backend API Host:** `http://localhost:5000`
* **Swagger UI (Tài liệu API):** `http://localhost:5000/swagger`
* **SignalR WebSocket Hub:** `http://localhost:5000/hubs/notifications`

---

### Bước 3: Khởi chạy Frontend (React 19 + Vite)

Mở một cửa sổ Terminal mới tại thư mục gốc dự án:
```powershell
cd quan-ly-phong-tro

# Cài đặt các gói phụ thuộc (dependencies)
npm install

# Khởi chạy máy chủ phát triển Frontend
npm run dev
```

Sau khi khởi chạy thành công:
* **Địa chỉ truy cập Web:** `http://localhost:3000` (hoặc `http://127.0.0.1:3000`)

---

## 🔑 Danh Sách Tài Khoản Demo Mẫu (Đã Nạp Sẵn Dữ Liệu)

Hệ thống đã tự động tạo sẵn dữ liệu mẫu thực tế về khu trọ, phòng trọ, chỉ số điện nước, hợp đồng, hóa đơn và các yêu cầu bảo trì:

| Vai trò (Role) | Họ và tên | Email đăng nhập | Mật khẩu mặc định | Quyền hạn chính |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Super Admin** | Ban Quản Trị | `admin@smartrent.vn` | `Admin@123456` | Quản trị toàn sàn, khóa/mở tài khoản chủ trọ, theo dõi doanh thu vĩ mô, giải quyết khiếu nại hệ thống |
| **🏢 Chủ Trọ 1** | Nguyễn Văn Hải | `landlord@smartrent.vn` | `Landlord@123456` | Quản lý khu trọ, lập hợp đồng, chốt điện nước, phát hành hóa đơn, duyệt tiền VietQR, xếp thợ sửa chữa |
| **🏢 Chủ Trọ 2** | Trần Thị Mai | `maitran@smartrent.vn` | `Landlord@123456` | Quản lý cơ sở phòng trọ độc lập thứ 2 |
| **👤 Khách Thuê 1** | Nguyễn Văn Minh | `tenant1@smartrent.vn` | `Tenant@123456` | Xem phòng & hợp đồng, quét VietQR thanh toán, báo sai số tiền hóa đơn, báo sự cố thiết bị |
| **👤 Khách Thuê 2** | Lê Thị Thu Thảo | `tenant2@smartrent.vn` | `Tenant@123456` | Khách thuê phòng thuộc khu trọ của chủ trọ |
| **👤 Khách Thuê 3** | Phạm Đức Anh | `tenant3@smartrent.vn` | `Tenant@123456` | Khách thuê trải nghiệm các tính năng cư dân |

---

## 🌐 Tuyến Đường Giao Diện (Routing)

| Đường dẫn (Route) | Phân quyền truy cập | Mô tả giao diện |
| :--- | :--- | :--- |
| `/login` | Public | Trang Đăng nhập hệ thống (Tự động nhận diện Role và chuyển hướng thông minh) |
| `/admin/*` | SuperAdmin | Cổng Quản trị viên Toàn sàn (SuperAdmin Portal) |
| `/landlord/*` | Landlord | Cổng Quản lý Chủ Nhà Trọ (Landlord Portal) |
| `/tenant/*` | Tenant | Cổng Cư Dân & Khách Thuê Phòng (Tenant Portal) |

---

## 🏗️ Cấu Trúc Thư Mục Dự Án (Clean Architecture)

```
SmartRent/
├── smartrent-api/                         # GIẢI PHÁP BACKEND (.NET 9 WEB API)
│   ├── SmartRent.API/                     # Presentation Layer
│   │   ├── Controllers/                   # 17 RESTful Controllers (Auth, Rooms, Contracts, Invoices...)
│   │   ├── Hubs/                          # SignalR NotificationHub (WebSocket)
│   │   ├── Middlewares/                   # RateLimiting, SecurityHeaders, GlobalExceptionHandler
│   │   ├── Filters/                       # ApiResponseFilter (Envelope Pattern)
│   │   └── Program.cs                     # Cấu hình DI, JWT Bearer, CORS, Pipeline
│   │
│   ├── SmartRent.Application/             # Application Business Logic Layer
│   │   ├── Services/                      # Facade Services & Domain Sub-Services
│   │   │   ├── Contracts/                 # ContractLifecycle, Settlement, TemplateEngine, Transfer
│   │   │   ├── Invoices/                  # BillingEngine, DisputeService, InvoiceLifecycle
│   │   │   ├── Rooms/                     # RoomLifecycle, RoomOccupant, RoomQuery
│   │   │   ├── Utilities/                 # UtilityRecord, UtilityRate, UtilityQuery
│   │   │   └── Admin/                     # AdminAnalytics, AdminLandlord, AdminTenant
│   │   ├── Common/                        # Mappings (Extension Methods), Validators
│   │   └── DTOs/                          # Request & Response Data Transfer Objects
│   │
│   ├── SmartRent.Core/                    # Domain Core Layer (Độc lập Framework)
│   │   ├── Entities/                      # 18 Thực thể CSDL (User, Room, Contract, Invoice...)
│   │   ├── Enums/                         # 10 Kiểu liệt kê trạng thái (RoomStatus, ContractStatus...)
│   │   ├── Interfaces/                    # Domain Interfaces (IAuthService, IRealtimeNotifier)
│   │   └── DTOs/                          # ApiResponse<T> chuẩn hóa bao đóng phản hồi
│   │
│   └── SmartRent.Infrastructure/          # Data Infrastructure Layer
│       ├── Data/                          # AppDbContext (EF Core Npgsql), DataSeeder
│       └── Migrations/                    # Lịch sử lược đồ CSDL PostgreSQL
│
└── quan-ly-phong-tro/                     # ỨNG DỤNG FRONTEND (REACT 19 + VITE)
    ├── src/
    │   ├── components/
    │   │   ├── Common/                    # Navbar, Sidebar, PrivateRoute, NotificationToast, Modal
    │   │   ├── SuperAdmin/                # Analytics, Quản lý chủ trọ, Cư dân, Khiếu nại sàn
    │   │   ├── Landlord/                  # Sơ đồ phòng, Hợp đồng, Chốt điện nước, Hóa đơn, Duyệt VietQR
    │   │   └── Tenant/                    # Dashboard cư dân, Hợp đồng, Hóa đơn VietQR, Báo hỏng thiết bị
    │   ├── contexts/                      # AuthContext, NotificationContext (SignalR Client)
    │   ├── hooks/                         # useApi, useTabData
    │   ├── pages/                         # LoginPage, AdminPage, LandlordPage, TenantPage
    │   ├── services/                      # Axios Client Interceptors & API Service Modules
    │   ├── styles/                        # main.css (Hệ thống Theme Dark/Light Mode đồng bộ)
    │   └── utils/                         # Định dạng VND, Date, VietQR Generator, Trạng thái hợp đồng
    ├── package.json                       # React 19.2, Lucide React, Chart.js, HTML2PDF...
    └── vite.config.js                     # Cấu hình Server (Host: 127.0.0.1, Port: 3000)
```

---

## 🌟 Các Tính Năng Nổi Bật Của Hệ Thống

1. **Đồng bộ thời gian thực (SignalR Live-Sync WebSocket):**
   * Mọi sự kiện phát hành hóa đơn mới, cư dân gửi biên lai VietQR, chủ trọ duyệt tiền, hay khách gửi báo hỏng thiết bị đều được đẩy tức thì qua WebSocket tới người nhận mà **không cần tải lại trang (F5)**.
2. **Thanh toán VietQR động chuẩn NAPAS 247:**
   * Tự động sinh mã QR ngân hàng động chứa đầy đủ thông tin tài khoản thụ hưởng của chủ trọ, số tiền chính xác đến từng đồng và nội dung chuyển khoản gán mã hóa đơn. Khách chỉ cần dùng app ngân hàng quét là chuyển tiền chuẩn xác 100%.
3. **Động cơ xuất hóa đơn tự động (`BillingEngine`):**
   * Hỗ trợ chốt nhanh chỉ số điện nước hàng loạt (Bulk Record), tự động tính toán lũy kế ($ChỉSốMới - ChỉSốCũ \times ĐơnGiá$) kết hợp tiền phòng và các phí dịch vụ để phát hành hóa đơn đồng loạt trong vài giây.
4. **Xử lý tranh chấp & Khiếu nại hóa đơn (`Dispute Review`):**
   * Cho phép khách thuê báo cáo sai số tiền trực tiếp trên hóa đơn kèm ảnh chụp đồng hồ công tơ minh chứng. Chủ nhà trọ có thể kiểm tra ảnh và duyệt điều chỉnh số tiền trực tiếp trên hệ thống.
5. **Quy trình Hợp đồng chặt chẽ & Quyết toán cọc minh bạch (`ContractSettlements`):**
   * Hỗ trợ tạo hợp đồng mẫu tự động, gia hạn hợp đồng, chuyển phòng kế thừa tiền cọc, và biên bản thanh lý quyết toán cọc tự động khấu trừ nợ hóa đơn cùng chi phí hư hại tài sản.
6. **Báo sự cố thiết bị hiện đại:**
   * Giao diện báo hỏng thiết bị 2 cột trực quan: chọn nhanh loại thiết bị với biểu tượng trực quan, phân cấp mức độ khẩn cấp, gợi ý mô tả nhanh (Quick Tags) và kéo thả ảnh chụp hiện trường.
7. **Xuất báo cáo & In ấn chuyên nghiệp:**
   * Tích hợp xuất phiếu thu, hợp đồng thuê phòng ra định dạng PDF và xuất báo cáo doanh thu tài chính ra bảng tính Excel/CSV.

---

## 🛠️ Lệnh Kiểm Thử & Biên Dịch Dự Án

* **Kiểm tra biên dịch Backend:**
  ```powershell
  cd smartrent-api
  dotnet build
  ```
* **Kiểm tra biên dịch Frontend:**
  ```powershell
  cd quan-ly-phong-tro
  npm run build
  ```
* **Chạy kiểm thử tự động Frontend (Vitest):**
  ```powershell
  cd quan-ly-phong-tro
  npm run test
  ```
