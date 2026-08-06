import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, LogIn, Home, Lock, Mail } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', email: 'admin@smartrent.vn', password: 'Admin@123456', role: 'SuperAdmin', color: '#7c3aed', badge: '👑' },
  { label: 'Chủ Trọ', email: 'landlord@smartrent.vn', password: 'Landlord@123456', role: 'Landlord', color: '#0ea5e9', badge: '🏠' },
  { label: 'Người Thuê', email: 'tenant1@smartrent.vn', password: 'Tenant@123456', role: 'Tenant', color: '#10b981', badge: '👤' },
];

const ROLE_PATHS = { SuperAdmin: '/admin', Landlord: '/landlord', Tenant: '/tenant' };

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await login(email, password);
      const path = from || ROLE_PATHS[data.role] || '/';
      navigate(path, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
    setIsLoading(true);
    try {
      const data = await login(account.email, account.password);
      navigate(ROLE_PATHS[data.role] || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Đang sử dụng dữ liệu demo (backend chưa kết nối)');
      // Fallback demo login khi backend chưa kết nối
      setTimeout(() => {
        localStorage.setItem('accessToken', 'demo-token');
        localStorage.setItem('user', JSON.stringify({ id: '1', role: account.role, fullName: account.label + ' Demo', email: account.email }));
        window.location.href = ROLE_PATHS[account.role];
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-blob blob-1" />
        <div className="login-blob blob-2" />
        <div className="login-blob blob-3" />
      </div>

      <div className="login-container">
        {/* Left Panel */}
        <div className="login-left">
          <div className="login-brand">
            <div className="login-logo">
              <Home size={32} />
            </div>
            <h1>SmartRent</h1>
            <p>Hệ thống quản lý phòng trọ thông minh</p>
          </div>

          <div className="login-features">
            <div className="login-feature">
              <span>👑</span>
              <div>
                <h3>Super Admin</h3>
                <p>Quản trị toàn bộ hệ thống, chủ trọ, thống kê & phản hồi</p>
              </div>
            </div>
            <div className="login-feature">
              <span>🏠</span>
              <div>
                <h3>Chủ Trọ</h3>
                <p>Quản lý khu trọ, phòng, hợp đồng, hóa đơn & bảo trì</p>
              </div>
            </div>
            <div className="login-feature">
              <span>👤</span>
              <div>
                <h3>Người Thuê</h3>
                <p>Xem hóa đơn, thanh toán QR, yêu cầu bảo trì & thông báo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="login-right">
          <div className="login-card">
            <h2>Đăng nhập</h2>
            <p className="login-subtitle">Chào mừng trở lại SmartRent!</p>

            {error && (
              <div className="login-error">
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label>Email</label>
                <div className="login-input-wrap">
                  <Mail size={18} className="login-input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="login-field">
                <label>Mật khẩu</label>
                <div className="login-input-wrap">
                  <Lock size={18} className="login-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button type="button" className="login-eye" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-btn" disabled={isLoading}>
                {isLoading ? (
                  <span className="login-spinner" />
                ) : (
                  <><LogIn size={18} /> Đăng nhập</>
                )}
              </button>
            </form>

            <div className="login-divider"><span>Tài khoản demo</span></div>

            <div className="login-demos">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.role}
                  className="login-demo-btn"
                  style={{ '--demo-color': acc.color }}
                  onClick={() => handleDemoLogin(acc)}
                  disabled={isLoading}
                >
                  <span className="demo-badge">{acc.badge}</span>
                  <div className="demo-info">
                    <span className="demo-label">{acc.label}</span>
                    <span className="demo-email">{acc.email}</span>
                  </div>
                </button>
              ))}
            </div>

            <p className="login-footer">
              © 2026 SmartRent. Phiên bản 2.0
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f1117;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          position: relative;
          overflow: hidden;
        }
        .login-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .login-blob {
          position: absolute; border-radius: 50%;
          filter: blur(80px); opacity: 0.12;
          animation: blobPulse 8s ease-in-out infinite alternate;
        }
        .blob-1 { width: 600px; height: 600px; background: #7c3aed; top: -200px; left: -200px; animation-delay: 0s; }
        .blob-2 { width: 500px; height: 500px; background: #0ea5e9; bottom: -200px; right: -100px; animation-delay: 3s; }
        .blob-3 { width: 400px; height: 400px; background: #10b981; top: 50%; right: 30%; animation-delay: 6s; }
        @keyframes blobPulse { from { transform: scale(1) rotate(0deg); } to { transform: scale(1.2) rotate(15deg); } }

        .login-container {
          display: flex; gap: 0;
          width: 100%; max-width: 1000px;
          min-height: 600px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          backdrop-filter: blur(20px);
          overflow: hidden;
          position: relative; z-index: 1;
          box-shadow: 0 25px 80px rgba(0,0,0,0.5);
          margin: 20px;
        }

        .login-left {
          flex: 1;
          background: linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(14,165,233,0.1) 100%);
          padding: 48px 40px;
          border-right: 1px solid rgba(255,255,255,0.08);
          display: flex; flex-direction: column; justify-content: center;
        }
        .login-brand { margin-bottom: 48px; }
        .login-logo {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, #7c3aed, #0ea5e9);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          color: white; margin-bottom: 16px;
          box-shadow: 0 8px 32px rgba(124,58,237,0.4);
        }
        .login-brand h1 { font-size: 2rem; font-weight: 800; color: #fff; margin: 0 0 8px; }
        .login-brand p { color: rgba(255,255,255,0.5); font-size: 0.95rem; margin: 0; }
        .login-features { display: flex; flex-direction: column; gap: 20px; }
        .login-feature {
          display: flex; align-items: flex-start; gap: 16px;
          padding: 16px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .login-feature span { font-size: 1.5rem; }
        .login-feature h3 { margin: 0 0 4px; color: #fff; font-size: 0.9rem; font-weight: 600; }
        .login-feature p { margin: 0; color: rgba(255,255,255,0.45); font-size: 0.8rem; line-height: 1.4; }

        .login-right {
          width: 420px;
          display: flex; align-items: center; justify-content: center;
          padding: 40px 32px;
        }
        .login-card { width: 100%; }
        .login-card h2 { font-size: 1.75rem; font-weight: 800; color: #fff; margin: 0 0 6px; }
        .login-subtitle { color: rgba(255,255,255,0.4); font-size: 0.9rem; margin: 0 0 28px; }

        .login-error {
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.3);
          color: #fca5a5; border-radius: 10px;
          padding: 12px 16px; margin-bottom: 20px;
          font-size: 0.875rem; display: flex; align-items: center; gap: 8px;
        }

        .login-form { display: flex; flex-direction: column; gap: 18px; }
        .login-field { display: flex; flex-direction: column; gap: 8px; }
        .login-field label { color: rgba(255,255,255,0.7); font-size: 0.875rem; font-weight: 500; }
        .login-input-wrap { position: relative; }
        .login-input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.3); }
        .login-input-wrap input {
          width: 100%; padding: 12px 44px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px; color: #fff;
          font-size: 0.95rem; outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .login-input-wrap input:focus { border-color: #7c3aed; background: rgba(124,58,237,0.08); box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
        .login-input-wrap input::placeholder { color: rgba(255,255,255,0.2); }
        .login-eye {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: rgba(255,255,255,0.3);
          cursor: pointer; padding: 0;
        }
        .login-eye:hover { color: rgba(255,255,255,0.7); }

        .login-btn {
          padding: 14px;
          background: linear-gradient(135deg, #7c3aed, #0ea5e9);
          border: none; border-radius: 12px;
          color: #fff; font-size: 1rem; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s; margin-top: 4px;
          box-shadow: 0 4px 20px rgba(124,58,237,0.4);
        }
        .login-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(124,58,237,0.5); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .login-spinner {
          width: 20px; height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .login-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 24px 0 16px; color: rgba(255,255,255,0.25); font-size: 0.8rem;
        }
        .login-divider::before, .login-divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.1); }

        .login-demos { display: flex; flex-direction: column; gap: 10px; }
        .login-demo-btn {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; cursor: pointer;
          transition: all 0.2s; text-align: left;
          position: relative; overflow: hidden;
        }
        .login-demo-btn::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0;
          width: 3px; background: var(--demo-color);
          border-radius: 2px 0 0 2px;
        }
        .login-demo-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          border-color: var(--demo-color);
          transform: translateX(4px);
        }
        .demo-badge { font-size: 1.2rem; }
        .demo-info { display: flex; flex-direction: column; gap: 2px; }
        .demo-label { color: #fff; font-size: 0.875rem; font-weight: 600; }
        .demo-email { color: rgba(255,255,255,0.35); font-size: 0.75rem; }

        .login-footer { text-align: center; margin-top: 24px; color: rgba(255,255,255,0.2); font-size: 0.75rem; }

        @media (max-width: 768px) {
          .login-container { flex-direction: column; }
          .login-left { display: none; }
          .login-right { width: 100%; padding: 32px 24px; }
        }
      `}</style>
    </div>
  );
}
