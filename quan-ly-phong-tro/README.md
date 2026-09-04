# ⚛️ SmartRent Frontend (React 19 + Vite)

Ứng dụng giao diện người dùng (Single Page Application - SPA) dành cho Hệ thống Quản lý phòng trọ **SmartRent**, phục vụ 3 nhóm đối tượng: **SuperAdmin**, **Chủ nhà trọ (Landlord)** và **Cư dân / Khách thuê (Tenant)**.

---

## 🛠️ Công Nghệ & Thư Viện

* **Framework:** React 19 (`react: ^19.2.7`, `react-dom: ^19.2.7`)
* **Build Tool:** Vite 8.x (`@vitejs/plugin-react`)
* **Định tuyến:** React Router DOM v7 (`react-router-dom: ^7.18.1`)
* **Realtime Communication:** `@microsoft/signalr: ^10.0.11`
* **HTTP Client:** `axios: ^1.18.1`
* **Icon System:** `lucide-react: ^1.27.0`
* **Biểu đồ & Thống kê:** `chart.js: ^4.5.1`, `react-chartjs-2: ^5.3.1`
* **Xử lý tài liệu & In ấn:** `html2pdf.js: ^0.14.0`, `mammoth: ^1.12.1`, `xlsx: ^0.18.5`
* **Testing & Linting:** Vitest (`vitest: ^4.1.10`), Testing Library, Oxlint (`oxlint: ^1.71.0`)

---

## 🚀 Khởi Chạy Ứng Dụng

1. **Cài đặt các gói phụ thuộc:**
   ```powershell
   npm install
   ```

2. **Chạy máy chủ phát triển (Development Server):**
   ```powershell
   npm run dev
   ```
   * Ứng dụng chạy tại: `http://localhost:3000` (hoặc `http://127.0.0.1:3000`)
   * Kết nối tới Backend API tại: `http://localhost:5000/api`
   * Kết nối tới SignalR WebSocket tại: `http://localhost:5000/hubs/notifications`

3. **Biên dịch sản phẩm (Production Build):**
   ```powershell
   npm run build
   ```

4. **Kiểm tra linter & Kiểm thử tự động:**
   ```powershell
   npm run lint
   npm run test
   ```

---

## 📁 Cấu Trúc Thư Mục Nguồn (`src/`)

```
src/
├── components/
│   ├── Common/         # Navbar, Sidebar, PrivateRoute, NotificationToast, Pagination, Lightbox
│   ├── SuperAdmin/     # Analytics toàn sàn, Quản trị chủ trọ, Cư dân, Xử lý khiếu nại
│   ├── Landlord/       # Quản lý khu trọ, Sơ đồ phòng, Hợp đồng, Chốt điện nước, Hóa đơn, Duyệt VietQR
│   └── Tenant/         # Dashboard cư dân, Hợp đồng, Hóa đơn & Quét mã VietQR, Báo hỏng thiết bị
├── contexts/           # AuthContext (Xác thực JWT), NotificationContext (SignalR WebSocket Live-Sync)
├── hooks/              # useApi, useTabData
├── pages/              # LoginPage, AdminPage, LandlordPage, TenantPage
├── services/           # apiClient (Axios Interceptors) & các API services module hóa
├── styles/             # main.css (Hệ thống màu sắc, Layout, Glassmorphism và Theme Dark/Light)
└── utils/              # formatVND, formatDate, vietQRGenerator, formatters
```
