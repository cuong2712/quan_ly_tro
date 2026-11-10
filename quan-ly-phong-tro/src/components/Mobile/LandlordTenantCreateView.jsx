import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, Users, Building2, DoorClosed, Phone,
  Mail, Shield, KeyRound, MapPin, RefreshCw, CheckCircle2
} from 'lucide-react';
import { tenantService } from '../../services';

export function LandlordTenantCreateView({
  zones = [],
  rooms = [],
  isLight = false,
  onBack,
  onSuccess
}) {
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id || '');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cccd, setCccd] = useState('');
  const [hometown, setHometown] = useState('');
  const [password, setPassword] = useState('Tenant@123456');
  const [loading, setLoading] = useState(false);

  // Lọc phòng theo khu
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => !selectedZoneId || r.zoneId === selectedZoneId || r.ZoneId === selectedZoneId);
  }, [rooms, selectedZoneId]);

  // Tự động chọn phòng đầu tiên
  useEffect(() => {
    if (filteredRooms.length > 0) {
      setSelectedRoomId(filteredRooms[0].id);
    } else {
      setSelectedRoomId('');
    }
  }, [selectedZoneId, filteredRooms]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      return alert('Vui lòng nhập Họ tên và Số điện thoại khách thuê');
    }

    setLoading(true);
    try {
      await tenantService.createTenant({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        cccd: cccd.trim() || undefined,
        hometown: hometown.trim() || undefined,
        password: password.trim() || 'Tenant@123456',
        roomId: selectedRoomId || undefined
      });
      alert(`✅ Đã thêm cư dân ${fullName} và cấp tài khoản thành công!`);
      onSuccess?.();
    } catch (err) {
      alert('Lỗi thêm cư dân: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: isLight ? '#0f172a' : '#f8fafc',
      background: isLight ? '#f8fafc' : '#0b1120'
    }}>
      {/* ── 1. HEADER CHUẨN NATIVE APP (SÁT MÉP TRÊN) ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: isLight ? '#ffffff' : '#0f172a',
        borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
        padding: '10px 14px',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.05)' : '0 4px 14px rgba(0,0,0,0.25)'
      }}>
        <button
          onClick={onBack}
          title="Quay lại"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: 'none',
            background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isLight ? '#334155' : '#e2e8f0',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Users size={17} color="#ec4899" /> Thêm Cư Dân Mới
          </h2>
          <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>
            Khai báo khách & cấp tài khoản SmartRent
          </div>
        </div>

        <div style={{ width: 36 }} />
      </div>

      {/* ── NỘI DUNG CUỘN CHÍNH ── */}
      <div style={{ padding: '14px 16px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* BƯỚC 1: CHỌN KHU TRỌ */}
        <div style={{
          background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 16,
          padding: '14px 16px'
        }}>
          <label style={{
            fontSize: '12.5px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#ec4899',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 10
          }}>
            <Building2 size={16} /> Bước 1: Chọn Khu Trọ
          </label>

          <select
            value={selectedZoneId}
            onChange={e => setSelectedZoneId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
              background: isLight ? '#f8fafc' : '#1f2937',
              color: isLight ? '#0f172a' : '#fff',
              fontSize: '14px',
              fontWeight: 700,
              outline: 'none'
            }}
          >
            {zones.map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>

        {/* BƯỚC 2: CHỌN PHÒNG */}
        <div style={{
          background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 16,
          padding: '14px 16px'
        }}>
          <label style={{
            fontSize: '12.5px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 10
          }}>
            <DoorClosed size={16} /> Bước 2: Chọn Phòng Tiếp Nhận
          </label>

          <select
            value={selectedRoomId}
            onChange={e => setSelectedRoomId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
              background: isLight ? '#f8fafc' : '#1f2937',
              color: isLight ? '#0f172a' : '#fff',
              fontSize: '14px',
              fontWeight: 700,
              outline: 'none'
            }}
          >
            <option value="">Chưa gán phòng (Khách vãng lai / Đặt cọc)</option>
            {filteredRooms.map(r => (
              <option key={r.id} value={r.id}>
                Phòng {r.roomNumber} ({r.status === 'Vacant' ? 'Phòng trống' : `Đang ở: ${r.currentTenantName || '1 người'}`})
              </option>
            ))}
          </select>
        </div>

        {/* BƯỚC 3: THÔNG TIN KHÁCH THUÊ */}
        <div style={{
          background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 16,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: isLight ? '#475569' : '#94a3b8' }}>
            👤 Thông Tin Cá Nhân Khách Thuê
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Họ và tên (*):
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Nguyễn Văn A"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                fontSize: '15px', fontWeight: 700, boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                Số điện thoại (*):
              </label>
              <input
                type="tel"
                placeholder="0987..."
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                  fontSize: '14px', fontWeight: 700, boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                Số CCCD / CMND:
              </label>
              <input
                type="text"
                placeholder="0012..."
                value={cccd}
                onChange={e => setCccd(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                  fontSize: '14px', fontWeight: 700, boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Email (để nhận hóa đơn & thông báo):
            </label>
            <input
              type="email"
              placeholder="khachthue@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                fontSize: '14px', boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Quê quán / Nơi thường trú:
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Bảo Lộc, Lâm Đồng"
              value={hometown}
              onChange={e => setHometown(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                fontSize: '14px', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Mật khẩu khởi tạo */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4, color: '#ec4899' }}>
              Mật khẩu khởi tạo đăng nhập:
            </label>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: `1.5px solid ${isLight ? '#fbcfe8' : 'rgba(236,72,153,0.3)'}`,
                background: isLight ? '#fdf2f8' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                fontSize: '14px', fontWeight: 700, boxSizing: 'border-box'
              }}
              required
            />
            <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 4 }}>
              Khách dùng SĐT và mật khẩu này để đăng nhập vào app SmartRent
            </div>
          </div>
        </div>

        {/* NÚT TẠO KHÁCH */}
        <button
          type="submit"
          disabled={loading || !fullName.trim() || !phone.trim()}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #ec4899, #db2777)',
            color: '#fff',
            border: 'none',
            fontWeight: 800,
            fontSize: '15px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(236,72,153,0.35)',
            marginTop: 4
          }}
        >
          {loading ? <RefreshCw size={18} className="spin" /> : <Users size={18} />}
          {loading ? 'Đang cấp tài khoản...' : 'Lưu Cư Dân & Cấp Mật Khẩu'}
        </button>
      </form>
      </div>
    </div>
  );
}
