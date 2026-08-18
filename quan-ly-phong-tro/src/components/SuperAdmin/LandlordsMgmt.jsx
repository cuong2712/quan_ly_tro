import React, { useState } from 'react';
import {
  Users, Plus, Search, Lock, Unlock, KeyRound,
  Edit, Eye, CreditCard, ShieldCheck, AlertCircle, X, MapPin, Mail, Phone, Building2
} from 'lucide-react';
import { adminService } from '../../services';

const normalizeLandlord = (landlord) => ({
  ...landlord,
  name: landlord.name ?? landlord.fullName ?? '',
  avatar: landlord.avatar ?? landlord.avatarUrl ?? '',
  status: landlord.status ?? (landlord.isActive === false ? 'locked' : 'active'),
  zonesCount: landlord.zonesCount ?? 0,
  roomsCount: landlord.roomsCount ?? 0,
  cccd: landlord.cccd ?? '',
  hometown: landlord.hometown ?? '',
  cccdFrontUrl: landlord.cccdFrontUrl ?? '',
  cccdBackUrl: landlord.cccdBackUrl ?? '',
});

export const LandlordsMgmt = ({ landlords, setLandlords, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLandlord, setEditingLandlord] = useState(null);
  const [viewingCccdLandlord, setViewingCccdLandlord] = useState(null);
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
                          (l.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (l.cccd ?? '').includes(searchTerm);
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
          <p className="page-subtitle">Thêm mới, phân quyền, kiểm tra CCCD định danh, đặt lại mật khẩu và khóa/mở khóa</p>
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
              placeholder="Tìm theo tên, SĐT, email, số CCCD..."
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
              <th>Định Danh CCCD</th>
              <th>Email</th>
              <th>Khu Trọ / Phòng</th>
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
                      <img src={l.avatar} alt={l.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#6366f1', color: 'white', fontWeight: 700 }}>
                        {l.name.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: '600' }}>{l.name}</div>
                      {l.hometown && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.hometown}</div>}
                    </div>
                  </div>
                </td>
                <td>{l.phone}</td>
                <td>
                  {l.cccd ? (
                    <button
                      onClick={() => setViewingCccdLandlord(l)}
                      style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                      title="Bấm để xem ảnh CCCD 2 mặt của chủ trọ"
                    >
                      <CreditCard size={13} />
                      <span>{l.cccd}</span>
                      <Eye size={12} style={{ opacity: 0.7 }} />
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa nộp CCCD</span>
                  )}
                </td>
                <td>{l.email}</td>
                <td>{l.zonesCount} Khu / {l.roomsCount} Phòng</td>
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

      {/* Modal Xem Hồ Sơ & CCCD 2 mặt của Chủ Trọ */}
      {viewingCccdLandlord && (
        <div className="modal-overlay" onClick={() => setViewingCccdLandlord(null)}>
          <div className="modal-content" style={{ maxWidth: '650px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color="#10b981" />
                Hồ Sơ Định Danh CCCD - {viewingCccdLandlord.name}
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewingCccdLandlord(null)}>
                <X size={16} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-dark)', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Số CCCD:</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>{viewingCccdLandlord.cccd || 'Chưa có'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Số Điện Thoại:</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{viewingCccdLandlord.phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Email:</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{viewingCccdLandlord.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Địa Chỉ / Quê Quán:</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{viewingCccdLandlord.hometown || 'Chưa cập nhật'}</div>
                </div>
              </div>

              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
                Ảnh Chụp CCCD 2 Mặt:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px', background: 'var(--bg-dark)', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Mặt Trước CCCD</div>
                  {viewingCccdLandlord.cccdFrontUrl ? (
                    <img
                      src={viewingCccdLandlord.cccdFrontUrl}
                      alt="CCCD Mặt Trước"
                      style={{ width: '100%', height: '170px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  ) : (
                    <div style={{ height: '170px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      Chưa tải ảnh mặt trước
                    </div>
                  )}
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px', background: 'var(--bg-dark)', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Mặt Sau CCCD</div>
                  {viewingCccdLandlord.cccdBackUrl ? (
                    <img
                      src={viewingCccdLandlord.cccdBackUrl}
                      alt="CCCD Mặt Sau"
                      style={{ width: '100%', height: '170px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  ) : (
                    <div style={{ height: '170px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      Chưa tải ảnh mặt sau
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setViewingCccdLandlord(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
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
