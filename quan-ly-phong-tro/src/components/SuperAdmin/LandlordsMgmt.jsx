import React, { useState } from 'react';
import {
  Users, Plus, Search, Lock, Unlock, KeyRound,
  Edit, Eye, CreditCard, ShieldCheck, AlertCircle, X, MapPin, Mail, Phone, Building2
} from 'lucide-react';
import { adminService } from '../../services';
import { getImageUrl, sanitizeCccd, isValidCccd } from '../../utils/formatters';
import { validateFullName, validatePhone, validateCCCD, validateEmail } from '../../utils/validators';
import { AvatarUploader, CccdCardUploader, ImageLightboxModal } from '../Common/ImageUploader';

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
  const [lightboxImage, setLightboxImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
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
    const nameErr = validateFullName(formData.name || formData.fullName, 'Họ và tên chủ trọ');
    if (nameErr) { alert(nameErr); return; }

    const phoneErr = validatePhone(formData.phone, 'Số điện thoại');
    if (phoneErr) { alert(phoneErr); return; }

    const emailErr = validateEmail(formData.email, !editingLandlord, 'Email');
    if (emailErr) { alert(emailErr); return; }

    if (!editingLandlord && !formData.password?.trim()) {
      alert('Vui lòng nhập mật khẩu cho tài khoản mới');
      return;
    }

    const cccdErr = validateCCCD(formData.cccd, true, 'Số Căn cước công dân (CCCD)');
    if (cccdErr) { alert(cccdErr); return; }

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
          <p className="page-subtitle">Thêm mới với số CCCD định danh, kiểm tra hồ sơ, đặt lại mật khẩu và khóa/mở khóa tài khoản</p>
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
          <div
            className="modal-content"
            style={{
              maxWidth: '820px',
              width: '95%',
              maxHeight: '96vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '16px 24px' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                <CreditCard size={20} color="#10b981" />
                Hồ Sơ Định Danh CCCD – {viewingCccdLandlord.name}
              </h3>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setViewingCccdLandlord(null)}
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Thông tin cá nhân tóm tắt */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', background: 'var(--bg-dark)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
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
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-all' }}>{viewingCccdLandlord.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Địa Chỉ / Quê Quán:</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{viewingCccdLandlord.hometown || 'Chưa cập nhật'}</div>
                </div>
              </div>

              {/* Khối Ảnh CCCD 2 Mặt */}
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Ảnh Chụp Giấy Tờ CCCD 2 Mặt:</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>💡 Bấm vào ảnh để phóng to toàn màn hình</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Mặt Trước CCCD */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px', background: 'var(--bg-dark)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>Mặt Trước CCCD</span>
                      {viewingCccdLandlord.cccdFrontUrl && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '11px', height: '24px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setLightboxImage({ url: viewingCccdLandlord.cccdFrontUrl, title: `CCCD Mặt Trước - ${viewingCccdLandlord.name}` })}
                        >
                          <Eye size={12} /> Phóng to
                        </button>
                      )}
                    </div>
                    {viewingCccdLandlord.cccdFrontUrl ? (
                      <div
                        style={{ position: 'relative', height: '210px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                        onClick={() => setLightboxImage({ url: viewingCccdLandlord.cccdFrontUrl, title: `CCCD Mặt Trước - ${viewingCccdLandlord.name}` })}
                        title="Bấm để xem ảnh phóng to"
                      >
                        <img
                          src={getImageUrl(viewingCccdLandlord.cccdFrontUrl)}
                          alt="CCCD Mặt Trước"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s ease' }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        />
                      </div>
                    ) : (
                      <div style={{ height: '210px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '12.5px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                        Chưa tải ảnh mặt trước
                      </div>
                    )}
                  </div>

                  {/* Mặt Sau CCCD */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px', background: 'var(--bg-dark)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>Mặt Sau CCCD</span>
                      {viewingCccdLandlord.cccdBackUrl && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '11px', height: '24px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setLightboxImage({ url: viewingCccdLandlord.cccdBackUrl, title: `CCCD Mặt Sau - ${viewingCccdLandlord.name}` })}
                        >
                          <Eye size={12} /> Phóng to
                        </button>
                      )}
                    </div>
                    {viewingCccdLandlord.cccdBackUrl ? (
                      <div
                        style={{ position: 'relative', height: '210px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                        onClick={() => setLightboxImage({ url: viewingCccdLandlord.cccdBackUrl, title: `CCCD Mặt Sau - ${viewingCccdLandlord.name}` })}
                        title="Bấm để xem ảnh phóng to"
                      >
                        <img
                          src={getImageUrl(viewingCccdLandlord.cccdBackUrl)}
                          alt="CCCD Mặt Sau"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s ease' }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        />
                      </div>
                    ) : (
                      <div style={{ height: '210px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '12.5px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                        Chưa tải ảnh mặt sau
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '14px 24px' }}>
              <button type="button" className="btn btn-secondary" style={{ padding: '6px 18px' }} onClick={() => setViewingCccdLandlord(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content"
            style={{
              maxWidth: '740px',
              width: '94%',
              maxHeight: '96vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '14px 22px' }}>
              <h3 className="modal-title" style={{ fontSize: '18px' }}>
                {editingLandlord ? 'Chỉnh Sửa Thông Tin Chủ Trọ' : 'Thêm Tài Khoản Chủ Trọ Mới'}
              </h3>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="modal-body" style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                {/* Avatar Uploader */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <AvatarUploader
                    value={formData.avatarUrl || formData.avatar}
                    onChange={(url) => setFormData({ ...formData, avatarUrl: url, avatar: url })}
                    size={76}
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
                    <label className="form-label">Số Điện Thoại (10 số) *</label>
                    <input
                      type="tel"
                      className="form-control"
                      required
                      maxLength={10}
                      inputMode="numeric"
                      placeholder="VD: 0908123456"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
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
                      onChange={(e) => setFormData({ ...formData, cccd: e.target.value.replace(/\D/g, '').slice(0, 12) })}
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
                <div style={{ marginTop: '4px', marginBottom: '4px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
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

      {/* Lightbox Modal Phóng To Ảnh CCCD */}
      {lightboxImage && (
        <ImageLightboxModal
          imageUrl={lightboxImage.url}
          title={lightboxImage.title}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};
