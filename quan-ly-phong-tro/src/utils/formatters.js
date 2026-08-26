import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

// Định dạng tiền tệ VND
export const formatVND = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Định dạng chuỗi số với dấu chấm phân cách hàng nghìn (VD: 1000000 -> "1.000.000")
export const formatNumberWithDots = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const numStr = String(val).replace(/\D/g, '');
  if (!numStr) return '';
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Chuyển đổi chuỗi có dấu chấm phân cách thành số nguyên (VD: "1.000.000" -> 1000000)
export const parseNumberFromDots = (str) => {
  if (str === null || str === undefined || str === '') return 0;
  const numStr = String(str).replace(/\D/g, '');
  return numStr ? parseInt(numStr, 10) : 0;
};

// Chuẩn hóa chuỗi thời gian đảm bảo tính toán chính xác theo UTC -> Múi giờ Việt Nam (GMT+7)
export const parseVietnamDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  let str = String(dateStr).trim();
  // Nếu là chuỗi ISO nhưng thiếu timezone indicator ('Z' hoặc offset), thêm 'Z' để browser parse chính xác UTC
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str) && !str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
    str += 'Z';
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

// Định dạng Ngày Tháng (DD/MM/YYYY) theo múi giờ Việt Nam
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = parseVietnamDate(dateStr);
  if (!d) return String(dateStr);
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
};

// Định dạng Giờ:Phút:Giây Ngày/Tháng/Năm theo múi giờ Việt Nam (GMT+7)
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = parseVietnamDate(dateStr);
  if (!d) return String(dateStr);
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false
  }).format(d);
};

// Định dạng tóm tắt thời gian tương đối (Vừa xong, 5 phút trước, 2 giờ trước,...)
export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Vừa xong';
  const d = parseVietnamDate(dateStr);
  if (!d) return 'Vừa xong';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 45) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} ngày trước`;

  return formatDateTime(dateStr);
};

// Chuẩn hóa đường dẫn hình ảnh (Hỗ trợ URL ngoài, base64 hoặc static file tải lên từ backend /uploads)
export const getImageUrl = (url, defaultFallback = '') => {
  if (!url) return defaultFallback;
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Tạo liên kết hình ảnh QR Code chuyển khoản ngân hàng VietQR
export const getVietQRUrl = ({ bankId = 'BIDV', accountNo = '6531211114', accountName = 'NGUYEN MANH CUONG', amount = 0, addInfo = '' }) => {
  const cleanInfo = encodeURIComponent(addInfo || 'Thanh toan tien nha');
  const cleanName = encodeURIComponent(accountName);
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${cleanInfo}&accountName=${cleanName}`;
};

// Xuất file Excel
export const exportToExcel = (data, fileName = 'Bao_Cao_SmartRent.xlsx', sheetName = 'Dữ Liệu') => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
    return true;
  } catch (error) {
    console.error('Lỗi khi xuất file Excel:', error);
    return false;
  }
};

// Xuất file PDF bằng html2pdf.js
export const exportToPDF = async (elementId, fileName = 'Document.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('Không tìm thấy nội dung để xuất PDF');
    return;
  }

  // Tạm thời áp dụng class xuất PDF để đảm bảo tất cả chữ có màu đen/đậm trên nền trắng
  element.classList.add('pdf-export-active');

  try {
    const pdfLib = typeof html2pdf === 'function' ? html2pdf : (window.html2pdf || null);
    if (pdfLib) {
      const opt = {
        margin:       [0.4, 0.4, 0.4, 0.4],
        filename:     fileName,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      await pdfLib().set(opt).from(element).save();
    } else {
      alert('Đang chuẩn bị thư viện xuất PDF, vui lòng thử lại sau giây lát.');
    }
  } catch (err) {
    console.error('Lỗi khi xuất file PDF:', err);
    alert('Có lỗi xảy ra trong quá trình xuất PDF: ' + (err.message || 'Vui lòng thử lại'));
  } finally {
    // Loại bỏ class ép nền trắng sau khi xuất PDF xong
    element.classList.remove('pdf-export-active');
  }
};

