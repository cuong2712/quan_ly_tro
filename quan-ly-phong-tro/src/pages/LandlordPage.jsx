import React, { useState, useEffect, lazy, Suspense } from 'react';
import '../styles/main.css';
import { Navbar } from '../components/Common/Navbar';
import { Sidebar } from '../components/Common/Sidebar';
import { TabLoader, TabError } from '../components/Common/TabLoader';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTabData } from '../hooks/useTabData';
import {
  invoiceService, paymentService, maintenanceService,
  notificationService, dashboardService, serviceMgmtService,
  utilityService, tenantService, contractService, roomService, zoneService
} from '../services';

// Lazy load — chỉ load khi cần
const LandlordDashboard = lazy(() => import('../components/Landlord/LandlordDashboard').then(m => ({ default: m.LandlordDashboard })));
const ZoneExplorer      = lazy(() => import('../components/Landlord/ZoneExplorer').then(m => ({ default: m.ZoneExplorer })));
const TenantMgmt        = lazy(() => import('../components/Landlord/TenantMgmt').then(m => ({ default: m.TenantMgmt })));
const ContractMgmt      = lazy(() => import('../components/Landlord/ContractMgmt').then(m => ({ default: m.ContractMgmt })));
const UtilityMgmt       = lazy(() => import('../components/Landlord/UtilityMgmt').then(m => ({ default: m.UtilityMgmt })));
const ServiceMgmt       = lazy(() => import('../components/Landlord/ServiceMgmt').then(m => ({ default: m.ServiceMgmt })));
const InvoiceMgmt       = lazy(() => import('../components/Landlord/InvoiceMgmt').then(m => ({ default: m.InvoiceMgmt })));
const PaymentMgmt       = lazy(() => import('../components/Landlord/PaymentMgmt').then(m => ({ default: m.PaymentMgmt })));
const MaintenanceMgmt   = lazy(() => import('../components/Landlord/MaintenanceMgmt').then(m => ({ default: m.MaintenanceMgmt })));
const LandlordReports   = lazy(() => import('../components/Landlord/LandlordReports').then(m => ({ default: m.LandlordReports })));
const LandlordNotify    = lazy(() => import('../components/Landlord/LandlordNotify').then(m => ({ default: m.LandlordNotify })));
const LandlordProfile   = lazy(() => import('../components/Landlord/LandlordProfile').then(m => ({ default: m.LandlordProfile })));

// Mapping tab → API fetchers (chỉ fetch khi tab active)
const TAB_FETCHERS = {
  ll_dashboard: {
    dashboard: dashboardService.getLandlordDashboard,
  },
  ll_tenants: {
    tenants: tenantService.getTenants,
    rooms: roomService.getRooms,
    zones: zoneService.getZones,
  },
  ll_contracts: {
    contracts: contractService.getContracts,
    rooms: roomService.getRooms,
    tenants: tenantService.getTenants,
    zones: zoneService.getZones,
  },
  ll_utilities: {
    utilityLogs: utilityService.getLogs,
    utilityRate: utilityService.getRate,
    rooms: roomService.getRooms,
    zones: zoneService.getZones,
  },
  ll_services: {
    services: serviceMgmtService.getServices,
  },
  ll_invoices: {
    invoices: invoiceService.getInvoices,
  },
  ll_payments: {
    payments: paymentService.getPayments,
    invoices: invoiceService.getInvoices,
  },
  ll_maintenance: {
    maintenanceRequests: maintenanceService.getRequests,
  },
  ll_reports: {
    invoices: invoiceService.getInvoices,
  },
  ll_notifications: {
    notifications: notificationService.getNotifications,
  },
  ll_zones: {},   // ZoneExplorer quản lý fetch nội bộ
  ll_profile: {}, // Không cần fetch
};

// Session storage key để persist tab khi reload
const TAB_KEY = 'landlord_active_tab';
const ACTIVE_TABS = new Set([
  'll_dashboard', 'll_zones', 'll_tenants', 'll_contracts',
  'll_invoices', 'll_payments', 'll_maintenance', 'll_utilities', 'll_services'
]);

