import React, { useState } from 'react';
import { 
  Receipt, Plus, Search, Edit, Trash2, Printer, Mail, 
  CheckCircle, Clock, Zap, AlertCircle, AlertTriangle, 
  MessageSquare, Check, X, Eye, ArrowRight 
} from 'lucide-react';
import { formatVND, formatDate, exportToPDF } from '../../utils/formatters';
import { invoiceService } from '../../services';
import { Pagination } from '../Common/Pagination';

const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';

const getImageFullUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const InvoiceMgmt = ({ invoices = [], setInvoices, rooms = [], zones = [], tenants = [], utilityLogs = [], services = [], onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'disputed' | 'Unpaid' | 'Paid' | 'Overdue'
  const [monthFilter, setMonthFilter] = useState(''); // '' or 'YYYY-MM'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [resolvingInvoice, setResolvingInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Form chỉnh sửa thông thường
  const [formData, setFormData] = useState({
    rentFee: 4200000,
    elecFee: 350000,
    waterFee: 270000,
    serviceFee: 270000,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'Unpaid',
  });

  // Form xử lý khiếu nại của khách thuê
  const [disputeResolveData, setDisputeResolveData] = useState({
    action: 'Accept', // 'Accept' | 'Reject'
    reply: '',
    rentFee: 0,
    elecFee: 0,
    waterFee: 0,
    serviceFee: 0,
    dueDate: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const pendingDisputesCount = invoices.filter(i => i.isReported && i.disputeStatus === 'Pending').length;

  const currentMonthKey = monthFilter || new Date().toISOString().slice(0, 7);
  const occupiedRooms = rooms.filter(r => (r.status || '').toLowerCase() === 'occupied');
  const targetRooms = occupiedRooms.length > 0 ? occupiedRooms : rooms;
  const billedRoomsThisMonth = targetRooms.filter(r => 
    invoices.some(i => (i.roomId === r.id || (r.roomNumber && i.roomNumber === r.roomNumber)) && i.month === currentMonthKey)
  );
  const unbilledRoomsThisMonth = targetRooms.filter(r => 
    !invoices.some(i => (i.roomId === r.id || (r.roomNumber && i.roomNumber === r.roomNumber)) && i.month === currentMonthKey)
  );

  const filteredInvoices = invoices.filter(inv => {
    const code = (inv.invoiceCode || '').toLowerCase();
    const roomNum = (inv.roomNumber || inv.roomId || '').toLowerCase();
    const matchesSearch = code.includes(searchTerm.toLowerCase()) || roomNum.includes(searchTerm.toLowerCase());
    const matchesMonth = !monthFilter || inv.month === monthFilter;

    if (statusFilter === 'disputed') {
      return matchesSearch && matchesMonth && (inv.isReported && inv.disputeStatus === 'Pending');
    }
    const matchesStatus = statusFilter === 'all' || (inv.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesMonth && matchesStatus;
  });

  const totalPages = Math.ceil(filteredInvoices.length / pageSize);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  const handleOpenResolveDispute = (inv) => {
    setResolvingInvoice(inv);
    setDisputeResolveData({
      action: 'Accept',
      reply: 'Chủ trọ đã kiểm tra lại số liệu và điều chỉnh hóa đơn.',
      rentFee: inv.rentFee || 0,
      elecFee: inv.elecFee || 0,
      waterFee: inv.waterFee || 0,
      serviceFee: inv.serviceFee || 0,
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
  };

  const handleSendEmail = (inv) => {
    alert(`Đã gửi hóa đơn ${inv.invoiceCode} tới email khách thuê thành công!`);
  };

  const handleDeleteInvoice = async (inv, e) => {
    e?.stopPropagation();
    if (!window.confirm(`⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA HÓA ĐƠN NÀY?\n\n• Mã hóa đơn: ${inv.invoiceCode || inv.id}\n• Phòng: ${inv.roomNumber || inv.roomId}\n• Tháng: ${inv.month}\n• Tổng tiền: ${formatVND(inv.totalAmount)}\n\nSau khi xóa, hóa đơn và các dữ liệu liên quan sẽ bị loại bỏ hoàn toàn để bạn có thể dễ dàng test lại.`)) {
      return;
    }

    try {
      await invoiceService.deleteInvoice(inv.id);
      setInvoices(invoices.filter(i => i.id !== inv.id));
      if (viewingInvoice?.id === inv.id) {
        setViewingInvoice(null);
      }
      alert(`✅ Đã xóa hóa đơn ${inv.invoiceCode || ''} thành công!`);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi xóa hóa đơn: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setSaving(true);

    const totalAmount = Number(formData.rentFee || 0) + Number(formData.elecFee || 0) + Number(formData.waterFee || 0) + Number(formData.serviceFee || 0);

    try {
      const payload = {
        rentFee: Number(formData.rentFee || 0),
        elecFee: Number(formData.elecFee || 0),
        waterFee: Number(formData.waterFee || 0),
        serviceFee: Number(formData.serviceFee || 0),
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : new Date().toISOString(),
        status: formData.status,
      };

      if (invoiceService && invoiceService.updateInvoice) {
        await invoiceService.updateInvoice(editingInvoice.id, payload);
      } else if (invoiceService && invoiceService.updateStatus) {
        await invoiceService.updateStatus(editingInvoice.id, formData.status);
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
      onRefresh?.();
    } catch (err) {
      alert('Lỗi cập nhật hóa đơn: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleResolveDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!resolvingInvoice) return;

    if (disputeResolveData.action === 'Reject' && !disputeResolveData.reply.trim()) {
      alert('Vui lòng nhập lý do/giải thích cho khách thuê khi từ chối yêu cầu.');
      return;
    }

    setResolving(true);
    try {
      const payload = {
        action: disputeResolveData.action,
        reply: disputeResolveData.reply.trim() || undefined,
        rentFee: disputeResolveData.action === 'Accept' ? Number(disputeResolveData.rentFee || 0) : undefined,
        elecFee: disputeResolveData.action === 'Accept' ? Number(disputeResolveData.elecFee || 0) : undefined,
        waterFee: disputeResolveData.action === 'Accept' ? Number(disputeResolveData.waterFee || 0) : undefined,
        serviceFee: disputeResolveData.action === 'Accept' ? Number(disputeResolveData.serviceFee || 0) : undefined,
        dueDate: disputeResolveData.dueDate ? new Date(disputeResolveData.dueDate).toISOString() : undefined,
      };

      const updated = await invoiceService.resolveDispute(resolvingInvoice.id, payload);

      setInvoices(invoices.map(inv => inv.id === resolvingInvoice.id ? { ...inv, ...updated } : inv));
      setResolvingInvoice(null);
      alert(`✅ Đã ${disputeResolveData.action === 'Accept' ? 'điều chỉnh lại' : 'phản hồi'} hóa đơn ${resolvingInvoice.invoiceCode} thành công! Hệ thống đã gửi thông báo đến khách thuê.`);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi xử lý khiếu nại: ' + (err.response?.data?.message || err.message));
    } finally {
      setResolving(false);
    }
  };

  const getImageFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const resolveCalculatedTotal = Number(disputeResolveData.rentFee || 0) + 
    Number(disputeResolveData.elecFee || 0) + 
    Number(disputeResolveData.waterFee || 0) + 
    Number(disputeResolveData.serviceFee || 0);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title"><Receipt size={24} color="#6366f1" /> Quản Lý Hóa Đơn Thu Tiền Nhà</h2>
          <p className="page-subtitle">Xem danh sách hóa đơn, chỉnh sửa số tiền điện nước và xử lý các báo cáo sai sót từ khách thuê</p>
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
            <strong>Quy trình tự động hóa:</strong> Hóa đơn được tự động lập khi chốt số điện nước tại mục <strong>"Điện Nước"</strong>. Nếu khách thuê báo sai sót số liệu, bạn có thể xem minh chứng và điều chỉnh trực tiếp tại đây!
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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('all')}
            >
              Tất cả
            </button>

            <button
              className={`btn btn-sm ${statusFilter === 'disputed' ? 'btn-primary' : 'btn-secondary'}`}
              style={statusFilter !== 'disputed' && pendingDisputesCount > 0 ? { color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)' } : {}}
              onClick={() => setStatusFilter('disputed')}
            >
              ⚠️ Cần kiểm tra ({pendingDisputesCount})
            </button>

            <button
              className={`btn btn-sm ${statusFilter === 'Unpaid' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('Unpaid')}
            >
              ⏳ Chưa trả
            </button>

            <button
              className={`btn btn-sm ${statusFilter === 'Paid' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('Paid')}
            >
              ✅ Đã trả
            </button>

            <button
              className={`btn btn-sm ${statusFilter === 'Overdue' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('Overdue')}
            >
              🔥 Quá hạn
            </button>
          </div>
        </div>

        {/* THANH THỐNG KÊ TIẾN ĐỘ & BỘ LỌC KỲ THÁNG */}
        {targetRooms.length > 0 && (
          <div style={{
            background: unbilledRoomsThisMonth.length === 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.06)',
            border: `1px solid ${unbilledRoomsThisMonth.length === 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.2)'}`,
            borderRadius: '10px',
            padding: '12px 16px',
            margin: '0 16px 16px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={16} color="#6366f1" />
                Tiến độ lập hóa đơn Tháng {currentMonthKey}: 
                <span style={{ color: unbilledRoomsThisMonth.length === 0 ? '#10b981' : '#6366f1', fontWeight: 800 }}>
                  {billedRoomsThisMonth.length} / {targetRooms.length} phòng ({Math.round((billedRoomsThisMonth.length / (targetRooms.length || 1)) * 100)}%)
                </span>
              </div>
              {unbilledRoomsThisMonth.length > 0 ? (
                <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>⏳ Còn <strong>{unbilledRoomsThisMonth.length} phòng</strong> chưa lập HĐ:</span>
                  {unbilledRoomsThisMonth.map(r => (
                    <span key={r.id} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                      P.{r.roomNumber}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: 500 }}>
                  🎉 Tuyệt vời! Tất cả các phòng đã được lập hóa đơn cho kỳ Tháng {currentMonthKey}.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Xem kỳ tháng:</label>
              <input 
                type="month" 
                className="form-control" 
                style={{ padding: '4px 8px', fontSize: '12px', width: 'auto', background: 'var(--bg-card)' }}
                value={monthFilter} 
                onChange={e => setMonthFilter(e.target.value)} 
              />
              {monthFilter && (
                <button 
                  className="btn btn-sm btn-secondary" 
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => setMonthFilter('')}
                >
                  Tất cả các tháng
                </button>
              )}
            </div>
          </div>
        )}

        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã Hóa Đơn</th>
              <th>Phòng Thuê</th>
              <th>Kỳ Thu</th>
              <th>Tiền Nhà / Điện / Nước / Dịch Vụ</th>
              <th>Tổng Số Tiền</th>
              <th>Hạn Thanh Toán</th>
              <th>Trạng Thái</th>
              <th>Phản Ánh Của Khách</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {statusFilter === 'disputed' 
                    ? 'Hiện tại không có hóa đơn nào bị khách thuê báo sai sót.' 
                    : 'Chưa có hóa đơn nào phù hợp với bộ lọc.'}
                </td>
              </tr>
            ) : (
              paginatedInvoices.map((inv) => {
                const isPendingDispute = inv.isReported && inv.disputeStatus === 'Pending';
                const isResolvedDispute = inv.disputeStatus === 'Resolved';
                const isRejectedDispute = inv.disputeStatus === 'Rejected';

                return (
                  <tr 
                    key={inv.id}
                    style={isPendingDispute ? { background: 'rgba(245, 158, 11, 0.06)', borderLeft: '3px solid #f59e0b' } : {}}
                  >
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
                        {inv.serviceFee > 0 && <span style={{ color: '#6366f1', fontWeight: 600 }}> | DV: {formatVND(inv.serviceFee)}</span>}
                      </div>
                    </td>
                    <td><strong style={{ color: isPendingDispute ? '#f59e0b' : '#34d399', fontSize: '15px' }}>{formatVND(inv.totalAmount)}</strong></td>
                    <td>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('vi-VN') : ''}</td>
                    <td>
                      <span className={`status-pill ${(inv.status || '').toLowerCase() === 'paid' ? 'occupied' : 'vacant'}`}>
                        {(inv.status || '').toLowerCase() === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}
                      </span>
                    </td>
                    <td>
                      {isPendingDispute ? (
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{
                            color: '#f59e0b',
                            background: 'rgba(245, 158, 11, 0.15)',
                            borderColor: 'rgba(245, 158, 11, 0.4)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleOpenResolveDispute(inv)}
                          title="Bấm để xem và xử lý báo sai của khách"
                        >
                          <AlertTriangle size={13} /> Khách báo sai
                        </button>
                      ) : isResolvedDispute ? (
                        <span className="status-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          <CheckCircle size={12} /> Đã điều chỉnh
                        </span>
                      ) : isRejectedDispute ? (
                        <span className="status-pill" style={{ background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                          <MessageSquare size={12} /> Đã phản hồi
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Không có</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-sm btn-secondary" 
                          title="Xem Chi Tiết Hóa Đơn Minh Bạch & In PDF" 
                          onClick={() => setViewingInvoice(inv)}
                        >
                          <Eye size={14} color="#6366f1" />
                        </button>
                        {isPendingDispute ? (
                          <button 
                            className="btn btn-sm btn-primary" 
                            style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                            title="Xử lý báo cáo sai sót hóa đơn của khách thuê"
                            onClick={() => handleOpenResolveDispute(inv)}
                          >
                            <AlertTriangle size={14} /> Xử lý
                          </button>
                        ) : (
                          <button className="btn btn-sm btn-secondary" title="Chỉnh Sửa Hóa Đơn (Nếu nhập nhầm số)" onClick={() => handleOpenEdit(inv)}>
                            <Edit size={14} color="#f59e0b" />
                          </button>
                        )}
                        <button className="btn btn-sm btn-secondary" title="Gửi Email Thông Báo" onClick={() => handleSendEmail(inv)}>
                          <Mail size={14} color="#3b82f6" />
                        </button>
                        <button 
                          className="btn btn-sm btn-danger" 
                          title="Xóa Hóa Đơn (Dễ Dàng Test Lại)" 
                          onClick={(e) => handleDeleteInvoice(inv, e)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Modal 1: Xử Lý Báo Cáo / Khiếu Nại Hóa Đơn Của Khách Thuê */}
      {resolvingInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                <AlertTriangle size={20} /> Xử Lý Báo Cáo Hóa Đơn: {resolvingInvoice.invoiceCode}
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setResolvingInvoice(null)}>✕</button>
            </div>

            <form onSubmit={handleResolveDisputeSubmit}>
              <div className="modal-body">
                {/* Hộp thông tin phản ánh từ khách thuê */}
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>
                    📌 Thông Tin Khách Thuê Báo Sai (Phòng {resolvingInvoice.roomNumber || resolvingInvoice.roomId}):
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-primary)' }}>
                    <div><strong>Lý do:</strong> {resolvingInvoice.disputeReason}</div>
                    <div><strong>Chi tiết:</strong> {resolvingInvoice.disputeDescription}</div>
                    {resolvingInvoice.suggestedElecNumber && (
                      <div><strong>Chỉ số điện khách đề xuất:</strong> <span style={{ color: '#6366f1', fontWeight: 600 }}>{resolvingInvoice.suggestedElecNumber} kWh</span></div>
                    )}
                    {resolvingInvoice.suggestedWaterNumber && (
                      <div><strong>Chỉ số nước khách đề xuất:</strong> <span style={{ color: '#6366f1', fontWeight: 600 }}>{resolvingInvoice.suggestedWaterNumber} m³</span></div>
                    )}
                  </div>

                  {/* Hiển thị ảnh minh chứng công tơ do khách upload trực tiếp */}
                  {resolvingInvoice.disputeImageUrl && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        📷 Ảnh minh chứng khách gửi (Bấm vào ảnh để xem kích thước gốc):
                      </div>
                      <a href={getImageFullUrl(resolvingInvoice.disputeImageUrl)} target="_blank" rel="noreferrer">
                        <img
                          src={getImageFullUrl(resolvingInvoice.disputeImageUrl)}
                          alt="Ảnh công tơ khách gửi"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            objectFit: 'contain',
                            background: '#000'
                          }}
                        />
                      </a>
                    </div>
                  )}
                </div>

                {/* Chọn hành động xử lý */}
                <div className="form-group">
                  <label className="form-label">Phương Án Xử Lý Của Bạn *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      className={`btn ${disputeResolveData.action === 'Accept' ? 'btn-primary' : 'btn-secondary'}`}
                      style={disputeResolveData.action === 'Accept' ? { background: '#10b981', borderColor: '#10b981' } : {}}
                      onClick={() => setDisputeResolveData({ ...disputeResolveData, action: 'Accept', reply: 'Chủ trọ đã kiểm tra lại và điều chỉnh hóa đơn theo đúng số liệu thực tế.' })}
                    >
                      <CheckCircle size={16} /> Chấp Nhận & Điều Chỉnh
                    </button>
                    <button
                      type="button"
                      className={`btn ${disputeResolveData.action === 'Reject' ? 'btn-primary' : 'btn-secondary'}`}
                      style={disputeResolveData.action === 'Reject' ? { background: '#ef4444', borderColor: '#ef4444' } : {}}
                      onClick={() => setDisputeResolveData({ ...disputeResolveData, action: 'Reject', reply: 'Chủ trọ đã kiểm tra lại công tơ và xác nhận số liệu hóa đơn là chính xác.' })}
                    >
                      <X size={16} /> Từ Chối & Giữ Nguyên
                    </button>
                  </div>
                </div>

                {/* Nếu Chấp nhận: Hiển thị form điều chỉnh các khoản phí */}
                {disputeResolveData.action === 'Accept' && (
                  <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: '#10b981' }}>
                      ✏️ Nhập Số Tiền Điều Chỉnh Lại:
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Tiền Thuê Phòng (VND)</label>
                        <input
                          type="number"
                          className="form-control"
                          required
                          value={disputeResolveData.rentFee}
                          onChange={(e) => setDisputeResolveData({ ...disputeResolveData, rentFee: parseInt(e.target.value) || 0 })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Tiền Điện (VND)</label>
                        <input
                          type="number"
                          className="form-control"
                          required
                          value={disputeResolveData.elecFee}
                          onChange={(e) => setDisputeResolveData({ ...disputeResolveData, elecFee: parseInt(e.target.value) || 0 })}
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
                          value={disputeResolveData.waterFee}
                          onChange={(e) => setDisputeResolveData({ ...disputeResolveData, waterFee: parseInt(e.target.value) || 0 })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Phí Dịch Vụ Khác (VND)</label>
                        <input
                          type="number"
                          className="form-control"
                          required
                          value={disputeResolveData.serviceFee}
                          onChange={(e) => setDisputeResolveData({ ...disputeResolveData, serviceFee: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '6px',
                      marginTop: '8px'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>TỔNG TIỀN MỚI SAU ĐIỀU CHỈNH:</span>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>{formatVND(resolveCalculatedTotal)}</span>
                    </div>
                  </div>
                )}

                {/* Lời nhắn / Phản hồi gửi cho khách */}
                <div className="form-group">
                  <label className="form-label">
                    {disputeResolveData.action === 'Accept' ? 'Lời Nhắn Gửi Khách Thuê (Tùy chọn)' : 'Giải Thích Lý Do Cho Khách Thuê *'}
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    required={disputeResolveData.action === 'Reject'}
                    placeholder={disputeResolveData.action === 'Accept' ? 'VD: Đã trừ lại 50 số điện tính nhầm theo ảnh công tơ bạn gửi...' : 'VD: Đã kiểm tra lại chỉ số công tơ niêm phong tầng 2, chỉ số 1520 kWh là chính xác...'}
                    value={disputeResolveData.reply}
                    onChange={(e) => setDisputeResolveData({ ...disputeResolveData, reply: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setResolvingInvoice(null)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={disputeResolveData.action === 'Accept' ? { background: '#10b981', borderColor: '#10b981' } : { background: '#ef4444', borderColor: '#ef4444' }}
                  disabled={resolving}
                >
                  <Check size={16} /> {resolving ? '⏳ Đang lưu...' : (disputeResolveData.action === 'Accept' ? 'Xác Nhận Điều Chỉnh Hóa Đơn' : 'Xác Nhận Giữ Nguyên & Trả Lời')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Invoice Regular Edit Modal */}
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

      {/* Modal 3: Invoice View / Transparent Receipt Modal */}
      {viewingInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={20} color="#6366f1" /> Chi Tiết Hóa Đơn: {viewingInvoice.invoiceCode}
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewingInvoice(null)}>✕</button>
            </div>
            
            <div className="modal-body" id="invoice-pdf-content" style={{ background: '#fff', color: '#1e293b', padding: '24px', borderRadius: '8px' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #6366f1', paddingBottom: '14px', marginBottom: '16px' }}>
                <h2 style={{ color: '#4f46e5', margin: '0 0 4px', fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  PHIẾU BÁO THU TIỀN NHÀ & DỊCH VỤ
                </h2>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                  PHÒNG {viewingInvoice.roomNumber || viewingInvoice.roomId}
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                  Mã HĐ: <strong>{viewingInvoice.invoiceCode}</strong> • Kỳ thu: <strong>Tháng {viewingInvoice.month}</strong>
                </p>
              </div>

              {viewingInvoice.disputeStatus === 'Resolved' && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '14px',
                  fontSize: '12.5px'
                }}>
                  <strong>✅ Đã điều chỉnh theo phản ánh của khách thuê:</strong> {viewingInvoice.disputeReply}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                <div><strong>Khách thuê:</strong> {viewingInvoice.tenantName || 'Đang cập nhật'}</div>
                <div><strong>Trạng thái:</strong> <span style={{ color: (viewingInvoice.status || '').toLowerCase() === 'paid' ? '#16a34a' : '#ea580c', fontWeight: 700 }}>{(viewingInvoice.status || '').toLowerCase() === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}</span></div>
                <div><strong>Ngày phát hành:</strong> {formatDate(viewingInvoice.createdAt || new Date())}</div>
                <div><strong>Hạn thanh toán:</strong> <span style={{ color: '#dc2626', fontWeight: 600 }}>{formatDate(viewingInvoice.dueDate)}</span></div>
              </div>

              {/* BẢNG KÊ CHI TIẾT TỪNG KHOẢN TIỀN MINH BẠCH */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>Danh Mục Khoản Thu</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#475569', width: '110px' }}>Phân Loại</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', color: '#475569', width: '140px' }}>Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 1. Tiền phòng */}
                  <tr>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0' }}>
                      <strong>🏠 Tiền thuê phòng {viewingInvoice.roomNumber || ''}</strong>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>Cố định</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{formatVND(viewingInvoice.rentFee || 0)}</td>
                  </tr>

                  {/* 2. Tiền điện */}
                  <tr>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#d97706' }}>⚡ Tiền điện tiêu thụ</span>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>Theo đồng hồ</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{formatVND(viewingInvoice.elecFee || 0)}</td>
                  </tr>

                  {/* 3. Tiền nước */}
                  <tr>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#0284c7' }}>💧 Tiền nước tiêu thụ</span>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>Theo đồng hồ</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{formatVND(viewingInvoice.waterFee || 0)}</td>
                  </tr>

                  {/* 4. Danh sách các khoản tiền dịch vụ chi tiết từng mục */}
                  {(() => {
                    const serviceItems = viewingInvoice.items ? viewingInvoice.items.filter(it => 
                      !it.name.startsWith('Tiền thuê phòng') && 
                      !it.name.startsWith('Tiền điện') && 
                      !it.name.startsWith('Tiền nước')
                    ) : [];

                    if (serviceItems.length > 0) {
                      return serviceItems.map((sItem, sIdx) => (
                        <tr key={`svc-${sIdx}`} style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                          <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', paddingLeft: '20px' }}>
                            <span style={{ color: '#6366f1' }}>• {sItem.name}</span>
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#6366f1', fontSize: '12px' }}>Dịch vụ</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#4338ca', fontWeight: 600 }}>
                            {formatVND(sItem.amount || 0)}
                          </td>
                        </tr>
                      ));
                    } else if (viewingInvoice.serviceFee > 0) {
                      return (
                        <tr style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                          <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', paddingLeft: '20px' }}>
                            <span style={{ color: '#6366f1' }}>• Phí dịch vụ cố định (Wi-Fi, rác, vệ sinh...)</span>
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#6366f1', fontSize: '12px' }}>Dịch vụ</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#4338ca', fontWeight: 600 }}>
                            {formatVND(viewingInvoice.serviceFee)}
                          </td>
                        </tr>
                      );
                    }
                    return null;
                  })()}

                  {/* Tổng tiền dịch vụ subtotal nếu có */}
                  {viewingInvoice.serviceFee > 0 && (
                    <tr style={{ background: '#f8fafc', fontSize: '12.5px', color: '#475569' }}>
                      <td colSpan="2" style={{ padding: '6px 10px', borderBottom: '2px solid #cbd5e1', textAlign: 'right', fontStyle: 'italic' }}>
                        Tổng cộng phí dịch vụ:
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', fontWeight: 700, color: '#4338ca' }}>
                        {formatVND(viewingInvoice.serviceFee)}
                      </td>
                    </tr>
                  )}

                  {/* 5. TỔNG CỘNG THANH TOÁN */}
                  <tr style={{ background: '#ecfdf5', borderTop: '2px solid #10b981' }}>
                    <td colSpan="2" style={{ padding: '12px 10px', color: '#065f46' }}>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>TỔNG CỘNG CẦN THANH TOÁN</div>
                      <div style={{ fontSize: '11.5px', color: '#047857', marginTop: '2px' }}>
                        (Tiền phòng: {formatVND(viewingInvoice.rentFee || 0)} + Điện: {formatVND(viewingInvoice.elecFee || 0)} + Nước: {formatVND(viewingInvoice.waterFee || 0)} + DV: {formatVND(viewingInvoice.serviceFee || 0)})
                      </div>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#059669', fontSize: '18px', fontWeight: 800 }}>
                      {formatVND(viewingInvoice.totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', marginTop: '12px', fontStyle: 'italic' }}>
                Quý khách vui lòng kiểm tra kỹ chi tiết từng khoản trước khi thanh toán. Mọi thắc mắc xin liên hệ chủ trọ để được hỗ trợ.
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-danger" 
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={(e) => handleDeleteInvoice(viewingInvoice, e)}
              >
                <Trash2 size={15} /> Xóa Hóa Đơn Này
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                  onClick={() => {
                    const inv = viewingInvoice;
                    setViewingInvoice(null);
                    handleOpenEdit(inv);
                  }}
                >
                  <Edit size={15} /> Sửa Tiền
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setViewingInvoice(null)}
                >
                  Đóng
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => exportToPDF('invoice-pdf-content', `${viewingInvoice.invoiceCode}.pdf`)}
                >
                  <Printer size={16} /> In Hóa Đơn / Xuất PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
