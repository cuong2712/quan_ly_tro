# SmartRent - Hướng Dẫn Cài Đặt & Chạy

## 📦 Yêu Cầu Hệ Thống

- **.NET SDK 9+** (hoặc .NET 10)
- **Node.js 18+** và npm
- **PostgreSQL 15+** đang chạy

---

## 🗄️ Bước 1: Chuẩn Bị Database PostgreSQL

```sql
-- Chạy trong psql hoặc pgAdmin:
CREATE DATABASE smartrent_db;
```

Hoặc để EF Core tự tạo khi seed (nếu PostgreSQL dùng user `postgres`).

---

## 🚀 Bước 2: Chạy Backend API

```powershell
# Mở terminal trong thư mục dự án
cd C:\Users\nmcuong\.gemini\antigravity\scratch\smartrent-api

# Cài công cụ EF Core (nếu chưa có)
dotnet tool install --global dotnet-ef

# Tạo Migration
dotnet ef migrations add InitialCreate --project SmartRent.Infrastructure --startup-project SmartRent.API

# Áp dụng Migration lên database
dotnet ef database update --project SmartRent.Infrastructure --startup-project SmartRent.API

# Chạy API (sẽ tự seed dữ liệu mẫu lần đầu)
dotnet run --project SmartRent.API
```

Backend sẽ chạy tại: **http://localhost:5000**
Swagger UI: **http://localhost:5000/swagger**

---

## 🌐 Bước 3: Chạy Frontend

```powershell
cd C:\Users\nmcuong\.gemini\antigravity\scratch\quan-ly-phong-tro
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:5173**

---

## 🔑 Tài Khoản Demo

| Role | Email | Mật khẩu |
|------|-------|-----------|
| **Super Admin** | admin@smartrent.vn | Admin@123456 |
| **Chủ Trọ** | landlord@smartrent.vn | Landlord@123456 |
| **Người Thuê** | tenant1@smartrent.vn | Tenant@123456 |

---

## 🗺️ URL Routing

| URL | Dashboard |
|-----|-----------|
| `/login` | Trang đăng nhập |
| `/admin` | Super Admin Dashboard |
| `/landlord` | Chủ Trọ Dashboard |
| `/tenant` | Người Thuê Dashboard |

---

## 📡 API Endpoints Chính

### Authentication
- `POST /api/auth/login` - Đăng nhập → JWT token
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Đăng xuất

### Super Admin (yêu cầu role: SuperAdmin)
- `GET /api/admin/stats` - Thống kê hệ thống
- `GET /api/admin/landlords` - Danh sách chủ trọ
- `POST /api/admin/landlords` - Tạo chủ trọ
- `PATCH /api/admin/landlords/{id}/toggle-lock` - Khóa/Mở tài khoản
- `PATCH /api/admin/landlords/{id}/reset-password` - Đặt lại mật khẩu
- `GET /api/admin/complaints` - Xem phản hồi
- `POST /api/admin/complaints/{id}/reply` - Trả lời phản hồi

### Chủ Trọ (yêu cầu role: Landlord)
- `GET /api/zones` - Danh sách khu trọ
- `GET /api/rooms` - Danh sách phòng
- `GET /api/tenants` - Danh sách khách thuê
- `GET /api/contracts` - Hợp đồng
- `GET /api/utilities` - Lịch sử điện nước
- `GET /api/invoices` - Hóa đơn
- `GET /api/payments` - Thanh toán
- `GET /api/maintenance` - Yêu cầu bảo trì
- `GET /api/dashboard/landlord` - Dashboard KPI

### Người Thuê (yêu cầu role: Tenant)
- `GET /api/invoices` - Hóa đơn của mình
- `POST /api/payments` - Gửi thanh toán
- `GET /api/maintenance` - Yêu cầu bảo trì của mình
- `POST /api/maintenance` - Tạo yêu cầu bảo trì
- `GET /api/notifications` - Thông báo
- `GET /api/dashboard/tenant` - Dashboard cá nhân

---

## 🏗️ Kiến Trúc Dự Án

```
SmartRent Solution
├── SmartRent.API          # Presentation Layer (Controllers, Program.cs)
├── SmartRent.Application  # Application Layer (Services, Business Logic)
├── SmartRent.Infrastructure # Infrastructure Layer (EF Core, Repositories)
└── SmartRent.Core         # Domain Layer (Entities, DTOs, Interfaces, Enums)
```

---

## ⚙️ Cấu Hình

Chỉnh sửa `SmartRent.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=smartrent_db;Username=postgres;Password=YOUR_PASSWORD"
  },
  "Jwt": {
    "Key": "YOUR_SUPER_SECRET_KEY_AT_LEAST_32_CHARS",
    "Issuer": "SmartRent",
    "ExpireMinutes": "1440"
  }
}
```
