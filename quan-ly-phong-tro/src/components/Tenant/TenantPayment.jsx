import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Upload, CheckCircle, Clock, Image as ImageIcon, Eye, 
  Copy, Check, RefreshCw, Maximize2, ZoomIn, Download, X
} from 'lucide-react';
import { formatVND, formatDate, getVietQRUrl, VIETNAM_BANKS } from '../../utils/formatters';
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
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    if (!selectedInvoiceId && invoices.length > 0) {
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

  const landlordBank = selectedInvoice?.landlordBankName || 'BIDV';
  const landlordAccNo = selectedInvoice?.landlordBankAccountNumber || '6531211114';
  const landlordAccName = selectedInvoice?.landlordBankAccountName || 'NGUYEN MANH CUONG';

  const bankObj = VIETNAM_BANKS.find(b => b.code.toUpperCase() === landlordBank.toUpperCase() || b.shortName.toLowerCase() === landlordBank.toLowerCase()) || { shortName: landlordBank };
  const bankDisplay = bankObj.shortName || landlordBank;

  const qrUrl = getVietQRUrl({
    bankId: landlordBank,
    accountNo: landlordAccNo,
    accountName: landlordAccName,
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
    <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '24px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={26} color="#6366f1" /> Thanh Toán Tiền Nhà
          </h2>
          <p className="page-subtitle" style={{ fontSize: '13.5px', margin: '5px 0 0 0', color: 'var(--text-muted)' }}>
            Quét mã QR ngân hàng và tải ảnh biên lai chuyển khoản để xác nhận thanh toán
          </p>
        </div>
      </div>

      {/* 2 Khung chính: QR Code & Form Gửi Biên Lai (Kích thước to, rõ ràng, chiều cao bằng nhau) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px', alignItems: 'stretch', marginBottom: '26px' }}>
        
        {/* CỘT TRÁI: MÃ QR VIETQR (TO VÀ BẤM PHÓNG TO) */}
        <div className="card-table-container" style={{ padding: '26px 28px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--primary)', letterSpacing: '0.5px' }}>
              MÃ QR THANH TOÁN VIETQR
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Mở ứng dụng ngân hàng quét mã bên dưới để chuyển tiền tự động
            </p>
          </div>

          {/* QR Image Container với Nút Phóng To */}
          <div style={{ textAlign: 'center', marginBottom: '16px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div 
              onClick={() => setIsQrModalOpen(true)}
              style={{ 
                background: '#fff', 
                padding: '16px', 
                borderRadius: '16px', 
                display: 'inline-block', 
                border: '2px solid rgba(99, 102, 241, 0.3)', 
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                position: 'relative'
              }}
              className="qr-card-hover"
              title="🔍 Bấm để phóng to toàn màn hình mã QR"
            >
              <img src={qrUrl} alt="VietQR Code" style={{ width: '270px', height: '270px', display: 'block', margin: '0 auto' }} />
              
              {/* Badge phóng to ngay dưới ảnh */}
              <div style={{ marginTop: '8px', background: '#6366f1', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <ZoomIn size={14} /> Nhấn để phóng to QR
              </div>
            </div>
          </div>

          {/* Chi tiết tài khoản (Khung to, chữ lớn, dễ nhìn) */}
          <div style={{ background: 'var(--bg-dark, rgba(0,0,0,0.25))', padding: '16px 20px', borderRadius: '12px', fontSize: '14px', lineHeight: '1.8', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ngân hàng:</span>
              <strong style={{ fontSize: '14.5px' }}>{bankDisplay}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-color)', padding: '6px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Số tài khoản:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ color: '#6366f1', fontSize: '16px', letterSpacing: '0.5px' }}>{landlordAccNo}</strong>
                <button type="button" onClick={() => handleCopy(landlordAccNo, 'STK')} className="btn btn-sm btn-secondary" style={{ padding: '3px 8px', height: '26px' }} title="Sao chép số tài khoản">
                  {copiedField === 'STK' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', padding: '6px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Chủ tài khoản:</span>
              <strong style={{ fontSize: '14.5px' }}>{landlordAccName}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-color)', padding: '6px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Số tiền:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ color: '#10b981', fontSize: '17px', fontWeight: 800 }}>{formatVND(amountToPay)}</strong>
                <button type="button" onClick={() => handleCopy(amountToPay, 'Số tiền')} className="btn btn-sm btn-secondary" style={{ padding: '3px 8px', height: '26px' }} title="Sao chép số tiền">
                  {copiedField === 'Số tiền' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Nội dung:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{transferContent}</strong>
                <button type="button" onClick={() => handleCopy(transferContent, 'Nội dung')} className="btn btn-sm btn-secondary" style={{ padding: '3px 8px', height: '26px' }} title="Sao chép nội dung chuyển khoản">
                  {copiedField === 'Nội dung' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: FORM GỬI MINH CHỨNG (KÍCH THƯỚC TO RÕ) */}
        <div className="card-table-container" style={{ padding: '26px 28px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', letterSpacing: '0.5px' }}>
            Xác Nhận & Gửi Minh Chứng Chuyển Khoản
          </h3>

          {isPaidSuccess ? (
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '28px', borderRadius: '12px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <CheckCircle size={52} color="#10b981" style={{ margin: '0 auto 14px auto' }} />
              <h4 style={{ color: '#10b981', fontSize: '18px', margin: '0 0 8px 0', fontWeight: 800 }}>Đã Gửi Minh Chứng Thành Công!</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 18px 0' }}>
                Hệ thống đã gửi biên lai tới Chủ trọ để kiểm tra và duyệt tiền.
              </p>
              <button type="button" className="btn btn-secondary" onClick={() => setIsPaidSuccess(false)} style={{ padding: '8px 18px', fontSize: '13.5px', fontWeight: 600 }}>
                Gửi thêm biên lai khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleUploadPayment} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
              
              <div>
                {/* 1. Chọn hóa đơn */}
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label" style={{ fontSize: '14px', fontWeight: 700 }}>1. Chọn Hóa Đơn Cần Thanh Toán *</label>
                  <select
                    className="form-control"
                    required
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    style={{ height: '46px', padding: '8px 14px', fontSize: '14px', boxSizing: 'border-box', fontWeight: 600 }}
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
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label" style={{ fontSize: '14px', fontWeight: 700 }}>2. Tải Ảnh Biên Lai / Bill Chuyển Khoản *</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control"
                    onChange={handleFileChange}
                    style={{ height: '46px', padding: '9px 14px', fontSize: '13.5px', cursor: 'pointer', boxSizing: 'border-box' }}
                  />
                  
                  {proofImage && (
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-dark, rgba(0,0,0,0.2))', padding: '12px 16px', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                      <img src={getImageFullUrl(proofImage)} alt="Preview" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                      <div>
                        <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 700 }}>
                          <CheckCircle size={15} style={{ display: 'inline', marginRight: 5 }} />
                          Đã chọn ảnh chụp màn hình chuyển khoản
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bạn có thể chọn ảnh khác bất kỳ lúc nào</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Ghi chú */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontSize: '14px', fontWeight: 700 }}>3. Ghi Chú Cho Chủ Trọ (Tùy chọn)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="VD: Em đã chuyển khoản qua app ngân hàng lúc 14:30..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ fontSize: '13.5px', padding: '10px 14px', resize: 'vertical' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', height: '48px', fontSize: '15.5px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)' }} 
                disabled={submitting || !selectedInvoice}
              >
                <Upload size={20} /> {submitting ? '⏳ Đang gửi minh chứng...' : 'Gửi Minh Chứng Cho Chủ Trọ Duyệt'}
              </button>

            </form>
          )}
        </div>

      </div>

      {/* 📜 BẢNG LỊCH SỬ MINH CHỨNG (CHỮ TO RÕ, DỄ NHÌN) */}
      <div className="card-table-container" style={{ padding: '22px 24px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Clock size={20} color="#6366f1" /> Lịch Sử Minh Chứng Đã Gửi ({payments.length})
          </h3>
          {onRefresh && (
            <button className="btn btn-secondary" onClick={onRefresh} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '13px', fontWeight: 600, padding: '6px 14px' }}>
              <RefreshCw size={14} /> Làm mới
            </button>
          )}
        </div>

        {payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '14.5px' }}>
            Bạn chưa gửi biên lai chuyển khoản nào.
          </div>
        ) : (
          <table className="custom-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', fontSize: '13.5px', fontWeight: 700 }}>MÃ HÓA ĐƠN</th>
                <th style={{ padding: '12px 16px', fontSize: '13.5px', fontWeight: 700 }}>SỐ TIỀN</th>
                <th style={{ padding: '12px 16px', fontSize: '13.5px', fontWeight: 700 }}>ẢNH BIÊN LAI</th>
                <th style={{ padding: '12px 16px', fontSize: '13.5px', fontWeight: 700 }}>THỜI GIAN</th>
                <th style={{ padding: '12px 16px', fontSize: '13.5px', fontWeight: 700 }}>TRẠNG THÁI DUYỆT</th>
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
                    <td style={{ padding: '14px 16px' }}>
                      <strong style={{ color: 'var(--primary)', fontSize: '15px' }}>{p.invoiceCode || p.invoiceId}</strong>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <strong style={{ color: '#10b981', fontSize: '15.5px', fontWeight: 800 }}>{formatVND(p.amount)}</strong>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {img ? (
                        <div
                          onClick={() => setViewingProofPayment(p)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '4px 12px',
                            background: 'rgba(99, 102, 241, 0.12)',
                            borderRadius: '8px',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            transition: 'all 0.2s'
                          }}
                          title="Bấm để xem ảnh phóng to kích thước lớn"
                        >
                          <img src={getImageFullUrl(img)} alt="Bill" style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover' }} />
                          <span style={{ fontSize: 13, color: '#6366f1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Eye size={14} /> Xem ảnh to
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Không có</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      {p.createdAt ? formatDate(p.createdAt) : ''}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`status-pill ${isCompleted ? 'occupied' : isPending ? 'pending' : 'vacant'}`} style={{ fontSize: '13px', padding: '5px 12px', fontWeight: 700, borderRadius: '20px' }}>
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

      {/* 🖼️ MODAL XEM ẢNH BIÊN LAI PHÓNG TO (KÍCH THƯỚC LỚN, RÕ NÉT) */}
      {viewingProofPayment && (
        <div className="modal-overlay" style={{ zIndex: 1250 }} onClick={() => setViewingProofPayment(null)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '840px', width: '95%', padding: 0, overflow: 'hidden', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '17px', margin: 0, fontWeight: 800 }}>
                <ImageIcon size={20} color="#6366f1" /> Chi Tiết Biên Lai Thanh Toán ({viewingProofPayment.invoiceCode || viewingProofPayment.invoiceId})
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewingProofPayment(null)} style={{ padding: '4px 8px', borderRadius: '6px' }}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px', textAlign: 'center', background: 'var(--bg-dark)' }}>
              
              {/* Thông tin biên lai 4 cột */}
              <div style={{
                textAlign: 'left',
                background: 'var(--bg-card)',
                padding: '16px 20px',
                borderRadius: '12px',
                marginBottom: '18px',
                border: '1px solid var(--border-color)',
                fontSize: '13.5px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                lineHeight: '1.6'
              }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Mã hóa đơn:</span> <br /><strong style={{ color: 'var(--primary)', fontSize: '15px' }}>{viewingProofPayment.invoiceCode || viewingProofPayment.invoiceId}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Số tiền chuyển:</span> <br /><strong style={{ color: '#10b981', fontSize: '16px', fontWeight: 800 }}>{formatVND(viewingProofPayment.amount)}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Thời gian gửi:</span> <br /><strong>{formatDate(viewingProofPayment.createdAt)}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Trạng thái:</span> <br /><strong style={{ color: (viewingProofPayment.status || '').toLowerCase() === 'completed' ? '#10b981' : '#f59e0b' }}>{(viewingProofPayment.status || '').toLowerCase() === 'completed' ? '✅ Đã duyệt' : '⏳ Đang chờ duyệt'}</strong></div>
                {viewingProofPayment.note && (
                  <div style={{ gridColumn: '1 / -1', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Ghi chú:</span> <strong>{viewingProofPayment.note}</strong>
                  </div>
                )}
              </div>

              {/* Khung ảnh to lớn, sắc nét */}
              <div style={{ border: '2px solid rgba(99, 102, 241, 0.3)', borderRadius: '12px', padding: '10px', background: '#fff', display: 'inline-block', maxWidth: '100%', boxShadow: '0 6px 24px rgba(0,0,0,0.15)' }}>
                <img
                  src={getImageFullUrl(viewingProofPayment.proofImageUrl || viewingProofPayment.proofUrl || viewingProofPayment.ProofImageUrl)}
                  alt="Ảnh biên lai phóng to"
                  style={{ maxHeight: '540px', maxWidth: '100%', width: 'auto', height: 'auto', borderRadius: '8px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '14px 22px', justifyContent: 'space-between', background: 'var(--bg-card)' }}>
              <a
                href={getImageFullUrl(viewingProofPayment.proofImageUrl || viewingProofPayment.proofUrl || viewingProofPayment.ProofImageUrl)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Eye size={14} /> Mở ảnh gốc trong tab mới
              </a>
              <button className="btn btn-primary" onClick={() => setViewingProofPayment(null)} style={{ padding: '8px 24px', fontWeight: 700, fontSize: '14px' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 MODAL PHÓNG TO MÃ QR VIETQR */}
      {isQrModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1300 }} onClick={() => setIsQrModalOpen(false)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '540px', width: '95%', padding: 0, overflow: 'hidden', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '17px', margin: 0, fontWeight: 800, color: 'var(--primary)' }}>
                <Maximize2 size={18} color="#6366f1" /> Mã QR Thanh Toán (Phóng To)
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsQrModalOpen(false)} style={{ padding: '4px 8px', borderRadius: '6px' }}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '24px 20px', textAlign: 'center', background: 'var(--bg-dark)' }}>
              {/* QR Image Cực Lớn */}
              <div style={{ background: '#fff', padding: '18px', borderRadius: '16px', display: 'inline-block', border: '3px solid #6366f1', boxShadow: '0 8px 30px rgba(99, 102, 241, 0.25)', marginBottom: '18px' }}>
                <img
                  src={qrUrl}
                  alt="VietQR Code Large"
                  style={{ width: '330px', height: '330px', maxWidth: '100%', display: 'block', margin: '0 auto' }}
                />
              </div>

              {/* Hộp thông tin tài khoản nhanh kèm nút copy */}
              <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13.5px', textAlign: 'left', lineHeight: '1.8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Ngân hàng:</span>
                  <strong>{bankDisplay}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-color)', padding: '4px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Số tài khoản:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ color: '#6366f1', fontSize: '15px' }}>{landlordAccNo}</strong>
                    <button type="button" onClick={() => handleCopy(landlordAccNo, 'STK')} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', height: '24px' }}>
                      {copiedField === 'STK' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', padding: '4px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Chủ tài khoản:</span>
                  <strong>{landlordAccName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-color)', padding: '4px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Số tiền:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ color: '#10b981', fontSize: '16px', fontWeight: 800 }}>{formatVND(amountToPay)}</strong>
                    <button type="button" onClick={() => handleCopy(amountToPay, 'Số tiền')} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', height: '24px' }}>
                      {copiedField === 'Số tiền' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Nội dung:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '12.5px' }}>{transferContent}</strong>
                    <button type="button" onClick={() => handleCopy(transferContent, 'Nội dung')} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', height: '24px' }}>
                      {copiedField === 'Nội dung' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '12px 20px', justifyContent: 'space-between', background: 'var(--bg-card)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                💡 Quét trực tiếp trên màn hình bằng app ngân hàng
              </span>
              <button className="btn btn-secondary" onClick={() => setIsQrModalOpen(false)} style={{ padding: '7px 20px', fontWeight: 700 }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

