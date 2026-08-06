import React, { useState } from 'react';
import { Building2, Plus, Search, Edit, Trash2, MapPin, Home } from 'lucide-react';
import { zoneService } from '../../services';

export const ZoneMgmt = ({ zones, setZones, rooms, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    totalRooms: 10,
  });

  const filteredZones = zones.filter(z =>
    z.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    z.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingZone(null);
    setFormData({ name: '', address: '', description: '', totalRooms: 10 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (z) => {
    setEditingZone(z);
    setFormData({ ...z });
    setIsModalOpen(true);
  };

  const [saving, setSaving] = useState(false);

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa khu trọ này?')) {
      try {
        await zoneService.deleteZone(id);
        setZones(zones.filter(z => z.id !== id));
        onRefresh?.();
      } catch (err) {
        alert('Lỗi xóa khu trọ: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        address: formData.address,
        description: formData.description,
        totalRooms: Number(formData.totalRooms),
      };
      if (editingZone) {
        const updated = await zoneService.updateZone(editingZone.id, payload);
        setZones(zones.map(z => z.id === editingZone.id ? updated : z));
      } else {
        const created = await zoneService.createZone(payload);
        setZones([...zones, created]);
      }
      setIsModalOpen(false);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi lưu khu trọ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Building2 size={24} color="#6366f1" /> Quản Lý Khu Trọ</h2>
          <p className="page-subtitle">Thêm mới, chỉnh sửa thông tin và quản lý các dãy/khu nhà trọ</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Thêm Khu Trọ Mới
        </button>
      </div>

      <div className="card-table-container">
        <div className="table-toolbar">
          <div className="search-input-group">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tìm theo tên khu trọ, địa chỉ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã Khu</th>
              <th>Tên Khu Trọ</th>
              <th>Địa Chỉ</th>
              <th>Mô Tả</th>
              <th>Số Phòng Rút Gọn</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredZones.map((z) => {
              const zoneRoomCount = rooms.filter(r => r.zoneId === z.id).length;
              return (
                <tr key={z.id}>
                  <td><strong>{z.id}</strong></td>
                  <td>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{z.name}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} color="#6366f1" />
                      <span>{z.address}</span>
                    </div>
                  </td>
                  <td style={{ maxWidth: '280px', color: 'var(--text-muted)' }}>{z.description}</td>
                  <td>
                    <span className="status-pill active">
                      <Home size={12} /> {zoneRoomCount} / {z.totalRooms} Phòng
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-sm btn-secondary" title="Chỉnh sửa" onClick={() => handleOpenEdit(z)}>
                        <Edit size={14} />
                      </button>
                      <button className="btn btn-sm btn-danger" title="Xóa" onClick={() => handleDelete(z.id)}>
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingZone ? 'Chỉnh Sửa Khu Trọ' : 'Thêm Khu Trọ Mới'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>X</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên Khu Trọ</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="VD: Khu Trọ SmartRent Q1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Địa Chỉ Chi Tiết</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="VD: 123 Nguyễn Trãi, Quận 1..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tổng Quy Mô Số Phòng</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      min="1"
                      value={formData.totalRooms}
                      onChange={(e) => setFormData({ ...formData, totalRooms: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mô Tả Tiện Ích / Ghi Chú</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Mô tả tiện ích xung quanh, quy định chung..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
