import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Home, Users, Plus, Edit, Trash2, ChevronRight,
  ArrowLeft, Zap, Droplets, FileText, CreditCard, Wrench,
  Phone, Mail, Calendar, DollarSign, User, MapPin, Search,
  AlertCircle, CheckCircle, Clock, RefreshCw, MoreVertical, Shield, Settings,
  LayoutGrid, Gauge, Download, FilePlus, Edit3, Maximize, Activity, Sparkles, StickyNote, Box, Wind, Flame, Sun, Tv, Car, Camera,
  UserX, UserCheck, Info, ShieldCheck, AlertTriangle
} from 'lucide-react';
import {
  zoneService, roomService, tenantService,
  invoiceService, utilityService, contractService, serviceMgmtService
} from '../../services';
import { formatVND, formatDate, exportToPDF } from '../../utils/formatters';
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

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

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
    e.preventDefault();
    const hasOccupant = !!(editingRoom && (editingRoom.currentTenantName || editingRoom.tenantName));
    if (editingRoom && (form.status === 'Vacant' || form.status === 'Maintenance') && hasOccupant) {
      const statusName = form.status === 'Vacant' ? 'Còn trống' : 'Bảo trì';
      const tenantName = editingRoom.currentTenantName || editingRoom.tenantName;
      alert(`⚠️ Phòng ${editingRoom.roomNumber} đang có người ở (${tenantName}). Không thể chuyển sang trạng thái "${statusName}". Vui lòng thanh lý hợp đồng và gỡ khách khỏi phòng trước khi đổi trạng thái phòng.`);
      return;
    }
    setSaving(true);
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
                          <option value="Vacant" disabled={!!(editingRoom?.currentTenantName || editingRoom?.tenantName)}>
                            Còn trống {!!(editingRoom?.currentTenantName || editingRoom?.tenantName) ? '(Đang có người ở)' : ''}
                          </option>
                          <option value="Occupied">Đang thuê</option>
                          <option value="Maintenance" disabled={!!(editingRoom?.currentTenantName || editingRoom?.tenantName)}>
                            Bảo trì {!!(editingRoom?.currentTenantName || editingRoom?.tenantName) ? '(Đang có người ở)' : ''}
                          </option>
                        </select>
                        {!!(editingRoom?.currentTenantName || editingRoom?.tenantName) && (
                          <small style={{ color: '#f59e0b', fontSize: '11px', marginTop: 3, display: 'block' }}>
                            ⚠️ Đang có người ở ({editingRoom.currentTenantName || editingRoom.tenantName})
                          </small>
                        )}
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

  // Modal Thêm thành viên ở ghép (Occupant)
  const [showAddOccupantModal, setShowAddOccupantModal] = useState(false);
  const [allTenants, setAllTenants] = useState([]);
  const [occupantSearchText, setOccupantSearchText] = useState('');
  const [addingOccupant, setAddingOccupant] = useState(false);

  // Modal Xem & Xuất Hợp Đồng PDF trực tiếp
  const [showViewContractModal, setShowViewContractModal] = useState(false);

  // Modal Chuyển quyền đại diện hợp đồng
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ newTenantProfileId: '', removeOldTenant: true, note: '' });
  const [transferring, setTransferring] = useState(false);

  const [removingOccupant, setRemovingOccupant] = useState(null); // id đang xử lý

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
    const hasOccupants = tenants.length > 0;
    if ((editForm.status === 'Vacant' || editForm.status === 'Maintenance') && (hasOccupants || !!activeContract)) {
      const statusName = editForm.status === 'Vacant' ? 'Còn trống' : 'Bảo trì';
      alert(`⚠️ Phòng đang có ${tenants.length} người ở hoặc hợp đồng đang có hiệu lực. Không thể chuyển sang trạng thái "${statusName}". Vui lòng thanh lý hợp đồng và gỡ khách khỏi phòng trước khi đổi trạng thái phòng.`);
      return;
    }
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
      const errMsg = err.response?.data?.message || err.message || 'Không thể cập nhật thông tin phòng!';
      alert('⚠️ ' + errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const sc = STATUS_CONFIG[roomDetail?.status || room.status] || STATUS_CONFIG.Vacant;
  const rawTenants = roomDetail?.tenants || (roomDetail?.currentTenant ? [roomDetail.currentTenant] : []);
  const tenants = Array.isArray(rawTenants)
    ? [...rawTenants].sort((a, b) => new Date(a.moveInDate || a.createdAt || 0) - new Date(b.moveInDate || b.createdAt || 0))
    : [];
  // Ưu tiên dùng primaryTenant từ API (người đứng tên HĐ), fallback về tenants[0]
  const primaryTenant = roomDetail?.primaryTenant || tenants.find(t => t.id === roomDetail?.activeContract?.tenantProfileId) || tenants[0];
  const occupants = roomDetail?.occupants || tenants.filter(t => t.id !== primaryTenant?.id);
  const mainTenant = primaryTenant;
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

          {/* ── Panel: Quản Lý Thành Viên Phòng ── */}
          <div className="panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={18} color="#6366f1" /> Thành Viên Phòng
                </h3>
                <span className={`status-pill ${tenants.length >= (roomDetail?.maxTenants || room.maxTenants) ? 'pending' : 'active'}`} style={{ fontSize: '12px', padding: '3px 10px' }}>
                  {tenants.length}/{roomDetail?.maxTenants || room.maxTenants} người
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {activeContract && occupants.length > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    title="Chuyển giao quyền đứng tên hợp đồng cho thành viên ở ghép"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700,
                      borderColor: 'rgba(99, 102, 241, 0.4)', color: '#818cf8',
                      background: 'rgba(99, 102, 241, 0.08)', padding: '6px 12px', borderRadius: 8, fontSize: 12.5
                    }}
                    onClick={() => {
                      setTransferForm({ newTenantProfileId: occupants[0]?.id || '', removeOldTenant: true, note: '' });
                      setShowTransferModal(true);
                    }}
                  >
                    <RefreshCw size={13} /> Chuyển đại diện
                  </button>
                )}
                <button
                  className="btn btn-primary btn-sm"
                  title="Thêm thành viên ở ghép (không tạo hợp đồng mới)"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, padding: '6px 14px', borderRadius: 8, fontSize: 12.5 }}
                  onClick={async () => {
                    try {
                      const all = await tenantService.getTenants();
                      setAllTenants(Array.isArray(all) ? all : (all?.data || []));
                    } catch { setAllTenants([]); }
                    setOccupantSearchText('');
                    setShowAddOccupantModal(true);
                  }}
                >
                  <Plus size={15} /> Thêm thành viên
                </button>
              </div>
            </div>

            {tenants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', background: 'rgba(15,23,42,0.6)', borderRadius: 12 }}>
                <User size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
                <p style={{ margin: 0, fontSize: 14 }}>Phòng hiện tại đang trống, chưa có khách thuê.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* ── 👑 Primary Tenant Card (Người Đứng Tên Hợp Đồng) ── */}
                {primaryTenant && (
                  <div style={{
                    padding: '20px',
                    background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
                    borderRadius: 14,
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                  }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
                      <div style={{
                        width: 50, height: 50, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #047857)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 800, fontSize: 20, flexShrink: 0,
                        boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
                      }}>
                        {primaryTenant.fullName?.charAt(0) || 'P'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: 16.5, color: 'var(--text-primary)' }}>
                            {primaryTenant.fullName}
                          </span>
                          <span style={{
                            fontSize: 11.5, fontWeight: 700, color: '#10b981',
                            background: 'rgba(16,185,129,0.15)', padding: '3px 10px',
                            borderRadius: 6, border: '1px solid rgba(16,185,129,0.35)',
                            display: 'inline-flex', alignItems: 'center', gap: 4
                          }}>
                            👑 Người đại diện HĐ
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                          {primaryTenant.email || 'Chưa cập nhật email'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-dark)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={12} color="#10b981" /> Số Điện Thoại
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginTop: 3 }}>{primaryTenant.phone}</div>
                      </div>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-dark)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ShieldCheck size={12} color="#6366f1" /> Số CCCD / CMT
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>{primaryTenant.cccd || '---'}</div>
                      </div>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-dark)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} color="#f59e0b" /> Quê Quán
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>{primaryTenant.hometown || 'Chưa cập nhật'}</div>
                      </div>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-dark)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} color="#3b82f6" /> Ngày Chuyển Vào
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>
                          {primaryTenant.moveInDate ? new Date(primaryTenant.moveInDate).toLocaleDateString('vi-VN') : '-'}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      marginTop: 14, padding: '10px 12px',
                      background: 'rgba(16, 185, 129, 0.05)',
                      borderRadius: 8, border: '1px dashed rgba(16, 185, 129, 0.25)',
                      display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)'
                    }}>
                      <Info size={14} color="#10b981" style={{ flexShrink: 0 }} />
                      <span>Người đại diện đứng tên hợp đồng chính và nhận hóa đơn tiền nhà hàng tháng.</span>
                    </div>
                  </div>
                )}

                {/* ── 👥 Thành Viên Ở Ghép (Occupants) ── */}
                {occupants.length > 0 && (
                  <div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        👥 Thành viên ở ghép ({occupants.length} người)
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Không đứng tên hợp đồng
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {occupants.map((t) => (
                        <div
                          key={t.id}
                          style={{
                            padding: '14px 18px', background: 'var(--bg-dark)',
                            borderRadius: 12, border: '1px solid var(--border-color)',
                            display: 'flex', gap: 12, alignItems: 'center',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{
                            width: 42, height: 42, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0
                          }}>
                            {t.fullName?.charAt(0) || 'O'}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              {t.fullName}
                              <span style={{
                                fontSize: 10.5, fontWeight: 600, color: '#818cf8',
                                background: 'rgba(99,102,241,0.12)', padding: '2px 8px',
                                borderRadius: 6, border: '1px solid rgba(99,102,241,0.25)'
                              }}>
                                Ở ghép
                              </span>
                            </div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
                              <span><Phone size={11} style={{ display: 'inline', marginRight: 4 }} />{t.phone || 'Chưa có SĐT'}</span>
                              {t.cccd && <span><ShieldCheck size={11} style={{ display: 'inline', marginRight: 4 }} />{t.cccd}</span>}
                              <span><Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />Vào: {t.moveInDate ? new Date(t.moveInDate).toLocaleDateString('vi-VN') : '-'}</span>
                            </div>
                          </div>

                          <button
                            className="btn btn-sm btn-danger"
                            title="Gỡ thành viên khỏi phòng"
                            disabled={removingOccupant === t.id}
                            style={{
                              flexShrink: 0, width: 34, height: 34, padding: 0,
                              borderRadius: 8, display: 'inline-flex', alignItems: 'center',
                              justifyContent: 'center', opacity: removingOccupant === t.id ? 0.5 : 1
                            }}
                            onClick={async () => {
                              if (!confirm(`Bạn có chắc chắn muốn gỡ "${t.fullName}" khỏi phòng này?`)) return;
                              setRemovingOccupant(t.id);
                              try {
                                await roomService.removeOccupant(room.id, t.id);
                                showToast(`✅ Đã gỡ ${t.fullName} khỏi phòng.`);
                                await loadDetail();
                              } catch (err) {
                                alert(err.response?.data?.message || err.message);
                              } finally { setRemovingOccupant(null); }
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700 }}
                    onClick={() => setShowViewContractModal(true)}
                  >
                    <FileText size={16} /> Xem & Xuất Hợp Đồng (PDF)
                  </button>
                  {activeContract.fileUrl && (
                    <button
                      className="btn btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={() => window.open(activeContract.fileUrl, '_blank')}
                      title="Tải file đính kèm gốc"
                    >
                      <Download size={16} /> File Gốc
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: THÊM THÀNH VIÊN Ở GHÉP ── */}
      {showAddOccupantModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddOccupantModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px'
          }}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 580, width: '100%', background: 'var(--bg-card)',
              borderRadius: '16px', border: '1px solid var(--border-color)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', margin: 'auto'
            }}
          >
            <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '18px', fontWeight: 800, margin: 0 }}>
                <Users size={20} color="#6366f1" /> Thêm Thành Viên Ở Ghép - Phòng P.{roomDetail?.roomNumber || room.roomNumber}
              </h3>
              <button className="btn-close" onClick={() => setShowAddOccupantModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* Banner Thông Tin */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '12px', padding: '12px 16px',
                display: 'flex', gap: 12, alignItems: 'flex-start',
                fontSize: '13px', lineHeight: '1.5'
              }}>
                <Info size={18} color="#6366f1" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Nghiệp vụ thành viên ở ghép (Occupant):</strong>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 3 }}>
                    Thành viên ở ghép được liên kết vào phòng mà <strong>không tạo hợp đồng mới</strong>. Người đứng tên hợp đồng ({primaryTenant?.fullName || 'Đại diện'}) tiếp tục quản lý nghĩa vụ tiền phòng & hóa đơn.
                  </div>
                </div>
              </div>

              {/* Sức Chứa Phòng Hiện Tại */}
              <div style={{
                background: 'var(--bg-dark)', padding: '12px 16px',
                borderRadius: '10px', border: '1px solid var(--border-color)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Sức chứa hiện tại: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {tenants.length} / {roomDetail?.maxTenants || room.maxTenants} người
                  </strong>
                </div>
                <span
                  className={`status-pill ${tenants.length >= (roomDetail?.maxTenants || room.maxTenants) ? 'danger' : 'active'}`}
                  style={{ fontSize: '12px' }}
                >
                  {tenants.length >= (roomDetail?.maxTenants || room.maxTenants)
                    ? '⚠️ Phòng đã đạt sức chứa tối đa'
                    : `Còn trống ${Math.max(0, (roomDetail?.maxTenants || room.maxTenants) - tenants.length)} chỗ`}
                </span>
              </div>

              {/* Ô Tìm Kiếm Hồ Sơ */}
              <div>
                <label className="form-label" style={{ fontSize: '13px', marginBottom: 6 }}>
                  Tìm kiếm hồ sơ khách thuê đã đăng ký
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập tên khách, số điện thoại, CCCD hoặc email..."
                    value={occupantSearchText}
                    onChange={e => setOccupantSearchText(e.target.value)}
                    style={{ paddingLeft: 38, height: 40, fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Danh Sách Khách Thuê Khả Dụng — bao gồm khách đang ở phòng khác (có thể chuyển phòng) */}
              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
                {(() => {
                  const q = occupantSearchText.toLowerCase();
                  const available = allTenants.filter(t => {
                    const alreadyInThisRoom = tenants.some(rt => rt.id === t.id);
                    if (alreadyInThisRoom) return false; // đã ở phòng này rồi
                    return (
                      !q ||
                      t.fullName?.toLowerCase().includes(q) ||
                      t.phone?.includes(q) ||
                      t.email?.toLowerCase().includes(q) ||
                      (t.cccd && t.cccd.includes(q))
                    );
                  });

                  if (available.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)', fontSize: 13 }}>
                        <Users size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                        <p style={{ margin: 0 }}>{q ? 'Không tìm thấy khách thuê phù hợp.' : 'Không có hồ sơ khách thuê nào khả dụng.'}</p>
                      </div>
                    );
                  }

                  return available.map(t => {
                    const isMoving = !!(t.roomId); // đang ở phòng khác
                    const isFull = tenants.length >= (roomDetail?.maxTenants || room.maxTenants);
                    return (
                      <div
                        key={t.id}
                        style={{
                          padding: '12px 16px', background: 'var(--bg-dark)',
                          borderRadius: '12px',
                          border: `1px solid ${isMoving ? 'rgba(245,158,11,0.3)' : 'var(--border-color)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: isMoving
                              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0
                          }}>
                            {t.fullName?.charAt(0) || 'T'}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              {t.fullName}
                              {isMoving ? (
                                <span style={{ fontSize: '10.5px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '1px 7px', borderRadius: 4, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                  📦 Đang ở P.{t.roomNumber || 'khác'} → chuyển
                                </span>
                              ) : (
                                <span style={{ fontSize: '10.5px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 7px', borderRadius: 4, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                                  ✅ Chưa có phòng
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                              <span><Phone size={11} style={{ display: 'inline', marginRight: 3 }} />{t.phone}</span>
                              {t.cccd && <span><ShieldCheck size={11} style={{ display: 'inline', marginRight: 3 }} />{t.cccd}</span>}
                              {t.hometown && <span><MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />{t.hometown}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          className={`btn btn-sm ${isMoving ? 'btn-secondary' : 'btn-primary'}`}
                          disabled={addingOccupant || isFull}
                          title={isFull ? 'Phòng đã đầy sức chứa tối đa' : (isMoving ? `Chuyển từ P.${t.roomNumber || '?'} sang phòng này` : 'Thêm vào phòng')}
                          style={{ flexShrink: 0, padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={async () => {
                            const msg = isMoving
                              ? `⚠️ "${t.fullName}" đang ở phòng P.${t.roomNumber || 'khác'}.\nChuyển sang phòng ${roomDetail?.roomNumber || room.roomNumber} với tư cách thành viên ở ghép?`
                              : `Thêm "${t.fullName}" vào phòng ${roomDetail?.roomNumber || room.roomNumber} với tư cách thành viên ở ghép?`;
                            if (!confirm(msg)) return;
                            setAddingOccupant(true);
                            try {
                              await roomService.addOccupant(room.id, t.id);
                              showToast(isMoving
                                ? `✅ Đã chuyển ${t.fullName} sang phòng ${roomDetail?.roomNumber || room.roomNumber} thành công.`
                                : `✅ Đã thêm ${t.fullName} vào phòng thành công.`);
                              setShowAddOccupantModal(false);
                              await loadDetail();
                            } catch (err) {
                              alert(err.response?.data?.message || err.message);
                            } finally { setAddingOccupant(false); }
                          }}
                        >
                          {isMoving ? <><RefreshCw size={13} /> Chuyển</> : <><Plus size={14} /> Thêm</>}
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddOccupantModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: THÊM THÀNH VIÊN Ở GHÉP (LAYOUT CỐ ĐỊNH) ── */}
      {showAddOccupantModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddOccupantModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px'
          }}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 580, width: '100%', maxHeight: '88vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              background: 'var(--bg-card)', borderRadius: '16px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', margin: 'auto'
            }}
          >
            {/* Header Cố Định */}
            <div className="modal-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)', padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '18px', fontWeight: 800, margin: 0 }}>
                <Users size={20} color="#6366f1" /> Thêm Thành Viên Ở Ghép - Phòng P.{roomDetail?.roomNumber || room.roomNumber}
              </h3>
              <button className="btn-close" onClick={() => setShowAddOccupantModal(false)}>✕</button>
            </div>

            {/* Body Cuộn Độc Lập */}
            <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1, minHeight: 0 }}>
              
              {/* Banner Thông Tin */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '12px', padding: '12px 16px',
                display: 'flex', gap: 12, alignItems: 'flex-start',
                fontSize: '13px', lineHeight: '1.5', flexShrink: 0
              }}>
                <Info size={18} color="#6366f1" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Nghiệp vụ thành viên ở ghép (Occupant):</strong>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 3 }}>
                    Thành viên ở ghép được liên kết vào phòng mà <strong>không tạo hợp đồng mới</strong>. Người đứng tên hợp đồng ({primaryTenant?.fullName || 'Đại diện'}) tiếp tục quản lý nghĩa vụ tiền phòng & hóa đơn.
                  </div>
                </div>
              </div>

              {/* Sức Chứa Phòng Hiện Tại */}
              <div style={{
                background: 'var(--bg-dark)', padding: '12px 16px',
                borderRadius: '10px', border: '1px solid var(--border-color)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', flexShrink: 0
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Sức chứa hiện tại: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {tenants.length} / {roomDetail?.maxTenants || room.maxTenants} người
                  </strong>
                </div>
                <span
                  className={`status-pill ${tenants.length >= (roomDetail?.maxTenants || room.maxTenants) ? 'danger' : 'active'}`}
                  style={{ fontSize: '12px' }}
                >
                  {tenants.length >= (roomDetail?.maxTenants || room.maxTenants)
                    ? '⚠️ Phòng đã đạt sức chứa tối đa'
                    : `Còn trống ${Math.max(0, (roomDetail?.maxTenants || room.maxTenants) - tenants.length)} chỗ`}
                </span>
              </div>

              {/* Ô Tìm Kiếm Hồ Sơ */}
              <div style={{ flexShrink: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', marginBottom: 6 }}>
                  Tìm kiếm hồ sơ khách thuê đã đăng ký
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập tên khách, số điện thoại, CCCD hoặc email..."
                    value={occupantSearchText}
                    onChange={e => setOccupantSearchText(e.target.value)}
                    style={{ paddingLeft: 38, height: 40, fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Danh Sách Khách Thuê — bao gồm cả khách đang ở phòng khác (chuyển phòng) */}
              <div style={{ flex: 1, minHeight: 160, maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                {(() => {
                  const q = occupantSearchText.toLowerCase();
                  const available = allTenants.filter(t => {
                    const alreadyInThisRoom = tenants.some(rt => rt.id === t.id);
                    if (alreadyInThisRoom) return false;
                    return (
                      !q ||
                      t.fullName?.toLowerCase().includes(q) ||
                      t.phone?.includes(q) ||
                      t.email?.toLowerCase().includes(q) ||
                      (t.cccd && t.cccd.includes(q))
                    );
                  });

                  if (available.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)', fontSize: 13 }}>
                        <Users size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                        <p style={{ margin: 0 }}>{q ? 'Không tìm thấy khách thuê phù hợp.' : 'Không có hồ sơ khách thuê nào khả dụng.'}</p>
                      </div>
                    );
                  }

                  return available.map(t => {
                    const isMoving = !!(t.roomId);
                    const isFull = tenants.length >= (roomDetail?.maxTenants || room.maxTenants);
                    return (
                      <div
                        key={t.id}
                        style={{
                          padding: '12px 16px', background: 'var(--bg-dark)',
                          borderRadius: '12px',
                          border: `1px solid ${isMoving ? 'rgba(245,158,11,0.3)' : 'var(--border-color)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                          transition: 'all 0.2s', flexShrink: 0
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: isMoving
                              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0
                          }}>
                            {t.fullName?.charAt(0) || 'T'}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              {t.fullName}
                              {isMoving ? (
                                <span style={{ fontSize: '10.5px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '1px 7px', borderRadius: 4, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                  📦 Đang ở P.{t.roomNumber || 'khác'} → chuyển
                                </span>
                              ) : (
                                <span style={{ fontSize: '10.5px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 7px', borderRadius: 4, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                                  ✅ Chưa có phòng
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                              <span><Phone size={11} style={{ display: 'inline', marginRight: 3 }} />{t.phone}</span>
                              {t.cccd && <span><ShieldCheck size={11} style={{ display: 'inline', marginRight: 3 }} />{t.cccd}</span>}
                              {t.hometown && <span><MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />{t.hometown}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          className={`btn btn-sm ${isMoving ? 'btn-secondary' : 'btn-primary'}`}
                          disabled={addingOccupant || isFull}
                          title={isFull ? 'Phòng đã đầy sức chứa tối đa' : (isMoving ? `Chuyển từ P.${t.roomNumber || '?'} sang phòng này` : 'Thêm vào phòng')}
                          style={{ flexShrink: 0, padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={async () => {
                            const msg = isMoving
                              ? `⚠️ "${t.fullName}" đang ở phòng P.${t.roomNumber || 'khác'}.\nChuyển sang phòng ${roomDetail?.roomNumber || room.roomNumber} với tư cách thành viên ở ghép?`
                              : `Thêm "${t.fullName}" vào phòng ${roomDetail?.roomNumber || room.roomNumber} với tư cách thành viên ở ghép?`;
                            if (!confirm(msg)) return;
                            setAddingOccupant(true);
                            try {
                              await roomService.addOccupant(room.id, t.id);
                              showToast(isMoving
                                ? `✅ Đã chuyển ${t.fullName} sang phòng ${roomDetail?.roomNumber || room.roomNumber} thành công.`
                                : `✅ Đã thêm ${t.fullName} vào phòng thành công.`);
                              setShowAddOccupantModal(false);
                              await loadDetail();
                            } catch (err) {
                              alert(err.response?.data?.message || err.message);
                            } finally { setAddingOccupant(false); }
                          }}
                        >
                          {isMoving ? <><RefreshCw size={13} /> Chuyển</> : <><Plus size={14} /> Thêm</>}
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>

            </div>

            {/* Footer Cố Định */}
            <div className="modal-footer" style={{ position: 'sticky', bottom: 0, zIndex: 10, background: 'var(--bg-card)', padding: '14px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddOccupantModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CHUYỂN QUYỀN ĐẠI DIỆN HỢP ĐỒNG ── */}
      {showTransferModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowTransferModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px'
          }}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 600, width: '100%', maxHeight: '88vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              background: 'var(--bg-card)', borderRadius: '16px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', margin: 'auto'
            }}
          >
            {/* Header Cố Định */}
            <div className="modal-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)', padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '18px', fontWeight: 800, margin: 0 }}>
                <RefreshCw size={20} color="#f59e0b" /> Chuyển Quyền Đại Diện Hợp Đồng
              </h3>
              <button className="btn-close" onClick={() => setShowTransferModal(false)}>✕</button>
            </div>

            {/* Body Cuộn Độc Lập */}
            <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1, minHeight: 0 }}>
              
              {/* Banner Thông Tin */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '12px', padding: '12px 16px',
                display: 'flex', gap: 12, alignItems: 'flex-start',
                fontSize: '13px', lineHeight: '1.5', flexShrink: 0
              }}>
                <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ color: '#f59e0b' }}>Chuyển giao quyền đứng tên hợp đồng {activeContract?.contractCode}:</strong>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 3 }}>
                    Dùng khi người đại diện cũ chuyển đi nhưng các thành viên ở ghép vẫn tiếp tục thuê. Hợp đồng chính và các hóa đơn chưa thanh toán sẽ được bàn giao sang người đại diện mới.
                  </div>
                </div>
              </div>

              {/* Minh Họa Trực Quan: Người Đại Diện Cũ -> Người Đại Diện Mới */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12,
                alignItems: 'center', background: 'var(--bg-dark)',
                padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-color)',
                flexShrink: 0
              }}>
                {/* Đại diện hiện tại */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                    Đại diện hiện tại
                  </div>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981, #047857)',
                    margin: '0 auto 6px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16
                  }}>
                    {primaryTenant?.fullName?.charAt(0) || 'P'}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    {primaryTenant?.fullName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {primaryTenant?.phone}
                  </div>
                </div>

                {/* Mũi tên chuyển giao */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#f59e0b' }}>
                  <ChevronRight size={22} />
                  <span style={{ fontSize: '10px', fontWeight: 800, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 6px', borderRadius: 4 }}>
                    BÀN GIAO
                  </span>
                </div>

                {/* Đại diện mới */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                    Đại diện mới nhận HĐ
                  </div>
                  {(() => {
                    const selectedOccupant = occupants.find(o => o.id === transferForm.newTenantProfileId);
                    return selectedOccupant ? (
                      <>
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          margin: '0 auto 6px', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16
                        }}>
                          {selectedOccupant.fullName?.charAt(0) || 'N'}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#818cf8' }}>
                          {selectedOccupant.fullName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {selectedOccupant.phone}
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: '12px 6px', border: '1px dashed var(--border-color)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        Chưa chọn thành viên
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Chọn Thành Viên Ở Ghép Nhận Chuyển Giao */}
              <div style={{ flexShrink: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', marginBottom: 6 }}>
                  Chọn thành viên ở ghép đứng tên đại diện mới <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {occupants.map(o => {
                    const isSelected = transferForm.newTenantProfileId === o.id;
                    return (
                      <div
                        key={o.id}
                        onClick={() => setTransferForm({ ...transferForm, newTenantProfileId: o.id })}
                        style={{
                          padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                          border: isSelected ? '2px solid #6366f1' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-dark)',
                          display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s',
                          boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.2)' : 'none'
                        }}
                      >
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: isSelected ? '#6366f1' : 'rgba(99, 102, 241, 0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0
                        }}>
                          {o.fullName?.charAt(0) || 'U'}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '13.5px', color: isSelected ? '#818cf8' : 'var(--text-primary)' }}>
                            {o.fullName}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{o.phone}</div>
                        </div>
                        {isSelected && <CheckCircle size={16} color="#6366f1" style={{ flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Xử Lý Người Đại Diện Cũ */}
              <div style={{ flexShrink: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', marginBottom: 6 }}>
                  Phương án đối với người đại diện cũ ({primaryTenant?.fullName}) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div
                    onClick={() => setTransferForm({ ...transferForm, removeOldTenant: true })}
                    style={{
                      padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                      border: transferForm.removeOldTenant ? '2px solid #ef4444' : '1px solid var(--border-color)',
                      background: transferForm.removeOldTenant ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-dark)',
                      transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 6,
                      boxShadow: transferForm.removeOldTenant ? '0 0 12px rgba(239, 68, 68, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '13.5px', color: '#ef4444' }}>
                        <UserX size={16} color="#ef4444" /> Gỡ khỏi phòng
                      </span>
                      <input type="radio" checked={transferForm.removeOldTenant} readOnly style={{ accentColor: '#ef4444' }} />
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      Người cũ dọn đi hoàn toàn, gỡ khỏi danh sách thành viên phòng này.
                    </span>
                  </div>

                  <div
                    onClick={() => setTransferForm({ ...transferForm, removeOldTenant: false })}
                    style={{
                      padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                      border: !transferForm.removeOldTenant ? '2px solid #6366f1' : '1px solid var(--border-color)',
                      background: !transferForm.removeOldTenant ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-dark)',
                      transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 6,
                      boxShadow: !transferForm.removeOldTenant ? '0 0 12px rgba(99, 102, 241, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '13.5px', color: '#818cf8' }}>
                        <Users size={16} color="#6366f1" /> Giữ lại Ở ghép
                      </span>
                      <input type="radio" checked={!transferForm.removeOldTenant} readOnly style={{ accentColor: '#6366f1' }} />
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      Người cũ vẫn ở phòng nhưng chuyển thành Thành viên ở ghép.
                    </span>
                  </div>
                </div>
              </div>

              {/* Ghi Chú */}
              <div style={{ flexShrink: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', marginBottom: 6 }}>
                  Ghi chú bàn giao (Tùy chọn)
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Lý do chuyển giao, thỏa thuận tiền cọc giữa các bên..."
                  value={transferForm.note}
                  onChange={e => setTransferForm({ ...transferForm, note: e.target.value })}
                  style={{ resize: 'vertical', fontSize: '13.5px' }}
                />
              </div>
            </div>

            {/* Footer Cố Định */}
            <div className="modal-footer" style={{ position: 'sticky', bottom: 0, zIndex: 10, background: 'var(--bg-card)', padding: '14px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!transferForm.newTenantProfileId || transferring}
                onClick={async () => {
                  setTransferring(true);
                  try {
                    await contractService.transferRepresentative(activeContract.id, {
                      newTenantProfileId: transferForm.newTenantProfileId,
                      removeOldTenantFromRoom: transferForm.removeOldTenant,
                      note: transferForm.note
                    });
                    showToast('✅ Đã chuyển quyền đại diện hợp đồng thành công!');
                    setShowTransferModal(false);
                    await loadDetail();
                  } catch (err) {
                    alert(err.response?.data?.message || err.message);
                  } finally { setTransferring(false); }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <CheckCircle size={16} /> {transferring ? 'Đang xử lý...' : 'Xác Nhận Chuyển Quyền'}
              </button>
            </div>
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
                    <option value="Vacant" disabled={tenants.length > 0 || !!activeContract}>
                      Còn trống {(tenants.length > 0 || !!activeContract) ? `(Không khả dụng - đang có ${tenants.length} người ở)` : ''}
                    </option>
                    <option value="Maintenance" disabled={tenants.length > 0 || !!activeContract}>
                      Bảo trì {(tenants.length > 0 || !!activeContract) ? `(Không khả dụng - đang có ${tenants.length} người ở)` : ''}
                    </option>
                  </select>
                  {(tenants.length > 0 || !!activeContract) && (
                    <small style={{ color: '#f59e0b', fontSize: '11.5px', marginTop: 4, display: 'block', lineHeight: 1.4 }}>
                      ⚠️ Phòng đang có {tenants.length} người ở / hợp đồng hiệu lực. Chỉ có thể ở trạng thái "Đang thuê".
                    </small>
                  )}
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

      {/* 📄 MODAL XEM CHI TIẾT & XUẤT HỢP ĐỒNG PDF TRỰC TIẾP */}
      {showViewContractModal && activeContract && (
        <div className="modal-backdrop" onClick={() => setShowViewContractModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', margin: 'auto' }}>
            
            {/* Header */}
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 className="modal-title" style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={20} color="#10b981" /> Hợp Đồng: <span style={{ color: '#10b981' }}>{activeContract.contractCode}</span>
                </h3>
                <span className="status-pill active" style={{ fontSize: 12 }}>✅ Đang hiệu lực</span>
              </div>
              <button className="btn-close" onClick={() => setShowViewContractModal(false)}>✕</button>
            </div>

            {/* Quick Action Toolbar */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => exportToPDF('zone-contract-pdf-content', `${activeContract.contractCode}.pdf`)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, padding: '7px 16px' }}
              >
                <Download size={16} /> Xuất PDF
              </button>
              {activeContract.fileUrl && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => window.open(activeContract.fileUrl, '_blank')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={14} /> Tải File Gốc
                </button>
              )}
            </div>

            {/* Document Paper Body */}
            <div className="modal-body contract-paper" id="zone-contract-pdf-content" style={{ background: '#ffffff', color: '#0f172a', padding: '28px', overflowY: 'auto', flex: 1 }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '19px', textTransform: 'uppercase', color: '#1e3a8a', fontWeight: '800', margin: 0 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
                <p style={{ fontWeight: 'bold', color: '#0f172a', marginTop: '4px', marginBottom: 0 }}>Độc lập - Tự do - Hạnh phúc</p>
                <h3 style={{ marginTop: '16px', marginBottom: '4px', fontSize: '18px', color: '#1e3a8a', fontWeight: '700' }}>HỢP ĐỒNG THUÊ PHÒNG TRỌ</h3>
                <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Mã số: {activeContract.contractCode}</p>
              </div>

              <div style={{ lineHeight: '1.8', fontSize: '14px', color: '#0f172a' }}>
                <p style={{ color: '#0f172a', margin: '6px 0' }}><strong style={{ color: '#0f172a' }}>BÊN CHO THUÊ (BÊN A):</strong> {activeContract.landlordName || 'Chủ trọ'} {activeContract.landlordPhone ? `- SĐT: ${activeContract.landlordPhone}` : ''}</p>
                <p style={{ color: '#0f172a', margin: '6px 0' }}><strong style={{ color: '#0f172a' }}>BÊN THUÊ PHÒNG (BÊN B):</strong> {primaryTenant?.fullName || activeContract.tenantName || 'Khách thuê'} {primaryTenant?.phone ? `- SĐT: ${primaryTenant.phone}` : ''} {primaryTenant?.cccd ? `- CCCD: ${primaryTenant.cccd}` : ''}</p>

                <h4 style={{ marginTop: '16px', marginBottom: '6px', color: '#1e3a8a', fontSize: '15px' }}>ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG</h4>
                <p style={{ color: '#0f172a', margin: '4px 0' }}>Bên A đồng ý cho Bên B thuê phòng số: <strong style={{ color: '#0f172a' }}>P.{roomDetail?.roomNumber || room.roomNumber}</strong> thuộc khu trọ <strong style={{ color: '#0f172a' }}>{zone.name}</strong> ({zone.address}).</p>
                <p style={{ color: '#0f172a', margin: '4px 0' }}>Diện tích: {roomDetail?.area || room.area} m² | Sức chứa: {roomDetail?.maxTenants || room.maxTenants} người.</p>

                <h4 style={{ marginTop: '16px', marginBottom: '6px', color: '#1e3a8a', fontSize: '15px' }}>ĐIỀU 2: THỜI HẠN & GIÁ THUÊ</h4>
                <p style={{ color: '#0f172a', margin: '4px 0' }}>- Thời hạn hợp đồng: từ ngày <strong style={{ color: '#0f172a' }}>{formatDate(activeContract.startDate)}</strong> đến ngày <strong style={{ color: '#0f172a' }}>{formatDate(activeContract.endDate)}</strong>.</p>
                <p style={{ color: '#0f172a', margin: '4px 0' }}>- Giá thuê phòng: <strong style={{ color: '#10b981' }}>{formatVND(activeContract.rentAmount || roomDetail?.price || room.price)} / tháng</strong>.</p>
                <p style={{ color: '#0f172a', margin: '4px 0' }}>- Tiền đặt cọc: <strong style={{ color: '#f59e0b' }}>{formatVND(activeContract.deposit)}</strong>.</p>

                <h4 style={{ marginTop: '16px', marginBottom: '6px', color: '#1e3a8a', fontSize: '15px' }}>ĐIỀU 3: NGHĨA VỤ CÁC BÊN</h4>
                <p style={{ color: '#0f172a', margin: '4px 0' }}>1. Bên B có trách nhiệm thanh toán tiền phòng, điện nước và dịch vụ đầy đủ đúng thời hạn ghi trên hóa đơn hàng tháng.</p>
                <p style={{ color: '#0f172a', margin: '4px 0' }}>2. Bên B giữ gìn an ninh trật tự, vệ sinh chung và bảo quản trang thiết bị, tài sản bàn giao trong phòng.</p>
                <p style={{ color: '#0f172a', margin: '4px 0' }}>3. Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '36px', textAlign: 'center' }}>
                  <div>
                    <strong style={{ color: '#0f172a' }}>ĐẠI DIỆN BÊN A (CHỦ TRỌ)</strong>
                    <div style={{ height: '70px' }}></div>
                    <p style={{ color: '#0f172a', fontWeight: '600' }}>{activeContract.landlordName || 'Chủ trọ'}</p>
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a' }}>ĐẠI DIỆN BÊN B (KHÁCH THUÊ)</strong>
                    <div style={{ height: '70px' }}></div>
                    <p style={{ color: '#0f172a', fontWeight: '600' }}>{primaryTenant?.fullName || activeContract.tenantName || 'Khách thuê'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowViewContractModal(false)}>
                Đóng
              </button>
            </div>

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
