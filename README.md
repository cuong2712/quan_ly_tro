# 🏠 SmartRent - Hệ Thống Quản Lý Phòng Trọ & Thu Chi Tự Động Toàn Diện

> **Dự án Quản Lý Phòng Trọ Cao Cấp (SmartRent)** tích hợp Kiến trúc Clean Architecture (.NET 9) và Giao diện hiện đại (React 18 + Vite), hỗ trợ **Thanh toán VietQR chuẩn ngân hàng**, **Thông báo & Đồng bộ dữ liệu Realtime (SignalR WebSocket)** không cần tải lại trang.

---

## 📦 Yêu Cầu Môi Trường

- **.NET SDK 9.0+**
- **Node.js 18+** & **npm**
- **PostgreSQL 15+** (hoặc pgAdmin 4)

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Chuẩn bị Cơ Sở Dữ Liệu PostgreSQL

Tạo database trong PostgreSQL (pgAdmin hoặc terminal psql):
```sql
CREATE DATABASE "Quan_ly_phongtro";
```

Kiểm tra chuỗi kết nối trong `smartrent-api/SmartRent.API/appsettings.json`:
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=Quan_ly_phongtro;Username=postgres;Password=isiadmin"
}
```
*(Thay đổi `Username` và `Password` theo tài khoản PostgreSQL trên máy của bạn nếu cần).*

---

### 2. Khởi chạy Backend (.NET 9 Web API)

Mở terminal tại thư mục gốc dự án:
```powershell
cd smartrent-api

# Áp dụng Migration & Seed dữ liệu mẫu tự động
dotnet ef database update --project SmartRent.Infrastructure --startup-project SmartRent.API

# Khởi chạy máy chủ API
dotnet run --project SmartRent.API
```

- **Backend API**: `http://localhost:5000`
- **Swagger UI**: `http://localhost:5000/swagger`
- **SignalR Realtime Hub**: `http://localhost:5000/hubs/notifications`

---

### 3. Khởi chạy Frontend (React 18 + Vite)

Mở một cửa sổ terminal mới tại thư mục gốc dự án:
```powershell
cd quan-ly-phong-tro

# Cài đặt dependencies (nếu chạy lần đầu)
npm install

# Khởi chạy ứng dụng Web
npm run dev
```


---

## 🔑 Tài Khoản Demo Sẵn Có (Đã Seed Dữ Liệu Mẫu)

Hệ thống đã tự động tạo sẵn dữ liệu mẫu đầy đủ về khu trọ, phòng, khách thuê, hợp đồng, hóa đơn và lịch sử giao dịch:

| Vai trò (Role) | Email đăng nhập | Mật khẩu | Chức năng chính |
| :--- | :--- | :--- | :--- |
| **👑 Super Admin** | `admin@smartrent.vn` | `Admin@123456` | Quản trị toàn sàn, duyệt/khóa chủ trọ & khách thuê, thống kê doanh thu toàn hệ thống, xử lý khiếu nại sàn |
| **🏢 Chủ Trọ (Landlord)** | `landlord@smartrent.vn` | `Landlord@123456` | Quản lý khu trọ, phòng, nội thất, hợp đồng, chốt điện nước, lập hóa đơn, duyệt chuyển khoản VietQR, quản lý sự cố |
| **👤 Khách Thuê (Tenant)** | `tenant1@smartrent.vn` | `Tenant@123456` | Xem phòng & hợp đồng, quét mã VietQR nộp tiền, gửi minh chứng thanh toán, khiếu nại hóa đơn, báo hỏng thiết bị |

---

## ️ URL Phân Tuyến (Routing)

| Đường dẫn | Giao diện tương ứng |
| :--- | :--- |
| `/login` | Trang Đăng nhập hệ thống (tự động phân quyền và điều hướng) |
| `/admin` | Bảng điều khiển Quản trị viên Toàn Sàn (SuperAdmin Portal) |
| `/landlord` | Bảng điều khiển Chủ Trọ (Landlord Management Portal) |
| `/tenant` | Cổng thông tin Khách Thuê (Tenant Portal) |

---

## 🏗️ Kiến Trúc Dự Án (Clean Architecture)

```
SmartRent/
├── smartrent-api/                     # BACKEND SOLUTION (.NET 9)
│   ├── SmartRent.API/                 # Presentation Layer (Controllers, Hubs, Middlewares, Filters)
│   ├── SmartRent.Application/         # Application Layer (Business Services, DTOs, BillingEngine)
│   ├── SmartRent.Infrastructure/      # Infrastructure Layer (AppDbContext, Migrations, DataSeeder)
│   └── SmartRent.Core/                # Domain Core Layer (Entities, Enums, Interfaces)
│
├── quan-ly-phong-tro/                 # FRONTEND APPLICATION (React 18 + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── SuperAdmin/            # Quản trị hệ thống, duyệt tài khoản, thống kê sàn
│   │   │   ├── Landlord/              # Quản lý khu, phòng, hợp đồng, hóa đơn, điện nước, duyệt tiền
│   │   │   ├── Tenant/                # Cổng khách thuê: VietQR, gửi biên lai, báo hỏng, khiếu nại
│   │   │   └── Common/                # Navbar, Sidebar, Pagination, Lightbox, Toast
│   │   ├── contexts/                  # AuthContext, NotificationContext (SignalR Hub)
│   │   ├── hooks/                     # useApi, useTabData
│   │   ├── services/                  # Axios apiClient & API Service Modules
│   │   └── utils/                     # Format tiền tệ VND, ngày tháng, VietQR Generator
```

---

## 🌟 Các Tính Năng Nổi Bật

1. **Đồng bộ Realtime Live-Sync (SignalR WebSocket)**: Mọi thao tác phát hành hóa đơn, gửi biên lai, duyệt tiền, báo sự cố đều cập nhật tức thì trên màn hình 2 bên mà **không cần bấm F5**.
2. **Thanh toán VietQR động chuẩn NAPAS247**: Tự động sinh mã QR ngân hàng có sẵn số tiền và mã hóa đơn chính xác.
3. **Quy trình Hợp đồng chặt chẽ**: Hỗ trợ thành viên ở ghép (Occupants), chuyển quyền đại diện hợp đồng, gia hạn và thanh lý quyết toán cọc tự động khấu trừ nợ.
4. **Xử lý Khiếu nại Hóa đơn**: Khách thuê gửi đề xuất số điện nước sai lệch ➔ Chủ trọ xem xét và điều chỉnh trực tiếp.
5. **Xuất báo cáo PDF & Excel**: Hỗ trợ in phiếu thu, hóa đơn PDF và xuất file Excel/CSV báo cáo tài chính.

