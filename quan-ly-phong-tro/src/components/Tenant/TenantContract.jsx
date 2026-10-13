import React, { useState } from 'react';
import { FileText, Clock, Printer, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { formatVND, formatDate, exportToPDF, getContractStatusInfo } from '../../utils/formatters';
import { contractService } from '../../services';

export const TenantContract = ({ activeTenant, contracts = [], _rooms = [], setContracts, onRefresh }) => {
  const [selectedContractId, setSelectedContractId] = useState(null);
  const activeContract = contracts.find(c => {
    const info = getContractStatusInfo(c);
    return info.isActive;
  });
  const myContract = contracts.find(c => c.id === selectedContractId) || activeContract || contracts[0] || null;
  const roomNum = myContract?.roomNumber || activeTenant?.roomNumber || '101';

  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [renewForm, setRenewForm] = useState({
    extendMonths: 12,
    notes: '',
  });

  // Modal Ký Xác Nhận Hợp Đồng Online
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signingNote, setSigningNote] = useState('');
  const [signingAgreed, setSigningAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const statusInfo = getContractStatusInfo(myContract);
  const isCoTenant = (myContract?.contractType || '').toLowerCase() === 'cotenant' || myContract?.contractType === '2' || myContract?.type === 2;
  const isSigned = Boolean(myContract?.isSignedByTenant);
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
    } catch {
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

  const handleConfirmSign = async (e) => {
    e.preventDefault();
    if (!myContract || !signingAgreed) return;
    setIsSigning(true);
    try {
      const updated = await contractService.signContract(myContract.id, { note: signingNote });
      const updatedContract = updated || { ...myContract, isSignedByTenant: true, signedAt: new Date().toISOString() };
      if (setContracts) {
        setContracts(contracts.map(c => c.id === myContract.id ? updatedContract : c));
      }
      setIsSignModalOpen(false);
      alert('🎉 Chúc mừng! Bạn đã hoàn tất thủ tục ký xác nhận hợp đồng online thành công.');
      onRefresh?.();
    } catch (err) {
      alert('Lỗi khi ký hợp đồng: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="page-title"><FileText size={24} color="#6366f1" /> Hợp Đồng Thuê Nhà Của Tôi</h2>
          <p className="page-subtitle">Xem thông tin hợp đồng pháp lý, ký xác nhận online và xuất file PDF</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {contracts.length > 1 && (
            <select
              className="form-control"
              value={myContract?.id || ''}
              onChange={e => setSelectedContractId(e.target.value)}
              style={{ fontSize: '13.5px', height: '36px', minWidth: '180px', padding: '4px 10px' }}
            >
              {contracts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.contractType === 'CoTenant' ? '👥 Ở ghép: ' : '🏠 HĐ chính: '}{c.contractCode} (P.{c.roomNumber || '?'})
                </option>
              ))}
            </select>
          )}

          {myContract && !isLiquidated && !isSigned && (
            <button
              className="btn btn-primary"
              onClick={() => { setSigningAgreed(false); setSigningNote(''); setIsSignModalOpen(true); }}
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderColor: '#6366f1', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              ✍️ Ký Xác Nhận Online
            </button>
          )}

          {myContract && !isLiquidated && (
            <>
              {isRenewPending ? (
                <button 
                  className="btn btn-secondary" 
                  onClick={handleCancelRenew}
                  disabled={submitting}
                  style={{ color: '#ef4444', borderColor: '#ef4444' }}
                >
                  ✕ Hủy Gia Hạn
                </button>
              ) : null}
              <button 
                className={`btn ${isRenewPending ? 'btn-secondary' : isExpired ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={handleOpenRenewModal}
                style={isExpired ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' } : undefined}
              >
                <Clock size={16} /> {isRenewPending ? 'Chỉnh Sửa Gia Hạn' : isExpired ? 'Gia Hạn Hợp Đồng Ngay' : 'Gia Hạn HĐ'}
              </button>
            </>
          )}
        </div>
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

      {/* ✍️ BANNER XÁC NHẬN CHỮ KÝ ONLINE */}
      {myContract && !isLiquidated && (
        isSigned ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '12px',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle size={22} color="#10b981" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#10b981' }}>
                  Hợp Đồng Đã Được Ký Xác Nhận Online Hợp Lệ
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Xác nhận lúc: <strong>{formatDate(myContract.signedAt)}</strong> {myContract.signatureNote ? `— Ghi chú: "${myContract.signatureNote}"` : ''}
                </div>
              </div>
            </div>
            <span style={{ fontSize: '12px', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '4px 10px', borderRadius: '6px', fontWeight: 700 }}>
              🔒 Chứng thực số SmartRent
            </span>
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12))',
            border: '1px solid rgba(99, 102, 241, 0.35)',
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
              <FileText size={24} color="#6366f1" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#6366f1' }}>
                  {isCoTenant ? 'Phụ Lục Hợp Đồng Ở Ghép Cần Bạn Ký Xác Nhận Online' : 'Hợp Đồng Cần Bạn Ký Xác Nhận Online'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.5 }}>
                  Vui lòng đọc kỹ nội dung điều khoản bên dưới và bấm nút Ký xác nhận để hoàn tất thủ tục pháp lý bảo vệ quyền lợi cư trú của bạn.
                </div>
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => { setSigningAgreed(false); setSigningNote(''); setIsSignModalOpen(true); }}
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderColor: '#6366f1', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              ✍️ Ký Xác Nhận Ngay
            </button>
          </div>
        )
      )}

      {myContract ? (
        <div className="card-table-container" style={{ padding: '28px' }} id="tenant-contract-pdf">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '20px', color: 'var(--primary)', margin: 0 }}>{myContract.contractCode}</h3>
                {isCoTenant ? (
                  <span style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#a855f7',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    👥 Phụ Lục Ở Ghép
                  </span>
                ) : (
                  <span style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '9999px'
                  }}>
                    🏠 Hợp Đồng Chính
                  </span>
                )}
                {isSigned ? (
                  <span style={{ fontSize: '11.5px', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700 }}>
                    ✍️ Đã ký online
                  </span>
                ) : (
                  <span style={{ fontSize: '11.5px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700 }}>
                    ⏳ Chưa ký
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '6px', marginBottom: 0 }}>
                Trạng thái: <span className={`status-pill ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
                {isCoTenant && myContract.parentContractCode && (
                  <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>
                    (Căn cứ HĐ Master: <strong style={{ color: 'var(--text-primary)' }}>{myContract.parentContractCode}</strong>)
                  </span>
                )}
              </p>
            </div>
            <button className="btn btn-secondary" onClick={() => exportToPDF('tenant-contract-pdf', `${myContract.contractCode}.pdf`)}>
              <Printer size={16} /> Tải File PDF Hợp Đồng
            </button>
          </div>

          {myContract.customContent ? (
            <div style={{ background: '#ffffff', color: '#0f172a', padding: '32px 40px', borderRadius: '12px', whiteSpace: 'pre-wrap', lineHeight: '1.9', fontSize: '14.5px', fontFamily: 'Times New Roman, serif', border: '1px solid #cbd5e1' }}>
              {myContract.customContent}
            </div>
          ) : (
            <div style={{ lineHeight: '1.8', fontSize: '14px' }}>
              <div className="form-row" style={{ marginBottom: '16px' }}>
                <div className="sub-box" style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong>Bên Cho Thuê (Chủ nhà):</strong> {myContract.landlordName || 'Chủ trọ'}<br />
                  <strong>SĐT:</strong> {myContract.landlordPhone || 'Chưa cập nhật'}<br />
                  {myContract.zoneName && <small style={{ color: 'var(--text-muted)' }}>Khu: {myContract.zoneName} {myContract.zoneAddress ? `(${myContract.zoneAddress})` : ''}</small>}
                </div>
                <div className="sub-box" style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong>{isCoTenant ? 'Bên Ở Ghép (Khách):' : 'Bên Thuê (Khách):'}</strong> {myContract.tenantName || activeTenant?.fullName || activeTenant?.name || 'Khách thuê'}<br />
                  <strong>SĐT:</strong> {myContract.tenantPhone || activeTenant?.phone || 'Chưa cập nhật'}<br />
                  <strong>CCCD:</strong> {myContract.tenantCccd || activeTenant?.cccd || 'Đã cập nhật'}
                </div>
              </div>

              <p><strong>Phòng Thuê:</strong> Phòng {roomNum} {myContract.zoneName ? `(${myContract.zoneName})` : ''}</p>
              <p><strong>Thời Hạn Hợp Đồng:</strong> Từ <strong>{formatDate(myContract.startDate)}</strong> đến <strong>{formatDate(myContract.endDate)}</strong></p>
              <p><strong>Giá Thuê Cả Phòng:</strong> <strong style={{ color: '#10b981' }}>{formatVND(myContract.rentAmount)} / tháng</strong></p>
              {isCoTenant ? (
                <>
                  <p><strong>Tiền Cọc Riêng Của Bạn:</strong> <strong style={{ color: '#6366f1' }}>{formatVND(myContract.individualDeposit || myContract.deposit || 0)}</strong></p>
                  {myContract.sharedRentAmount > 0 && (
                    <p><strong>Đóng Góp Tiền Phòng Thỏa Thuận:</strong> <strong style={{ color: '#f59e0b' }}>{formatVND(myContract.sharedRentAmount)} / tháng</strong></p>
                  )}
                </>
              ) : (
                <p><strong>Tiền Đặt Cọc:</strong> {formatVND(myContract.deposit)}</p>
              )}

              <h4 style={{ marginTop: '20px', fontSize: '15px', color: 'var(--primary)' }}>Nội Dung Điều Khoản & Quy Định Phòng Trọ:</h4>
              <div className="sub-box" style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', marginTop: '8px', border: '1px solid var(--border-color)' }}>
                {myContract.terms || 'Các bên tuân thủ quy định chung của nhà trọ.'}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card-table-container" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Hiện chưa có dữ liệu hợp đồng cho phòng trọ của bạn.
        </div>
      )}

      {/* ✍️ MODAL KÝ XÁC NHẬN HỢP ĐỒNG ONLINE */}
      {isSignModalOpen && myContract && (
        <div className="modal-overlay" onClick={() => setIsSignModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '18px', fontWeight: 800 }}>
                ✍️ Ký Xác Nhận Hợp Đồng Online
              </h3>
              <button className="btn-close" onClick={() => setIsSignModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleConfirmSign}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'var(--bg-dark)', padding: '14px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 13, lineHeight: 1.6 }}>
                  <div>Loại hợp đồng: <strong style={{ color: isCoTenant ? '#a855f7' : '#6366f1' }}>{isCoTenant ? 'Phụ lục cư trú ở ghép (Co-Tenant)' : 'Hợp đồng thuê phòng chính (Master)'}</strong></div>
                  <div>Mã hợp đồng: <strong>{myContract.contractCode}</strong> (Phòng P.{roomNum})</div>
                  <div>Người ký: <strong>{myContract.tenantName || activeTenant?.fullName || 'Khách thuê'}</strong></div>
                  <div>Thời hạn: Từ <strong>{formatDate(myContract.startDate)}</strong> đến <strong>{formatDate(myContract.endDate)}</strong></div>
                  {isCoTenant && myContract.individualDeposit > 0 && (
                    <div>Tiền cọc cá nhân: <strong style={{ color: '#10b981' }}>{formatVND(myContract.individualDeposit)}</strong></div>
                  )}
                </div>

                <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Bằng việc xác nhận ký điện tử, bạn cam kết rằng thông tin CCCD cung cấp là chính xác, đồng thời đã đọc kỹ và đồng ý tuân thủ toàn bộ nội quy nhà trọ, an toàn PCCC và các điều khoản trong hợp đồng.
                </div>

                <div>
                  <label className="form-label">Ghi chú hoặc ý kiến khi ký (Tùy chọn)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Đã kiểm tra phòng và thiết bị hoạt động tốt..."
                    value={signingNote}
                    onChange={e => setSigningNote(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
                  <input
                    type="checkbox"
                    id="signAgreementCheckbox"
                    checked={signingAgreed}
                    onChange={e => setSigningAgreed(e.target.checked)}
                    style={{ marginTop: 3, width: 18, height: 18, cursor: 'pointer', accentColor: '#6366f1' }}
                  />
                  <label htmlFor="signAgreementCheckbox" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none', lineHeight: 1.4 }}>
                    <strong>Tôi xác nhận:</strong> Tôi đã đọc kỹ, hiểu rõ và tự nguyện ký xác nhận điện tử hợp đồng này.
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsSignModalOpen(false)}>Hủy Bỏ</button>
                <button type="submit" className="btn btn-primary" disabled={!signingAgreed || isSigning} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderColor: '#6366f1', fontWeight: 700 }}>
                  {isSigning ? 'Đang xác nhận chữ ký...' : 'Xác Nhận & Ký Điện Tử'}
                </button>
              </div>
            </form>
          </div>
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
