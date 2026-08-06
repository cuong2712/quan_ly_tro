import React from 'react';
import { Building2, Home, Users, Receipt, DollarSign, TrendingDown, AlertCircle, PieChart, Activity } from 'lucide-react';
import { formatVND } from '../../utils/formatters';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

export const LandlordDashboard = ({ data }) => {
  const totalZones = data.zones.length;
  const totalRooms = data.rooms.length;
  const occupiedRooms = data.rooms.filter(r => r.status === 'occupied').length;
  const vacantRooms = data.rooms.filter(r => r.status === 'vacant').length;
  const totalTenants = data.tenants.length;
  
  const unpaidInvoices = data.invoices.filter(i => i.status === 'unpaid');
  const unpaidCount = unpaidInvoices.length;
  const outstandingDebt = unpaidInvoices.reduce((sum, i) => sum + i.totalAmount, 0);

  const monthlyRevenue = data.invoices
    .filter(i => i.month === '2026-07' && i.status === 'paid')
    .reduce((sum, i) => sum + i.totalAmount, 0);
  const monthlyExpenses = 3500000; // Chi phí sửa chữa & bảo trì tháng 7

  // Biểu đồ Doanh thu theo tháng
  const revenueData = {
    labels: ['T2/2026', 'T3/2026', 'T4/2026', 'T5/2026', 'T6/2026', 'T7/2026'],
    datasets: [
      {
        label: 'Doanh Thu (VND)',
        data: [35000000, 38000000, 42000000, 41000000, 45000000, 48000000],
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderRadius: 6,
      }
    ]
  };

  // Biểu đồ Thu chi
  const incomeExpenseData = {
    labels: ['Tháng 5', 'Tháng 6', 'Tháng 7'],
    datasets: [
      {
        label: 'Thu Nhập',
        data: [41000000, 45000000, 48000000],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.3,
      },
      {
        label: 'Chi Phí Bảo Trì',
        data: [4200000, 2800000, 3500000],
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244, 63, 94, 0.2)',
        tension: 0.3,
      }
    ]
  };

  // Biểu đồ Điện Nước
  const utilityData = {
    labels: ['P.101', 'P.102', 'P.301'],
    datasets: [
      {
        label: 'Điện (kWh)',
        data: [100, 100, 90],
        backgroundColor: '#f59e0b',
      },
      {
        label: 'Nước (m³)',
        data: [15, 15, 12],
        backgroundColor: '#06b6d4',
      }
    ]
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Activity size={24} color="#6366f1" /> Trang Tổng Quan Chủ Trọ</h2>
          <p className="page-subtitle">Theo dõi tình hình kinh doanh, doanh thu và tỷ lệ lấp đầy phòng trọ</p>
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
            <h3>Hóa Đơn Chưa Trả</h3>
            <div className="value" style={{ color: '#fbbf24' }}>{unpaidCount}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon emerald"><DollarSign /></div>
          <div className="kpi-info">
            <h3>Doanh Thu Tháng 7</h3>
            <div className="value">{formatVND(monthlyRevenue || 48000000)}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon rose"><TrendingDown /></div>
          <div className="kpi-info">
            <h3>Chi Phí Tháng 7</h3>
            <div className="value">{formatVND(monthlyExpenses)}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon amber"><AlertCircle /></div>
          <div className="kpi-info">
            <h3>Tổng Công Nợ</h3>
            <div className="value" style={{ color: '#f87171' }}>{formatVND(outstandingDebt)}</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Doanh Thu Theo Tháng (VND)</h3>
          </div>
          <div style={{ height: '280px' }}>
            <Bar data={revenueData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">So Sánh Thu Nhập & Chi Phí Bảo Trì</h3>
          </div>
          <div style={{ height: '280px' }}>
            <Line data={incomeExpenseData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Tiêu Thụ Điện & Nước Theo Phòng</h3>
          </div>
          <div style={{ height: '280px' }}>
            <Bar data={utilityData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
};
