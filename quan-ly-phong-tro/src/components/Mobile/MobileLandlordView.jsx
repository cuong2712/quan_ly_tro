import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Home, Zap, Receipt, Building2, Users, Wrench, Plus, Search,
  CheckCircle2, Clock, AlertTriangle, ArrowLeft, RefreshCw, X,
  Phone, Mail, Calendar, DollarSign, Shield, FileText, Check,
  ChevronRight, Edit, Trash2, KeyRound, Bike, Send, Image as ImageIcon,
  CreditCard, Eye, Settings, FileSpreadsheet, Download, UploadCloud
} from 'lucide-react';
import {
  zoneService, roomService, utilityService, invoiceService,
  paymentService, tenantService, contractService, maintenanceService,
  notificationService, profileService, serviceMgmtService
} from '../../services';
import {
  formatVND, formatDate, formatDateTime, getVietQRUrl,
  VIETNAM_BANKS, getImageUrl
} from '../../utils/formatters';
import { LandlordUtilityRecordView } from './LandlordUtilityRecordView';
import { LandlordInvoiceCreateView } from './LandlordInvoiceCreateView';
import { LandlordVietQRReviewView } from './LandlordVietQRReviewView';
import { LandlordRoomCreateView } from './LandlordRoomCreateView';
import { LandlordTenantCreateView } from './LandlordTenantCreateView';
import { LandlordNotificationView } from './LandlordNotificationView';

