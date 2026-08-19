import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { notificationService } from '../services';
import { playNotificationSound } from '../components/Common/NotificationToast';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [recentAlert, setRecentAlert] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef(null);
  const alertTimerRef = useRef(null);

  // Tính số thông báo chưa đọc
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Lấy danh sách thông báo ban đầu khi user đăng nhập
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    try {
      const data = await notificationService.getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách thông báo:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Hàm xóa toast khỏi hàng đợi
  const dismissToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => (t.toastId || t.id) !== toastId));
  }, []);

  // Hàm đóng popover nhỏ cạnh chuông
  const dismissRecentAlert = useCallback(() => {
    setRecentAlert(null);
    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
      alertTimerRef.current = null;
    }
  }, []);

  // Hàm kích hoạt popover nhỏ cạnh chuông khi nhận thông báo
  const triggerRecentAlert = useCallback((notification) => {
    setRecentAlert(notification);
    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
    }
    // Tự động đóng sau 4 giây để người dùng kịp đọc lướt
    alertTimerRef.current = setTimeout(() => {
      setRecentAlert(null);
      alertTimerRef.current = null;
    }, 4000);
  }, []);

  // Hàm thêm một toast mới kèm tự động đóng sau 6s
  const addToast = useCallback((notification) => {
    const toastId = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const toastItem = { ...notification, toastId };

    setToasts(prev => [toastItem, ...prev.slice(0, 4)]); // Tối đa 5 toast cùng lúc
    triggerRecentAlert(notification);

    // Phát âm thanh báo hiệu
    playNotificationSound();

    // Tự động đóng sau 6 giây
    setTimeout(() => {
      dismissToast(toastId);
    }, 6000);
  }, [dismissToast, triggerRecentAlert]);

  // Khởi tạo kết nối SignalR Realtime Hub
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const baseApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    const hubUrl = `${baseApiUrl}/hubs/notifications`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem('token') || '',
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 1000, 3000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Lắng nghe sự kiện ReceiveNotification từ server
    connection.on('ReceiveNotification', (newNotif) => {
      // 1. Cập nhật danh sách thông báo trong state
      setNotifications(prev => {
        const exists = prev.some(n => n.id === newNotif.id);
        if (exists) return prev;
        return [newNotif, ...prev];
      });

      // 2. Hiển thị Toast nổi & phát âm thanh
      addToast(newNotif);
    });

    // Kết nối SignalR
    connection.start()
      .then(() => {
        setIsConnected(true);
        connectionRef.current = connection;
      })
      .catch((err) => {
        console.warn('Không thể kết nối SignalR Hub:', err.message);
        setIsConnected(false);
      });

    connection.onreconnecting(() => setIsConnected(false));
    connection.onreconnected(() => setIsConnected(true));
    connection.onclose(() => setIsConnected(false));

    return () => {
      connection.stop();
      connectionRef.current = null;
    };
  }, [isAuthenticated, user, addToast]);

  // Đánh dấu đã đọc một thông báo
  const markAsRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc:', err);
    }
  };

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    await Promise.all(unread.map(n => notificationService.markRead(n.id).catch(() => {})));
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // Xóa một thông báo
  const deleteNotification = async (id) => {
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      dismissToast(id);
    } catch (err) {
      console.error('Lỗi xóa thông báo:', err);
    }
  };

  // Tự động chuyển tab/dashboard tương ứng khi click vào thông báo
  const navigateToNotification = useCallback((notif) => {
    if (!notif) return;

    if (!notif.isRead && notif.id) {
      markAsRead(notif.id);
    }
    dismissRecentAlert();

    const title = (notif.title || '').toLowerCase();
    const content = (notif.content || '').toLowerCase();
    const fullText = `${title} ${content}`;

    const role = user?.role || '';
    let targetTab = '';

    if (role === 'Landlord' || role?.toLowerCase() === 'landlord') {
      if (fullText.includes('bảo trì') || fullText.includes('sự cố') || fullText.includes('sửa chữa') || fullText.includes('hỏng') || fullText.includes('thiết bị') || fullText.includes('máy lạnh') || fullText.includes('cống') || fullText.includes('rò rỉ') || fullText.includes('khóa')) {
        targetTab = 'll_maintenance';
      } else if (fullText.includes('hợp đồng') || fullText.includes('gia hạn') || fullText.includes('hạn hđ') || fullText.includes('contract') || fullText.includes('cọc') || fullText.includes('quyết toán')) {
        targetTab = 'll_contracts';
      } else if (fullText.includes('khiếu nại') || fullText.includes('hóa đơn') || fullText.includes('tiền nhà') || fullText.includes('tiền phòng') || fullText.includes('invoice')) {
        targetTab = 'll_invoices';
      } else if (fullText.includes('thanh toán') || fullText.includes('chuyển khoản') || fullText.includes('minh chứng') || fullText.includes('payment')) {
        targetTab = 'll_payments';
      } else if (fullText.includes('điện') || fullText.includes('nước') || fullText.includes('chỉ số')) {
        targetTab = 'll_utilities';
      } else {
        targetTab = 'll_notifications';
      }
    } else if (role === 'Tenant' || role?.toLowerCase() === 'tenant') {
      if (fullText.includes('bảo trì') || fullText.includes('sự cố') || fullText.includes('sửa chữa') || fullText.includes('hỏng') || fullText.includes('thiết bị')) {
        targetTab = 'tn_repairs';
      } else if (fullText.includes('hợp đồng') || fullText.includes('gia hạn') || fullText.includes('hạn hđ') || fullText.includes('contract') || fullText.includes('cọc') || fullText.includes('quyết toán')) {
        targetTab = 'tn_contract';
      } else if (fullText.includes('hóa đơn') || fullText.includes('tiền nhà') || fullText.includes('tiền phòng') || fullText.includes('invoice')) {
        targetTab = 'tn_invoices';
      } else if (fullText.includes('thanh toán') || fullText.includes('chuyển khoản') || fullText.includes('payment')) {
        targetTab = 'tn_payment';
      } else {
        targetTab = 'tn_notifications';
      }
    }

    if (targetTab) {
      window.dispatchEvent(new CustomEvent('smartrent:switch-tab', { detail: { tab: targetTab } }));
    }
  }, [user, dismissRecentAlert]);

  const value = {
    notifications,
    setNotifications,
    unreadCount,
    toasts,
    dismissToast,
    addToast,
    recentAlert,
    dismissRecentAlert,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    navigateToNotification,
    refetchNotifications: fetchNotifications,
    isConnected,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification phải được sử dụng bên trong NotificationProvider');
  }
  return context;
}
