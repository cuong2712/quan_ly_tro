import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { NotificationToastContainer } from './components/Common/NotificationToast';
import { PrivateRoute, RoleRedirect } from './components/Common/PrivateRoute';
import { useDeviceMode } from './hooks/useDeviceMode';
import LoginPage from './pages/LoginPage';
import PublicPortalPage from './pages/PublicPortalPage';
import PublicRoomDetailPage from './pages/PublicRoomDetailPage';
import MobileDemoPage from './pages/MobileDemoPage';
import './styles/main.css';

// ─── Dashboards theo role ───────────────────────────
import AdminPage from './pages/AdminPage';
import LandlordPage from './pages/LandlordPage';
import TenantPage from './pages/TenantPage';

function ToastHost() {
  const { toasts, dismissToast, navigateToNotification } = useNotification();
  return <NotificationToastContainer toasts={toasts} onDismiss={dismissToast} onNavigate={navigateToNotification} />;
}

// Điều hướng tự động: Trên mobile hiển thị giao diện Mobile, trên web hiển thị giao diện Web tương ứng
function MobileRouteWrapper() {
  const { isMobile } = useDeviceMode();
  const { user, isAuthenticated } = useAuth();

  if (!isMobile) {
    if (isAuthenticated) {
      if (user?.role === 'Landlord') return <Navigate to="/landlord" replace />;
      if (user?.role === 'Tenant') return <Navigate to="/tenant" replace />;
      if (user?.role === 'SuperAdmin') return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <MobileDemoPage />;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ToastHost />
          <Routes>
            {/* Cổng Khám Phá & Tìm Phòng Trọ Công Khai (Public) */}
            <Route path="/" element={<PublicPortalPage />} />
            <Route path="/portal" element={<PublicPortalPage />} />
            <Route path="/kham-pha" element={<PublicPortalPage />} />
            <Route path="/phong/:id" element={<PublicRoomDetailPage />} />
            <Route path="/phong-tro/:id" element={<PublicRoomDetailPage />} />
            <Route path="/room/:id" element={<PublicRoomDetailPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Tự động: Mobile -> Giao diện Mobile; Web -> Giao diện Web */}
            <Route path="/mobile-demo" element={<MobileRouteWrapper />} />
            <Route path="/mobile" element={<MobileRouteWrapper />} />

            {/* Role-based dashboards */}
            <Route
              path="/admin/*"
              element={
                <PrivateRoute requiredRole="SuperAdmin">
                  <AdminPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/landlord/*"
              element={
                <PrivateRoute requiredRole="Landlord">
                  <LandlordPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/tenant/*"
              element={
                <PrivateRoute requiredRole="Tenant">
                  <TenantPage />
                </PrivateRoute>
              }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
