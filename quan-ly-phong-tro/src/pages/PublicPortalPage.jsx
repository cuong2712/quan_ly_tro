import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, Search, Sparkles, Filter, Home, Phone, MessageSquare, 
  MapPin, CheckCircle2, ShieldCheck, ArrowRight, UserCheck, LogIn,
  Zap, Eye, SlidersHorizontal, Layers, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

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
    loadZones();
  }, [selectedZone, priceRange, only360, onlyVacant, selectedAmenity]);

  const loadZones = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/PublicRooms/zones');
      if (res.data?.success) {
        setZones(res.data.data || []);
      }
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

      const res = await axios.get('http://localhost:5000/api/PublicRooms', { params });
      if (res.data?.success) {
        let roomData = res.data.data || [];
        if (onlyVacant) {
          roomData = roomData.filter(r => r.status === 'Vacant');
        }
        setRooms(roomData);
      }
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

  const getDashboardRoute = () => {
    if (!user) return '/login';
    if (user.role === 'SuperAdmin') return '/admin';
    if (user.role === 'Landlord') return '/landlord';
    return '/tenant';
  };

  const formatPrice = (val) => {
    return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'inherit' }}>
      
      {/* ─── HEADER / NAVBAR ────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
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
                Hệ sinh thái tìm & trải nghiệm phòng trọ 360°
              </div>
            </div>
          </div>

          {/* Quick Nav & User Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
              <span>Phòng có Cam 360°</span>
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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #31104b 100%)',
          color: '#fff',
          padding: '60px 24px 70px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: '30px',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '13px',
              fontWeight: 600,
              color: '#38bdf8',
              marginBottom: 20,
            }}
          >
            <Sparkles size={15} />
            <span>Công nghệ Virtual Tour 360° Đột Phá Cho Thuê Phòng</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 850,
              lineHeight: 1.25,
              marginBottom: 16,
              letterSpacing: '-0.5px',
            }}
          >
            Tìm Phòng Trọ Thực Tế — Trải Nghiệm{' '}
            <span style={{ background: 'linear-gradient(135deg, #38bdf8, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Cam 360°
            </span>{' '}
            Không Cần Đến Tận Nơi
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 17px)',
              color: '#cbd5e1',
              maxWidth: 720,
              margin: '0 auto 36px',
              lineHeight: 1.6,
            }}
          >
            Đứng giữa phòng, kéo chuột hoặc nghiêng điện thoại để ngắm trần, sàn, góc bếp, toilet chân thực 100%. 
            Minh bạch giá cả, xem cọc giữ chỗ an toàn qua VietQR.
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
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
              maxWidth: 820,
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
                    {z.name} ({z.totalPublicRooms} phòng)
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
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Gợi ý tìm nhanh:</span>
            {[
              { label: '⚡ Có Cam 360°', active: only360, onClick: () => setOnly360(!only360) },
              { label: '❄️ Có Máy lạnh', active: selectedAmenity === 'Máy lạnh', onClick: () => setSelectedAmenity(selectedAmenity === 'Máy lạnh' ? '' : 'Máy lạnh') },
              { label: '🔥 Dưới 4 triệu', active: priceRange === 'under3m', onClick: () => setPriceRange(priceRange === 'under3m' ? 'all' : 'under3m') },
              { label: '🟢 Chỉ phòng trống', active: onlyVacant, onClick: () => setOnlyVacant(!onlyVacant) },
            ].map((tag, idx) => (
              <button
                key={idx}
                onClick={tag.onClick}
                style={{
                  background: tag.active ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)',
                  color: tag.active ? '#0f172a' : '#e2e8f0',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {tag.label}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ─── MAIN CONTENT: BỘ LỌC VÀ DANH SÁCH PHÒNG ────────────────── */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 80px' }}>
        
        {/* Bộ lọc thanh ngang */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '18px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            marginBottom: 32,
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

          {/* Toggle Cam 360 & Trạng thái */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13.5px', fontWeight: 600, color: '#6d28d9', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={only360}
                onChange={(e) => setOnly360(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#7c3aed', cursor: 'pointer' }}
              />
              <Sparkles size={16} color="#7c3aed" />
              <span>Chỉ hiển thị phòng Cam 360°</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13.5px', fontWeight: 600, color: '#059669', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={onlyVacant}
                onChange={(e) => setOnlyVacant(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#10b981', cursor: 'pointer' }}
              />
              <span>Chỉ phòng còn trống</span>
            </label>
          </div>
        </div>

        {/* Tiêu đề kết quả */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '20px', fontWeight: 750, color: '#0f172a' }}>
            Danh Sách Phòng Trọ Nổi Bật ({rooms.length})
          </h2>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Hiển thị ưu tiên phòng có Cam 360° & phòng sẵn sàng dọn vào
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
                ? room.images[0]
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
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)',
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
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.05)';
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
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)',
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

                    {/* Trạng thái phòng */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        padding: '5px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: isVacant ? '#10b981' : (isDeposit ? '#f59e0b' : '#64748b'),
                        color: '#fff',
                      }}
                    >
                      {isVacant ? 'CÒN TRỐNG' : (isDeposit ? 'ĐÃ CỌC' : 'ĐANG THUÊ')}
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
                    <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                        Chủ trọ: <strong style={{ color: '#1e293b' }}>{room.landlordName}</strong>
                      </div>

                      <button
                        onClick={() => navigate(`/phong/${room.id}`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: has360 ? 'linear-gradient(135deg, #7c3aed, #2563eb)' : '#2563eb',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: has360 ? '0 4px 10px rgba(124, 58, 237, 0.25)' : '0 4px 10px rgba(37, 99, 235, 0.2)',
                        }}
                      >
                        {has360 ? <Sparkles size={14} color="#38bdf8" /> : null}
                        <span>{has360 ? 'Xem Cam 360°' : 'Xem Chi Tiết'}</span>
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
