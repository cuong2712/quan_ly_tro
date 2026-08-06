import React, { useState, useEffect } from 'react';
import { Award, User, Phone, Mail, Key, Camera, Check } from 'lucide-react';
import { profileService } from '../../services';

export const LandlordProfile = ({ activeLandlord, setActiveLandlord }) => {
  const [profileData, setProfileData] = useState({
    fullName: activeLandlord?.fullName || activeLandlord?.name || '',
    phone: activeLandlord?.phone || '',
    email: activeLandlord?.email || '',
    avatarUrl: activeLandlord?.avatarUrl || activeLandlord?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: activeLandlord?.role || 'Landlord',
  });
  const [passwordData, setPasswordData] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    profileService.getProfile().then(p => {
      if (p) {
        setProfileData({
          fullName: p.fullName || '',
          phone: p.phone || '',
          email: p.email || '',
          avatarUrl: p.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: p.role || 'Landlord',
        });
      }
    }).catch(err => console.warn('Get profile error:', err));
  }, []);

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await profileService.updateProfile({
        fullName: profileData.fullName,
        phone: profileData.phone,
        avatarUrl: profileData.avatarUrl,
      });
      setActiveLandlord({ ...profileData, ...updated });
      setSuccessMsg('✅ Đã cập nhật thông tin hồ sơ cá nhân thành công!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert('Lỗi cập nhật hồ sơ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPass !== passwordData.confirmPass) {
      alert('Mật khẩu xác nhận không trùng khớp!');
      return;
    }
    setSaving(true);
    try {
      await profileService.changePassword({
        oldPassword: passwordData.oldPass,
        newPassword: passwordData.newPass,
        confirmPassword: passwordData.confirmPass,
      });
      setSuccessMsg('✅ Đổi mật khẩu đăng nhập thành công!');
      setPasswordData({ oldPass: '', newPass: '', confirmPass: '' });
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert('Lỗi đổi mật khẩu: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Award size={24} color="#6366f1" /> Quản Lý Hồ Sơ Cá Nhân</h2>
          <p className="page-subtitle">Cập nhật thông tin chủ trọ, đổi ảnh đại diện và thay đổi mật khẩu đăng nhập</p>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} /> {successMsg}
        </div>
      )}

      {/* Info Card */}
      <div className="card-table-container" style={{ padding: '24px', marginBottom: '24px' }}>
        <form onSubmit={handleUpdateInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <img src={profileData.avatarUrl} alt="Avatar" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
              <button type="button" className="icon-btn" style={{ position: 'absolute', bottom: 0, right: 0, width: '32px', height: '32px' }} title="Đổi ảnh đại diện">
                <Camera size={14} />
              </button>
            </div>
            <div>
              <h3 style={{ fontSize: '20px' }}>{profileData.fullName}</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Vai trò: {profileData.role === 'Landlord' ? 'Chủ Trọ' : profileData.role}</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Họ và Tên</label>
            <input
              type="text"
              className="form-control"
              required
              value={profileData.fullName}
              onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Số Điện Thoại</label>
              <input
                type="text"
                className="form-control"
                required
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Liên Hệ (Chỉ xem)</label>
              <input
                type="email"
                className="form-control"
                readOnly
                disabled
                value={profileData.email}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '⏳ Đang lưu...' : 'Lưu Thay Đổi Thông Tin'}
          </button>
        </form>
      </div>

      {/* Password Change Card */}
      <div className="card-table-container" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={18} color="#f59e0b" /> Đổi Mật Khẩu
        </h3>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label">Mật Khẩu Hiện Tại *</label>
            <input
              type="password"
              className="form-control"
              required
              value={passwordData.oldPass}
              onChange={(e) => setPasswordData({ ...passwordData, oldPass: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Mật Khẩu Mới *</label>
              <input
                type="password"
                className="form-control"
                required
                minLength="6"
                value={passwordData.newPass}
                onChange={(e) => setPasswordData({ ...passwordData, newPass: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Xác Nhận Mật Khẩu Mới *</label>
              <input
                type="password"
                className="form-control"
                required
                minLength="6"
                value={passwordData.confirmPass}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPass: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-secondary" disabled={saving}>
            {saving ? '⏳ Đang đổi...' : 'Đổi Mật Khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
};
