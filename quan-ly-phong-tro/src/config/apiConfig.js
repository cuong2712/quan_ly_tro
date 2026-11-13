let rawUrl = import.meta.env.VITE_API_URL || 'https://smartrent-api-vsuy.onrender.com/api';
if (rawUrl.includes('smartrent-api-dopp')) {
  rawUrl = rawUrl.replace('smartrent-api-dopp', 'smartrent-api-vsuy');
}
export const API_BASE_URL = rawUrl;
export const API_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, '');
export default API_BASE_URL;
