import React, { useState } from 'react';
import { CreditCard, QrCode, CheckCircle, Clock, Eye, Search, Image as ImageIcon, X, Check, ShieldAlert } from 'lucide-react';
import { formatVND, formatDate } from '../../utils/formatters';
import { paymentService } from '../../services';
import { Pagination } from '../Common/Pagination';

export const PaymentMgmt = ({ payments = [], setPayments, invoices = [], setInvoices, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'completed' | 'rejected'
  const [processing, setProcessing] = useState(false);
  const [viewingProofPayment, setViewingProofPayment] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  const filteredPayments = payments.filter(p => {
    const code = (p.invoiceCode || p.invoiceId || p.id || '').toLowerCase();
    const note = (p.note || '').toLowerCase();
    const matchesSearch = code.includes(searchTerm.toLowerCase()) || note.includes(searchTerm.toLowerCase());

    const statusLower = (p.status || '').toLowerCase();
    const isPending = statusLower === 'pendingapproval' || statusLower === 'pending_approval' || statusLower === 'pending';
    const isCompleted = statusLower === 'completed';
    const isRejected = statusLower === 'rejected';

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'pending' && isPending) ||
      (statusFilter === 'completed' && isCompleted) ||
      (statusFilter === 'rejected' && isRejected);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleConfirmPayment = async (paymentId, approve) => {
    const actionText = approve ? 'xác nhận duyệt tiền' : 'từ chối giao dịch';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText}?`)) return;

    setProcessing(true);
    try {
      if (paymentService && paymentService.confirm) {
        await paymentService.confirm(paymentId, { approve, note: approve ? 'Chủ trọ đã duyệt' : 'Từ chối' });
      }
      setPayments(payments.map(p => p.id === paymentId ? {
        ...p,
        status: approve ? 'Completed' : 'Rejected'
      } : p));
      alert(`✅ Đã ${actionText} thành công!`);
      setViewingProofPayment(null);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi xử lý thanh toán: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = payments.filter(p => {
    const st = (p.status || '').toLowerCase();
    return st === 'pending' || st === 'pendingapproval' || st === 'pending_approval';
  }).length;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title"><CreditCard size={24} color="#6366f1" /> Quản Lý Thanh Toán & Thu Tiền</h2>
          <p className="page-subtitle">Kiểm tra minh chứng chuyển khoản của khách thuê, xem ảnh biên lai ngân hàng và xác nhận duyệt tiền</p>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div
          className="card"
          onClick={() => setStatusFilter('all')}
          style={{
            padding: '18px 20px',
            cursor: 'pointer',
            borderRadius: '16px',
            border: statusFilter === 'all' ? '2px solid #6366f1' : '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng Giao Dịch</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{payments.length}</div>
        </div>

        <div
          className="card"
          onClick={() => setStatusFilter('pending')}
          style={{
            padding: '18px 20px',
            cursor: 'pointer',
            borderRadius: '16px',
            border: statusFilter === 'pending' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
            background: 'rgba(245,158,11,0.08)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
          }}
        >
          <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 700 }}>⏳ Chờ Duyệt Chuyển Khoản</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{pendingCount} giao dịch</div>
        </div>

        <div
          className="card"
          onClick={() => setStatusFilter('completed')}
          style={{
            padding: '18px 20px',
            cursor: 'pointer',
            borderRadius: '16px',
            border: statusFilter === 'completed' ? '2px solid #10b981' : '1px solid var(--border-color)',
            background: 'rgba(16,185,129,0.08)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
          }}
        >
          <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 700 }}>✅ Đã Xác Nhận Duyệt Tiền</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {payments.filter(p => (p.status || '').toLowerCase() === 'completed').length}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card-table-container">
        <div className="table-toolbar">
          <div className="search-input-group">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tìm theo mã hóa đơn, ghi chú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'pending', 'completed', 'rejected'].map(st => (
              <button
                key={st}
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'all' ? 'Tất cả' : st === 'pending' ? '⏳ Chờ duyệt' : st === 'completed' ? '✅ Thành công' : '❌ Từ chối'}
              </button>
            ))}
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã Hóa Đơn</th>
              <th>Số Tiền Thanh Toán</th>
              <th>Phương Thức</th>
              <th>Ảnh Biên Lai / Bill</th>
              <th>Thời Gian</th>
              <th>Ghi Chú Khách Gửi</th>
              <th>Trạng Thái</th>
              <th>Thao Tác Duyệt</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Chưa có giao dịch thanh toán nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              paginatedPayments.map((p) => {
                const statusLower = (p.status || '').toLowerCase();
                const isPending = statusLower === 'pendingapproval' || statusLower === 'pending_approval' || statusLower === 'pending';
                const isCompleted = statusLower === 'completed';
                const isRejected = statusLower === 'rejected';

                const proofUrl = p.proofImageUrl || p.proofUrl || p.ProofImageUrl;

                return (
                  <tr key={p.id}>
                    <td><strong style={{ color: 'var(--primary)' }}>{p.invoiceCode || p.invoiceId}</strong></td>
                    <td><strong style={{ color: '#34d399', fontSize: '15px' }}>{formatVND(p.amount)}</strong></td>
                    <td>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {p.method === 'VietQR' ? '⚡ Quét Mã VietQR' : p.method === 'Cash' ? '💵 Tiền Mặt' : '🏦 Chuyển Khoản'}
                      </span>
                    </td>

                    {/* 📸 HIỂN THỊ ẢNH THUMBNAIL & NÚT XEM CHI TIẾT */}
                    <td>
                      {proofUrl ? (
                        <div
                          onClick={() => setViewingProofPayment(p)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '8px',
                            width: 'fit-content'
                          }}
                          title="Bấm để xem ảnh biên lai phóng to"
                        >
                          <img
                            src={proofUrl}
                            alt="Biên lai"
                            style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Eye size={13} /> Xem Bill
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chưa có ảnh</span>
                      )}
                    </td>

                    <td>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : ''}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.note || 'Không có ghi chú'}</td>
                    <td>
                      <span className={`status-pill ${isCompleted ? 'occupied' : isPending ? 'pending' : 'vacant'}`}>
                        {isCompleted ? '✅ Thành công' : isPending ? '⏳ Chờ duyệt' : '❌ Từ chối'}
                      </span>
                    </td>
                    <td>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-sm btn-primary"
                            disabled={processing}
                            onClick={() => handleConfirmPayment(p.id, true)}
                            style={{ fontWeight: 700 }}
                          >
                            ✅ Duyệt
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            disabled={processing}
                            onClick={() => handleConfirmPayment(p.id, false)}
                          >
                            ❌ Từ chối
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 🖼️ MODAL XEM ẢNH BIÊN LAI XÁC MINH PHÓNG TO */}
      {viewingProofPayment && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: 0, overflow: 'hidden' }}>
            {/* Modal Header */}
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                <ImageIcon size={18} color="#6366f1" /> Ảnh Minh Chứng Chuyển Khoản: {viewingProofPayment.invoiceCode}
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewingProofPayment(null)}>✕</button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-dark)' }}>
              {/* Thông tin nhanh */}
              <div style={{
                textAlign: 'left', background: 'var(--bg-card)', padding: '14px', borderRadius: '10px',
                marginBottom: '16px', border: '1px solid var(--border-color)', fontSize: '13px', lineHeight: '1.7'
              }}>
                <div><strong>Mã Hóa Đơn:</strong> <span style={{ color: '#6366f1', fontWeight: 700 }}>{viewingProofPayment.invoiceCode}</span></div>
                <div><strong>Số tiền chuyển:</strong> <span style={{ color: '#34d399', fontWeight: 800, fontSize: '15px' }}>{formatVND(viewingProofPayment.amount)}</span></div>
                <div><strong>Phương thức:</strong> {viewingProofPayment.method === 'VietQR' ? '⚡ Quét mã VietQR Ngân hàng' : 'Chuyển khoản'}</div>
                <div><strong>Ghi chú từ khách:</strong> <em>"{viewingProofPayment.note || 'Không có ghi chú'}"</em></div>
              </div>

              {/* Phóng to ảnh biên lai */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px', background: '#fff', display: 'inline-block', maxWidth: '100%' }}>
                <img
                  src={viewingProofPayment.proofImageUrl || viewingProofPayment.proofUrl || viewingProofPayment.ProofImageUrl}
                  alt="Ảnh biên lai minh chứng"
                  style={{ maxHeight: '420px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>

            {/* Modal Footer với nút Duyệt / Từ chối trực tiếp */}
            <div className="modal-footer" style={{ padding: '16px 20px', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setViewingProofPayment(null)}>Đóng</button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-danger"
                  disabled={processing}
                  onClick={() => handleConfirmPayment(viewingProofPayment.id, false)}
                >
                  ❌ Từ Chối
                </button>
                <button
                  className="btn btn-primary"
                  disabled={processing}
                  onClick={() => handleConfirmPayment(viewingProofPayment.id, true)}
                  style={{ fontWeight: 700, padding: '10px 20px' }}
                >
                  ✅ Xác Nhận Duyệt Tiền Ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