export function MobileLandlordView({
  dashboard, rooms = [], zones = [], invoices = [],
  utilityLogs = [], utilityRates = [], maintenanceRequests = [],
  profile, onRefresh, isLight, theme
}) {
  // Dedicated Full-Screen Sub-pages:
  // 'record_utility' | 'create_invoice' | 'review_vietqr' | 'create_room' | 'create_tenant' | 'send_notify' | null
  const [subView, setSubView] = useState(null);

  // Sub-tabs: 'home' | 'utilities' | 'invoices' | 'rooms' | 'tenants_contracts' | 'more'
  const [activeTab, setActiveTab] = useState('home');

  // Modal Bottom Sheets:
  // 'record_utility' | 'bulk_utility' | 'utility_rates' | 'create_invoice' |
  // 'invoice_detail' | 'view_proof' | 'room_detail' | 'create_room' |
  // 'tenant_detail' | 'create_tenant' | 'create_contract' | 'maintenance_detail' |
  // 'send_notify' | 'bank_settings' | null
  const [activeSheet, setActiveSheet] = useState(null);

  // Loading & Filter states
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');

  // Sub-navigation for multi-tab sections
  const [invoiceSubTab, setInvoiceSubTab] = useState('invoices'); // 'invoices' | 'payments'
  const [tenantSubTab, setTenantSubTab] = useState('tenants'); // 'tenants' | 'contracts'

  // Selected item states for detail modals
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);

  // Lắng nghe sự kiện điều hướng từ bên ngoài (ví dụ: Trung tâm thông báo)
  useEffect(() => {
    const handleExternalNav = (e) => {
      if (e.detail?.subView !== undefined) {
        setSubView(e.detail.subView);
      }
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
        if (e.detail?.subTab) {
          if (e.detail.tab === 'invoices') setInvoiceSubTab(e.detail.subTab);
          if (e.detail.tab === 'tenants_contracts') setTenantSubTab(e.detail.subTab);
        }
      }
    };
    window.addEventListener('smartrent:mobile-landlord-nav', handleExternalNav);
    return () => window.removeEventListener('smartrent:mobile-landlord-nav', handleExternalNav);
  }, []);

  // ── DATA FORMS ──
  // 1. Chốt số điện nước lẻ
  const [recordForm, setRecordForm] = useState({
    roomId: '',
    month: new Date().toISOString().slice(0, 7),
    newElec: 0,
    newWater: 0,
    notes: ''
  });

  // 2. Cài đặt bảng giá điện nước
  const [rateForm, setRateForm] = useState({
    electricityRate: 3500,
    waterRate: 20000
  });

  // 3. Tạo phòng mới
  const [roomForm, setRoomForm] = useState({
    zoneId: '',
    roomNumber: '',
    price: 3000000,
    area: 25,
    maxRenters: 2,
    status: 'Vacant'
  });

  // 4. Lập hóa đơn mới
  const [invoiceForm, setInvoiceForm] = useState({
    roomId: '',
    month: new Date().toISOString().slice(0, 7),
    rentAmount: 3000000,
    electricityUsage: 0,
    electricityCost: 0,
    waterUsage: 0,
    waterCost: 0,
    servicesCost: 50000,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    note: ''
  });

  // 5. Thêm khách thuê mới
  const [tenantForm, setTenantForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: 'Tenant@123456',
    cccd: '',
    hometown: '',
    roomId: ''
  });

  // 6. Tạo hợp đồng mới
  const [contractForm, setContractForm] = useState({
    roomId: '',
    tenantProfileId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    monthlyRent: 3000000,
    depositAmount: 3000000,
    notes: ''
  });

  // 7. Soạn thông báo gửi cư dân
  const [notifyForm, setNotifyForm] = useState({
    title: '',
    content: '',
    roomId: ''
  });

  // 8. Cấu hình ngân hàng VietQR
  const [bankForm, setBankForm] = useState({
    bankName: profile?.bankName || 'BIDV',
    bankAccountNumber: profile?.bankAccountNumber || '',
    bankAccountName: profile?.bankAccountName || profile?.fullName?.toUpperCase() || ''
  });

  // Đồng bộ thông tin ngân hàng khi profile được tải về từ API
  useEffect(() => {
    if (profile) {
      setBankForm({
        bankName: profile.bankName || 'BIDV',
        bankAccountNumber: profile.bankAccountNumber || '',
        bankAccountName: profile.bankAccountName || profile.fullName?.toUpperCase() || ''
      });
    }
  }, [profile]);

  // Fetch full data for tenants & payments when needed
  const [tenantsList, setTenantsList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [contractsList, setContractsList] = useState([]);

  const loadSubData = useCallback(async () => {
    try {
      const [tRes, pRes, cRes] = await Promise.allSettled([
        tenantService.getTenants(),
        paymentService.getPayments(),
        contractService.getContracts()
      ]);
      if (tRes.status === 'fulfilled') setTenantsList(Array.isArray(tRes.value) ? tRes.value : tRes.value?.data || []);
      if (pRes.status === 'fulfilled') setPaymentsList(Array.isArray(pRes.value) ? pRes.value : pRes.value?.data || []);
      if (cRes.status === 'fulfilled') setContractsList(Array.isArray(cRes.value) ? cRes.value : cRes.value?.data || []);
    } catch (e) {
      console.warn('Lỗi load phụ trợ landlord:', e);
    }
  }, []);

  useEffect(() => {
    loadSubData();
  }, [loadSubData]);

  // Bộ lọc phòng theo khu
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      const matchZone = !selectedZoneId || r.zoneId === selectedZoneId || r.ZoneId === selectedZoneId;
      const matchSearch = !searchTerm || (r.roomNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchZone && matchSearch;
    });
  }, [rooms, selectedZoneId, searchTerm]);

  // ── HANDLERS ──

  // 1. Lưu chốt số điện nước
  const handleSaveUtility = async (e) => {
    e?.preventDefault();
    if (!recordForm.roomId) return alert('Vui lòng chọn phòng');
    setActionLoading(true);
    try {
      await utilityService.record({
        roomId: recordForm.roomId,
        month: recordForm.month,
        newElec: Number(recordForm.newElec),
        newWater: Number(recordForm.newWater),
        notes: recordForm.notes
      });
      alert('✅ Đã chốt số điện nước & tự động cập nhật hóa đơn thành công!');
      setActiveSheet(null);
      onRefresh?.();
      loadSubData();
    } catch (err) {
      alert('Lỗi chốt số: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Cập nhật bảng giá điện nước
  const handleSaveRates = async (e) => {
    e?.preventDefault();
    setActionLoading(true);
    try {
      await utilityService.updateRate({
        electricityPrice: Number(rateForm.electricityRate),
        waterPrice: Number(rateForm.waterRate)
      });
      alert('✅ Đã cập nhật bảng giá điện nước thành công!');
      setActiveSheet(null);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi cập nhật bảng giá: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Tạo phòng mới
  const handleCreateRoom = async (e) => {
    e?.preventDefault();
    if (!roomForm.roomNumber.trim()) return alert('Vui lòng nhập số phòng');
    setActionLoading(true);
    try {
      await roomService.createRoom({
        zoneId: roomForm.zoneId || zones[0]?.id,
        roomNumber: roomForm.roomNumber,
        price: Number(roomForm.price),
        area: Number(roomForm.area),
        maxRenters: Number(roomForm.maxRenters),
        status: roomForm.status
      });
      alert('✅ Đã tạo phòng mới thành công!');
      setRoomForm({ zoneId: '', roomNumber: '', price: 3000000, area: 25, maxRenters: 2, status: 'Vacant' });
      setActiveSheet(null);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi tạo phòng: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Lập hóa đơn mới
  const handleCreateInvoice = async (e) => {
    e?.preventDefault();
    if (!invoiceForm.roomId) return alert('Vui lòng chọn phòng');
    setActionLoading(true);
    try {
      await invoiceService.createInvoice({
        roomId: invoiceForm.roomId,
        month: invoiceForm.month,
        rentAmount: Number(invoiceForm.rentAmount),
        electricityUsage: Number(invoiceForm.electricityUsage),
        electricityCost: Number(invoiceForm.electricityCost),
        waterUsage: Number(invoiceForm.waterUsage),
        waterCost: Number(invoiceForm.waterCost),
        servicesCost: Number(invoiceForm.servicesCost),
        dueDate: invoiceForm.dueDate,
        note: invoiceForm.note
      });
      alert('✅ Đã tạo hóa đơn tiền phòng thành công!');
      setActiveSheet(null);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi tạo hóa đơn: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Duyệt thanh toán VietQR
  const handleConfirmPayment = async (paymentId, approve) => {
    const action = approve ? 'Duyệt tiền' : 'Từ chối';
    if (!window.confirm(`Bạn có chắc muốn ${action} cho giao dịch này?`)) return;
    setActionLoading(true);
    try {
      await paymentService.confirm(paymentId, { approve, note: approve ? 'Chủ trọ đã nhận đủ tiền' : 'Từ chối giao dịch' });
      alert(`✅ Đã ${action} thành công!`);
      setActiveSheet(null);
      loadSubData();
      onRefresh?.();
    } catch (err) {
      alert('Lỗi xử lý: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Thêm khách thuê mới
  const handleCreateTenant = async (e) => {
    e?.preventDefault();
    if (!tenantForm.fullName.trim() || !tenantForm.phone.trim()) {
      return alert('Vui lòng nhập họ tên và số điện thoại');
    }
    setActionLoading(true);
    try {
      await tenantService.createTenant(tenantForm);
      alert('✅ Đã thêm khách thuê & cấp tài khoản thành công!');
      setTenantForm({ fullName: '', phone: '', email: '', password: 'Tenant@123456', cccd: '', hometown: '', roomId: '' });
      setActiveSheet(null);
      loadSubData();
      onRefresh?.();
    } catch (err) {
      alert('Lỗi thêm khách: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Reset mật khẩu khách thuê
  const handleResetPassword = async (tenantId) => {
    const newPass = window.prompt('Nhập mật khẩu mới cho khách (tối thiểu 6 ký tự):', 'Tenant@123456');
    if (!newPass) return;
    try {
      await tenantService.resetPassword(tenantId, newPass);
      alert(`✅ Đã đặt lại mật khẩu thành công! Mật khẩu mới: ${newPass}`);
    } catch (err) {
      alert('Lỗi reset mật khẩu: ' + (err.response?.data?.message || err.message));
    }
  };

  // 8. Cập nhật tiến độ bảo trì sửa chữa
  const handleUpdateMaintenance = async (id, status) => {
    setActionLoading(true);
    try {
      await maintenanceService.update(id, {
        status,
        completionNote: status === 'Completed' ? 'Chủ trọ đã nghiệm thu hoàn tất' : 'Đang tiến hành kiểm tra'
      });
      alert(`✅ Đã cập nhật trạng thái sửa chữa sang: ${status}`);
      setActiveSheet(null);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi cập nhật: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // 9. Gửi thông báo đến cư dân
  const handleSendNotification = async (e) => {
    e?.preventDefault();
    if (!notifyForm.title.trim() || !notifyForm.content.trim()) return alert('Vui lòng nhập tiêu đề và nội dung');
    setActionLoading(true);
    try {
      await notificationService.create({
        title: notifyForm.title,
        content: notifyForm.content,
        roomId: notifyForm.roomId || undefined
      });
      alert('✅ Đã gửi thông báo đến cư dân thành công!');
      setNotifyForm({ title: '', content: '', roomId: '' });
      setActiveSheet(null);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi gửi thông báo: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // 10. Cập nhật tài khoản ngân hàng nhận tiền VietQR
  const handleSaveBank = async (e) => {
    e?.preventDefault();
    setActionLoading(true);
    try {
      await profileService.updateProfile({
        fullName: profile?.fullName || '',
        phone: profile?.phone || '',
        avatarUrl: profile?.avatarUrl,
        bankName: bankForm.bankName,
        bankAccountNumber: bankForm.bankAccountNumber,
        bankAccountName: bankForm.bankAccountName
      });
      alert('✅ Đã lưu cấu hình tài khoản nhận tiền VietQR thành công!');
      setActiveSheet(null);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi lưu ngân hàng: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // ── RENDER DEDICATED FULL-PAGE SUB-VIEWS (FLUSH TO TOP HEADER) ──
  if (subView) {
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 85,
        background: isLight ? '#f8fafc' : '#0b1120',
        overflowY: 'auto',
        scrollbarWidth: 'none'
      }}>
        {subView === 'record_utility' && (
          <LandlordUtilityRecordView
            zones={zones}
            rooms={rooms}
            rateForm={rateForm}
            isLight={isLight}
            onBack={() => setSubView(null)}
            onSuccess={() => {
              setSubView(null);
              onRefresh?.();
              loadSubData();
            }}
          />
        )}
        {subView === 'create_invoice' && (
          <LandlordInvoiceCreateView
            zones={zones}
            rooms={rooms}
            isLight={isLight}
            onBack={() => setSubView(null)}
            onSuccess={() => {
              setSubView(null);
              onRefresh?.();
              loadSubData();
            }}
          />
        )}
        {subView === 'review_vietqr' && (
          <LandlordVietQRReviewView
            zones={zones}
            rooms={rooms}
            invoices={invoices}
            payments={paymentsList}
            isLight={isLight}
            onBack={() => setSubView(null)}
            onSuccess={() => {
              setSubView(null);
              onRefresh?.();
              loadSubData();
            }}
          />
        )}
        {subView === 'create_room' && (
          <LandlordRoomCreateView
            zones={zones}
            isLight={isLight}
            onBack={() => setSubView(null)}
            onSuccess={() => {
              setSubView(null);
              onRefresh?.();
            }}
          />
        )}
        {subView === 'create_tenant' && (
          <LandlordTenantCreateView
            zones={zones}
            rooms={rooms}
            isLight={isLight}
            onBack={() => setSubView(null)}
            onSuccess={() => {
              setSubView(null);
              onRefresh?.();
              loadSubData();
            }}
          />
        )}
        {subView === 'send_notify' && (
          <LandlordNotificationView
            zones={zones}
            rooms={rooms}
            isLight={isLight}
            onBack={() => setSubView(null)}
            onSuccess={() => {
              setSubView(null);
              onRefresh?.();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ────────────── TAB 1: TỔNG QUAN (DASHBOARD) ─────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'home' && (
        <>
          {/* Card Thống Kê Tổng Quan */}
          <div style={{
            background: isLight
              ? 'linear-gradient(135deg, #ffffff, #eef2ff)'
              : 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(15,23,42,0.95))',
            border: `1px solid ${isLight ? '#c7d2fe' : 'rgba(99,102,241,0.35)'}`,
            borderRadius: '20px', padding: '18px',
            boxShadow: isLight ? '0 4px 18px rgba(99,102,241,0.08)' : '0 8px 24px rgba(0,0,0,0.35)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{
                  fontSize: '11px', fontWeight: 800, textTransform: 'uppercase',
                  color: '#6366f1', background: 'rgba(99,102,241,0.15)',
                  padding: '3px 8px', borderRadius: '6px'
                }}>
                  👑 Quản Trị Hệ Thống Trọ
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '8px 0 2px' }}>
                  {zones[0]?.name || 'SmartRent Management'}
                </h2>
                <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>
                  {dashboard?.totalZones || zones.length || 1} khu trọ • {dashboard?.totalRooms || rooms.length || 0} phòng • Lấp đầy: {dashboard?.occupancyRate || 0}%
                </div>
              </div>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'rgba(99,102,241,0.2)', color: '#6366f1',
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
                <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Doanh thu tháng này</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                  {formatVND(dashboard?.revenue || 0)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Hóa đơn chưa thu</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#ef4444', marginTop: 2 }}>
                  {dashboard?.unpaidInvoices || 0} phòng
                </div>
              </div>
            </div>
          </div>

          {/* 6 Nút Tác Vụ Nhanh Cốt Lõi Trên Điện Thoại */}
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 800, color: isLight ? '#475569' : '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ⚡ Thao Tác Nghiệp Vụ Nhanh
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: 'Chốt điện nước', icon: Zap, color: '#f59e0b', action: () => setSubView('record_utility') },
                { label: 'Lập hóa đơn', icon: Receipt, color: '#10b981', action: () => setSubView('create_invoice') },
                { label: 'Duyệt VietQR', icon: CreditCard, color: '#6366f1', action: () => setSubView('review_vietqr') },
                { label: 'Thêm phòng', icon: Plus, color: '#3b82f6', action: () => setSubView('create_room') },
                { label: 'Thêm khách', icon: Users, color: '#ec4899', action: () => setSubView('create_tenant') },
                { label: 'Gửi thông báo', icon: Send, color: '#8b5cf6', action: () => setSubView('send_notify') }
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={i}
                    onClick={item.action}
                    style={{
                      background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                      border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '14px', padding: '12px 6px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${item.color}18`, color: item.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={18} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: isLight ? '#334155' : '#cbd5e1' }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cảnh Báo Giao Dịch Chờ Duyệt (VietQR Proofs) */}
          {paymentsList.filter(p => (p.status || '').toLowerCase() === 'pendingapproval' || (p.status || '').toLowerCase() === 'pending').length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.12))',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 16, padding: '14px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '13px', color: '#ef4444' }}>
                    Có {paymentsList.filter(p => (p.status || '').toLowerCase() === 'pendingapproval' || (p.status || '').toLowerCase() === 'pending').length} khoản VietQR chờ duyệt!
                  </div>
                  <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Khách đã gửi ảnh biên lai ngân hàng</div>
                </div>
              </div>
              <button
                onClick={() => setSubView('review_vietqr')}
                style={{
                  background: '#ef4444', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer'
                }}
              >
                Duyệt ngay
              </button>
            </div>
          )}

          {/* Danh Sách Sự Cố Cần Xử Lý */}
          <div style={{
            background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
            border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '16px', padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wrench size={16} color="#f59e0b" /> Sự Cố Phòng Trọ Cần Xử Lý ({maintenanceRequests.filter(m => m.status !== 'Completed').length})
              </div>
              <button
                onClick={() => setActiveTab('more')}
                style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                Xem tất cả →
              </button>
            </div>
            {maintenanceRequests.slice(0, 3).map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)'}` }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{m.title}</div>
                  <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>
                    Phòng {m.roomNumber} • {formatDate(m.createdAt)}
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedMaintenance(m); setActiveSheet('maintenance_detail'); }}
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Xử lý
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ────────────── TAB 2: CHỐT ĐIỆN NƯỚC (UTILITIES) ────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'utilities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={18} color="#f59e0b" /> Chốt Chỉ Số Điện Nước
            </h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setActiveSheet('utility_rates')}
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
              >
                ⚙️ Bảng Giá
              </button>
              <button
                onClick={() => setSubView('record_utility')}
                style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Plus size={14} /> Chốt Phòng
              </button>
            </div>
          </div>

          {/* Lọc Khu Trọ */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            <button
              onClick={() => setSelectedZoneId('')}
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
                border: 'none', cursor: 'pointer',
                background: !selectedZoneId ? '#f59e0b' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)'),
                color: !selectedZoneId ? '#fff' : (isLight ? '#475569' : '#cbd5e1')
              }}
            >
              Tất cả khu ({rooms.length} phòng)
            </button>
            {zones.map(z => (
              <button
                key={z.id}
                onClick={() => setSelectedZoneId(z.id)}
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
                  border: 'none', cursor: 'pointer',
                  background: selectedZoneId === z.id ? '#f59e0b' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)'),
                  color: selectedZoneId === z.id ? '#fff' : (isLight ? '#475569' : '#cbd5e1')
                }}
              >
                {z.name}
              </button>
            ))}
          </div>

          {/* Danh Sách Phòng Kèm Số Công Tơ Hiện Tại */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredRooms.map(r => (
              <div
                key={r.id}
                style={{
                  background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                  border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 14, padding: '12px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>
                    Phòng {r.roomNumber}
                  </div>
                  <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 2 }}>
                    ⚡ Điện cũ: <strong>{r.elecMeter || 0} kWh</strong> • 💧 Nước cũ: <strong>{r.waterMeter || 0} m³</strong>
                  </div>
                </div>
                <button
                  onClick={() => setSubView('record_utility')}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '8px 12px', fontSize: '12px', fontWeight: 800,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  <Zap size={14} /> Ghi Số
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ────────────── TAB 3: HÓA ĐƠN & THU TIỀN ────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'invoices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Sub Tab Switcher */}
          <div style={{ display: 'flex', background: isLight ? '#f1f5f9' : 'rgba(15,23,42,0.8)', padding: 3, borderRadius: 12, border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}` }}>
            <button
              onClick={() => setInvoiceSubTab('invoices')}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 10, fontSize: '12px', fontWeight: 800,
                border: 'none', cursor: 'pointer',
                background: invoiceSubTab === 'invoices' ? '#10b981' : 'transparent',
                color: invoiceSubTab === 'invoices' ? '#fff' : (isLight ? '#64748b' : '#94a3b8')
              }}
            >
              🧾 Hóa Đơn ({invoices.length})
            </button>
            <button
              onClick={() => setSubView('review_vietqr')}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 10, fontSize: '12px', fontWeight: 800,
                border: 'none', cursor: 'pointer',
                background: invoiceSubTab === 'payments' ? '#6366f1' : 'transparent',
                color: invoiceSubTab === 'payments' ? '#fff' : (isLight ? '#64748b' : '#94a3b8')
              }}
            >
              💳 Duyệt VietQR ({paymentsList.filter(p => (p.status || '').toLowerCase() === 'pendingapproval' || (p.status || '').toLowerCase() === 'pending').length})
            </button>
          </div>

          {/* SUB-TAB 1: HÓA ĐƠN TIỀN NHÀ */}
          {invoiceSubTab === 'invoices' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 700 }}>
                  Chưa thu: {invoices.filter(i => (i.status || '').toLowerCase() !== 'paid').length} hóa đơn
                </span>
                <button
                  onClick={() => setSubView('create_invoice')}
                  style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={14} /> Lập Hóa Đơn Mới
                </button>
              </div>

              {invoices.map(inv => (
                <div
                  key={inv.id}
                  style={{
                    background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                    border: `1px solid ${inv.status === 'Paid' ? (isLight ? '#bbf7d0' : 'rgba(16,185,129,0.3)') : (isLight ? '#fca5a5' : 'rgba(239,68,68,0.35)')}`,
                    borderRadius: 14, padding: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>
                        Phòng {inv.roomNumber || 'Phòng'} • {inv.month ? `Tháng ${inv.month}/${inv.year}` : inv.invoiceCode}
                      </div>
                      <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 2 }}>
                        Khách: <strong>{inv.tenantName || 'Người thuê'}</strong> • Hạn: {formatDate(inv.dueDate || inv.createdAt)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '16px', color: inv.status === 'Paid' ? '#10b981' : '#ef4444' }}>
                        {formatVND(inv.totalAmount)}
                      </div>
                      <span style={{
                        fontSize: '10px', fontWeight: 800,
                        padding: '2px 6px', borderRadius: 4,
                        background: inv.status === 'Paid' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: inv.status === 'Paid' ? '#10b981' : '#ef4444'
                      }}>
                        {inv.status === 'Paid' ? '✅ Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                    </div>
                  </div>

                  {/* Thao tác với hóa đơn */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)'}` }}>
                    <button
                      onClick={() => { setSelectedInvoice(inv); setActiveSheet('invoice_detail'); }}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)', border: 'none', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', color: isLight ? '#334155' : '#cbd5e1' }}
                    >
                      Chi tiết
                    </button>
                    {inv.status !== 'Paid' ? (
                      <button
                        onClick={async () => {
                          if (window.confirm('Xác nhận khách đã nộp đủ tiền mặt cho hóa đơn này?')) {
                            try {
                              await invoiceService.updateStatus(inv.id, 'Paid');
                              alert('✅ Đã cập nhật hóa đơn sang Đã Thanh Toán!');
                              onRefresh?.();
                            } catch (e) {
                              alert('Lỗi: ' + e.message);
                            }
                          }
                        }}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Thu tiền mặt
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          if (window.confirm('Chuyển lại trạng thái Chưa Thanh Toán?')) {
                            try {
                              await invoiceService.updateStatus(inv.id, 'Unpaid');
                              onRefresh?.();
                            } catch (e) { alert('Lỗi: ' + e.message); }
                          }
                        }}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Hủy thu
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* SUB-TAB 2: DUYỆT THANH TOÁN VIETQR */}
          {invoiceSubTab === 'payments' && (
            <>
              <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 700 }}>
                Các giao dịch chuyển khoản khách thuê đã gửi minh chứng:
              </div>

              {paymentsList.map(p => (
                <div
                  key={p.id}
                  style={{
                    background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 14, padding: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px' }}>
                        Phòng {p.roomNumber || 'P.101'} • {formatVND(p.amount)}
                      </div>
                      <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 2 }}>
                        Phương thức: <strong>{p.paymentMethod || 'VietQR'}</strong> • {formatDateTime(p.createdAt)}
                      </div>
                      {p.notes && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: 2 }}>
                          Ghi chú: {p.notes}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                      background: p.status === 'Completed' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: p.status === 'Completed' ? '#10b981' : '#ef4444'
                    }}>
                      {p.status === 'Completed' ? '✅ Đã duyệt' : '⏳ Chờ duyệt'}
                    </span>
                  </div>

                  {/* Ảnh Minh Chứng Chuyển Khoản Nếu Có */}
                  {(p.proofImageUrl || p.proofUrl) && (
                    <div style={{ margin: '10px 0' }}>
                      <img
                        src={getImageUrl(p.proofImageUrl || p.proofUrl)}
                        alt="Biên lai ngân hàng"
                        style={{ width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: 8, border: '1px solid #10b981' }}
                      />
                    </div>
                  )}

                  {/* Nút Phê Duyệt / Từ Chối */}
                  {(p.status === 'PendingApproval' || p.status === 'Pending') && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => handleConfirmPayment(p.id, false)}
                        style={{ padding: '8px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        ❌ Từ chối
                      </button>
                      <button
                        onClick={() => handleConfirmPayment(p.id, true)}
                        style={{ padding: '8px', borderRadius: 8, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        ✅ Duyệt nhận tiền
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {paymentsList.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: isLight ? '#64748b' : '#94a3b8' }}>
                  Chưa có giao dịch chuyển khoản nào
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ────────────── TAB 4: PHÒNG & KHU TRỌ (ROOMS) ───────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'rooms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={18} color="#3b82f6" /> Danh Sách Phòng Trọ
            </h3>
            <button
              onClick={() => setSubView('create_room')}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Plus size={14} /> Thêm Phòng
            </button>
          </div>

          {/* Ô Tìm Kiếm Phòng */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', top: 10, left: 10, color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm theo số phòng (ví dụ: 101, 202)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px 8px 32px', borderRadius: 10,
                background: isLight ? '#ffffff' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                fontSize: '12.5px', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Danh Sách Phòng Chi Tiết */}
          {filteredRooms.map(r => (
            <div
              key={r.id}
              onClick={() => { setSelectedRoom(r); setActiveSheet('room_detail'); }}
              style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 14, padding: '14px', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Phòng {r.roomNumber}
                  <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>({r.zoneName || 'Khu trọ'})</span>
                </div>
                <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 2 }}>
                  Giá: <strong>{formatVND(r.price)}</strong> • Tối đa: {r.maxRenters || 2} người
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                  background: r.status === 'Occupied' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                  color: r.status === 'Occupied' ? '#10b981' : '#3b82f6'
                }}>
                  {r.status === 'Occupied' ? 'Đang thuê' : 'Còn trống'}
                </span>
                <ChevronRight size={16} color="#94a3b8" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ────────────── TAB 5: KHÁCH & HỢP ĐỒNG ─────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'tenants_contracts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Sub Tab Switcher */}
          <div style={{ display: 'flex', background: isLight ? '#f1f5f9' : 'rgba(15,23,42,0.8)', padding: 3, borderRadius: 12, border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}` }}>
            <button
              onClick={() => setTenantSubTab('tenants')}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 10, fontSize: '12px', fontWeight: 800,
                border: 'none', cursor: 'pointer',
                background: tenantSubTab === 'tenants' ? '#ec4899' : 'transparent',
                color: tenantSubTab === 'tenants' ? '#fff' : (isLight ? '#64748b' : '#94a3b8')
              }}
            >
              👥 Danh Bạ Khách ({tenantsList.length})
            </button>
            <button
              onClick={() => setTenantSubTab('contracts')}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 10, fontSize: '12px', fontWeight: 800,
                border: 'none', cursor: 'pointer',
                background: tenantSubTab === 'contracts' ? '#6366f1' : 'transparent',
                color: tenantSubTab === 'contracts' ? '#fff' : (isLight ? '#64748b' : '#94a3b8')
              }}
            >
              📜 Hợp Đồng ({contractsList.length})
            </button>
          </div>

          {/* SUB-TAB: KHÁCH THUÊ */}
          {tenantSubTab === 'tenants' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 700 }}>
                  Tổng cộng: {tenantsList.length} cư dân
                </span>
                <button
                  onClick={() => setSubView('create_tenant')}
                  style={{ background: '#ec4899', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={14} /> Thêm Khách
                </button>
              </div>

              {tenantsList.map(t => (
                <div
                  key={t.id}
                  style={{
                    background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 14, padding: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>
                        {t.fullName || t.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 2 }}>
                        📞 {t.phone || 'Chưa có SĐT'} • Phòng: <strong>{t.roomNumber || 'Chưa gán'}</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6366f1', marginTop: 2 }}>
                        CCCD: {t.cccd || 'Chưa cập nhật'} • Quê: {t.hometown || 'Chưa cập nhật'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleResetPassword(t.id)}
                      style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899', border: 'none', borderRadius: 8, padding: '5px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      title="Đặt lại mật khẩu cho khách"
                    >
                      <KeyRound size={13} /> Reset MK
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* SUB-TAB: HỢP ĐỒNG */}
          {tenantSubTab === 'contracts' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 700 }}>
                  Tổng cộng: {contractsList.length} hợp đồng
                </span>
                <button
                  onClick={() => setActiveSheet('create_contract')}
                  style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={14} /> Tạo Hợp Đồng
                </button>
              </div>

              {contractsList.map(c => (
                <div
                  key={c.id}
                  style={{
                    background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 14, padding: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14.5px' }}>
                        {c.contractCode || 'HĐ-THUE'} • Phòng {c.roomNumber}
                      </div>
                      <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 2 }}>
                        Khách: <strong>{c.tenantName || 'Cư dân'}</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: '#10b981', marginTop: 2 }}>
                        Thời hạn: {formatDate(c.startDate)} → {formatDate(c.endDate)}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                      background: c.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: c.status === 'Active' ? '#10b981' : '#f59e0b'
                    }}>
                      {c.status === 'Active' ? 'Hiệu lực' : c.status}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ────────────── TAB 6: KHÁC (BẢO TRÌ & CÀI ĐẶT) ───────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'more' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Cài Đặt Tài Khoản Nhận Tiền VietQR */}
          <div style={{
            background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(99,102,241,0.3)'}`,
            borderRadius: '16px', padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CreditCard size={16} color="#6366f1" /> Tài Khoản Ngân Hàng VietQR
              </div>
              <button
                onClick={() => setActiveSheet('bank_settings')}
                style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cập nhật
              </button>
            </div>
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>Ngân hàng: <strong>{profile?.bankName || 'Chưa thiết lập'}</strong></div>
              <div>Số tài khoản: <strong>{profile?.bankAccountNumber || 'Chưa thiết lập'}</strong></div>
              <div>Chủ tài khoản: <strong>{profile?.bankAccountName || 'Chưa thiết lập'}</strong></div>
            </div>
          </div>

          {/* Xử Lý Báo Hỏng Thiết Bị */}
          <div style={{
            background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
            border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '16px', padding: '16px'
          }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wrench size={16} color="#f59e0b" /> Quản Lý Phiếu Bảo Trì Sửa Chữa
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {maintenanceRequests.map(req => (
                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)'}` }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{req.title}</div>
                    <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      Phòng {req.roomNumber} • {req.status === 'Completed' ? '✅ Đã xong' : '⏳ Cần xử lý'}
                    </div>
                  </div>
                  {req.status !== 'Completed' && (
                    <button
                      onClick={() => handleUpdateMaintenance(req.id, 'Completed')}
                      style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Xong
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ────────────── BOTTOM NAV BAR CHUYÊN BIỆT CHỦ TRỌ ───────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 520,
        background: isLight ? 'rgba(255,255,255,0.96)' : 'rgba(11,17,32,0.96)',
        backdropFilter: 'blur(16px)',
        borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        padding: '8px 2px 14px', zIndex: 90
      }}>
        {[
          { id: 'home', label: 'Tổng quan', icon: Home },
          { id: 'utilities', label: 'Điện Nước', icon: Zap },
          { id: 'invoices', label: 'Hóa đơn', icon: Receipt },
          { id: 'rooms', label: 'Phòng trọ', icon: Building2 },
          { id: 'tenants_contracts', label: 'Cư dân', icon: Users }
        ].map(tab => {
          const Icon = tab.icon;
          const isAct = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent', border: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                cursor: 'pointer', color: isAct ? '#6366f1' : (isLight ? '#64748b' : '#94a3b8'),
                position: 'relative', padding: '4px 0'
              }}
            >
              <Icon size={19} />
              <span style={{ fontSize: '10px', fontWeight: isAct ? 800 : 600 }}>{tab.label}</span>
              {isAct && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#6366f1', position: 'absolute', bottom: 0 }} />}
            </button>
          );
        })}
      </nav>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ────────────── BOTTOM SHEET MODALS ─────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeSheet && (
        <div
          onClick={() => setActiveSheet(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)', zIndex: 9999,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: isLight ? '#ffffff' : '#111827',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
              borderBottom: 'none', padding: '16px 20px 24px',
              maxHeight: '90%', overflowY: 'auto',
              width: '100%', maxWidth: 520, margin: '0 auto', boxSizing: 'border-box'
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: isLight ? '#cbd5e1' : '#4b5563', margin: '0 auto 14px' }} />

            {/* MODAL 1: CHỐT ĐIỆN NƯỚC TỪNG PHÒNG */}
            {activeSheet === 'record_utility' && (
              <form onSubmit={handleSaveUtility} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>⚡ Chốt Số Điện Nước Phòng</h3>
                  <button type="button" onClick={() => setActiveSheet(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Chọn phòng:</label>
                  <select
                    value={recordForm.roomId}
                    onChange={e => {
                      const r = rooms.find(room => room.id === e.target.value);
                      setRecordForm({
                        ...recordForm,
                        roomId: e.target.value,
                        newElec: (r?.elecMeter || 0) + 15,
                        newWater: (r?.waterMeter || 0) + 2
                      });
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}` }}
                  >
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>Phòng {r.roomNumber} ({r.zoneName})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Số điện mới (kWh):</label>
                    <input
                      type="number"
                      value={recordForm.newElec}
                      onChange={e => setRecordForm({ ...recordForm, newElec: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Số nước mới (m³):</label>
                    <input
                      type="number"
                      value={recordForm.newWater}
                      onChange={e => setRecordForm({ ...recordForm, newWater: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, background: '#f59e0b', color: '#fff', border: 'none', fontWeight: 800, fontSize: '14px', cursor: 'pointer', marginTop: 6 }}
                >
                  {actionLoading ? 'Đang lưu...' : 'Lưu Số & Tự Xuất Hóa Đơn'}
                </button>
              </form>
            )}

            {/* MODAL 2: CÀI ĐẶT BẢNG GIÁ ĐIỆN NƯỚC */}
            {activeSheet === 'utility_rates' && (
              <form onSubmit={handleSaveRates} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>⚙️ Cài Đặt Giá Điện & Nước</h3>
                  <button type="button" onClick={() => setActiveSheet(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Giá điện (VNĐ/kWh):</label>
                  <input
                    type="number"
                    value={rateForm.electricityRate}
                    onChange={e => setRateForm({ ...rateForm, electricityRate: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Giá nước (VNĐ/m³):</label>
                  <input
                    type="number"
                    value={rateForm.waterRate}
                    onChange={e => setRateForm({ ...rateForm, waterRate: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 800, fontSize: '14px', cursor: 'pointer', marginTop: 6 }}
                >
                  {actionLoading ? 'Đang lưu...' : 'Lưu Bảng Giá'}
                </button>
              </form>
            )}

            {/* MODAL 3: THÊM PHÒNG MỚI */}
            {activeSheet === 'create_room' && (
              <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>🏠 Thêm Phòng Trọ Mới</h3>
                  <button type="button" onClick={() => setActiveSheet(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Khu trọ:</label>
                  <select
                    value={roomForm.zoneId}
                    onChange={e => setRoomForm({ ...roomForm, zoneId: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}` }}
                  >
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Số phòng:</label>
                    <input
                      type="text" placeholder="Ví dụ: P.205"
                      value={roomForm.roomNumber} onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Giá thuê (đ/tháng):</label>
                    <input
                      type="number" value={roomForm.price} onChange={e => setRoomForm({ ...roomForm, price: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={actionLoading}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 800, fontSize: '14px', cursor: 'pointer', marginTop: 6 }}
                >
                  {actionLoading ? 'Đang tạo...' : 'Tạo Phòng Trọ'}
                </button>
              </form>
            )}

            {/* MODAL 4: LẬP HÓA ĐƠN TIỀN NHÀ */}
            {activeSheet === 'create_invoice' && (
              <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>🧾 Lập Hóa Đơn Tiền Nhà</h3>
                  <button type="button" onClick={() => setActiveSheet(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Chọn phòng:</label>
                  <select
                    value={invoiceForm.roomId}
                    onChange={e => setInvoiceForm({ ...invoiceForm, roomId: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}` }}
                  >
                    {rooms.map(r => <option key={r.id} value={r.id}>Phòng {r.roomNumber} ({formatVND(r.price)})</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Tiền phòng (VNĐ):</label>
                    <input
                      type="number" value={invoiceForm.rentAmount} onChange={e => setInvoiceForm({ ...invoiceForm, rentAmount: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Tiền dịch vụ (VNĐ):</label>
                    <input
                      type="number" value={invoiceForm.servicesCost} onChange={e => setInvoiceForm({ ...invoiceForm, servicesCost: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={actionLoading}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, background: '#10b981', color: '#fff', border: 'none', fontWeight: 800, fontSize: '14px', cursor: 'pointer', marginTop: 6 }}
                >
                  {actionLoading ? 'Đang xuất hóa đơn...' : 'Xuất Hóa Đơn'}
                </button>
              </form>
            )}

            {/* MODAL 5: THÊM KHÁCH THUÊ MỚI */}
            {activeSheet === 'create_tenant' && (
              <form onSubmit={handleCreateTenant} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>👥 Thêm Cư Dân Mới</h3>
                  <button type="button" onClick={() => setActiveSheet(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Họ và tên:</label>
                  <input
                    type="text" placeholder="Nguyễn Văn A"
                    value={tenantForm.fullName} onChange={e => setTenantForm({ ...tenantForm, fullName: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Số điện thoại:</label>
                    <input
                      type="text" placeholder="0987..."
                      value={tenantForm.phone} onChange={e => setTenantForm({ ...tenantForm, phone: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Phòng ở:</label>
                    <select
                      value={tenantForm.roomId} onChange={e => setTenantForm({ ...tenantForm, roomId: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}` }}
                    >
                      <option value="">Chưa gán phòng</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>Phòng {r.roomNumber}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  type="submit" disabled={actionLoading}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, background: '#ec4899', color: '#fff', border: 'none', fontWeight: 800, fontSize: '14px', cursor: 'pointer', marginTop: 6 }}
                >
                  {actionLoading ? 'Đang tạo...' : 'Tạo Khách Thuê & Cấp Mật Khẩu'}
                </button>
              </form>
            )}

            {/* MODAL 6: CÀI ĐẶT NGÂN HÀNG VIETQR */}
            {activeSheet === 'bank_settings' && (
              <form onSubmit={handleSaveBank} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>💳 Cài Đặt Ngân Hàng Nhận Tiền VietQR</h3>
                  <button type="button" onClick={() => setActiveSheet(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Ngân hàng:</label>
                  <select
                    value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}` }}
                  >
                    {VIETNAM_BANKS.map(b => <option key={b.code} value={b.code}>{b.shortName} - {b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Số tài khoản nhận tiền:</label>
                  <input
                    type="text" value={bankForm.bankAccountNumber} onChange={e => setBankForm({ ...bankForm, bankAccountNumber: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Tên chủ tài khoản:</label>
                  <input
                    type="text" value={bankForm.bankAccountName} onChange={e => setBankForm({ ...bankForm, bankAccountName: e.target.value.toUpperCase() })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <button
                  type="submit" disabled={actionLoading}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 800, fontSize: '14px', cursor: 'pointer', marginTop: 6 }}
                >
                  {actionLoading ? 'Đang lưu...' : 'Lưu Cài Đặt Ngân Hàng'}
                </button>
              </form>
            )}

            {/* MODAL 7: SOẠN THÔNG BÁO GỬI CƯ DÂN */}
            {activeSheet === 'send_notify' && (
              <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>📢 Gửi Thông Báo Đến Cư Dân</h3>
                  <button type="button" onClick={() => setActiveSheet(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Gửi đến:</label>
                  <select
                    value={notifyForm.roomId} onChange={e => setNotifyForm({ ...notifyForm, roomId: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}` }}
                  >
                    <option value="">Toàn bộ cư dân trong khu trọ</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>Chỉ gửi Phòng {r.roomNumber}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Tiêu đề thông báo:</label>
                  <input
                    type="text" placeholder="Ví dụ: Tạm cúp nước sáng mai từ 8h..."
                    value={notifyForm.title} onChange={e => setNotifyForm({ ...notifyForm, title: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Nội dung chi tiết:</label>
                  <textarea
                    rows={4} placeholder="Nội dung cụ thể..."
                    value={notifyForm.content} onChange={e => setNotifyForm({ ...notifyForm, content: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, boxSizing: 'border-box', resize: 'none' }}
                    required
                  />
                </div>
                <button
                  type="submit" disabled={actionLoading}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, background: '#8b5cf6', color: '#fff', border: 'none', fontWeight: 800, fontSize: '14px', cursor: 'pointer', marginTop: 6 }}
                >
                  {actionLoading ? 'Đang phát thông báo...' : 'Gửi Thông Báo Ngay'}
                </button>
              </form>
            )}

            {/* MODAL 8: CHI TIẾT PHÒNG */}
            {activeSheet === 'room_detail' && selectedRoom && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>🏠 Chi Tiết Phòng {selectedRoom.roomNumber}</h3>
                  <button onClick={() => setActiveSheet(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)', padding: 12, borderRadius: 12, fontSize: '13px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div>Khu: <strong>{selectedRoom.zoneName}</strong></div>
                  <div>Giá thuê: <strong style={{ color: '#10b981' }}>{formatVND(selectedRoom.price)}/tháng</strong></div>
                  <div>Trạng thái: <strong>{selectedRoom.status === 'Occupied' ? 'Đang thuê' : 'Còn trống'}</strong></div>
                  <div>Đồng hồ điện hiện tại: <strong>{selectedRoom.elecMeter || 0} kWh</strong></div>
                  <div>Đồng hồ nước hiện tại: <strong>{selectedRoom.waterMeter || 0} m³</strong></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    onClick={() => {
                      setActiveSheet(null);
                      setSubView('record_utility');
                    }}
                    style={{ padding: '10px', borderRadius: 8, background: '#f59e0b', color: '#fff', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                  >
                    ⚡ Chốt điện nước
                  </button>
                  <button
                    onClick={async () => {
                      const newStatus = selectedRoom.status === 'Occupied' ? 'Vacant' : 'Occupied';
                      if (window.confirm(`Đổi trạng thái phòng thành: ${newStatus === 'Occupied' ? 'Đang thuê' : 'Còn trống'}?`)) {
                        try {
                          await roomService.updateRoom(selectedRoom.id, { ...selectedRoom, status: newStatus });
                          alert('✅ Đã đổi trạng thái phòng!');
                          setActiveSheet(null);
                          onRefresh?.();
                        } catch (e) { alert('Lỗi: ' + e.message); }
                      }
                    }}
                    style={{ padding: '10px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                  >
                    Đổi trạng thái
                  </button>
                </div>
              </div>
            )}

            {/* MODAL 9: CHI TIẾT HÓA ĐƠN */}
            {activeSheet === 'invoice_detail' && selectedInvoice && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>🧾 Hóa Đơn {selectedInvoice.invoiceCode}</h3>
                  <button onClick={() => setActiveSheet(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)', padding: 14, borderRadius: 12, fontSize: '13px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Phòng:</span> <strong>Phòng {selectedInvoice.roomNumber}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Khách thuê:</span> <strong>{selectedInvoice.tenantName || 'Người thuê'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tiền phòng:</span> <strong>{formatVND(selectedInvoice.rentAmount || selectedInvoice.roomPrice || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tiền điện ({selectedInvoice.electricityUsage || 0} kWh):</span> <strong>{formatVND(selectedInvoice.electricityCost || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tiền nước ({selectedInvoice.waterUsage || 0} m³):</span> <strong>{formatVND(selectedInvoice.waterCost || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Dịch vụ:</span> <strong>{formatVND(selectedInvoice.servicesCost || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px dashed #cbd5e1', fontSize: '15px' }}>
                    <strong>Tổng cộng:</strong> <strong style={{ color: '#ef4444' }}>{formatVND(selectedInvoice.totalAmount)}</strong>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
