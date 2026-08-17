import React, { useState } from 'react';
import { BellRing, Plus, Send, Trash2, Users, Home, Building2 } from 'lucide-react';
import { notificationService } from '../../services';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';

export const LandlordNotify = ({ notifications = [], setNotifications, zones = [], rooms = [], tenants = [], onRefresh }) => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target: 'AllTenants',
    targetId: '',
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        content: formData.content,
        target: formData.target,
        targetId: formData.targetId ? formData.targetId : null,
      };

      const created = await notificationService.create(payload);
      setNotifications([created, ...notifications]);
      setIsModalOpen(false);
      setFormData({ title: '', content: '', target: 'AllTenants', targetId: '' });
      alert('✅ Đã phát hành thông báo thành công!');
      onRefresh?.();
    } catch (err) {
      alert('Lỗi gửi thông báo: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
      try {
        await notificationService.delete(id);
        setNotifications(notifications.filter(n => n.id !== id));
        onRefresh?.();
      } catch (err) {
        alert('Lỗi xóa thông báo: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><BellRing size={24} color="#6366f1" /> Quản Lý Thông Báo Cho Khách Thuê</h2>
          <p className="page-subtitle">Tạo thông báo gửi tới từng khách thuê hoặc toàn bộ khách thuê trong các khu trọ</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Gửi Thông Báo Mới
        </button>
      </div>

      <div className="card-table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Tiêu Đề</th>
              <th>Nội Dung</th>
              <th>Người Gửi</th>
              <th>Phạm Vi Gửi</th>
              <th>Thời Gian</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {notifications.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Chưa có thông báo nào được phát hành.
                </td>
              </tr>
            ) : (
              notifications.map((n) => {
                const targetText = n.target === 'AllTenants' ? 'Tất cả khách thuê' 
                  : (n.target === 'User' ? 'Khách thuê cụ thể' : n.target);

                return (
                  <tr key={n.id}>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{n.title}</td>
                    <td style={{ maxWidth: '350px', color: 'var(--text-secondary)' }}>{n.content}</td>
                    <td><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{n.senderName || user?.fullName || 'Chủ trọ'}</span></td>
                    <td><span className="status-pill vacant">{targetText}</span></td>
                    <td>{formatDate(n.createdAt)}</td>
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(n.id)}>
                        <Trash2 size={14} /> Xóa
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Gửi Thông Báo Mới</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tiêu Đề Thông Báo</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="VD: Thông báo đóng tiền nhà tháng 8..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nội Dung Chi Tiết</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    required
                    placeholder="Nội dung thông báo chi tiết..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gửi Đến Đối Tượng</label>
                  <select
                    className="form-control"
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value, targetId: '' })}
                  >
                    <option value="AllTenants">Tất cả khách thuê thuộc quyền quản lý</option>
                    <option value="User">Gửi riêng cho một khách thuê cụ thể</option>
                  </select>
                </div>

                {formData.target === 'User' && (
                  <div className="form-group">
                    <label className="form-label">Chọn Khách Thuê</label>
                    <select
                      className="form-control"
                      required
                      value={formData.targetId}
                      onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                    >
                      <option value="">-- Chọn khách thuê --</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.userId || t.UserId || t.id}>
                          {t.fullName || t.name} (Phòng {t.roomNumber || 'Chưa xếp'}) - {t.phone}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Send size={16} /> {saving ? 'Đang gửi...' : 'Gửi Thông Báo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
