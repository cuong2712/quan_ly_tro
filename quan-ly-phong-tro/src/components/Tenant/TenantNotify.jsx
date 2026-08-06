import React, { useState } from 'react';
import { BellRing, Search, CheckCircle } from 'lucide-react';

export const TenantNotify = ({ notifications, setNotifications }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = notifications.filter(n =>
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMarkAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><BellRing size={24} color="#6366f1" /> Notifications & Annoucements</h2>
          <p className="page-subtitle">Xem thông báo đóng tiền nhà, bảo trì thang máy và quy định từ Chủ trọ</p>
        </div>
      </div>

      <div className="card-table-container">
        <div className="table-toolbar">
          <div className="search-input-group">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung thông báo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Tiêu Đề Thông Báo</th>
              <th>Nội Dung Chi Tiết</th>
              <th>Người Gửi</th>
              <th>Thời Gian</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((n) => (
              <tr key={n.id}>
                <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{n.title}</td>
                <td style={{ maxWidth: '350px', color: 'var(--text-secondary)' }}>{n.content}</td>
                <td>{n.sender}</td>
                <td>{n.createdAt}</td>
                <td>
                  <span className={`status-pill ${n.isRead ? 'active' : 'pending'}`}>
                    {n.isRead ? 'Đã đọc' : 'Chưa đọc'}
                  </span>
                </td>
                <td>
                  {!n.isRead && (
                    <button className="btn btn-sm btn-secondary" onClick={() => handleMarkAsRead(n.id)}>
                      <CheckCircle size={14} /> Đánh dấu đã đọc
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
