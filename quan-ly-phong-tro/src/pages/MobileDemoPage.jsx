import React, { useState, useEffect } from 'react';
import {
  Home, Receipt, FileText, Wrench, User, Bell, Sun, Moon,
  QrCode, PhoneCall, ShieldCheck, CheckCircle2, Clock, AlertTriangle,
  ChevronRight, ArrowLeft, Camera, ExternalLink, Sparkles, Smartphone,
  Monitor, Info, Building2, Zap, Send, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MobileDemoPage() {
  const navigate = useNavigate();

  // Chế độ xem: 'frame' (khung điện thoại trên PC) hoặc 'full' (toàn màn hình)
  const [viewMode, setViewMode] = useState('frame');
  // Vai trò demo: 'tenant' (Khách thuê) hoặc 'landlord' (Chủ trọ)
  const [role, setRole] = useState('tenant');
  // Tab hiện tại trên thanh điều hướng đáy
  const [activeTab, setActiveTab] = useState('home');
  // Theme sáng / tối
  const [isLight, setIsLight] = useState(false);
  // Modal Bottom Sheet
  const [bottomSheet, setBottomSheet] = useState(null); // 'qr_pay' | 'repair' | null
  const [repairSent, setRepairSent] = useState(false);

  // Tự động nhận diện thiết bị: nếu màn hình nhỏ < 768px thì mặc định toàn màn hình
  useEffect(() => {
    if (window.innerWidth < 768) {
      setViewMode('full');
    }
  }, []);

  const toggleTheme = () => {
    setIsLight(!isLight);
    document.body.classList.toggle('light-mode', !isLight);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: viewMode === 'frame'
        ? (isLight ? '#e2e8f0' : '#040711')
        : (isLight ? '#f8fafc' : '#090d16'),
      color: isLight ? '#0f172a' : '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: viewMode === 'frame' ? '24px 16px' : 0,
      transition: 'all 0.3s ease'
    }}>

      {/* ── BAR ĐIỀU KHIỂN DEMO TRÊN MÁY TÍNH (Top Toolbar) ── */}
      {viewMode === 'frame' && (
        <div style={{
          width: '100%',
          maxWidth: 820,
          background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(17,24,39,0.85)',
          border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.12)'}`,
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          padding: '12px 20px',
          marginBottom: '20px',
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
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={15} /> Quay lại
            </button>
            <div style={{ fontWeight: 800, fontSize: '15px', color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Smartphone size={18} /> SMARTRENT MOBILE DEMO
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Chuyển Role */}
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

            {/* Chuyển chế độ xem */}
            <button
              onClick={() => setViewMode(viewMode === 'frame' ? 'full' : 'frame')}
              className="btn btn-sm btn-secondary"
              style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Phóng to toàn màn hình hoặc xem trong khung điện thoại"
            >
              {viewMode === 'frame' ? <><Monitor size={14} /> Toàn Màn Hình</> : <><Smartphone size={14} /> Khung ĐT</>}
            </button>
          </div>
        </div>
      )}

      {/* ── THÂN MÁY ĐIỆN THOẠI (iPhone Mockup / Mobile Container) ── */}
      <div style={{
        width: viewMode === 'frame' ? '390px' : '100%',
        maxWidth: viewMode === 'frame' ? '390px' : '520px',
        height: viewMode === 'frame' ? '810px' : '100vh',
        background: isLight ? '#ffffff' : '#0b1120',
        borderRadius: viewMode === 'frame' ? '46px' : 0,
        border: viewMode === 'frame' ? (isLight ? '10px solid #1e293b' : '10px solid #1f2937') : 'none',
        boxShadow: viewMode === 'frame' ? '0 25px 60px -15px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)' : 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>

        {/* Dynamic Island / Notch giả lập trên khung điện thoại */}
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
          padding: viewMode === 'frame' ? '38px 18px 12px' : '16px 18px 12px',
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
              color: '#fff', fontWeight: 800, fontSize: 16
            }}>
              SR
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: isLight ? '#0f172a' : '#fff', lineHeight: 1.2 }}>
                SmartRent
              </div>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                {role === 'tenant' ? 'Khu Vực Khách Thuê' : 'Chủ Khu Trọ'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Nút đổi theme */}
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
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Chuông thông báo */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                color: isLight ? '#0f172a' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Bell size={16} />
              </div>
              <span style={{
                position: 'absolute', top: -2, right: -2,
                background: '#ef4444', color: '#fff', fontSize: '9px',
                fontWeight: 800, width: 16, height: 16, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                2
              </span>
            </div>

            {/* Avatar */}
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
              alt="Avatar"
              style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #10b981', objectFit: 'cover' }}
            />
          </div>
        </header>

        {/* ── 2. NỘI DUNG CHÍNH (Cuộn Độc Lập) ── */}
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

          {/* ═══════════ TAB 1: TRANG CHỦ (HOME) ═══════════ */}
          {activeTab === 'home' && (
            <>
              {/* Card Thông Tin Phòng Của Tôi */}
              <div style={{
                background: isLight
                  ? 'linear-gradient(135deg, #ffffff, #f0fdf4)'
                  : 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(15,23,42,0.9))',
                border: `1px solid ${isLight ? '#bbf7d0' : 'rgba(16,185,129,0.3)'}`,
                borderRadius: '18px',
                padding: '18px',
                boxShadow: isLight ? '0 4px 18px rgba(16,185,129,0.08)' : '0 8px 24px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{
                      fontSize: '11px', fontWeight: 800, textTransform: 'uppercase',
                      color: '#10b981', background: 'rgba(16,185,129,0.15)',
                      padding: '3px 8px', borderRadius: '6px'
                    }}>
                      {role === 'tenant' ? 'Phòng Đang Thuê' : 'Khu Trọ Đang Quản Lý'}
                    </span>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '8px 0 2px', color: isLight ? '#0f172a' : '#fff' }}>
                      {role === 'tenant' ? 'Phòng P.202' : 'SmartRent Gigamall'}
                    </h2>
                    <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      {role === 'tenant' ? 'Khu Trọ Gigamall Thủ Đức • Tầng 2' : 'Tổng 16 phòng • 14 đã thuê (88%)'}
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
                    <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Tiền phòng kỳ này</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#ef4444', marginTop: 2 }}>
                      3,450,000 đ
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Hạn thanh toán</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginTop: 2 }}>
                      ⏳ 10/11/2026
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setBottomSheet('qr_pay')}
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
              </div>

              {/* 4 Nút Tác Vụ Nhanh (Quick Actions) */}
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: isLight ? '#475569' : '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ⚡ Thao Tác Nhanh
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Thanh toán', icon: QrCode, color: '#10b981', action: () => setBottomSheet('qr_pay') },
                    { label: 'Báo sửa', icon: Wrench, color: '#f59e0b', action: () => setBottomSheet('repair') },
                    { label: 'Hợp đồng', icon: FileText, color: '#6366f1', action: () => setActiveTab('contracts') },
                    { label: 'Chủ trọ', icon: PhoneCall, color: '#3b82f6', action: () => alert('📞 Đang gọi Chủ trọ: 0912.345.678') }
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

              {/* Chỉ Số Điện Nước Tháng Này */}
              <div style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '16px',
                padding: '16px',
                boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.03)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={16} color="#f59e0b" /> Chỉ Số Điện & Nước (Tháng 10)
                  </div>
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>Đã chốt số</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: '12px', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)'}` }}>
                    <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>⚡ Điện (3.500đ/kWh)</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>142 kWh</div>
                    <div style={{ fontSize: '11px', color: isLight ? '#94a3b8' : '#64748b', marginTop: 2 }}>Số cũ: 1120 → mới: 1262</div>
                  </div>
                  <div style={{ background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: '12px', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)'}` }}>
                    <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>💧 Nước (20.000đ/m³)</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#06b6d4', marginTop: 2 }}>6 m³</div>
                    <div style={{ fontSize: '11px', color: isLight ? '#94a3b8' : '#64748b', marginTop: 2 }}>Số cũ: 84 → mới: 90</div>
                  </div>
                </div>
              </div>

              {/* Thông Báo Mới Từ Chủ Trọ */}
              <div style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '16px',
                padding: '16px',
                boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.03)' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <AlertTriangle size={18} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: isLight ? '#0f172a' : '#fff' }}>
                      Bảo trì hệ thống thang máy
                    </div>
                    <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 2 }}>
                      Từ 8h00 - 11h00 sáng mai (15/10). Vui lòng sử dụng thang bộ.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══════════ TAB 2: HÓA ĐƠN & THANH TOÁN (INVOICES) ═══════════ */}
          {activeTab === 'invoices' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Hóa Đơn Của Tôi</h3>
                <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>1 hóa đơn cần trả</span>
              </div>

              {/* Thẻ Hóa đơn Tháng 10 (Chưa trả) */}
              <div style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                border: `1.5px solid ${isLight ? '#fca5a5' : 'rgba(239,68,68,0.4)'}`,
                borderRadius: '16px', padding: '16px',
                boxShadow: isLight ? '0 4px 14px rgba(239,68,68,0.06)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: 4 }}>
                      Chưa thanh toán
                    </span>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '8px 0 2px' }}>
                      Hóa đơn tháng 10/2026
                    </h4>
                    <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      Mã: HD-202610-P202 • Hạn: 10/11/2026
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444' }}>
                    3,450,000 đ
                  </div>
                </div>

                <div style={{ margin: '14px 0', padding: '10px 12px', background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)', borderRadius: 10, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền phòng</span>
                    <strong>2,800,000 đ</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền điện (142 kWh)</span>
                    <strong>497,000 đ</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền nước (6 m³)</span>
                    <strong>120,000 đ</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Dịch vụ & Wifi</span>
                    <strong>33,000 đ</strong>
                  </div>
                </div>

                <button
                  onClick={() => setBottomSheet('qr_pay')}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff', border: 'none', borderRadius: '10px',
                    padding: '10px', fontWeight: 800, fontSize: '13px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6
                  }}
                >
                  <QrCode size={16} /> Thanh Toán Ngay Bằng QR
                </button>
              </div>

              {/* Thẻ Hóa đơn Tháng 9 (Đã thanh toán) */}
              <div style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '16px', padding: '16px', opacity: 0.85
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: 4 }}>
                      ✅ Đã thanh toán
                    </span>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '8px 0 2px' }}>
                      Hóa đơn tháng 09/2026
                    </h4>
                    <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      Thanh toán ngày 05/09/2026
                    </div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981' }}>
                    3,380,000 đ
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ TAB 3: HỢP ĐỒNG Ở GHÉP & KÝ SỐ (CONTRACTS) ═══════════ */}
          {activeTab === 'contracts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Hợp Đồng Của Tôi</h3>
                <span style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 700 }}>Đang hiệu lực</span>
              </div>

              {/* Card HĐ Phụ lục Ở ghép */}
              <div style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(99,102,241,0.3)'}`,
                borderRadius: '16px', padding: '18px',
                boxShadow: isLight ? '0 4px 14px rgba(0,0,0,0.04)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 800, background: 'rgba(99,102,241,0.15)',
                    color: '#6366f1', padding: '3px 8px', borderRadius: 6
                  }}>
                    👥 Phụ lục HĐ Ở Ghép
                  </span>
                  <span style={{
                    fontSize: '11px', fontWeight: 800, background: 'rgba(16,185,129,0.15)',
                    color: '#10b981', padding: '3px 8px', borderRadius: 6
                  }}>
                    ✍️ Đã ký xác nhận
                  </span>
                </div>

                <h4 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px' }}>
                  HĐ-OG-P202-01
                </h4>
                <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8', marginBottom: 14 }}>
                  Thuộc HĐ chính: <strong style={{ color: isLight ? '#0f172a' : '#fff' }}>HD-2026-P202</strong> (Đại diện: Trần Văn A)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: '12px', fontSize: '12px' }}>
                  <div>
                    <div style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền cọc riêng</div>
                    <strong style={{ color: '#10b981', fontSize: '14px' }}>1,500,000 đ</strong>
                  </div>
                  <div>
                    <div style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Chia sẻ tiền phòng</div>
                    <strong style={{ fontSize: '14px' }}>1,400,000 đ/th</strong>
                  </div>
                  <div>
                    <div style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Thời hạn</div>
                    <strong>01/08/26 → 01/08/27</strong>
                  </div>
                  <div>
                    <div style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Ký điện tử</div>
                    <strong style={{ color: '#10b981' }}>01/08/2026</strong>
                  </div>
                </div>

                <div style={{ marginTop: 14, fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', lineHeight: 1.5, background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: 10 }}>
                  ⚖️ <strong>Cam kết cư trú:</strong> Chấp hành nghiêm chỉnh nội quy an ninh, PCCC, không gây mất trật tự và hoàn trả hiện trạng phòng khi chuyển đi.
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ TAB 4: HỒ SƠ CÁ NHÂN (PROFILE) ═══════════ */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Profile Card Header */}
              <div style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '16px', padding: '18px', textAlign: 'center',
                boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.03)' : 'none'
              }}>
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120"
                  alt="Avatar"
                  style={{ width: 68, height: 68, borderRadius: '50%', border: '3px solid #10b981', margin: '0 auto 8px', objectFit: 'cover' }}
                />
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 2px' }}>Nguyễn Văn Minh</h3>
                <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>minh.nguyen@smartrent.vn • 0987.654.321</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '3px 10px', borderRadius: 20, fontSize: '11px', fontWeight: 700, marginTop: 8 }}>
                  <ShieldCheck size={13} /> Đã xác thực CCCD
                </div>
              </div>

              {/* Thông tin chi tiết */}
              <div style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '16px', padding: '14px 16px', fontSize: '13px'
              }}>
                {[
                  { label: 'Số CCCD', val: '001201009876' },
                  { label: 'Quê quán', val: 'Hải Phòng' },
                  { label: 'Phương tiện gửi', val: '1 xe máy (29B1-987.65)' },
                  { label: 'Ngày vào ở', val: '01/08/2026' }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < 3 ? `1px solid ${isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)'}` : 'none' }}>
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>{item.label}</span>
                    <strong style={{ color: isLight ? '#0f172a' : '#fff' }}>{item.val}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>

        {/* ── 3. BOTTOM NAVIGATION BAR (Thanh Điều Hướng Đáy Chuẩn App) ── */}
        <nav style={{
          background: isLight ? 'rgba(255,255,255,0.96)' : 'rgba(11,17,32,0.96)',
          backdropFilter: 'blur(16px)',
          borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          padding: '8px 6px 14px',
          flexShrink: 0,
          zIndex: 90
        }}>
          {[
            { id: 'home', label: 'Trang chủ', icon: Home },
            { id: 'invoices', label: 'Hóa đơn', icon: Receipt, badge: '1' },
            { id: 'contracts', label: 'Hợp đồng', icon: FileText },
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
                  color: isAct ? '#10b981' : (isLight ? '#64748b' : '#94a3b8'),
                  position: 'relative',
                  padding: '4px 0',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Icon size={20} />
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
                <span style={{ fontSize: '10.5px', fontWeight: isAct ? 800 : 600 }}>
                  {tab.label}
                </span>
                {isAct && (
                  <div style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: '#10b981', position: 'absolute', bottom: 0
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
                maxHeight: '85%',
                overflowY: 'auto'
              }}
            >
              {/* Drag Handle Bar */}
              <div style={{
                width: 40, height: 4, borderRadius: 2,
                background: isLight ? '#cbd5e1' : '#4b5563',
                margin: '0 auto 14px'
              }} />

              {/* SHEET 1: THANH TOÁN VIETQR */}
              {bottomSheet === 'qr_pay' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                      Thanh Toán Hóa Đơn Phòng P.202
                    </h3>
                    <button
                      onClick={() => setBottomSheet(null)}
                      style={{ background: 'transparent', border: 'none', fontSize: '18px', color: isLight ? '#64748b' : '#94a3b8', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ textAlign: 'center', margin: '14px 0' }}>
                    <div style={{
                      display: 'inline-block', padding: 12, background: '#fff',
                      borderRadius: 16, border: '2px solid #10b981',
                      boxShadow: '0 8px 24px rgba(16,185,129,0.15)'
                    }}>
                      <img
                        src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=SMARTRENT-P202-3450000"
                        alt="VietQR Code"
                        style={{ width: 170, height: 170, display: 'block' }}
                      />
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444', marginTop: 10 }}>
                      3,450,000 đ
                    </div>
                    <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      Nội dung: <strong>HD P202 T10 NGUYEN VAN MINH</strong>
                    </div>
                  </div>

                  <div style={{ background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)', padding: 12, borderRadius: 12, fontSize: '11.5px', color: isLight ? '#475569' : '#cbd5e1', lineHeight: 1.5, marginBottom: 14 }}>
                    💡 Quét mã bằng bất kỳ App Ngân hàng (MB, Vietcombank, Techcombank...) hoặc MoMo để chuyển khoản tự động gạch nợ.
                  </div>

                  <button
                    onClick={() => {
                      alert('✅ Đã ghi nhận thông báo chuyển khoản! Chủ trọ sẽ duyệt trong ít phút.');
                      setBottomSheet(null);
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff', border: 'none', borderRadius: '12px',
                      padding: '12px', fontWeight: 800, fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Tôi Đã Chuyển Khoản Xong
                  </button>
                </div>
              )}

              {/* SHEET 2: BÁO SỬA CHỮA / HƯ HỎNG */}
              {bottomSheet === 'repair' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                      Báo Sự Cố & Sửa Chữa (P.202)
                    </h3>
                    <button
                      onClick={() => setBottomSheet(null)}
                      style={{ background: 'transparent', border: 'none', fontSize: '18px', color: isLight ? '#64748b' : '#94a3b8', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>

                  {repairSent ? (
                    <div style={{ textAlign: 'center', padding: '24px 10px' }}>
                      <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 10px' }} />
                      <h4 style={{ margin: '0 0 6px', fontSize: '16px' }}>Đã Gửi Yêu Cầu Thành Công!</h4>
                      <p style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8', margin: 0 }}>Chủ trọ đã nhận được thông báo và sẽ liên hệ xử lý sớm.</p>
                      <button
                        onClick={() => { setRepairSent(false); setBottomSheet(null); }}
                        style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Đóng
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 4 }}>
                          Loại sự cố *
                        </label>
                        <select
                          className="form-control"
                          style={{ height: 38, fontSize: '13px' }}
                          defaultValue="water"
                        >
                          <option value="water">💧 Đường ống nước / Vòi sen / Bồn cầu</option>
                          <option value="electric">⚡ Thiết bị điện / Máy lạnh / Quạt</option>
                          <option value="door">🚪 Cửa sổ / Khóa cửa / Tường nhà</option>
                          <option value="other">📌 Vấn đề khác</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 4 }}>
                          Mô tả chi tiết *
                        </label>
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="Ví dụ: Vòi sen bị rỉ nước liên tục từ tối qua..."
                          style={{ fontSize: '13px' }}
                        />
                      </div>

                      <div style={{
                        border: `1.5px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                        borderRadius: 10, padding: 12, textAlign: 'center', cursor: 'pointer',
                        background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)'
                      }}>
                        <Camera size={20} style={{ margin: '0 auto 4px', color: '#10b981' }} />
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>Chụp ảnh hoặc chọn video hiện trạng</div>
                        <div style={{ fontSize: '10.5px', color: isLight ? '#94a3b8' : '#64748b' }}>Tối đa 3 ảnh</div>
                      </div>

                      <button
                        onClick={() => setRepairSent(true)}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: '#fff', border: 'none', borderRadius: '12px',
                          padding: '12px', fontWeight: 800, fontSize: '14px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: 8
                        }}
                      >
                        <Send size={16} /> Gửi Báo Cáo Cho Chủ Trọ
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

