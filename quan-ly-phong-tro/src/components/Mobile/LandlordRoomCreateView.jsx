import React, { useState } from 'react';
import {
  ArrowLeft, Building2, DoorClosed, Plus, RefreshCw,
  DollarSign, Maximize2, Users, Zap, CheckCircle2
} from 'lucide-react';
import { roomService } from '../../services';
import { formatVND } from '../../utils/formatters';

const POPULAR_AMENITIES = [
  'Máy lạnh', 'Bình nóng lạnh', 'Tủ lạnh', 'Gác lửng',
  'Ban công', 'Máy giặt', 'Tủ quần áo', 'Giường nệm', 'Bếp nấu'
];

export function LandlordRoomCreateView({
  zones = [],
  isLight = false,
  onBack,
  onSuccess
}) {
  const [zoneId, setZoneId] = useState(zones[0]?.id || '');
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState(1);
  const [price, setPrice] = useState(3000000);
  const [area, setArea] = useState(25);
  const [maxTenants, setMaxTenants] = useState(2);
  const [status, setStatus] = useState('Vacant');
  const [elecMeter, setElecMeter] = useState(0);
  const [waterMeter, setWaterMeter] = useState(0);
  const [selectedAmenities, setSelectedAmenities] = useState(['Máy lạnh', 'Bình nóng lạnh']);
  const [loading, setLoading] = useState(false);

  const toggleAmenity = (item) => {
    if (selectedAmenities.includes(item)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== item));
    } else {
      setSelectedAmenities([...selectedAmenities, item]);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!roomNumber.trim()) return alert('Vui lòng nhập số/tên phòng');

    setLoading(true);
    try {
      await roomService.createRoom({
        zoneId: zoneId || zones[0]?.id,
        roomNumber: roomNumber.trim(),
        floor: Number(floor) || 1,
        price: Number(price),
        area: Number(area),
        maxRenters: Number(maxTenants),
        status,
        elecMeter: Number(elecMeter),
        waterMeter: Number(waterMeter),
        amenities: selectedAmenities.join(', ')
      });
      alert(`✅ Đã tạo phòng ${roomNumber} thành công!`);
      onSuccess?.();
    } catch (err) {
      alert('Lỗi tạo phòng: ' + (err.response?.data?.message || err.message));
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
            <DoorClosed size={17} color="#3b82f6" /> Thêm Phòng Trọ Mới
          </h2>
          <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>
            Khởi tạo phòng và thiết lập giá cho thuê
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
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 10
          }}>
            <Building2 size={16} /> Bước 1: Chọn Khu Trọ
          </label>

          <select
            value={zoneId}
            onChange={e => setZoneId(e.target.value)}
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

        {/* BƯỚC 2: THÔNG TIN PHÒNG */}
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
            🚪 Thông Tin Chi Tiết Phòng
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                Số / Tên phòng (*):
              </label>
              <input
                type="text"
                placeholder="Ví dụ: P.205"
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  background: isLight ? '#f8fafc' : '#1f2937',
                  color: isLight ? '#0f172a' : '#fff',
                  fontSize: '15px',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                Tầng:
              </label>
              <input
                type="number"
                value={floor}
                onChange={e => setFloor(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  background: isLight ? '#f8fafc' : '#1f2937',
                  color: isLight ? '#0f172a' : '#fff',
                  fontSize: '15px',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Giá thuê */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Giá thuê niêm yết (VNĐ/tháng):
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={price}
              onChange={e => setPrice(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                background: isLight ? '#f8fafc' : '#1f2937',
                color: isLight ? '#0f172a' : '#fff',
                fontSize: '16px',
                fontWeight: 800,
                boxSizing: 'border-box'
              }}
              required
            />
            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, marginTop: 4 }}>
              = {formatVND(price || 0)} / tháng
            </div>
          </div>

          {/* Diện tích & Sức chứa */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                Diện tích (m²):
              </label>
              <input
                type="number"
                value={area}
                onChange={e => setArea(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  background: isLight ? '#f8fafc' : '#1f2937',
                  color: isLight ? '#0f172a' : '#fff',
                  fontSize: '14px',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                Sức chứa (người):
              </label>
              <input
                type="number"
                value={maxTenants}
                onChange={e => setMaxTenants(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  background: isLight ? '#f8fafc' : '#1f2937',
                  color: isLight ? '#0f172a' : '#fff',
                  fontSize: '14px',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Chỉ số công tơ ban đầu */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: 4, color: '#f59e0b' }}>
                ⚡ Số điện ban đầu:
              </label>
              <input
                type="number"
                value={elecMeter}
                onChange={e => setElecMeter(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                  fontSize: '14px', fontWeight: 700, boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: 4, color: '#3b82f6' }}>
                💧 Số nước ban đầu:
              </label>
              <input
                type="number"
                value={waterMeter}
                onChange={e => setWaterMeter(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                  fontSize: '14px', fontWeight: 700, boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Tiện ích phòng */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Tiện ích phòng có sẵn:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {POPULAR_AMENITIES.map(amenity => {
                const isSelected = selectedAmenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 16,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: isSelected ? '#3b82f6' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)'),
                      color: isSelected ? '#fff' : (isLight ? '#475569' : '#cbd5e1')
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '}{amenity}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* NÚT TẠO PHÒNG */}
        <button
          type="submit"
          disabled={loading || !roomNumber.trim()}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff',
            border: 'none',
            fontWeight: 800,
            fontSize: '15px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
            marginTop: 4
          }}
        >
          {loading ? <RefreshCw size={18} className="spin" /> : <Plus size={18} />}
          {loading ? 'Đang khởi tạo...' : 'Lưu Phòng Trọ Mới'}
        </button>
      </form>
      </div>
    </div>
  );
}
