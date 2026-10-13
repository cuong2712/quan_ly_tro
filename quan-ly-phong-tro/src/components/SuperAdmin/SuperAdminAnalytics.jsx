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
  const maintenanceRooms = stats.maintenanceRooms ?? rooms.filter(r => r?.status === 'maintenance').length;
  const depositRooms = stats.depositRooms ?? rooms.filter(r => r?.status === 'deposit').length;
  const occupancyRate = stats.occupancyRate ?? (totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0);
  const vacantRate = stats.vacancyRate ?? (totalRooms ? Math.round((vacantRooms / totalRooms) * 100) : 0);

  const totalRevenue = stats.totalRevenue ?? invoices.reduce((sum, inv) => sum + (inv?.status === 'paid' ? (inv.totalAmount || 0) : 0), 0);
  const totalInvoices = stats.totalInvoices ?? invoices.length;

  // Revenue Chart Data: Lấy trực tiếp từ số liệu hóa đơn & giao dịch thanh toán thực tế của hệ thống
  const monthlyRevenueList = Array.isArray(stats.monthlyRevenue) && stats.monthlyRevenue.length > 0
    ? stats.monthlyRevenue
    : null;

  const revenueChartLabels = monthlyRevenueList
    ? monthlyRevenueList.map(item => item.label || item.month)
    : (() => {
        const labels = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          labels.push(`T${d.getMonth() + 1}/${d.getFullYear()}${i === 0 ? ' (Hiện tại)' : ''}`);
        }
        return labels;
      })();

  const revenueChartValues = monthlyRevenueList
    ? monthlyRevenueList.map(item => Number(item.revenue) || 0)
    : Array(revenueChartLabels.length).fill(0);

  const revenueChartData = {
    labels: revenueChartLabels,
    datasets: [
      {
        label: 'Doanh Thu Hệ Thống (VND)',
        data: revenueChartValues,
        backgroundColor: 'rgba(99, 102, 241, 0.75)',
        borderRadius: 8,
      }
    ]
  };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => `Doanh thu: ${formatVND(context.parsed.y || 0)}`
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => value >= 1000000 ? `${(value / 1000000).toLocaleString('vi-VN')} Tr` : value.toLocaleString('vi-VN')
        }
      }
    }
  };

  // Occupancy Chart Data: Thống kê trạng thái phòng thực tế từ backend
  const occupancyChartData = {
    labels: ['Đang Thuê', 'Phòng Trống', 'Đang Sửa Chữa', 'Đã Cọc'],
    datasets: [
      {
        data: [
          occupiedRooms,
          vacantRooms,
          maintenanceRooms,
          depositRooms
        ],
        backgroundColor: ['#10b981', '#06b6d4', '#f43f5e', '#f59e0b'],
        borderWidth: 0,
      }
    ]
  };

  const occupancyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = totalRooms || (occupiedRooms + vacantRooms + maintenanceRooms + depositRooms) || 1;
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} phòng (${percentage}%)`;
          }
        }
      }
    }
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
            <Bar data={revenueChartData} options={revenueChartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Tỷ Lệ Trạng Thái Phòng Toàn Hệ Thống</h3>
          </div>
          <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
            <Doughnut data={occupancyChartData} options={occupancyChartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

const UserCheckIcon = () => <Users style={{ filter: 'brightness(1.2)' }} />;
