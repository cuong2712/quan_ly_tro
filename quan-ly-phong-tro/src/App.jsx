import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { NotificationToastContainer } from './components/Common/NotificationToast';
import { PrivateRoute, RoleRedirect } from './components/Common/PrivateRoute';
import LoginPage from './pages/LoginPage';
import './styles/main.css';

// ─── Dashboards theo role ───────────────────────────
import AdminPage from './pages/AdminPage';
import LandlordPage from './pages/LandlordPage';
import TenantPage from './pages/TenantPage';

function ToastHost() {
  const { toasts, dismissToast } = useNotification();
  return <NotificationToastContainer toasts={toasts} onDismiss={dismissToast} />;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ToastHost />
          <Routes>
            {/* Public */}
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

            {/* Root redirect theo role */}
            <Route path="/" element={<RoleRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
