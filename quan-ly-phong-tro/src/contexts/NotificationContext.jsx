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
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef(null);

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

  // Hàm thêm một toast mới kèm tự động đóng sau 6s
  const addToast = useCallback((notification) => {
    const toastId = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const toastItem = { ...notification, toastId };

    setToasts(prev => [toastItem, ...prev.slice(0, 4)]); // Tối đa 5 toast cùng lúc

    // Phát âm thanh báo hiệu
    playNotificationSound();

    // Tự động đóng sau 6 giây
    setTimeout(() => {
      dismissToast(toastId);
    }, 6000);
  }, [dismissToast]);

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

  const value = {
    notifications,
    setNotifications,
    unreadCount,
    toasts,
    dismissToast,
    addToast,
    markAsRead,
    markAllAsRead,
    deleteNotification,
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
