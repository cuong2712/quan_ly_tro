import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Plus, Settings, Wifi, Bike, Trash, ShieldCheck,
  Edit, Trash2, Check, RefreshCw, X, AlertCircle, Building2,
  DollarSign, CheckCircle2, Sparkles, SlidersHorizontal
} from 'lucide-react';
import { serviceMgmtService } from '../../services';
import { formatVND } from '../../utils/formatters';

const PRESET_SERVICES = [
  { name: 'Wifi Internet Tốc Độ Cao', price: 100000, unit: 'phòng/tháng', icon: 'Wifi' },
  { name: 'Thu Gom Rác & Vệ Sinh', price: 50000, unit: 'phòng/tháng', icon: 'Trash' },
  { name: 'Phí Gửi Xe Máy', price: 120000, unit: 'xe/tháng', icon: 'Bike' },
  { name: 'Thang Máy & Bảo Vệ 24/7', price: 50000, unit: 'người/tháng', icon: 'ShieldCheck' },
  { name: 'Nước Sinh Hoạt (Khoán)', price: 100000, unit: 'người/tháng', icon: 'Settings' }
];

export function LandlordServiceMgmtView({
  zones = [],
  isLight = false,
  onBack,
  onRefreshParent
}) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState('all');

  // Modal Thêm / Sửa dịch vụ
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: 100000,
    unit: 'phòng/tháng',
    icon: 'Settings',
    isActive: true,
    zoneId: ''
  });

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const zId = selectedZoneId === 'all' ? null : selectedZoneId;
      const res = await serviceMgmtService.getServices(zId);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setServices(list);
    } catch (err) {
      console.error('Lỗi tải danh mục dịch vụ:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedZoneId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'Wifi':
        return <Wifi size={18} color="#6366f1" />;
      case 'Bike':
        return <Bike size={18} color="#10b981" />;
      case 'Trash':
        return <Trash size={18} color="#ef4444" />;
      case 'ShieldCheck':
        return <ShieldCheck size={18} color="#f59e0b" />;
      default:
        return <Settings size={18} color="#3b82f6" />;
    }
  };

  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({
      name: '',
      price: 100000,
      unit: 'phòng/tháng',
      icon: 'Settings',
      isActive: true,
      zoneId: selectedZoneId === 'all' ? '' : selectedZoneId
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingService(s);
    setFormData({
      name: s.name || '',
      price: s.price || 0,
      unit: s.unit || 'phòng/tháng',
      icon: s.icon || 'Settings',
      isActive: s.isActive !== false,
      zoneId: s.zoneId || ''
    });
    setIsModalOpen(true);
  };

  const handleApplyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      name: preset.name,
      price: preset.price,
      unit: preset.unit,
      icon: preset.icon
    }));
  };

  const handleDelete = async (s) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa dịch vụ "${s.name}"?`)) {
      try {
        setLoading(true);
        await serviceMgmtService.deleteService(s.id);
        setServices(prev => prev.filter(item => item.id !== s.id));
        onRefreshParent?.();
      } catch (err) {
        alert('Lỗi xóa dịch vụ: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên dịch vụ!');
      return;
    }
    if (formData.price < 0) {
      alert('Đơn giá không được âm!');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        price: Number(formData.price),
        unit: formData.unit,
        icon: formData.icon || 'Settings',
        isActive: formData.isActive,
        zoneId: formData.zoneId ? formData.zoneId : null
      };

      if (editingService) {
        await serviceMgmtService.updateService(editingService.id, payload);
      } else {
        await serviceMgmtService.createService(payload);
      }

      setIsModalOpen(false);
      loadServices();
      onRefreshParent?.();
    } catch (err) {
      alert('Lỗi lưu dịch vụ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
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
      {/* ── 1. HEADER NATIVE APP ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: isLight ? '#ffffff' : '#0f172a',
        borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.05)' : '0 4px 14px rgba(0,0,0,0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              cursor: 'pointer',
              color: isLight ? '#0f172a' : '#fff'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: isLight ? '#0f172a' : '#fff' }}>
              Biểu Phí & Dịch Vụ
            </h2>
            <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>
              Wifi, Rác, Gửi xe, Thang máy... ({services.length} dịch vụ)
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
          }}
        >
          <Plus size={15} />
          <span>Thêm Dịch Vụ</span>
        </button>
      </div>

      {/* ── 2. BỘ LỌC THEO KHU TRỌ ── */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}`,
        background: isLight ? '#ffffff' : '#111827',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setSelectedZoneId('all')}
          style={{
            padding: '6px 12px',
            borderRadius: 20,
            fontSize: '12px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            border: 'none',
            cursor: 'pointer',
            background: selectedZoneId === 'all' ? '#6366f1' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)'),
            color: selectedZoneId === 'all' ? '#fff' : (isLight ? '#475569' : '#94a3b8')
          }}
        >
          🏢 Tất cả khu trọ ({zones.length})
        </button>

        {zones.map(z => (
          <button
            key={z.id}
            onClick={() => setSelectedZoneId(z.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: '12px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              border: 'none',
              cursor: 'pointer',
              background: selectedZoneId === z.id ? '#6366f1' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)'),
              color: selectedZoneId === z.id ? '#fff' : (isLight ? '#475569' : '#94a3b8')
            }}
          >
            {z.name}
          </button>
        ))}
      </div>

      {/* ── 3. DANH SÁCH DỊCH VỤ ── */}
      <div style={{ flex: 1, padding: '16px 14px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px' }}>Đang tải danh mục dịch vụ...</div>
          </div>
        ) : services.length === 0 ? (
          <div style={{
            padding: '36px 16px', textAlign: 'center',
            background: isLight ? '#ffffff' : '#111827',
            borderRadius: 16, border: `1px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`
          }}>
            <Settings size={36} color="#6366f1" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>Chưa có biểu phí dịch vụ nào</h4>
            <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
              Thêm các khoản phí như Wifi, Rác, Gửi xe để tự động tính vào hóa đơn hàng tháng.
            </p>
            <button
              onClick={handleOpenAdd}
              style={{
                background: '#6366f1', color: '#fff', border: 'none',
                borderRadius: 10, padding: '9px 16px', fontSize: '13px',
                fontWeight: 700, cursor: 'pointer'
              }}
            >
              + Tạo Dịch Vụ Đầu Tiên
            </button>
          </div>
        ) : (
          services.map(s => {
            const isSpecificZone = !!s.zoneId;
            const zoneName = s.zoneName || zones.find(z => z.id === s.zoneId)?.name || 'Tất cả khu trọ';

            return (
              <div
                key={s.id}
                style={{
                  background: isLight ? '#ffffff' : '#111827',
                  border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 16,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.04)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {renderIcon(s.icon)}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 750, color: isLight ? '#0f172a' : '#fff' }}>
                        {s.name}
                      </span>
                      {s.isActive === false && (
                        <span style={{ fontSize: '10px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                          Tạm ngưng
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#10b981' }}>
                        {formatVND(s.price)}
                        <span style={{ fontSize: '11px', fontWeight: 500, color: isLight ? '#64748b' : '#94a3b8' }}>
                          /{s.unit || 'tháng'}
                        </span>
                      </span>

                      <span style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8', background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 6 }}>
                        📍 {isSpecificZone ? zoneName : 'Tất cả khu'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => handleOpenEdit(s)}
                    title="Chỉnh sửa dịch vụ"
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: 'none', background: isLight ? '#eff6ff' : 'rgba(59,130,246,0.15)',
                      color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Edit size={14} />
                  </button>

                  <button
                    onClick={() => handleDelete(s)}
                    title="Xóa dịch vụ"
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: 'none', background: isLight ? '#fef2f2' : 'rgba(239,68,68,0.15)',
                      color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 4. MODAL THÊM / SỬA DỊCH VỤ ── */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
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
              padding: '18px 20px 28px',
              maxHeight: '90%', overflowY: 'auto',
              width: '100%', maxWidth: 520, margin: '0 auto', boxSizing: 'border-box'
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: isLight ? '#cbd5e1' : '#4b5563', margin: '0 auto 14px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: isLight ? '#0f172a' : '#fff' }}>
                {editingService ? `✏️ Sửa Dịch Vụ: ${editingService.name}` : '➕ Thêm Khoản Phí Dịch Vụ Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: isLight ? '#64748b' : '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Gợi ý mẫu nhanh nếu đang thêm mới */}
            {!editingService && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: isLight ? '#64748b' : '#94a3b8', marginBottom: 6 }}>
                  Chọn mẫu phí phổ biến:
                </div>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                  {PRESET_SERVICES.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      style={{
                        padding: '6px 10px', borderRadius: 8,
                        background: isLight ? '#f1f5f9' : '#1f2937',
                        border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)'}`,
                        color: isLight ? '#0f172a' : '#fff',
                        fontSize: '11.5px', fontWeight: 650, whiteSpace: 'nowrap', cursor: 'pointer'
                      }}
                    >
                      {p.name.split(' ')[0]} ({formatVND(p.price)})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Tên dịch vụ: <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Tiền rác vệ sinh, Wifi internet, Gửi xe..."
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    background: isLight ? '#f8fafc' : '#1f2937',
                    color: isLight ? '#0f172a' : '#fff',
                    border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                    boxSizing: 'border-box', fontSize: '13.5px'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Đơn giá (VNĐ): <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="5000"
                    min="0"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    placeholder="100000"
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      background: isLight ? '#f8fafc' : '#1f2937',
                      color: isLight ? '#0f172a' : '#fff',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      boxSizing: 'border-box', fontSize: '14px', fontWeight: 700
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Đơn vị tính:
                  </label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 10px', borderRadius: 10,
                      background: isLight ? '#f8fafc' : '#1f2937',
                      color: isLight ? '#0f172a' : '#fff',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      boxSizing: 'border-box', fontSize: '13px'
                    }}
                  >
                    <option value="phòng/tháng">phòng/tháng</option>
                    <option value="người/tháng">người/tháng</option>
                    <option value="xe/tháng">xe/tháng</option>
                    <option value="m³">m³ (nước)</option>
                    <option value="kWh">kWh (điện)</option>
                    <option value="lần">lần</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Áp dụng cho khu trọ:
                </label>
                <select
                  value={formData.zoneId}
                  onChange={e => setFormData({ ...formData, zoneId: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    background: isLight ? '#f8fafc' : '#1f2937',
                    color: isLight ? '#0f172a' : '#fff',
                    border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                    boxSizing: 'border-box', fontSize: '13px'
                  }}
                >
                  <option value="">🏢 Tất cả các khu trọ</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Biểu tượng Icon:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {[
                    { id: 'Wifi', label: 'Wifi', icon: Wifi },
                    { id: 'Trash', label: 'Rác', icon: Trash },
                    { id: 'Bike', label: 'Xe máy', icon: Bike },
                    { id: 'ShieldCheck', label: 'An ninh', icon: ShieldCheck },
                    { id: 'Settings', label: 'Khác', icon: Settings },
                  ].map(item => {
                    const Icon = item.icon;
                    const isSel = formData.icon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: item.id })}
                        style={{
                          padding: '8px 4px', borderRadius: 8,
                          border: isSel ? '2px solid #6366f1' : `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                          background: isSel ? 'rgba(99,102,241,0.15)' : 'transparent',
                          color: isLight ? '#0f172a' : '#fff',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer'
                        }}
                      >
                        <Icon size={16} color={isSel ? '#6366f1' : (isLight ? '#64748b' : '#94a3b8')} />
                        <span style={{ fontSize: '10px', fontWeight: 600 }}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '13px', fontWeight: 650 }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: '#10b981' }}
                  />
                  <span>Đang kích hoạt áp dụng</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                    background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                    color: isLight ? '#64748b' : '#94a3b8', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff', fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                  }}
                >
                  {saving ? <RefreshCw size={15} className="spin" /> : <Check size={15} />}
                  <span>{saving ? 'Đang lưu...' : (editingService ? 'Cập Nhật' : 'Tạo Dịch Vụ')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandlordServiceMgmtView;