// ─── CHUẨN HÓA & KIỂM TRA SỐ CCCD ──────────────────────────────────
// Chuẩn hóa và làm sạch số CCCD (chỉ nhận số, tối đa 12 số, luôn bắt đầu bằng số 0)
export const sanitizeCccd = (raw) => {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '').slice(0, 12);
  if (digits.length > 0 && digits[0] !== '0') {
    digits = '0' + digits.slice(0, 11);
  }
  return digits;
};

// Kiểm tra tính hợp lệ của số CCCD (đúng 12 chữ số và bắt đầu bằng số 0)
export const isValidCccd = (cccd) => {
  if (!cccd) return false;
  return /^0\d{11}$/.test(String(cccd).trim());
};

// ─── CHUẨN HÓA & KIỂM TRA HỌ TÊN (KHÔNG CHỨA SỐ & KÝ TỰ ĐẶC BIỆT) ───
export const isValidFullName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;
  return /^[\p{L}\s]+$/u.test(trimmed);
};

// ─── CHUẨN HÓA & KIỂM TRA SỐ ĐIỆN THOẠI (CHỈ NHẬN 10 SỐ, BẮT ĐẦU BẰNG 0) ───
export const sanitizePhone = (raw) => {
  if (!raw) return '';
  return String(raw).replace(/\D/g, '').slice(0, 10);
};

export const isValidPhone = (phone) => {
  if (!phone) return false;
  return /^0\d{9}$/.test(String(phone).trim());
};

// ─── DANH SÁCH NGÂN HÀNG VIỆT NAM (HỖ TRỢ VIETQR) ───────────────
export const VIETNAM_BANKS = [
  { code: 'BIDV', name: 'BIDV - Ngân hàng Đầu tư và Phát triển Việt Nam', shortName: 'BIDV' },
  { code: 'VCB', name: 'Vietcombank - Ngân hàng Ngoại thương Việt Nam', shortName: 'Vietcombank' },
  { code: 'MB', name: 'MBBank - Ngân hàng Quân Đội', shortName: 'MBBank' },
  { code: 'TCB', name: 'Techcombank - Ngân hàng Kỹ Thương Việt Nam', shortName: 'Techcombank' },
  { code: 'ICB', name: 'VietinBank - Ngân hàng Công Thương Việt Nam', shortName: 'VietinBank' },
  { code: 'ACB', name: 'ACB - Ngân hàng Á Châu', shortName: 'ACB' },
  { code: 'VPB', name: 'VPBank - Ngân hàng Việt Nam Thịnh Vượng', shortName: 'VPBank' },
  { code: 'TPB', name: 'TPBank - Ngân hàng Tiên Phong', shortName: 'TPBank' },
  { code: 'VBA', name: 'Agribank - Ngân hàng Nông nghiệp & PTNT Việt Nam', shortName: 'Agribank' },
  { code: 'STB', name: 'Sacombank - Ngân hàng Sài Gòn Thương Tín', shortName: 'Sacombank' },
  { code: 'HDB', name: 'HDBank - Ngân hàng Phát triển TP.HCM', shortName: 'HDBank' },
  { code: 'VIB', name: 'VIB - Ngân hàng Quốc Tế', shortName: 'VIB' },
  { code: 'SHB', name: 'SHB - Ngân hàng Sài Gòn - Hà Nội', shortName: 'SHB' },
  { code: 'MSB', name: 'MSB - Ngân hàng Hàng Hải', shortName: 'MSB' },
  { code: 'OCB', name: 'OCB - Ngân hàng Phương Đông', shortName: 'OCB' },
  { code: 'LPB', name: 'LPBank - Ngân hàng Lộc Phát Việt Nam', shortName: 'LPBank' },
  { code: 'SEAB', name: 'SeABank - Ngân hàng Đông Nam Á', shortName: 'SeABank' },
  { code: 'CAKE', name: 'CAKE by VPBank', shortName: 'CAKE' },
  { code: 'TIMO', name: 'Timo by BVBank', shortName: 'Timo' },
];

