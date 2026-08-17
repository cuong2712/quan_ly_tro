import React, { useState } from 'react';
import { Receipt, Printer, Search, Eye, AlertTriangle, Send, X, CheckCircle, HelpCircle } from 'lucide-react';
import { formatVND, formatDate, exportToPDF } from '../../utils/formatters';
import { invoiceService } from '../../services';

export const TenantInvoice = ({ activeTenant, invoices = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [reportingInvoice, setReportingInvoice] = useState(null);
  const [reportForm, setReportForm] = useState({
    reason: 'Sai chỉ số điện / Tiền điện',
    description: '',
    imageUrl: '',
  });
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState('');

  const myInvoices = Array.isArray(invoices) ? invoices : [];
  const filtered = myInvoices.filter(i => 
    (i.invoiceCode || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.month || '').includes(searchTerm)
  );

  const handleOpenReport = (inv) => {
    setReportingInvoice(inv);
    setReportForm({
      reason: 'Sai chỉ số điện / Tiền điện',
      description: '',
      imageUrl: '',
    });
    setReportSuccess('');
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportingInvoice) return;
    if (!reportForm.description.trim()) {
      alert('Vui lòng nhập mô tả chi tiết sai sót để chủ trọ kiểm tra lại!');
      return;
    }

    setSubmittingReport(true);
    try {
      await invoiceService.reportInvoice(reportingInvoice.id, {
        reason: reportForm.reason,
        description: reportForm.description.trim(),
        imageUrl: reportForm.imageUrl.trim() || undefined,
      });

      setReportSuccess(`✅ Đã gửi báo cáo sai sót cho hóa đơn ${reportingInvoice.invoiceCode} tới Chủ trọ thành công! Chủ trọ sẽ nhận được thông báo để kiểm tra và điều chỉnh.`);
      setTimeout(() => {
        setReportingInvoice(null);
        setReportSuccess('');
      }, 3500);
    } catch (err) {
      alert('Lỗi gửi báo cáo sai sót: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Receipt size={24} color="#6366f1" /> Hóa Đơn Hàng Tháng Của Tôi</h2>
          <p className="page-subtitle">Xem danh sách hóa đơn, chi tiết tiền phòng, điện nước, tải file PDF và báo cáo khi chủ trọ tính sai</p>
        </div>
      </div>

      <div className="card-table-container">
        <div className="table-toolbar">
          <div className="search-input-group">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tìm theo kỳ tháng (VD: 2026-07) hoặc mã hóa đơn..."
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Không có dữ liệu hóa đơn nào phù hợp.
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const isPaid = (inv.status || '').toLowerCase() === 'paid';
                return (
                  <tr key={inv.id}>
                    <td><strong>{inv.invoiceCode}</strong></td>
                    <td>{inv.month}</td>
                    <td>{formatVND(inv.rentFee)}</td>
                    <td>{formatVND(Number(inv.elecFee || 0) + Number(inv.waterFee || 0))}</td>
                    <td><strong style={{ color: '#34d399', fontSize: '15px' }}>{formatVND(inv.totalAmount)}</strong></td>
                    <td>{formatDate(inv.dueDate)}</td>
                    <td>
                      <span className={`status-pill ${isPaid ? 'occupied' : 'vacant'}`}>
                        {isPaid ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => setSelectedInvoice(inv)}>
                          <Eye size={14} /> Chi tiết
                        </button>
                        <button 
                          className="btn btn-sm btn-secondary" 
                          style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                          title="Báo cáo chủ trọ nhập sai số điện, nước hoặc tiền phòng"
                          onClick={() => handleOpenReport(inv)}
                        >
                          <AlertTriangle size={14} /> Báo sai sót
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Chi Tiết Hóa Đơn: {selectedInvoice.invoiceCode}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setSelectedInvoice(null)}>✕</button>
            </div>
            <div className="modal-body" id="tenant-invoice-pdf" style={{ background: '#fff', color: '#1e293b', padding: '24px', borderRadius: '8px' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #6366f1', paddingBottom: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: '#6366f1', margin: 0 }}>HÓA ĐƠN THU TIỀN NHÀ PHÒNG {activeTenant.roomNumber ? `P.${activeTenant.roomNumber}` : ''}</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0' }}>Mã: {selectedInvoice.invoiceCode} | Kỳ tháng: {selectedInvoice.month}</p>
              </div>

              <div style={{ fontSize: '13px', lineHeight: '1.8', marginBottom: '16px' }}>
                <p><strong>Khách thuê:</strong> {activeTenant.fullName || activeTenant.name}</p>
                <p><strong>Phòng thuê:</strong> Phòng {selectedInvoice.roomNumber || activeTenant.roomNumber || 'Đang cập nhật'}</p>
                <p><strong>Ngày phát hành:</strong> {formatDate(selectedInvoice.createdAt)}</p>
                <p><strong>Hạn thanh toán:</strong> {formatDate(selectedInvoice.dueDate)}</p>
                <p><strong>Trạng thái:</strong> {(selectedInvoice.status || '').toLowerCase() === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</p>
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

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                onClick={() => {
                  const inv = selectedInvoice;
                  setSelectedInvoice(null);
                  handleOpenReport(inv);
                }}
              >
                <AlertTriangle size={16} /> Báo Cáo Nhập Sai Tiền / Chỉ Số
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>Đóng</button>
                <button className="btn btn-primary" onClick={() => exportToPDF('tenant-invoice-pdf', `${selectedInvoice.invoiceCode}.pdf`)}>
                  <Printer size={16} /> In / Xuất PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Báo Cáo Sai Sót Hóa Đơn (Report Issue Modal) */}
      {reportingInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                <AlertTriangle size={20} /> Báo Cáo Sai Sót Hóa Đơn: {reportingInvoice.invoiceCode}
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setReportingInvoice(null)}>✕</button>
            </div>

            {reportSuccess ? (
              <div className="modal-body" style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ color: '#10b981', fontSize: '15px', lineHeight: '1.6', marginBottom: '16px' }}>
                  {reportSuccess}
                </div>
                <button className="btn btn-primary" onClick={() => setReportingInvoice(null)}>Đóng cửa sổ</button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport}>
                <div className="modal-body">
                  {/* Tóm tắt thông tin hóa đơn */}
                  <div style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid var(--border-color)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '13px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Kỳ hóa đơn:</span>
                      <strong>Tháng {reportingInvoice.month}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Phòng:</span>
                      <strong>Phòng {reportingInvoice.roomNumber || activeTenant.roomNumber || 'Hiện tại'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Số tiền đang tính:</span>
                      <strong style={{ color: '#34d399' }}>{formatVND(reportingInvoice.totalAmount)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Hạn đóng tiền:</span>
                      <span>{formatDate(reportingInvoice.dueDate)}</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Loại Sai Sót / Vấn Đề Gặp Phải *</label>
                    <select
                      className="form-control"
                      value={reportForm.reason}
                      onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
                    >
                      <option value="Sai chỉ số điện / Tiền điện">⚡ Sai chỉ số điện / Tiền điện tính thừa</option>
                      <option value="Sai chỉ số nước / Tiền nước">💧 Sai chỉ số nước / Tiền nước tính thừa</option>
                      <option value="Sai tiền thuê phòng">🏠 Sai giá tiền thuê phòng so với hợp đồng</option>
                      <option value="Sai phí dịch vụ (rác, wifi, gửi xe...)">🛵 Sai phí dịch vụ (xe cộ, vệ sinh, internet)</option>
                      <option value="Đã thanh toán nhưng chưa cập nhật">💳 Đã chuyển khoản nhưng trạng thái chưa cập nhật</option>
                      <option value="Lý do khác">❓ Lý do khác</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mô Tả Chi Tiết Sai Sót & Số Liệu Thực Tế *</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      required
                      placeholder="VD: Chỉ số điện tháng này ghi nhầm từ 1250 thành 1520 kWh (chênh 270 kWh). Nhờ chủ trọ kiểm tra lại công tơ và xuất lại hóa đơn giúp em..."
                      value={reportForm.description}
                      onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Link Hình Ảnh Minh Chứng (Tùy chọn - Ví dụ ảnh công tơ điện/nước)</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://... (Link ảnh chụp công tơ hoặc sao kê thanh toán)"
                      value={reportForm.imageUrl}
                      onChange={(e) => setReportForm({ ...reportForm, imageUrl: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setReportingInvoice(null)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#f59e0b', borderColor: '#f59e0b' }} disabled={submittingReport}>
                    <Send size={16} /> {submittingReport ? '⏳ Đang gửi báo cáo...' : 'Gửi Báo Cáo Cho Chủ Trọ'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
