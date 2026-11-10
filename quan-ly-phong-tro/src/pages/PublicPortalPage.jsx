import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, Search, Sparkles, Filter, Home, Phone, MessageSquare, 
  MapPin, CheckCircle2, ShieldCheck, ArrowRight, UserCheck, LogIn,
  Zap, Eye, SlidersHorizontal, Layers, ChevronRight, Smartphone,
  Bed, DollarSign, Check, Award, Compass, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { getMediaUrl } from '../utils/media';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const PublicPortalPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [priceRange, setPriceRange] = useState('all');
  const [only360, setOnly360] = useState(false);
  const [onlyVacant, setOnlyVacant] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState('');

  // Tải danh sách phòng công khai và danh sách khu trọ
  useEffect(() => {
    loadRooms();
  }, [selectedZone, priceRange, only360, onlyVacant, selectedAmenity]);

  useEffect(() => {
    loadZones();
  }, []);

  const safeExtractList = (res) => {
    let d = res?.data;
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.data)) return d.data;
    if (d && d.data && Array.isArray(d.data.data)) return d.data.data;
    return [];
  };

  const loadZones = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/PublicRooms/zones`);
      setZones(safeExtractList(res));
    } catch (err) {
      console.error('Error loading public zones:', err);
    }
  };

  const loadRooms = async () => {
    try {
      setLoading(true);
      const params = {};
      if (keyword.trim()) params.keyword = keyword.trim();
      if (selectedZone) params.zoneId = selectedZone;
      if (only360) params.has360 = true;
      if (selectedAmenity) params.amenity = selectedAmenity;

      if (priceRange === 'under3m') {
        params.maxPrice = 3000000;
      } else if (priceRange === '3m-4.5m') {
        params.minPrice = 3000000;
        params.maxPrice = 4500000;
      } else if (priceRange === 'above4.5m') {
        params.minPrice = 4500000;
      }

      const res = await axios.get(`${API_BASE_URL}/PublicRooms`, { params });
      let roomData = safeExtractList(res);
      if (onlyVacant) {
        roomData = roomData.filter(r => r.status === 'Vacant');
      }
      setRooms(roomData);
    } catch (err) {
      console.error('Error loading public rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadRooms();
  };

  const handleSelectZone = (zoneId) => {
    if (selectedZone === zoneId) {
      setSelectedZone(''); // Click lại để bỏ chọn
    } else {
      setSelectedZone(zoneId);
      // Cuộn mượt đến danh sách phòng
      const listElement = document.getElementById('rooms-list-section');
      if (listElement) {
        listElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const getDashboardRoute = () => {
    if (!user) return '/login';
    if (user.role === 'SuperAdmin') return '/admin';
    if (user.role === 'Landlord') return '/landlord';
    return '/tenant';
  };

  const formatPrice = (val) => {
    return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
  };

  // Tính toán số liệu thống kê nhanh
  const stats = useMemo(() => {
    const totalZones = zones.length;
    const totalPublicRooms = zones.reduce((acc, z) => acc + (z.totalPublicRooms || 0), 0);
    const totalVacantRooms = zones.reduce((acc, z) => acc + (z.vacantRoomsCount || 0), 0);
    const roomsWith360 = rooms.filter(r => Boolean(r.panorama360Url)).length;
    return { totalZones, totalPublicRooms, totalVacantRooms, roomsWith360 };
  }, [zones, rooms]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* ─── HEADER / NAVBAR ────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          
          {/* Logo & Tagline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, background: 'linear-gradient(135deg, #1e3a8a, #6d28d9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
                SmartRent
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                Cổng Khám Phá & Đặt Phòng Trọ Trực Tuyến
              </div>
            </div>
          </div>

          {/* Quick Nav & User Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/mobile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: '24px',
                border: '1.5px solid #10b981',
                background: 'rgba(16,185,129,0.08)',
                color: '#059669',
                fontSize: '13.5px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Trải nghiệm ứng dụng di động SmartRent"
            >
              <Smartphone size={16} />
              <span>📱 Giao diện Mobile</span>
            </button>

            <button
              onClick={() => setOnlyVacant(!onlyVacant)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: '24px',
                border: onlyVacant ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                background: onlyVacant ? '#ecfdf5' : '#fff',
                color: onlyVacant ? '#059669' : '#475569',
                fontSize: '13.5px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: onlyVacant ? '#10b981' : '#94a3b8' }} />
              <span>Phòng còn trống</span>
            </button>

            <button
              onClick={() => setOnly360(!only360)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: '24px',
                border: only360 ? '1.5px solid #8b5cf6' : '1px solid #e2e8f0',
                background: only360 ? 'linear-gradient(135deg, #ede9fe, #f5f3ff)' : '#fff',
                color: only360 ? '#6d28d9' : '#475569',
                fontSize: '13.5px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Sparkles size={16} color={only360 ? '#7c3aed' : '#94a3b8'} />
              <span>Cam 360°</span>
            </button>

            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                  Xin chào, <strong style={{ color: '#2563eb' }}>{user.fullName}</strong>
                </span>
                <button
                  onClick={() => navigate(getDashboardRoute())}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 650,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <UserCheck size={16} />
                  <span>Vào trang Quản lý</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#f1f5f9',
                  color: '#1e293b',
                  border: '1px solid #cbd5e1',
                  fontWeight: 650,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <LogIn size={16} />
                <span>Đăng nhập Quản lý</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── HERO BANNER ────────────────────────────────────────────── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #1e1b4b 100%)',
          color: '#fff',
          padding: '36px 20px 48px',
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <div style={{ maxWidth: 1040, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', fontSize: '13px', fontWeight: 650, marginBottom: 16 }}>
            <Compass size={15} />
            <span>Cổng Thông Tin Nhà Trọ & Phòng Trống Trực Tuyến</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(24px, 3.4vw, 36px)',
              fontWeight: 800,
              lineHeight: 1.25,
              marginBottom: 16,
              letterSpacing: '-0.5px',
            }}
          >
            Tìm Khu Trọ & Phòng Còn Trống — Trải Nghiệm{' '}
            <span style={{ background: 'linear-gradient(135deg, #38bdf8, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Cam 360°
            </span>{' '}
            Thực Tế
          </h1>

          <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: 640, margin: '0 auto 28px', lineHeight: 1.5 }}>
            Xem chi tiết phòng trống, giá thuê công khai, tiện nghi nội thất và giữ chỗ trực tuyến an toàn không qua môi giới.
          </p>

          {/* Search Box Container */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '8px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              maxWidth: 860,
              margin: '0 auto',
            }}
          >
            <div style={{ flex: '2 1 240px', display: 'flex', alignItems: 'center', padding: '0 12px', background: '#f8fafc', borderRadius: '12px' }}>
              <Search size={18} color="#94a3b8" />
              <input
                type="text"
                placeholder="Nhập số phòng, đường, quận hoặc tên khu trọ..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '12px',
                  width: '100%',
                  fontSize: '14.5px',
                  color: '#1e293b',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ flex: '1 1 180px', display: 'flex', alignItems: 'center', padding: '0 12px', background: '#f8fafc', borderRadius: '12px' }}>
              <MapPin size={18} color="#94a3b8" />
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '12px 6px',
                  width: '100%',
                  fontSize: '14px',
                  color: '#1e293b',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">Tất cả khu trọ</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.vacantRoomsCount || 0} phòng trống / {z.totalPublicRooms} phòng)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              style={{
                flex: '0 0 auto',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                color: '#fff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              <Search size={18} />
              <span>Tìm Ngay</span>
            </button>
          </form>

          {/* Quick Filter Tags */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Gợi ý lọc nhanh:</span>
            {[
              { label: '🟢 Chỉ phòng trống', active: onlyVacant, onClick: () => setOnlyVacant(!onlyVacant) },
              { label: '⚡ Có Cam 360°', active: only360, onClick: () => setOnly360(!only360) },
              { label: '🔥 Dưới 3.5 triệu', active: priceRange === 'under3m', onClick: () => setPriceRange(priceRange === 'under3m' ? 'all' : 'under3m') },
              { label: '❄️ Có Máy lạnh', active: selectedAmenity === 'Máy lạnh', onClick: () => setSelectedAmenity(selectedAmenity === 'Máy lạnh' ? '' : 'Máy lạnh') },
            ].map((tag, idx) => (
              <button
                key={idx}
                onClick={tag.onClick}
                style={{
                  background: tag.active ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)',
                  color: tag.active ? '#0f172a' : '#e2e8f0',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12.5px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* ─── HERO STATS BAR ─── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              maxWidth: 860,
              margin: '36px auto 0',
              padding: '16px 20px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8' }}>{stats.totalZones} Khu Trọ</div>
              <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: 2 }}>Vị trí trung tâm & tiện lợi</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>{stats.totalVacantRooms} Phòng Trống</div>
              <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: 2 }}>Sẵn sàng đón khách ở ngay</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#a855f7' }}>Trải Nghiệm 360°</div>
              <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: 2 }}>Xem mọi góc phòng chân thực</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>100% Cọc Online</div>
              <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: 2 }}>Chuẩn VietQR tự động</div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── SECTION 1: GIỚI THIỆU HỆ THỐNG CÁC KHU TRỌ ────────────────── */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '36px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#2563eb', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Building2 size={16} />
              <span>Hệ Thống Nhà Trọ & Chung Cư</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>
              Khám Phá Các Khu Trọ Tiêu Biểu ({zones.length})
            </h2>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: '4px 0 0' }}>
              Bấm chọn khu trọ để xem các phòng còn trống và mức giá chi tiết
            </p>
          </div>

          {selectedZone && (
            <button
              onClick={() => setSelectedZone('')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#fee2e2',
                color: '#b91c1c',
                border: 'none',
                fontSize: '13px',
                fontWeight: 650,
                cursor: 'pointer',
              }}
            >
              <span>✕ Đang lọc theo khu ({zones.find(z => z.id === selectedZone)?.name})</span>
              <span style={{ textDecoration: 'underline' }}>Xem tất cả</span>
            </button>
          )}
        </div>

        {/* Grid thẻ các Khu Trọ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          {zones.map((zone) => {
            const isSelected = selectedZone === zone.id;
            const vacantCount = zone.vacantRoomsCount || 0;
            const hasVacant = vacantCount > 0;

            return (
              <div
                key={zone.id}
                onClick={() => handleSelectZone(zone.id)}
                style={{
                  backgroundColor: isSelected ? '#eff6ff' : '#fff',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  boxShadow: isSelected ? '0 8px 20px rgba(37, 99, 235, 0.15)' : '0 2px 6px rgba(0, 0, 0, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 6px 14px rgba(0, 0, 0, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.04)';
                  }
                }}
              >
                <div>
                  {/* Header Khu trọ: Tên & Badge phòng trống */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '10px',
                          background: isSelected ? '#2563eb' : '#f1f5f9',
                          color: isSelected ? '#fff' : '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Building2 size={18} />
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: 750, color: isSelected ? '#1d4ed8' : '#0f172a', margin: 0, lineHeight: 1.3 }}>
                        {zone.name}
                      </h3>
                    </div>

                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: hasVacant ? '#dcfce7' : '#f1f5f9',
                        color: hasVacant ? '#15803d' : '#64748b',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {hasVacant ? `🟢 ${vacantCount} TRỐNG` : '🔒 HẾT PHÒNG'}
                    </span>
                  </div>

                  {/* Địa chỉ */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: '#64748b', fontSize: '13px', marginBottom: 12 }}>
                    <MapPin size={15} color="#94a3b8" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ lineHeight: 1.35 }}>{zone.address}</span>
                  </div>
                </div>

                {/* Footer Khu trọ: Mức giá & CTA */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Tổng {zone.totalPublicRooms} phòng</div>
                    {zone.minPrice > 0 && (
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        Từ {formatPrice(zone.minPrice)}
                      </div>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: isSelected ? '#2563eb' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>{isSelected ? 'Đang lọc' : 'Xem phòng'}</span>
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── SECTION 2: BỘ LỌC CHI TIẾT & DANH SÁCH PHÒNG ────────────────── */}
      <main id="rooms-list-section" style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px 80px' }}>
        
        {/* Bộ lọc thanh ngang */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '18px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            marginBottom: 24,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          {/* Lọc theo khoảng giá */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 650, color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Filter size={15} /> Mức giá:
            </span>
            {[
              { id: 'all', label: 'Tất cả mức giá' },
              { id: 'under3m', label: 'Dưới 3 triệu' },
              { id: '3m-4.5m', label: '3 - 4.5 triệu' },
              { id: 'above4.5m', label: 'Trên 4.5 triệu' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPriceRange(p.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: priceRange === p.id ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                  background: priceRange === p.id ? '#eff6ff' : '#fff',
                  color: priceRange === p.id ? '#1d4ed8' : '#475569',
                  fontSize: '13px',
                  fontWeight: priceRange === p.id ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Toggle Cam 360 & Trạng thái còn trống */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13.5px', fontWeight: 650, color: '#059669', cursor: 'pointer', background: onlyVacant ? '#d1fae5' : '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: onlyVacant ? '1px solid #10b981' : '1px solid #e2e8f0' }}>
              <input
                type="checkbox"
                checked={onlyVacant}
                onChange={(e) => setOnlyVacant(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#10b981', cursor: 'pointer' }}
              />
              <span>🟢 Chỉ phòng còn trống (Ở ngay)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13.5px', fontWeight: 650, color: '#6d28d9', cursor: 'pointer', background: only360 ? '#ede9fe' : '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: only360 ? '1px solid #8b5cf6' : '1px solid #e2e8f0' }}>
              <input
                type="checkbox"
                checked={only360}
                onChange={(e) => setOnly360(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#7c3aed', cursor: 'pointer' }}
              />
              <Sparkles size={16} color="#7c3aed" />
              <span>Chỉ phòng có Cam 360°</span>
            </label>
          </div>
        </div>

        {/* Tiêu đề kết quả & đếm phòng */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Danh Sách Phòng Trọ ({rooms.length})
            </h2>
            {selectedZone && (
              <span style={{ fontSize: '13px', background: '#e0e7ff', color: '#3730a3', padding: '3px 10px', borderRadius: '12px', fontWeight: 600 }}>
                Khu: {zones.find(z => z.id === selectedZone)?.name || 'Đã chọn'}
              </span>
            )}
          </div>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Phòng 🟢 <strong>CÒN TRỐNG</strong> sẵn sàng dọn vào ở và cọc online ngay
          </span>
        </div>

        {/* ─── ROOMS GRID ───────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌀</div>
            <p style={{ fontWeight: 600 }}>Đang tải danh sách phòng trọ...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#fff',
              borderRadius: '16px',
              border: '1px dashed #cbd5e1',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
              Không tìm thấy phòng trọ nào phù hợp
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', maxWidth: 460, margin: '0 auto 16px' }}>
              Hãy thử bỏ bớt bộ lọc hoặc chọn mức giá và khu vực khác.
            </p>
            <button
              onClick={() => {
                setKeyword('');
                setSelectedZone('');
                setPriceRange('all');
                setOnly360(false);
                setOnlyVacant(false);
                setSelectedAmenity('');
              }}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Đặt lại tất cả bộ lọc
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 24,
            }}
          >
            {rooms.map((room) => {
              const has360 = Boolean(room.panorama360Url);
              const previewImg = (room.images && room.images.length > 0)
                ? getMediaUrl(room.images[0])
                : 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format&fit=crop';
              const isVacant = room.status === 'Vacant';
              const isDeposit = room.status === 'Deposit';

              return (
                <div
                  key={room.id}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    border: isVacant ? '1.5px solid #a7f3d0' : '1px solid #e2e8f0',
                    boxShadow: isVacant ? '0 4px 16px rgba(16, 185, 129, 0.08)' : '0 4px 14px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.25s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = isVacant ? '0 4px 16px rgba(16, 185, 129, 0.08)' : '0 4px 14px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  {/* Thumbnail & Badges */}
                  <div style={{ position: 'relative', height: 210, width: '100%', overflow: 'hidden' }}>
                    <img
                      src={previewImg}
                      alt={room.roomNumber}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.4s ease',
                      }}
                    />

                    {/* Gradient Overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.65) 100%)',
                      }}
                    />

                    {/* Huy hiệu 360° Cam */}
                    {has360 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 12,
                          left: 12,
                          background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
                        }}
                      >
                        <Sparkles size={14} color="#38bdf8" />
                        <span>CÓ CAM 360°</span>
                      </div>
                    )}

                    {/* Trạng thái phòng (Nổi bật CÒN TRỐNG) */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 800,
                        backgroundColor: isVacant ? '#10b981' : (isDeposit ? '#f59e0b' : '#64748b'),
                        color: '#fff',
                        boxShadow: isVacant ? '0 4px 12px rgba(16, 185, 129, 0.5)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      {isVacant && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                      <span>{isVacant ? 'CÒN TRỐNG — Ở NGAY' : (isDeposit ? 'ĐÃ CỌC GIỮ CHỖ' : 'ĐANG THUÊ')}</span>
                    </div>

                    {/* Giá thuê nổi bật đè góc dưới */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 12,
                        left: 14,
                        color: '#fff',
                      }}
                    >
                      <div style={{ fontSize: '20px', fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                        {formatPrice(room.price)}
                        <span style={{ fontSize: '13px', fontWeight: 500, opacity: 0.9 }}>/tháng</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    
                    {/* Tên phòng & Tầng */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <h3 style={{ fontSize: '17.5px', fontWeight: 750, color: '#0f172a', margin: 0 }}>
                        Phòng {room.roomNumber}
                      </h3>
                      <span style={{ fontSize: '12.5px', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                        Tầng {room.floor}
                      </span>
                    </div>

                    {/* Khu trọ & Địa chỉ */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: '#475569', fontSize: '13.5px', marginBottom: 12 }}>
                      <MapPin size={16} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ lineHeight: 1.4 }}>
                        <strong>{room.zoneName}</strong> — {room.zoneAddress}
                      </span>
                    </div>

                    {/* Tiện ích thông số (Diện tích, số người) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '10px 12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        fontSize: '13px',
                        color: '#334155',
                        marginBottom: 16,
                      }}
                    >
                      <div>📐 Diện tích: <strong>{room.area} m²</strong></div>
                      <div>👥 Tối đa: <strong>{room.maxTenants} người</strong></div>
                    </div>

                    {/* Tiện nghi vắn tắt */}
                    {room.amenities && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                        {(() => {
                          try {
                            const list = JSON.parse(room.amenities);
                            return (Array.isArray(list) ? list : []).slice(0, 3).map((am, i) => (
                              <span key={i} style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11.5px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px' }}>
                                ✓ {am}
                              </span>
                            ));
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    )}

                    {/* Chủ trọ info footer */}
                    <div style={{
                      marginTop: 'auto',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10
                    }}>
                      <div
                        style={{
                          fontSize: '12.5px',
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          minWidth: 0,
                          flex: 1
                        }}
                        title={`Chủ trọ: ${room.landlordName || ''}`}
                      >
                        Chủ trọ: <strong style={{ color: '#1e293b' }}>{room.landlordName}</strong>
                      </div>

                      <button
                        onClick={() => navigate(`/phong/${room.id}`)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: isVacant 
                            ? 'linear-gradient(135deg, #059669, #10b981)' 
                            : (has360 ? 'linear-gradient(135deg, #7c3aed, #2563eb)' : '#2563eb'),
                          color: '#fff',
                          border: 'none',
                          padding: '8px 14px',
                          borderRadius: '10px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          boxShadow: isVacant ? '0 4px 10px rgba(16, 185, 129, 0.25)' : '0 4px 10px rgba(37, 99, 235, 0.2)',
                          transition: 'all 0.2s',
                        }}
                      >
                        {has360 ? <Sparkles size={13} color="#fff" /> : null}
                        <span style={{ whiteSpace: 'nowrap' }}>
                          {isVacant ? 'Xem & Giữ Chỗ' : (has360 ? 'Xem Cam 360°' : 'Xem Chi Tiết')}
                        </span>
                        <ChevronRight size={14} />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* ─── FOOTER ─────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '48px 24px', borderTop: '1px solid #1e293b' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 32 }}>
          <div style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', marginBottom: 12 }}>
              <Building2 size={24} color="#38bdf8" />
              <span style={{ fontSize: '20px', fontWeight: 800 }}>SmartRent Portal</span>
            </div>
            <p style={{ fontSize: '13.5px', lineHeight: 1.6 }}>
              Nền tảng tìm kiếm, trải nghiệm xem phòng trọ thực tế 360° và quản lý cho thuê nhà trọ thông minh toàn diện tại Việt Nam.
            </p>
          </div>
          <div>
            <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, marginBottom: 12 }}>Dành Cho Người Thuê</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13.5px', lineHeight: 2 }}>
              <li>Trải nghiệm Cam 360° không cần đến tận nơi</li>
              <li>Đặt cọc giữ phòng VietQR tức thì</li>
              <li>Bảo vệ thông tin & Hợp đồng điện tử</li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, marginBottom: 12 }}>Dành Cho Chủ Trọ</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13.5px', lineHeight: 2 }}>
              <li>Đăng tin phòng & tải ảnh 360° miễn phí</li>
              <li>Quản lý hợp đồng, hóa đơn điện nước tự động</li>
              <li>Nhận thông báo cọc phòng ngay lập tức</li>
            </ul>
          </div>
        </div>
        <div style={{ maxWidth: 1280, margin: '36px auto 0', paddingTop: 24, borderTop: '1px solid #1e293b', textAlign: 'center', fontSize: '12.5px' }}>
          © 2026 SmartRent VN. All rights reserved.
        </div>
      </footer>

    </div>
  );
};

export default PublicPortalPage;