// ─── CHUẨN HÓA & KIỂM TRA SỐ TÀI KHOẢN NGÂN HÀNG (CHỈ CHỨA CHỮ SỐ, TỪ 6-20 KÝ TỰ) ───
export const sanitizeBankAccountNumber = (raw) => {
  if (!raw) return '';
  return String(raw).replace(/\D/g, '').slice(0, 20);
};

export const isValidBankAccountNumber = (accNo) => {
  if (!accNo) return false;
  return /^\d{6,20}$/.test(String(accNo).trim());
};

// ─── CHUẨN HÓA & KIỂM TRA TÊN CHỦ TÀI KHOẢN (CHỈ CHỨA CHỮ CÁI VÀ KHOẢNG TRẮNG, IN HOA) ───
export const isValidBankAccountName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 70) return false;
  return /^[\p{L}\s]+$/u.test(trimmed);
};

export const sanitizeBankAccountName = (raw) => {
  if (!raw) return '';
  return String(raw).toUpperCase();
};


// ─── XỬ LÝ & ĐỊNH DẠNG TRẠNG THÁI HỢP ĐỒNG ──────────────────────
export const getContractStatusInfo = (c) => {
  if (!c) {
    return { label: 'Chưa có hợp đồng', className: 'liquidated', type: 'none', isActive: false, isExpired: false, isLiquidated: false, isRenewPending: false };
  }

  const rawStatus = (c.status || '').toString().toLowerCase();

  if (rawStatus === 'liquidated' || rawStatus === '4' || c.status === 4) {
    return {
      label: '🔒 Đã thanh lý',
      className: 'liquidated',
      type: 'liquidated',
      isActive: false,
      isLiquidated: true,
      isExpired: false,
      isRenewPending: false
    };
  }

  if (rawStatus === 'renewrequested' || rawStatus === 'renew_requested' || rawStatus === '3' || c.status === 3 || Boolean(c.requestedRenewMonths)) {
    return {
      label: `⏳ Chờ gia hạn (+${c.requestedRenewMonths || 12}T)`,
      className: 'renew_requested',
      type: 'renew_requested',
      isActive: true,
      isRenewPending: true,
      isExpired: false,
      isLiquidated: false
    };
  }

  if (rawStatus === 'expired' || rawStatus === '2' || c.status === 2) {
    return {
      label: '⏰ Đã hết hạn',
      className: 'expired',
      type: 'expired',
      isActive: false,
      isExpired: true,
      isLiquidated: false,
      isRenewPending: false
    };
  }

  if (c.endDate) {
    const endDateObj = parseVietnamDate(c.endDate) || new Date(c.endDate);
    if (endDateObj && !isNaN(endDateObj.getTime())) {
      endDateObj.setHours(23, 59, 59, 999);
      if (endDateObj < new Date()) {
        return {
          label: '⏰ Đã hết hạn',
          className: 'expired',
          type: 'expired',
          isActive: false,
          isExpired: true,
          isLiquidated: false,
          isRenewPending: false
        };
      }
    }
  }

  return {
    label: 'Đang hiệu lực',
    className: 'active',
    type: 'active',
    isActive: true,
    isExpired: false,
    isLiquidated: false,
    isRenewPending: false
  };
};

export const isContractExpired = (c) => {
  if (!c) return false;
  const info = getContractStatusInfo(c);
  return info.isExpired;
};

