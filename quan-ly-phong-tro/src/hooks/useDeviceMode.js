import { useState, useEffect } from 'react';

/**
 * Hook tự động nhận diện thiết bị (Mobile vs Desktop)
 * - Tự động nhận diện màn hình điện thoại (< 768px) hoặc User Agent di động
 * - Cho phép người dùng chuyển đổi thủ công (Mobile / Desktop / Tự động)
 */
export function useDeviceMode() {
  const checkIsMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    const isSmallScreen = window.innerWidth < 768;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    return isSmallScreen || isMobileUA;
  };

  const [isMobileDevice, setIsMobileDevice] = useState(checkIsMobileDevice);
  const [preferredView, setPreferredView] = useState(() => {
    try {
      return localStorage.getItem('smartrent_preferred_view') || 'auto';
    } catch {
      return 'auto';
    }
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileDevice(checkIsMobileDevice());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setView = (mode) => {
    setPreferredView(mode);
    try {
      localStorage.setItem('smartrent_preferred_view', mode);
    } catch {}
  };

  // Xác định giao diện hiển thị:
  // - Nếu người dùng chọn 'mobile' -> hiển thị Mobile
  // - Nếu người dùng chọn 'desktop' -> hiển thị Desktop
  // - Nếu 'auto' -> tự động theo thiết bị đang mở
  const isMobile = preferredView === 'mobile' ? true : preferredView === 'desktop' ? false : isMobileDevice;

  return { isMobile, isMobileDevice, preferredView, setView };
}
