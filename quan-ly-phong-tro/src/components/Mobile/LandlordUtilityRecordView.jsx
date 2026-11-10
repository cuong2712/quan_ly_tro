import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, Zap, Building2, DoorClosed, AlertCircle, CheckCircle2,
  Calendar, DollarSign, FileSpreadsheet, RefreshCw, Info, AlertTriangle
} from 'lucide-react';
import { utilityService } from '../../services';
import { formatVND } from '../../utils/formatters';

export function LandlordUtilityRecordView({
  zones = [],
  rooms = [],
  rateForm = { electricityRate: 3500, waterRate: 20000 },
  isLight = false,
  onBack,
  onSuccess
}) {
  // Chế độ: 'single' (Chốt từng phòng) | 'bulk' (Chốt hàng loạt cả khu)
  const [recordMode, setRecordMode] = useState('single');

  // ── 1. STATE CHỐT TỪNG PHÒNG ──
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id || '');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [recordMonth, setRecordMonth] = useState(new Date().toISOString().slice(0, 7));
  const [newElecInput, setNewElecInput] = useState('');
  const [newWaterInput, setNewWaterInput] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // ── 2. STATE CHỐT HÀNG LOẠT CẢ KHU ──
  const [bulkInputs, setBulkInputs] = useState({});

  // Lọc các phòng theo khu đã chọn
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => !selectedZoneId || r.zoneId === selectedZoneId || r.ZoneId === selectedZoneId);
  }, [rooms, selectedZoneId]);

  // Tự động chọn phòng đầu tiên khi đổi khu
  useEffect(() => {
    if (filteredRooms.length > 0) {
      const firstRoom = filteredRooms[0];
      setSelectedRoomId(firstRoom.id);
      setNewElecInput(String(firstRoom.elecMeter || 0));
      setNewWaterInput(String(firstRoom.waterMeter || 0));
    } else {
      setSelectedRoomId('');
      setNewElecInput('');
      setNewWaterInput('');
    }
  }, [selectedZoneId, filteredRooms]);

  // Phòng hiện tại đang được chọn
  const currentRoom = useMemo(() => {
    return rooms.find(r => r.id === selectedRoomId);
  }, [rooms, selectedRoomId]);

  // Khi người dùng chọn phòng khác từ dropdown
  const handleSelectRoom = (roomId) => {
    setSelectedRoomId(roomId);
    const r = rooms.find(room => room.id === roomId);
    if (r) {
      setNewElecInput(String(r.elecMeter || 0));
      setNewWaterInput(String(r.waterMeter || 0));
    }
  };

  // Khởi tạo bảng nhập hàng loạt khi vào chế độ bulk hoặc đổi khu
  useEffect(() => {
    if (recordMode === 'bulk') {
      const initialMap = {};
      filteredRooms.forEach(r => {
        initialMap[r.id] = {
          newElec: String(r.elecMeter || 0),
          newWater: String(r.waterMeter || 0)
        };
      });
      setBulkInputs(initialMap);
    }
  }, [recordMode, filteredRooms]);

  // Chỉ số cũ
  const oldElec = currentRoom ? Number(currentRoom.elecMeter || 0) : 0;
  const oldWater = currentRoom ? Number(currentRoom.waterMeter || 0) : 0;

  // Chỉ số mới
  const numNewElec = newElecInput === '' ? oldElec : Number(newElecInput);
  const numNewWater = newWaterInput === '' ? oldWater : Number(newWaterInput);

  // Tiêu thụ
  const elecUsed = Math.max(0, numNewElec - oldElec);
  const waterUsed = Math.max(0, numNewWater - oldWater);

  // Đơn giá
  const elecPrice = Number(rateForm.electricityRate) || 3500;
  const waterPrice = Number(rateForm.waterRate) || 20000;

  // Thành tiền tạm tính
  const elecCost = elecUsed * elecPrice;
  const waterCost = waterUsed * waterPrice;
  const totalCost = elecCost + waterCost;

  // Kiểm tra tính hợp lệ
  const isElecInvalid = numNewElec < oldElec;
  const isWaterInvalid = numNewWater < oldWater;

  // Lưu chỉ số từng phòng
  const handleSubmitSingle = async (e) => {
    e?.preventDefault();
    if (!selectedRoomId) return alert('Vui lòng chọn phòng cần chốt số');
    if (isElecInvalid) return alert(`Số điện mới (${numNewElec}) không được nhỏ hơn số điện cũ (${oldElec})`);
    if (isWaterInvalid) return alert(`Số nước mới (${numNewWater}) không được nhỏ hơn số nước cũ (${oldWater})`);

    setLoading(true);
    try {
      await utilityService.record({
        roomId: selectedRoomId,
        month: recordMonth,
        newElec: numNewElec,
        newWater: numNewWater,
        notes: notes.trim() || undefined
      });
      alert(`✅ Đã chốt số điện nước phòng ${currentRoom?.roomNumber || ''} thành công!`);
      onSuccess?.();
    } catch (err) {
      alert('Lỗi chốt số: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Lưu hàng loạt cả khu
  const handleSubmitBulk = async (e) => {
    e?.preventDefault();
    if (filteredRooms.length === 0) return alert('Khu này chưa có phòng nào để chốt');

    const items = [];
    for (const r of filteredRooms) {
      const inputs = bulkInputs[r.id] || {};
      const newE = Number(inputs.newElec ?? r.elecMeter);
      const newW = Number(inputs.newWater ?? r.waterMeter);

      if (newE < (r.elecMeter || 0)) {
        return alert(`Phòng ${r.roomNumber}: Số điện mới (${newE}) nhỏ hơn số cũ (${r.elecMeter || 0})`);
      }
      if (newW < (r.waterMeter || 0)) {
        return alert(`Phòng ${r.roomNumber}: Số nước mới (${newW}) nhỏ hơn số cũ (${r.waterMeter || 0})`);
      }

      items.push({
        roomId: r.id,
        roomNumber: r.roomNumber,
        zoneName: r.zoneName,
        newElec: newE,
        newWater: newW
      });
    }

    setLoading(true);
    try {
      await utilityService.bulkRecord({
        month: recordMonth,
        items
      });
      alert(`✅ Đã lưu chỉ số hàng loạt cho ${items.length} phòng thành công!`);
      onSuccess?.();
    } catch (err) {
      alert('Lỗi chốt số hàng loạt: ' + (err.response?.data?.message || err.message));
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
            <Zap size={17} color="#f59e0b" /> Chốt Số Điện & Nước
          </h2>
          <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>
            {recordMode === 'single' ? 'Ghi chỉ số từng phòng' : 'Ghi chỉ số nhanh cả khu'}
          </div>
        </div>

        <div style={{ width: 36 }} />
      </div>

      {/* ── NỘI DUNG CUỘN CHÍNH ── */}
      <div style={{ padding: '14px 16px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* ── 2. NÚT CHUYỂN CHẾ ĐỘ: TỪNG PHÒNG / CẢ KHU ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: 4,
        gap: 4
      }}>
        <button
          type="button"
          onClick={() => setRecordMode('single')}
          style={{
            padding: '8px 12px',
            borderRadius: 9,
            border: 'none',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            background: recordMode === 'single' ? (isLight ? '#ffffff' : '#1e293b') : 'transparent',
            color: recordMode === 'single' ? '#f59e0b' : (isLight ? '#64748b' : '#94a3b8'),
            boxShadow: recordMode === 'single' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <Zap size={14} /> Chốt Từng Phòng
        </button>
        <button
          type="button"
          onClick={() => setRecordMode('bulk')}
          style={{
            padding: '8px 12px',
            borderRadius: 9,
            border: 'none',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            background: recordMode === 'bulk' ? (isLight ? '#ffffff' : '#1e293b') : 'transparent',
            color: recordMode === 'bulk' ? '#f59e0b' : (isLight ? '#64748b' : '#94a3b8'),
            boxShadow: recordMode === 'bulk' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <FileSpreadsheet size={14} /> Chốt Nhanh Cả Khu
        </button>
      </div>

      {/* ── BƯỚC 1: CHỌN KHU TRỌ (ZONE) ── */}
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
          color: '#f59e0b',
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

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ──────── CHẾ ĐỘ 1: CHỐT TỪNG PHÒNG (CHI TIẾT, DỄ NHÌN) ─── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {recordMode === 'single' && (
        <form onSubmit={handleSubmitSingle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              <DoorClosed size={16} /> Bước 2: Chọn Phòng Cần Chốt
            </label>

            {filteredRooms.length === 0 ? (
              <div style={{ color: '#ef4444', fontSize: '13px', padding: '6px 0' }}>
                Khu trọ này chưa có phòng nào. Vui lòng thêm phòng trước.
              </div>
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
                    Phòng {r.roomNumber} — {r.status === 'Rented' ? `Đang thuê (${r.currentTenantName || 'Cư dân'})` : 'Phòng trống'}
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
                color: isLight ? '#64748b' : '#94a3b8',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Giá thuê: <strong>{formatVND(currentRoom.price || 0)}</strong></span>
                <span>Trạng thái: <strong style={{ color: currentRoom.status === 'Rented' ? '#10b981' : '#f59e0b' }}>{currentRoom.status === 'Rented' ? 'Đang thuê' : 'Trống'}</strong></span>
              </div>
            )}
          </div>

          {/* BƯỚC 3: CHỈ SỐ ĐIỆN VÀ NƯỚC (CŨ & MỚI) */}
          {currentRoom && (
            <>
              {/* CARD ĐIỆN */}
              <div style={{
                background: isLight
                  ? 'linear-gradient(135deg, #ffffff, #fffbeb)'
                  : 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(17,24,39,0.9))',
                border: `1.5px solid ${isLight ? '#fde68a' : 'rgba(245,158,11,0.3)'}`,
                borderRadius: 18,
                padding: '16px',
                boxShadow: isLight ? '0 4px 14px rgba(245,158,11,0.08)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '14px', color: '#f59e0b' }}>
                    <Zap size={18} /> ĐỒNG HỒ ĐIỆN (kWh)
                  </div>
                  <span style={{ fontSize: '11px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                    Đơn giá: {formatVND(elecPrice)}/kWh
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Số cũ */}
                  <div style={{
                    background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.25)',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 12,
                    padding: '10px 12px'
                  }}>
                    <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 600 }}>
                      Số điện cũ (kỳ trước)
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: isLight ? '#334155' : '#e2e8f0', marginTop: 4 }}>
                      {oldElec} <span style={{ fontSize: '12px', fontWeight: 600 }}>kWh</span>
                    </div>
                  </div>

                  {/* Số mới */}
                  <div style={{
                    background: isLight ? '#ffffff' : 'rgba(0,0,0,0.35)',
                    border: `1.5px solid ${isElecInvalid ? '#ef4444' : '#f59e0b'}`,
                    borderRadius: 12,
                    padding: '10px 12px'
                  }}>
                    <div style={{ fontSize: '11px', color: isElecInvalid ? '#ef4444' : '#f59e0b', fontWeight: 800 }}>
                      Số điện mới (*)
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={newElecInput}
                      onChange={e => setNewElecInput(e.target.value)}
                      placeholder={String(oldElec)}
                      style={{
                        width: '100%',
                        fontSize: '20px',
                        fontWeight: 800,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: isLight ? '#0f172a' : '#fff',
                        marginTop: 4
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Kết quả tính tức thì */}
                <div style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: `1px dashed ${isLight ? '#fde68a' : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12.5px'
                }}>
                  {isElecInvalid ? (
                    <span style={{ color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={14} /> Số mới nhỏ hơn số cũ ({oldElec})!
                    </span>
                  ) : (
                    <>
                      <span>Tiêu thụ: <strong style={{ color: '#f59e0b' }}>{elecUsed} kWh</strong></span>
                      <span>Thành tiền: <strong style={{ color: '#f59e0b' }}>{formatVND(elecCost)}</strong></span>
                    </>
                  )}
                </div>
              </div>

              {/* CARD NƯỚC */}
              <div style={{
                background: isLight
                  ? 'linear-gradient(135deg, #ffffff, #eff6ff)'
                  : 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(17,24,39,0.9))',
                border: `1.5px solid ${isLight ? '#bfdbfe' : 'rgba(59,130,246,0.3)'}`,
                borderRadius: 18,
                padding: '16px',
                boxShadow: isLight ? '0 4px 14px rgba(59,130,246,0.08)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '14px', color: '#3b82f6' }}>
                    💧 ĐỒNG HỒ NƯỚC (m³)
                  </div>
                  <span style={{ fontSize: '11px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                    Đơn giá: {formatVND(waterPrice)}/m³
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Số cũ */}
                  <div style={{
                    background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.25)',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 12,
                    padding: '10px 12px'
                  }}>
                    <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 600 }}>
                      Số nước cũ (kỳ trước)
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: isLight ? '#334155' : '#e2e8f0', marginTop: 4 }}>
                      {oldWater} <span style={{ fontSize: '12px', fontWeight: 600 }}>m³</span>
                    </div>
                  </div>

                  {/* Số mới */}
                  <div style={{
                    background: isLight ? '#ffffff' : 'rgba(0,0,0,0.35)',
                    border: `1.5px solid ${isWaterInvalid ? '#ef4444' : '#3b82f6'}`,
                    borderRadius: 12,
                    padding: '10px 12px'
                  }}>
                    <div style={{ fontSize: '11px', color: isWaterInvalid ? '#ef4444' : '#3b82f6', fontWeight: 800 }}>
                      Số nước mới (*)
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={newWaterInput}
                      onChange={e => setNewWaterInput(e.target.value)}
                      placeholder={String(oldWater)}
                      style={{
                        width: '100%',
                        fontSize: '20px',
                        fontWeight: 800,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: isLight ? '#0f172a' : '#fff',
                        marginTop: 4
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Kết quả tính tức thì */}
                <div style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: `1px dashed ${isLight ? '#bfdbfe' : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12.5px'
                }}>
                  {isWaterInvalid ? (
                    <span style={{ color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={14} /> Số mới nhỏ hơn số cũ ({oldWater})!
                    </span>
                  ) : (
                    <>
                      <span>Tiêu thụ: <strong style={{ color: '#3b82f6' }}>{waterUsed} m³</strong></span>
                      <span>Thành tiền: <strong style={{ color: '#3b82f6' }}>{formatVND(waterCost)}</strong></span>
                    </>
                  )}
                </div>
              </div>

              {/* TỔNG HỢP & KỲ CHỐT */}
              <div style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 16,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: 4, color: isLight ? '#64748b' : '#94a3b8' }}>
                      Kỳ chốt hóa đơn:
                    </label>
                    <input
                      type="month"
                      value={recordMonth}
                      onChange={e => setRecordMonth(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: isLight ? '#f8fafc' : '#1f2937',
                        color: isLight ? '#0f172a' : '#fff',
                        border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                        boxSizing: 'border-box',
                        fontSize: '13px',
                        fontWeight: 700
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: 4, color: isLight ? '#64748b' : '#94a3b8' }}>
                      Tổng tiền điện + nước:
                    </label>
                    <div style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: 'rgba(16,185,129,0.12)',
                      color: '#10b981',
                      fontSize: '15px',
                      fontWeight: 800,
                      textAlign: 'center'
                    }}>
                      {formatVND(totalCost)}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: 4, color: isLight ? '#64748b' : '#94a3b8' }}>
                    Ghi chú (tùy chọn):
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Đã thay đồng hồ mới ngày 05/11..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: isLight ? '#f8fafc' : '#1f2937',
                      color: isLight ? '#0f172a' : '#fff',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      boxSizing: 'border-box',
                      fontSize: '12.5px'
                    }}
                  />
                </div>
              </div>

              {/* NÚT LƯU TO RÕ BẤM THOẢI MÁI */}
              <button
                type="submit"
                disabled={loading || isElecInvalid || isWaterInvalid}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 14,
                  background: (isElecInvalid || isWaterInvalid)
                    ? (isLight ? '#cbd5e1' : '#334155')
                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '15px',
                  cursor: (isElecInvalid || isWaterInvalid || loading) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: (isElecInvalid || isWaterInvalid) ? 'none' : '0 4px 14px rgba(245,158,11,0.35)',
                  marginTop: 6
                }}
              >
                {loading ? <RefreshCw size={18} className="spin" /> : <Zap size={18} />}
                {loading ? 'Đang lưu chỉ số...' : 'Lưu Chỉ Số & Tự Xuất Hóa Đơn'}
              </button>
            </>
          )}
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ──────── CHẾ ĐỘ 2: CHỐT NHANH CẢ KHU (BULK RECORD) ───────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {recordMode === 'bulk' && (
        <form onSubmit={handleSubmitBulk} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
            border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 16,
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800 }}>Kỳ ghi nhận:</div>
              <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Áp dụng cho toàn bộ {filteredRooms.length} phòng</div>
            </div>
            <input
              type="month"
              value={recordMonth}
              onChange={e => setRecordMonth(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: isLight ? '#f8fafc' : '#1f2937',
                color: isLight ? '#0f172a' : '#fff',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                fontSize: '13px',
                fontWeight: 700
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredRooms.map(r => {
              const inputs = bulkInputs[r.id] || { newElec: r.elecMeter || 0, newWater: r.waterMeter || 0 };
              const oldE = r.elecMeter || 0;
              const oldW = r.waterMeter || 0;
              const curE = Number(inputs.newElec);
              const curW = Number(inputs.newWater);
              const usedE = Math.max(0, curE - oldE);
              const usedW = Math.max(0, curW - oldW);
              const roomTotal = (usedE * elecPrice) + (usedW * waterPrice);

              return (
                <div
                  key={r.id}
                  style={{
                    background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 14,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>
                      Phòng {r.roomNumber}
                      <span style={{ fontSize: '11px', fontWeight: 600, color: isLight ? '#64748b' : '#94a3b8', marginLeft: 6 }}>
                        ({r.status === 'Rented' ? (r.currentTenantName || 'Đang thuê') : 'Trống'})
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981' }}>
                      +{formatVND(roomTotal)}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {/* Nhập điện */}
                    <div style={{
                      background: isLight ? '#fffbeb' : 'rgba(245,158,11,0.06)',
                      borderRadius: 10, padding: '8px 10px',
                      border: `1px solid ${curE < oldE ? '#ef4444' : (isLight ? '#fde68a' : 'rgba(245,158,11,0.2)')}`
                    }}>
                      <div style={{ fontSize: '10.5px', color: '#f59e0b', fontWeight: 800 }}>⚡ Điện (cũ: {oldE})</div>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={inputs.newElec}
                        onChange={e => {
                          setBulkInputs({
                            ...bulkInputs,
                            [r.id]: { ...inputs, newElec: e.target.value }
                          });
                        }}
                        style={{
                          width: '100%',
                          fontSize: '16px',
                          fontWeight: 800,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: isLight ? '#0f172a' : '#fff',
                          marginTop: 2
                        }}
                      />
                    </div>

                    {/* Nhập nước */}
                    <div style={{
                      background: isLight ? '#eff6ff' : 'rgba(59,130,246,0.06)',
                      borderRadius: 10, padding: '8px 10px',
                      border: `1px solid ${curW < oldW ? '#ef4444' : (isLight ? '#bfdbfe' : 'rgba(59,130,246,0.2)')}`
                    }}>
                      <div style={{ fontSize: '10.5px', color: '#3b82f6', fontWeight: 800 }}>💧 Nước (cũ: {oldW})</div>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={inputs.newWater}
                        onChange={e => {
                          setBulkInputs({
                            ...bulkInputs,
                            [r.id]: { ...inputs, newWater: e.target.value }
                          });
                        }}
                        style={{
                          width: '100%',
                          fontSize: '16px',
                          fontWeight: 800,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: isLight ? '#0f172a' : '#fff',
                          marginTop: 2
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={loading || filteredRooms.length === 0}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff',
              border: 'none',
              fontWeight: 800,
              fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
              marginTop: 6
            }}
          >
            {loading ? <RefreshCw size={18} className="spin" /> : <CheckCircle2 size={18} />}
            {loading ? 'Đang lưu hàng loạt...' : `Lưu Số Hàng Loạt (${filteredRooms.length} phòng)`}
          </button>
        </form>
      )}
      </div>
    </div>
  );
}
