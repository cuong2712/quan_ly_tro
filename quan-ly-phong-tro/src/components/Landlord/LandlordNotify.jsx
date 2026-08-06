import React, { useState } from 'react';
import { BellRing, Plus, Send, Edit, Trash2 } from 'lucide-react';

export const LandlordNotify = ({ notifications, setNotifications, zones, rooms }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target: 'all_tenants',
    targetId: 'all',
  });

  const handleSave = (e) => {
    e.preventDefault();
    const newN = {
      id: `N00${notifications.length + 1}`,
      title: formData.title,
      content: formData.content,
      target: formData.target,
      targetName: formData.target === 'all_tenants' ? 'Tất cả khách thuê' : `Khu / Phòng: ${formData.targetId}`,
      sender: 'Chủ trọ Nguyễn Văn Hải',
      createdAt: new Date().toLocaleString('vi-VN'),
      isRead: false,
    };
    setNotifications([newN, ...notifications]);
    setIsModalOpen(false);
    alert('Đã phát thông báo thành công!');
  };

  const handleDelete = (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
      setNotifications(notifications.filter(n => n.id !== id));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><BellRing size={24} color="#6366f1" /> Quản Lý Thông Báo Cho Khách Thuê</h2>
          <p className="page-subtitle">Tạo thông báo gửi tới từng phòng hoặc toàn bộ khách thuê trong các khu trọ</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Gửi Thông Báo Mới
        </button>
      </div>

      <div className="card-table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã TB</th>
              <th>Tiêu Đề</th>
              <th>Nội Dung</th>
              <th>Phạm Vi Gửi</th>
              <th>Thời Gian</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((n) => (
              <tr key={n.id}>
                <td><strong>{n.id}</strong></td>
                <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{n.title}</td>
                <td style={{ maxWidth: '350px', color: 'var(--text-secondary)' }}>{n.content}</td>
                <td><span className="status-pill vacant">{n.targetName}</span></td>
                <td>{n.createdAt}</td>
                <td>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(n.id)}>
                    <Trash2 size={14} /> Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Gửi Thông Báo Mới</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>X</button>
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
                  <label className="form-label">Gửi Đến Phạm Vi</label>
                  <select
                    className="form-control"
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  >
                    <option value="all_tenants">Tất cả khách thuê trong các khu trọ</option>
                    <option value="zone">Khu trọ cụ thể</option>
                    <option value="room">Phòng trọ cụ thể</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  <Send size={16} /> Gửi Thông Báo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
