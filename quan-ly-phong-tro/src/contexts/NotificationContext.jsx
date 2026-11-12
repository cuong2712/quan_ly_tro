import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { notificationService } from '../services';
import { playNotificationSound } from '../utils/audio';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [recentAlert, setRecentAlert] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef(null);
  const alertTimerRef = useRef(null);
  const recentToastIdsRef = useRef(new Map()); // Map<notificationId, timestamp> chống trùng lặp tuyệt đối

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

  // Hàm thêm một toast mới kèm tự động đóng sau 5s (chống trùng lặp tuyệt đối theo cả ID, Title và Content)
  const addToast = useCallback((notification) => {
    if (!notification) return;
    const notifId = String(notification.id || notification.Id || `${notification.title}_${notification.content}`);

    setToasts(prev => {
      // 1. Chống trùng lặp: Nếu toast với ID hoặc Title+Content này đã đang hiển thị -> không hiển thị lại
      if (prev.some(t => 
        (t.id && String(t.id) === notifId) || 
        (t.Id && String(t.Id) === notifId) ||
        (t.title === notification.title && t.content === notification.content)
      )) {
        return prev;
      }

      const toastId = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const toastItem = { ...notification, toastId, id: notifId };

      triggerRecentAlert(notification);

      // Phát âm thanh báo hiệu
      playNotificationSound();

      // Tự động đóng sau 5 giây
      setTimeout(() => {
        dismissToast(toastId);
      }, 5000);

      // Giới hạn tối đa 3 toast hiển thị cùng lúc để không che kín màn hình
      return [toastItem, ...prev.slice(0, 2)];
    });
  }, [dismissToast, triggerRecentAlert]);

  // Ref để lưu addToast mới nhất tránh re-run useEffect khi addToast thay đổi reference
  const addToastRef = useRef(addToast);
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  // Khởi tạo kết nối SignalR Realtime Hub
  useEffect(() => {
    const currentUserId = user?.id;
    if (!isAuthenticated || !currentUserId) {
      if (connectionRef.current) {
        try {
          connectionRef.current.off('ReceiveNotification');
        } catch {}
        connectionRef.current.stop().catch(() => {});
        connectionRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) return;

    let isCancelled = false;
    const baseApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    const hubUrl = `${baseApiUrl}/hubs/notifications`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem('accessToken') || localStorage.getItem('token') || '',
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 1000, 3000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.None)
      .build();

    // Lắng nghe sự kiện ReceiveNotification từ server
    connection.on('ReceiveNotification', (newNotif) => {
      if (!newNotif) return;

      const notifId = String(newNotif.id || newNotif.Id || `${newNotif.title}_${newNotif.content}`);
      const dedupeKey = `${notifId}_${newNotif.title}`;
      const now = Date.now();

      // Chống trùng lặp tuyệt đối: Nếu thông báo này đã được xử lý trong vòng 15 giây, bỏ qua
      const lastSeen = recentToastIdsRef.current.get(dedupeKey);
      if (lastSeen && (now - lastSeen < 15000)) {
        return;
      }
      recentToastIdsRef.current.set(dedupeKey, now);

      // Dọn dẹp cache cũ hơn 60s
      for (const [key, time] of recentToastIdsRef.current.entries()) {
        if (now - time > 60000) {
          recentToastIdsRef.current.delete(key);
        }
      }

      // 1. Cập nhật danh sách thông báo trong state
      setNotifications(prev => {
        const exists = prev.some(n => 
          (n.id && String(n.id) === notifId) || 
          (n.Id && String(n.Id) === notifId) ||
          (n.title === newNotif.title && n.content === newNotif.content)
        );
        if (exists) return prev;
        return [newNotif, ...prev];
      });

      // 2. Hiển thị Toast nổi & phát âm thanh
      addToastRef.current?.(newNotif);

      // 3. Phát CustomEvent toàn cục để các trang tự động reload dữ liệu realtime không cần F5
      window.dispatchEvent(new CustomEvent('smartrent:realtime-update', {
        detail: { notification: newNotif, timestamp: now }
      }));
    });

    // Kết nối SignalR
    connection.start()
      .then(() => {
        if (!isCancelled) {
          setIsConnected(true);
          connectionRef.current = connection;
        } else {
          try {
            connection.off('ReceiveNotification');
          } catch {}
          connection.stop().catch(() => {});
        }
      })
      .catch((err) => {
        if (!isCancelled && !err.message?.includes('stopped during negotiation')) {
          console.warn('Không thể kết nối SignalR Hub:', err.message);
        }
        setIsConnected(false);
      });

    connection.onreconnecting(() => setIsConnected(false));
    connection.onreconnected(() => setIsConnected(true));
    connection.onclose(() => setIsConnected(false));

    return () => {
      isCancelled = true;
      try {
        connection.off('ReceiveNotification');
      } catch {}
      connection.stop().catch(() => {});
      connectionRef.current = null;
    };
  }, [isAuthenticated, user?.id]);

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
    } else if (role === 'SuperAdmin' || role?.toLowerCase() === 'superadmin') {
      if (fullText.includes('khiếu nại') || fullText.includes('góp ý') || fullText.includes('báo cáo') || fullText.includes('sai tiền') || fullText.includes('tranh chấp') || fullText.includes('dispute')) {
        targetTab = 'sa_complaints';
      } else if (fullText.includes('chủ trọ') || fullText.includes('landlord')) {
        targetTab = 'sa_landlords';
      } else if (fullText.includes('khách thuê') || fullText.includes('tenant')) {
        targetTab = 'sa_tenants';
      } else {
        targetTab = 'sa_notifications';
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
