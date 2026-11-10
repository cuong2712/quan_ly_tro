import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, Receipt, Building2, DoorClosed, Calendar,
  DollarSign, CheckCircle2, RefreshCw, Zap, Shield, FileText, User
} from 'lucide-react';
import { invoiceService } from '../../services';
import { formatVND } from '../../utils/formatters';

export function LandlordInvoiceCreateView({
  zones = [],
  rooms = [],
  isLight = false,
  onBack,
  onSuccess
}) {
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id || '');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));

  // Các khoản chi phí
  const [rentAmount, setRentAmount] = useState(3000000);
  const [elecUsage, setElecUsage] = useState(0);
  const [elecCost, setElecCost] = useState(0);
  const [waterUsage, setWaterUsage] = useState(0);
  const [waterCost, setWaterCost] = useState(0);
  const [servicesCost, setServicesCost] = useState(50000);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Lọc phòng theo khu
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => !selectedZoneId || r.zoneId === selectedZoneId || r.ZoneId === selectedZoneId);
  }, [rooms, selectedZoneId]);

  // Tự động chọn phòng đầu tiên khi đổi khu
  useEffect(() => {
    if (filteredRooms.length > 0) {
      const firstRoom = filteredRooms[0];
      setSelectedRoomId(firstRoom.id);
      setRentAmount(firstRoom.price || 3000000);
    } else {
      setSelectedRoomId('');
      setRentAmount(0);
    }
  }, [selectedZoneId, filteredRooms]);

  // Phòng hiện tại đang được chọn
  const currentRoom = useMemo(() => {
    return rooms.find(r => r.id === selectedRoomId);
  }, [rooms, selectedRoomId]);

  // Khi chọn phòng khác
  const handleSelectRoom = (roomId) => {
    setSelectedRoomId(roomId);
    const r = rooms.find(room => room.id === roomId);
    if (r) {
      setRentAmount(r.price || 3000000);
    }
  };

  // Tổng tiền hóa đơn
  const totalAmount = Number(rentAmount || 0) + Number(elecCost || 0) + Number(waterCost || 0) + Number(servicesCost || 0);

  // Xử lý nộp form tạo hóa đơn
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedRoomId) return alert('Vui lòng chọn phòng cần lập hóa đơn');
    if (totalAmount <= 0) return alert('Tổng tiền hóa đơn phải lớn hơn 0');

    setLoading(true);
    try {
      await invoiceService.createInvoice({
        roomId: selectedRoomId,
        month,
        rentAmount: Number(rentAmount),
        electricityUsage: Number(elecUsage),
        electricityCost: Number(elecCost),
        waterUsage: Number(waterUsage),
        waterCost: Number(waterCost),
        servicesCost: Number(servicesCost),
        dueDate,
        note: note.trim() || undefined
      });
      alert(`✅ Đã lập hóa đơn thành công cho phòng ${currentRoom?.roomNumber || ''}!`);
      onSuccess?.();
    } catch (err) {
      alert('Lỗi tạo hóa đơn: ' + (err.response?.data?.message || err.message));
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
            <Receipt size={17} color="#10b981" /> Lập Hóa Đơn Tiền Nhà
          </h2>
          <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>
            Xuất phiếu thu phòng & dịch vụ hàng tháng
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
            color: '#10b981',
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
              <option key={z.id} value={z.id}>
                {z.name} ({rooms.filter(r => r.zoneId === z.id || r.ZoneId === z.id).length} phòng)
              </option>
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
            <DoorClosed size={16} /> Bước 2: Chọn Phòng Cần Lập Hóa Đơn
          </label>

          {filteredRooms.length === 0 ? (
            <div style={{ color: '#ef4444', fontSize: '13px' }}>Khu trọ này chưa có phòng.</div>
          ) : (
            <select
              value={selectedRoomId}
              onChange={e => handleSelectRoom(e.target.value)}
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
              {filteredRooms.map(r => (
                <option key={r.id} value={r.id}>
                  Phòng {r.roomNumber} ({formatVND(r.price)}) — {r.status === 'Rented' ? (r.currentTenantName || 'Đang thuê') : 'Phòng trống'}
                </option>
              ))}
            </select>
          )}

          {currentRoom && (
            <div style={{
              marginTop: 10,
              padding: '8px 12px',
              borderRadius: 8,
              background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)',
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Khách thuê: <strong>{currentRoom.currentTenantName || 'Chưa cập nhật'}</strong></span>
              <span>Trạng thái: <strong>{currentRoom.status === 'Rented' ? 'Đang thuê' : 'Trống'}</strong></span>
            </div>
          )}
        </div>

        {/* BƯỚC 3: CHI TIẾT CÁC KHOẢN TIỀN */}
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
            💵 Chi Tiết Các Khoản Thu
          </div>

          {/* Tiền phòng */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Tiền thuê phòng (VNĐ):
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={rentAmount}
              onChange={e => setRentAmount(e.target.value)}
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

          {/* Tiền điện & Tiền nước */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4, color: '#f59e0b' }}>
                ⚡ Tiền điện (VNĐ):
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={elecCost}
                onChange={e => setElecCost(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid ${isLight ? '#fde68a' : 'rgba(245,158,11,0.3)'}`,
                  background: isLight ? '#fffbeb' : '#1f2937',
                  color: isLight ? '#0f172a' : '#fff',
                  fontSize: '15px',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4, color: '#3b82f6' }}>
                💧 Tiền nước (VNĐ):
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={waterCost}
                onChange={e => setWaterCost(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid ${isLight ? '#bfdbfe' : 'rgba(59,130,246,0.3)'}`,
                  background: isLight ? '#eff6ff' : '#1f2937',
                  color: isLight ? '#0f172a' : '#fff',
                  fontSize: '15px',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Phí dịch vụ khác */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Phí dịch vụ khác (Rác, Wifi, Gửi xe...):
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={servicesCost}
              onChange={e => setServicesCost(e.target.value)}
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

          {/* Kỳ & Hạn thanh toán */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Kỳ thanh toán:</label>
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                  fontSize: '13px', fontWeight: 700, boxSizing: 'border-box'
                }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Hạn đóng tiền:</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                  fontSize: '13px', fontWeight: 700, boxSizing: 'border-box'
                }}
                required
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Ghi chú hóa đơn:</label>
            <input
              type="text"
              placeholder="Ví dụ: Vui lòng thanh toán trước ngày 10 hàng tháng..."
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                fontSize: '13px', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* CARD TỔNG TIỀN NỔI BẬT */}
        <div style={{
          background: isLight
            ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
            : 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(17,24,39,0.95))',
          border: `1.5px solid ${isLight ? '#86efac' : 'rgba(16,185,129,0.4)'}`,
          borderRadius: 18,
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
            Tổng Tiền Hóa Đơn Cần Thu
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#10b981', marginTop: 4 }}>
            {formatVND(totalAmount)}
          </div>
          <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 4 }}>
            Phòng {currentRoom?.roomNumber || '...'} • Kỳ {month}
          </div>
        </div>

        {/* NÚT XUẤT HÓA ĐƠN */}
        <button
          type="submit"
          disabled={loading || totalAmount <= 0}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            border: 'none',
            fontWeight: 800,
            fontSize: '15px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
            marginTop: 4
          }}
        >
          {loading ? <RefreshCw size={18} className="spin" /> : <Receipt size={18} />}
          {loading ? 'Đang xuất hóa đơn...' : 'Xuất Hóa Đơn & Gửi Khách'}
        </button>
      </form>
      </div>
    </div>
  );
}
