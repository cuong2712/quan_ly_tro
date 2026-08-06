import React from 'react';
import { FileText, Download, Clock, ShieldCheck, Printer } from 'lucide-react';
import { formatVND, formatDate, exportToPDF } from '../../utils/formatters';

export const TenantContract = ({ activeTenant, contracts = [], rooms = [], setContracts }) => {
  const myContract = contracts[0] || null;
  const roomNum = myContract?.roomNumber || activeTenant?.roomNumber || '101';

  const handleRequestRenew = () => {
    const months = prompt('Nhập số tháng muốn đăng ký gia hạn hợp đồng:', '12');
    if (months) {
      alert(`Đã gửi yêu cầu đăng ký gia hạn hợp đồng thêm ${months} tháng tới Chủ trọ thành công!`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><FileText size={24} color="#6366f1" /> Hợp Đồng Thuê Nhà Của Tôi</h2>
          <p className="page-subtitle">Xem thông tin hợp đồng pháp lý, tải file PDF và đăng ký gia hạn hợp đồng</p>
        </div>
        {myContract && (
          <button className="btn btn-primary" onClick={handleRequestRenew}>
            <Clock size={18} /> Đăng Ký Gia Hạn Hợp Đồng
          </button>
        )}
      </div>

      {myContract ? (
        <div className="card-table-container" style={{ padding: '28px' }} id="tenant-contract-pdf">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '20px', color: 'var(--primary)' }}>{myContract.contractCode}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Trạng thái: <span className="status-pill active">Đang hiệu lực</span></p>
            </div>
            <button className="btn btn-secondary" onClick={() => exportToPDF('tenant-contract-pdf', `${myContract.contractCode}.pdf`)}>
              <Printer size={16} /> Tải File PDF Hợp Đồng
            </button>
          </div>

          <div style={{ lineHeight: '1.8', fontSize: '14px' }}>
            <div className="form-row" style={{ marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px' }}>
                <strong>Bên Cho Thuê (Chủ nhà):</strong> Nguyễn Văn Hải<br />
                <strong>SĐT:</strong> 0908123456
              </div>
              <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px' }}>
                <strong>Bên Thuê (Khách):</strong> {activeTenant.fullName || activeTenant.name}<br />
                <strong>CCCD:</strong> {activeTenant.cccd || 'Đã cập nhật'}
              </div>
            </div>

            <p><strong>Phòng Thuê:</strong> Phòng {roomNum}</p>
            <p><strong>Thời Hạn Hợp Đồng:</strong> Từ <strong>{formatDate(myContract.startDate)}</strong> đến <strong>{formatDate(myContract.endDate)}</strong></p>
            <p><strong>Giá Thuê Phòng:</strong> <strong style={{ color: '#34d399' }}>{formatVND(myContract.rentAmount)} / tháng</strong></p>
            <p><strong>Tiền Đặt Cọc:</strong> {formatVND(myContract.deposit)}</p>

            <h4 style={{ marginTop: '20px', fontSize: '15px', color: 'var(--primary)' }}>Nội Dung Điều Khoản & Quy Định Phòng Trọ:</h4>
            <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
              {myContract.terms}
            </div>
          </div>
        </div>
      ) : (
        <div className="card-table-container" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Hiện chưa có dữ liệu hợp đồng cho phòng trọ của bạn.
        </div>
      )}
    </div>
  );
};
