import React from 'react';
import { Building2, Home, Users, Receipt, DollarSign, Wrench, AlertCircle, Activity, TrendingUp } from 'lucide-react';
import { formatVND } from '../../utils/formatters';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

export const LandlordDashboard = ({ data = {} }) => {
  const dbStats = data.dashboard || data || {};
  const zones = Array.isArray(data.zones) ? data.zones : [];
  const rooms = Array.isArray(data.rooms) ? data.rooms : [];
  const tenants = Array.isArray(data.tenants) ? data.tenants : [];
  const invoices = Array.isArray(data.invoices) ? data.invoices : [];

  const totalZones = dbStats.totalZones ?? zones.length;
  const totalRooms = dbStats.totalRooms ?? rooms.length;
  const occupiedRooms = dbStats.occupied ?? rooms.filter(r => (r.status || '').toLowerCase() === 'occupied').length;
  const vacantRooms = dbStats.vacant ?? rooms.filter(r => (r.status || '').toLowerCase() === 'vacant').length;
  const totalTenants = dbStats.tenants ?? tenants.length;

  const unpaidInvoices = invoices.filter(i => (i.status || '').toLowerCase() === 'unpaid');
  const unpaidCount = dbStats.unpaidInvoices ?? unpaidInvoices.length;
  const outstandingDebt = unpaidInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthPaid = invoices
    .filter(i => i.month === currentMonthStr && (i.status || '').toLowerCase() === 'paid')
    .reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const totalPaidAllTime = invoices
    .filter(i => (i.status || '').toLowerCase() === 'paid')
    .reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const revenueDisplay = dbStats.revenue || currentMonthPaid || totalPaidAllTime;

  const occupancyRate = dbStats.occupancyRate ?? (totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0);
  const pendingMaintenance = dbStats.pendingMaintenance ?? 0;

  // ── Tính toán động biểu đồ 6 tháng gần nhất ────────────────────
  const last6Months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last6Months.push({
      key: d.toISOString().slice(0, 7),
      label: `T${d.getMonth() + 1}/${d.getFullYear()}`
    });
  }

  const revenueByMonth = last6Months.map(m => {
    return invoices
      .filter(i => i.month === m.key && (i.status || '').toLowerCase() === 'paid')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  });

  const revenueData = {
    labels: last6Months.map(m => m.label),
    datasets: [
      {
        label: 'Doanh Thu Đã Thu (VNĐ)',
        data: revenueByMonth,
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderRadius: 6,
      }
    ]
  };

  // ── Tỷ lệ lấp đầy phòng ─────────────────────────────────────────
  const occupancyChartData = {
    labels: ['Đang Thuê', 'Còn Trống'],
    datasets: [
      {
        data: [occupiedRooms, vacantRooms],
        backgroundColor: ['#10b981', '#6366f1'],
        borderWidth: 0,
      }
    ]
  };

  // ── Tiêu thụ Điện/Nước theo từng hóa đơn phòng gần nhất ─────────
  const latestInvoices = invoices.slice(0, 6);
  const utilityData = {
    labels: latestInvoices.map(i => i.roomNumber ? `P.${i.roomNumber}` : (i.roomId ? `P.${i.roomId.slice(0, 4)}` : 'Phòng')),
    datasets: [
      {
        label: 'Tiền Điện (VNĐ)',
        data: latestInvoices.map(i => i.elecFee || 0),
        backgroundColor: '#f59e0b',
        borderRadius: 4,
      },
      {
        label: 'Tiền Nước (VNĐ)',
        data: latestInvoices.map(i => i.waterFee || 0),
        backgroundColor: '#06b6d4',
        borderRadius: 4,
      }
    ]
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Activity size={24} color="#6366f1" /> Trang Tổng Quan Chủ Trọ</h2>
          <p className="page-subtitle">Theo dõi tình hình kinh doanh, doanh thu thực tế và tỷ lệ lấp đầy phòng trọ</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon indigo"><Building2 /></div>
          <div className="kpi-info">
            <h3>Tổng Khu Trọ</h3>
            <div className="value">{totalZones}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon cyan"><Home /></div>
          <div className="kpi-info">
            <h3>Tổng Số Phòng</h3>
            <div className="value">{totalRooms}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon emerald"><Home /></div>
          <div className="kpi-info">
            <h3>Phòng Đang Thuê</h3>
            <div className="value" style={{ color: '#34d399' }}>{occupiedRooms}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon rose"><Home /></div>
          <div className="kpi-info">
            <h3>Phòng Còn Trống</h3>
            <div className="value" style={{ color: '#22d3ee' }}>{vacantRooms}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon indigo"><Users /></div>
          <div className="kpi-info">
            <h3>Tổng Khách Thuê</h3>
            <div className="value">{totalTenants}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon amber"><Receipt /></div>
          <div className="kpi-info">
            <h3>Hóa Đơn Chưa Thu</h3>
            <div className="value" style={{ color: '#fbbf24' }}>{unpaidCount}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon emerald"><DollarSign /></div>
          <div className="kpi-info">
            <h3>Tổng Thu Thực Tế</h3>
            <div className="value">{formatVND(revenueDisplay)}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon rose"><AlertCircle /></div>
          <div className="kpi-info">
            <h3>Tổng Công Nợ</h3>
            <div className="value" style={{ color: '#f87171' }}>{formatVND(outstandingDebt)}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon emerald"><TrendingUp /></div>
          <div className="kpi-info">
            <h3>Tỷ Lệ Lấp Đầy</h3>
            <div className="value" style={{ color: '#10b981' }}>{occupancyRate}%</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Doanh Thu Thực Tế Theo Tháng (VNĐ)</h3>
          </div>
          <div style={{ height: '280px' }}>
            <Bar data={revenueData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Tỷ Lệ Lấp Đầy Phòng</h3>
          </div>
          <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut data={occupancyChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Chi Phí Điện & Nước Theo Phòng</h3>
          </div>
          <div style={{ height: '280px' }}>
            <Bar data={utilityData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
};
