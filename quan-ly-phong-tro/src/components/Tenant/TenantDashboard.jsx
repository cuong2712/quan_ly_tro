import React from 'react';
import { Home, Receipt, FileText, Bell, CreditCard, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatVND, formatDate, getContractStatusInfo } from '../../utils/formatters';

export const TenantDashboard = ({ activeTenant, invoices = [], contracts = [], notifications = [], setActiveTab, dashboard }) => {
  const currentInvoice = invoices.find(i => (i.status || '').toLowerCase() === 'unpaid') || invoices[0];
  const activeContract = contracts.find(c => {
    const info = getContractStatusInfo(c);
    return info.isActive;
  });
  const myContract = activeContract || contracts[0] || null;
  const statusInfo = getContractStatusInfo(myContract);
  const isRenewPending = statusInfo.isRenewPending;
  const isLiquidated = statusInfo.isLiquidated || (!dashboard?.roomNumber && !activeTenant?.roomNumber && !myContract);
  const isExpired = (statusInfo.isExpired || (!myContract && !activeTenant?.roomNumber)) && !isRenewPending && !isLiquidated;

  const roomNum = dashboard?.roomNumber || activeTenant?.roomNumber || (isLiquidated ? 'Đã trả phòng' : 'Chưa gán phòng');
  const zoneName = dashboard?.zoneName || activeTenant?.zoneName || '';

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">👋 Xin chào, {activeTenant.fullName || activeTenant.name || 'Khách thuê'}!</h2>
          <p className="page-subtitle">Chào mừng bạn đến với Cổng thông tin Khách thuê phòng trọ SmartRent {zoneName ? `(${zoneName})` : ''}</p>
        </div>
      </div>

      {/* ⚠️ BANNER THÔNG BÁO NẾU HỢP ĐỒNG ĐÃ THANH LÝ */}
      {isLiquidated && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '50%', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#ef4444', margin: 0 }}>
              Hợp đồng phòng trọ của bạn đã được thanh lý
            </h3>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '13px', lineHeight: 1.5 }}>
              Tài khoản của bạn đã được hủy liên kết phòng trọ. Bạn vẫn có thể tra cứu lịch sử hóa đơn, biên lai thanh toán và hợp đồng cũ bất cứ lúc nào.
            </p>
          </div>
        </div>
      )}

      {/* ⚠️ BANNER THÔNG BÁO NẾU HỢP ĐỒNG ĐÃ HẾT HẠN */}
      {!isLiquidated && isExpired && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '50%', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#ef4444', margin: 0 }}>
                Hợp đồng thuê phòng của bạn đã hết hạn {myContract?.endDate ? `(${formatDate(myContract.endDate)})` : ''}
              </h3>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '13px', lineHeight: 1.5 }}>
                Hợp đồng hết hạn vui lòng gia hạn hợp đồng để tiếp tục sử dụng các dịch vụ và báo sự cố sửa chữa.
              </p>
            </div>
          </div>
          {setActiveTab && (
            <button className="btn btn-primary" onClick={() => setActiveTab('tn_contract')} style={{ background: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} /> Gia Hạn Ngay
            </button>
          )}
        </div>
      )}

      {/* Overview KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon indigo"><Home /></div>
          <div className="kpi-info">
            <h3>Phòng Đang Ở</h3>
            <div className="value" style={{ fontSize: isLiquidated ? '16px' : undefined, color: isLiquidated ? 'var(--text-muted)' : undefined }}>
              {isLiquidated ? 'Đã trả phòng' : (roomNum.startsWith('Phòng') || roomNum.startsWith('P.') ? roomNum : `Phòng ${roomNum}`)}
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon amber"><Receipt /></div>
          <div className="kpi-info">
            <h3>Hóa Đơn Kỳ Hiện Tại</h3>
            <div className="value" style={{ color: (currentInvoice?.status || '').toLowerCase() === 'paid' ? '#34d399' : (currentInvoice?.status || '').toLowerCase() === 'unpaid' ? '#fbbf24' : 'var(--text-muted)' }}>
              {currentInvoice ? formatVND(currentInvoice.totalAmount) : 'Không có'}
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon emerald"><CreditCard /></div>
          <div className="kpi-info">
            <h3>Trạng Thái Thanh Toán</h3>
            <div className="value" style={{ fontSize: '16px', color: (currentInvoice?.status || '').toLowerCase() === 'paid' ? '#34d399' : (currentInvoice?.status || '').toLowerCase() === 'unpaid' ? '#fbbf24' : 'var(--text-muted)' }}>
              {!currentInvoice ? '✅ Không có nợ' : (currentInvoice?.status || '').toLowerCase() === 'paid' ? '✅ Đã Thanh Toán' : '⏳ Chưa Thanh Toán'}
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon cyan"><FileText /></div>
          <div className="kpi-info">
            <h3>Thời Hạn Hợp Đồng</h3>
            <div className="value" style={{ fontSize: (isLiquidated || isExpired) ? '15px' : undefined, color: (isLiquidated || isExpired) ? '#ef4444' : undefined, fontWeight: isExpired ? 700 : undefined }}>
              {isLiquidated 
                ? '🔒 Đã thanh lý' 
                : isExpired 
                  ? `⏰ Đã hết hạn (${formatDate(myContract?.endDate || dashboard?.contractEndDate)})` 
                  : isRenewPending 
                    ? '⏳ Chờ gia hạn' 
                    : dashboard?.contractEndDate 
                      ? formatDate(dashboard.contractEndDate) 
                      : (myContract?.endDate ? formatDate(myContract.endDate) : 'Còn hiệu lực')}
            </div>
          </div>
        </div>
      </div>

      {/* Pay Quick Action Callout if unpaid */}
      {currentInvoice && currentInvoice.status === 'unpaid' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
          border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>⚡ Bạn Có 1 Hóa Đơn Tiền Nhà Chưa Thanh Toán!</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Hạn chót thanh toán: <strong>{formatDate(currentInvoice.dueDate)}</strong>. Số tiền: <strong>{formatVND(currentInvoice.totalAmount)}</strong></p>
          </div>
          <button className="btn btn-primary" onClick={() => setActiveTab('tn_payment')}>
            <CreditCard size={18} /> Thanh Toán Ngay Qua QR Code
          </button>
        </div>
      )}

      {/* Recent Notifications Widget */}
      <div className="card-table-container" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={18} color="#6366f1" /> Thông Báo Mới Nhất Từ Chủ Trọ
        </h3>
        {notifications.slice(0, 3).map(n => (
          <div key={n.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{n.title}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>{n.content}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{n.createdAt} - Bởi: {n.sender}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
