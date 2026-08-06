import React, { useState } from 'react';
import { Users, Plus, Search, Lock, Unlock, KeyRound, Edit, Trash2 } from 'lucide-react';
import { adminService } from '../../services';

const normalizeLandlord = (landlord) => ({
  ...landlord,
  name: landlord.name ?? landlord.fullName ?? '',
  avatar: landlord.avatar ?? landlord.avatarUrl ?? '',
  status: landlord.status ?? (landlord.isActive === false ? 'locked' : 'active'),
  zonesCount: landlord.zonesCount ?? 0,
  roomsCount: landlord.roomsCount ?? 0,
});

export const LandlordsMgmt = ({ landlords, setLandlords, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLandlord, setEditingLandlord] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'Chủ trọ',
    status: 'active',
  });

  const landlordRows = Array.isArray(landlords) ? landlords.map(normalizeLandlord) : [];

  const filteredLandlords = landlordRows.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (l.phone ?? '').includes(searchTerm) ||
                          (l.email ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setEditingLandlord(null);
    setFormData({ name: '', phone: '', email: '', password: '', role: 'Chủ trọ', status: 'active' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (landlord) => {
    setEditingLandlord(landlord);
    setFormData({ ...landlord, password: '' });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      try {
        setLandlords(landlords.filter(l => l.id !== id));
      } catch (err) {
        alert('Lỗi: ' + err.message);
      }
    }
  };

  const handleToggleLock = async (id) => {
    try {
      await adminService.toggleLock(id);
      setLandlords(landlordRows.map(l => l.id === id
        ? { ...l, isActive: !l.isActive, status: l.status === 'active' ? 'locked' : 'active' }
        : l));
      onRefresh?.();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    }
  };

  const toggleLockStatus = handleToggleLock;

  const handleResetPassword = async (id) => {
    try {
      await adminService.resetPassword(id);
      alert('Đặt lại mật khẩu thành công! Mật khẩu mới: SmartRent@2026');
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingLandlord && !formData.password?.trim()) {
      alert('Vui lòng nhập mật khẩu cho tài khoản mới');
      return;
    }
    setSaving(true);
    try {
      if (editingLandlord) {
        const updated = await adminService.updateLandlord(editingLandlord.id, {
          fullName: formData.name || formData.fullName,
          phone: formData.phone,
        });
        setLandlords(landlordRows.map(l => l.id === editingLandlord.id
          ? normalizeLandlord({ ...l, ...updated })
          : l));
      } else {
        const created = await adminService.createLandlord({
          fullName: formData.name || formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        });
        setLandlords([...landlordRows, normalizeLandlord(created)]);
      }
      setIsModalOpen(false);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Users size={24} color="#6366f1" /> Quản Lý Tài Khoản Chủ Trọ</h2>
          <p className="page-subtitle">Thêm mới, phân quyền, đặt lại mật khẩu và khóa/mở khóa tài khoản chủ trọ</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={18} /> Thêm Chủ Trọ Mới
        </button>
      </div>

      {/* Table & Toolbar */}
      <div className="card-table-container">
        <div className="table-toolbar">
          <div className="search-input-group">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tìm theo tên, số điện thoại, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Bị khóa</option>
            </select>
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã ID</th>
              <th>Chủ Trọ</th>
              <th>Số Điện Thoại</th>
              <th>Email</th>
              <th>Khu Trọ / Phòng</th>
              <th>Phân Quyền</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredLandlords.map((l) => (
              <tr key={l.id}>
                <td><strong>{l.id}</strong></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {l.avatar ? (
                      <img src={l.avatar} alt={l.name} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                    ) : (
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#6366f1', color: 'white', fontWeight: 700 }}>
                        {l.name.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <span style={{ fontWeight: '600' }}>{l.name}</span>
                  </div>
                </td>
                <td>{l.phone}</td>
                <td>{l.email}</td>
                <td>{l.zonesCount} Khu / {l.roomsCount} Phòng</td>
                <td><span className="role-badge landlord">{l.role}</span></td>
                <td>
                  <span className={`status-pill ${l.status}`}>
                    {l.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm btn-secondary" title="Sửa thông tin" onClick={() => handleOpenEditModal(l)}>
                      <Edit size={14} />
                    </button>
                    <button className="btn btn-sm btn-secondary" title="Đặt lại mật khẩu" onClick={() => handleResetPassword(l.id)}>
                      <KeyRound size={14} color="#f59e0b" />
                    </button>
                    <button
                      className={`btn btn-sm ${l.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
                      title={l.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
                      onClick={() => handleToggleLock(l.id)}
                    >
                      {l.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingLandlord ? 'Chỉnh Sửa Thông Tin Chủ Trọ' : 'Thêm Tài Khoản Chủ Trọ Mới'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>X</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Họ và Tên Chủ Trọ</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Số Điện Thoại</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Mật khẩu</label>
                    <input
                      type="password"
                      className="form-control"
                      required={!editingLandlord}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Nhập mật khẩu cho tài khoản"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phân Quyền</label>
                    <select
                      className="form-control"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="Chủ trọ">Chủ trọ Thường</option>
                      <option value="Chủ trọ Cao cấp">Chủ trọ Cao cấp</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Trạng Thái</label>
                    <select
                      className="form-control"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="active">Hoạt động</option>
                      <option value="locked">Khóa tài khoản</option>
                    </select>
                  </div>
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
