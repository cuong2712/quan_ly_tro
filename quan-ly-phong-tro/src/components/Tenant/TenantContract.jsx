import React, { useState } from 'react';
import { FileText, Download, Clock, ShieldCheck, Printer, CheckCircle, AlertTriangle, Send, X } from 'lucide-react';
import { formatVND, formatDate, exportToPDF, getContractStatusInfo, isContractExpired } from '../../utils/formatters';
import { contractService } from '../../services';

export const TenantContract = ({ activeTenant, contracts = [], rooms = [], setContracts, onRefresh }) => {
  const activeContract = contracts.find(c => {
    const info = getContractStatusInfo(c);
    return info.isActive;
  });
  const myContract = activeContract || contracts[0] || null;
  const roomNum = myContract?.roomNumber || activeTenant?.roomNumber || '101';

  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [renewForm, setRenewForm] = useState({
    extendMonths: 12,
    notes: '',
  });

  const statusInfo = getContractStatusInfo(myContract);
  const isRenewPending = myContract && !((myContract.status || '').toLowerCase() === 'liquidated') && (
    (myContract.status || '').toLowerCase() === 'renewrequested' ||
    (myContract.status || '').toLowerCase() === 'renew_requested' ||
    Boolean(myContract.requestedRenewMonths)
  );

  const isLiquidated = statusInfo.isLiquidated;
  const isExpired = statusInfo.isExpired && !isRenewPending && !isLiquidated;

  const calculateNewEndDate = (currentEnd, months) => {
    try {
      if (!currentEnd) return '';
      const d = new Date(currentEnd);
      if (isNaN(d.getTime())) return '';
      const m = parseInt(months) || 0;
      if (m <= 0) return '';
      d.setMonth(d.getMonth() + m);
      return d.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const handleOpenRenewModal = () => {
    if (isLiquidated) return;
    setRenewForm({
      extendMonths: myContract?.requestedRenewMonths || 12,
      notes: myContract?.renewNotes || '',
    });
    setIsRenewModalOpen(true);
  };

  const handleSubmitRenew = async (e) => {
    e.preventDefault();
    if (!myContract || isLiquidated) return;
    setSubmitting(true);
    try {
      const updated = await contractService.requestRenew(myContract.id, {
        extendMonths: Number(renewForm.extendMonths),
        notes: renewForm.notes,
      });
      if (setContracts) {
        setContracts(contracts.map(c => c.id === myContract.id ? updated : c));
      }
      setIsRenewModalOpen(false);
      alert(`✅ Đã gửi yêu cầu gia hạn hợp đồng thêm ${renewForm.extendMonths} tháng tới Chủ trọ thành công!`);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi gửi yêu cầu gia hạn: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRenew = async () => {
    if (!confirm('Bạn có chắc muốn hủy yêu cầu đăng ký gia hạn hợp đồng này?')) return;
    setSubmitting(true);
    try {
      const updated = await contractService.cancelRenew(myContract.id);
      if (setContracts) {
        setContracts(contracts.map(c => c.id === myContract.id ? updated : c));
      }
      alert('✅ Đã hủy yêu cầu gia hạn hợp đồng.');
      onRefresh?.();
    } catch (err) {
      alert('Lỗi hủy yêu cầu: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><FileText size={24} color="#6366f1" /> Hợp Đồng Thuê Nhà Của Tôi</h2>
          <p className="page-subtitle">Xem thông tin hợp đồng pháp lý, tải file PDF và gửi yêu cầu gia hạn hợp đồng</p>
        </div>
        {myContract && !isLiquidated && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {isRenewPending ? (
              <button 
                className="btn btn-secondary" 
                onClick={handleCancelRenew}
                disabled={submitting}
                style={{ color: '#ef4444', borderColor: '#ef4444' }}
              >
                ✕ Hủy Yêu Cầu Gia Hạn
              </button>
            ) : null}
            <button 
              className={`btn ${isRenewPending ? 'btn-secondary' : isExpired ? 'btn-primary' : 'btn-primary'}`} 
              onClick={handleOpenRenewModal}
              style={isExpired ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' } : undefined}
            >
              <Clock size={18} /> {isRenewPending ? '✏️ Chỉnh Sửa Yêu Cầu Gia Hạn' : isExpired ? '⚠️ Đăng Ký Gia Hạn Hợp Đồng Ngay' : 'Đăng Ký Gia Hạn Hợp Đồng'}
            </button>
          </div>
        )}
      </div>

      {/* ⚠️ BANNER NẾU HỢP ĐỒNG ĐÃ THANH LÝ */}
      {isLiquidated && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: '#ef4444' }}>Hợp đồng đã thanh lý:</strong> Hợp đồng thuê nhà này đã hoàn tất thủ tục thanh lý và quyết toán tiền cọc. Dữ liệu hợp đồng được lưu trữ phục vụ mục đích tra cứu lịch sử của bạn.
          </div>
        </div>
      )}

      {/* ⚠️ BANNER NẾU HỢP ĐỒNG ĐÃ HẾT HẠN */}
      {!isLiquidated && isExpired && !isRenewPending && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#ef4444' }}>
                Hợp Đồng Thuê Nhà Của Bạn Đã Hết Hạn ({formatDate(myContract?.endDate)})
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.5 }}>
                Hợp đồng hết hạn vui lòng gia hạn hợp đồng để tiếp tục sử dụng các dịch vụ tiện ích và gửi yêu cầu sửa chữa thiết bị phòng trọ.
              </div>
            </div>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleOpenRenewModal}
            style={{ background: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={16} /> Gia Hạn Hợp Đồng Ngay
          </button>
        </div>
      )}

      {/* 🔔 BANNER TRẠNG THÁI NẾU ĐANG CHỜ CHỦ TRỌ DUYỆT GIA HẠN */}
      {!isLiquidated && isRenewPending && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#d97706', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#d97706" /> Yêu Cầu Gia Hạn Hợp Đồng Đang Chờ Chủ Trọ Phê Duyệt
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.5 }}>
              Bạn đã đăng ký gia hạn thêm <strong>{myContract.requestedRenewMonths || 12} tháng</strong> (Thời hạn mới dự kiến: <strong>{formatDate(calculateNewEndDate(myContract.endDate, myContract.requestedRenewMonths || 12))}</strong>).
              {myContract.renewNotes && <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', marginTop: '2px' }}>Lời nhắn: "{myContract.renewNotes}"</div>}
            </div>
          </div>
          <button 
            className="btn btn-sm btn-secondary" 
            onClick={handleOpenRenewModal}
            style={{ fontWeight: 600 }}
          >
            Thay Đổi Thông Tin
          </button>
        </div>
      )}

      {myContract ? (
        <div className="card-table-container" style={{ padding: '28px' }} id="tenant-contract-pdf">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '20px', color: 'var(--primary)' }}>{myContract.contractCode}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                Trạng thái: <span className={`status-pill ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
              </p>
            </div>
            <button className="btn btn-secondary" onClick={() => exportToPDF('tenant-contract-pdf', `${myContract.contractCode}.pdf`)}>
              <Printer size={16} /> Tải File PDF Hợp Đồng
            </button>
          </div>

          <div style={{ lineHeight: '1.8', fontSize: '14px' }}>
            <div className="form-row" style={{ marginBottom: '16px' }}>
              <div className="sub-box" style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <strong>Bên Cho Thuê (Chủ nhà):</strong> {myContract.landlordName || 'Chủ trọ'}<br />
                <strong>SĐT:</strong> {myContract.landlordPhone || 'Chưa cập nhật'}<br />
                {myContract.zoneName && <small style={{ color: 'var(--text-muted)' }}>Khu: {myContract.zoneName} {myContract.zoneAddress ? `(${myContract.zoneAddress})` : ''}</small>}
              </div>
              <div className="sub-box" style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <strong>Bên Thuê (Khách):</strong> {myContract.tenantName || activeTenant?.fullName || activeTenant?.name || 'Khách thuê'}<br />
                <strong>SĐT:</strong> {myContract.tenantPhone || activeTenant?.phone || 'Chưa cập nhật'}<br />
                <strong>CCCD:</strong> {myContract.tenantCccd || activeTenant?.cccd || 'Đã cập nhật'}
              </div>
            </div>

            <p><strong>Phòng Thuê:</strong> Phòng {roomNum} {myContract.zoneName ? `(${myContract.zoneName})` : ''}</p>
            <p><strong>Thời Hạn Hợp Đồng:</strong> Từ <strong>{formatDate(myContract.startDate)}</strong> đến <strong>{formatDate(myContract.endDate)}</strong></p>
            <p><strong>Giá Thuê Phòng:</strong> <strong style={{ color: '#10b981' }}>{formatVND(myContract.rentAmount)} / tháng</strong></p>
            <p><strong>Tiền Đặt Cọc:</strong> {formatVND(myContract.deposit)}</p>

            <h4 style={{ marginTop: '20px', fontSize: '15px', color: 'var(--primary)' }}>Nội Dung Điều Khoản & Quy Định Phòng Trọ:</h4>
            <div className="sub-box" style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', marginTop: '8px', border: '1px solid var(--border-color)' }}>
              {myContract.terms || 'Các bên tuân thủ quy định chung của nhà trọ.'}
            </div>
          </div>
        </div>
      ) : (
        <div className="card-table-container" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Hiện chưa có dữ liệu hợp đồng cho phòng trọ của bạn.
        </div>
      )}

      {/* 📝 MODAL ĐĂNG KÝ GIA HẠN HỢP ĐỒNG */}
      {isRenewModalOpen && myContract && (
        <div className="modal-overlay" onClick={() => setIsRenewModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '18px' }}>
                <Clock size={20} color="#6366f1" /> Đăng Ký Gia Hạn Hợp Đồng
              </h3>
              <button className="btn-close" onClick={() => setIsRenewModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitRenew}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'var(--bg-dark)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }}>
                  <div>Mã hợp đồng: <strong style={{ color: '#6366f1' }}>{myContract.contractCode}</strong> (Phòng {roomNum})</div>
                  <div style={{ marginTop: 4 }}>Thời hạn hiện tại: Đến ngày <strong>{formatDate(myContract.endDate)}</strong></div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Số Tháng Muốn Gia Hạn *</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    {[3, 6, 12, 24].map(m => (
                      <button
                        key={m}
                        type="button"
                        className={`btn btn-sm ${Number(renewForm.extendMonths) === m ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '6px 0', fontSize: 13 }}
                        onClick={() => setRenewForm({ ...renewForm, extendMonths: m })}
                      >
                        +{m} tháng
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    className="form-control"
                    required
                    value={renewForm.extendMonths}
                    onChange={e => setRenewForm({ ...renewForm, extendMonths: parseInt(e.target.value) || 1 })}
                    placeholder="Hoặc tự nhập số tháng..."
                  />
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, padding: '10px 14px', color: '#10b981', fontSize: 13 }}>
                  <CheckCircle size={15} style={{ display: 'inline', marginRight: 6 }} />
                  Thời hạn hợp đồng mới dự kiến: <strong>{formatDate(calculateNewEndDate(myContract.endDate, renewForm.extendMonths))}</strong>
                </div>

                <div>
                  <label className="form-label">Lời nhắn gửi Chủ trọ (Tùy chọn)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="VD: Em muốn tiếp tục thuê phòng lâu dài, nhờ anh/chị duyệt gia hạn giúp em..."
                    value={renewForm.notes}
                    onChange={e => setRenewForm({ ...renewForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsRenewModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Send size={15} style={{ marginRight: 4 }} />
                  {submitting ? 'Đang gửi...' : 'Gửi Yêu Cầu Tới Chủ Trọ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
