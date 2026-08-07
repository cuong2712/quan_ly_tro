import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Home, Users, Plus, Edit, Trash2, ChevronRight,
  ArrowLeft, Zap, Droplets, FileText, CreditCard, Wrench,
  Phone, Mail, Calendar, DollarSign, User, MapPin, Search,
  AlertCircle, CheckCircle, Clock, RefreshCw, MoreVertical, Shield, Settings
} from 'lucide-react';
import {
  zoneService, roomService, tenantService,
  invoiceService, utilityService, contractService, serviceMgmtService
} from '../../services';
import { formatVND } from '../../utils/formatters';
import { ServiceMgmt } from './ServiceMgmt';
import { ErrorBoundary } from '../Common/ErrorBoundary';

// ─── Màu trạng thái phòng ────────────────────────────────────────
const STATUS_CONFIG = {
  Vacant:      { label: 'Còn trống', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  Occupied:    { label: 'Đang thuê', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  Maintenance: { label: 'Bảo trì', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

// ─── LEVEL 1: Danh sách khu trọ (Giao diện sạch đẹp, tối giản) ────
const ZoneList = ({ onSelectZone, onRefresh }) => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', description: '', totalRooms: 10 });

  const load = useCallback(async () => {
    setLoading(true);
    try { setZones(await zoneService.getZones()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditingZone(null); setForm({ name: '', address: '', description: '', totalRooms: 10 }); setIsModalOpen(true); };
  const openEdit = (z, e) => { e.stopPropagation(); setEditingZone(z); setForm({ name: z.name, address: z.address, description: z.description || '', totalRooms: z.totalRooms }); setIsModalOpen(true); };
  const handleDelete = async (z, e) => {
    e.stopPropagation();
    if (!confirm(`Bạn có chắc chắn muốn xóa khu trọ "${z.name}"?`)) return;
    try { await zoneService.deleteZone(z.id); await load(); } catch (err) { alert(err.response?.data?.message || err.message); }
  };
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { name: form.name, address: form.address, description: form.description, totalRooms: Number(form.totalRooms) };
      if (editingZone) await zoneService.updateZone(editingZone.id, payload);
      else await zoneService.createZone(payload);
      setIsModalOpen(false); await load();
    } catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div className="tab-spinner" />
    </div>
  );

  return (
    <div className="zone-workspace">
      <div className="page-header zone-page-header">
        <div>
          <h2 className="page-title"><Building2 size={24} color="#6366f1" /> Danh Sách Khu Trọ</h2>
          <p className="page-subtitle">Nhấp vào một khu trọ để xem các phòng và thống kê chi tiết</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> Thêm Khu Trọ Mới</button>
      </div>

      {zones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <Building2 size={64} style={{ opacity: 0.2, marginBottom: 16 }} />
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Chưa có khu trọ nào</h3>
          <p style={{ marginBottom: 20 }}>Bắt đầu bằng cách thêm khu trọ đầu tiên của bạn</p>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Thêm khu trọ</button>
        </div>
      ) : (
        <div className="zone-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 20 }}>
          {zones.map(z => (
            <div
              key={z.id}
              className="card zone-overview-card"
              onClick={() => onSelectZone(z)}
              style={{
                cursor: 'pointer',
                padding: '20px',
                borderRadius: '16px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(99,102,241,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Building2 size={22} color="#6366f1" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      lineHeight: '1.3',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {z.name}
                    </h3>
                    <div style={{
                      fontSize: '12.5px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      marginTop: '4px',
                      lineHeight: '1.2'
                    }}>
                      <MapPin size={13} style={{ flexShrink: 0, color: '#6366f1' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{z.address}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                  <button className="btn btn-sm btn-secondary" onClick={e => openEdit(z, e)} title="Sửa khu trọ" style={{ padding: '6px 8px' }}>
                    <Edit size={14} />
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={e => handleDelete(z, e)} title="Xóa khu trọ" style={{ padding: '6px 8px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {z.description && (
                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  lineHeight: '1.45',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {z.description}
                </p>
              )}

              {/* Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-color)',
                marginTop: 'auto'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0, lineHeight: 1 }}>
                  <Home size={14} color="#6366f1" />
                  <span>Quy mô: <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{z.totalRooms} phòng</strong></span>
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#6366f1',
                  flexShrink: 0,
                  marginLeft: 'auto',
                  lineHeight: 1
                }}>
                  <span>Xem danh sách phòng</span>
                  <ChevronRight size={14} color="#6366f1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zone Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingZone ? '✏️ Sửa Khu Trọ' : '🏢 Thêm Khu Trọ Mới'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên khu trọ *</label>
                  <input className="form-control" required placeholder="VD: Khu trọ Bình Thạnh" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Địa chỉ *</label>
                  <input className="form-control" required placeholder="Số nhà, đường, phường, quận..." value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả</label>
                  <textarea className="form-control" rows="2" placeholder="Mô tả thêm về khu trọ..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tổng số phòng quy mô *</label>
                  <input type="number" className="form-control" required min="1" max="500" value={form.totalRooms} onChange={e => setForm({ ...form, totalRooms: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── LEVEL 2: Danh sách phòng trong khu trọ (Có nút Quay lại & Header Tổng quan) ───
const RoomList = ({ zone, initialTab = 'rooms', onSelectRoom, onBack }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'rooms');
  const [rooms, setRooms] = useState([]);
  const [zoneServices, setZoneServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    roomNumber: '', floor: 1, price: 3000000, area: 25,
    maxTenants: 2, status: 'Vacant', elecMeter: 0, waterMeter: 0, description: ''
  });

  const load = useCallback(async () => {
    if (!zone?.id) return;
    setLoading(true);
    try {
      const res = await roomService.getRooms(zone.id);
      setRooms(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [zone?.id]);

  const loadZoneServices = useCallback(async () => {
    if (!zone?.id) return;
    try {
      const res = await serviceMgmtService.getServices(zone.id);
      setZoneServices(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      setZoneServices([]);
    }
  }, [zone?.id]);

  useEffect(() => {
    load();
    loadZoneServices();
  }, [load, loadZoneServices]);

  if (!zone || !zone.id) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p>Không tìm thấy thông tin khu trọ.</p>
        <button className="btn btn-primary" onClick={onBack}>Quay lại danh sách khu trọ</button>
      </div>
    );
  }

  const roomList = Array.isArray(rooms) ? rooms : [];
  const serviceList = Array.isArray(zoneServices) ? zoneServices : [];

  const filtered = roomList.filter(r => {
    if (!r) return false;
    const matchSearch = (r.roomNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.currentTenantName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => {
    setEditingRoom(null);
    setForm({ roomNumber: '', floor: 1, price: 3000000, area: 25, maxTenants: 2, status: 'Vacant', elecMeter: 0, waterMeter: 0, description: '' });
    setIsModalOpen(true);
  };
  const openEdit = (r, e) => {
    e.stopPropagation();
    setEditingRoom(r);
    setForm({ roomNumber: r.roomNumber, floor: r.floor, price: r.price, area: r.area, maxTenants: r.maxTenants, status: r.status, elecMeter: r.elecMeter, waterMeter: r.waterMeter, description: r.description || '' });
    setIsModalOpen(true);
  };
  const handleDelete = async (r, e) => {
    e.stopPropagation();
    if (!confirm(`Xóa phòng ${r.roomNumber}?`)) return;
    try { await roomService.deleteRoom(r.id); await load(); } catch (err) { alert(err.response?.data?.message || err.message); }
  };
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        zoneId: zone.id, roomNumber: form.roomNumber, floor: Number(form.floor),
        price: Number(form.price), area: Number(form.area), maxTenants: Number(form.maxTenants),
        status: form.status, elecMeter: Number(form.elecMeter), waterMeter: Number(form.waterMeter),
        description: form.description
      };
      if (editingRoom) await roomService.updateRoom(editingRoom.id, payload);
      else await roomService.createRoom(payload);
      setIsModalOpen(false); await load();
    } catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setSaving(false); }
  };

  // Thống kê tổng số phòng trong khu này
  const statusCounts = { all: roomList.length, Vacant: 0, Occupied: 0, Maintenance: 0 };
  roomList.forEach(r => {
    if (r && r.status) {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    }
  });
  const occupancyRate = roomList.length > 0 ? Math.round((statusCounts.Occupied / roomList.length) * 100) : 0;

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}><div className="tab-spinner" /></div>;

  return (
    <div className="zone-detail-workspace">
      {/* 🔙 Nút Quay Lại Trang Trước & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, padding: '8px 14px' }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách khu trọ
        </button>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{zone.name}</span>
      </div>

      {/* 📊 Header Tổng Quan Của Khu Trọ Này */}
      <div className="card" style={{ marginBottom: 20, padding: '20px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, var(--bg-card) 100%)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Building2 size={24} color="#6366f1" /> {zone.name}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={13} /> {zone.address}
            </p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Thêm Phòng Mới</button>
        </div>

        {/* Thẻ Thống Kê Tổng Quan Của Khu Trọ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <div style={{ padding: '12px', background: 'var(--bg-dark)', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{roomList.length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Tổng số phòng</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(99,102,241,0.12)', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{statusCounts.Occupied}</div>
            <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, marginTop: 2 }}>🟣 Đang thuê</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(16,185,129,0.12)', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{statusCounts.Vacant}</div>
            <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: 2 }}>🟢 Còn trống</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(245,158,11,0.12)', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{statusCounts.Maintenance}</div>
            <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, marginTop: 2 }}>🟡 Bảo trì</div>
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-dark)', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: occupancyRate >= 80 ? '#10b981' : '#f59e0b' }}>{occupancyRate}%</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Tỷ lệ lấp đầy</div>
          </div>
        </div>
      </div>

      {/* 🧭 Sub-Tabs: Danh Sách Phòng vs Dịch Vụ Khu Trọ */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
        <button
          className={`btn ${activeTab === 'rooms' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('rooms')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
        >
          <Home size={16} /> Danh Sách Phòng ({roomList.length})
        </button>
        <button
          className={`btn ${activeTab === 'services' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('services')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
        >
          <Settings size={16} /> Dịch Vụ Khu Trọ ({serviceList.length})
        </button>
      </div>

      {activeTab === 'services' ? (
        <ServiceMgmt
          services={serviceList}
          setServices={setZoneServices}
          zones={[zone]}
          targetZone={zone}
          onRefresh={loadZoneServices}
        />
      ) : (
        <>
          {/* Filter bar */}
          <div className="zone-room-filters" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="search-box" style={{ flex: '1 1 220px', minWidth: 220, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="search-input"
                placeholder="Tìm số phòng..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 12px 8px 36px',
                  fontSize: '13px',
                  width: '100%',
                  outline: 'none'
                }}
              />
            </div>
            {['all', 'Occupied', 'Vacant', 'Maintenance'].map(s => (
              <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(s)}>
                {s === 'all' ? `Tất cả (${statusCounts.all})` : `${STATUS_CONFIG[s]?.label} (${statusCounts[s] || 0})`}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Home size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p>{roomList.length === 0 ? 'Chưa có phòng nào trong khu trọ này.' : 'Không tìm thấy phòng phù hợp'}</p>
              {roomList.length === 0 && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openAdd}><Plus size={16} /> Thêm phòng mới</button>}
            </div>
          ) : (
        <div className="zone-room-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map(r => {
            const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.Vacant;
            return (
              <div
                key={r.id}
                className="card zone-room-card"
                onClick={() => onSelectRoom(r)}
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '16px',
                  borderRadius: 12,
                  background: 'var(--bg-card)',
                  border: `1px solid ${sc.color}40`,
                }}
              >
                {/* Status badge */}
                <div style={{ position: 'absolute', top: 12, right: 12, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: `1px solid ${sc.color}40` }}>
                  {sc.label}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Home size={20} color={sc.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>Phòng {r.roomNumber}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tầng {r.floor} • {r.area} m²</div>
                  </div>
                </div>

                <div style={{ fontSize: 18, fontWeight: 800, color: '#6366f1', marginBottom: 10 }}>
                  {formatVND(r.price)}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>/tháng</span>
                </div>

                <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  <span>⚡ {r.elecMeter} kWh</span>
                  <span>💧 {r.waterMeter} m³</span>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" onClick={e => openEdit(r, e)}><Edit size={13} /></button>
                    <button className="btn btn-sm btn-danger" onClick={e => handleDelete(r, e)}><Trash2 size={13} /></button>
                  </div>
                  <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    Chi tiết phòng <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Room Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingRoom ? `✏️ Sửa phòng ${editingRoom.roomNumber}` : '🏠 Thêm Phòng Mới'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Số phòng *</label>
                    <input className="form-control" required placeholder="101, A1, ..." value={form.roomNumber} onChange={e => setForm({ ...form, roomNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tầng *</label>
                    <input type="number" className="form-control" required min="0" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Giá thuê (VNĐ/tháng) *</label>
                    <input type="number" className="form-control" required min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Diện tích (m²) *</label>
                    <input type="number" className="form-control" required min="1" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số người tối đa</label>
                    <input type="number" className="form-control" min="1" value={form.maxTenants} onChange={e => setForm({ ...form, maxTenants: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trạng thái</label>
                    <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="Vacant">Còn trống</option>
                      <option value="Occupied">Đang thuê</option>
                      <option value="Maintenance">Bảo trì</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Chỉ số điện (kWh)</label>
                    <input type="number" className="form-control" min="0" value={form.elecMeter} onChange={e => setForm({ ...form, elecMeter: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Chỉ số nước (m³)</label>
                    <input type="number" className="form-control" min="0" value={form.waterMeter} onChange={e => setForm({ ...form, waterMeter: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả</label>
                  <textarea className="form-control" rows="2" placeholder="Ghi chú về phòng..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

// ─── LEVEL 3: Chi tiết phòng (Hiển thị gọn gàng 1-2 trang đầy đủ Người thuê, Hợp đồng, Hóa đơn) ───
const RoomDetail = ({ room, zone, onBack }) => {
  const [roomDetail, setRoomDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      try {
        const detail = await roomService.getRoomDetail(room.id);
        setRoomDetail(detail);
      } catch (e) {
        console.error('Lỗi lấy chi tiết phòng:', e);
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [room.id]);

  const sc = STATUS_CONFIG[room.status] || STATUS_CONFIG.Vacant;
  const tenants = roomDetail?.tenants || (roomDetail?.currentTenant ? [roomDetail.currentTenant] : []);
  const activeContract = roomDetail?.activeContract;
  const recentInvoices = roomDetail?.recentInvoices || [];
  const utilityLogs = roomDetail?.utilityLogs || [];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 350 }}>
        <div className="tab-spinner" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* 🔙 Nút Quay lại danh sách phòng */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onBack('rooms')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, padding: '8px 14px' }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách phòng
        </button>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{zone.name}</span>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Phòng {room.roomNumber}</span>
      </div>

      {/* Header Thẻ Thông Tin Phòng */}
      <div className="card" style={{ padding: '20px', marginBottom: 20, background: `linear-gradient(135deg, ${sc.bg} 0%, var(--bg-card) 100%)`, border: `1px solid ${sc.color}40` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Home size={28} color={sc.color} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Phòng {room.roomNumber}</h2>
                <span style={{ background: sc.bg, color: sc.color, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: `1px solid ${sc.color}40` }}>{sc.label}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                {zone.name} • Tầng {room.floor} • Diện tích: {room.area} m² • Sức chứa tối đa: {room.maxTenants} người
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#6366f1' }}>{formatVND(room.price)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>tiền thuê / tháng</div>
          </div>
        </div>
      </div>

      {/* GRID 2 CỘT GỌN GÀNG (HIỂN THỊ TOÀN BỘ TRONG 1-2 TRANG) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
        
        {/* CỘT 1: THÔNG TIN NGƯỜI THUÊ & HỢP ĐỒNG */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Card: Hồ Sơ Người Thuê (Hiển thị 1 - 4 người) */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <User size={18} color="#6366f1" /> Danh Sách Khách Thuê ({tenants.length} người)
              </h3>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                Sức chứa: Max {room.maxTenants} người
              </span>
            </div>

            {tenants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', background: 'var(--bg-dark)', borderRadius: 10 }}>
                <User size={36} style={{ opacity: 0.2, marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 13 }}>Phòng hiện chưa có khách thuê</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {tenants.map((t, idx) => (
                  <div key={t.id || idx} style={{ padding: '14px', background: 'var(--bg-dark)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={20} color="#6366f1" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                          {t.fullName} {idx === 0 ? <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', background: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: 4, marginLeft: 6 }}>Khách đại diện</span> : null}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Email: {t.email || 'Chưa cập nhật'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ padding: '8px 10px', background: 'var(--bg-card)', borderRadius: 6 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Số Điện Thoại</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', marginTop: 2 }}>
                          <Phone size={11} style={{ display: 'inline', marginRight: 4 }} />{t.phone}
                        </div>
                      </div>
                      <div style={{ padding: '8px 10px', background: 'var(--bg-card)', borderRadius: 6 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Số CCCD</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 2 }}>{t.cccd}</div>
                      </div>
                      <div style={{ padding: '8px 10px', background: 'var(--bg-card)', borderRadius: 6 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quê Quán</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 2 }}>{t.hometown || 'Chưa cập nhật'}</div>
                      </div>
                      <div style={{ padding: '8px 10px', background: 'var(--bg-card)', borderRadius: 6 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ngày Chuyển Vào</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 2 }}>
                          {t.moveInDate ? new Date(t.moveInDate).toLocaleDateString('vi-VN') : '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Hợp Đồng Thuê Nhà */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <CreditCard size={18} color="#10b981" /> Hợp Đồng Thuê Nhà
            </h3>

            {!activeContract ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', background: 'var(--bg-dark)', borderRadius: 10 }}>
                <CreditCard size={36} style={{ opacity: 0.2, marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 13 }}>Chưa có hợp đồng đang hiệu lực</p>
              </div>
            ) : (
              <div style={{ padding: '14px', background: 'rgba(16,185,129,0.06)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: '#10b981' }}>Mã: {activeContract.contractCode}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>✅ Đang hiệu lực</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Thời Hạn Hợp Đồng</div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                      {new Date(activeContract.startDate).toLocaleDateString('vi-VN')} → {new Date(activeContract.endDate).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tiền Đặt Cọc</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>{formatVND(activeContract.deposit)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CỘT 2: ĐIỆN NƯỚC & LỊCH SỬ HÓA ĐƠN GẦN ĐÂY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Card: Chỉ số Điện Nước hiện tại */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <Zap size={18} color="#f59e0b" /> Chỉ Số Điện & Nước Mới Nhất
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '14px', background: 'rgba(245,158,11,0.08)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)' }}>
                <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, marginBottom: 4 }}>⚡ Số Điện Hiện Tại</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{room.elecMeter} <span style={{ fontSize: 12 }}>kWh</span></div>
              </div>
              <div style={{ padding: '14px', background: 'rgba(59,130,246,0.08)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)' }}>
                <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 700, marginBottom: 4 }}>💧 Số Nước Hiện Tại</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{room.waterMeter} <span style={{ fontSize: 12 }}>m³</span></div>
              </div>
            </div>
          </div>

          {/* Card: Danh Sách Hóa Đơn Gần Đây */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <FileText size={18} color="#6366f1" /> Lịch Sử Hóa Đơn (6 Tháng Gần Nhất)
            </h3>

            {recentInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', background: 'var(--bg-dark)', borderRadius: 10 }}>
                <FileText size={36} style={{ opacity: 0.2, marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 13 }}>Chưa có hóa đơn nào cho phòng này</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentInvoices.slice(0, 5).map(inv => {
                  const isPaid = (inv.status || '').toLowerCase() === 'paid';
                  return (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-dark)', borderRadius: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Mã: {inv.invoiceCode}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Kỳ tháng {inv.month} • Hạn: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('vi-VN') : ''}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#6366f1', fontSize: 15 }}>{formatVND(inv.totalAmount)}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: isPaid ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: isPaid ? '#10b981' : '#ef4444' }}>
                          {isPaid ? '✅ Đã trả' : '⏳ Chưa thanh toán'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

// ─── MAIN EXPORT: ZoneExplorer ────────────────────────────────────
export const ZoneExplorer = () => {
  const [level, setLevel] = useState('zones');    // 'zones' | 'rooms' | 'room-detail'
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('zone_nav');
    if (saved) {
      try {
        const { level: l, zone, room } = JSON.parse(saved);
        if ((l === 'rooms' || l === 'room-detail') && (!zone || !zone.id)) {
          setLevel('zones'); setSelectedZone(null); setSelectedRoom(null);
          sessionStorage.removeItem('zone_nav');
        } else {
          setLevel(l || 'zones'); setSelectedZone(zone || null); setSelectedRoom(room || null);
        }
      } catch {
        sessionStorage.removeItem('zone_nav');
        setLevel('zones');
      }
    }
  }, []);

  const navigate = (newLevel, zone = null, room = null) => {
    setLevel(newLevel); setSelectedZone(zone); setSelectedRoom(room);
    sessionStorage.setItem('zone_nav', JSON.stringify({ level: newLevel, zone, room }));
  };

  const handleSelectZone = (zone) => navigate('rooms', zone, null);
  const handleSelectRoom = (room) => navigate('room-detail', selectedZone, room);
  const handleBack = (toLevel) => {
    if (toLevel === 'zones') navigate('zones', null, null);
    else if (toLevel === 'rooms') navigate('rooms', selectedZone, null);
  };

  return (
    <ErrorBoundary key={level + (selectedZone?.id || '')} onReset={() => setLevel('zones')}>
      {level === 'zones' && <ZoneList onSelectZone={handleSelectZone} />}
      {level === 'rooms' && (
        selectedZone ? (
          <RoomList zone={selectedZone} onSelectRoom={handleSelectRoom} onBack={() => handleBack('zones')} />
        ) : (
          <ZoneList onSelectZone={handleSelectZone} />
        )
      )}
      {level === 'room-detail' && (
        (selectedRoom && selectedZone) ? (
          <RoomDetail room={selectedRoom} zone={selectedZone} onBack={handleBack} />
        ) : (
          <ZoneList onSelectZone={handleSelectZone} />
        )
      )}
    </ErrorBoundary>
  );
};
