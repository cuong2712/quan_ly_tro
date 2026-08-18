import React, { useState } from 'react';
import { Home, Plus, Search, Edit, Trash2, Lock, Unlock, Zap, Droplet } from 'lucide-react';
import { formatVND } from '../../utils/formatters';
import { roomService } from '../../services';

export const RoomMgmt = ({ rooms, setRooms, zones, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    roomNumber: '',
    zoneId: '',
    floor: 1,
    price: 4000000,
    area: 25,
    maxTenants: 2,
    status: 'vacant',
    elecMeter: 0,
    waterMeter: 0,
    description: '',
    amenities: '',
  });

  const filteredRooms = rooms.filter(r => {
    const matchesSearch = r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesZone = zoneFilter === 'all' || r.zoneId === zoneFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesZone && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setFormData({
      roomNumber: `P.${(rooms.length + 1) * 101}`,
      zoneId: zones[0]?.id || 'Z001',
      floor: 1,
      price: 4000000,
      area: 25,
      maxTenants: 2,
      status: 'vacant',
      elecMeter: 0,
      waterMeter: 0,
      description: '',
      amenities: '["Máy lạnh", "Tủ lạnh", "Giường nệm", "Tủ quần áo"]',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r) => {
    setEditingRoom(r);
    setFormData({
      ...r,
      amenities: r.amenities || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa phòng này?')) {
      try {
        await roomService.deleteRoom(id);
        setRooms(rooms.filter(r => r.id !== id));
        onRefresh?.();
      } catch (err) {
        alert('Lỗi xóa phòng: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleToggleLock = async (id) => {
    const r = rooms.find(room => room.id === id);
    if (!r) return;
    const newStatus = r.status === 'locked' ? 'vacant' : 'locked';
    try {
      const updated = await roomService.updateRoom(id, { ...r, status: newStatus });
      setRooms(rooms.map(room => room.id === id ? updated : room));
      onRefresh?.();
    } catch (err) {
      alert('Lỗi đổi trạng thái: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        zoneId: formData.zoneId,
        roomNumber: formData.roomNumber,
        floor: Number(formData.floor),
        price: Number(formData.price),
        area: Number(formData.area),
        maxTenants: Number(formData.maxTenants),
        status: formData.status,
        elecMeter: Number(formData.elecMeter || 0),
        waterMeter: Number(formData.waterMeter || 0),
        serviceFee: Number(formData.serviceFee || 0),
        description: formData.description,
        amenities: formData.amenities,
      };
      if (editingRoom) {
        const updated = await roomService.updateRoom(editingRoom.id, payload);
        setRooms(rooms.map(r => r.id === editingRoom.id ? updated : r));
      } else {
        const created = await roomService.createRoom(payload);
        setRooms([...rooms, created]);
      }
      setIsModalOpen(false);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi lưu phòng: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'occupied': return 'Đang thuê';
      case 'vacant': return 'Còn trống';
      case 'maintenance': return 'Đang sửa chữa';
      case 'deposit': return 'Đã cọc';
      case 'locked': return 'Đã khóa';
      default: return status;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Home size={24} color="#6366f1" /> Quản Lý Phòng Trọ</h2>
          <p className="page-subtitle">Thêm mới, sửa, cập nhật trạng thái phòng, chốt chỉ số và khóa/mở khóa phòng</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Thêm Phòng Mới
        </button>
      </div>

      <div className="card-table-container">
        <div className="table-toolbar">
          <div className="search-input-group">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tìm theo số phòng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <select className="filter-select" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
              <option value="all">Tất cả khu trọ</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>

            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="occupied">Đang thuê</option>
              <option value="vacant">Còn trống</option>
              <option value="deposit">Đã cọc</option>
              <option value="maintenance">Đang sửa chữa</option>
              <option value="locked">Đã khóa</option>
            </select>
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Số Phòng</th>
              <th>Khu Trọ</th>
              <th>Giá Thuê</th>
              <th>Diện Tích & Sức Chứa</th>
              <th>Chỉ Số Điện / Nước</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredRooms.map((r) => {
              const zone = zones.find(z => z.id === r.zoneId);
              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--primary)' }}>{r.roomNumber}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tầng {r.floor}</div>
                  </td>
                  <td>{zone ? zone.name : 'N/A'}</td>
                  <td>
                    <strong style={{ color: '#34d399' }}>{formatVND(r.price)}</strong>
                  </td>
                  <td>{r.area} m² / Tối đa {r.maxTenants} người</td>
                  <td>
                    <div style={{ fontSize: '12px', display: 'flex', gap: '10px' }}>
                      <span style={{ color: '#fbbf24' }}><Zap size={12} style={{ display: 'inline' }} /> {r.elecMeter} kWh</span>
                      <span style={{ color: '#22d3ee' }}><Droplet size={12} style={{ display: 'inline' }} /> {r.waterMeter} m³</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${r.status}`}>
                      {getStatusLabel(r.status)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-sm btn-secondary" title="Sửa thông tin" onClick={() => handleOpenEdit(r)}>
                        <Edit size={14} />
                      </button>
                      <button
                        className={`btn btn-sm ${r.status === 'locked' ? 'btn-primary' : 'btn-secondary'}`}
                        title={r.status === 'locked' ? 'Mở khóa phòng' : 'Khóa phòng'}
                        onClick={() => handleToggleLock(r.id)}
                      >
                        {r.status === 'locked' ? <Unlock size={14} /> : <Lock size={14} color="#f87171" />}
                      </button>
                      <button className="btn btn-sm btn-danger" title="Xóa phòng" onClick={() => handleDelete(r.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingRoom ? 'Chỉnh Sửa Phòng Trọ' : 'Thêm Phòng Trọ Mới'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>X</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Số / Tên Phòng</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="VD: P.101"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Thuộc Khu Trọ</label>
                    <select
                      className="form-control"
                      value={formData.zoneId}
                      onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                    >
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Giá Thuê Phòng (VND/tháng) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      step="100000"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tầng</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      min="1"
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Diện Tích (m²)</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                  <div className="form-group">
                    <label className="form-label">Sức Chứa Tối Đa (Người)</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={formData.maxTenants}
                      onChange={(e) => setFormData({ ...formData, maxTenants: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Chỉ Số Điện Hiện Tại (kWh)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.elecMeter}
                      onChange={(e) => setFormData({ ...formData, elecMeter: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Chỉ Số Nước Hiện Tại (m³)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.waterMeter}
                      onChange={(e) => setFormData({ ...formData, waterMeter: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Trạng Thái Phòng</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="vacant">Còn trống</option>
                    <option value="occupied">Đang thuê</option>
                    <option value="deposit">Đã cọc</option>
                    <option value="maintenance">Đang sửa chữa</option>
                    <option value="locked">Đã khóa</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Mô Tả Phòng</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Mô tả thông tin chung của phòng..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Danh Sách Tiện Ích Nội Thất (Dạng JSON hoặc Thẻ phân cách)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder='["Máy lạnh", "Tủ lạnh", "Giường nệm", "Tủ quần áo"]'
                    value={formData.amenities || ''}
                    onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu Thay Đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
