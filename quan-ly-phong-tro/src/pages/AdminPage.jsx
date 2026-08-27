import React, { useState, useEffect, lazy, Suspense } from 'react';
import '../styles/main.css';
import { Navbar } from '../components/Common/Navbar';
import { Sidebar } from '../components/Common/Sidebar';
import { TabLoader, TabError } from '../components/Common/TabLoader';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { useTabData } from '../hooks/useTabData';
import { adminService, notificationService } from '../services';

// Lazy load components
const SuperAdminAnalytics = lazy(() => import('../components/SuperAdmin/SuperAdminAnalytics').then(m => ({ default: m.SuperAdminAnalytics })));
const LandlordsMgmt       = lazy(() => import('../components/SuperAdmin/LandlordsMgmt').then(m => ({ default: m.LandlordsMgmt })));
const TenantsMgmt         = lazy(() => import('../components/SuperAdmin/TenantsMgmt').then(m => ({ default: m.TenantsMgmt })));
const SystemComplaints    = lazy(() => import('../components/SuperAdmin/SystemComplaints').then(m => ({ default: m.SystemComplaints })));
const SystemNotify        = lazy(() => import('../components/SuperAdmin/SystemNotify').then(m => ({ default: m.SystemNotify })));

const TAB_FETCHERS = {
  sa_analytics:    { stats: adminService.getStats, landlords: adminService.getLandlords },
  sa_landlords:    { landlords: adminService.getLandlords },
  sa_tenants:      { landlords: adminService.getLandlords },
  sa_complaints:   { complaints: adminService.getComplaints },
  sa_notifications:{ notifications: notificationService.getNotifications },
};

export default function AdminPage() {
  const { user, logout } = useAuth();
  const { notifications, setNotifications } = useNotification();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sa_analytics');
  const [theme, setTheme] = useState('dark');
  const [tabData, setTabData] = useState({});

  const { getTabData, loadingTabs, errorTabs, invalidate } = useTabData();

  // Lắng nghe sự kiện Realtime SignalR để cập nhật dữ liệu tức thì không cần F5
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      invalidate(); // Xóa cache admin
      const fetchers = TAB_FETCHERS[activeTab];
      if (fetchers) {
        getTabData(activeTab, fetchers).then(data => {
          if (data) setTabData(prev => ({ ...prev, [activeTab]: data }));
        });
      }
    };

    window.addEventListener('smartrent:realtime-update', handleRealtimeUpdate);
    return () => window.removeEventListener('smartrent:realtime-update', handleRealtimeUpdate);
  }, [activeTab, getTabData, invalidate]);

  useEffect(() => {
    const fetchers = TAB_FETCHERS[activeTab];
    if (!fetchers) return;
    getTabData(activeTab, fetchers).then(data => {
      if (data) setTabData(prev => ({ ...prev, [activeTab]: data }));
    });
  }, [activeTab]);

  const currentData = tabData[activeTab] || {};
  const isLoading   = loadingTabs[activeTab];
  const error       = errorTabs[activeTab];

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.body.classList.toggle('light-mode', newTheme === 'light');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const handleRefresh = () => {
    invalidate(activeTab);
    const fetchers = TAB_FETCHERS[activeTab];
    if (fetchers) {
      getTabData(activeTab, fetchers).then(data => {
        if (data) setTabData(prev => ({ ...prev, [activeTab]: data }));
      });
    }
  };

  const setCurrentData = (key, value) =>
    setTabData(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], [key]: value } }));

  const renderContent = () => {
    if (isLoading) return <TabLoader message="Đang tải dữ liệu..." />;
    if (error)     return <TabError message={error} onRetry={handleRefresh} />;

    const d = currentData;
    switch (activeTab) {
      case 'sa_analytics':
        return (
          <Suspense fallback={<TabLoader />}>
            <SuperAdminAnalytics data={{ landlords: d.landlords || [], stats: d.stats }} />
          </Suspense>
        );
      case 'sa_landlords':
        return (
          <Suspense fallback={<TabLoader />}>
            <LandlordsMgmt
              landlords={d.landlords || []}
              setLandlords={v => setCurrentData('landlords', v)}
              onRefresh={handleRefresh}
            />
          </Suspense>
        );
      case 'sa_tenants':
        return (
          <Suspense fallback={<TabLoader />}>
            <TenantsMgmt
              landlords={d.landlords || []}
              onRefresh={handleRefresh}
            />
          </Suspense>
        );
      case 'sa_complaints':
        return (
          <Suspense fallback={<TabLoader />}>
            <SystemComplaints
              complaints={d.complaints || []}
              setComplaints={v => setCurrentData('complaints', v)}
              onRefresh={handleRefresh}
            />
          </Suspense>
        );
      case 'sa_notifications':
        return (
          <Suspense fallback={<TabLoader />}>
            <SystemNotify
              notifications={notifications || []}
              setNotifications={setNotifications}
              onRefresh={handleRefresh}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <Sidebar currentRole="superadmin" activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        <Navbar
          currentRole="superadmin"
          theme={theme}
          toggleTheme={toggleTheme}
          notifications={notifications}
          activeLandlord={user}
          onLogout={handleLogout}
          hideRoleSwitcher={true}
        />
        <main className="page-body">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
