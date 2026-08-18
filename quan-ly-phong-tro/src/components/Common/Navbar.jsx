import React, { useState, useRef, useEffect } from 'react';
import { Shield, Home, User, Bell, Sun, Moon, LogOut, ChevronDown, Check, CheckCheck, X } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';

export const Navbar = ({
  currentRole,
  setCurrentRole,
  theme,
  toggleTheme,
  notifications: propNotifications,
  activeLandlord,
  activeTenant,
  onLogout,
  hideRoleSwitcher,
}) => {
  const {
    notifications: contextNotifications,
    unreadCount: contextUnreadCount,
    markAsRead,
    markAllAsRead,
    recentAlert,
    dismissRecentAlert,
    navigateToNotification,
  } = useNotification();
  const notifications = propNotifications && propNotifications.length > 0 ? propNotifications : (contextNotifications || []);
  const unreadCount = contextUnreadCount !== undefined ? contextUnreadCount : notifications.filter(n => !n.isRead).length;

  const [showNotifyDropdown, setShowNotifyDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const notifyRef = useRef(null);
  const userRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifyRef.current && !notifyRef.current.contains(e.target)) setShowNotifyDropdown(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUserDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userName =
    activeLandlord?.fullName || activeLandlord?.name ||
    activeTenant?.fullName || activeTenant?.name ||
    (currentRole === 'superadmin' ? 'Super Admin' : currentRole === 'landlord' ? 'Chủ Trọ' : 'Người Thuê');

  const userSubtitle =
    currentRole === 'superadmin' ? 'Quản trị hệ thống'
    : currentRole === 'landlord' ? 'Chủ khu trọ'
    : 'Khách thuê phòng';

  const avatarSrc =
    activeLandlord?.avatarUrl || activeTenant?.avatarUrl ||
    (currentRole === 'superadmin'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
      : currentRole === 'landlord'
      ? activeLandlord?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
      : activeTenant?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100');

  const roleBadgeColor =
    currentRole === 'superadmin' ? '#7c3aed'
    : currentRole === 'landlord' ? '#0ea5e9'
    : '#10b981';

  return (
    <header className="top-navbar">
      {/* LEFT: Logo / Role Switcher */}
      <div className="navbar-left">
        {!hideRoleSwitcher && setCurrentRole ? (
          <div className="role-switcher-bar">
            <button className={`role-btn ${currentRole === 'superadmin' ? 'active' : ''}`} onClick={() => setCurrentRole('superadmin')}>
              <Shield size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />Super Admin
            </button>
            <button className={`role-btn ${currentRole === 'landlord' ? 'active' : ''}`} onClick={() => setCurrentRole('landlord')}>
              <Home size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />Chủ Trọ
            </button>
            <button className={`role-btn ${currentRole === 'tenant' ? 'active' : ''}`} onClick={() => setCurrentRole('tenant')}>
              <User size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />Người Thuê
            </button>
          </div>
        ) : (
          <div className="navbar-brand">
            <span className="navbar-brand-dot" style={{ background: roleBadgeColor }} />
            <span className="navbar-brand-text">
              {currentRole === 'superadmin' ? '👑 Super Admin' : currentRole === 'landlord' ? '🏠 Chủ Trọ' : '👤 Người Thuê'}
            </span>
          </div>
        )}
      </div>

      {/* RIGHT: Actions — luôn luôn nằm bên phải */}
      <div className="top-navbar-actions">

        {/* 1. Toggle Light/Dark */}
        <button
          className="icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
        >
          {theme === 'dark'
            ? <Sun size={18} color="#f59e0b" />
            : <Moon size={18} color="#6366f1" />}
        </button>

        {/* 2. Notifications */}
        <div style={{ position: 'relative' }} ref={notifyRef}>
          <button
            className="icon-btn"
            onClick={() => {
              setShowNotifyDropdown(v => !v);
              setShowUserDropdown(false);
              dismissRecentAlert?.();
            }}
            title="Thông báo"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {/* 🔔 Mini Callout Box nổi bên cạnh chuông thông báo */}
          {recentAlert && !showNotifyDropdown && (
            <div
              className="notify-callout-popover"
              onClick={() => {
                navigateToNotification(recentAlert);
              }}
              title="Bấm để chuyển tới trang liên quan"
            >
              <div className="callout-arrow" />
              <div className="callout-icon">
                <Bell size={16} color="#f59e0b" />
              </div>
              <div className="callout-content">
                <div className="callout-badge-row">
                  <span className="callout-badge">Mới nhận</span>
                  <span className="callout-time">Vừa xong</span>
                </div>
                <div className="callout-title">{recentAlert.title}</div>
                <div className="callout-desc">{recentAlert.content}</div>
              </div>
              <button
                type="button"
                className="callout-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissRecentAlert?.();
                }}
                title="Đóng"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {showNotifyDropdown && (
            <div className="navbar-dropdown notify-dropdown">
              <div className="dropdown-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700 }}>Thông báo</span>
                  {unreadCount > 0 && <span className="badge-pill">{unreadCount} chưa đọc</span>}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-indigo, #6366f1)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCheck size={13} /> Đã đọc tất cả
                  </button>
                )}
              </div>
              
              {/* Tóm tắt nhanh */}
              {unreadCount > 0 && (
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
                  fontSize: '11.5px',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Bell size={13} />
                  <span>Bạn có <strong>{unreadCount}</strong> thông báo mới cần kiểm tra</span>
                </div>
              )}

              <div className="dropdown-body">
                {notifications.length === 0 ? (
                  <div className="dropdown-empty">
                    <Bell size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p>Không có thông báo nào</p>
                  </div>
                ) : (
                  notifications.slice(0, 8).map(n => (
                    <div
                      key={n.id}
                      className={`notify-item ${!n.isRead ? 'unread' : ''}`}
                      onClick={() => {
                        navigateToNotification(n);
                        setShowNotifyDropdown(false);
                      }}
                      style={{ cursor: 'pointer' }}
                      title="Bấm để mở trang liên quan đến thông báo này"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <div className="notify-title" style={{ fontWeight: !n.isRead ? '700' : '600' }}>{n.title}</div>
                        {!n.isRead && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                        )}
                      </div>
                      <div className="notify-content" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{n.content}</div>
                      <div className="notify-time" style={{ fontSize: '10.5px', marginTop: '4px', color: 'var(--text-muted)' }} title={formatDateTime(n.createdAt)}>
                        {n.createdAt ? formatRelativeTime(n.createdAt) : 'Vừa xong'}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 8 && (
                <div className="dropdown-footer">Tổng cộng {notifications.length} thông báo</div>
              )}
            </div>
          )}
        </div>

        {/* 3. User Info + Logout */}
        <div style={{ position: 'relative' }} ref={userRef}>
          <button
            className="user-pill"
            onClick={() => { setShowUserDropdown(v => !v); setShowNotifyDropdown(false); }}
          >
            <img src={avatarSrc} alt="Avatar" className="user-avatar" />
            <div className="user-info">
              <span className="user-name">{userName}</span>
              <span className="user-role">{userSubtitle}</span>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)', marginLeft: 2 }} />
          </button>

          {showUserDropdown && (
            <div className="navbar-dropdown user-dropdown">
              <div className="user-dropdown-header">
                <img src={avatarSrc} alt="Avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>{userName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{userSubtitle}</div>
                </div>
              </div>
              <div className="dropdown-divider" />
              <button
                className="user-dropdown-item theme-item"
                onClick={() => { toggleTheme(); setShowUserDropdown(false); }}
              >
                {theme === 'dark' ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} color="#6366f1" />}
                <span>{theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}</span>
              </button>
              {onLogout && (
                <>
                  <div className="dropdown-divider" />
                  <button className="user-dropdown-item logout-item" onClick={onLogout}>
                    <LogOut size={16} />
                    <span>Đăng xuất</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .navbar-left {
          display: flex;
          align-items: center;
        }
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .navbar-brand-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          box-shadow: 0 0 8px currentColor;
        }
        .navbar-brand-text {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .notification-badge {
          position: absolute;
          top: 6px; right: 6px;
          min-width: 16px; height: 16px;
          background: #ef4444;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3px;
          border: 2px solid var(--bg-primary);
        }
        .navbar-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          overflow: hidden;
          z-index: 200;
          animation: dropIn 0.2s ease;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .notify-dropdown { width: 360px; }
        .user-dropdown  { width: 240px; }
        .dropdown-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 10px;
          font-weight: 700;
          font-size: 14px;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-color);
        }
        .badge-pill {
          background: #ef4444;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .dropdown-body { max-height: 320px; overflow-y: auto; }
        .dropdown-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 32px 16px;
          color: var(--text-muted);
          font-size: 13px;
        }
        .notify-item {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          transition: background 0.15s;
        }
        .notify-item:hover { background: var(--bg-card-hover); }
        .notify-item.unread { border-left: 3px solid #7c3aed; }
        .notify-title { font-weight: 600; font-size: 13px; color: var(--text-primary); margin-bottom: 3px; }
        .notify-content { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; line-height: 1.4; }
        .notify-time { font-size: 11px; color: var(--text-muted); }
        .dropdown-footer {
          padding: 10px 16px;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: var(--primary);
          cursor: pointer;
          border-top: 1px solid var(--border-color);
        }
        .dropdown-footer:hover { background: var(--bg-card-hover); }
        .dropdown-divider { height: 1px; background: var(--border-color); margin: 4px 0; }
        .user-dropdown-header {
          display: flex; gap: 12px; align-items: center;
          padding: 16px;
        }
        .user-dropdown-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 10px 16px;
          background: none; border: none;
          color: var(--text-secondary); font-size: 14px;
          cursor: pointer; text-align: left;
          transition: background 0.15s;
        }
        .user-dropdown-item:hover { background: var(--bg-card-hover); color: var(--text-primary); }
        .logout-item:hover { background: rgba(239,68,68,0.1); color: #ef4444; }
        .user-pill {
          display: flex; align-items: center; gap: 10px;
          padding: 6px 12px 6px 6px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .user-pill:hover { border-color: var(--primary); background: var(--bg-card-hover); }
        .user-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; }
        .user-info { display: flex; flex-direction: column; text-align: left; }
        .user-name { font-size: 13px; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
        .user-role { font-size: 10px; color: var(--text-muted); }
      `}</style>
    </header>
  );
};
