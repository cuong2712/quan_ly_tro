import React, { useState, useEffect } from 'react';
import '../styles/main.css';
import { Navbar } from '../components/Common/Navbar';
import { Sidebar } from '../components/Common/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import {
  invoiceService, paymentService, maintenanceService,
  notificationService, dashboardService, contractService
} from '../services';

// Tenant Components
import { TenantDashboard } from '../components/Tenant/TenantDashboard';
import { TenantProfile } from '../components/Tenant/TenantProfile';
import { TenantContract } from '../components/Tenant/TenantContract';
import { TenantInvoice } from '../components/Tenant/TenantInvoice';
import { TenantPayment } from '../components/Tenant/TenantPayment';
import { TenantRepair } from '../components/Tenant/TenantRepair';
import { TenantNotify } from '../components/Tenant/TenantNotify';

export default function TenantPage() {
  const { user, logout, updateUser } = useAuth();
  const { notifications, setNotifications } = useNotification();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tn_dashboard');
  const [theme, setTheme] = useState('dark');

  // Lắng nghe sự kiện chuyển tab tự động khi bấm thông báo
  useEffect(() => {
    const handleSwitchTab = (e) => {
      let target = e.detail?.tab;
      if (target === 'tn_contracts') target = 'tn_contract';
      if (target === 'tn_repair') target = 'tn_repairs';
      if (target) {
        setActiveTab(target);
      }
    };
    window.addEventListener('smartrent:switch-tab', handleSwitchTab);
    return () => window.removeEventListener('smartrent:switch-tab', handleSwitchTab);
  }, []);

  // ── Fetch dữ liệu từ API thật ────────────────────────────────
  const { data: dashboard, refetch: refetchDashboard } = useApi(() => dashboardService.getTenantDashboard(), []);
  const { data: invoices, setData: setInvoices, refetch: refetchInvoices } = useApi(() => invoiceService.getInvoices(), []);
  const { data: contracts, setData: setContracts, refetch: refetchContracts } = useApi(() => contractService.getContracts(), []);
  const { data: payments, setData: setPayments, refetch: refetchPayments } = useApi(() => paymentService.getPayments?.() || Promise.resolve([]), []);
  const { data: maintenanceRequests, setData: setMaintenanceRequests, refetch: refetchMaintenance } = useApi(() => maintenanceService.getRequests(), []);

  // Lắng nghe sự kiện Realtime SignalR để cập nhật dữ liệu tức thì không cần F5
  useEffect(() => {
    const handleRealtimeUpdate = (e) => {
      const notif = e.detail?.notification;
      const title = (notif?.title || '').toLowerCase();
      const content = (notif?.content || '').toLowerCase();
      const fullText = `${title} ${content}`;

      // Luôn cập nhật dashboard tổng quan
      refetchDashboard();

      if (fullText.includes('hóa đơn') || fullText.includes('tiền nhà') || fullText.includes('điện') || fullText.includes('nước') || fullText.includes('khiếu nại') || fullText.includes('invoice')) {
        refetchInvoices();
        refetchPayments();
      }
      if (fullText.includes('thanh toán') || fullText.includes('chuyển khoản') || fullText.includes('minh chứng') || fullText.includes('duyệt') || fullText.includes('từ chối') || fullText.includes('payment')) {
        refetchPayments();
        refetchInvoices();
      }
      if (fullText.includes('bảo trì') || fullText.includes('sự cố') || fullText.includes('sửa chữa') || fullText.includes('tiến độ')) {
        refetchMaintenance();
      }
      if (fullText.includes('hợp đồng') || fullText.includes('gia hạn') || fullText.includes('đại diện')) {
        refetchContracts();
      }
    };

    window.addEventListener('smartrent:realtime-update', handleRealtimeUpdate);
    return () => window.removeEventListener('smartrent:realtime-update', handleRealtimeUpdate);
  }, [refetchDashboard, refetchInvoices, refetchPayments, refetchMaintenance, refetchContracts]);

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

  const [tenantProfileState, setTenantProfileState] = useState({});

  const activeTenant = {
    ...user,
    ...tenantProfileState,
    name: tenantProfileState?.fullName || user?.fullName,
    roomNumber: dashboard?.roomNumber,
    zoneName: dashboard?.zoneName,
    rentAmount: dashboard?.rentAmount,
    deposit: dashboard?.deposit,
    moveInDate: dashboard?.moveInDate,
    vehicleCount: tenantProfileState.vehicleCount !== undefined ? tenantProfileState.vehicleCount : (dashboard?.vehicleCount || 0),
    vehicleInfo: tenantProfileState.vehicleInfo !== undefined ? tenantProfileState.vehicleInfo : (dashboard?.vehicleInfo || ''),
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'tn_dashboard':
        return (
          <TenantDashboard
            activeTenant={activeTenant}
            rooms={[]}
            invoices={invoices || []}
            contracts={contracts || []}
            notifications={notifications || []}
            setActiveTab={setActiveTab}
            dashboard={dashboard}
          />
        );
      case 'tn_profile':
        return (
          <TenantProfile
            activeTenant={activeTenant}
            setActiveTenant={(updated) => {
              setTenantProfileState(updated);
              if (typeof updated === 'function') {
                const res = updated(activeTenant);
                updateUser(res);
              } else {
                updateUser(updated);
              }
            }}
          />
        );
      case 'tn_contract':
        return <TenantContract activeTenant={activeTenant} contracts={contracts || []} rooms={[]} setContracts={setContracts} onRefresh={refetchContracts} />;
      case 'tn_invoices':
        return <TenantInvoice activeTenant={activeTenant} invoices={invoices || []} payments={payments || []} setInvoices={setInvoices} onRefresh={refetchInvoices} />;
        return <TenantPayment activeTenant={activeTenant} invoices={invoices || []} payments={payments || []} setPayments={setPayments} onRefresh={() => { refetchPayments(); refetchInvoices(); refetchDashboard(); }} />;
      case 'tn_repairs':
        return (
          <TenantRepair 
            activeTenant={activeTenant} 
            contracts={contracts || []} 
            setActiveTab={setActiveTab} 
            maintenanceRequests={maintenanceRequests || []} 
            setMaintenanceRequests={setMaintenanceRequests} 
            onRefresh={refetchMaintenance} 
          />
        );
      case 'tn_notifications':
        return <TenantNotify notifications={notifications || []} setNotifications={setNotifications} />;
      default:
        return (
          <TenantDashboard
            activeTenant={activeTenant}
            rooms={[]}
            invoices={invoices || []}
            contracts={contracts || []}
            notifications={notifications || []}
            setActiveTab={setActiveTab}
            dashboard={dashboard}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <Sidebar currentRole="tenant" activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        <Navbar
          currentRole="tenant"
          theme={theme}
          toggleTheme={toggleTheme}
          notifications={notifications || []}
          activeTenant={activeTenant}
          onLogout={handleLogout}
          onNavigateProfile={() => setActiveTab('tn_profile')}
          hideRoleSwitcher={true}
        />
        <main className="page-body">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
