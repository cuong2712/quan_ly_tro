import React, { useState } from 'react';
import {
  Building2, Users, LayoutDashboard, FileText, Zap, Wrench, CreditCard,
  Receipt, BarChart3, BellRing, MessageSquare, UserCheck, Settings, ChevronDown
} from 'lucide-react';

const NAV_ITEMS = {
  superadmin: [
    { id: 'sa_analytics', label: 'Tổng quan hệ thống', icon: BarChart3 },
    { id: 'sa_landlords', label: 'Quản lý chủ trọ', icon: Users },
    { id: 'sa_complaints', label: 'Phản hồi', icon: MessageSquare },
    { id: 'sa_notifications', label: 'Thông báo', icon: BellRing },
  ],
  landlord: [
    { id: 'll_dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'll_profile', label: 'Hồ sơ cá nhân', icon: UserCheck },
    { id: 'll_zones', label: 'Khu trọ & phòng', icon: Building2 },
    { id: 'll_tenants', label: 'Người thuê', icon: Users },
    { id: 'll_contracts', label: 'Hợp đồng', icon: FileText },
    { id: 'll_invoices', label: 'Hóa đơn', icon: Receipt },
    { id: 'll_payments', label: 'Thanh toán', icon: CreditCard },
    { id: 'll_maintenance', label: 'Bảo trì', icon: Wrench },
    { id: 'll_notifications', label: 'Thông báo', icon: BellRing },
    { id: 'll_reports', label: 'Báo cáo', icon: BarChart3 },
  ],
  tenant: [
    { id: 'tn_dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'tn_profile', label: 'Hồ sơ cá nhân', icon: UserCheck },
    { id: 'tn_contract', label: 'Hợp đồng của tôi', icon: FileText },
    { id: 'tn_invoices', label: 'Hóa đơn của tôi', icon: Receipt },
    { id: 'tn_payment', label: 'Thanh toán QR', icon: CreditCard },
    { id: 'tn_repairs', label: 'Báo sửa chữa', icon: Wrench },
    { id: 'tn_notifications', label: 'Thông báo', icon: BellRing },
  ],
};

const LANDLORD_ADVANCED_ITEMS = [
  { id: 'll_utilities', label: 'Điện nước', icon: Zap },
  { id: 'll_services', label: 'Dịch vụ', icon: Settings },
];

export const Sidebar = ({ currentRole, activeTab, setActiveTab }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const navItems = NAV_ITEMS[currentRole] ?? NAV_ITEMS.tenant;
  const roleName = currentRole === 'superadmin' ? 'Super Admin' : currentRole === 'landlord' ? 'Chủ trọ' : 'Người thuê';
  const sectionName = currentRole === 'superadmin' ? 'Quản trị hệ thống' : currentRole === 'landlord' ? 'Quản lý hằng ngày' : 'Khu vực khách thuê';

  const renderItem = (item, nested = false) => {
    const Icon = item.icon;
    return (
      <button
        type="button"
        key={item.id}
        className={`nav-item ${nested ? 'nav-item-nested' : ''} ${activeTab === item.id ? 'active' : ''}`}
        onClick={() => setActiveTab(item.id)}
      >
        <Icon size={18} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge"><Building2 size={24} /></div>
        <div>
          <h1 className="brand-title">SmartRent</h1>
          <span className={`role-badge ${currentRole}`}>{roleName}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">{sectionName}</div>
        {navItems.map(item => renderItem(item))}

        {currentRole === 'landlord' && (
          <div className="sidebar-advanced">
            <button
              type="button"
              className={`sidebar-advanced-toggle ${showAdvanced ? 'open' : ''}`}
              onClick={() => setShowAdvanced(value => !value)}
            >
              <span>Cấu hình vận hành</span>
              <ChevronDown size={16} />
            </button>
            {showAdvanced && LANDLORD_ADVANCED_ITEMS.map(item => renderItem(item, true))}
          </div>
        )}
      </nav>
    </aside>
  );
};
