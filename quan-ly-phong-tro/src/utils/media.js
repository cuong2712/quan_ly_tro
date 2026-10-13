/**
 * Tiện ích xử lý URL hình ảnh & media trong SmartRent
 * Đảm bảo các ảnh được upload lên server (bắt đầu bằng /uploads/...)
 * luôn được gắn đúng Host của Backend API (localhost:5000 hoặc Render)
 */
export const getMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  
  // Nếu đã là URL tuyệt đối hoặc base64
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  // Nếu là file tĩnh cục bộ trong frontend public/ (ví dụ /sample_room_360.jpg hoặc /lib/...)
  if (url === '/sample_room_360.jpg' || url.startsWith('/lib/') || url.startsWith('/icons/') || url.startsWith('/images/')) {
    return url;
  }

  // Các file lưu trữ trên Backend (ví dụ: /uploads/panoramas/..., /uploads/rooms/..., /uploads/avatars/...)
  const baseApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${baseApiUrl}${cleanPath}`;
};

export default getMediaUrl;
