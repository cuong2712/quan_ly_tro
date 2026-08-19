import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Home, Users, Plus, Edit, Trash2, ChevronRight,
  ArrowLeft, Zap, Droplets, FileText, CreditCard, Wrench,
  Phone, Mail, Calendar, DollarSign, User, MapPin, Search,
  AlertCircle, CheckCircle, Clock, RefreshCw, MoreVertical, Shield, Settings,
  LayoutGrid, Gauge, Download, FilePlus, Edit3, Maximize, Activity, Sparkles, StickyNote, Box, Wind, Flame, Sun, Tv, Car, Camera
} from 'lucide-react';
import {
  zoneService, roomService, tenantService,
  invoiceService, utilityService, contractService, serviceMgmtService
} from '../../services';
import { formatVND } from '../../utils/formatters';
import { ServiceMgmt } from './ServiceMgmt';
import { ErrorBoundary } from '../Common/ErrorBoundary';
import { Pagination } from '../Common/Pagination';

// ─── Màu trạng thái phòng ────────────────────────────────────────
const STATUS_CONFIG = {
  Vacant: { label: 'Còn trống', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  Occupied: { label: 'Đang thuê', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

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

  const totalPages = Math.ceil(zones.length / pageSize);
  const paginatedZones = zones.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
        <>
          <div className="zone-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 20 }}>
            {paginatedZones.map(z => (
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={zones.length}
            pageSize={pageSize}
          />
        </>
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

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

  const roomList = Array.isArray(rooms) ? rooms : [];
  const serviceList = Array.isArray(zoneServices) ? zoneServices : [];

  const filtered = roomList.filter(r => {
    if (!r) return false;
    const matchSearch = (r.roomNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.currentTenantName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedRooms = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
    <div className="zone-detail-workspace" style={{ width: '100%', maxWidth: '100%' }}>
      {/* 🔙 Nút Quay Lại Trang Trước & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button
          className="btn btn-secondary"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 700,
            fontSize: '14px',
            padding: '9px 16px',
            borderRadius: '10px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
          }}
        >
          <ArrowLeft size={18} /> Quay lại danh sách khu trọ
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>/</span>
        <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{zone.name}</span>
      </div>

      {/* 📊 Header Tổng Quan Của Khu Trọ Này */}
      <div className="card zone-detail-header-card" style={{
        marginBottom: 24,
        padding: '24px',
        borderRadius: '18px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Building2 size={24} color="#6366f1" />
              </div>
              {zone.name}
            </h2>
            <p style={{ margin: '6px 0 0 56px', fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <MapPin size={15} color="#6366f1" /> {zone.address}
            </p>
          </div>
          <button className="btn btn-primary" onClick={openAdd} style={{ padding: '10px 20px', fontSize: 14, fontWeight: 700, borderRadius: 12 }}>
            <Plus size={18} /> Thêm Phòng Mới
          </button>
        </div>

        {/* Thẻ Thống Kê Tổng Quan Của Khu Trọ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
          <div className="stat-box" style={{
            padding: '14px 16px',
            borderRadius: 12,
            textAlign: 'center',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-dark)'
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{roomList.length}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 4 }}>Tổng số phòng</div>
          </div>

          <div className="stat-box stat-occupied" style={{
            padding: '14px 16px',
            borderRadius: 12,
            textAlign: 'center',
            border: '1px solid rgba(99,102,241,0.3)',
            background: 'rgba(99,102,241,0.12)'
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#6366f1' }}>{statusCounts.Occupied}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', marginTop: 4 }}>🟣 Đang thuê</div>
          </div>

          <div className="stat-box stat-vacant" style={{
            padding: '14px 16px',
            borderRadius: 12,
            textAlign: 'center',
            border: '1px solid rgba(16,185,129,0.3)',
            background: 'rgba(16,185,129,0.12)'
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{statusCounts.Vacant}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginTop: 4 }}>🟢 Còn trống</div>
          </div>

          <div className="stat-box stat-maintenance" style={{
            padding: '14px 16px',
            borderRadius: 12,
            textAlign: 'center',
            border: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.12)'
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{statusCounts.Maintenance}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>🟡 Bảo trì</div>
          </div>

          <div className="stat-box" style={{
            padding: '14px 16px',
            borderRadius: 12,
            textAlign: 'center',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-dark)'
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: occupancyRate >= 80 ? '#10b981' : '#f59e0b' }}>{occupancyRate}%</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 4 }}>Tỷ lệ lấp đầy</div>
          </div>
        </div>
      </div>

      {/* 🧭 Sub-Tabs: Danh Sách Phòng vs Dịch Vụ Khu Trọ */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
        <button
          className={`btn ${activeTab === 'rooms' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('rooms')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: '15px', padding: '10px 20px', borderRadius: '12px' }}
        >
          <Home size={18} /> Danh Sách Phòng ({roomList.length})
        </button>
        <button
          className={`btn ${activeTab === 'services' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('services')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: '15px', padding: '10px 20px', borderRadius: '12px' }}
        >
          <Settings size={18} /> Dịch Vụ Khu Trọ ({serviceList.length})
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
          {/* Filter bar - Đã căn chỉnh cân đối chiều cao 42px & full width */}
          <div className="zone-room-filters" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap', width: '100%' }}>
            <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 240, display: 'flex', alignItems: 'center' }}>
              <Search size={18} style={{ position: 'absolute', left: 14, color: 'var(--text-secondary)', pointerEvents: 'none' }} />
              <input
                className="search-input"
                placeholder="Tìm số phòng..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '0 16px 0 42px',
                  height: '42px',
                  fontSize: '14px',
                  fontWeight: 500,
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {['all', 'Occupied', 'Vacant', 'Maintenance'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    height: '42px',
                    padding: '0 18px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: statusFilter === s ? '1px solid #6366f1' : '1px solid var(--border-color)',
                    background: statusFilter === s ? '#6366f1' : 'var(--bg-card)',
                    color: statusFilter === s ? '#ffffff' : 'var(--text-secondary)',
                    boxShadow: statusFilter === s ? '0 4px 14px rgba(99,102,241,0.3)' : '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  {s === 'all' ? `Tất cả (${statusCounts.all})` : `${STATUS_CONFIG[s]?.label} (${statusCounts[s] || 0})`}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Home size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 500 }}>{roomList.length === 0 ? 'Chưa có phòng nào trong khu trọ này.' : 'Không tìm thấy phòng phù hợp'}</p>
              {roomList.length === 0 && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openAdd}><Plus size={16} /> Thêm phòng mới</button>}
            </div>
          ) : (
            <>
              <div className="zone-room-grid" style={{ width: '100%' }}>
                {paginatedRooms.map(r => {
                  const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.Vacant;
                  return (
                    <div
                      key={r.id}
                      className="card zone-room-card"
                      onClick={() => onSelectRoom(r)}
                      style={{
                        cursor: 'pointer',
                        position: 'relative',
                        padding: '20px',
                        borderRadius: '16px',
                        background: 'var(--bg-card)',
                        border: `1.5px solid ${sc.color}44`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '16px',
                        boxShadow: 'var(--shadow-card)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <div>
                        {/* Header: Icon + Số phòng & Trạng thái */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              background: sc.bg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Home size={22} color={sc.color} />
                            </div>
                            <div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                Phòng {r.roomNumber}
                              </div>
                              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 3 }}>
                                Tầng {r.floor} • {r.area} m²
                              </div>
                            </div>
                          </div>
                          <span style={{
                            background: sc.bg,
                            color: sc.color,
                            fontSize: 12.5,
                            fontWeight: 700,
                            padding: '5px 12px',
                            borderRadius: 20,
                            border: `1px solid ${sc.color}50`,
                            flexShrink: 0
                          }}>
                            {sc.label}
                          </span>
                        </div>

                        {/* Giá Thuê */}
                        <div style={{ fontSize: 21, fontWeight: 800, color: '#6366f1', marginBottom: 14 }}>
                          {formatVND(r.price)}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginLeft: 3 }}>/tháng</span>
                        </div>

                        {/* Người Đại Diện Phòng Trọ (Người đầu tiên vào trọ) */}
                        <div className="rep-tenant-box" style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          fontSize: 13.5,
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-dark)',
                          minHeight: 44
                        }}>
                          {r.currentTenantName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', width: '100%', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                <User size={16} color="#10b981" style={{ flexShrink: 0 }} />
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.currentTenantName}>
                                  {r.currentTenantName}
                                </span>
                              </div>
                              {r.currentTenantPhone ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                                  <Phone size={13} /> {r.currentTenantPhone}
                                </span>
                              ) : (
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>Đại diện</span>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
                              <User size={15} style={{ opacity: 0.5 }} /> Chưa có người ở
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer: Thao tác & Xem chi tiết */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-sm btn-secondary" onClick={e => openEdit(r, e)} title="Sửa thông tin phòng" style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                            <Edit size={15} />
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={e => handleDelete(r, e)} title="Xóa phòng" style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <span style={{ color: '#6366f1', fontSize: 13.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          Chi tiết phòng <ChevronRight size={16} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filtered.length}
                pageSize={pageSize}
              />
            </>
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
                        <label className="form-label">Giá thuê phòng (VNĐ/tháng) *</label>
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

// ─── LEVEL 3: Chi tiết phòng (Giao diện 5 Tabs khớp 100% với landlord_room_detail_demo.html) ───
const RoomDetail = ({ room, zone, onBack }) => {
  const [roomDetail, setRoomDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'tenant' | 'utilities' | 'maintenance'
  const [notes, setNotes] = useState(() => localStorage.getItem(`room_notes_${room.id}`) || 'Khách thanh toán đúng hạn. Đã đăng ký 1 xe máy. Chốt điện nước ngày 25 hàng tháng.');
  const [toastMessage, setToastMessage] = useState('');

  // Modals state
  const [showMeterModal, setShowMeterModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Meter form state
  const [meterForm, setMeterForm] = useState({ month: '08/2026', newElec: room.elecMeter || 0, newWater: room.waterMeter || 0 });

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState(() => {
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    return {
      month: curMonth,
      rentFee: room.price || 0,
      elecFee: 0,
      waterFee: 0,
      serviceFee: 0,
      dueDate: defaultDue
    };
  });

  // Edit room form state
  const [editForm, setEditForm] = useState({
    roomNumber: room.roomNumber || '',
    floor: room.floor || 1,
    price: room.price || 0,
    area: room.area || 0,
    maxTenants: room.maxTenants || 2,
    status: room.status || 'Occupied',
    elecMeter: room.elecMeter || 0,
    waterMeter: room.waterMeter || 0,
    description: room.description || ''
  });

  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [utilityRates, setUtilityRates] = useState(null);
  const [zoneServices, setZoneServices] = useState([]);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [eqForm, setEqForm] = useState({ name: '', brand: '', quantity: 1, condition: 'Mới 100%' });
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintForm, setMaintForm] = useState({ title: '', description: '', priority: 'Medium' });

  const handleOpenInvoiceModal = () => {
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    // Tự động tính tiền dịch vụ theo số xe và dịch vụ của khu trọ
    let calculatedSvc = 0;
    if (Array.isArray(zoneServices) && zoneServices.length > 0) {
      zoneServices.forEach(s => {
        if (s.name?.toLowerCase().includes('xe')) {
          const vehCount = (roomDetail?.tenants || []).reduce((acc, t) => acc + (t.vehicleCount || 0), 0);
          calculatedSvc += (vehCount > 0 ? vehCount * (s.price || 0) : (s.price || 0));
        } else {
          calculatedSvc += (s.price || 0);
        }
      });
    }

    setInvoiceForm({
      month: curMonth,
      rentFee: roomDetail?.price || room.price || 0,
      elecFee: 0,
      waterFee: 0,
      serviceFee: calculatedSvc,
      dueDate: defaultDue
    });
    setShowInvoiceModal(true);
  };

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await roomService.getRoomDetail(room.id);
      setRoomDetail(detail);
      if (detail) {
        setMeterForm(prev => ({ ...prev, newElec: detail.elecMeter || room.elecMeter, newWater: detail.waterMeter || room.waterMeter }));
        setEditForm({
          roomNumber: detail.roomNumber || room.roomNumber,
          floor: detail.floor || room.floor,
          price: detail.price || room.price,
          area: detail.area || room.area,
          maxTenants: detail.maxTenants || room.maxTenants,
          status: detail.status || room.status,
          elecMeter: detail.elecMeter || room.elecMeter,
          waterMeter: detail.waterMeter || room.waterMeter,
          description: detail.description || room.description || ''
        });
      }
    } catch (e) {
      console.error('Lỗi lấy chi tiết phòng:', e);
    }

    try {
      const [rateRes, servRes] = await Promise.all([
        utilityService.getRate().catch(() => null),
        serviceMgmtService.getServices().catch(() => [])
      ]);
      if (rateRes) setUtilityRates(rateRes);
      if (Array.isArray(servRes)) {
        setZoneServices(servRes.filter(s => !s.zoneId || s.zoneId === zone.id));
      }
    } catch (err) {
      console.warn('Lỗi lấy đơn giá / dịch vụ:', err);
    }

    try {
      const mRes = await maintenanceService.getRequests();
      if (Array.isArray(mRes)) {
        setMaintenanceLogs(mRes.filter(m => m.roomId === room.id));
      }
    } catch (err) {
      console.error('Lỗi lấy bảo trì:', err);
    } finally {
      setLoading(false);
    }
  }, [room.id, room.elecMeter, room.waterMeter, room.price, room.roomNumber, room.floor, room.area, room.maxTenants, room.status, room.description, zone.id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleSaveNotes = () => {
    localStorage.setItem(`room_notes_${room.id}`, notes);
    showToast('Đã lưu ghi chú chủ trọ thành công!');
  };

  // Submit API record meter
  const handleRecordMeter = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await utilityService.record({
        roomId: room.id,
        month: meterForm.month,
        newElec: Number(meterForm.newElec),
        newWater: Number(meterForm.newWater)
      });
      showToast('Chốt chỉ số điện nước thành công!');
      setShowMeterModal(false);
      await loadDetail();
    } catch (err) {
      console.error('Lỗi chốt điện nước:', err);
      showToast('⚠️ Lỗi chốt chỉ số điện nước. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit API create invoice
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceForm.month) {
      alert('Vui lòng chọn tháng thu tiền!');
      return;
    }
    if (!invoiceForm.dueDate) {
      alert('Vui lòng chọn hạn thanh toán!');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        roomId: room.id,
        month: invoiceForm.month,
        rentFee: Number(invoiceForm.rentFee || 0),
        elecFee: Number(invoiceForm.elecFee || 0),
        waterFee: Number(invoiceForm.waterFee || 0),
        serviceFee: Number(invoiceForm.serviceFee || 0),
        dueDate: new Date(invoiceForm.dueDate).toISOString()
      };

      await invoiceService.createInvoice(payload);
      showToast('✅ Tạo và phát hành hóa đơn thành công!');
      setShowInvoiceModal(false);
      await loadDetail();
    } catch (err) {
      console.error('Lỗi tạo hóa đơn:', err);
      const errMsg = err.response?.data?.message || err.message || 'Lỗi lập hóa đơn';
      alert('⚠️ ' + errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await roomService.addEquipment(room.id, {
        name: eqForm.name,
        brand: eqForm.brand,
        quantity: Number(eqForm.quantity),
        condition: eqForm.condition
      });
      showToast('Thêm thiết bị bàn giao thành công!');
      setShowEquipmentModal(false);
      setEqForm({ name: '', brand: '', quantity: 1, condition: 'Mới 100%' });
      await loadDetail();
    } catch (err) {
      console.error(err);
      showToast('⚠️ Không thể thêm thiết bị bàn giao!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEquipment = async (eqId) => {
    if (!confirm('Xóa thiết bị này khỏi phòng?')) return;
    try {
      await roomService.deleteEquipment(eqId);
      showToast('Đã xóa thiết bị thành công!');
      await loadDetail();
    } catch (err) {
      showToast('⚠️ Không thể xóa thiết bị!');
    }
  };

  const handleCreateMaintenance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await maintenanceService.create({
        roomId: room.id,
        title: maintForm.title,
        description: maintForm.description,
        priority: maintForm.priority
      });
      showToast('Tạo yêu cầu bảo trì thành công!');
      setShowMaintenanceModal(false);
      setMaintForm({ title: '', description: '', priority: 'Medium' });
      await loadDetail();
    } catch (err) {
      console.error(err);
      showToast('⚠️ Lỗi tạo yêu cầu bảo trì!');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit API update room
  const handleUpdateRoom = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await roomService.updateRoom(room.id, {
        roomNumber: editForm.roomNumber,
        floor: Number(editForm.floor),
        price: Number(editForm.price),
        area: Number(editForm.area),
        maxTenants: Number(editForm.maxTenants),
        status: editForm.status,
        elecMeter: Number(editForm.elecMeter),
        waterMeter: Number(editForm.waterMeter),
        description: editForm.description
      });
      showToast('Cập nhật thông tin phòng thành công!');
      setShowEditModal(false);
      await loadDetail();
    } catch (err) {
      console.error('Lỗi cập nhật phòng:', err);
      showToast('⚠️ Không thể cập nhật thông tin phòng!');
    } finally {
      setSubmitting(false);
    }
  };

  const sc = STATUS_CONFIG[roomDetail?.status || room.status] || STATUS_CONFIG.Vacant;
  const rawTenants = roomDetail?.tenants || (roomDetail?.currentTenant ? [roomDetail.currentTenant] : []);
  const tenants = Array.isArray(rawTenants)
    ? [...rawTenants].sort((a, b) => new Date(a.moveInDate || a.createdAt || 0) - new Date(b.moveInDate || b.createdAt || 0))
    : [];
  const mainTenant = tenants[0];
  const activeContract = roomDetail?.activeContract;
  const recentInvoices = roomDetail?.recentInvoices || [];
  const currentElec = roomDetail?.elecMeter ?? room.elecMeter;
  const currentWater = roomDetail?.waterMeter ?? room.waterMeter;
  const currentPrice = roomDetail?.price ?? room.price;

  const contractEndDate = activeContract?.endDate ? new Date(activeContract.endDate) : null;
  const daysLeft = contractEndDate ? Math.max(0, Math.ceil((contractEndDate - new Date()) / (1000 * 60 * 60 * 24))) : 0;

  if (loading && !roomDetail) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 350 }}>
        <div className="tab-spinner" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: 30, right: 30, zIndex: 1000,
          background: 'rgba(17, 24, 39, 0.95)', border: '1px solid #10b981',
          color: '#f8fafc', padding: '14px 22px', borderRadius: '12px',
          boxShadow: '0 12px 35px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', gap: 12,
          fontWeight: 600, fontSize: 14, backdropFilter: 'blur(16px)'
        }}>
          <CheckCircle size={20} color="#10b981" /> {toastMessage}
        </div>
      )}

      {/* 🔙 Breadcrumb & Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onBack('rooms')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, padding: '8px 16px' }}
          >
            <ArrowLeft size={16} /> Danh sách phòng
          </button>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>{zone.name}</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Tầng {roomDetail?.floor || room.floor}</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>Phòng {roomDetail?.roomNumber || room.roomNumber}</span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowEditModal(true)}>
            <Edit3 size={15} /> Sửa thông tin
          </button>
        </div>
      </div>

      {/* 👑 ROOM HERO CARD */}
      <header className="room-hero">
        <div className="hero-top">
          <div>
            <div className="room-title-group">
              <h2 className="room-code-badge">Phòng P.{String(roomDetail?.roomNumber || room?.roomNumber || '').replace(/^P\./i, '')}</h2>
              <div className="status-badge status-rented" style={{ background: sc.bg, color: sc.color, borderColor: `${sc.color}40` }}>
                <span className="dot" style={{ backgroundColor: sc.color, boxShadow: `0 0 10px ${sc.color}` }}></span>
                {sc.label}
              </div>
            </div>
            <div className="building-info">
              <div className="building-info-item">
                <Building2 size={15} color="#94a3b8" /> Tòa {zone.name} - {zone.address}
              </div>
              <div className="building-info-item">
                <Maximize size={15} color="#94a3b8" /> {roomDetail?.area || room.area} m² (Tầng {roomDetail?.floor || room.floor})
              </div>
              <div className="building-info-item">
                <Users size={15} color="#94a3b8" /> Tối đa {roomDetail?.maxTenants || room.maxTenants} người
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleOpenInvoiceModal}>
              <FilePlus size={16} /> Lập Hóa Đơn Tháng
            </button>
          </div>
        </div>

        {/* Quick Metrics Stats Bar */}
        <div className="hero-stats-grid">
          <div className="stat-card">
            <div className="stat-icon green">
              <DollarSign size={22} />
            </div>
            <div className="stat-meta">
              <span className="stat-label">Giá thuê phòng</span>
              <span className="stat-value">{formatVND(currentPrice)}</span>
              <span className="stat-subtext">Cọc {formatVND(activeContract?.deposit || currentPrice)}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">
              <User size={22} />
            </div>
            <div className="stat-meta">
              <span className="stat-label">Khách đại diện</span>
              <span className="stat-value">{mainTenant?.fullName || 'Chưa xếp'}</span>
              <span className="stat-subtext">SĐT: {mainTenant?.phone || 'Chưa cập nhật'}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon indigo">
              <Calendar size={22} />
            </div>
            <div className="stat-meta">
              <span className="stat-label">Thời hạn hợp đồng</span>
              <span className="stat-value">{activeContract ? `Còn ${daysLeft} ngày` : 'Chưa có'}</span>
              <span className="stat-subtext">Hết hạn: {contractEndDate ? contractEndDate.toLocaleDateString('vi-VN') : '-'}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon amber">
              <Activity size={22} />
            </div>
            <div className="stat-meta">
              <span className="stat-label">Chỉ số Điện / Nước</span>
              <span className="stat-value">{currentElec} / {currentWater}</span>
              <span className="stat-subtext">Đơn vị: kWh / m³</span>
            </div>
          </div>
        </div>
      </header>

      {/* 🧭 SUB TABS NAV */}
      <div className="tabs-nav" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <LayoutGrid size={18} /> Tổng Quan & Tiện Nghi
        </button>
        <button className={`tab-btn ${activeTab === 'tenant' ? 'active' : ''}`} onClick={() => setActiveTab('tenant')}>
          <Users size={18} /> Khách Thuê & Hợp Đồng ({tenants.length})
        </button>
        <button className={`tab-btn ${activeTab === 'utilities' ? 'active' : ''}`} onClick={() => setActiveTab('utilities')}>
          <Gauge size={18} /> Điện Nước & Hóa Đơn ({recentInvoices.length})
        </button>
        <button className={`tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`} onClick={() => setActiveTab('maintenance')}>
          <Wrench size={18} /> Bảo Trì & Báo Lỗi
        </button>
      </div>

      {/* ----------------- TAB 1: TỔNG QUAN & TIỆN NGHI ----------------- */}
      {activeTab === 'overview' && (
        <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Panel: Thông Tin Chi Tiết Phòng */}
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title"><Sparkles size={18} color="#10b981" /> Thông Tin Chi Tiết Phòng</h3>
              </div>
              <div className="data-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
                <div className="data-item">
                  <span className="data-label">Mã phòng</span>
                  <span className="data-val" style={{ fontWeight: 800 }}>P.{String(roomDetail?.roomNumber || room?.roomNumber || '').replace(/^P\./i, '')}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Khu vực</span>
                  <span className="data-val">{zone.name}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Diện tích</span>
                  <span className="data-val">{room.area} m²</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Sức chứa tối đa</span>
                  <span className="data-val">{room.maxTenants} Người</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Đơn giá Điện</span>
                  <span className="data-val" style={{ color: '#10b981', fontWeight: 700 }}>
                    {formatVND(utilityRates?.elecPrice ?? 3500)} / kWh
                  </span>
                </div>
                <div className="data-item">
                  <span className="data-label">Đơn giá Nước</span>
                  <span className="data-val" style={{ color: '#3b82f6', fontWeight: 700 }}>
                    {formatVND(utilityRates?.waterPrice ?? 18000)} / m³
                  </span>
                </div>
                <div className="data-item">
                  <span className="data-label">Internet / Wifi</span>
                  <span className="data-val" style={{ color: '#6366f1', fontWeight: 700 }}>
                    {(() => {
                      const wifi = zoneServices.find(s => s.name?.toLowerCase().includes('wifi') || s.name?.toLowerCase().includes('internet'));
                      return wifi ? `${formatVND(wifi.price)} / ${wifi.unit}` : 'Miễn phí (Gói 200Mbps)';
                    })()}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <span className="data-label" style={{ display: 'block', marginBottom: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Hình ảnh thực tế căn hộ (4 ảnh):</span>
                <div className="gallery-preview" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80" alt="Phòng ngủ" className="gallery-thumb" style={{ height: 90, borderRadius: 10, objectFit: 'cover', width: '100%', border: '1px solid var(--border-color)' }} />
                  <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80" alt="Phòng khách" className="gallery-thumb" style={{ height: 90, borderRadius: 10, objectFit: 'cover', width: '100%', border: '1px solid var(--border-color)' }} />
                  <img src="https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=400&q=80" alt="Bếp" className="gallery-thumb" style={{ height: 90, borderRadius: 10, objectFit: 'cover', width: '100%', border: '1px solid var(--border-color)' }} />
                  <img src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80" alt="Nhà vệ sinh" className="gallery-thumb" style={{ height: 90, borderRadius: 10, objectFit: 'cover', width: '100%', border: '1px solid var(--border-color)' }} />
                </div>
              </div>
            </div>

            {/* Panel: Danh Mục Nội Thất & Thiết Bị Bàn Giao */}
            <div className="panel">
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title"><Box size={18} color="#6366f1" /> Danh Mục Nội Thất & Thiết Bị Bàn Giao</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowEquipmentModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} /> Thêm Thiết Bị
                </button>
              </div>
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Tên thiết bị / Nội thất</th>
                      <th>Thương hiệu / Mã</th>
                      <th>Số lượng</th>
                      <th>Tình trạng</th>
                      <th style={{ width: 80, textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(roomDetail?.equipments || room?.equipments) && (roomDetail?.equipments || room?.equipments).length > 0 ? (
                      (roomDetail?.equipments || room?.equipments).map(eq => (
                        <tr key={eq.id}>
                          <td><strong>{eq.name}</strong></td>
                          <td>{eq.brand || '---'}</td>
                          <td>{eq.quantity < 10 ? `0${eq.quantity}` : eq.quantity} Cái</td>
                          <td>
                            <span className={`status-pill ${eq.condition?.includes('tốt') || eq.condition?.includes('Mới') ? 'active' : 'pending'}`}>
                              {eq.condition}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteEquipment(eq.id)} title="Xóa thiết bị" style={{ width: 30, height: 30, padding: 0, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                          Chưa có thiết bị nào được ghi nhận cho phòng này. Bấm "Thêm Thiết Bị" để bổ sung.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Tiện Ích & Ghi Chú */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title"><Sparkles size={18} color="#f59e0b" /> Tiện Ích Phòng</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                {(() => {
                  let items = ["Máy lạnh", "Wifi6 200M", "Bếp từ", "Ban công", "Khóa từ", "Smart TV", "Chỗ để xe", "Camera 24/7"];
                  const amenitiesStr = roomDetail?.amenities || room?.amenities;
                  if (amenitiesStr) {
                    try {
                      const parsed = JSON.parse(amenitiesStr);
                      if (Array.isArray(parsed) && parsed.length > 0) items = parsed;
                    } catch {
                      items = amenitiesStr.split(',').map(s => s.trim()).filter(Boolean);
                    }
                  }
                  return items.map((item, idx) => (
                    <div key={idx} className="amenity-chip" style={{ padding: '10px 12px', background: 'rgba(15,23,42,0.6)', borderRadius: 10, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                      <Sparkles size={16} color="#10b981" /> {item}
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title"><StickyNote size={18} color="#6366f1" /> Ghi Chú Riêng Chủ Trọ</h3>
              </div>
              <textarea
                className="form-control"
                rows={5}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ghi chú cá nhân về phòng hoặc khách thuê..."
                style={{ resize: 'vertical', fontSize: 14, lineHeight: 1.5 }}
              />
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={handleSaveNotes}>
                Lưu Ghi Chú
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: KHÁCH THUÊ & HỢP ĐỒNG ----------------- */}
      {activeTab === 'tenant' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24 }}>
          {/* Card Khách Thuê */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title"><Users size={18} color="#6366f1" /> Danh Sách Khách Thuê ({tenants.length} người)</h3>
              <span className="status-pill active">Max {room.maxTenants} người</span>
            </div>

            {tenants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', background: 'rgba(15,23,42,0.6)', borderRadius: 12 }}>
                <User size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
                <p style={{ margin: 0, fontSize: 14 }}>Phòng hiện tại đang trống, chưa có khách thuê.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {tenants.map((t, idx) => (
                  <div key={t.id || idx} style={{ padding: '18px', background: 'rgba(15,23,42,0.8)', borderRadius: 14, border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                        {t.fullName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {t.fullName}
                          {idx === 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(16,185,129,0.3)' }}>Khách đại diện</span>}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{t.email || 'Chưa cập nhật email'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Số Điện Thoại</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginTop: 2 }}><Phone size={12} style={{ display: 'inline', marginRight: 4 }} />{t.phone}</div>
                      </div>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Số CCCD</div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{t.cccd}</div>
                      </div>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Quê Quán</div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{t.hometown || 'Chưa cập nhật'}</div>
                      </div>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Ngày Chuyển Vào</div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{t.moveInDate ? new Date(t.moveInDate).toLocaleDateString('vi-VN') : '-'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card Hợp Đồng */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title"><CreditCard size={18} color="#10b981" /> Hợp Đồng Thuê Nhà</h3>
            </div>

            {!activeContract ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', background: 'rgba(15,23,42,0.6)', borderRadius: 12 }}>
                <CreditCard size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
                <p style={{ margin: 0, fontSize: 14 }}>Chưa có hợp đồng đang có hiệu lực.</p>
              </div>
            ) : (
              <div style={{ padding: '18px', background: 'rgba(16,185,129,0.06)', borderRadius: 14, border: '1px solid rgba(16,185,129,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Mã hợp đồng</span>
                    <span style={{ fontWeight: 800, fontSize: 16, color: '#10b981' }}>{activeContract.contractCode}</span>
                  </div>
                  <span className="status-pill active">✅ Đang hiệu lực</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Thời Hạn Hợp Đồng</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                      {new Date(activeContract.startDate).toLocaleDateString('vi-VN')} → {new Date(activeContract.endDate).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Tiền Đặt Cọc</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>{formatVND(activeContract.deposit)}</div>
                  </div>
                </div>

                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => {
                  if (activeContract.fileUrl) {
                    window.open(activeContract.fileUrl, '_blank');
                  } else {
                    window.print();
                  }
                }}>
                  <Download size={16} /> {activeContract.fileUrl ? 'Tải Hợp Đồng PDF (Bản Gốc)' : 'In / Xuất Hợp Đồng (PDF)'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: ĐIỆN NƯỚC & HÓA ĐƠN ----------------- */}
      {activeTab === 'utilities' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24 }}>
          {/* Chỉ số điện nước */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title"><Zap size={18} color="#f59e0b" /> Chỉ Số Điện & Nước Mới Nhất</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ padding: '18px', background: 'rgba(245,158,11,0.09)', borderRadius: 14, border: '1px solid rgba(245,158,11,0.3)' }}>
                <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700, marginBottom: 4 }}>⚡ Số Điện Mới Nhất</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{currentElec} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>kWh</span></div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Đơn giá: 3.500 đ/kWh</div>
              </div>
              <div style={{ padding: '18px', background: 'rgba(59,130,246,0.09)', borderRadius: 14, border: '1px solid rgba(59,130,246,0.3)' }}>
                <div style={{ fontSize: 13, color: '#3b82f6', fontWeight: 700, marginBottom: 4 }}>💧 Số Nước Mới Nhất</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{currentWater} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>m³</span></div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Đơn giá: 25.000 đ/m³</div>
              </div>
            </div>

            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Lịch sử chốt công tơ các kỳ gần đây:</h4>
            {(!roomDetail?.utilityLogs || roomDetail.utilityLogs.length === 0) ? (
              <div style={{ padding: '16px', background: 'rgba(15,23,42,0.6)', borderRadius: 10, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Chưa có lịch sử chốt công tơ điện nước cho phòng này.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {roomDetail.utilityLogs.map(log => (
                  <div key={log.id} style={{ padding: '12px 14px', background: 'rgba(15,23,42,0.8)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: 14 }}>Kỳ tháng {log.month}</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                        ({log.recordedAt ? new Date(log.recordedAt).toLocaleDateString('vi-VN') : ''})
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      ⚡ {log.newElec} kWh (+{log.elecUsed}) | 💧 {log.newWater} m³ (+{log.waterUsed})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lịch sử hóa đơn */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title"><FileText size={18} color="#6366f1" /> Lịch Sử Hóa Đơn (6 Kỳ Gần Nhất)</h3>
            </div>

            {recentInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', background: 'rgba(15,23,42,0.6)', borderRadius: 12 }}>
                <FileText size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
                <p style={{ margin: 0, fontSize: 14 }}>Chưa có hóa đơn phát sinh cho phòng này.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recentInvoices.map(inv => {
                  const isPaid = (inv.status || '').toLowerCase() === 'paid';
                  return (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(15,23,42,0.8)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>Mã: {inv.invoiceCode}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Kỳ tháng {inv.month} • Hạn: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('vi-VN') : ''}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: '#6366f1', fontSize: 16 }}>{formatVND(inv.totalAmount)}</div>
                          <span className={`status-pill ${isPaid ? 'paid' : 'unpaid'}`} style={{ marginTop: 4 }}>
                            {isPaid ? '✅ Đã trả' : '⏳ Chưa thanh toán'}
                          </span>
                        </div>
                        <button
                          className="btn btn-sm btn-danger"
                          title="Xóa hóa đơn để test lại"
                          style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
                          onClick={async () => {
                            if (!window.confirm(`Bạn có chắc muốn xóa hóa đơn ${inv.invoiceCode}?`)) return;
                            try {
                              await invoiceService.deleteInvoice(inv.id);
                              showToast('Đã xóa hóa đơn thành công!');
                              await loadDetail();
                            } catch (e) {
                              showToast('⚠️ Không thể xóa hóa đơn: ' + (e.response?.data?.message || e.message));
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB 4: BẢO TRÌ & BÁO LỖI ----------------- */}
      {activeTab === 'maintenance' && (
        <div className="panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="panel-title"><Wrench size={18} color="#f43f5e" /> Yêu Cầu Bảo Trì & Sửa Chữa ({maintenanceLogs.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowMaintenanceModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> Tạo Yêu Cầu Sửa Chữa
            </button>
          </div>

          {maintenanceLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', background: 'rgba(15,23,42,0.6)', borderRadius: 12 }}>
              <Wrench size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Chưa có yêu cầu bảo trì / sửa chữa nào cho phòng này.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Tiêu đề sự cố / Mô tả</th>
                    <th>Mức độ ưu tiên</th>
                    <th>Ngày tạo</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceLogs.map(m => (
                    <tr key={m.id}>
                      <td><strong>{m.title || m.description || 'Sửa chữa'}</strong></td>
                      <td>
                        <span className={`status-pill ${m.priority === 'High' ? 'danger' : 'pending'}`}>
                          {m.priority === 'High' ? '🔴 Cao' : m.priority === 'Low' ? '🟢 Thấp' : '🟡 Vừa phải'}
                        </span>
                      </td>
                      <td>{m.createdAt ? new Date(m.createdAt).toLocaleDateString('vi-VN') : '-'}</td>
                      <td>
                        <span className={`status-pill ${m.status === 'Completed' || m.status === 'Resolved' ? 'active' : 'pending'}`}>
                          {m.status === 'Completed' || m.status === 'Resolved' ? 'Đã xử lý xong' : m.status || 'Đang xử lý'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* 🧾 MODAL LẬP HÓA ĐƠN THÁNG */}
      {showInvoiceModal && (
        <div className="modal-backdrop" onClick={() => setShowInvoiceModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 580, width: '100%', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', margin: 'auto' }}>
            <div className="modal-header" style={{ padding: '16px 22px' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '18px' }}>
                <FilePlus size={20} color="#10b981" /> Lập Hóa Đơn Tiền Nhà - Phòng P.{roomDetail?.roomNumber || room.roomNumber}
              </h3>
              <button className="btn-close" onClick={() => setShowInvoiceModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateInvoice}>
              <div className="modal-body" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                
                {/* Thông tin phòng & khách */}
                <div style={{ background: 'var(--bg-dark)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Khu trọ: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{zone.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Khách đại diện: </span>
                    <strong style={{ color: '#10b981' }}>{mainTenant?.fullName || 'Chưa xếp khách'}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Tháng Thu Tiền *</label>
                    <input
                      type="month"
                      className="form-control"
                      value={invoiceForm.month}
                      onChange={e => setInvoiceForm({ ...invoiceForm, month: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Hạn Thanh Toán *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={invoiceForm.dueDate}
                      onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Tiền Thuê Phòng (VNĐ) *</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      className="form-control"
                      value={invoiceForm.rentFee}
                      onChange={e => setInvoiceForm({ ...invoiceForm, rentFee: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Tiền Điện (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      className="form-control"
                      value={invoiceForm.elecFee}
                      onChange={e => setInvoiceForm({ ...invoiceForm, elecFee: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Tiền Nước (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      className="form-control"
                      value={invoiceForm.waterFee}
                      onChange={e => setInvoiceForm({ ...invoiceForm, waterFee: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Phí Dịch Vụ / Xe (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      className="form-control"
                      value={invoiceForm.serviceFee}
                      onChange={e => setInvoiceForm({ ...invoiceForm, serviceFee: e.target.value })}
                    />
                  </div>
                </div>

                {/* Tổng Tiền Preview */}
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px 18px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tổng tiền hóa đơn:</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>
                    {formatVND(
                      Number(invoiceForm.rentFee || 0) +
                      Number(invoiceForm.elecFee || 0) +
                      Number(invoiceForm.waterFee || 0) +
                      Number(invoiceForm.serviceFee || 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '14px 22px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <FilePlus size={16} /> {submitting ? 'Đang tạo...' : 'Xác Nhận & Phát Hành Hóa Đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✏️ MODAL SỬA PHÒNG */}
      {showEditModal && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, width: '100%', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', margin: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit3 size={20} color="#6366f1" /> Chỉnh Sửa Thông Tin Phòng
              </h3>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdateRoom}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label">Mã Phòng</label>
                  <input type="text" className="form-control" value={editForm.roomNumber} onChange={e => setEditForm({ ...editForm, roomNumber: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Tầng</label>
                  <input type="number" className="form-control" value={editForm.floor} onChange={e => setEditForm({ ...editForm, floor: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Giá Thuê / Tháng (đ)</label>
                  <input type="number" className="form-control" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Diện Tích (m²)</label>
                  <input type="number" className="form-control" value={editForm.area} onChange={e => setEditForm({ ...editForm, area: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Sức Chứa Tối Đa (Người)</label>
                  <input type="number" className="form-control" value={editForm.maxTenants} onChange={e => setEditForm({ ...editForm, maxTenants: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Trạng Thái</label>
                  <select className="form-control" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="Occupied">Đang thuê</option>
                    <option value="Vacant">Còn trống</option>
                    <option value="Maintenance">Bảo trì</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📦 MODAL THÊM THIẾT BỊ BÀN GIAO */}
      {showEquipmentModal && (
        <div className="modal-backdrop" onClick={() => setShowEquipmentModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '100%', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', margin: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Box size={20} color="#6366f1" /> Thêm Thiết Bị Bàn Giao
              </h3>
              <button className="btn-close" onClick={() => setShowEquipmentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddEquipment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Tên thiết bị *</label>
                  <input type="text" className="form-control" placeholder="VD: Máy lạnh Daikin, Tủ lạnh..." value={eqForm.name} onChange={e => setEqForm({ ...eqForm, name: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Thương hiệu / Mã sản phẩm</label>
                  <input type="text" className="form-control" placeholder="VD: Daikin 1.5HP, Electrolux..." value={eqForm.brand} onChange={e => setEqForm({ ...eqForm, brand: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Số lượng *</label>
                    <input type="number" min="1" className="form-control" value={eqForm.quantity} onChange={e => setEqForm({ ...eqForm, quantity: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Tình trạng</label>
                    <select className="form-control" value={eqForm.condition} onChange={e => setEqForm({ ...eqForm, condition: e.target.value })}>
                      <option value="Mới 100%">Mới 100%</option>
                      <option value="Hoạt động tốt">Hoạt động tốt</option>
                      <option value="Cần bảo trì">Cần bảo trì</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEquipmentModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang thêm...' : 'Lưu Thiết Bị'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🛠️ MODAL TẠO BÁO LỖI / BẢO TRÌ */}
      {showMaintenanceModal && (
        <div className="modal-backdrop" onClick={() => setShowMaintenanceModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '100%', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', margin: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wrench size={20} color="#f43f5e" /> Tạo Yêu Cầu Bảo Trì Mới
              </h3>
              <button className="btn-close" onClick={() => setShowMaintenanceModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateMaintenance}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Tiêu đề sự cố / Thiết bị *</label>
                  <input type="text" className="form-control" placeholder="VD: Máy lạnh chảy nước, Chập điện..." value={maintForm.title} onChange={e => setMaintForm({ ...maintForm, title: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Mô tả chi tiết</label>
                  <textarea className="form-control" rows={3} placeholder="Mô tả cụ thể sự cố cần hỗ trợ..." value={maintForm.description} onChange={e => setMaintForm({ ...maintForm, description: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Mức độ ưu tiên</label>
                  <select className="form-control" value={maintForm.priority} onChange={e => setMaintForm({ ...maintForm, priority: e.target.value })}>
                    <option value="Low">🟢 Thấp</option>
                    <option value="Medium">🟡 Vừa phải</option>
                    <option value="High">🔴 Cao (Khẩn cấp)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMaintenanceModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
