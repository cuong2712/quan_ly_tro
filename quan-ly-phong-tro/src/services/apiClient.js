import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor - thêm JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - tự động unpacking ApiResponse<T> & refresh token khi lỗi
apiClient.interceptors.response.use(
  (response) => {
    // Nếu phản hồi là ApiResponse<T> chuẩn từ Backend
    const resData = response.data;
    if (resData && typeof resData === 'object' && 'success' in resData) {
      if (resData.success === false) {
        return Promise.reject(new Error(resData.message || 'Thao tác thất bại'));
      }
      // Trả về thuộc tính data nếu có, nếu không trả về resData
      return { ...response, data: resData.data !== undefined && resData.data !== null ? resData.data : resData };
    }
    return response;
  },
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const tokenData = res.data?.data || res.data;
          localStorage.setItem('accessToken', tokenData.accessToken);
          localStorage.setItem('refreshToken', tokenData.refreshToken);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokenData.accessToken}`;
          original.headers.Authorization = `Bearer ${tokenData.accessToken}`;
          return apiClient(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
