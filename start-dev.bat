@echo off
chcp 65001 > nul
echo ==========================================
echo 🚀 KHỞI CHẠY HỆ THỐNG SMARTRENT LOCAL
echo ==========================================

REM 1. Khởi động PostgreSQL
echo [1/3] Đang kiểm tra và khởi động PostgreSQL...
start "" "C:\Users\nmcuong\Downloads\postgresql-18.4-2-windows-x64-binaries\pgsql\bin\pg_ctl.exe" start -D "C:\Users\nmcuong\Downloads\postgresql-18.4-2-windows-x64-binaries\pgsql\data" -l "C:\Users\nmcuong\Downloads\postgresql-18.4-2-windows-x64-binaries\pgsql\logfile.txt"
timeout /t 2 > nul

REM 2. Khởi động Backend API
echo [2/3] Đang khởi chạy Backend API (.NET 9)...
start "SmartRent Backend (Port 5000)" cmd /k "cd /d %~dp0smartrent-api\SmartRent.API && dotnet run"
timeout /t 3 > nul

REM 3. Khởi động Frontend
echo [3/3] Đang khởi chạy Frontend (Vite)...
start "SmartRent Frontend" cmd /k "cd /d %~dp0quan-ly-phong-tro && npm run dev"

echo.
echo ==========================================
echo ✅ Khởi chạy thành công!
echo 🌐 Frontend: http://localhost:3000
echo 📡 Backend API: http://localhost:5000
echo 📑 Swagger UI: http://localhost:5000/swagger
echo ==========================================
