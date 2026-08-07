import React, { useState } from 'react';
import { Receipt, Printer, Search, Eye } from 'lucide-react';
import { formatVND, formatDate, exportToPDF } from '../../utils/formatters';

export const TenantInvoice = ({ activeTenant, invoices }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const myInvoices = Array.isArray(invoices) ? invoices : [];
  const filtered = myInvoices.filter(i => (i.invoiceCode || '').toLowerCase().includes(searchTerm.toLowerCase()) || (i.month || '').includes(searchTerm));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Receipt size={24} color="#6366f1" /> Hóa Đơn Hàng Tháng Của Tôi</h2>
          <p className="page-subtitle">Xem danh sách hóa đơn, chi tiết tiền phòng, điện nước và tải file PDF</p>
        </div>
      </div>

      <div className="card-table-container">
        <div className="table-toolbar">
          <div className="search-input-group">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tìm theo kỳ tháng (VD: 2026-07)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã Hóa Đơn</th>
              <th>Kỳ Tháng</th>
              <th>Tiền Nhà</th>
              <th>Tiền Điện Nước</th>
              <th>Tổng Số Tiền</th>
              <th>Hạn Đóng</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.id}>
                <td><strong>{inv.invoiceCode}</strong></td>
                <td>{inv.month}</td>
                <td>{formatVND(inv.rentFee)}</td>
                <td>{formatVND(inv.elecFee + inv.waterFee)}</td>
                <td><strong style={{ color: '#34d399', fontSize: '15px' }}>{formatVND(inv.totalAmount)}</strong></td>
                <td>{formatDate(inv.dueDate)}</td>
                <td>
                  <span className={`status-pill ${(inv.status || '').toLowerCase() === 'paid' ? 'occupied' : 'vacant'}`}>
                    {(inv.status || '').toLowerCase() === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={() => setSelectedInvoice(inv)}>
                    <Eye size={14} /> Xem & In PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Chi Tiết Hóa Đơn: {selectedInvoice.invoiceCode}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setSelectedInvoice(null)}>X</button>
            </div>
            <div className="modal-body" id="tenant-invoice-pdf" style={{ background: '#fff', color: '#1e293b', padding: '24px', borderRadius: '8px' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #6366f1', paddingBottom: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: '#6366f1', margin: 0 }}>HÓA ĐƠN THU TIỀN NHÀ PHÒNG P.101</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0' }}>Mã: {selectedInvoice.invoiceCode} | Kỳ tháng: {selectedInvoice.month}</p>
              </div>

              <div style={{ fontSize: '13px', lineHeight: '1.8', marginBottom: '16px' }}>
                <p><strong>Khách thuê:</strong> {activeTenant.name}</p>
                <p><strong>Ngày phát hành:</strong> {formatDate(selectedInvoice.createdAt)}</p>
                <p><strong>Hạn thanh toán:</strong> {formatDate(selectedInvoice.dueDate)}</p>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Khoản Chi Tiết</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #cbd5e1' }}>Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                    selectedInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>{item.name}</td>
                        <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{formatVND(item.amount || 0)}</td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr><td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Tiền thuê phòng</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{formatVND(selectedInvoice.rentFee)}</td></tr>
                      <tr><td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Tiền điện</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{formatVND(selectedInvoice.elecFee)}</td></tr>
                      <tr><td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Tiền nước</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{formatVND(selectedInvoice.waterFee)}</td></tr>
                      <tr><td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Phí dịch vụ</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{formatVND(selectedInvoice.serviceFee)}</td></tr>
                    </>
                  )}
                </tbody>
              </table>

              <div style={{ textAlign: 'right', fontSize: '16px', fontWeight: 'bold', color: '#4338ca' }}>
                TỔNG CỘNG: {formatVND(selectedInvoice.totalAmount)}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>Đóng</button>
              <button className="btn btn-primary" onClick={() => exportToPDF('tenant-invoice-pdf', `${selectedInvoice.invoiceCode}.pdf`)}>
                <Printer size={16} /> In / Xuất PDF Hóa Đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
