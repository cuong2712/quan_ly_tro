import * as XLSX from 'xlsx';

// Định dạng tiền tệ VND
export const formatVND = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Định dạng Ngày Tháng (YYYY-MM-DD -> DD/MM/YYYY)
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
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
export const exportToPDF = (elementId, fileName = 'Document.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('Không tìm thấy nội dung để xuất PDF');
    return;
  }

  if (window.html2pdf) {
    const opt = {
      margin:       0.5,
      filename:     fileName,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    window.html2pdf().set(opt).from(element).save();
  } else {
    // Fallback sang in ấn trực tiếp từ trình duyệt
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${fileName}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
            th { background-color: #f1f5f9; }
            .header { text-align: center; margin-bottom: 20px; }
            .badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
          </style>
        </head>
        <body>
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
};
