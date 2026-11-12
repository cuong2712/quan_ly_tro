import React, { useState } from 'react';
import { CreditCard, Eye, Search, Image as ImageIcon, Zap, CheckCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { formatVND } from '../../utils/formatters';
import { paymentService } from '../../services';
import { Pagination } from '../Common/Pagination';

export const PaymentMgmt = ({ payments = [], setPayments, invoices = [], setInvoices, rooms = [], profile = {}, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'completed' | 'rejected'
  const [processing, setProcessing] = useState(false);
  const [viewingProofPayment, setViewingProofPayment] = useState(null);

  // Modal test giả lập tự động gạch nợ
  const [showSimModal, setShowSimModal] = useState(false);
  const [simType, setSimType] = useState('deposit'); // 'deposit' | 'invoice'
  const [simRoomId, setSimRoomId] = useState(rooms[0]?.id || '');
  const [simInvoiceId, setSimInvoiceId] = useState('');
  const [simAmount, setSimAmount] = useState('500000');
  const [simPhone, setSimPhone] = useState('0987654321');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  // Lấy ngân hàng của chủ trọ đang đăng nhập
  const bankName = profile?.bankName || 'MBBank';
  const bankAccNo = profile?.bankAccountNumber || '0379513393';
  const bankAccName = profile?.bankAccountName || profile?.fullName || 'LÊ THỊ THÙY GIANG';

  const unpaidInvoices = (Array.isArray(invoices) ? invoices : (invoices?.items || [])).filter(
    i => (i.status || '').toLowerCase() !== 'paid'
  );

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

  const handleRunSimulation = async () => {
    setSimLoading(true);
    setSimResult(null);
    try {
      let res;
      if (simType === 'deposit') {
        const targetRoom = simRoomId || rooms[0]?.id;
        if (!targetRoom) {
          alert('Chưa có phòng nào để thử nghiệm cọc');
          return;
        }
        res = await paymentService.simulateDeposit(targetRoom, {
          amount: Number(simAmount) || 500000,
          tenantPhone: simPhone || '0987654321',
          tenantName: 'Khách cọc (Test)'
        });
      } else {
        const targetInv = simInvoiceId || unpaidInvoices[0]?.id;
        if (!targetInv) {
          alert('Hiện không có hóa đơn chưa thanh toán nào để gạch nợ');
          return;
        }
        res = await paymentService.simulateAutoPaid(targetInv);
      }
      setSimResult(res?.data || res);
      onRefresh?.();
      try {
        const newPayments = await paymentService.getPayments();
        if (Array.isArray(newPayments)) setPayments(newPayments);
        else if (newPayments?.items) setPayments(newPayments.items);
      } catch {}
    } catch (err) {
      alert('Lỗi giả lập gạch nợ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSimLoading(false);
    }
  };

  const pendingCount = payments.filter(p => {
    const st = (p.status || '').toLowerCase();
    return st === 'pending' || st === 'pendingapproval' || st === 'pending_approval';
  }).length;

  const completedCount = payments.filter(p => (p.status || '').toLowerCase() === 'completed').length;
  const rejectedCount = payments.filter(p => (p.status || '').toLowerCase() === 'rejected').length;

  return (
    <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '24px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={26} color="#6366f1" /> Quản Lý Thanh Toán & Thu Tiền
          </h2>
          <p className="page-subtitle" style={{ fontSize: '13.5px', margin: '3px 0 0 0' }}>
            Kiểm tra minh chứng chuyển khoản của khách thuê, xem ảnh biên lai ngân hàng và xác nhận duyệt tiền
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => { setSimResult(null); setShowSimModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', fontWeight: '700', borderRadius: '10px', padding: '9px 18px', cursor: 'pointer' }}
          >
            <Zap size={18} /> Test Gạch Nợ Tự Động
          </button>
        </div>
      </div>

      {/* Banner Tự Động Gạch Nợ Thông Minh 24/7 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 500px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: '#10b981',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
          }}>
            <ShieldCheck size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '15.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                ⚡ Hệ Thống Tự Động Gạch Nợ 24/7 (Đang Hoạt Động)
              </span>
              <span style={{
                background: '#10b981',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '12px',
                textTransform: 'uppercase'
              }}>
                Live Webhook
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
              Tài khoản nhận: <strong style={{ color: '#10b981' }}>{bankName}</strong> | STK: <strong style={{ color: 'var(--text-primary)' }}>{bankAccNo}</strong> ({bankAccName}) — Tự động gạch nợ ngay khi có tiền về cho cả <strong style={{ color: '#6366f1' }}>Tiền cọc phòng</strong> và <strong style={{ color: '#6366f1' }}>Tiền phòng hàng tháng</strong>.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setSimResult(null); setShowSimModal(true); }}
            className="btn btn-sm"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid #10b981',
              fontWeight: '700',
              padding: '7px 16px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ⚡ Test Giả Lập Giao Dịch
          </button>
        </div>
      </div>

      {/* KPI Stats Bar: Đúng thứ tự [Tất cả -> Chờ duyệt -> Thành công -> Từ chối] */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {/* 1. Tất cả */}
        <div
          className="card"
          onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
          style={{
            flex: '1 1 200px',
            maxWidth: '350px',
            padding: '14px 18px',
            cursor: 'pointer',
            borderRadius: '14px',
            border: statusFilter === 'all' ? '2px solid #6366f1' : '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng Giao Dịch</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{payments.length}</div>
        </div>

        {/* 2. Chờ duyệt */}
        <div
          className="card"
          onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
          style={{
            flex: '1 1 200px',
            maxWidth: '350px',
            padding: '14px 18px',
            cursor: 'pointer',
            borderRadius: '14px',
            border: statusFilter === 'pending' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
            background: 'rgba(245,158,11,0.08)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
          }}
        >
          <div style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 700 }}>⏳ Chờ Duyệt Chuyển Khoản</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
            {pendingCount} <span style={{ fontSize: '15px', fontWeight: 600 }}>giao dịch</span>
          </div>
        </div>

        {/* 3. Thành công */}
        <div
          className="card"
          onClick={() => { setStatusFilter('completed'); setCurrentPage(1); }}
          style={{
            flex: '1 1 200px',
            maxWidth: '350px',
            padding: '14px 18px',
            cursor: 'pointer',
            borderRadius: '14px',
            border: statusFilter === 'completed' ? '2px solid #10b981' : '1px solid var(--border-color)',
            background: 'rgba(16,185,129,0.08)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
          }}
        >
          <div style={{ fontSize: '14px', color: '#10b981', fontWeight: 700 }}>✅ Đã Xác Nhận Duyệt Tiền</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {completedCount} <span style={{ fontSize: '15px', fontWeight: 600 }}>giao dịch</span>
          </div>
        </div>

        {/* 4. Từ chối */}
        <div
          className="card"
          onClick={() => { setStatusFilter('rejected'); setCurrentPage(1); }}
          style={{
            flex: '1 1 200px',
            maxWidth: '350px',
            padding: '14px 18px',
            cursor: 'pointer',
            borderRadius: '14px',
            border: statusFilter === 'rejected' ? '2px solid #ef4444' : '1px solid var(--border-color)',
            background: 'rgba(239,68,68,0.08)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
          }}
        >
          <div style={{ fontSize: '14px', color: '#ef4444', fontWeight: 700 }}>❌ Giao Dịch Bị Từ Chối</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
            {rejectedCount} <span style={{ fontSize: '15px', fontWeight: 600 }}>giao dịch</span>
          </div>
        </div>
      </div>
      
      {/* Toolbar & Table */}
      <div className="card-table-container">
        <div className="table-toolbar" style={{ padding: '12px 18px' }}>
          <div className="search-input-group" style={{ flex: '1 1 280px', maxWidth: '380px' }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tìm theo mã hóa đơn, ghi chú..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ fontSize: '14.5px', height: '23px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'pending', 'completed', 'rejected'].map(st => (
              <button
                key={st}
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
                style={{ fontSize: '13.5px', padding: '5px 14px', height: '36px' }}
              >
                {st === 'all' ? 'Tất cả' : st === 'pending' ? '⏳ Chờ duyệt' : st === 'completed' ? '✅ Thành công' : '❌ Từ chối'}
              </button>
            ))}
          </div>
        </div>

        <table className="custom-table">  
          <thead>
            <tr>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>Mã Hóa Đơn</th>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>Số Tiền</th>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>Phương Thức</th>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>Ảnh Biên Lai</th>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>Thời Gian</th>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>Ghi Chú</th>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>Trạng Thái</th>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>Thao Tác Duyệt</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '17px' }}>
                  Chưa có giao dịch thanh toán nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              paginatedPayments.map((p) => {
                const statusLower = (p.status || '').toLowerCase();
                const isPending = statusLower === 'pendingapproval' || statusLower === 'pending_approval' || statusLower === 'pending';
                const isCompleted = statusLower === 'completed';

                const proofUrl = p.proofImageUrl || p.proofUrl || p.ProofImageUrl;

                return (
                  <tr key={p.id}>
                    <td style={{ padding: '8px 16px' }}><strong style={{ color: 'var(--primary)', fontSize: '15.5px' }}>{p.invoiceCode || p.invoiceId}</strong></td>
                    <td style={{ padding: '8px 16px' }}><strong style={{ color: '#34d399', fontSize: '15.5px' }}>{formatVND(p.amount)}</strong></td>
                    <td style={{ padding: '8px 16px' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14.5px' }}>
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
                          <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Eye size={14} /> Xem Bill
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>Chưa có ảnh</span>
                      )}
                    </td>

                    <td style={{ padding: '8px 16px', fontSize: '14.5px' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : ''}</td>
                    <td style={{ padding: '8px 16px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>{p.note || 'Không có ghi chú'}</td>
                    <td style={{ padding: '8px 16px' }}>
                      <span className={`status-pill ${isCompleted ? 'occupied' : isPending ? 'pending' : 'vacant'}`} style={{ padding: '4px 10px', fontSize: '13px', borderRadius: '20px' }}>
                        {isCompleted ? '✅ Thành công' : isPending ? '⏳ Chờ duyệt' : '❌ Từ chối'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-sm btn-primary"
                            disabled={processing}
                            onClick={() => handleConfirmPayment(p.id, true)}
                            style={{ fontWeight: 700, fontSize: '13px', padding: '4px 12px', height: '32px', borderRadius: '6px' }}
                          >
                            ✅ Duyệt
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            disabled={processing}
                            onClick={() => handleConfirmPayment(p.id, false)}
                            style={{ fontSize: '13px', padding: '4px 10px', height: '32px', borderRadius: '6px' }}
                          >
                            ❌ Từ chối
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div style={{ padding: '8px 16px' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredPayments.length}
            pageSize={pageSize}
          />
        </div>
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

      {/* ⚡ MODAL TEST GIẢ LẬP GẠCH NỢ TỰ ĐỘNG */}
      {showSimModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px', padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                <Zap size={20} color="#10b981" /> Test Giả Lập Gạch Nợ Tự Động (VietQR / Webhook)
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowSimModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                  CHỌN LOẠI KHOẢN TIỀN CẦN TEST GẠCH NỢ
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { setSimType('deposit'); setSimResult(null); }}
                    className={`btn ${simType === 'deposit' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '10px', fontWeight: 700, borderRadius: '10px' }}
                  >
                    🎉 1. Tiền Cọc Phòng
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSimType('invoice'); setSimResult(null); }}
                    className={`btn ${simType === 'invoice' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '10px', fontWeight: 700, borderRadius: '10px' }}
                  >
                    ⚡ 2. Tiền Phòng Hàng Tháng
                  </button>
                </div>
              </div>

              {simType === 'deposit' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Chọn phòng cần cọc:
                    </label>
                    <select
                      value={simRoomId}
                      onChange={(e) => setSimRoomId(e.target.value)}
                      className="form-control"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px' }}
                    >
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>
                          Phòng {r.roomNumber} - Trạng thái: {r.status === 'Vacant' ? 'Còn trống' : r.status === 'Deposit' ? 'Đã cọc' : 'Đang ở'} ({formatVND(r.price)}/tháng)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Số tiền cọc thử nghiệm (VNĐ):
                    </label>
                    <input
                      type="number"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      className="form-control"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Số điện thoại khách cọc:
                    </label>
                    <input
                      type="text"
                      value={simPhone}
                      onChange={(e) => setSimPhone(e.target.value)}
                      className="form-control"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px' }}
                    />
                  </div>
                  <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    💡 <strong>Cú pháp mô phỏng:</strong> <code>COC {rooms.find(r => r.id === simRoomId)?.roomNumber || '101'} {simPhone}</code> gửi tới STK <strong>{bankAccNo} ({bankName})</strong>.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Chọn hóa đơn cần gạch nợ:
                    </label>
                    {unpaidInvoices.length === 0 ? (
                      <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '8px', fontSize: '13px' }}>
                        ⚠️ Hiện không có hóa đơn nào chưa thanh toán!
                      </div>
                    ) : (
                      <select
                        value={simInvoiceId || unpaidInvoices[0]?.id}
                        onChange={(e) => setSimInvoiceId(e.target.value)}
                        className="form-control"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px' }}
                      >
                        {unpaidInvoices.map(inv => (
                          <option key={inv.id} value={inv.id}>
                            Mã {inv.invoiceCode} - Phòng {inv.roomNumber} - Tháng {inv.month} ({formatVND(inv.totalAmount)})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    💡 <strong>Cú pháp mô phỏng:</strong> <code>Phong {unpaidInvoices.find(i => i.id === simInvoiceId)?.roomNumber || '101'} thanh toan {unpaidInvoices.find(i => i.id === simInvoiceId)?.invoiceCode || 'HD...'}</code> gửi tới STK <strong>{bankAccNo} ({bankName})</strong>.
                  </div>
                </div>
              )}

              {/* Kết quả sau khi chạy test */}
              {simResult && (
                <div style={{ marginTop: '16px', padding: '14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, fontSize: '14px' }}>
                    <CheckCircle size={18} /> Gạch nợ thành công!
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-primary)' }}>
                    {simResult.message}
                  </p>
                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Số tiền: <strong>{formatVND(simResult.amount)}</strong> | Phòng: <strong>{simResult.roomNumber}</strong> | STK: <strong>{simResult.bankAccount}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '16px 20px', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={() => setShowSimModal(false)}>Đóng</button>
              <button
                className="btn btn-primary"
                disabled={simLoading || (simType === 'invoice' && unpaidInvoices.length === 0)}
                onClick={handleRunSimulation}
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', fontWeight: 700, padding: '10px 22px', cursor: 'pointer' }}
              >
                {simLoading ? 'Đang gửi tín hiệu...' : '⚡ Bắn Tín Hiệu Gạch Nợ Thử Nghiệm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
