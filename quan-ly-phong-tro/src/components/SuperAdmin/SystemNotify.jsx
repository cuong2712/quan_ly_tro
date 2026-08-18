import React, { useState } from 'react';
import { BellRing, Plus, Edit, Trash2, Send, Users, Home, User } from 'lucide-react';
import { notificationService } from '../../services';
import { formatDateTime } from '../../utils/formatters';

export const SystemNotify = ({ notifications, setNotifications, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotify, setEditingNotify] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target: 'AllLandlords',
  });

  const TARGET_OPTIONS = [
    { value: 'AllLandlords', label: '🏠 Tất cả Chủ Trọ', icon: <Home size={14} /> },
    { value: 'AllTenants',   label: '👤 Tất cả Người Thuê', icon: <User size={14} /> },
    { value: 'All',          label: '📢 Toàn hệ thống', icon: <Users size={14} /> },
  ];

  const handleOpenAdd = () => {
    setEditingNotify(null);
    setFormData({ title: '', content: '', target: 'AllLandlords' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (n) => {
    setEditingNotify(n);
    setFormData({ title: n.title, content: n.content, target: n.target || 'AllLandlords' });
    setIsModalOpen(true);
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        content: formData.content,
        target: formData.target,
        targetId: null,
      };

      if (editingNotify) {
        // Không có API update notification, tạm thời update local
        setNotifications(notifications.map(n =>
          n.id === editingNotify.id ? { ...n, ...formData } : n
        ));
      } else {
        const created = await notificationService.create(payload);
        setNotifications([created || { ...payload, id: Date.now(), createdAt: new Date().toISOString(), isRead: false }, ...notifications]);
        const targetLabel = TARGET_OPTIONS.find(t => t.value === formData.target)?.label || formData.target;
        alert(`✅ Đã phát thông báo đến ${targetLabel} thành công!`);
      }
      setIsModalOpen(false);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><BellRing size={24} color="#6366f1" /> Quản Lý Thông Báo Hệ Thống</h2>
          <p className="page-subtitle">Tạo và phát thông báo broadcast tới Chủ trọ, Người thuê hoặc toàn hệ thống</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Tạo Thông Báo Mới
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Tổng thông báo', value: notifications.length, color: '#6366f1' },
          { label: 'Chưa đọc', value: notifications.filter(n => !n.isRead).length, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ flex: '0 0 auto', minWidth: 160 }}>
            <div className="stat-number" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <BellRing size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>Chưa có thông báo nào. Tạo thông báo đầu tiên!</p>
        </div>
      ) : (
        <div className="card-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tiêu Đề</th>
                <th>Nội Dung</th>
                <th>Đối Tượng</th>
                <th>Ngày Tạo</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id}>
                  <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{n.title}</td>
                  <td style={{ maxWidth: '350px', color: 'var(--text-secondary)', fontSize: 13 }}>
                    {n.content?.length > 80 ? n.content.slice(0, 80) + '...' : n.content}
                  </td>
                  <td>
                    <span className="status-pill vacant">
                      {TARGET_OPTIONS.find(t => t.value === n.target)?.label || n.target || 'Hệ thống'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{formatDateTime(n.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleOpenEdit(n)} title="Sửa">
                        <Edit size={14} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(n.id)} title="Xóa">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingNotify ? '✏️ Sửa Thông Báo' : '📢 Tạo Thông Báo Mới'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tiêu Đề Thông Báo *</label>
                  <input
                    type="text" className="form-control" required
                    placeholder="VD: Bảo trì hệ thống định kỳ..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nội Dung Chi Tiết *</label>
                  <textarea
                    className="form-control" rows="4" required
                    placeholder="Nhập nội dung thông báo..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gửi Đến</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    {TARGET_OPTIONS.map(opt => (
                      <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', border: `2px solid ${formData.target === opt.value ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-md)', background: formData.target === opt.value ? 'rgba(99,102,241,0.1)' : 'transparent', transition: 'all 0.2s' }}>
                        <input type="radio" name="target" value={opt.value} checked={formData.target === opt.value} onChange={(e) => setFormData({ ...formData, target: e.target.value })} style={{ accentColor: 'var(--primary)' }} />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Đang gửi...' : <><Send size={16} /> {editingNotify ? 'Lưu thay đổi' : 'Phát Thông Báo'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
