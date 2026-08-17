import React, { useState } from 'react';
import '../styles/main.css';
import { Navbar } from '../components/Common/Navbar';
import { Sidebar } from '../components/Common/Sidebar';
import { useAuth } from '../contexts/AuthContext';
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tn_dashboard');
  const [theme, setTheme] = useState('dark');

  // ── Fetch dữ liệu từ API thật ────────────────────────────────
  const { data: dashboard } = useApi(() => dashboardService.getTenantDashboard(), []);
  const { data: invoices } = useApi(() => invoiceService.getInvoices(), []);
  const { data: contracts, setData: setContracts } = useApi(() => contractService.getContracts(), []);
  const { data: payments, setData: setPayments, refetch: refetchPayments } = useApi(() => paymentService.getPayments?.() || Promise.resolve([]), []);
  const { data: maintenanceRequests, setData: setMaintenanceRequests, refetch: refetchMaintenance } = useApi(() => maintenanceService.getRequests(), []);
  const { data: notifications, setData: setNotifications } = useApi(() => notificationService.getNotifications(), []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.body.classList.toggle('light-mode', newTheme === 'light');
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

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
        return <TenantProfile activeTenant={activeTenant} setActiveTenant={setTenantProfileState} />;
      case 'tn_contract':
        return <TenantContract activeTenant={activeTenant} contracts={contracts || []} rooms={[]} setContracts={setContracts} />;
      case 'tn_invoices':
        return <TenantInvoice activeTenant={activeTenant} invoices={invoices || []} />;
      case 'tn_payment':
        return <TenantPayment activeTenant={activeTenant} invoices={invoices || []} payments={payments || []} setPayments={setPayments} onRefresh={refetchPayments} />;
      case 'tn_repairs':
        return <TenantRepair activeTenant={activeTenant} maintenanceRequests={maintenanceRequests || []} setMaintenanceRequests={setMaintenanceRequests} onRefresh={refetchMaintenance} />;
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
          hideRoleSwitcher={true}
        />
        <main className="page-body">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
