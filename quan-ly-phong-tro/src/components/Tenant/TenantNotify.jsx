import React, { useState } from 'react';
import {
  BellRing, Search, CheckCircle, Trash2, CheckCheck,
  ShieldCheck, Home, Calendar, Eye, X, Filter
} from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { formatDateTime } from '../../utils/formatters';

export const TenantNotify = ({ notifications: propNotifications, setNotifications }) => {
  const { notifications: contextNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotification();
  const notifications = propNotifications && propNotifications.length > 0 ? propNotifications : (contextNotifications || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [senderFilter, setSenderFilter] = useState('all');
  const [viewingNotif, setViewingNotif] = useState(null);

  const getSenderBadge = (n) => {
    if (n.target === 'SystemAll' || n.target === 'All' || (n.senderName && n.senderName.toLowerCase().includes('hệ thống')) || (n.senderName && n.senderName.toLowerCase().includes('admin'))) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          padding: '3px 10px', borderRadius: '16px', fontSize: '11.5px', fontWeight: 600
        }}>
          <ShieldCheck size={12} /> Ban Quản Trị Sàn
        </span>
      );
    }

    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        background: 'rgba(16, 185, 129, 0.15)', color: '#34d399',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        padding: '3px 10px', borderRadius: '16px', fontSize: '11.5px', fontWeight: 600
      }}>
        <Home size={12} /> {n.senderName || 'Chủ Nhà Trọ'}
      </span>
    );
  };

  const filtered = notifications.filter(n => {
    const matchesSearch = (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (n.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (n.senderName || '').toLowerCase().includes(searchTerm.toLowerCase());

    let matchesSender = true;
    const isSystem = n.target === 'SystemAll' || n.target === 'All' || (n.senderName && (n.senderName.toLowerCase().includes('hệ thống') || n.senderName.toLowerCase().includes('admin')));
    if (senderFilter === 'admin') matchesSender = isSystem;
    else if (senderFilter === 'landlord') matchesSender = !isSystem;

    return matchesSearch && matchesSender;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const adminNotifCount = notifications.filter(n => n.target === 'SystemAll' || n.target === 'All' || (n.senderName && (n.senderName.toLowerCase().includes('hệ thống') || n.senderName.toLowerCase().includes('admin')))).length;
  const landlordNotifCount = notifications.length - adminNotifCount;

  const handleOpenDetail = (n) => {
    if (!n.isRead) markAsRead(n.id);
    setViewingNotif(n);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="page-title"><BellRing size={24} color="#6366f1" /> Thông Báo & Tin Tức</h2>
          <p className="page-subtitle">Xem thông báo tiền phòng, bảo trì từ Chủ trọ và thông báo chính sách từ Ban Quản Trị SmartRent</p>
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

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--card-bg)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'grid', placeItems: 'center', color: '#6366f1' }}>
            <BellRing size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng Thông Báo</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{notifications.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--card-bg)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'grid', placeItems: 'center', color: '#ef4444' }}>
            <BellRing size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Chưa Đọc</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444', marginTop: '2px' }}>{unreadCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--card-bg)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'grid', placeItems: 'center', color: '#10b981' }}>
            <Home size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Từ Chủ Nhà Trọ</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>{landlordNotifCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--card-bg)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'grid', placeItems: 'center', color: '#818cf8' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Từ Ban Quản Trị</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#818cf8', marginTop: '2px' }}>{adminNotifCount}</div>
          </div>
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

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              className="filter-select"
              value={senderFilter}
              onChange={(e) => setSenderFilter(e.target.value)}
            >
              <option value="all">Tất cả nguồn gửi</option>
              <option value="landlord">🏠 Từ Chủ Nhà Trọ</option>
              <option value="admin">🛡️ Từ Ban Quản Trị Sàn</option>
            </select>
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
                <th style={{ width: '28%' }}>Tiêu Đề Thông Báo</th>
                <th style={{ width: '36%' }}>Nội Dung</th>
                <th style={{ width: '16%' }}>Nguồn Gửi</th>
                <th style={{ width: '12%' }}>Thời Gian</th>
                <th style={{ width: '8%' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr key={n.id} style={{ background: !n.isRead ? 'rgba(99, 102, 241, 0.04)' : 'transparent' }}>
                  <td>
                    <div
                      style={{ fontWeight: !n.isRead ? '700' : '600', color: !n.isRead ? '#818cf8' : 'var(--text-primary)', cursor: 'pointer' }}
                      onClick={() => handleOpenDetail(n)}
                      title="Bấm để xem toàn văn"
                    >
                      {n.title}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        maxWidth: '380px',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.4'
                      }}
                    >
                      {n.content}
                    </div>
                  </td>
                  <td>{getSenderBadge(n)}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {formatDateTime(n.createdAt)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleOpenDetail(n)}
                        title="Xem chi tiết"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteNotification(n.id)}
                        title="Xóa thông báo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Xem Toàn Văn Chi Tiết Thông Báo */}
      {viewingNotif && (
        <div className="modal-overlay" onClick={() => setViewingNotif(null)}>
          <div className="modal-content" style={{ maxWidth: '620px', width: '92%', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '16px 22px' }}>
              <h3 className="modal-title" style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BellRing size={18} color="#6366f1" /> Chi Tiết Thông Báo
              </h3>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setViewingNotif(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', lineHeight: '1.4' }}>
                {viewingNotif.title}
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div>{getSenderBadge(viewingNotif)}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> {formatDateTime(viewingNotif.createdAt)}
                </div>
              </div>

              <div style={{
                background: 'var(--bg-dark)',
                padding: '16px 18px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                lineHeight: '1.6',
                whiteSpace: 'pre-line'
              }}>
                {viewingNotif.content}
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '14px 22px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" style={{ padding: '7px 18px', fontSize: '13px' }} onClick={() => setViewingNotif(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
