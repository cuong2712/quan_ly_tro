import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Home, Receipt, FileText, Wrench, User, Bell, Sun, Moon,
  QrCode, PhoneCall, ShieldCheck, CheckCircle2, Clock, AlertTriangle,
  ChevronRight, ArrowLeft, Camera, ExternalLink, Sparkles, Smartphone,
  Monitor, Info, Building2, Zap, Send, Check, RefreshCw, Copy,
  LogOut, Plus, ChevronDown, CheckCheck, Upload, AlertCircle, X,
  FileCheck, Shield, DollarSign, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  dashboardService,
  invoiceService,
  contractService,
  maintenanceService,
  notificationService,
  profileService,
  paymentService,
  roomService,
  zoneService,
  fileService
} from '../services';
import {
  formatVND,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getVietQRUrl,
  getImageUrl,
  VIETNAM_BANKS
} from '../utils/formatters';

export default function MobileDemoPage({ initialRole, onSwitchToDesktop }) {
  const navigate = useNavigate();
  const { user, login, logout, isAuthenticated } = useAuth();

  // Chế độ xem: 'frame' (khung điện thoại trên PC) hoặc 'full' (toàn màn hình app)
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'full';
    return 'frame';
  });

  // Vai trò: 'tenant' (Khách thuê) hoặc 'landlord' (Chủ trọ)
  const [role, setRole] = useState(() => {
    if (initialRole) return initialRole;
    if (user?.role?.toLowerCase() === 'landlord') return 'landlord';
    return 'tenant';
  });

  // Tab điều hướng đáy
  const [activeTab, setActiveTab] = useState('home');

  // Theme sáng / tối
  const [isLight, setIsLight] = useState(false);

  // Bottom Sheet Modal: 'qr_pay' | 'repair' | 'notifications' | 'login' | null
  const [bottomSheet, setBottomSheet] = useState(null);

  // Loading & Refreshing states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Dữ liệu Real APIs
  const [tenantDashboard, setTenantDashboard] = useState(null);
  const [landlordDashboard, setLandlordDashboard] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [zones, setZones] = useState([]);

  // State thanh toán VietQR
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // State gửi báo hỏng sửa chữa
  const [repairForm, setRepairForm] = useState({
    issueType: 'Điện',
    title: '',
    description: '',
    priority: 'Medium'
  });
  const [repairSuccess, setRepairSuccess] = useState(false);

  // State đăng nhập nhanh
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Tự động nhận diện thiết bị: nếu màn hình nhỏ < 768px thì mặc định toàn màn hình
  useEffect(() => {
    if (window.innerWidth < 768) {
      setViewMode('full');
    }
  }, []);

  // Cập nhật role theo user nếu user đăng nhập
  useEffect(() => {
    if (user?.role) {
      const r = user.role.toLowerCase();
      if (r === 'landlord' || r === 'tenant') {
        setRole(r);
      }
    }
  }, [user]);

  // Hàm tải dữ liệu thật từ API
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      // Tải thông báo chung
      try {
        const notifRes = await notificationService.getNotifications();
        setNotifications(Array.isArray(notifRes) ? notifRes : notifRes?.data || []);
      } catch (e) {
        console.warn('Lỗi tải thông báo:', e);
      }

      if (role === 'tenant') {
        // Tải dữ liệu Khách thuê
        const [dashRes, invRes, contRes, mainRes, profRes, vehRes] = await Promise.allSettled([
          dashboardService.getTenantDashboard(),
          invoiceService.getInvoices(),
          contractService.getContracts(),
          maintenanceService.getRequests(),
          profileService.getProfile(),
          profileService.getVehicle()
        ]);

        if (dashRes.status === 'fulfilled') setTenantDashboard(dashRes.value?.data || dashRes.value);
        if (invRes.status === 'fulfilled') setInvoices(Array.isArray(invRes.value) ? invRes.value : invRes.value?.data || []);
        if (contRes.status === 'fulfilled') setContracts(Array.isArray(contRes.value) ? contRes.value : contRes.value?.data || []);
        if (mainRes.status === 'fulfilled') setMaintenanceRequests(Array.isArray(mainRes.value) ? mainRes.value : mainRes.value?.data || []);
        if (profRes.status === 'fulfilled') setProfile(profRes.value?.data || profRes.value);
        if (vehRes.status === 'fulfilled') setVehicle(vehRes.value?.data || vehRes.value);
      } else {
        // Tải dữ liệu Chủ trọ
        const [dashRes, roomRes, zoneRes, invRes, mainRes, profRes] = await Promise.allSettled([
          dashboardService.getLandlordDashboard(),
          roomService.getRooms(),
          zoneService.getZones(),
          invoiceService.getInvoices(),
          maintenanceService.getRequests(),
          profileService.getProfile()
        ]);

        if (dashRes.status === 'fulfilled') setLandlordDashboard(dashRes.value?.data || dashRes.value);
        if (roomRes.status === 'fulfilled') setRooms(Array.isArray(roomRes.value) ? roomRes.value : roomRes.value?.data || []);
        if (zoneRes.status === 'fulfilled') setZones(Array.isArray(zoneRes.value) ? zoneRes.value : zoneRes.value?.data || []);
        if (invRes.status === 'fulfilled') setInvoices(Array.isArray(invRes.value) ? invRes.value : invRes.value?.data || []);
        if (mainRes.status === 'fulfilled') setMaintenanceRequests(Array.isArray(mainRes.value) ? mainRes.value : mainRes.value?.data || []);
        if (profRes.status === 'fulfilled') setProfile(profRes.value?.data || profRes.value);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu mobile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Đổi theme
  const toggleTheme = () => {
    setIsLight(!isLight);
    document.body.classList.toggle('light-mode', !isLight);
  };

  // Sao chép thông tin
  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Mở thanh toán QR cho 1 hóa đơn cụ thể
  const handleOpenQrPay = (invoice = null) => {
    const inv = invoice || unpaidInvoices[0] || invoices[0] || null;
    setSelectedInvoice(inv);
    setPaymentSuccess(false);
    setProofFile(null);
    setProofPreview('');
    setBottomSheet('qr_pay');
  };

  // Xác nhận chuyển khoản thanh toán
  const handleConfirmPayment = async () => {
    if (!selectedInvoice) return;
    setActionLoading(true);
    try {
      let proofUrl = '';
      if (proofFile) {
        const uploadRes = await fileService.uploadPaymentProof(proofFile);
        proofUrl = uploadRes?.url || uploadRes?.data?.url || '';
      }

      await paymentService.submitPayment({
        invoiceId: selectedInvoice.id,
        amount: selectedInvoice.totalAmount,
        paymentMethod: 'VietQR',
        proofImageUrl: proofUrl,
        notes: `Khách thuê thanh toán qua SmartRent Mobile (${formatDate(new Date())})`
      });

      setPaymentSuccess(true);
      setTimeout(() => {
        setBottomSheet(null);
        setPaymentSuccess(false);
        loadData(true);
      }, 1500);
    } catch (err) {
      alert('Không thể gửi xác nhận thanh toán: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Gửi yêu cầu sửa chữa
  const handleSubmitRepair = async (e) => {
    e?.preventDefault();
    if (!repairForm.title.trim()) {
      alert('Vui lòng nhập tiêu đề sự cố!');
      return;
    }

    setActionLoading(true);
    try {
      await maintenanceService.createRequest({
        title: repairForm.title,
        description: repairForm.description,
        priority: repairForm.priority,
        issueType: repairForm.issueType,
        roomId: tenantDashboard?.roomId || undefined
      });

      setRepairSuccess(true);
      setRepairForm({ issueType: 'Điện', title: '', description: '', priority: 'Medium' });
      setTimeout(() => {
        setBottomSheet(null);
        setRepairSuccess(false);
        loadData(true);
        setActiveTab('repairs');
      }, 1200);
    } catch (err) {
      alert('Lỗi gửi báo hỏng: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Đăng nhập nhanh
  const handleQuickLogin = async (email, password) => {
    setActionLoading(true);
    setLoginError('');
    try {
      await login(email, password);
      setBottomSheet(null);
      loadData();
    } catch (err) {
      setLoginError(err.message || 'Đăng nhập thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  // Danh sách hóa đơn chưa trả & đã trả
  const unpaidInvoices = useMemo(() => {
    return invoices.filter(i => (i.status || '').toLowerCase() !== 'paid');
  }, [invoices]);

  const paidInvoices = useMemo(() => {
    return invoices.filter(i => (i.status || '').toLowerCase() === 'paid');
  }, [invoices]);

  // Thông tin phòng hiện tại của Khách thuê
  const currentRoomNumber = tenantDashboard?.roomNumber || user?.roomNumber || 'P.101';
  const currentZoneName = tenantDashboard?.zoneName || 'Khu trọ SmartRent';
  const latestUnpaid = unpaidInvoices[0] || null;

  // Số lượng thông báo chưa đọc
  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{
      minHeight: '100vh',
      background: viewMode === 'frame'
        ? (isLight ? '#e2e8f0' : '#040711')
        : (isLight ? '#f8fafc' : '#090d16'),
      color: isLight ? '#0f172a' : '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: viewMode === 'frame' ? '20px 16px' : 0,
      transition: 'all 0.3s ease'
    }}>

      {/* ── BAR ĐIỀU KHIỂN TRÊN MÁY TÍNH (Top Control Toolbar) ── */}
      {viewMode === 'frame' && (
        <div style={{
          width: '100%',
          maxWidth: 820,
          background: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(17,24,39,0.85)',
          border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.12)'}`,
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          padding: '12px 20px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate(-1)}
              className="btn btn-sm btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8 }}
            >
              <ArrowLeft size={15} /> Quay lại
            </button>
            <div style={{ fontWeight: 800, fontSize: '15px', color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Smartphone size={18} /> SMARTRENT MOBILE APP
            </div>
            <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
              🔴 Real API Live
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Chuyển đổi vai trò Khách Thuê / Chủ Trọ */}
            <div style={{ display: 'flex', background: isLight ? '#f1f5f9' : 'rgba(15,23,42,0.8)', padding: 3, borderRadius: 10, border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}` }}>
              <button
                onClick={() => { setRole('tenant'); setActiveTab('home'); }}
                style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: '12px', fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  background: role === 'tenant' ? '#10b981' : 'transparent',
                  color: role === 'tenant' ? '#fff' : (isLight ? '#64748b' : '#94a3b8'),
                  transition: 'all 0.2s'
                }}
              >
                👤 Khách Thuê
              </button>
              <button
                onClick={() => { setRole('landlord'); setActiveTab('home'); }}
                style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: '12px', fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  background: role === 'landlord' ? '#6366f1' : 'transparent',
                  color: role === 'landlord' ? '#fff' : (isLight ? '#64748b' : '#94a3b8'),
                  transition: 'all 0.2s'
                }}
              >
                🏠 Chủ Trọ
              </button>
            </div>

            {/* Chuyển chế độ xem Toàn Màn Hình / Khung ĐT */}
            <button
              onClick={() => setViewMode(viewMode === 'frame' ? 'full' : 'frame')}
              className="btn btn-sm btn-secondary"
              style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8 }}
              title="Phóng to toàn màn hình hoặc xem trong khung điện thoại"
            >
              {viewMode === 'frame' ? <><Monitor size={14} /> Toàn Màn Hình</> : <><Smartphone size={14} /> Khung ĐT</>}
            </button>

            {/* Chuyển sang giao diện Desktop */}
            {onSwitchToDesktop && (
              <button
                onClick={onSwitchToDesktop}
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8 }}
                title="Chuyển sang giao diện máy tính (Desktop)"
              >
                <Monitor size={14} /> Bản Máy Tính
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── THÂN MÁY ĐIỆN THOẠI (iPhone Mockup Container) ── */}
      <div style={{
        width: viewMode === 'frame' ? '390px' : '100%',
        maxWidth: viewMode === 'frame' ? '390px' : '520px',
        height: viewMode === 'frame' ? '820px' : '100vh',
        background: isLight ? '#ffffff' : '#0b1120',
        borderRadius: viewMode === 'frame' ? '46px' : 0,
        border: viewMode === 'frame' ? (isLight ? '10px solid #1e293b' : '10px solid #1f2937') : 'none',
        boxShadow: viewMode === 'frame' ? '0 25px 60px -15px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)' : 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>

        {/* Dynamic Island trên khung điện thoại */}
        {viewMode === 'frame' && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '110px',
            height: '24px',
            background: '#000',
            borderRadius: '20px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 10px'
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1e293b' }} />
          </div>
        )}

        {/* ── 1. HEADER DI ĐỘNG (Sticky Top Bar) ── */}
        <header style={{
          padding: viewMode === 'frame' ? '38px 16px 12px' : '16px 16px 12px',
          background: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(11,17,32,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 16,
              boxShadow: '0 4px 10px rgba(16,185,129,0.3)'
            }}>
              SR
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: isLight ? '#0f172a' : '#fff', lineHeight: 1.2 }}>
                SmartRent
              </div>
              <div style={{ fontSize: '11px', color: role === 'tenant' ? '#10b981' : '#6366f1', fontWeight: 700 }}>
                {role === 'tenant' ? '👤 Khách Thuê Phòng' : '🏠 Chủ Khu Trọ'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Nút Làm Mới Dữ Liệu */}
            <button
              onClick={() => loadData(true)}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                color: isLight ? '#475569' : '#cbd5e1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Cập nhật dữ liệu từ máy chủ"
            >
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            </button>

            {/* Nút Chuyển Sang Bản Máy Tính */}
            {onSwitchToDesktop && (
              <button
                onClick={onSwitchToDesktop}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  color: isLight ? '#475569' : '#cbd5e1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Chuyển sang giao diện máy tính (Desktop site)"
              >
                <Monitor size={15} />
              </button>
            )}

            {/* Nút Đổi Theme Sáng / Tối */}
            <button
              onClick={toggleTheme}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                color: isLight ? '#d97706' : '#fbbf24',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Đổi giao diện Sáng / Tối"
            >
              {isLight ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            {/* Chuông Thông Báo */}
            <button
              onClick={() => setBottomSheet('notifications')}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                color: isLight ? '#0f172a' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', cursor: 'pointer'
              }}
              title="Xem thông báo"
            >
              <Bell size={15} />
              {unreadNotifCount > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -2,
                  background: '#ef4444', color: '#fff', fontSize: '9px',
                  fontWeight: 800, width: 16, height: 16, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 6px rgba(239,68,68,0.5)'
                }}>
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Avatar người dùng */}
            <button
              onClick={() => setActiveTab('profile')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <img
                src={getImageUrl(user?.avatarUrl, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100')}
                alt="Avatar"
                style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #10b981', objectFit: 'cover' }}
              />
            </button>
          </div>
        </header>

        {/* ── 2. NỘI DUNG CUỘN CHÍNH (Independent Scroll Body) ── */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: isLight ? '#f8fafc' : '#0b1120',
          scrollbarWidth: 'none'
        }}>

          {/* Banner đăng nhập nếu chưa đăng nhập */}
          {!isAuthenticated && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(16,185,129,0.15))',
              border: `1px solid ${isLight ? '#c7d2fe' : 'rgba(99,102,241,0.3)'}`,
              borderRadius: 14, padding: '12px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800 }}>Chưa đăng nhập tài khoản</div>
                <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Đăng nhập để xem dữ liệu phòng thật</div>
              </div>
              <button
                onClick={() => setBottomSheet('login')}
                style={{
                  background: '#6366f1', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 12px', fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Đăng nhập
              </button>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════ */}
          {/* ────────────── DÀNH CHO KHÁCH THUÊ (TENANT) ────────── */}
          {/* ═════════════════════════════════════════════════════ */}
          {role === 'tenant' && (
            <>
              {/* ──────── TAB 1: TRANG CHỦ (HOME) ──────── */}
              {activeTab === 'home' && (
                <>
                  {/* Card Phòng Hiện Tại */}
                  <div style={{
                    background: isLight
                      ? 'linear-gradient(135deg, #ffffff, #f0fdf4)'
                      : 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(15,23,42,0.9))',
                    border: `1px solid ${isLight ? '#bbf7d0' : 'rgba(16,185,129,0.3)'}`,
                    borderRadius: '18px',
                    padding: '18px',
                    boxShadow: isLight ? '0 4px 18px rgba(16,185,129,0.08)' : '0 8px 24px rgba(0,0,0,0.3)',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{
                          fontSize: '11px', fontWeight: 800, textTransform: 'uppercase',
                          color: '#10b981', background: 'rgba(16,185,129,0.15)',
                          padding: '3px 8px', borderRadius: '6px'
                        }}>
                          Phòng Đang Thuê
                        </span>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '8px 0 2px', color: isLight ? '#0f172a' : '#fff' }}>
                          Phòng {currentRoomNumber}
                        </h2>
                        <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>
                          {currentZoneName} • {formatVND(tenantDashboard?.rentAmount || 0)}/tháng
                        </div>
                      </div>
                      <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: 'rgba(16,185,129,0.2)', color: '#10b981',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Building2 size={24} />
                      </div>
                    </div>

                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
                      marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Hóa đơn cần thanh toán</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: latestUnpaid ? '#ef4444' : '#10b981', marginTop: 2 }}>
                          {latestUnpaid ? formatVND(latestUnpaid.totalAmount) : 'Đã thanh toán đủ'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Hạn thanh toán</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: latestUnpaid ? '#f59e0b' : '#10b981', marginTop: 2 }}>
                          {latestUnpaid ? `⏳ ${formatDate(latestUnpaid.dueDate || latestUnpaid.createdAt)}` : '✅ Không nợ tiền'}
                        </div>
                      </div>
                    </div>

                    {latestUnpaid && (
                      <button
                        onClick={() => handleOpenQrPay(latestUnpaid)}
                        style={{
                          width: '100%', marginTop: 14,
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff', border: 'none', borderRadius: '12px',
                          padding: '11px', fontWeight: 800, fontSize: '14px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: 8,
                          boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
                        }}
                      >
                        <QrCode size={18} /> Quét Mã VietQR Thanh Toán Ngay
                      </button>
                    )}
                  </div>

                  {/* 4 Nút Thao Tác Nhanh */}
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: isLight ? '#475569' : '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      ⚡ Thao Tác Nhanh
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {[
                        { label: 'Thanh toán', icon: QrCode, color: '#10b981', action: () => handleOpenQrPay() },
                        { label: 'Báo sửa', icon: Wrench, color: '#f59e0b', action: () => setBottomSheet('repair') },
                        { label: 'Hợp đồng', icon: FileText, color: '#6366f1', action: () => setActiveTab('contracts') },
                        { label: 'Hóa đơn', icon: Receipt, color: '#3b82f6', action: () => setActiveTab('invoices') }
                      ].map((act, i) => {
                        const Icon = act.icon;
                        return (
                          <button
                            key={i}
                            onClick={act.action}
                            style={{
                              background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: '14px',
                              padding: '12px 6px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 6,
                              cursor: 'pointer',
                              boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                              transition: 'all 0.15s'
                            }}
                          >
                            <div style={{
                              width: 36, height: 36, borderRadius: '10px',
                              background: `${act.color}18`, color: act.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <Icon size={18} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: isLight ? '#334155' : '#cbd5e1' }}>
                              {act.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chỉ Số Điện Nước & Dịch Vụ Mới Nhất */}
                  {latestUnpaid && (
                    <div style={{
                      background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                      border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '16px', padding: '16px',
                      boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.03)' : 'none'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Zap size={16} color="#f59e0b" /> Chi Tiết Điện & Nước
                        </div>
                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>Kỳ này</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: '12px', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)'}` }}>
                          <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>⚡ Tiền Điện</div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>
                            {formatVND(latestUnpaid.electricityCost || 0)}
                          </div>
                          <div style={{ fontSize: '11px', color: isLight ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                            Tiêu thụ: {latestUnpaid.electricityUsage || 0} kWh
                          </div>
                        </div>
                        <div style={{ background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: '12px', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)'}` }}>
                          <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>💧 Tiền Nước</div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#06b6d4', marginTop: 2 }}>
                            {formatVND(latestUnpaid.waterCost || 0)}
                          </div>
                          <div style={{ fontSize: '11px', color: isLight ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                            Tiêu thụ: {latestUnpaid.waterUsage || 0} m³
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Danh sách yêu cầu bảo trì gần nhất */}
                  {maintenanceRequests.length > 0 && (
                    <div style={{
                      background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                      border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '16px', padding: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Wrench size={15} color="#f59e0b" /> Yêu Cầu Sửa Chữa Mới Nhất
                        </div>
                        <button
                          onClick={() => setActiveTab('repairs')}
                          style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Xem tất cả →
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <Wrench size={18} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: isLight ? '#0f172a' : '#fff' }}>
                            {maintenanceRequests[0].title}
                          </div>
                          <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 2 }}>
                            Trạng thái: <strong style={{ color: '#10b981' }}>{maintenanceRequests[0].status || 'Chờ xử lý'}</strong> • {formatDate(maintenanceRequests[0].createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ──────── TAB 2: HÓA ĐƠN & THANH TOÁN (INVOICES) ──────── */}
              {activeTab === 'invoices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Hóa Đơn Của Tôi</h3>
                    <span style={{ fontSize: '12px', color: unpaidInvoices.length > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                      {unpaidInvoices.length > 0 ? `${unpaidInvoices.length} hóa đơn cần trả` : 'Đã thanh toán đủ'}
                    </span>
                  </div>

                  {/* Danh Sách Hóa Đơn Chưa Thanh Toán */}
                  {unpaidInvoices.map(inv => (
                    <div
                      key={inv.id}
                      style={{
                        background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                        border: `1.5px solid ${isLight ? '#fca5a5' : 'rgba(239,68,68,0.4)'}`,
                        borderRadius: '16px', padding: '16px',
                        boxShadow: isLight ? '0 4px 14px rgba(239,68,68,0.06)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: 4 }}>
                            Chưa thanh toán
                          </span>
                          <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '8px 0 2px' }}>
                            Hóa đơn {inv.month ? `Tháng ${inv.month}/${inv.year}` : inv.invoiceCode}
                          </h4>
                          <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>
                            Mã: {inv.invoiceCode} • Hạn: {formatDate(inv.dueDate || inv.createdAt)}
                          </div>
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#ef4444' }}>
                          {formatVND(inv.totalAmount)}
                        </div>
                      </div>

                      <div style={{ margin: '14px 0', padding: '10px 12px', background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)', borderRadius: 10, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền phòng</span>
                          <strong>{formatVND(inv.rentAmount || inv.roomPrice || 0)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền điện ({inv.electricityUsage || 0} kWh)</span>
                          <strong>{formatVND(inv.electricityCost || 0)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền nước ({inv.waterUsage || 0} m³)</span>
                          <strong>{formatVND(inv.waterCost || 0)}</strong>
                        </div>
                        {inv.servicesCost > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Dịch vụ phòng</span>
                            <strong>{formatVND(inv.servicesCost)}</strong>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenQrPay(inv)}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff', border: 'none', borderRadius: '10px',
                          padding: '10px', fontWeight: 800, fontSize: '13px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: 6,
                          boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                        }}
                      >
                        <QrCode size={16} /> Thanh Toán Ngay Bằng QR
                      </button>
                    </div>
                  ))}

                  {/* Danh Sách Hóa Đơn Đã Thanh Toán */}
                  {paidInvoices.map(inv => (
                    <div
                      key={inv.id}
                      style={{
                        background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                        border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '16px', padding: '16px', opacity: 0.9
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: 4 }}>
                            ✅ Đã thanh toán
                          </span>
                          <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '8px 0 2px' }}>
                            Hóa đơn {inv.month ? `Tháng ${inv.month}/${inv.year}` : inv.invoiceCode}
                          </h4>
                          <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
                            Ngày thanh toán: {formatDate(inv.paidAt || inv.updatedAt || inv.createdAt)}
                          </div>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981' }}>
                          {formatVND(inv.totalAmount)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {invoices.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      <Receipt size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <div>Chưa có dữ liệu hóa đơn</div>
                    </div>
                  )}
                </div>
              )}

              {/* ──────── TAB 3: HỢP ĐỒNG (CONTRACTS) ──────── */}
              {activeTab === 'contracts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Hợp Đồng Của Tôi</h3>
                    <span style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 700 }}>
                      {contracts.length} hợp đồng
                    </span>
                  </div>

                  {contracts.map(cont => (
                    <div
                      key={cont.id}
                      style={{
                        background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                        border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(99,102,241,0.3)'}`,
                        borderRadius: '16px', padding: '18px',
                        boxShadow: isLight ? '0 4px 14px rgba(0,0,0,0.04)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 800, background: 'rgba(99,102,241,0.15)',
                          color: '#6366f1', padding: '3px 8px', borderRadius: 6
                        }}>
                          {cont.isCoTenant ? '👥 Phụ lục HĐ Ở Ghép' : '📜 Hợp Đồng Thuê Nhà'}
                        </span>
                        <span style={{
                          fontSize: '11px', fontWeight: 800,
                          background: cont.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          color: cont.status === 'Active' ? '#10b981' : '#f59e0b',
                          padding: '3px 8px', borderRadius: 6
                        }}>
                          {cont.status === 'Active' ? '✅ Đang hiệu lực' : cont.status || 'Chờ xác nhận'}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px' }}>
                        {cont.contractCode || `HĐ-${cont.roomNumber || currentRoomNumber}`}
                      </h4>
                      <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8', marginBottom: 14 }}>
                        Phòng: <strong style={{ color: isLight ? '#0f172a' : '#fff' }}>{cont.roomNumber || currentRoomNumber}</strong> • {cont.zoneName || currentZoneName}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: '12px', fontSize: '12px' }}>
                        <div>
                          <div style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền cọc</div>
                          <strong style={{ color: '#10b981', fontSize: '14px' }}>{formatVND(cont.deposit || cont.depositAmount || 0)}</strong>
                        </div>
                        <div>
                          <div style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền thuê tháng</div>
                          <strong style={{ fontSize: '14px' }}>{formatVND(cont.rentAmount || cont.monthlyRent || 0)}</strong>
                        </div>
                        <div>
                          <div style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Ngày bắt đầu</div>
                          <strong>{formatDate(cont.startDate)}</strong>
                        </div>
                        <div>
                          <div style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Ngày kết thúc</div>
                          <strong>{formatDate(cont.endDate)}</strong>
                        </div>
                      </div>

                      {cont.status === 'PendingSignature' && (
                        <button
                          onClick={async () => {
                            if (window.confirm('Bạn có đồng ý ký điện tử hợp đồng này không?')) {
                              try {
                                await contractService.signContract(cont.id);
                                alert('Ký hợp đồng thành công!');
                                loadData(true);
                              } catch (err) {
                                alert('Lỗi ký hợp đồng: ' + (err.response?.data?.message || err.message));
                              }
                            }
                          }}
                          style={{
                            width: '100%', marginTop: 12,
                            background: '#6366f1', color: '#fff', border: 'none',
                            borderRadius: 10, padding: '10px', fontSize: '13px', fontWeight: 800,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                          }}
                        >
                          <FileCheck size={16} /> Ký Điện Tử Online Ngay
                        </button>
                      )}
                    </div>
                  ))}

                  {contracts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      <FileText size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <div>Chưa có dữ liệu hợp đồng</div>
                    </div>
                  )}
                </div>
              )}

              {/* ──────── TAB 4: BÁO HỎNG & BẢO TRÌ (REPAIRS) ──────── */}
              {activeTab === 'repairs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Sự Cố & Báo Hỏng</h3>
                    <button
                      onClick={() => setBottomSheet('repair')}
                      style={{
                        background: '#f59e0b', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '6px 12px', fontSize: '12px', fontWeight: 800,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <Plus size={14} /> Gửi Báo Hỏng
                    </button>
                  </div>

                  {maintenanceRequests.map(item => (
                    <div
                      key={item.id}
                      style={{
                        background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                        border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '16px', padding: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{
                            fontSize: '11px', fontWeight: 800,
                            background: item.status === 'Completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                            color: item.status === 'Completed' ? '#10b981' : '#f59e0b',
                            padding: '2px 8px', borderRadius: 4
                          }}>
                            {item.status === 'Completed' ? '✅ Đã hoàn thành' : item.status === 'InProgress' ? '🛠️ Đang sửa chữa' : '⏳ Chờ tiếp nhận'}
                          </span>
                          <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '8px 0 2px' }}>
                            {item.title}
                          </h4>
                          <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
                            Loại: {item.issueType || 'Sự cố'} • Ngày gửi: {formatDate(item.createdAt)}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '11px', fontWeight: 700,
                          color: item.priority === 'High' || item.priority === 'Urgent' ? '#ef4444' : '#6366f1'
                        }}>
                          {item.priority === 'High' || item.priority === 'Urgent' ? '⚡ Khẩn cấp' : 'Bình thường'}
                        </span>
                      </div>

                      {item.description && (
                        <div style={{
                          margin: '10px 0 0', padding: '8px 10px',
                          background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.5)',
                          borderRadius: 8, fontSize: '12px', color: isLight ? '#475569' : '#cbd5e1'
                        }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                  ))}

                  {maintenanceRequests.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      <Wrench size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <div>Không có yêu cầu sửa chữa nào</div>
                    </div>
                  )}
                </div>
              )}

              {/* ──────── TAB 5: HỒ SƠ CÁ NHÂN (PROFILE) ──────── */}
              {activeTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{
                    background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '16px', padding: '18px', textAlign: 'center',
                    boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.03)' : 'none'
                  }}>
                    <img
                      src={getImageUrl(user?.avatarUrl, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120')}
                      alt="Avatar"
                      style={{ width: 68, height: 68, borderRadius: '50%', border: '3px solid #10b981', margin: '0 auto 8px', objectFit: 'cover' }}
                    />
                    <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 2px' }}>
                      {user?.fullName || profile?.fullName || 'Khách Thuê Phòng'}
                    </h3>
                    <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      {user?.email || profile?.email || 'tenant@smartrent.vn'} • {profile?.phoneNumber || profile?.phone || '0987.654.321'}
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '3px 10px', borderRadius: 20, fontSize: '11px', fontWeight: 700, marginTop: 8 }}>
                      <ShieldCheck size={13} /> {profile?.cccd ? 'Đã xác thực CCCD' : 'Khách thuê SmartRent'}
                    </div>
                  </div>

                  <div style={{
                    background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '16px', padding: '14px 16px', fontSize: '13px'
                  }}>
                    {[
                      { label: 'Phòng đang thuê', val: `Phòng ${currentRoomNumber}` },
                      { label: 'Số CCCD', val: profile?.cccd || tenantDashboard?.cccd || '001201009876' },
                      { label: 'Quê quán', val: profile?.hometown || tenantDashboard?.hometown || 'Chưa cập nhật' },
                      { label: 'Phương tiện gửi', val: vehicle?.licensePlate ? `${vehicle.vehicleType || 'Xe máy'} (${vehicle.licensePlate})` : (tenantDashboard?.vehicleInfo || '1 xe máy') },
                      { label: 'Ngày vào ở', val: formatDate(tenantDashboard?.moveInDate) || '01/08/2026' }
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < 4 ? `1px solid ${isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)'}` : 'none' }}>
                        <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>{item.label}</span>
                        <strong style={{ color: isLight ? '#0f172a' : '#fff' }}>{item.val}</strong>
                      </div>
                    ))}
                  </div>

                  {/* Nút Đăng Xuất */}
                  <button
                    onClick={async () => {
                      if (window.confirm('Bạn có chắc muốn đăng xuất không?')) {
                        await logout();
                        navigate('/login');
                      }
                    }}
                    style={{
                      background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12,
                      padding: '12px', fontSize: '14px', fontWeight: 800,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                  >
                    <LogOut size={16} /> Đăng Xuất Tài Khoản
                  </button>
                </div>
              )}
            </>
          )}

          {/* ═════════════════════════════════════════════════════ */}
          {/* ────────────── DÀNH CHO CHỦ TRỌ (LANDLORD) ────────── */}
          {/* ═════════════════════════════════════════════════════ */}
          {role === 'landlord' && (
            <>
              {/* ──────── TAB 1: TỔNG QUAN CHỦ TRỌ (HOME) ──────── */}
              {activeTab === 'home' && (
                <>
                  <div style={{
                    background: isLight
                      ? 'linear-gradient(135deg, #ffffff, #eef2ff)'
                      : 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(15,23,42,0.9))',
                    border: `1px solid ${isLight ? '#c7d2fe' : 'rgba(99,102,241,0.3)'}`,
                    borderRadius: '18px', padding: '18px',
                    boxShadow: isLight ? '0 4px 18px rgba(99,102,241,0.08)' : '0 8px 24px rgba(0,0,0,0.3)'
                  }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 800, textTransform: 'uppercase',
                      color: '#6366f1', background: 'rgba(99,102,241,0.15)',
                      padding: '3px 8px', borderRadius: '6px'
                    }}>
                      Tổng Quan Kinh Doanh
                    </span>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '8px 0 2px', color: isLight ? '#0f172a' : '#fff' }}>
                      {zones[0]?.name || 'Hệ Thống Trọ SmartRent'}
                    </h2>
                    <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      Tổng {landlordDashboard?.totalRooms || rooms.length || 0} phòng • Tỉ lệ lấp đầy: {landlordDashboard?.occupancyRate || 0}%
                    </div>

                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
                      marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Doanh thu tháng này</div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                          {formatVND(landlordDashboard?.revenue || 0)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Hóa đơn chưa thu</div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#ef4444', marginTop: 2 }}>
                          {landlordDashboard?.unpaidInvoices || 0} phòng
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Thống kê nhanh */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)', padding: 14, borderRadius: 14, border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}` }}>
                      <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Phòng đang thuê</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                        {landlordDashboard?.occupied || 0}
                      </div>
                    </div>
                    <div style={{ background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)', padding: 14, borderRadius: 14, border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}` }}>
                      <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Phòng còn trống</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6', marginTop: 2 }}>
                        {landlordDashboard?.vacant || 0}
                      </div>
                    </div>
                  </div>

                  {/* Sự cố cần sửa */}
                  <div style={{
                    background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '16px', padding: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Wrench size={16} color="#f59e0b" /> Yêu Cầu Sửa Chữa Cần Xử Lý
                      </div>
                      <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 800 }}>
                        {landlordDashboard?.pendingMaintenance || 0} việc
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* ──────── TAB 2: QUẢN LÝ PHÒNG (ROOMS) ──────── */}
              {activeTab === 'invoices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Hóa Đơn Thu Tiền</h3>
                    <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: 700 }}>
                      Tổng: {invoices.length}
                    </span>
                  </div>

                  {invoices.slice(0, 10).map(inv => (
                    <div
                      key={inv.id}
                      style={{
                        background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                        border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '14px', padding: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '14px' }}>
                            Phòng {inv.roomNumber || 'Phòng'} • {inv.month ? `T${inv.month}/${inv.year}` : inv.invoiceCode}
                          </div>
                          <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 2 }}>
                            Khách: {inv.tenantName || 'Người thuê'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: '15px', color: inv.status === 'Paid' ? '#10b981' : '#ef4444' }}>
                            {formatVND(inv.totalAmount)}
                          </div>
                          <span style={{
                            fontSize: '10px', fontWeight: 700,
                            color: inv.status === 'Paid' ? '#10b981' : '#ef4444',
                            background: inv.status === 'Paid' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            padding: '1px 6px', borderRadius: 4
                          }}>
                            {inv.status === 'Paid' ? 'Đã thu' : 'Chưa thu'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ──────── TAB 3: DANH SÁCH PHÒNG TRỌ (CONTRACTS TAB ICON) ──────── */}
              {activeTab === 'contracts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Danh Sách Phòng Trọ</h3>
                    <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
                      {rooms.length} phòng
                    </span>
                  </div>

                  {rooms.slice(0, 15).map(room => (
                    <div
                      key={room.id}
                      style={{
                        background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                        border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '14px', padding: '14px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '15px' }}>
                          Phòng {room.roomNumber}
                        </div>
                        <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 2 }}>
                          {room.zoneName || 'Khu trọ'} • {formatVND(room.price)}/th
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px', fontWeight: 800,
                        padding: '3px 8px', borderRadius: 6,
                        background: room.status === 'Occupied' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                        color: room.status === 'Occupied' ? '#10b981' : '#3b82f6'
                      }}>
                        {room.status === 'Occupied' ? 'Đang thuê' : 'Còn trống'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ──────── TAB 4: BẢO TRÌ SỬA CHỮA (REPAIRS) ──────── */}
              {activeTab === 'repairs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Xử Lý Báo Hỏng</h3>
                    <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700 }}>
                      {maintenanceRequests.length} phiếu
                    </span>
                  </div>

                  {maintenanceRequests.map(req => (
                    <div
                      key={req.id}
                      style={{
                        background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                        border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '14px', padding: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '14px' }}>{req.title}</div>
                          <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 2 }}>
                            Phòng: <strong>{req.roomNumber || 'Phòng'}</strong> • Khách: {req.tenantName || 'Người gửi'}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '10px', fontWeight: 800,
                          padding: '2px 6px', borderRadius: 4,
                          background: req.status === 'Completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          color: req.status === 'Completed' ? '#10b981' : '#f59e0b'
                        }}>
                          {req.status === 'Completed' ? 'Đã xong' : 'Cần xử lý'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ──────── TAB 5: HỒ SƠ CHỦ TRỌ (PROFILE) ──────── */}
              {activeTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{
                    background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '16px', padding: '18px', textAlign: 'center'
                  }}>
                    <img
                      src={getImageUrl(user?.avatarUrl, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120')}
                      alt="Avatar"
                      style={{ width: 68, height: 68, borderRadius: '50%', border: '3px solid #6366f1', margin: '0 auto 8px', objectFit: 'cover' }}
                    />
                    <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 2px' }}>
                      {user?.fullName || 'Chủ Khu Trọ'}
                    </h3>
                    <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      {user?.email || 'landlord@smartrent.vn'}
                    </div>
                  </div>

                  <div style={{
                    background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '16px', padding: '14px 16px', fontSize: '13px'
                  }}>
                    <div style={{ fontWeight: 800, marginBottom: 8, color: '#6366f1' }}>💳 Tài Khoản Nhận Tiền VietQR:</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Ngân hàng</span>
                      <strong>{profile?.bankName || 'BIDV'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Số tài khoản</span>
                      <strong>{profile?.bankAccountNumber || '6531211114'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Chủ tài khoản</span>
                      <strong>{profile?.bankAccountName || 'NGUYEN MANH CUONG'}</strong>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (window.confirm('Bạn có chắc muốn đăng xuất không?')) {
                        await logout();
                        navigate('/login');
                      }
                    }}
                    style={{
                      background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12,
                      padding: '12px', fontSize: '14px', fontWeight: 800,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                  >
                    <LogOut size={16} /> Đăng Xuất Tài Khoản
                  </button>
                </div>
              )}
            </>
          )}

        </main>

        {/* ── 3. BOTTOM NAVIGATION BAR (Thanh Điều Hướng Đáy Chuẩn App) ── */}
        <nav style={{
          background: isLight ? 'rgba(255,255,255,0.96)' : 'rgba(11,17,32,0.96)',
          backdropFilter: 'blur(16px)',
          borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          padding: '8px 4px 14px',
          flexShrink: 0,
          zIndex: 90
        }}>
          {[
            { id: 'home', label: 'Trang chủ', icon: Home },
            { id: 'invoices', label: role === 'tenant' ? 'Hóa đơn' : 'Thu tiền', icon: Receipt, badge: role === 'tenant' && unpaidInvoices.length > 0 ? String(unpaidInvoices.length) : null },
            { id: 'repairs', label: 'Báo sửa', icon: Wrench, badge: maintenanceRequests.length > 0 ? String(maintenanceRequests.length) : null },
            { id: 'contracts', label: role === 'tenant' ? 'Hợp đồng' : 'DS Phòng', icon: FileText },
            { id: 'profile', label: 'Cá nhân', icon: User }
          ].map(tab => {
            const Icon = tab.icon;
            const isAct = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  cursor: 'pointer',
                  color: isAct ? (role === 'tenant' ? '#10b981' : '#6366f1') : (isLight ? '#64748b' : '#94a3b8'),
                  position: 'relative',
                  padding: '4px 0',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Icon size={19} />
                  {tab.badge && (
                    <span style={{
                      position: 'absolute', top: -3, right: -6,
                      background: '#ef4444', color: '#fff', fontSize: '9px',
                      fontWeight: 800, width: 14, height: 14, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '10px', fontWeight: isAct ? 800 : 600 }}>
                  {tab.label}
                </span>
                {isAct && (
                  <div style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: role === 'tenant' ? '#10b981' : '#6366f1',
                    position: 'absolute', bottom: 0
                  }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── 4. BOTTOM SHEET MODAL (Trượt Từ Dưới Lên) ── */}
        {bottomSheet && (
          <div
            onClick={() => setBottomSheet(null)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: isLight ? '#ffffff' : '#111827',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                borderBottom: 'none',
                padding: '16px 20px 24px',
                maxHeight: '90%',
                overflowY: 'auto'
              }}
            >
              {/* Drag Handle Bar */}
              <div style={{
                width: 40, height: 4, borderRadius: 2,
                background: isLight ? '#cbd5e1' : '#4b5563',
                margin: '0 auto 14px'
              }} />

              {/* ──────── BOTTOM SHEET 1: QUÉT MÃ VIETQR THANH TOÁN ──────── */}
              {bottomSheet === 'qr_pay' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                      Thanh Toán Phòng {selectedInvoice?.roomNumber || currentRoomNumber}
                    </h3>
                    <button
                      onClick={() => setBottomSheet(null)}
                      style={{ background: 'transparent', border: 'none', fontSize: '18px', color: isLight ? '#64748b' : '#94a3b8', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>

                  {paymentSuccess ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                      <div style={{
                        width: 60, height: 60, borderRadius: '50%',
                        background: 'rgba(16,185,129,0.15)', color: '#10b981',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px'
                      }}>
                        <CheckCircle2 size={36} />
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#10b981' }}>
                        Đã Gửi Xác Nhận Thanh Toán!
                      </h3>
                      <p style={{ fontSize: '13px', color: isLight ? '#64748b' : '#94a3b8', margin: 0 }}>
                        Chủ trọ sẽ kiểm tra và duyệt biên lai cho bạn trong ít phút.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Ảnh QR VietQR Tạo Tự Động */}
                      {(() => {
                        const inv = selectedInvoice || unpaidInvoices[0] || null;
                        const amt = inv ? inv.totalAmount : 0;
                        const bank = inv?.landlordBankName || profile?.bankName || 'BIDV';
                        const accNo = inv?.landlordBankAccountNumber || profile?.bankAccountNumber || '6531211114';
                        const accName = inv?.landlordBankAccountName || profile?.bankAccountName || 'NGUYEN MANH CUONG';
                        const content = `Phong ${inv?.roomNumber || currentRoomNumber} thanh toan ${inv?.invoiceCode || 'tien nha'}`;
                        const qrUrl = getVietQRUrl(bank, accNo, amt, content, accName);

                        return (
                          <>
                            <div style={{ textAlign: 'center', margin: '10px 0' }}>
                              <div style={{
                                display: 'inline-block', padding: 10, background: '#fff',
                                borderRadius: 16, border: '2px solid #10b981',
                                boxShadow: '0 8px 24px rgba(16,185,129,0.15)'
                              }}>
                                <img
                                  src={qrUrl}
                                  alt="VietQR"
                                  style={{ width: '220px', height: 'auto', display: 'block' }}
                                />
                              </div>
                              <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 6 }}>
                                📸 Mở app ngân hàng bất kỳ (Vietcombank, MB, Techcombank...) để quét
                              </div>
                            </div>

                            {/* Thông Tin Chuyển Khoản Chi Tiết Kèm Nút Copy */}
                            <div style={{
                              background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)',
                              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: 14, padding: '12px 14px', fontSize: '12px',
                              display: 'flex', flexDirection: 'column', gap: 8, margin: '12px 0'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Ngân hàng</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <strong>{bank}</strong>
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Số tài khoản</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <strong style={{ color: '#10b981', fontSize: '13px' }}>{accNo}</strong>
                                  <button
                                    onClick={() => handleCopy(accNo, 'accNo')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981' }}
                                  >
                                    {copiedField === 'accNo' ? <Check size={14} /> : <Copy size={14} />}
                                  </button>
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Chủ tài khoản</span>
                                <strong>{accName}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Số tiền chuyển</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <strong style={{ color: '#ef4444', fontSize: '14px' }}>{formatVND(amt)}</strong>
                                  <button
                                    onClick={() => handleCopy(amt, 'amt')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                  >
                                    {copiedField === 'amt' ? <Check size={14} /> : <Copy size={14} />}
                                  </button>
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Nội dung CK</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <strong style={{ color: '#f59e0b' }}>{content}</strong>
                                  <button
                                    onClick={() => handleCopy(content, 'content')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b' }}
                                  >
                                    {copiedField === 'content' ? <Check size={14} /> : <Copy size={14} />}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Tải ảnh minh chứng chuyển khoản (tùy chọn) */}
                            <div style={{ marginBottom: 12 }}>
                              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                                📷 Đính kèm ảnh biên lai chuyển khoản (tùy chọn):
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    setProofFile(file);
                                    setProofPreview(URL.createObjectURL(file));
                                  }
                                }}
                                style={{ fontSize: '11.5px', width: '100%' }}
                              />
                              {proofPreview && (
                                <img
                                  src={proofPreview}
                                  alt="Minh chứng"
                                  style={{ width: '100%', maxHeight: '100px', objectFit: 'contain', marginTop: 6, borderRadius: 8 }}
                                />
                              )}
                            </div>

                            {/* Nút bấm hoàn tất */}
                            <button
                              onClick={handleConfirmPayment}
                              disabled={actionLoading}
                              style={{
                                width: '100%',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#fff', border: 'none', borderRadius: '12px',
                                padding: '12px', fontWeight: 800, fontSize: '14px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', gap: 8,
                                boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
                              }}
                            >
                              <CheckCircle2 size={18} /> {actionLoading ? 'Đang gửi...' : '✅ Tôi Đã Chuyển Khoản Xong'}
                            </button>
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}

              {/* ──────── BOTTOM SHEET 2: BÁO HỎNG SỬA CHỮA ──────── */}
              {bottomSheet === 'repair' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Wrench size={18} color="#f59e0b" /> Gửi Yêu Cầu Sửa Chữa Phòng
                    </h3>
                    <button
                      onClick={() => setBottomSheet(null)}
                      style={{ background: 'transparent', border: 'none', fontSize: '18px', color: isLight ? '#64748b' : '#94a3b8', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>

                  {repairSuccess ? (
                    <div style={{ textAlign: 'center', padding: '24px 10px' }}>
                      <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 10px' }} />
                      <h4 style={{ margin: 0, color: '#10b981' }}>Đã gửi yêu cầu thành công!</h4>
                      <p style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>Chủ nhà sẽ liên hệ xử lý cho bạn sớm nhất.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitRepair} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                          Loại sự cố:
                        </label>
                        <select
                          value={repairForm.issueType}
                          onChange={e => setRepairForm({ ...repairForm, issueType: e.target.value })}
                          style={{
                            width: '100%', padding: '10px', borderRadius: 10,
                            background: isLight ? '#f8fafc' : '#1f2937',
                            color: isLight ? '#0f172a' : '#fff',
                            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                            fontSize: '13px'
                          }}
                        >
                          <option value="Điện">⚡ Hệ thống điện (Bóng đèn, ổ cắm...)</option>
                          <option value="Nước">💧 Cấp thoát nước (Vòi rỉ, nghẹt cống...)</option>
                          <option value="Khóa cửa">🔑 Khóa cửa / Cửa sổ</option>
                          <option value="Thiết bị">❄️ Thiết bị gia dụng (Máy lạnh, nóng lạnh...)</option>
                          <option value="Khác">🛠️ Sự cố khác</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                          Tiêu đề sự cố:
                        </label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Bóng đèn phòng tắm bị cháy..."
                          value={repairForm.title}
                          onChange={e => setRepairForm({ ...repairForm, title: e.target.value })}
                          style={{
                            width: '100%', padding: '10px', borderRadius: 10,
                            background: isLight ? '#f8fafc' : '#1f2937',
                            color: isLight ? '#0f172a' : '#fff',
                            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                            fontSize: '13px', boxSizing: 'border-box'
                          }}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                          Mức độ ưu tiên:
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => setRepairForm({ ...repairForm, priority: 'Medium' })}
                            style={{
                              padding: '8px', borderRadius: 8, fontSize: '12px', fontWeight: 700,
                              border: repairForm.priority === 'Medium' ? '2px solid #6366f1' : `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                              background: repairForm.priority === 'Medium' ? 'rgba(99,102,241,0.15)' : 'transparent',
                              color: repairForm.priority === 'Medium' ? '#6366f1' : (isLight ? '#64748b' : '#94a3b8'),
                              cursor: 'pointer'
                            }}
                          >
                            Bình thường
                          </button>
                          <button
                            type="button"
                            onClick={() => setRepairForm({ ...repairForm, priority: 'Urgent' })}
                            style={{
                              padding: '8px', borderRadius: 8, fontSize: '12px', fontWeight: 700,
                              border: repairForm.priority === 'Urgent' ? '2px solid #ef4444' : `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                              background: repairForm.priority === 'Urgent' ? 'rgba(239,68,68,0.15)' : 'transparent',
                              color: repairForm.priority === 'Urgent' ? '#ef4444' : (isLight ? '#64748b' : '#94a3b8'),
                              cursor: 'pointer'
                            }}
                          >
                            ⚡ Khẩn cấp
                          </button>
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                          Mô tả chi tiết:
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Mô tả cụ thể vị trí và tình trạng hỏng hóc..."
                          value={repairForm.description}
                          onChange={e => setRepairForm({ ...repairForm, description: e.target.value })}
                          style={{
                            width: '100%', padding: '10px', borderRadius: 10,
                            background: isLight ? '#f8fafc' : '#1f2937',
                            color: isLight ? '#0f172a' : '#fff',
                            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                            fontSize: '13px', boxSizing: 'border-box', resize: 'none'
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={actionLoading}
                        style={{
                          width: '100%', marginTop: 6,
                          background: '#f59e0b', color: '#fff', border: 'none',
                          borderRadius: 12, padding: '12px', fontWeight: 800, fontSize: '14px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}
                      >
                        <Send size={16} /> {actionLoading ? 'Đang gửi...' : 'Gửi Phiếu Báo Sửa Chữa'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* ──────── BOTTOM SHEET 3: THÔNG BÁO HỆ THỐNG ──────── */}
              {bottomSheet === 'notifications' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Bell size={18} color="#10b981" /> Thông Báo ({notifications.length})
                    </h3>
                    <button
                      onClick={() => setBottomSheet(null)}
                      style={{ background: 'transparent', border: 'none', fontSize: '18px', color: isLight ? '#64748b' : '#94a3b8', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '350px', overflowY: 'auto' }}>
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        style={{
                          background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)',
                          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: 10, padding: '10px 12px', fontSize: '12px'
                        }}
                      >
                        <div style={{ fontWeight: 800, color: isLight ? '#0f172a' : '#fff' }}>
                          {n.title}
                        </div>
                        <div style={{ color: isLight ? '#64748b' : '#94a3b8', marginTop: 2 }}>
                          {n.content}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#10b981', marginTop: 4 }}>
                          {formatRelativeTime(n.createdAt)}
                        </div>
                      </div>
                    ))}

                    {notifications.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px', color: isLight ? '#64748b' : '#94a3b8' }}>
                        Không có thông báo nào
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ──────── BOTTOM SHEET 4: ĐĂNG NHẬP NHANH ──────── */}
              {bottomSheet === 'login' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                      Đăng Nhập Tài Khoản
                    </h3>
                    <button
                      onClick={() => setBottomSheet(null)}
                      style={{ background: 'transparent', border: 'none', fontSize: '18px', color: isLight ? '#64748b' : '#94a3b8', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>

                  {loginError && (
                    <div style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '8px 12px', borderRadius: 8, fontSize: '12px', marginBottom: 10 }}>
                      {loginError}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: isLight ? '#64748b' : '#94a3b8' }}>
                      ⚡ Đăng nhập 1 chạm bằng tài khoản mẫu:
                    </div>
                    <button
                      onClick={() => handleQuickLogin('tenant1@smartrent.vn', '123456')}
                      style={{
                        padding: '10px', borderRadius: 10, border: '1px solid #10b981',
                        background: 'rgba(16,185,129,0.12)', color: '#10b981',
                        fontWeight: 800, fontSize: '13px', cursor: 'pointer', textAlign: 'left'
                      }}
                    >
                      👤 Khách thuê mẫu (tenant1@smartrent.vn)
                    </button>
                    <button
                      onClick={() => handleQuickLogin('landlord@smartrent.vn', '123456')}
                      style={{
                        padding: '10px', borderRadius: 10, border: '1px solid #6366f1',
                        background: 'rgba(99,102,241,0.12)', color: '#6366f1',
                        fontWeight: 800, fontSize: '13px', cursor: 'pointer', textAlign: 'left'
                      }}
                    >
                      🏠 Chủ trọ mẫu (landlord@smartrent.vn)
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
