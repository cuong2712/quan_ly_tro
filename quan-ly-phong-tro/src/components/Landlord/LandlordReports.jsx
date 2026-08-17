import React, { useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, Printer, DollarSign, AlertCircle, Home, Zap } from 'lucide-react';
import { formatVND, exportToExcel, exportToPDF } from '../../utils/formatters';
import { reportService } from '../../services';

export const LandlordReports = ({ data = {} }) => {
  const invoices = Array.isArray(data.invoices) ? data.invoices : [];
  const rooms = Array.isArray(data.rooms) ? data.rooms : [];
  const tenants = Array.isArray(data.tenants) ? data.tenants : [];
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const totalRevenue = invoices
    .filter(i => (i.status || '').toLowerCase() === 'paid')
    .reduce((sum, i) => sum + (i.totalAmount || 0), 0);

  const currentMonthRevenue = invoices
    .filter(i => i.month === currentMonthStr && (i.status || '').toLowerCase() === 'paid')
    .reduce((sum, i) => sum + (i.totalAmount || 0), 0);

  const revenueDisplay = currentMonthRevenue || totalRevenue;

  const unpaidInvoices = invoices.filter(i => (i.status || '').toLowerCase() === 'unpaid');
  const outstandingDebt = unpaidInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

  const totalRoomsCount = rooms.length;
  const occupiedRoomsCount = rooms.filter(r => (r.status || '').toLowerCase() === 'occupied').length;
  const occupancyPercentage = totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : (invoices.length > 0 ? 100 : 0);

  const totalElecFee = invoices.reduce((sum, i) => sum + (i.elecFee || 0), 0);
  const totalWaterFee = invoices.reduce((sum, i) => sum + (i.waterFee || 0), 0);

  const handleExportExcel = () => {
    const reportData = invoices.map(inv => {
      const room = rooms.find(r => r.id === inv.roomId);
      const isPaid = (inv.status || '').toLowerCase() === 'paid';
      return {
        'Mã Hóa Đơn': inv.invoiceCode,
        'Kỳ Tháng': inv.month,
        'Số Phòng': inv.roomNumber || (room ? room.roomNumber : inv.roomId),
        'Khách Thuê': inv.tenantName || 'Khách thuê',
        'Tiền Nhà': inv.rentFee,
        'Tiền Điện': inv.elecFee,
        'Tiền Nước': inv.waterFee,
        'Dịch Vụ': inv.serviceFee,
        'Tổng Tiền (VNĐ)': inv.totalAmount,
        'Trạng Thái': isPaid ? 'Đã thanh toán' : 'Chưa thanh toán',
        'Hạn Đóng': inv.dueDate,
      };
    });

    exportToExcel(reportData, `Bao_Cao_Doanh_Thu_SmartRent_${new Date().toISOString().split('T')[0]}.xlsx`, 'Doanh Thu');
  };

  const handleExportCsvBackend = async () => {
    try {
      setDownloadingCsv(true);
      const response = await reportService.exportFinancialCsv();
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bao_Cao_Tai_Chinh_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Lỗi tải file CSV: ' + (err.response?.data?.message || err.message));
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleExportPDF = () => {
    exportToPDF('report-pdf-area', `Bao_Cao_Tong_Hop_SmartRent.pdf`);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><BarChart3 size={24} color="#6366f1" /> Thống Kê & Báo Cáo Kinh Doanh</h2>
          <p className="page-subtitle">Xuất báo cáo Doanh thu, Chi phí, Công nợ và Tiêu thụ điện nước ra file Excel & PDF</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleExportCsvBackend} disabled={downloadingCsv}>
            <Download size={18} color="#0ea5e9" /> {downloadingCsv ? 'Đang xuất CSV...' : 'Xuất CSV'}
          </button>
          <button className="btn btn-secondary" onClick={handleExportExcel}>
            <FileSpreadsheet size={18} color="#10b981" /> Xuất Excel (.xlsx)
          </button>
          <button className="btn btn-primary" onClick={handleExportPDF}>
            <Printer size={18} /> In / Xuất PDF
          </button>
        </div>
      </div>

      <div id="report-pdf-area">
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon emerald"><DollarSign /></div>
            <div className="kpi-info">
              <h3>Tổng Doanh Thu Đã Thu</h3>
              <div className="value">{formatVND(revenueDisplay)}</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon rose"><AlertCircle /></div>
            <div className="kpi-info">
              <h3>Tổng Công Nợ Chưa Thu</h3>
              <div className="value" style={{ color: '#f87171' }}>{formatVND(outstandingDebt)}</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon cyan"><Home /></div>
            <div className="kpi-info">
              <h3>Tỷ Lệ Phòng Thuê</h3>
              <div className="value">{occupancyPercentage}%</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon amber"><Zap /></div>
            <div className="kpi-info">
              <h3>Tổng Tiền Điện & Nước</h3>
              <div className="value">{formatVND(totalElecFee + totalWaterFee)}</div>
            </div>
          </div>
        </div>

        {/* Report Table View */}
        <div className="card-table-container">
          <div className="table-toolbar">
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Bảng Báo Cáo Doanh Thu Chi Tiết Theo Phòng</h3>
          </div>

          <table className="custom-table">
            <thead>
              <tr>
                <th>Kỳ Tháng</th>
                <th>Phòng</th>
                <th>Khách Thuê</th>
                <th>Tiền Nhà</th>
                <th>Tiền Điện Nước</th>
                <th>Phí Dịch Vụ</th>
                <th>Tổng Cộng</th>
                <th>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Chưa có dữ liệu hóa đơn nào để lập báo cáo.
                  </td>
                </tr>
              ) : (
                invoices.map(inv => {
                  const room = rooms.find(r => r.id === inv.roomId);
                  const isPaid = (inv.status || '').toLowerCase() === 'paid';
                  return (
                    <tr key={inv.id}>
                      <td>{inv.month}</td>
                      <td><strong>Phòng {inv.roomNumber || (room ? room.roomNumber : inv.roomId)}</strong></td>
                      <td>{inv.tenantName || 'Khách thuê'}</td>
                      <td>{formatVND(inv.rentFee)}</td>
                      <td>{formatVND((inv.elecFee || 0) + (inv.waterFee || 0))}</td>
                      <td>{formatVND(inv.serviceFee)}</td>
                      <td><strong style={{ color: '#34d399' }}>{formatVND(inv.totalAmount)}</strong></td>
                      <td>
                        <span className={`status-pill ${isPaid ? 'occupied' : 'vacant'}`}>
                          {isPaid ? 'Đã thu' : 'Chưa thu'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
