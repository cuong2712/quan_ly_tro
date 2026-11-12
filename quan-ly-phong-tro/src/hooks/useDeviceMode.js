import { useState, useEffect } from 'react';

/**
 * Hook tự động nhận diện thiết bị (Mobile vs Web/Desktop):
 * - Dùng điện thoại (màn hình < 768px hoặc User Agent di động) -> tự động ra giao diện mobile.
 * - Dùng máy tính / laptop (màn hình >= 768px) -> tự động ra giao diện web.
 */
export function useDeviceMode() {
  const checkIsMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    const isSmallScreen = window.innerWidth < 768;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || ''
    );
    return isSmallScreen || isMobileUA;
  };

  const [isMobile, setIsMobile] = useState(checkIsMobileDevice);

  useEffect(() => {
    // Tự động xóa cờ view cũ (nếu có trước đây) để tránh bị kẹt giao diện mobile trên máy tính
    try {
      localStorage.removeItem('smartrent_preferred_view');
    } catch {}

    const handleResize = () => {
      setIsMobile(checkIsMobileDevice());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isMobile, isMobileDevice: isMobile, preferredView: isMobile ? 'mobile' : 'desktop', setView: () => {} };
}