export default function LandlordPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('dark');
  const [tabData, setTabData] = useState({});

  // ── Persist tab khi reload ─────────────────────────────────────
  const [activeTab, setActiveTabState] = useState(() => {
    const savedTab = sessionStorage.getItem(TAB_KEY);
    return ACTIVE_TABS.has(savedTab) ? savedTab : 'll_dashboard';
  });
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    sessionStorage.setItem(TAB_KEY, tab);
    // Xóa zone nav khi chuyển tab khác
    if (tab !== 'll_zones') sessionStorage.removeItem('zone_nav');
  };

  const { getTabData, loadingTabs, errorTabs, invalidate } = useTabData();

  useEffect(() => {
    const fetchers = TAB_FETCHERS[activeTab];
    if (!fetchers || Object.keys(fetchers).length === 0) return;
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

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const handleRefresh = (relatedTabs = []) => {
    invalidate(activeTab);
    relatedTabs.forEach(t => invalidate(t));
    const fetchers = TAB_FETCHERS[activeTab];
    if (fetchers && Object.keys(fetchers).length > 0) {
      getTabData(activeTab, fetchers).then(data => {
        if (data) setTabData(prev => ({ ...prev, [activeTab]: data }));
      });
    }
  };

  const setCurrentData = (key, value) =>
    setTabData(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], [key]: value } }));

  const notifications = tabData['ll_notifications']?.notifications || [];
  const d = currentData;

  const renderContent = () => {
    if (isLoading) return <TabLoader message="Đang tải dữ liệu..." />;
    if (error)     return <TabError message={error} onRetry={() => handleRefresh()} />;

    switch (activeTab) {
      case 'll_dashboard':
        return (
          <Suspense fallback={<TabLoader />}>
            <LandlordDashboard data={{ dashboard: d.dashboard, rooms: [], invoices: [], tenants: [], zones: [] }} />
          </Suspense>
        );
      case 'll_zones':
        // ZoneExplorer tự quản lý fetch nội bộ, hỗ trợ persist navigation
        return (
          <Suspense fallback={<TabLoader />}>
            <ZoneExplorer />
          </Suspense>
        );
      case 'll_tenants':
        return (
          <Suspense fallback={<TabLoader />}>
            <TenantMgmt
              tenants={d.tenants || []} setTenants={v => setCurrentData('tenants', v)}
              rooms={d.rooms || []} zones={d.zones || []} contracts={[]} setContracts={() => {}}
              onRefresh={() => handleRefresh()}
            />
          </Suspense>
        );
      case 'll_contracts':
        return (
          <Suspense fallback={<TabLoader />}>
            <ContractMgmt
              contracts={d.contracts || []} setContracts={v => setCurrentData('contracts', v)}
              rooms={d.rooms || []} tenants={d.tenants || []} zones={d.zones || []}
              onRefresh={() => handleRefresh()}
            />
          </Suspense>
        );
      case 'll_utilities':
        return (
          <Suspense fallback={<TabLoader />}>
            <UtilityMgmt
              rooms={d.rooms || []} setRooms={v => setCurrentData('rooms', v)}
              zones={d.zones || []}
              utilityLogs={d.utilityLogs || []} setUtilityLogs={v => setCurrentData('utilityLogs', v)}
              utilityRates={d.utilityRate ? [d.utilityRate] : []}
              setUtilityRates={arr => setCurrentData('utilityRate', arr[0])}
              onRefresh={() => handleRefresh()}
            />
          </Suspense>
        );
      case 'll_services':
        return (
          <Suspense fallback={<TabLoader />}>
            <ServiceMgmt
              services={d.services || []} setServices={v => setCurrentData('services', v)}
              onRefresh={() => handleRefresh()}
            />
          </Suspense>
        );
      case 'll_invoices':
        return (
          <Suspense fallback={<TabLoader />}>
            <InvoiceMgmt
              invoices={d.invoices || []} setInvoices={v => setCurrentData('invoices', v)}
              rooms={[]} tenants={[]} utilityLogs={[]} services={[]}
              onRefresh={() => handleRefresh(['ll_dashboard'])}
            />
          </Suspense>
        );
      case 'll_payments':
        return (
          <Suspense fallback={<TabLoader />}>
            <PaymentMgmt
              payments={d.payments || []} setPayments={v => setCurrentData('payments', v)}
              invoices={d.invoices || []} setInvoices={v => setCurrentData('invoices', v)}
              onRefresh={() => handleRefresh(['ll_invoices', 'll_dashboard'])}
            />
          </Suspense>
        );
      case 'll_maintenance':
        return (
          <Suspense fallback={<TabLoader />}>
            <MaintenanceMgmt
              maintenanceRequests={d.maintenanceRequests || []}
              setMaintenanceRequests={v => setCurrentData('maintenanceRequests', v)}
              rooms={[]}
              onRefresh={() => handleRefresh()}
            />
          </Suspense>
        );
      case 'll_reports':
        return (
          <Suspense fallback={<TabLoader />}>
            <LandlordReports data={{ invoices: d.invoices || [], rooms: [], tenants: [] }} />
          </Suspense>
        );
      case 'll_notifications':
        return (
          <Suspense fallback={<TabLoader />}>
            <LandlordNotify
              notifications={d.notifications || []}
              setNotifications={v => setCurrentData('notifications', v)}
              zones={[]} rooms={[]}
              onRefresh={() => handleRefresh()}
            />
          </Suspense>
        );
      case 'll_profile':
        return (
          <Suspense fallback={<TabLoader />}>
            <LandlordProfile activeLandlord={user} setActiveLandlord={() => {}} />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <Sidebar currentRole="landlord" activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        <Navbar
          currentRole="landlord"
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