// Xuất file Excel mẫu để chủ trọ nhập chỉ số điện nước
export const exportUtilityTemplateExcel = (rooms = [], zones = [], month = new Date().toISOString().slice(0, 7), targetZoneId = '') => {
  try {
    const filteredRooms = rooms.filter(r => !targetZoneId || (r.zoneId || r.ZoneId) === targetZoneId);
    
    const rows = filteredRooms.map((r, index) => {
      const z = zones.find(zone => (zone.id || zone.Id) === (r.zoneId || r.ZoneId));
      const activeTenant = r.currentTenantName || r.CurrentTenantName || r.tenants?.[0]?.user?.fullName || r.tenants?.[0]?.fullName || r.tenantName || 'Trống';
      
      return {
        'STT': index + 1,
        'Khu Trọ': z?.name || z?.Name || r.zoneName || r.ZoneName || 'Mặc định',
        'Số Phòng': r.roomNumber || r.RoomNumber || '',
        'Khách Đại Diện': activeTenant,
        'Tháng Chốt': month,
        'Số Điện Cũ (kWh)': Number(r.elecMeter ?? r.ElecMeter ?? 0),
        'Số Điện Mới (kWh)': '',
        'Số Nước Cũ (m³)': Number(r.waterMeter ?? r.WaterMeter ?? 0),
        'Số Nước Mới (m³)': '',
        'Ghi Chú': '',
        '_Mã_Phòng_Ẩn': r.id || r.Id
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Căn chỉnh độ rộng cột
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 20 }, // Khu Trọ
      { wch: 14 }, // Số Phòng
      { wch: 22 }, // Khách Đại Diện
      { wch: 14 }, // Tháng Chốt
      { wch: 18 }, // Số Điện Cũ
      { wch: 20 }, // Số Điện Mới
      { wch: 18 }, // Số Nước Cũ
      { wch: 20 }, // Số Nước Mới
      { wch: 25 }, // Ghi Chú
      { hidden: true, wch: 0 } // _Mã_Phòng_Ẩn
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chốt Điện Nước');

    const fileName = `Mau_Nhap_Dien_Nuoc_Thang_${month}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    return true;
  } catch (err) {
    console.error('Lỗi khi xuất file Excel mẫu điện nước:', err);
    return false;
  }
};

// Đọc và phân tích file Excel chỉ số điện nước do chủ trọ tải lên
export const parseUtilityExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          reject(new Error('File Excel rỗng hoặc không có dữ liệu hợp lệ.'));
          return;
        }

        const items = rawJson.map((row, idx) => {
          // Lấy linh hoạt các tên cột (hỗ trợ cả có dấu và không dấu)
          const roomNumber = String(row['Số Phòng'] || row['So Phong'] || row['Phòng'] || row['Phong'] || row['RoomNumber'] || '').trim();
          const zoneName = String(row['Khu Trọ'] || row['Khu Tro'] || row['ZoneName'] || '').trim();
          const roomId = row['_Mã_Phòng_Ẩn'] || row['Mã Phòng'] || row['RoomId'] || null;
          
          const oldElec = Number(row['Số Điện Cũ (kWh)'] || row['So Dien Cu'] || row['OldElec'] || 0);
          const newElecRaw = row['Số Điện Mới (kWh)'] !== undefined && row['Số Điện Mới (kWh)'] !== '' ? row['Số Điện Mới (kWh)'] : row['So Dien Moi'] || row['NewElec'];
          const newElec = newElecRaw !== '' && newElecRaw !== undefined ? Number(newElecRaw) : null;

          const oldWater = Number(row['Số Nước Cũ (m³)'] || row['So Nuoc Cu'] || row['OldWater'] || 0);
          const newWaterRaw = row['Số Nước Mới (m³)'] !== undefined && row['Số Nước Mới (m³)'] !== '' ? row['Số Nước Mới (m³)'] : row['So Nuoc Moi'] || row['NewWater'];
          const newWater = newWaterRaw !== '' && newWaterRaw !== undefined ? Number(newWaterRaw) : null;

          const note = String(row['Ghi Chú'] || row['Ghi Chu'] || row['Note'] || '').trim();
          const month = String(row['Tháng Chốt'] || row['Thang Chot'] || row['Month'] || '').trim();
          const tenantName = String(row['Khách Đại Diện'] || row['Khach Dai Dien'] || row['TenantName'] || '').trim();

          return {
            rowIdx: idx + 2, // Excel row number (1-based + 1 header)
            roomId,
            roomNumber,
            zoneName,
            tenantName,
            month,
            oldElec,
            newElec,
            oldWater,
            newWater,
            note
          };
        });

        resolve(items);
      } catch (error) {
        console.error('Lỗi khi đọc file Excel:', error);
        reject(new Error('Không thể đọc định dạng file Excel. Vui lòng sử dụng file .xlsx chuẩn.'));
      }
    };
    reader.onerror = () => reject(new Error('Lỗi khi đọc file từ thiết bị.'));
    reader.readAsArrayBuffer(file);
  });
};

