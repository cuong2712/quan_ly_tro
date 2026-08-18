import * as XLSX from 'xlsx';

// Định dạng tiền tệ VND
export const formatVND = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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

// Xuất file PDF bằng html2pdf.js hoặc window.print
export const exportToPDF = async (elementId, fileName = 'Document.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('Không tìm thấy nội dung để xuất PDF');
    return;
  }

  // Tạm thời áp dụng class xuất PDF để đảm bảo tất cả chữ có màu đen/đậm trên nền trắng (kể cả khi ở giao diện tối Dark Mode)
  element.classList.add('pdf-export-active');

  try {
    if (window.html2pdf) {
      const opt = {
        margin:       0.4,
        filename:     fileName,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      await window.html2pdf().set(opt).from(element).save();
    } else {
      // Fallback sang in ấn trực tiếp từ trình duyệt
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>${fileName}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 24px; color: #0f172a; background-color: #ffffff; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; color: #0f172a; }
              th { background-color: #f1f5f9; color: #0f172a; }
              .header { text-align: center; margin-bottom: 20px; }
              .badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
              div, p, span, h1, h2, h3, h4, h5, h6, strong { color: #0f172a !important; }
            </style>
          </head>
          <body class="pdf-export-active">
            ${element.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  } catch (err) {
    console.error('Lỗi khi xuất file PDF:', err);
  } finally {
    // Loại bỏ class ép nền trắng sau khi xuất PDF xong
    element.classList.remove('pdf-export-active');
  }
};
