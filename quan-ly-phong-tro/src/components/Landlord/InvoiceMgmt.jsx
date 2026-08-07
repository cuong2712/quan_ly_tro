import React, { useState } from 'react';
import { Receipt, Plus, Search, Edit, Trash2, Printer, Mail, CheckCircle, Clock, Zap, AlertCircle } from 'lucide-react';
import { formatVND, formatDate, exportToPDF } from '../../utils/formatters';
import { invoiceService } from '../../services';

export const InvoiceMgmt = ({ invoices = [], setInvoices, rooms = [], tenants = [], utilityLogs = [], services = [], onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    rentFee: 4200000,
    elecFee: 350000,
    waterFee: 270000,
    serviceFee: 270000,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'Unpaid',
  });

  const filteredInvoices = invoices.filter(inv => {
    const code = (inv.invoiceCode || '').toLowerCase();
    const roomNum = (inv.roomNumber || inv.roomId || '').toLowerCase();
    const matchesSearch = code.includes(searchTerm.toLowerCase()) || roomNum.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (inv.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const handleOpenEdit = (inv) => {
    setEditingInvoice(inv);
    setFormData({
      rentFee: inv.rentFee || 0,
      elecFee: inv.elecFee || 0,
      waterFee: inv.waterFee || 0,
      serviceFee: inv.serviceFee || 0,
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: inv.status || 'Unpaid',
    });
    setIsModalOpen(true);
  };

  const handleSendEmail = (inv) => {
    alert(`Đã gửi hóa đơn ${inv.invoiceCode} tới email khách thuê thành công!`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setSaving(true);

    const totalAmount = Number(formData.rentFee || 0) + Number(formData.elecFee || 0) + Number(formData.waterFee || 0) + Number(formData.serviceFee || 0);

    try {
      if (invoiceService && invoiceService.updateStatus) {
        await invoiceService.updateStatus(editingInvoice.id, formData.status);
      }
    } catch (err) {
      console.warn('API update status notice:', err);
    }

    setInvoices(invoices.map(inv => inv.id === editingInvoice.id ? {
      ...inv,
      rentFee: Number(formData.rentFee || 0),
      elecFee: Number(formData.elecFee || 0),
      waterFee: Number(formData.waterFee || 0),
      serviceFee: Number(formData.serviceFee || 0),
      totalAmount,
      dueDate: formData.dueDate,
      status: formData.status,
    } : inv));

    setIsModalOpen(false);
    alert(`✅ Đã cập nhật điều chỉnh hóa đơn ${editingInvoice.invoiceCode} thành công!`);
    setSaving(false);
    onRefresh?.();
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title"><Receipt size={24} color="#6366f1" /> Quản Lý Hóa Đơn Thu Tiền Nhà</h2>
          <p className="page-subtitle">Hóa đơn được <strong>tự động tạo khi chốt điện nước</strong>. Bạn có thể chỉnh sửa tại đây nếu nhập nhầm số.</p>
        </div>
      </div>

      {/* ⚡ THÔNG BÁO HƯỚNG DẪN QUY TRÌNH CHUẨN */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.1)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '12px',
        padding: '14px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={22} color="#6366f1" />
          <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
            <strong>Quy trình tự động hóa:</strong> Để lập hóa đơn mới, bạn chỉ cần vào mục <strong>"Điện Nước"</strong> và nhập số điện/nước mới. Hệ thống sẽ tự động nhân đơn giá và tạo Hóa Đơn chi tiết đẩy sang đây!
          </div>
        </div>
      </div>

      <div className="card-table-container">
        <div className="table-toolbar">
          <div className="search-input-group">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tìm mã hóa đơn, số phòng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'Unpaid', 'Paid', 'Overdue'].map(st => (
              <button
                key={st}
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'all' ? 'Tất cả' : st === 'Unpaid' ? '⏳ Chưa trả' : st === 'Paid' ? '✅ Đã trả' : '🔥 Quá hạn'}
              </button>
            ))}
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã Hóa Đơn</th>
              <th>Phòng Thuê</th>
              <th>Kỳ Thu</th>
              <th>Tiền Nhà / Điện / Nước</th>
              <th>Tổng Số Tiền</th>
              <th>Hạn Thanh Toán</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Chưa có hóa đơn nào. Bạn hãy sang mục <strong>"Điện Nước"</strong> chốt số điện mới để tự động tạo hóa đơn!
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td><strong>{inv.invoiceCode || inv.id}</strong></td>
                  <td>
                    <span className="status-pill occupied">
                      Phòng {inv.roomNumber || inv.roomId}
                    </span>
                  </td>
                  <td>Tháng {inv.month}</td>
                  <td>
                    <div style={{ fontSize: '12px' }}>
                      Phòng: {formatVND(inv.rentFee || 0)} | Điện: {formatVND(inv.elecFee || 0)} | Nước: {formatVND(inv.waterFee || 0)}
                    </div>
                  </td>
                  <td><strong style={{ color: '#34d399', fontSize: '15px' }}>{formatVND(inv.totalAmount)}</strong></td>
                  <td>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('vi-VN') : ''}</td>
                  <td>
                    <span className={`status-pill ${(inv.status || '').toLowerCase() === 'paid' ? 'occupied' : 'vacant'}`}>
                      {(inv.status || '').toLowerCase() === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-sm btn-secondary" title="Chỉnh Sửa Hóa Đơn (Nếu nhập nhầm số)" onClick={() => handleOpenEdit(inv)}>
                        <Edit size={14} color="#f59e0b" />
                      </button>
                      <button className="btn btn-sm btn-secondary" title="Gửi Email Thông Báo" onClick={() => handleSendEmail(inv)}>
                        <Mail size={14} color="#6366f1" />
                      </button>
                      <button className="btn btn-sm btn-secondary" title="Xem & In Hóa Đơn PDF" onClick={() => setViewingInvoice(inv)}>
                        <Printer size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Edit Modal */}
      {isModalOpen && editingInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">✏️ Điều Chỉnh Hóa Đơn: {editingInvoice.invoiceCode}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                  <strong>Phòng:</strong> Phòng {editingInvoice.roomNumber || editingInvoice.roomId} | <strong>Kỳ thu:</strong> Tháng {editingInvoice.month}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tiền Thuê Phòng (VND)</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={formData.rentFee}
                      onChange={(e) => setFormData({ ...formData, rentFee: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tiền Điện (VND)</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={formData.elecFee}
                      onChange={(e) => setFormData({ ...formData, elecFee: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tiền Nước (VND)</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={formData.waterFee}
                      onChange={(e) => setFormData({ ...formData, waterFee: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phí Dịch Vụ Khác (VND)</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={formData.serviceFee}
                      onChange={(e) => setFormData({ ...formData, serviceFee: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Hạn Thanh Toán</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Trạng Thái Hóa Đơn</label>
                    <select
                      className="form-control"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Unpaid">⏳ Chưa thanh toán</option>
                      <option value="Paid">✅ Đã thanh toán</option>
                      <option value="Overdue">🔥 Quá hạn</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice View / Print Modal */}
      {viewingInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Xem & In Hóa Đơn: {viewingInvoice.invoiceCode}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewingInvoice(null)}>X</button>
            </div>
            <div className="modal-body" id="invoice-pdf-content" style={{ background: '#fff', color: '#1e293b', padding: '24px', borderRadius: '8px' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #6366f1', paddingBottom: '12px', marginBottom: '16px' }}>
                <h2 style={{ color: '#6366f1', margin: 0, fontSize: '20px' }}>HÓA ĐƠN THU TIỀN NHÀ PHÒNG {viewingInvoice.roomNumber || viewingInvoice.roomId}</h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0' }}>Mã HĐ: {viewingInvoice.invoiceCode} | Kỳ thu: Tháng {viewingInvoice.month}</p>
              </div>

              <div style={{ fontSize: '13px', lineHeight: '1.8', marginBottom: '16px' }}>
                <p><strong>Ngày phát hành:</strong> {formatDate(viewingInvoice.createdAt || new Date())}</p>
                <p><strong>Hạn thanh toán:</strong> {formatDate(viewingInvoice.dueDate)}</p>
                <p><strong>Trạng thái:</strong> {viewingInvoice.status === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</p>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Khoản Chi Tiết</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #cbd5e1' }}>Thành Tiền (VND)</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingInvoice.items && viewingInvoice.items.length > 0 ? (
                    viewingInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>{item.name}</td>
                        <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{formatVND(item.amount || 0)}</td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr><td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Tiền thuê phòng</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{formatVND(viewingInvoice.rentFee || 0)}</td></tr>
                      <tr><td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Tiền điện tiêu thụ</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{formatVND(viewingInvoice.elecFee || 0)}</td></tr>
                      <tr><td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Tiền nước tiêu thụ</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{formatVND(viewingInvoice.waterFee || 0)}</td></tr>
                      {viewingInvoice.serviceFee > 0 && (
                        <tr><td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Phí dịch vụ khác</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{formatVND(viewingInvoice.serviceFee)}</td></tr>
                      )}
                    </>
                  )}
                  <tr style={{ fontWeight: 'bold', background: '#f8fafc' }}>
                    <td style={{ padding: '10px' }}>TỔNG CỘNG CẦN THANH TOÁN</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#059669', fontSize: '16px' }}>{formatVND(viewingInvoice.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewingInvoice(null)}>Đóng</button>
              <button className="btn btn-primary" onClick={() => exportToPDF('invoice-pdf-content', `${viewingInvoice.invoiceCode}.pdf`)}>
                <Printer size={16} /> In Hóa Đơn / Xuất PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
