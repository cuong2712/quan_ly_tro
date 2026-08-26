import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Upload, CheckCircle, Clock, Image as ImageIcon, Eye, 
  Copy, Check, RefreshCw
} from 'lucide-react';
import { formatVND, formatDate, getVietQRUrl } from '../../utils/formatters';
import { paymentService } from '../../services';

const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';

const getImageFullUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const TenantPayment = ({ activeTenant, invoices = [], payments = [], setPayments, onRefresh }) => {
  // Tìm hóa đơn chưa thanh toán đầu tiên làm mặc định
  const defaultInvoice = invoices.find(i => (i.status || '').toLowerCase() === 'unpaid') || invoices[0];
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(defaultInvoice?.id || '');
  const [submitting, setSubmitting] = useState(false);
  const [viewingProofPayment, setViewingProofPayment] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    if (invoices.length > 0 && !selectedInvoiceId) {
      const def = invoices.find(i => (i.status || '').toLowerCase() === 'unpaid') || invoices[0];
      setSelectedInvoiceId(def?.id || '');
    }
  }, [invoices]);

  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId) || defaultInvoice;

  const [proofImage, setProofImage] = useState('https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400');
  const [note, setNote] = useState('');
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);

  const amountToPay = selectedInvoice ? selectedInvoice.totalAmount : 0;
  const roomNum = selectedInvoice?.roomNumber || activeTenant?.roomNumber || '101';
  const transferContent = selectedInvoice ? `Phong ${roomNum} thanh toan ${selectedInvoice.invoiceCode}` : `Phong ${roomNum} thanh toan tien nha`;

  const qrUrl = getVietQRUrl({
    bankId: 'BIDV',
    accountNo: '6531211114',
    accountName: 'NGUYEN MANH CUONG',
    amount: amountToPay || 4000000,
    addInfo: transferContent,
  });

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Dung lượng ảnh vượt quá 10MB. Vui lòng chọn ảnh nhỏ hơn.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) {
      alert('Vui lòng chọn hóa đơn cần thanh toán.');
      return;
    }
    setSubmitting(true);
    try {
      let newPayment = null;
      if (paymentService && (paymentService.submitPayment || paymentService.submit)) {
        const fn = paymentService.submitPayment || paymentService.submit;
        newPayment = await fn({
          invoiceId: selectedInvoice.id,
          amount: amountToPay,
          method: 'VietQR',
          proofImageUrl: proofImage,
          note: note || 'Đã chuyển khoản thành công qua mã VietQR'
        });
      }

      if (newPayment && setPayments) {
        setPayments(prev => [newPayment, ...(Array.isArray(prev) ? prev : [])]);
      }

      setIsPaidSuccess(true);
      alert('✅ Đã gửi minh chứng thành công! Chủ trọ sẽ duyệt tiền sớm.');
      onRefresh?.();
    } catch (err) {
      alert('Lỗi gửi biên lai: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1380px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '18px' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={24} color="#6366f1" /> Thanh Toán Tiền Nhà
          </h2>
          <p className="page-subtitle" style={{ fontSize: '13px', margin: '4px 0 0 0', color: 'var(--text-muted)' }}>
            Quét mã QR ngân hàng và tải ảnh biên lai chuyển khoản để xác nhận thanh toán
          </p>
        </div>
      </div>

      {/* 2 Khung chính: QR Code & Form Gửi Biên Lai (Chiều cao bằng nhau) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', alignItems: 'stretch', marginBottom: '22px' }}>
        
        {/* CỘT TRÁI: MÃ QR VIETQR */}
        <div className="card-table-container" style={{ padding: '22px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--primary)' }}>
              MÃ QR THANH TOÁN VIETQR
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
              Mở app ngân hàng quét mã bên dưới để chuyển tự động
            </p>
          </div>

          {/* QR Image */}
          <div style={{ textAlign: 'center', marginBottom: '14px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', display: 'inline-block', border: '1px solid var(--border-color)' }}>
              <img src={qrUrl} alt="VietQR Code" style={{ width: '210px', height: '210px', display: 'block', margin: '0 auto' }} />
            </div>
          </div>

          {/* Chi tiết tài khoản */}
          <div style={{ background: 'var(--bg-dark, rgba(0,0,0,0.25))', padding: '14px 16px', borderRadius: '10px', fontSize: '13px', lineHeight: '1.7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ngân hàng:</span>
              <strong>BIDV</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-color)', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Số tài khoản:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ color: '#6366f1' }}>6531211114</strong>
                <button type="button" onClick={() => handleCopy('6531211114', 'STK')} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', height: '24px' }}>
                  {copiedField === 'STK' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Chủ tài khoản:</span>
              <strong>NGUYEN MANH CUONG</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-color)', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Số tiền:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ color: '#10b981', fontSize: '15px' }}>{formatVND(amountToPay)}</strong>
                <button type="button" onClick={() => handleCopy(amountToPay, 'Số tiền')} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', height: '24px' }}>
                  {copiedField === 'Số tiền' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Nội dung:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ fontSize: '12px' }}>{transferContent}</strong>
                <button type="button" onClick={() => handleCopy(transferContent, 'Nội dung')} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', height: '24px' }}>
                  {copiedField === 'Nội dung' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: FORM GỬI MINH CHỨNG */}
        <div className="card-table-container" style={{ padding: '22px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>
            Xác Nhận & Gửi Minh Chứng Chuyển Khoản
          </h3>

          {isPaidSuccess ? (
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '24px', borderRadius: '10px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ color: '#10b981', fontSize: '16px', margin: '0 0 6px 0' }}>Đã Gửi Minh Chứng Thành Công!</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                Hệ thống đã gửi biên lai tới Chủ trọ để kiểm tra và duyệt tiền.
              </p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsPaidSuccess(false)}>
                Gửi thêm biên lai khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleUploadPayment} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
              
              <div>
                {/* 1. Chọn hóa đơn */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>1. Chọn Hóa Đơn *</label>
                  <select
                    className="form-control"
                    required
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    style={{ height: '42px', padding: '6px 12px', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    {invoices.length === 0 ? (
                      <option value="">Không có hóa đơn nào</option>
                    ) : (
                      invoices.map(inv => {
                        const isPaid = (inv.status || '').toLowerCase() === 'paid';
                        return (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoiceCode} - Tháng {inv.month} ({formatVND(inv.totalAmount)}) {isPaid ? '✅ Đã trả' : '⏳ Chưa trả'}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                {/* 2. Upload file ảnh */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>2. Tải Ảnh Biên Lai / Bill Chuyển Khoản *</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control"
                    onChange={handleFileChange}
                    style={{ height: '42px', padding: '7px 12px', fontSize: '12.5px', cursor: 'pointer', boxSizing: 'border-box' }}
                  />
                  
                  {proofImage && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-dark, rgba(0,0,0,0.2))', padding: '10px 14px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                      <img src={getImageFullUrl(proofImage)} alt="Preview" style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover' }} />
                      <div style={{ fontSize: '12.5px', color: '#10b981', fontWeight: 600 }}>
                        <CheckCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
                        Đã chọn ảnh chụp màn hình bill
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Ghi chú */}
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>3. Ghi Chú (Tùy chọn)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="VD: Em đã chuyển khoản qua ngân hàng..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ fontSize: '13px', padding: '10px 12px', resize: 'vertical' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', height: '44px', fontSize: '14.5px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '10px' }} 
                disabled={submitting || !selectedInvoice}
              >
                <Upload size={18} /> {submitting ? '⏳ Đang gửi minh chứng...' : 'Gửi Minh Chứng Cho Chủ Trọ Duyệt'}
              </button>

            </form>
          )}
        </div>

      </div>

      {/* 📜 BẢNG LỊCH SỬ MINH CHỨNG */}
      <div className="card-table-container" style={{ padding: '18px 20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={17} color="#6366f1" /> Lịch Sử Minh Chứng Đã Gửi ({payments.length})
          </h3>
          {onRefresh && (
            <button className="btn btn-sm btn-secondary" onClick={onRefresh} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '12px' }}>
              <RefreshCw size={13} /> Làm mới
            </button>
          )}
        </div>

        {payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
            Bạn chưa gửi biên lai chuyển khoản nào.
          </div>
        ) : (
          <table className="custom-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 12px', fontSize: '13px' }}>MÃ HÓA ĐƠN</th>
                <th style={{ padding: '10px 12px', fontSize: '13px' }}>SỐ TIỀN</th>
                <th style={{ padding: '10px 12px', fontSize: '13px' }}>ẢNH BIÊN LAI</th>
                <th style={{ padding: '10px 12px', fontSize: '13px' }}>THỜI GIAN</th>
                <th style={{ padding: '10px 12px', fontSize: '13px' }}>TRẠNG THÁI DUYỆT</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => {
                const st = (p.status || '').toLowerCase();
                const isCompleted = st === 'completed';
                const isPending = st === 'pending' || st === 'pendingapproval' || st === 'pending_approval';
                const img = p.proofImageUrl || p.proofUrl || p.ProofImageUrl;

                return (
                  <tr key={p.id}>
                    <td style={{ padding: '10px 12px' }}>
                      <strong style={{ color: 'var(--primary)', fontSize: '13.5px' }}>{p.invoiceCode || p.invoiceId}</strong>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <strong style={{ color: '#10b981', fontSize: '14px' }}>{formatVND(p.amount)}</strong>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {img ? (
                        <div
                          onClick={() => setViewingProofPayment(p)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            padding: '3px 8px',
                            background: 'rgba(99, 102, 241, 0.08)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)'
                          }}
                          title="Bấm để xem ảnh phóng to"
                        >
                          <img src={getImageFullUrl(img)} alt="Bill" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
                          <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Eye size={12} /> Xem
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Không có</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '12.5px' }}>
                      {p.createdAt ? formatDate(p.createdAt) : ''}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`status-pill ${isCompleted ? 'occupied' : isPending ? 'pending' : 'vacant'}`} style={{ fontSize: '12px', padding: '3px 8px' }}>
                        {isCompleted ? '✅ Đã duyệt' : isPending ? '⏳ Chờ duyệt' : '❌ Bị từ chối'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 🖼️ MODAL XEM ẢNH BIÊN LAI PHÓNG TO */}
      {viewingProofPayment && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '540px', width: '95%', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', margin: 0, fontWeight: 700 }}>
                <ImageIcon size={16} color="#6366f1" /> Ảnh Biên Lai ({viewingProofPayment.invoiceCode || viewingProofPayment.invoiceId})
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewingProofPayment(null)} style={{ padding: '3px 6px' }}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '16px', textAlign: 'center', background: 'var(--bg-dark)' }}>
              <div style={{
                textAlign: 'left',
                background: 'var(--bg-card)',
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '14px',
                border: '1px solid var(--border-color)',
                fontSize: '12.5px',
                lineHeight: '1.7'
              }}>
                <div><strong>Hóa đơn:</strong> <span style={{ color: 'var(--primary)' }}>{viewingProofPayment.invoiceCode || viewingProofPayment.invoiceId}</span></div>
                <div><strong>Số tiền:</strong> <span style={{ color: '#10b981', fontWeight: 700 }}>{formatVND(viewingProofPayment.amount)}</span></div>
                <div><strong>Ghi chú:</strong> {viewingProofPayment.note || 'Không có'}</div>
                <div><strong>Thời gian:</strong> {formatDate(viewingProofPayment.createdAt)}</div>
              </div>

              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px', background: '#fff', display: 'inline-block', maxWidth: '100%' }}>
                <img
                  src={getImageFullUrl(viewingProofPayment.proofImageUrl || viewingProofPayment.proofUrl || viewingProofPayment.ProofImageUrl)}
                  alt="Biên lai"
                  style={{ maxHeight: '380px', maxWidth: '100%', borderRadius: '4px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '10px 16px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setViewingProofPayment(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

