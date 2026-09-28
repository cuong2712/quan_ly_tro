import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { NotificationToastContainer } from './components/Common/NotificationToast';
import { PrivateRoute, RoleRedirect } from './components/Common/PrivateRoute';
import LoginPage from './pages/LoginPage';
import PublicPortalPage from './pages/PublicPortalPage';
import PublicRoomDetailPage from './pages/PublicRoomDetailPage';
import './styles/main.css';

// ─── Dashboards theo role ───────────────────────────
import AdminPage from './pages/AdminPage';
import LandlordPage from './pages/LandlordPage';
import TenantPage from './pages/TenantPage';

function ToastHost() {
  const { toasts, dismissToast, navigateToNotification } = useNotification();
  return <NotificationToastContainer toasts={toasts} onDismiss={dismissToast} onNavigate={navigateToNotification} />;
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
            <Route path="/phong/:id" element={<PublicRoomDetailPage />} />
            <Route path="/login" element={<LoginPage />} />

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
