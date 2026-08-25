import React, { useState, useEffect } from 'react';
import { CreditCard, Upload, CheckCircle, Clock, Image as ImageIcon, Eye } from 'lucide-react';
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

  const qrUrl = getVietQRUrl({
    bankId: 'BIDV',
    accountNo: '6531211114',
    accountName: 'NGUYEN MANH CUONG',
    amount: amountToPay || 4000000,
    addInfo: selectedInvoice ? `Phong ${roomNum} thanh toan ${selectedInvoice.invoiceCode}` : 'Thanh toan tien nha',
  });

  // Upload file ảnh trực tiếp từ thiết bị (máy tính / điện thoại)
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
      alert('✅ Đã gửi thông tin chuyển khoản & ảnh minh chứng thành công! Chủ trọ sẽ kiểm tra và duyệt tiền sớm.');
      onRefresh?.();
    } catch (err) {
      alert('Lỗi gửi biên lai thanh toán: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title"><CreditCard size={24} color="#6366f1" /> Thanh Toán Tiền Nhà Trực Tuyến</h2>
          <p className="page-subtitle">Quét mã VietQR ngân hàng tự động và tải ảnh minh chứng biên lai để xác minh với chủ trọ</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* VietQR Generator Card */}
        <div className="card-table-container" style={{ padding: '24px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--primary)' }}>
            MÃ QR THANH TOÁN VIETQR
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Mở ứng dụng Ngân hàng (MB, Vietcombank, Techcombank...) quét mã bên dưới
          </p>

          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', display: 'inline-block', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <img src={qrUrl} alt="VietQR Code" style={{ width: '220px', height: '220px', display: 'block' }} />
          </div>

          <div style={{ textAlign: 'left', background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', fontSize: '13px' }}>
            <div style={{ marginBottom: '4px' }}><strong>Ngân hàng:</strong> BIDV (Nội địa)</div>
            <div style={{ marginBottom: '4px' }}><strong>Số tài khoản:</strong> 6531211114</div>
            <div style={{ marginBottom: '4px' }}><strong>Chủ tài khoản:</strong> NGUYEN MANH CUONG</div>
            <div style={{ marginBottom: '4px' }}><strong>Hóa đơn chọn:</strong> <span style={{ color: '#6366f1', fontWeight: 700 }}>{selectedInvoice ? selectedInvoice.invoiceCode : 'Không có'}</span></div>
            <div><strong>Số tiền cần chuyển:</strong> <strong style={{ color: '#34d399', fontSize: '16px' }}>{formatVND(amountToPay)}</strong></div>
          </div>
        </div>

        {/* Upload Proof Card */}
        <div className="card-table-container" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
            Xác Nhận & Gửi Minh Chứng Chuyển Khoản
          </h3>

          {isPaidSuccess ? (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
              <CheckCircle size={48} color="#34d399" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ color: '#34d399', fontSize: '16px' }}>Đã Gửi Minh Chứng Thành Công!</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Hệ thống đã gửi ảnh minh chứng tới Chủ trọ. Bạn có thể theo dõi trạng thái duyệt ở bảng bên dưới.
              </p>
              <button
                className="btn btn-secondary"
                style={{ marginTop: '16px' }}
                onClick={() => setIsPaidSuccess(false)}
              >
                Gửi thêm biên lai khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleUploadPayment}>
              {/* Select Invoice Dropdown */}
              <div className="form-group">
                <label className="form-label">1. Chọn Hóa Đơn Muốn Thanh Toán *</label>
                <select
                  className="form-control"
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  style={{ fontSize: '13px', fontWeight: '600' }}
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

              {/* Upload Proof Image File */}
              <div className="form-group">
                <label className="form-label">2. Tải Ảnh Biên Lai / Bill Chuyển Khoản *</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control"
                  onChange={handleFileChange}
                  style={{ fontSize: '13px', cursor: 'pointer' }}
                />
                <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Chọn ảnh chụp màn hình ứng dụng ngân hàng
                </small>

                {/* Preview Box */}
                {proofImage && (
                  <div style={{ marginTop: '12px', textAlign: 'center', background: 'var(--bg-dark)', padding: '10px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <ImageIcon size={14} /> Xem trước ảnh minh chứng sẽ gửi cho Chủ trọ:
                    </div>
                    <img
                      src={getImageFullUrl(proofImage)}
                      alt="Ảnh biên lai minh chứng"
                      style={{ maxHeight: '140px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>

              {/* Note */}
              <div className="form-group">
                <label className="form-label">3. Ghi Chú (Tùy chọn)</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="VD: Em đã chuyển khoản thành công qua MBBank..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting || !selectedInvoice}>
                <Upload size={16} /> {submitting ? '⏳ Đang gửi minh chứng...' : 'Gửi Ảnh Minh Chứng Cho Chủ Trọ Duyệt'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 📜 BẢNG LỊCH SỬ MINH CHỨNG CHUYỂN KHOẢN ĐÃ GỬI CỦA KHÁCH */}
      <div className="card-table-container" style={{ marginTop: '24px', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} color="#6366f1" /> Lịch Sử Minh Chứng Chuyển Khoản Đã Gửi ({payments.length})
        </h3>

        {payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
            Bạn chưa gửi biên lai chuyển khoản nào.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã Hóa Đơn</th>
                <th>Số Tiền</th>
                <th>Ảnh Biên Lai</th>
                <th>Thời Gian Gửi</th>
                <th>Trạng Thái Duyệt Của Chủ Trọ</th>
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
                    <td><strong style={{ color: 'var(--primary)' }}>{p.invoiceCode || p.invoiceId}</strong></td>
                    <td><strong style={{ color: '#34d399' }}>{formatVND(p.amount)}</strong></td>
                    <td>
                      {img ? (
                        <div
                          onClick={() => setViewingProofPayment(p)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            background: 'rgba(99, 102, 241, 0.08)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            width: 'fit-content'
                          }}
                          title="Bấm để xem ảnh biên lai phóng to"
                        >
                          <img
                            src={getImageFullUrl(img)}
                            alt="Bill"
                            style={{ width: 34, height: 34, borderRadius: 4, objectFit: 'cover', border: '1px solid var(--border-color)' }}
                          />
                          <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Eye size={13} /> Xem ảnh
                          </span>
                        </div>
                      ) : 'Không có'}
                    </td>
                    <td>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : ''}</td>
                    <td>
                      <span className={`status-pill ${isCompleted ? 'occupied' : isPending ? 'pending' : 'vacant'}`}>
                        {isCompleted ? '✅ Chủ trọ đã duyệt' : isPending ? '⏳ Chờ chủ trọ duyệt' : '❌ Từ chối'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 🖼️ MODAL XEM ẢNH BIÊN LAI MINH CHỨNG PHÓNG TO CHO KHÁCH THUÊ */}
      {viewingProofPayment && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                <ImageIcon size={18} color="#6366f1" /> Ảnh Minh Chứng Chuyển Khoản ({viewingProofPayment.invoiceCode || viewingProofPayment.invoiceId})
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewingProofPayment(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-dark)' }}>
              <div style={{
                textAlign: 'left',
                background: 'var(--bg-card)',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                lineHeight: '1.7'
              }}>
                <div><strong>Hóa đơn:</strong> <span style={{ color: '#6366f1', fontWeight: 700 }}>{viewingProofPayment.invoiceCode || viewingProofPayment.invoiceId}</span></div>
                <div><strong>Số tiền:</strong> <span style={{ color: '#34d399', fontWeight: 800 }}>{formatVND(viewingProofPayment.amount)}</span></div>
                <div><strong>Ghi chú:</strong> {viewingProofPayment.note || 'Không có'}</div>
                <div><strong>Thời gian gửi:</strong> {formatDate(viewingProofPayment.createdAt)}</div>
                <div>
                  <strong>Trạng thái:</strong> {
                    (viewingProofPayment.status || '').toLowerCase() === 'completed'
                      ? '✅ Đã được chủ trọ duyệt'
                      : (viewingProofPayment.status || '').toLowerCase() === 'rejected'
                        ? '❌ Bị từ chối'
                        : '⏳ Đang chờ chủ trọ duyệt'
                  }
                </div>
              </div>

              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', background: '#fff', display: 'inline-block', maxWidth: '100%' }}>
                <img
                  src={getImageFullUrl(viewingProofPayment.proofImageUrl || viewingProofPayment.proofUrl || viewingProofPayment.ProofImageUrl)}
                  alt="Ảnh biên lai chuyển khoản"
                  style={{ maxHeight: '420px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '12px 20px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setViewingProofPayment(null)}>
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
