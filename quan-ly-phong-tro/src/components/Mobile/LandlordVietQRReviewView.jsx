import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, CreditCard, CheckCircle2, XCircle, Eye,
  Building2, Search, Filter, RefreshCw, ZoomIn, X, Clock
} from 'lucide-react';
import { paymentService } from '../../services';
import { formatVND, formatDateTime, getImageUrl } from '../../utils/formatters';

export function LandlordVietQRReviewView({
  zones = [],
  rooms = [],
  invoices = [],
  payments = [],
  isLight = false,
  onBack,
  onSuccess
}) {
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [zoomedImage, setZoomedImage] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Thống kê số lượng theo bộ lọc khu hiện tại
  const counts = useMemo(() => {
    let pending = 0, approved = 0, rejected = 0, total = 0;
    payments.forEach(p => {
      const inv = invoices.find(i => (p.invoiceId && i.id === p.invoiceId) || (p.invoiceCode && (i.invoiceCode || '').toLowerCase() === p.invoiceCode.toLowerCase()));
      const room = rooms.find(r => (inv?.roomId && r.id === inv.roomId) || (p.roomId && r.id === p.roomId) || (inv?.roomNumber && (r.roomNumber || '').toLowerCase() === (inv.roomNumber || '').toLowerCase()));

      if (selectedZoneId) {
        const zId = room?.zoneId || room?.ZoneId;
        if (zId !== selectedZoneId) return;
      }
      total++;
      const s = (p.status || '').toLowerCase();
      if (s === 'pendingapproval' || s === 'pending_approval' || s === 'pending') pending++;
      else if (s === 'completed' || s === 'approved' || s === 'success') approved++;
      else if (s === 'rejected') rejected++;
    });
    return { pending, approved, rejected, total };
  }, [payments, invoices, rooms, selectedZoneId]);

  // Lọc danh sách thanh toán chính xác
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // 1. Tìm thông tin invoice và phòng liên kết
      const inv = invoices.find(i => 
        (p.invoiceId && i.id === p.invoiceId) ||
        (p.invoiceCode && (i.invoiceCode || '').toLowerCase() === p.invoiceCode.toLowerCase())
      );
      const room = rooms.find(r => 
        (inv?.roomId && r.id === inv.roomId) || 
        (p.roomId && r.id === p.roomId) ||
        (inv?.roomNumber && (r.roomNumber || '').toLowerCase() === (inv.roomNumber || '').toLowerCase())
      );

      // 2. Lọc theo khu trọ
      if (selectedZoneId) {
        const zoneIdOfRoom = room?.zoneId || room?.ZoneId;
        if (!zoneIdOfRoom || zoneIdOfRoom !== selectedZoneId) {
          return false;
        }
      }

      // 3. Lọc theo trạng thái
      const s = (p.status || '').toLowerCase();
      const isPending = s === 'pendingapproval' || s === 'pending_approval' || s === 'pending';
      const isApproved = s === 'completed' || s === 'approved' || s === 'success';
      const isRejected = s === 'rejected';

      if (statusFilter === 'pending') return isPending;
      if (statusFilter === 'approved') return isApproved;
      if (statusFilter === 'rejected') return isRejected;
      return true; // 'all'
    });
  }, [payments, invoices, rooms, selectedZoneId, statusFilter]);

  // Xử lý duyệt hoặc từ chối
  const handleConfirm = async (paymentId, approve) => {
    const action = approve ? 'Duyệt nhận tiền' : 'Từ chối giao dịch';
    if (!window.confirm(`Bạn có chắc chắn muốn ${action} này?`)) return;

    setLoadingId(paymentId);
    try {
      await paymentService.confirm(paymentId, {
        approve,
        note: approve ? 'Chủ trọ đã kiểm tra và nhận đủ tiền' : 'Biên lai không hợp lệ hoặc chưa nhận được tiền'
      });
      alert(`✅ Đã ${action} thành công!`);
      onSuccess?.();
    } catch (err) {
      alert('Lỗi xử lý: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingId(null);
    }
  };

  // Làm mới tức thì danh sách giao dịch
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onSuccess?.();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: isLight ? '#0f172a' : '#f8fafc',
      background: isLight ? '#f8fafc' : '#0b1120'
    }}>
      {/* ── 1. HEADER CHUẨN NATIVE APP (SÁT MÉP TRÊN) ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: isLight ? '#ffffff' : '#0f172a',
        borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
        padding: '10px 14px',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.05)' : '0 4px 14px rgba(0,0,0,0.25)'
      }}>
        <button
          onClick={onBack}
          title="Quay lại"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: 'none',
            background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isLight ? '#334155' : '#e2e8f0',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <CreditCard size={17} color="#6366f1" /> Duyệt Thanh Toán VietQR
          </h2>
          <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>
            Đối soát biên lai chuyển khoản ngân hàng
          </div>
        </div>

        <button
          onClick={handleRefresh}
          title="Làm mới dữ liệu realtime"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: 'none',
            background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6366f1',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
        </button>
      </div>

      {/* ── NỘI DUNG CUỘN CHÍNH ── */}
      <div style={{ padding: '14px 16px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* ── BỘ LỌC KHU TRỌ VÀ TRẠNG THÁI ── */}
        <div style={{
          background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 16,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          {/* Lọc khu */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <Building2 size={13} /> Lọc theo Khu Trọ:
            </label>
            <select
              value={selectedZoneId}
              onChange={e => setSelectedZoneId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                background: isLight ? '#f8fafc' : '#1f2937',
                color: isLight ? '#0f172a' : '#fff',
                fontSize: '13px',
                fontWeight: 700
              }}
            >
              <option value="">Tất cả các khu trọ</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          {/* Lọc trạng thái tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {[
              { id: 'pending', label: `Chờ duyệt (${counts.pending})`, color: '#f59e0b' },
              { id: 'approved', label: `Đã duyệt (${counts.approved})`, color: '#10b981' },
              { id: 'rejected', label: `Từ chối (${counts.rejected})`, color: '#ef4444' },
              { id: 'all', label: `Tất cả (${counts.total})`, color: '#6366f1' }
            ].map(tab => {
              const isAct = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: isAct ? tab.color : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)'),
                    color: isAct ? '#fff' : (isLight ? '#64748b' : '#94a3b8'),
                    textAlign: 'center',
                    lineHeight: 1.2
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── DANH SÁCH GIAO DỊCH THANH TOÁN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredPayments.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 16px',
              background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
              borderRadius: 16,
              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
              color: isLight ? '#64748b' : '#94a3b8'
            }}>
              <CreditCard size={44} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontSize: '14px' }}>Không có giao dịch nào phù hợp</div>
              <div style={{ fontSize: '12px', marginTop: 2 }}>Các khoản chuyển khoản VietQR mới sẽ xuất hiện ở đây</div>
            </div>
          ) : (
            filteredPayments.map(p => {
              const s = (p.status || '').toLowerCase();
              const isPending = s === 'pendingapproval' || s === 'pending_approval' || s === 'pending';
              const isApproved = s === 'completed' || s === 'approved' || s === 'success';
              const isRejected = s === 'rejected';

              // Tìm thông tin liên kết chính xác từ Invoice & Room
              const inv = invoices.find(i => 
                (p.invoiceId && i.id === p.invoiceId) ||
                (p.invoiceCode && (i.invoiceCode || '').toLowerCase() === p.invoiceCode.toLowerCase())
              );
              const room = rooms.find(r => 
                (inv?.roomId && r.id === inv.roomId) || 
                (p.roomId && r.id === p.roomId) ||
                (inv?.roomNumber && (r.roomNumber || '').toLowerCase() === (inv.roomNumber || '').toLowerCase())
              );
              const roomNum = inv?.roomNumber || room?.roomNumber || p.roomNumber || '---';
              const tenantName = inv?.tenantName || room?.currentTenantName || p.tenantName || 'Khách thuê';
              const zoneName = room?.zoneName || zones.find(z => z.id === (room?.zoneId || room?.ZoneId))?.name || '';
              const proofUrl = p.proofImageUrl || p.paymentProofUrl || p.proofUrl;

              return (
                <div
                  key={p.id}
                  style={{
                    background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                    border: `1px solid ${isPending ? 'rgba(245,158,11,0.5)' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)')}`,
                    borderRadius: 16,
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxShadow: isPending ? '0 4px 18px rgba(245,158,11,0.12)' : 'none'
                  }}
                >
                  {/* Header card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: isApproved ? 'rgba(16,185,129,0.15)' : isRejected ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color: isApproved ? '#10b981' : isRejected ? '#ef4444' : '#f59e0b'
                      }}>
                        {isApproved ? '✅ Đã duyệt nhận tiền' : isRejected ? '❌ Đã từ chối' : '⏳ Chờ chủ trọ duyệt'}
                      </span>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '6px 0 2px' }}>
                        Phòng {roomNum} {zoneName ? `(${zoneName})` : ''}
                      </h3>
                      <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
                        {tenantName} • {formatDateTime(p.createdAt || p.paymentDate)}
                      </div>
                      {p.invoiceCode && (
                        <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700, marginTop: 2 }}>
                          Mã HĐ: {p.invoiceCode}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#10b981' }}>
                        +{formatVND(p.amount || 0)}
                      </div>
                      <div style={{ fontSize: '10.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
                        {p.method || 'VietQR Chuyển Khoản'}
                      </div>
                    </div>
                  </div>

                  {/* Ảnh minh chứng nếu có */}
                  {proofUrl && (
                    <div style={{
                      background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.3)',
                      borderRadius: 12,
                      padding: '8px',
                      border: `1px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: 6, color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>📸 Ảnh biên lai ngân hàng:</span>
                        <button
                          type="button"
                          onClick={() => setZoomedImage(getImageUrl(proofUrl))}
                          style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                        >
                          <ZoomIn size={12} /> Xem phóng to
                        </button>
                      </div>
                      <img
                        src={getImageUrl(proofUrl)}
                        alt="Biên lai chuyển khoản"
                        onClick={() => setZoomedImage(getImageUrl(proofUrl))}
                        style={{
                          width: '100%',
                          maxHeight: 180,
                          objectFit: 'contain',
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: '#000'
                        }}
                      />
                    </div>
                  )}

                  {/* 2 nút duyệt hoặc từ chối */}
                  {isPending && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                      <button
                        type="button"
                        disabled={loadingId === p.id}
                        onClick={() => handleConfirm(p.id, false)}
                        style={{
                          padding: '11px',
                          borderRadius: 10,
                          background: isLight ? '#fef2f2' : 'rgba(239,68,68,0.12)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <XCircle size={16} /> Từ Chối
                      </button>
                      <button
                        type="button"
                        disabled={loadingId === p.id}
                        onClick={() => handleConfirm(p.id, true)}
                        style={{
                          padding: '11px',
                          borderRadius: 10,
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          border: 'none',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                        }}
                      >
                        {loadingId === p.id ? <RefreshCw size={16} className="spin" /> : <CheckCircle2 size={16} />}
                        Duyệt Tiền
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── MODAL PHÓNG TO ẢNH MINH CHỨNG ── */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16
          }}
        >
          <button
            onClick={() => setZoomedImage(null)}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 38,
              height: 38,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
          <img
            src={zoomedImage}
            alt="Biên lai phóng to"
            style={{
              maxWidth: '96%',
              maxHeight: '85vh',
              objectFit: 'contain',
              borderRadius: 12
            }}
          />
        </div>
      )}
    </div>
  );
}
