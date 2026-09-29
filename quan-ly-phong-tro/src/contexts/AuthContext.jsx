import { createContext, useContext, useState, useCallback } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(email, password);
      setUser({ id: data.userId, role: data.role, fullName: data.fullName, email: data.email, avatarUrl: data.avatarUrl });
      return data;
    } catch (err) {
      let msg = err.response?.data?.message;
      if (!msg) {
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          msg = 'Máy chủ phản hồi quá lâu (Render có thể đang khởi động lại). Vui lòng thử lại sau 10 giây!';
        } else if (err.message === 'Network Error' || !err.response) {
          msg = 'Không thể kết nối đến máy chủ API. Máy chủ có thể đang thức dậy sau chế độ ngủ, vui lòng thử lại sau giây lát!';
        } else {
          msg = err.message || 'Đăng nhập thất bại';
        }
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
    }
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(prev => {
      const updated = { ...(prev || {}), ...userData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
