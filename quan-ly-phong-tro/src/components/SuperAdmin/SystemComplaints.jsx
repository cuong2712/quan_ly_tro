import React, { useState } from 'react';
import { MessageSquare, CheckCircle, Clock, Send, Filter } from 'lucide-react';
import { adminService } from '../../services';
import { formatDate } from '../../utils/formatters';

export const SystemComplaints = ({ complaints, setComplaints, onRefresh }) => {
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = complaints.filter(c =>
    filterStatus === 'all' ? true : c.status === filterStatus
  );

  const handleOpenReplyModal = (c) => {
    setSelectedComplaint(c);
    setReplyText(c.reply || '');
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await adminService.replyComplaint(selectedComplaint.id, replyText);
      setComplaints(complaints.map(c =>
        c.id === selectedComplaint.id
          ? { ...c, reply: replyText, status: 'Resolved', repliedAt: new Date().toLocaleString('vi-VN') }
          : c
      ));
      setSelectedComplaint(null);
      onRefresh?.();
      alert('✅ Đã gửi phản hồi và đánh dấu xử lý thành công!');
    } catch (err) {
      alert('Lỗi gửi phản hồi: ' + (err.response?.data?.message || err.message));
    } finally {
      setSending(false);
    }
  };

  const pendingCount = complaints.filter(c => c.status !== 'Resolved').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><MessageSquare size={24} color="#6366f1" /> Quản Lý Phản Hồi & Khiếu Nại</h2>
          <p className="page-subtitle">
            Xem, trả lời và đánh dấu xử lý khiếu nại từ Chủ trọ và Người thuê
            {pendingCount > 0 && <span style={{ marginLeft: 10, background: '#ef4444', color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{pendingCount} chờ xử lý</span>}
          </p>
        </div>
        {/* Bộ lọc trạng thái */}
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'Pending', 'Resolved'].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? 'Tất cả' : s === 'Pending' ? '⏳ Chờ xử lý' : '✅ Đã xử lý'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>Không có phản hồi nào</p>
        </div>
      ) : (
        <div className="card-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Người Gửi</th>
                <th>Vai Trò</th>
                <th>Tiêu Đề Khiếu Nại</th>
                <th>Ngày Gửi</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ opacity: c.status === 'Resolved' ? 0.7 : 1 }}>
                  <td>
                    <div style={{ fontWeight: '600' }}>{c.senderName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.senderEmail}</div>
                  </td>
                  <td>
                    <span className={`role-badge ${c.role === 'Landlord' ? 'landlord' : 'tenant'}`}>
                      {c.role === 'Landlord' ? 'Chủ trọ' : 'Người thuê'}
                    </span>
                  </td>
                  <td style={{ maxWidth: '300px' }}>
                    <div style={{ fontWeight: '600' }}>{c.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.content}
                    </div>
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td>{formatDate(c.createdAt)}</td>
                  <td>
                    <span className={`status-pill ${c.status === 'Resolved' ? 'occupied' : 'vacant'}`}>
                      {c.status === 'Resolved' ? '✅ Đã xử lý' : '⏳ Chờ xử lý'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => handleOpenReplyModal(c)}>
                      {c.status === 'Resolved' ? 'Xem phản hồi' : 'Trả lời'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reply Modal */}
      {selectedComplaint && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 className="modal-title">Xử Lý Khiếu Nại</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setSelectedComplaint(null)}>✕</button>
            </div>
            <form onSubmit={handleSendReply}>
              <div className="modal-body">
                {/* Nội dung khiếu nại */}
                <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', borderLeft: '4px solid #6366f1' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Từ: <strong>{selectedComplaint.senderName}</strong> ({selectedComplaint.role === 'Landlord' ? 'Chủ trọ' : 'Người thuê'}) — {new Date(selectedComplaint.createdAt).toLocaleDateString('vi-VN')}
                    Từ: <strong>{selectedComplaint.senderName}</strong> ({selectedComplaint.role === 'Landlord' ? 'Chủ trọ' : 'Người thuê'}) — {formatDate(selectedComplaint.createdAt)}
                  </div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--text-primary)' }}>{selectedComplaint.title}</h4>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>{selectedComplaint.content}</p>
                </div>

                {/* Phản hồi trước (nếu có) */}
                {selectedComplaint.reply && (
                  <div style={{ background: 'rgba(16,185,129,0.1)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', borderLeft: '4px solid #10b981' }}>
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, marginBottom: 4 }}>✅ Phản hồi trước đó:</div>
                    <p style={{ fontSize: '14px', margin: 0 }}>{selectedComplaint.reply}</p>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Nội dung phản hồi *</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    required
                    placeholder="Nhập nội dung giải quyết hoặc hướng dẫn cho người dùng..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedComplaint(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? '⏳ Đang gửi...' : <><Send size={16} /> Gửi & Đánh Dấu Đã Xử Lý</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
