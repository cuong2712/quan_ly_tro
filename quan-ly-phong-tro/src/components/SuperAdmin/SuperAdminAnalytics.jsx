import React from 'react';
import { Users, Building2, Home, DollarSign, Receipt, PieChart, Activity } from 'lucide-react';
import { formatVND } from '../../utils/formatters';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export const SuperAdminAnalytics = ({ data = {} }) => {
  const stats = data.stats || {};
  const landlords = Array.isArray(data.landlords) ? data.landlords : [];
  const tenants = Array.isArray(data.tenants) ? data.tenants : [];
  const zones = Array.isArray(data.zones) ? data.zones : [];
  const rooms = Array.isArray(data.rooms) ? data.rooms : [];
  const invoices = Array.isArray(data.invoices) ? data.invoices : [];

  const totalLandlords = stats.totalLandlords ?? landlords.length;
  const totalTenants = stats.totalTenants ?? tenants.length;
  const totalZones = stats.totalZones ?? zones.length;
  const totalRooms = stats.totalRooms ?? rooms.length;
  const occupiedRooms = stats.occupiedRooms ?? rooms.filter(r => r?.status === 'occupied').length;
  const vacantRooms = stats.vacantRooms ?? rooms.filter(r => r?.status === 'vacant').length;
  const occupancyRate = stats.occupancyRate ?? (totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0);
  const vacantRate = stats.vacancyRate ?? (totalRooms ? Math.round((vacantRooms / totalRooms) * 100) : 0);

  const totalRevenue = stats.totalRevenue ?? invoices.reduce((sum, inv) => sum + (inv?.status === 'paid' ? (inv.totalAmount || 0) : 0), 0);
  const totalInvoices = stats.totalInvoices ?? invoices.length;

  // Revenue Chart Data
  const revenueChartData = {
    labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7 (Hiện tại)'],
    datasets: [
      {
        label: 'Doanh Thu Hệ Thống (VND)',
        data: [120000000, 145000000, 160000000, 178000000, 190000000, 210000000, Number(totalRevenue) || 225000000],
        backgroundColor: 'rgba(99, 102, 241, 0.75)',
        borderRadius: 8,
      }
    ]
  };

  // Occupancy Chart Data
  const occupancyChartData = {
    labels: ['Đang Thuê', 'Phòng Trống', 'Đang Sửa Chữa', 'Đã Cọc'],
    datasets: [
      {
        data: [
          occupiedRooms,
          vacantRooms,
          rooms.filter(r => r?.status === 'maintenance').length,
          rooms.filter(r => r?.status === 'deposit').length
        ],
        backgroundColor: ['#10b981', '#06b6d4', '#f43f5e', '#f59e0b'],
        borderWidth: 0,
      }
    ]
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Activity size={24} color="#6366f1" /> Thống Kê Tổng Quan Hệ Thống</h2>
          <p className="page-subtitle">Báo cáo các chỉ số tăng trưởng toàn bộ nền tảng SmartRent</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon indigo"><Users /></div>
          <div className="kpi-info">
            <h3>Tổng Chủ Trọ</h3>
            <div className="value">{totalLandlords}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon emerald"><UserCheckIcon /></div>
          <div className="kpi-info">
            <h3>Tổng Khách Thuê</h3>
            <div className="value">{totalTenants}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon cyan"><Building2 /></div>
          <div className="kpi-info">
            <h3>Tổng Khu Trọ</h3>
            <div className="value">{totalZones}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon amber"><Home /></div>
          <div className="kpi-info">
            <h3>Tổng Số Phòng</h3>
            <div className="value">{totalRooms}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon indigo"><DollarSign /></div>
          <div className="kpi-info">
            <h3>Tổng Doanh Thu</h3>
            <div className="value">{formatVND(totalRevenue)}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon rose"><Receipt /></div>
          <div className="kpi-info">
            <h3>Tổng Hóa Đơn</h3>
            <div className="value">{totalInvoices}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon emerald"><PieChart /></div>
          <div className="kpi-info">
            <h3>Tỷ Lệ Đang Thuê</h3>
            <div className="value" style={{ color: '#34d399' }}>{occupancyRate}%</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon cyan"><PieChart /></div>
          <div className="kpi-info">
            <h3>Tỷ Lệ Phòng Trống</h3>
            <div className="value" style={{ color: '#22d3ee' }}>{vacantRate}%</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Tăng Trưởng Doanh Thu Hệ Thống (Tháng)</h3>
          </div>
          <div style={{ height: '300px' }}>
            <Bar data={revenueChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Tỷ Lệ Trạng Thái Phòng Toàn Hệ Thống</h3>
          </div>
          <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
            <Doughnut data={occupancyChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const UserCheckIcon = () => <Users style={{ filter: 'brightness(1.2)' }} />;
