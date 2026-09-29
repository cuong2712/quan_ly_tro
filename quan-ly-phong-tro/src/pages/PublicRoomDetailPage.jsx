import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Building2, ArrowLeft, MapPin, Sparkles, Phone, MessageSquare, 
  CheckCircle2, ShieldCheck, QrCode, AlertCircle, Copy, Check,
  Flame, Calendar, User, Info, RefreshCw, X, Heart
} from 'lucide-react';
import { Panorama360Viewer } from '../components/Common/Panorama360Viewer';

export const PublicRoomDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('360'); // '360' or 'gallery'
  const [copiedField, setCopiedField] = useState(null);

  // State Modal Đặt cọc VietQR
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositStep, setDepositStep] = useState(1); // 1: Nhập thông tin & số tiền, 2: Hiện mã VietQR chờ thanh toán, 3: Đã cọc thành công
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [expectedMoveInDate, setExpectedMoveInDate] = useState('');
  const [depositAmount, setDepositAmount] = useState(500000); // Mặc định 500k, tùy chỉnh được để test
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [depositResult, setDepositResult] = useState(null);

  useEffect(() => {
    loadRoomDetail();
  }, [id]);

  const loadRoomDetail = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5000/api/PublicRooms/${id}`);
      if (res.data?.success) {
        const r = res.data.data;
        setRoom(r);
        // Nếu không có ảnh 360, chuyển sang tab gallery
        if (!r.panorama360Url && r.images?.length > 0) {
          setActiveTab('gallery');
        }
      }
    } catch (err) {
      console.error('Error loading room detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (val) => {
    return new Intl.NumberFormat('vi-VN').format(val || 0) + ' đ';
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Tạo nội dung chuyển khoản cọc chuẩn
  const getTransferMemo = () => {
    const cleanRoom = (room?.roomNumber || '').replace(/[^a-zA-Z0-9]/g, '');
    const cleanPhone = (tenantPhone || '0900000000').replace(/[^0-9]/g, '');
    return `COC ${cleanRoom} ${cleanPhone}`.toUpperCase();
  };

  // Tạo URL mã VietQR theo chuẩn Napas
  const getVietQrUrl = () => {
    const bankName = room?.bankName || 'MB';
    const accountNo = room?.bankAccountNumber || '0397181879';
    const accountName = room?.bankAccountName || 'NGUYEN VAN HAI';
    const memo = getTransferMemo();
    return `https://img.vietqr.io/image/${bankName}-${accountNo}-compact2.png?amount=${depositAmount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(accountName)}`;
  };

  // Xác nhận chuyển tiền / Giả lập nhận tiền từ Ngân hàng
  const handleConfirmPayment = async (isSimulation = false) => {
    if (!tenantName.trim()) {
      alert('Vui lòng nhập họ và tên của bạn');
      return;
    }
    if (!tenantPhone.trim()) {
      alert('Vui lòng nhập số điện thoại');
      return;
    }
    if (depositAmount <= 0) {
      alert('Số tiền cọc phải lớn hơn 0đ');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        tenantName: tenantName.trim(),
        tenantPhone: tenantPhone.trim(),
        depositAmount: Number(depositAmount),
        expectedMoveInDate: expectedMoveInDate ? new Date(expectedMoveInDate).toISOString() : null,
        note: note.trim(),
        transactionCode: isSimulation 
          ? `TEST-SIM-${Date.now().toString().slice(-6)}` 
          : `VIETQR-${Date.now().toString().slice(-6)}`
      };

      const res = await axios.post(`http://localhost:5000/api/PublicRooms/${id}/confirm-deposit`, payload);
      if (res.data?.success) {
        setDepositResult(res.data);
        setDepositStep(3); // Chuyển sang màn hình thành công
        // Cập nhật lại thông tin phòng trên trang
        setRoom(prev => ({
          ...prev,
          status: 'Deposit'
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi xác nhận đặt cọc');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌀</div>
          <p style={{ fontWeight: 600 }}>Đang tải thông tin phòng trọ...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: 20 }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: 8 }}>Không tìm thấy phòng trọ</h2>
        <p style={{ color: '#64748b', marginBottom: 20 }}>Phòng này có thể đã bị gỡ hoặc chưa được công khai.</p>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '10px 20px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
        >
          ← Quay lại trang tìm phòng
        </button>
      </div>
    );
  }

  const isVacant = room.status === 'Vacant';
  const isDeposit = room.status === 'Deposit';
  const has360 = Boolean(room.panorama360Url);
  const galleryImages = room.images && room.images.length > 0
    ? room.images
    : ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1000&auto=format&fit=crop'];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', paddingBottom: 80 }}>
      
      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              color: '#334155',
              fontSize: '14.5px',
              fontWeight: 650,
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '8px',
            }}
          >
            <ArrowLeft size={18} />
            <span>Khám phá phòng khác</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: isVacant ? '#d1fae5' : (isDeposit ? '#fef3c7' : '#f1f5f9'),
                color: isVacant ? '#065f46' : (isDeposit ? '#92400e' : '#475569'),
              }}
            >
              {isVacant ? '● CÒN TRỐNG' : (isDeposit ? '● ĐÃ CỌC GIỮ CHỖ' : '● ĐANG CÓ NGƯỜI Ở')}
            </span>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '24px auto 0', padding: '0 24px' }}>
        
        {/* Switcher Tab: Cam 360° vs Bộ sưu tập ảnh */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {has360 && (
              <button
                onClick={() => setActiveTab('360')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: activeTab === '360' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                  background: activeTab === '360' ? 'linear-gradient(135deg, #7c3aed, #2563eb)' : '#fff',
                  color: activeTab === '360' ? '#fff' : '#475569',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: activeTab === '360' ? '0 4px 12px rgba(124, 58, 237, 0.3)' : 'none',
                }}
              >
                <Sparkles size={16} color={activeTab === '360' ? '#38bdf8' : '#7c3aed'} />
                <span>Trải Nghiệm Cam 360° (Virtual Tour)</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('gallery')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: '12px',
                border: activeTab === 'gallery' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: activeTab === 'gallery' ? '#2563eb' : '#fff',
                color: activeTab === 'gallery' ? '#fff' : '#475569',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <span>Ảnh Chụp Thực Tế ({galleryImages.length})</span>
            </button>
          </div>

          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Mã phòng: <strong>{room.roomNumber}</strong> | Khu: <strong>{room.zoneName}</strong>
          </div>
        </div>

        {/* ─── VISUAL SHOWCASE (360 OR GALLERY) ──────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          {activeTab === '360' && has360 ? (
            <Panorama360Viewer
              imageUrl={room.panorama360Url}
              title={`Phòng ${room.roomNumber} - ${room.zoneName}`}
              height="540px"
            />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: galleryImages.length > 1 ? '2fr 1fr' : '1fr',
                gap: 12,
                height: 500,
                borderRadius: '18px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
              }}
            >
              <div style={{ height: '100%', overflow: 'hidden' }}>
                <img
                  src={galleryImages[0]}
                  alt="Main room"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              {galleryImages.length > 1 && (
                <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 12, height: '100%' }}>
                  <img
                    src={galleryImages[1]}
                    alt="Room sub 1"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {galleryImages.length > 2 ? (
                    <img
                      src={galleryImages[2]}
                      alt="Room sub 2"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      SmartRent
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── TWO COLUMNS: DETAILS & ACTION SIDEBAR ─────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 32, alignItems: 'start' }}>
          
          {/* CỘT TRÁI: THÔNG TIN CHI TIẾT PHÒNG */}
          <div>
            
            {/* Title & Address */}
            <div style={{ backgroundColor: '#fff', borderRadius: '18px', padding: '24px 28px', border: '1px solid #e2e8f0', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Phòng {room.roomNumber} — {room.zoneName}
                </h1>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: '14.5px', marginBottom: 20 }}>
                <MapPin size={18} color="#2563eb" />
                <span>{room.zoneAddress}</span>
              </div>

              {/* Thông số nhanh */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: 2 }}>Diện tích</div>
                  <div style={{ fontSize: '16px', fontWeight: 750, color: '#0f172a' }}>{room.area} m²</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: 2 }}>Vị trí tầng</div>
                  <div style={{ fontSize: '16px', fontWeight: 750, color: '#0f172a' }}>Tầng {room.floor}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: 2 }}>Sức chứa tối đa</div>
                  <div style={{ fontSize: '16px', fontWeight: 750, color: '#0f172a' }}>{room.maxTenants} người</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: 2 }}>Phí dịch vụ</div>
                  <div style={{ fontSize: '16px', fontWeight: 750, color: '#0f172a' }}>{formatPrice(room.serviceFee)}</div>
                </div>
              </div>
            </div>

            {/* Mô tả chi tiết */}
            <div style={{ backgroundColor: '#fff', borderRadius: '18px', padding: '24px 28px', border: '1px solid #e2e8f0', marginBottom: 24 }}>
              <h3 style={{ fontSize: '18px', fontWeight: 750, color: '#0f172a', marginBottom: 12 }}>
                Mô tả chi tiết phòng
              </h3>
              <p style={{ color: '#334155', fontSize: '15px', lineHeight: 1.7, margin: 0 }}>
                {room.description || 'Phòng trọ sạch sẽ, thoáng mát, an ninh tốt, giờ giấc tự do, có chỗ để xe an toàn và camera giám sát 24/7.'}
              </p>
            </div>

            {/* Tiện ích có sẵn */}
            <div style={{ backgroundColor: '#fff', borderRadius: '18px', padding: '24px 28px', border: '1px solid #e2e8f0', marginBottom: 24 }}>
              <h3 style={{ fontSize: '18px', fontWeight: 750, color: '#0f172a', marginBottom: 16 }}>
                Tiện nghi & Dịch vụ đi kèm
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {(() => {
                  try {
                    const list = JSON.parse(room.amenities || '[]');
                    if (Array.isArray(list) && list.length > 0) {
                      return list.map((am, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '14.5px', color: '#334155' }}>
                          <CheckCircle2 size={18} color="#10b981" />
                          <span>{am}</span>
                        </div>
                      ));
                    }
                  } catch {}
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '14.5px', color: '#334155' }}>
                        <CheckCircle2 size={18} color="#10b981" />
                        <span>Giờ giấc tự do, không chung chủ</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '14.5px', color: '#334155' }}>
                        <CheckCircle2 size={18} color="#10b981" />
                        <span>Wifi Internet tốc độ cao</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '14.5px', color: '#334155' }}>
                        <CheckCircle2 size={18} color="#10b981" />
                        <span>Khóa vân tay / Camera an ninh</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '14.5px', color: '#334155' }}>
                        <CheckCircle2 size={18} color="#10b981" />
                        <span>Nhà vệ sinh riêng khép kín</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Nội thất & Thiết bị trong phòng */}
            {room.equipments && room.equipments.length > 0 && (
              <div style={{ backgroundColor: '#fff', borderRadius: '18px', padding: '24px 28px', border: '1px solid #e2e8f0', marginBottom: 24 }}>
                <h3 style={{ fontSize: '18px', fontWeight: 750, color: '#0f172a', marginBottom: 16 }}>
                  Trang thiết bị & Nội thất bàn giao
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {room.equipments.map((eq) => (
                    <div
                      key={eq.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ fontWeight: 650, color: '#1e293b', fontSize: '14px' }}>{eq.name}</div>
                      <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: 3 }}>
                        {eq.brand || 'Tiêu chuẩn'} • SL: {eq.quantity}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600, marginTop: 4 }}>
                        ✓ {eq.condition}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* CỘT PHẢI: ACTION SIDEBAR (GIÁ, LIÊN HỆ, CỌC VIETQR) */}
          <div style={{ position: 'sticky', top: 88, display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Box Giá & Cọc phòng */}
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '18px',
                padding: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
              }}
            >
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: 4 }}>
                Giá thuê phòng
              </div>
              <div style={{ fontSize: '30px', fontWeight: 850, color: '#2563eb', marginBottom: 16 }}>
                {formatPrice(room.price)}
                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}> / tháng</span>
              </div>

              {/* Action Button: Đặt Cọc Online */}
              {isVacant ? (
                <div>
                  <button
                    onClick={() => {
                      setDepositStep(1);
                      setIsDepositModalOpen(true);
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                      color: '#fff',
                      border: 'none',
                      padding: '14px 20px',
                      borderRadius: '14px',
                      fontSize: '16px',
                      fontWeight: 750,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 6px 16px rgba(245, 158, 11, 0.35)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Flame size={20} />
                    <span>Đặt Cọc Giữ Phòng Online</span>
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginTop: 10, margin: '10px 0 0' }}>
                    ⚡ Quét mã VietQR chuyển cọc tự động, phòng chuyển sang Đã Cọc ngay tức thì.
                  </p>
                </div>
              ) : isDeposit ? (
                <div
                  style={{
                    backgroundColor: '#fef3c7',
                    border: '1.5px solid #fde68a',
                    padding: '14px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: '#92400e',
                    fontWeight: 650,
                    fontSize: '14px',
                  }}
                >
                  🔒 Phòng này đã được giữ cọc
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#f1f5f9',
                    padding: '14px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  Phòng hiện đang có người thuê
                </div>
              )}
            </div>

            {/* Box Thông tin Chủ trọ & Liên hệ trực tiếp */}
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '18px',
                padding: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
                Thông Tin Chủ Trọ Quản Lý
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    backgroundColor: '#eff6ff',
                    border: '2px solid #3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 750,
                    fontSize: '18px',
                    color: '#2563eb',
                  }}
                >
                  {room.landlordName ? room.landlordName.charAt(0) : 'C'}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 750, color: '#0f172a' }}>
                    {room.landlordName || 'Chủ trọ SmartRent'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={14} /> Đã xác minh danh tính
                  </div>
                </div>
              </div>

              {/* Nút Gọi & Zalo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a
                  href={`tel:${room.landlordPhone}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '14.5px',
                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <Phone size={18} />
                  <span>Gọi ngay: {room.landlordPhone || '0397 181 879'}</span>
                </a>

                <a
                  href={`https://zalo.me/${room.landlordPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: '#0068ff',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '14.5px',
                  }}
                >
                  <MessageSquare size={18} />
                  <span>Chat Zalo với Chủ Trọ</span>
                </a>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ─── MODAL ĐẶT CỌC GIỮ PHÒNG VIETQR ──────────────────────────── */}
      {isDepositModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => !submitting && setIsDepositModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '20px',
              maxWidth: 520,
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              padding: '28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng modal */}
            <button
              onClick={() => setIsDepositModalOpen(false)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: '#f1f5f9',
                border: 'none',
                width: 32,
                height: 32,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
              }}
            >
              <X size={18} />
            </button>

            {/* BƯỚC 1: NHẬP THÔNG TIN CỌC & SỐ TIỀN CỌC */}
            {depositStep === 1 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    <Flame size={28} />
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Đặt Cọc Giữ Phòng {room.roomNumber}
                  </h3>
                  <p style={{ fontSize: '13.5px', color: '#64748b', marginTop: 4 }}>
                    Khu trọ: <strong>{room.zoneName}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, color: '#334155', marginBottom: 6 }}>
                      Họ và tên người cọc *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, color: '#334155', marginBottom: 6 }}>
                      Số điện thoại liên hệ *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0912345678"
                      value={tenantPhone}
                      onChange={(e) => setTenantPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Ô SỐ TIỀN CỌC (LINH HOẠT TÙY CHỈNH ĐỂ TEST) */}
                  <div style={{ backgroundColor: '#f0fdf4', padding: '14px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                        Số tiền cọc giữ chỗ (VNĐ) *
                      </label>
                      <span style={{ fontSize: '11.5px', color: '#15803d', fontWeight: 600 }}>
                        (Cho phép chỉnh để test)
                      </span>
                    </div>

                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid #86efac',
                        fontSize: '17px',
                        fontWeight: 750,
                        color: '#15803d',
                        background: '#fff',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />

                    {/* Quick amount chips */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      {[10000, 50000, 500000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDepositAmount(amt)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: depositAmount === amt ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                            background: depositAmount === amt ? '#dcfce7' : '#fff',
                            color: depositAmount === amt ? '#15803d' : '#475569',
                            fontSize: '12px',
                            fontWeight: 650,
                            cursor: 'pointer',
                          }}
                        >
                          {amt >= 1000000 ? `${amt / 1000000}tr` : `${amt / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, color: '#334155', marginBottom: 6 }}>
                      Ngày dự kiến vào ở
                    </label>
                    <input
                      type="date"
                      value={expectedMoveInDate}
                      onChange={(e) => setExpectedMoveInDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, color: '#334155', marginBottom: 6 }}>
                      Ghi chú thêm
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Số lượng xe mang theo, bạn bè ở ghép..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (!tenantName.trim()) {
                        alert('Vui lòng điền họ tên người cọc');
                        return;
                      }
                      if (!tenantPhone.trim()) {
                        alert('Vui lòng điền số điện thoại');
                        return;
                      }
                      setDepositStep(2);
                    }}
                    style={{
                      marginTop: 8,
                      width: '100%',
                      background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                      color: '#fff',
                      border: 'none',
                      padding: '14px',
                      borderRadius: '12px',
                      fontSize: '15.5px',
                      fontWeight: 750,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                    }}
                  >
                    Tiếp Tục: Quét Mã VietQR Chuyển Cọc →
                  </button>
                </div>
              </div>
            )}

            {/* BƯỚC 2: HIỂN THỊ MÃ VIETQR ĐỘNG & NÚT TEST GIẢ LẬP NHẬN TIỀN */}
            {depositStep === 2 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Quét Mã VietQR Chuyển Cọc
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: 4 }}>
                    Chuyển khoản trực tiếp tới tài khoản ngân hàng của Chủ trọ
                  </p>
                </div>

                {/* Khung QR Code */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1.5px solid #e2e8f0',
                    textAlign: 'center',
                    marginBottom: 16,
                  }}
                >
                  <img
                    src={getVietQrUrl()}
                    alt="VietQR code"
                    style={{
                      maxWidth: 240,
                      width: '100%',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      marginBottom: 12,
                    }}
                  />

                  {/* Thông tin chuyển khoản sao chép nhanh */}
                  <div style={{ textAlign: 'left', backgroundColor: '#fff', padding: '12px 14px', borderRadius: '10px', fontSize: '13px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ color: '#64748b' }}>Ngân hàng:</span>
                      <strong style={{ color: '#0f172a' }}>{room.bankName || 'MB Bank'}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ color: '#64748b' }}>Số tài khoản:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ color: '#2563eb', fontSize: '14px' }}>{room.bankAccountNumber || '0397181879'}</strong>
                        <button
                          onClick={() => copyToClipboard(room.bankAccountNumber || '0397181879', 'acc')}
                          style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 2 }}
                        >
                          {copiedField === 'acc' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ color: '#64748b' }}>Chủ tài khoản:</span>
                      <strong style={{ color: '#0f172a' }}>{room.bankAccountName || 'NGUYEN VAN HAI'}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ color: '#64748b' }}>Số tiền cọc:</span>
                      <strong style={{ color: '#16a34a', fontSize: '15px' }}>{formatPrice(depositAmount)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b' }}>Nội dung CK:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <code style={{ background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {getTransferMemo()}
                        </code>
                        <button
                          onClick={() => copyToClipboard(getTransferMemo(), 'memo')}
                          style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 2 }}
                        >
                          {copiedField === 'memo' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trạng thái chờ quét & Nút giả lập test */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '10px',
                      backgroundColor: '#eff6ff',
                      borderRadius: '10px',
                      color: '#1d4ed8',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <RefreshCw size={15} style={{ animation: 'spin 3s linear infinite' }} />
                    <span>Hệ thống đang sẵn sàng ghi nhận thanh toán...</span>
                  </div>

                  {/* NÚT TEST GIẢ LẬP NHẬN TIỀN NGAY LẬP TỨC */}
                  <button
                    onClick={() => handleConfirmPayment(true)}
                    disabled={submitting}
                    style={{
                      width: '100%',
                      backgroundColor: '#10b981',
                      color: '#fff',
                      border: 'none',
                      padding: '13px',
                      borderRadius: '12px',
                      fontSize: '14.5px',
                      fontWeight: 750,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <span>⚡ [Test] Giả Lập Đã Nhận Tiền Từ Ngân Hàng</span>
                  </button>

                  <button
                    onClick={() => setDepositStep(1)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      padding: '4px',
                    }}
                  >
                    ← Quay lại sửa thông tin
                  </button>
                </div>
              </div>
            )}

            {/* BƯỚC 3: MÀN HÌNH CHÚC MỪNG CỌC THÀNH CÔNG */}
            {depositStep === 3 && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <CheckCircle2 size={36} />
                </div>

                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                  Đặt Cọc Phòng Thành Công!
                </h3>

                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, marginBottom: 20 }}>
                  Chúc mừng bạn <strong>{tenantName}</strong> đã đặt cọc giữ chỗ <strong>Phòng {room.roomNumber}</strong> ({room.zoneName}) thành công.
                  Hệ thống đã tự động chuyển trạng thái phòng sang <strong>ĐÃ CỌC</strong> và gửi thông báo tới Chủ trọ.
                </p>

                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    textAlign: 'left',
                    fontSize: '13.5px',
                    marginBottom: 24,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#64748b' }}>Số tiền đã cọc:</span>
                    <strong style={{ color: '#16a34a', fontSize: '15px' }}>{formatPrice(depositAmount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#64748b' }}>Số điện thoại người cọc:</span>
                    <strong>{tenantPhone}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Trạng thái phòng:</span>
                    <strong style={{ color: '#d97706' }}>Đã cọc giữ chỗ</strong>
                  </div>
                </div>

                <button
                  onClick={() => setIsDepositModalOpen(false)}
                  style={{
                    width: '100%',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '14.5px',
                    cursor: 'pointer',
                  }}
                >
                  Đóng và xem chi tiết phòng
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default PublicRoomDetailPage;
