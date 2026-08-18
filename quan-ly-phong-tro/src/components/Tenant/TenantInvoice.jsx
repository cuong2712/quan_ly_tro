import React, { useState, useRef } from 'react';
import { 
  Receipt, Printer, Search, Eye, AlertTriangle, Send, X, 
  CheckCircle, HelpCircle, Upload, Image as ImageIcon, 
  Clock, Check, RefreshCw, MessageSquare, AlertCircle, Trash2
} from 'lucide-react';
import { formatVND, formatDate, exportToPDF } from '../../utils/formatters';
import { invoiceService, fileService } from '../../services';

const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';

const getImageFullUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const TenantInvoice = ({ activeTenant = {}, invoices = [], setInvoices, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [reportingInvoice, setReportingInvoice] = useState(null);
  const [viewingDisputeInvoice, setViewingDisputeInvoice] = useState(null);
  const [zoomedImageUrl, setZoomedImageUrl] = useState(null);

  // Form state
  const [reportForm, setReportForm] = useState({
    reason: 'Sai chỉ số điện / Tiền điện',
    description: '',
    imageUrl: '',
    suggestedElecNumber: '',
    suggestedWaterNumber: '',
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [cancellingDispute, setCancellingDispute] = useState(false);
  const [reportSuccess, setReportSuccess] = useState('');
  const fileInputRef = useRef(null);

  const myInvoices = Array.isArray(invoices) ? invoices : [];
  const filtered = myInvoices.filter(i => 
    (i.invoiceCode || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.month || '').includes(searchTerm) ||
    (i.disputeStatus || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenReport = (inv) => {
    if (inv.isReported && inv.disputeStatus) {
      setViewingDisputeInvoice(inv);
      return;
    }

    setReportingInvoice(inv);
    setReportForm({
      reason: 'Sai chỉ số điện / Tiền điện',
      description: '',
      imageUrl: '',
      suggestedElecNumber: '',
      suggestedWaterNumber: '',
    });
    setReportSuccess('');
  };

  // Upload file ảnh minh chứng trực tiếp từ máy (không dùng link)
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP...)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh tối đa là 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const res = await fileService.uploadDisputeProof(file);
      const url = res.url || res.data?.url || res;
      setReportForm(prev => ({ ...prev, imageUrl: url }));
    } catch (err) {
      alert('Lỗi tải ảnh lên: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setReportForm(prev => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      const payload = {
        reason: reportForm.reason,
        description: reportForm.description.trim(),
        imageUrl: reportForm.imageUrl.trim() || undefined,
        suggestedElecNumber: reportForm.suggestedElecNumber ? parseFloat(reportForm.suggestedElecNumber) : undefined,
        suggestedWaterNumber: reportForm.suggestedWaterNumber ? parseFloat(reportForm.suggestedWaterNumber) : undefined,
      };

      const updatedInv = await invoiceService.reportInvoice(reportingInvoice.id, payload);

      if (setInvoices) {
        setInvoices(myInvoices.map(i => i.id === reportingInvoice.id ? { ...i, ...updatedInv } : i));
      }

      setReportSuccess(`✅ Đã gửi yêu cầu kiểm tra lại hóa đơn ${reportingInvoice.invoiceCode} tới Chủ trọ thành công! Chủ trọ sẽ nhận được thông báo để kiểm tra và điều chỉnh.`);
      onRefresh?.();

      setTimeout(() => {
        setReportingInvoice(null);
        setReportSuccess('');
      }, 2500);
    } catch (err) {
      alert('Lỗi gửi báo cáo sai sót: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleCancelDispute = async (inv) => {
    if (!confirm(`Bạn có chắc chắn muốn hủy yêu cầu kiểm tra lại hóa đơn ${inv.invoiceCode}?`)) return;

    setCancellingDispute(true);
    try {
      const updatedInv = await invoiceService.cancelReportInvoice(inv.id);
      if (setInvoices) {
        setInvoices(myInvoices.map(i => i.id === inv.id ? { ...i, ...updatedInv } : i));
      }
      alert('✅ Đã hủy yêu cầu kiểm tra lại hóa đơn thành công!');
      setViewingDisputeInvoice(null);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi hủy yêu cầu: ' + (err.response?.data?.message || err.message));
    } finally {
      setCancellingDispute(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Receipt size={24} color="#6366f1" /> Hóa Đơn Hàng Tháng Của Tôi</h2>
          <p className="page-subtitle">Xem danh sách hóa đơn, chi tiết các khoản phí, tải file PDF và báo cáo sai sót cho chủ trọ kiểm tra lại</p>
        </div>
      </div>

      {/* Toolbar & Search */}
      <div className="card-table-container">
        <div className="table-toolbar">
          <div className="search-input-group">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tìm theo kỳ tháng (VD: 2026-07), mã hóa đơn, trạng thái..."
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
              <th>Điện Nước</th>
              <th>Dịch Vụ</th>
              <th>Tổng Số Tiền</th>
              <th>Hạn Đóng</th>
              <th>Trạng Thái</th>
              <th>Kiểm Tra / Khiếu Nại</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Không có dữ liệu hóa đơn nào phù hợp.
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const isPaid = (inv.status || '').toLowerCase() === 'paid';
                const isDisputed = inv.isReported && inv.disputeStatus;
                const isPendingDispute = inv.disputeStatus === 'Pending';
                const isResolvedDispute = inv.disputeStatus === 'Resolved';
                const isRejectedDispute = inv.disputeStatus === 'Rejected';

                return (
                  <tr key={inv.id} style={isPendingDispute ? { background: 'rgba(245, 158, 11, 0.05)' } : {}}>
                    <td><strong>{inv.invoiceCode}</strong></td>
                    <td>Tháng {inv.month}</td>
                    <td>{formatVND(inv.rentFee)}</td>
                    <td>{formatVND(Number(inv.elecFee || 0) + Number(inv.waterFee || 0))}</td>
                    <td style={{ color: '#6366f1', fontWeight: 600 }}>{formatVND(inv.serviceFee || 0)}</td>
                    <td>
                      <strong style={{ color: isPendingDispute ? '#f59e0b' : '#34d399', fontSize: '15px' }}>
                        {formatVND(inv.totalAmount)}
                      </strong>
                    </td>
                    <td>{formatDate(inv.dueDate)}</td>
                    <td>
                      <span className={`status-pill ${isPaid ? 'occupied' : 'vacant'}`}>
                        {isPaid ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}
                      </span>
                    </td>
                    <td>
                      {isPendingDispute ? (
                        <span 
                          className="status-pill" 
                          style={{ 
                            background: 'rgba(245, 158, 11, 0.15)', 
                            color: '#f59e0b', 
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <AlertTriangle size={12} /> Đang kiểm tra lại
                        </span>
                      ) : isResolvedDispute ? (
                        <span 
                          className="status-pill" 
                          style={{ 
                            background: 'rgba(16, 185, 129, 0.15)', 
                            color: '#10b981', 
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <CheckCircle size={12} /> Đã điều chỉnh
                        </span>
                      ) : isRejectedDispute ? (
                        <span 
                          className="status-pill" 
                          style={{ 
                            background: 'rgba(148, 163, 184, 0.15)', 
                            color: 'var(--text-muted)', 
                            border: '1px solid var(--border-color)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <MessageSquare size={12} /> Chủ trọ đã trả lời
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Bình thường</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button 
                          className="btn btn-sm btn-secondary" 
                          title="Xem chi tiết hóa đơn"
                          onClick={() => setSelectedInvoice(inv)}
                        >
                          <Eye size={14} /> Chi tiết
                        </button>
                        
                        {isDisputed ? (
                          <button 
                            className="btn btn-sm btn-secondary" 
                            style={{ 
                              color: isPendingDispute ? '#f59e0b' : '#6366f1', 
                              borderColor: isPendingDispute ? 'rgba(245, 158, 11, 0.4)' : 'rgba(99, 102, 241, 0.4)',
                              background: isPendingDispute ? 'rgba(245, 158, 11, 0.08)' : 'transparent'
                            }}
                            title="Xem chi tiết yêu cầu kiểm tra lại & phản hồi của chủ trọ"
                            onClick={() => setViewingDisputeInvoice(inv)}
                          >
                            <AlertCircle size={14} /> {isPendingDispute ? 'Xem yêu cầu' : 'Lịch sử báo sai'}
                          </button>
                        ) : (
                          <button 
                            className="btn btn-sm btn-secondary" 
                            style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                            title="Báo cáo chủ trọ nhập sai số điện, nước hoặc tiền phòng"
                            onClick={() => handleOpenReport(inv)}
                          >
                            <AlertTriangle size={14} /> Báo sai sót
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal 1: Invoice Detail Modal */}
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

              {selectedInvoice.disputeStatus === 'Pending' && (
                <div style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '14px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={18} color="#d97706" />
                  <div>
                    <strong>Đang yêu cầu kiểm tra lại:</strong> Lý do: {selectedInvoice.disputeReason}
                  </div>
                </div>
              )}

              {selectedInvoice.disputeStatus === 'Resolved' && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '14px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle size={18} color="#16a34a" />
                  <div>
                    <strong>Đã điều chỉnh theo khiếu nại:</strong> {selectedInvoice.disputeReply || 'Chủ trọ đã cập nhật số liệu mới.'}
                  </div>
                </div>
              )}

              <div style={{ fontSize: '13px', lineHeight: '1.8', marginBottom: '16px' }}>
                <p><strong>Khách thuê:</strong> {activeTenant.fullName || activeTenant.name}</p>
                <p><strong>Phòng thuê:</strong> Phòng {selectedInvoice.roomNumber || activeTenant.roomNumber || 'Đang cập nhật'}</p>
                <p><strong>Ngày phát hành:</strong> {formatDate(selectedInvoice.createdAt)}</p>
                <p><strong>Hạn thanh toán:</strong> {formatDate(selectedInvoice.dueDate)}</p>
                <p><strong>Trạng thái:</strong> {(selectedInvoice.status || '').toLowerCase() === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</p>
              </div>

              {/* BẢNG KÊ CHI TIẾT TỪNG KHOẢN TIỀN MINH BẠCH */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>Danh Mục Khoản Thu</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#475569', width: '110px' }}>Phân Loại</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', color: '#475569', width: '140px' }}>Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 1. Tiền phòng */}
                  <tr>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0' }}>
                      <strong>🏠 Tiền thuê phòng {selectedInvoice.roomNumber || ''}</strong>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>Cố định</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{formatVND(selectedInvoice.rentFee || 0)}</td>
                  </tr>

                  {/* 2. Tiền điện */}
                  <tr>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#d97706' }}>⚡ Tiền điện tiêu thụ</span>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>Theo đồng hồ</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{formatVND(selectedInvoice.elecFee || 0)}</td>
                  </tr>

                  {/* 3. Tiền nước */}
                  <tr>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#0284c7' }}>💧 Tiền nước tiêu thụ</span>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>Theo đồng hồ</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{formatVND(selectedInvoice.waterFee || 0)}</td>
                  </tr>

                  {/* 4. Danh sách các khoản tiền dịch vụ chi tiết từng mục */}
                  {(() => {
                    const serviceItems = selectedInvoice.items ? selectedInvoice.items.filter(it => 
                      !it.name.startsWith('Tiền thuê phòng') && 
                      !it.name.startsWith('Tiền điện') && 
                      !it.name.startsWith('Tiền nước')
                    ) : [];

                    if (serviceItems.length > 0) {
                      return serviceItems.map((sItem, sIdx) => (
                        <tr key={`svc-${sIdx}`} style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                          <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', paddingLeft: '20px' }}>
                            <span style={{ color: '#6366f1' }}>• {sItem.name}</span>
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#6366f1', fontSize: '12px' }}>Dịch vụ</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#4338ca', fontWeight: 600 }}>
                            {formatVND(sItem.amount || 0)}
                          </td>
                        </tr>
                      ));
                    } else if (selectedInvoice.serviceFee > 0) {
                      return (
                        <tr style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                          <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', paddingLeft: '20px' }}>
                            <span style={{ color: '#6366f1' }}>• Phí dịch vụ cố định (Wi-Fi, rác, vệ sinh...)</span>
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#6366f1', fontSize: '12px' }}>Dịch vụ</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#4338ca', fontWeight: 600 }}>
                            {formatVND(selectedInvoice.serviceFee)}
                          </td>
                        </tr>
                      );
                    }
                    return null;
                  })()}

                  {/* Tổng tiền dịch vụ subtotal nếu có */}
                  {selectedInvoice.serviceFee > 0 && (
                    <tr style={{ background: '#f8fafc', fontSize: '12.5px', color: '#475569' }}>
                      <td colSpan="2" style={{ padding: '6px 10px', borderBottom: '2px solid #cbd5e1', textAlign: 'right', fontStyle: 'italic' }}>
                        Tổng cộng phí dịch vụ:
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', fontWeight: 700, color: '#4338ca' }}>
                        {formatVND(selectedInvoice.serviceFee)}
                      </td>
                    </tr>
                  )}

                  {/* 5. TỔNG CỘNG THANH TOÁN */}
                  <tr style={{ background: '#ecfdf5', borderTop: '2px solid #10b981' }}>
                    <td colSpan="2" style={{ padding: '12px 10px', color: '#065f46' }}>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>TỔNG CỘNG CẦN THANH TOÁN</div>
                      <div style={{ fontSize: '11.5px', color: '#047857', marginTop: '2px' }}>
                        (Tiền phòng: {formatVND(selectedInvoice.rentFee || 0)} + Điện: {formatVND(selectedInvoice.elecFee || 0)} + Nước: {formatVND(selectedInvoice.waterFee || 0)} + DV: {formatVND(selectedInvoice.serviceFee || 0)})
                      </div>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#059669', fontSize: '18px', fontWeight: 800 }}>
                      {formatVND(selectedInvoice.totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              {!selectedInvoice.isReported ? (
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
              ) : (
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ color: '#6366f1', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                  onClick={() => {
                    const inv = selectedInvoice;
                    setSelectedInvoice(null);
                    setViewingDisputeInvoice(inv);
                  }}
                >
                  <AlertCircle size={16} /> Xem Tiến Độ Kiểm Tra Lại
                </button>
              )}

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

      {/* Modal 2: Form Gửi Báo Cáo Sai Sót Hóa Đơn (Upload ảnh trực tiếp) */}
      {reportingInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                <AlertTriangle size={20} /> Báo Cáo Sai Sót Hóa Đơn: {reportingInvoice.invoiceCode}
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setReportingInvoice(null)}>✕</button>
            </div>

            {reportSuccess ? (
              <div className="modal-body" style={{ padding: '28px', textAlign: 'center' }}>
                <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
                <div style={{ color: '#10b981', fontSize: '15px', lineHeight: '1.6', marginBottom: '20px', fontWeight: 600 }}>
                  {reportSuccess}
                </div>
                <button className="btn btn-primary" onClick={() => setReportingInvoice(null)}>Đóng cửa sổ</button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport}>
                <div className="modal-body">
                  {/* Tóm tắt thông tin hóa đơn đang xem */}
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
                      <span>Phòng thuê:</span>
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
                    <label className="form-label">Loại Sai Sót Cần Kiểm Tra *</label>
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

                  {/* Nhập chỉ số đề xuất nếu liên quan đến điện hoặc nước */}
                  {(reportForm.reason.includes('điện') || reportForm.reason.includes('nước')) && (
                    <div className="form-row">
                      {reportForm.reason.includes('điện') && (
                        <div className="form-group">
                          <label className="form-label">Chỉ Số Điện Thực Tế Trên Công Tơ (kWh)</label>
                          <input
                            type="number"
                            step="any"
                            className="form-control"
                            placeholder="VD: 1250"
                            value={reportForm.suggestedElecNumber}
                            onChange={(e) => setReportForm({ ...reportForm, suggestedElecNumber: e.target.value })}
                          />
                        </div>
                      )}
                      {reportForm.reason.includes('nước') && (
                        <div className="form-group">
                          <label className="form-label">Chỉ Số Nước Thực Tế Trên Đồng Hồ (Khối / m³)</label>
                          <input
                            type="number"
                            step="any"
                            className="form-control"
                            placeholder="VD: 45"
                            value={reportForm.suggestedWaterNumber}
                            onChange={(e) => setReportForm({ ...reportForm, suggestedWaterNumber: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Mô Tả Chi Tiết Sai Sót & Số Liệu Thực Tế *</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      required
                      placeholder="VD: Chỉ số điện tháng này ghi nhầm từ 1250 thành 1520 kWh (chênh 270 kWh). Nhờ chủ trọ xem lại ảnh chụp công tơ và điều chỉnh lại hóa đơn giúp em..."
                      value={reportForm.description}
                      onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    ></textarea>
                  </div>

                  {/* Tải ảnh minh chứng trực tiếp từ thiết bị */}
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Ảnh Minh Chứng Trực Tiếp (Ảnh chụp công tơ, đồng hồ, biên lai)</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tối đa 5MB</span>
                    </label>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageFileChange}
                    />

                    {!reportForm.imageUrl ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          border: '2px dashed var(--border-color)',
                          borderRadius: '8px',
                          padding: '24px 16px',
                          textAlign: 'center',
                          cursor: uploadingImage ? 'not-allowed' : 'pointer',
                          background: 'var(--bg-dark)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {uploadingImage ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#6366f1' }}>
                            <RefreshCw className="spin" size={24} />
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>Đang tải ảnh lên máy chủ...</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Upload size={28} color="#6366f1" />
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              Bấm để chọn hoặc chụp ảnh trực tiếp từ máy
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Chấp nhận định dạng: JPG, PNG, WEBP
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        position: 'relative',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '10px',
                        background: 'var(--bg-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px'
                      }}>
                        <img
                          src={getImageFullUrl(reportForm.imageUrl)}
                          alt="Minh chứng"
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                          onClick={() => setZoomedImageUrl(getImageFullUrl(reportForm.imageUrl))}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Đã tải ảnh minh chứng lên thành công
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                            {reportForm.imageUrl}
                          </div>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '2px 8px', fontSize: '11px' }}
                              onClick={() => setZoomedImageUrl(getImageFullUrl(reportForm.imageUrl))}
                            >
                              <Eye size={12} /> Xem phóng to
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '2px 8px', fontSize: '11px' }}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              Đổi ảnh khác
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              style={{ padding: '2px 8px', fontSize: '11px' }}
                              onClick={handleRemoveImage}
                            >
                              <Trash2 size={12} /> Xóa ảnh
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setReportingInvoice(null)}>
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ background: '#f59e0b', borderColor: '#f59e0b' }} 
                    disabled={submittingReport || uploadingImage}
                  >
                    <Send size={16} /> {submittingReport ? '⏳ Đang gửi yêu cầu...' : 'Gửi Báo Cáo Cho Chủ Trọ'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: Xem Tiến Độ & Chi Tiết Khiếu Nại Đã Gửi */}
      {viewingDisputeInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} color="#6366f1" /> Tiến Độ Kiểm Tra Hóa Đơn: {viewingDisputeInvoice.invoiceCode}
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewingDisputeInvoice(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Trạng thái xử lý */}
              <div style={{
                padding: '14px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: viewingDisputeInvoice.disputeStatus === 'Pending' 
                  ? 'rgba(245, 158, 11, 0.12)' 
                  : viewingDisputeInvoice.disputeStatus === 'Resolved'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(148, 163, 184, 0.12)',
                border: `1px solid ${
                  viewingDisputeInvoice.disputeStatus === 'Pending' 
                    ? 'rgba(245, 158, 11, 0.3)' 
                    : viewingDisputeInvoice.disputeStatus === 'Resolved'
                      ? 'rgba(16, 185, 129, 0.3)'
                      : 'var(--border-color)'
                }`
              }}>
                {viewingDisputeInvoice.disputeStatus === 'Pending' ? (
                  <>
                    <Clock size={24} color="#f59e0b" />
                    <div>
                      <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '14px' }}>⏳ Đang chờ Chủ trọ kiểm tra & phản hồi</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Yêu cầu gửi lúc: {formatDate(viewingDisputeInvoice.disputeCreatedAt || viewingDisputeInvoice.createdAt)}</div>
                    </div>
                  </>
                ) : viewingDisputeInvoice.disputeStatus === 'Resolved' ? (
                  <>
                    <CheckCircle size={24} color="#10b981" />
                    <div>
                      <div style={{ fontWeight: 700, color: '#10b981', fontSize: '14px' }}>✅ Chủ trọ đã chấp nhận & điều chỉnh hóa đơn</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Xử lý lúc: {formatDate(viewingDisputeInvoice.disputeResolvedAt)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <MessageSquare size={24} color="var(--text-muted)" />
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>ℹ️ Chủ trọ đã gửi phản hồi giải thích</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Phản hồi lúc: {formatDate(viewingDisputeInvoice.disputeResolvedAt)}</div>
                    </div>
                  </>
                )}
              </div>

              {/* Chi tiết nội dung khách đã báo */}
              <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Thông tin bạn đã gửi cho chủ trọ:
                </h4>
                <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                  <div><strong>Lý do sai sót:</strong> <span style={{ color: '#f59e0b' }}>{viewingDisputeInvoice.disputeReason}</span></div>
                  <div><strong>Nội dung chi tiết:</strong> {viewingDisputeInvoice.disputeDescription}</div>
                  {viewingDisputeInvoice.suggestedElecNumber && (
                    <div><strong>Chỉ số điện thực tế đề xuất:</strong> {viewingDisputeInvoice.suggestedElecNumber} kWh</div>
                  )}
                  {viewingDisputeInvoice.suggestedWaterNumber && (
                    <div><strong>Chỉ số nước thực tế đề xuất:</strong> {viewingDisputeInvoice.suggestedWaterNumber} m³</div>
                  )}
                </div>

                {/* Ảnh minh chứng trực tiếp */}
                {viewingDisputeInvoice.disputeImageUrl && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      Ảnh minh chứng đã gửi (Bấm để xem phóng to):
                    </div>
                    <div 
                      onClick={() => setZoomedImageUrl(getImageFullUrl(viewingDisputeInvoice.disputeImageUrl))}
                      style={{ cursor: 'pointer', display: 'inline-block' }}
                    >
                      <img
                        src={getImageFullUrl(viewingDisputeInvoice.disputeImageUrl)}
                        alt="Ảnh minh chứng"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '220px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          objectFit: 'contain',
                          background: '#000',
                          display: 'block'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Phản hồi từ chủ trọ */}
              {viewingDisputeInvoice.disputeReply && (
                <div style={{
                  background: viewingDisputeInvoice.disputeStatus === 'Resolved' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid var(--border-color)',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '13px'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={16} color="#6366f1" /> Lời nhắn từ Chủ Trọ:
                  </div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {viewingDisputeInvoice.disputeReply}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              {viewingDisputeInvoice.disputeStatus === 'Pending' ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={cancellingDispute}
                  onClick={() => handleCancelDispute(viewingDisputeInvoice)}
                >
                  <Trash2 size={14} /> {cancellingDispute ? 'Đang hủy...' : 'Hủy Yêu Cầu Kiểm Tra Này'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ color: '#f59e0b' }}
                  onClick={() => {
                    const inv = viewingDisputeInvoice;
                    setViewingDisputeInvoice(null);
                    setReportingInvoice(inv);
                    setReportForm({
                      reason: 'Sai chỉ số điện / Tiền điện',
                      description: '',
                      imageUrl: '',
                      suggestedElecNumber: '',
                      suggestedWaterNumber: '',
                    });
                  }}
                >
                  <AlertTriangle size={14} /> Gửi Báo Cáo Mới
                </button>
              )}

              <button type="button" className="btn btn-secondary" onClick={() => setViewingDisputeInvoice(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Phóng to ảnh minh chứng (Lightbox) */}
      {zoomedImageUrl && (
        <div className="modal-overlay" onClick={() => setZoomedImageUrl(null)}>
          <div className="modal-content" style={{ maxWidth: '800px', padding: '16px', background: '#0f172a', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Xem Ảnh Minh Chứng Phóng To</span>
              <button className="btn btn-sm btn-secondary" onClick={() => setZoomedImageUrl(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
              <img
                src={zoomedImageUrl}
                alt="Minh chứng chi tiết"
                style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '8px', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
