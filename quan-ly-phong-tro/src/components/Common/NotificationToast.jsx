import React from 'react';
import { Bell, CheckCircle2, AlertTriangle, Info, X, Clock } from 'lucide-react';


// Icon & Màu sắc theo ngữ cảnh tiêu đề thông báo
const getToastConfig = (title = '') => {
  const t = title.toLowerCase();
  if (t.includes('thành công') || t.includes('phê duyệt') || t.includes('gia hạn') || t.includes('xác nhận') || t.includes('hoàn thành')) {
    return {
      icon: CheckCircle2,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.3)',
      badge: 'Thành công'
    };
  }
  if (t.includes('từ chối') || t.includes('hủy') || t.includes('cảnh báo') || t.includes('sai sót') || t.includes('hết hạn')) {
    return {
      icon: AlertTriangle,
      color: '#f43f5e',
      bg: 'rgba(244, 63, 94, 0.15)',
      border: 'rgba(244, 63, 94, 0.3)',
      badge: 'Cần chú ý'
    };
  }
  if (t.includes('yêu cầu') || t.includes('hóa đơn') || t.includes('sự cố') || t.includes('bảo trì') || t.includes('thanh toán')) {
    return {
      icon: Bell,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.3)',
      badge: 'Yêu cầu mới'
    };
  }
  return {
    icon: Info,
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.15)',
    border: 'rgba(99, 102, 241, 0.3)',
    badge: 'Thông báo'
  };
};

export const NotificationToastContainer = ({ toasts = [], onDismiss, onNavigate }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="notification-toast-container">
      {toasts.map((toast) => {
        const config = getToastConfig(toast.title);
        const IconComponent = config.icon;

        return (
          <div
            key={toast.toastId || toast.id || Math.random()}
            className="notification-toast-card animate-slide-left"
            style={{
              borderLeft: `4px solid ${config.color}`,
              cursor: onNavigate ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (onNavigate) {
                onNavigate(toast);
                onDismiss?.(toast.toastId || toast.id);
              }
            }}
            title={onNavigate ? 'Bấm để chuyển tới trang tương ứng' : ''}
          >
            <div className="toast-icon-wrapper" style={{ background: config.bg, color: config.color }}>
              <IconComponent size={20} />
            </div>

            <div className="toast-content-wrapper">
              <div className="toast-header-row">
                <span className="toast-badge" style={{ color: config.color, borderColor: config.border, background: config.bg }}>
                  {config.badge}
                </span>
                <span className="toast-time">
                  <Clock size={11} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
                  Vừa xong
                </span>
              </div>

              <h4 className="toast-title">{toast.title}</h4>
              <p className="toast-message">{toast.content}</p>

              {toast.senderName && (
                <div className="toast-sender">
                  Từ: <strong>{toast.senderName}</strong>
                </div>
              )}
            </div>

            <button
              type="button"
              className="toast-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss?.(toast.toastId || toast.id);
              }}
              title="Đóng thông báo"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
