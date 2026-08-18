import React, { useState } from 'react';
import { BellRing, Search, CheckCircle, Trash2, CheckCheck } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { formatDateTime } from '../../utils/formatters';

export const TenantNotify = ({ notifications: propNotifications, setNotifications }) => {
  const { notifications: contextNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotification();
  const notifications = propNotifications && propNotifications.length > 0 ? propNotifications : (contextNotifications || []);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = notifications.filter(n =>
    (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.content || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="page-title"><BellRing size={24} color="#6366f1" /> Thông Báo & Tin Tức</h2>
          <p className="page-subtitle">Xem thông báo tiền phòng, gia hạn hợp đồng, bảo trì và tin tức từ Chủ trọ</p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={markAllAsRead}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <CheckCheck size={16} color="#10b981" /> Đã đọc tất cả ({unreadCount})
          </button>
        )}
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

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <BellRing size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>Không có thông báo nào phù hợp.</p>
          </div>
        ) : (
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
                <tr key={n.id} style={{ background: !n.isRead ? 'rgba(99, 102, 241, 0.04)' : 'transparent' }}>
                  <td style={{ fontWeight: '700', color: !n.isRead ? '#6366f1' : 'var(--text-primary)' }}>
                    {n.title}
                  </td>
                  <td style={{ maxWidth: '380px', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{n.content}</td>
                  <td><strong>{n.senderName || n.sender || 'Hệ thống'}</strong></td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {formatDateTime(n.createdAt)}
                  </td>
                  <td>
                    <span className={`status-pill ${n.isRead ? 'active' : 'pending'}`}>
                      {n.isRead ? 'Đã đọc' : 'Chưa đọc'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {!n.isRead && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => markAsRead(n.id)}
                          title="Đánh dấu đã đọc"
                        >
                          <CheckCircle size={14} color="#10b981" />
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteNotification(n.id)}
                        title="Xóa thông báo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
