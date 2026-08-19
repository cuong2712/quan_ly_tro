import React, { useState } from 'react';
import {
  Users, Plus, Search, Lock, Unlock, KeyRound,
  Edit, Eye, CreditCard, ShieldCheck, AlertCircle, X, MapPin, Mail, Phone, Building2
} from 'lucide-react';
import { adminService } from '../../services';
import { getImageUrl, sanitizeCccd, isValidCccd } from '../../utils/formatters';
import { AvatarUploader, CccdCardUploader } from '../Common/ImageUploader';

const normalizeLandlord = (landlord) => ({
  ...landlord,
  name: landlord.name ?? landlord.fullName ?? '',
  avatar: landlord.avatar ?? landlord.avatarUrl ?? '',
  status: landlord.status ?? (landlord.isActive === false ? 'locked' : 'active'),
  zonesCount: landlord.zonesCount ?? 0,
  roomsCount: landlord.roomsCount ?? 0,
  cccd: landlord.cccd ?? landlord.CCCD ?? '',
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
    avatarUrl: '',
    cccd: '',
    hometown: '',
    cccdFrontUrl: '',
    cccdBackUrl: '',
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
    setFormData({
      name: '',
      phone: '',
      email: '',
      password: '',
      role: 'Chủ trọ',
      status: 'active',
      avatarUrl: '',
      cccd: '',
      hometown: '',
      cccdFrontUrl: '',
      cccdBackUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (landlord) => {
    setEditingLandlord(landlord);
    setFormData({
      ...landlord,
      name: landlord.name || landlord.fullName || '',
      avatarUrl: landlord.avatar || landlord.avatarUrl || '',
      cccd: landlord.cccd || '',
      hometown: landlord.hometown || '',
      cccdFrontUrl: landlord.cccdFrontUrl || '',
      cccdBackUrl: landlord.cccdBackUrl || '',
      password: ''
    });
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
    if (!formData.name && !formData.fullName) {
      alert('Vui lòng nhập họ và tên chủ trọ');
      return;
    }
    if (!formData.phone) {
      alert('Vui lòng nhập số điện thoại');
      return;
    }
    if (!formData.email) {
      alert('Vui lòng nhập email đăng nhập');
      return;
    }
    if (!editingLandlord && !formData.password?.trim()) {
      alert('Vui lòng nhập mật khẩu cho tài khoản mới');
      return;
    }

    // Yêu cầu bắt buộc nhập CCCD hợp lệ khi tạo chủ trọ (tương tự như landlord tạo tenant)
    if (!formData.cccd || !formData.cccd.trim()) {
      alert('Vui lòng nhập số Căn cước công dân (CCCD) của chủ trọ!');
      return;
    }
    if (!isValidCccd(formData.cccd)) {
      alert('Số CCCD không hợp lệ! Vui lòng nhập đúng 12 chữ số và bắt đầu bằng số 0 (VD: 001201012345).');
      return;
    }

    const duplicateCccd = landlordRows.find(l => 
      l.cccd === formData.cccd.trim() && 
      (!editingLandlord || l.id !== editingLandlord.id)
    );
    if (duplicateCccd) {
      alert(`Lỗi Số CCCD: CCCD "${formData.cccd}" đã đăng ký cho tài khoản chủ trọ khác (${duplicateCccd.name}).`);
      return;
    }

    setSaving(true);
    try {
      if (editingLandlord) {
        const updated = await adminService.updateLandlord(editingLandlord.id, {
          fullName: formData.name || formData.fullName,
          phone: formData.phone,
          avatarUrl: formData.avatarUrl,
          cccd: formData.cccd,
          hometown: formData.hometown,
          cccdFrontUrl: formData.cccdFrontUrl,
          cccdBackUrl: formData.cccdBackUrl,
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
          avatarUrl: formData.avatarUrl,
          cccd: formData.cccd,
          hometown: formData.hometown,
          cccdFrontUrl: formData.cccdFrontUrl,
          cccdBackUrl: formData.cccdBackUrl,
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
          <p className="page-subtitle">Thêm mới với số CCCD định danh, phân quyền, kiểm tra hồ sơ, đặt lại mật khẩu và khóa/mở khóa</p>
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
              <th>Chủ Trọ</th>
              <th>Số Điện Thoại & Email</th>
              <th>Căn Cước Công Dân (CCCD)</th>
              <th>Khu Trọ / Phòng</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredLandlords.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Không tìm thấy chủ trọ nào phù hợp.
                </td>
              </tr>
            ) : (
              filteredLandlords.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {l.avatar ? (
                        <img
                          src={getImageUrl(l.avatar)}
                          alt={l.name}
                          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(99, 102, 241, 0.4)' }}
                        />
                      ) : (
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#6366f1', color: 'white', fontWeight: 700, fontSize: '14px' }}>
                          {l.name.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{l.name}</div>
                        {l.hometown ? (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>📍 {l.hometown}</div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa cập nhật địa chỉ</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{l.phone || '—'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{l.email}</div>
                  </td>
                  <td>
                    {l.cccd ? (
                      <button
                        onClick={() => setViewingCccdLandlord(l)}
                        style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#10b981',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="Bấm để xem chi tiết hồ sơ & ảnh CCCD 2 mặt của chủ trọ"
                      >
                        <CreditCard size={14} />
                        <span>{l.cccd}</span>
                        <Eye size={13} style={{ opacity: 0.8 }} />
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa nộp CCCD</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.zonesCount}</span> Khu / <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.roomsCount}</span> Phòng
                  </td>
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
              ))
            )}
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
                      src={getImageUrl(viewingCccdLandlord.cccdFrontUrl)}
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
                      src={getImageUrl(viewingCccdLandlord.cccdBackUrl)}
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
          <div className="modal-content" style={{ maxWidth: '650px', width: '92%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingLandlord ? 'Chỉnh Sửa Thông Tin Chủ Trọ' : 'Thêm Tài Khoản Chủ Trọ Mới'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '20px' }}>
                
                {/* Avatar Uploader */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  <AvatarUploader
                    value={formData.avatarUrl || formData.avatar}
                    onChange={(url) => setFormData({ ...formData, avatarUrl: url, avatar: url })}
                    size={84}
                    fallbackName={formData.name || 'C'}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Họ và Tên Chủ Trọ *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="VD: Nguyễn Văn Hải"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Số Điện Thoại *</label>
                    <input
                      type="tel"
                      className="form-control"
                      required
                      placeholder="VD: 0908123456"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Đăng Nhập *</label>
                    <input
                      type="email"
                      className="form-control"
                      required
                      disabled={!!editingLandlord}
                      placeholder="VD: landlord@smartrent.vn"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  {!editingLandlord && (
                    <div className="form-group">
                      <label className="form-label">Mật Khẩu Khởi Tạo *</label>
                      <input
                        type="password"
                        className="form-control"
                        required
                        placeholder="Nhập mật khẩu cho chủ trọ"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Số CCCD / CMND *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      maxLength={12}
                      inputMode="numeric"
                      placeholder="VD: 001201012345 (12 số, bắt đầu bằng 0)"
                      value={formData.cccd}
                      onChange={(e) => setFormData({ ...formData, cccd: sanitizeCccd(e.target.value) })}
                    />
                    <small style={{ fontSize: '11px', color: formData.cccd && !isValidCccd(formData.cccd) ? '#ef4444' : 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      {formData.cccd && !isValidCccd(formData.cccd)
                        ? '⚠️ CCCD phải gồm đúng 12 chữ số và bắt đầu bằng số 0'
                        : 'CCCD 12 số chuẩn, chỉ nhận số và bắt đầu bằng 0'}
                    </small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quê Quán / Địa Chỉ</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: Hải Phòng, Nam Định, Hà Nội..."
                      value={formData.hometown}
                      onChange={(e) => setFormData({ ...formData, hometown: e.target.value })}
                    />
                  </div>
                </div>

                {/* CCCD Image Uploader 2 Mặt */}
                <div style={{ marginTop: '12px', marginBottom: '16px', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={15} color="#6366f1" /> Ảnh Giấy Tờ Căn Cước Công Dân (CCCD 2 Mặt)
                  </label>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <CccdCardUploader
                      label="Mặt Trước CCCD"
                      value={formData.cccdFrontUrl}
                      onChange={(url) => setFormData({ ...formData, cccdFrontUrl: url })}
                    />
                    <CccdCardUploader
                      label="Mặt Sau CCCD"
                      value={formData.cccdBackUrl}
                      onChange={(url) => setFormData({ ...formData, cccdBackUrl: url })}
                    />
                  </div>
                </div>

                <div className="form-row">
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
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : (editingLandlord ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản Chủ Trọ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
