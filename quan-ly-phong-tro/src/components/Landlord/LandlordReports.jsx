import React, { useState, useEffect } from 'react';
import { BarChart3, Download, FileSpreadsheet, Printer, DollarSign, AlertCircle, Home, Zap, Users } from 'lucide-react';
import { formatVND, exportToExcel, exportToPDF } from '../../utils/formatters';
import { reportService } from '../../services';

export const LandlordReports = ({ data = {} }) => {
  const invoices = Array.isArray(data.invoices) ? data.invoices : [];
  const rooms = Array.isArray(data.rooms) ? data.rooms : [];
  const tenants = Array.isArray(data.tenants) ? data.tenants : [];

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    pendingRevenue: 0,
    totalCollectedInvoices: 0,
    totalPendingInvoices: 0
  });

  useEffect(() => {
    reportService.getFinancialSummary()
      .then(res => {
        if (res) {
          setSummary({
            totalRevenue: res.totalRevenue || 0,
            pendingRevenue: res.pendingRevenue || 0,
            totalCollectedInvoices: res.totalCollectedInvoices || 0,
            totalPendingInvoices: res.totalPendingInvoices || 0
          });
        }
      })
      .catch(err => console.warn('Get summary error:', err));
  }, []);

  const handleExportExcelServer = async () => {
    try {
      const response = await reportService.exportExcel();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bao_Cao_Tai_Chinh_SmartRent_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      // Fallback local export
      handleExportExcel();
    }
  };

  const handleExportExcel = () => {
    const reportData = invoices.map(inv => {
      const room = rooms.find(r => r.id === inv.roomId);
      const tenant = tenants.find(t => t.id === inv.tenantId);
      return {
        'Mã Hóa Đơn': inv.invoiceCode,
        'Kỳ Tháng': inv.month,
        'Số Phòng': room ? room.roomNumber : inv.roomId,
        'Khách Thuê': tenant ? (tenant.fullName || tenant.name) : 'N/A',
        'Tiền Nhà': inv.rentFee,
        'Tiền Điện': inv.elecFee,
        'Tiền Nước': inv.waterFee,
        'Dịch Vụ': inv.serviceFee,
        'Tổng Tiền (VND)': inv.totalAmount,
        'Trạng Thái': inv.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán',
        'Hạn Đóng': inv.dueDate,
      };
    });

    exportToExcel(reportData, `Bao_Cao_Doanh_Thu_SmartRent_${new Date().toISOString().split('T')[0]}.xlsx`, 'Doanh Thu');
  };

  const handleExportPDF = () => {
    exportToPDF('report-pdf-area', `Bao_Cao_Tong_Hop_SmartRent.pdf`);
  };

  const totalCollected = summary.totalRevenue || invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalPending = summary.pendingRevenue || invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.totalAmount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><BarChart3 size={24} color="#6366f1" /> Thống Kê & Báo Cáo Kinh Doanh</h2>
          <p className="page-subtitle">Xuất báo cáo Doanh thu, Chi phí, Công nợ và Tiêu thụ điện nước ra file Excel & PDF</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleExportExcelServer}>
            <FileSpreadsheet size={18} color="#10b981" /> Xuất Báo Cáo Excel / CSV
          </button>
          <button className="btn btn-primary" onClick={handleExportPDF}>
            <Printer size={18} /> Xuất Báo Cáo PDF
          </button>
        </div>
      </div>

      <div id="report-pdf-area">
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon emerald"><DollarSign /></div>
            <div className="kpi-info">
              <h3>Tổng Đã Thu</h3>
              <div className="value">{formatVND(totalCollected)}</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon rose"><AlertCircle /></div>
            <div className="kpi-info">
              <h3>Chưa Thu / Công Nợ</h3>
              <div className="value" style={{ color: '#f87171' }}>{formatVND(totalPending)}</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon cyan"><Home /></div>
            <div className="kpi-info">
              <h3>Hóa Đơn Đã Thu</h3>
              <div className="value">{summary.totalCollectedInvoices || invoices.filter(i => i.status === 'paid').length} HĐ</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon amber"><Zap /></div>
            <div className="kpi-info">
              <h3>Hóa Đơn Chưa Thu</h3>
              <div className="value" style={{ color: '#f59e0b' }}>{summary.totalPendingInvoices || invoices.filter(i => i.status !== 'paid').length} HĐ</div>
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
              {invoices.map(inv => {
                const room = rooms.find(r => r.id === inv.roomId);
                const tenant = tenants.find(t => t.id === inv.tenantId);
                return (
                  <tr key={inv.id}>
                    <td>{inv.month}</td>
                    <td><strong>{room ? room.roomNumber : inv.roomId}</strong></td>
                    <td>{tenant ? (tenant.fullName || tenant.name) : 'Khách thuê'}</td>
                    <td>{formatVND(inv.rentFee)}</td>
                    <td>{formatVND((inv.elecFee || 0) + (inv.waterFee || 0))}</td>
                    <td>{formatVND(inv.serviceFee || 0)}</td>
                    <td><strong style={{ color: '#34d399' }}>{formatVND(inv.totalAmount)}</strong></td>
                    <td>
                      <span className={`status-pill ${inv.status}`}>
                        {inv.status === 'paid' ? 'Đã thu' : 'Chưa thu'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
