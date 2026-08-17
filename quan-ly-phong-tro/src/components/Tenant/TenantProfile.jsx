import React, { useState, useEffect } from 'react';
import { UserCheck, Key, Car, Check } from 'lucide-react';
import { profileService, tenantService } from '../../services';

export const TenantProfile = ({ activeTenant, setActiveTenant }) => {
  const [profileData, setProfileData] = useState({
    fullName: activeTenant?.fullName || activeTenant?.name || '',
    phone: activeTenant?.phone || '',
    email: activeTenant?.email || '',
    avatarUrl: activeTenant?.avatarUrl || activeTenant?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    cccd: activeTenant?.cccd || '',
  });

  const [vehicleData, setVehicleData] = useState({
    vehicleCount: activeTenant?.vehicleCount || 0,
    vehicleInfo: activeTenant?.vehicleInfo || '',
  });

  const [passwordData, setPasswordData] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    profileService.getProfile().then(p => {
      if (p) {
        setProfileData(prev => ({
          ...prev,
          fullName: p.fullName || prev.fullName,
          phone: p.phone || prev.phone,
          email: p.email || prev.email,
          avatarUrl: p.avatarUrl || prev.avatarUrl,
        }));
      }
    }).catch(err => console.warn('Get profile error:', err));

    // Lấy thông tin hồ sơ người thuê để xem xe cộ
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      tenantService.getTenants().then(res => {
        const list = Array.isArray(res) ? res : (res?.items || []);
        const myProfile = list.find(t => t.userId === user.id);
        if (myProfile) {
          setVehicleData({
            vehicleCount: myProfile.vehicleCount || 0,
            vehicleInfo: myProfile.vehicleInfo || '',
          });
        }
      }).catch(err => console.warn('Get tenant vehicle error:', err));
    }
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
      setActiveTenant({ ...profileData, ...updated });
      setSuccessMsg('✅ Đã cập nhật thông tin hồ sơ thành công!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert('Lỗi cập nhật hồ sơ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profileService.updateVehicle({
        vehicleCount: Number(vehicleData.vehicleCount),
        vehicleInfo: vehicleData.vehicleInfo,
      });
      setSuccessMsg('✅ Đã cập nhật thông tin đăng ký xe thành công!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert('Lỗi cập nhật thông tin xe: ' + (err.response?.data?.message || err.message));
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
      setSuccessMsg('✅ Đổi mật khẩu thành công!');
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
          <h2 className="page-title"><UserCheck size={24} color="#6366f1" /> Hồ Sơ Khách Thuê</h2>
          <p className="page-subtitle">Cập nhật số điện thoại, đăng ký xe cộ gửi tại nhà trọ và đổi mật khẩu</p>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} /> {successMsg}
        </div>
      )}

      {/* Thông tin hồ sơ cá nhân */}
      <div className="card-table-container" style={{ padding: '24px', marginBottom: '24px' }}>
        <form onSubmit={handleUpdateInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
            <img src={profileData.avatarUrl} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
            <div>
              <h3 style={{ fontSize: '18px' }}>{profileData.fullName}</h3>
              {profileData.cccd && <p style={{ color: 'var(--text-secondary)' }}>CCCD: {profileData.cccd}</p>}
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
              <label className="form-label">Email (Chỉ xem)</label>
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
            {saving ? '⏳ Đang lưu...' : 'Lưu Cập Nhật Hồ Sơ'}
          </button>
        </form>
      </div>

      {/* Đăng ký thông tin Xe cộ */}
      <div className="card-table-container" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Car size={18} color="#3b82f6" /> Đăng Ký Thông Tin Xe Cộ (Phục vụ tính phí giữ xe)
        </h3>
        <form onSubmit={handleUpdateVehicle}>
          <div className="form-group">
            <label className="form-label">Số Lượng Xe Đăng Ký Giữ Tại Trọ *</label>
            <input
              type="number"
              min="0"
              max="10"
              className="form-control"
              required
              value={vehicleData.vehicleCount}
              onChange={(e) => setVehicleData({ ...vehicleData, vehicleCount: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Chi Tiết Biển Số & Loại Xe</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ví dụ: 29A1-12345 (Honda Vision), 30B2-67890 (Exciter)"
              value={vehicleData.vehicleInfo}
              onChange={(e) => setVehicleData({ ...vehicleData, vehicleInfo: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '⏳ Đang lưu...' : 'Cập Nhật Đăng Ký Xe'}
          </button>
        </form>
      </div>

      {/* Đổi mật khẩu */}
      <div className="card-table-container" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={18} color="#f59e0b" /> Đổi Mật Khẩu Đăng Nhập
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
