import React, { useState, useEffect } from 'react';
import { UserCheck, Key, Car, Check, User, CreditCard, Building2, Home, Phone, Mail, MapPin, ShieldCheck, Bike, Sparkles } from 'lucide-react';
import { profileService } from '../../services';
import { AvatarUploader, CccdCardUploader } from '../Common/ImageUploader';
import { formatDate, sanitizeCccd, isValidCccd, isValidFullName, sanitizePhone, isValidPhone } from '../../utils/formatters';

export const TenantProfile = ({ activeTenant, setActiveTenant }) => {
  const [profileData, setProfileData] = useState({
    fullName: activeTenant?.fullName || activeTenant?.name || '',
    phone: activeTenant?.phone || '',
    email: activeTenant?.email || '',
    avatarUrl: activeTenant?.avatarUrl || activeTenant?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    cccd: activeTenant?.cccd || '',
    hometown: activeTenant?.hometown || '',
    cccdFrontUrl: activeTenant?.cccdFrontUrl || '',
    cccdBackUrl: activeTenant?.cccdBackUrl || '',
    role: activeTenant?.role || 'Tenant',
    createdAt: activeTenant?.createdAt || null,
    roomNumber: activeTenant?.roomNumber || '',
    zoneName: activeTenant?.zoneName || '',
    moveInDate: activeTenant?.moveInDate || '',
  });

  const [vehicleData, setVehicleData] = useState({
    vehicleCount: activeTenant?.vehicleCount ?? 0,
    vehicleInfo: activeTenant?.vehicleInfo ?? '',
  });
  const [vehicleList, setVehicleList] = useState([]);

  const [passwordData, setPasswordData] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [vehicleSuccessMsg, setVehicleSuccessMsg] = useState('');
  const [passSuccessMsg, setPassSuccessMsg] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    profileService.getProfile().then(p => {
      if (p) {
        setProfileData(prev => ({
          ...prev,
          fullName: p.fullName || prev.fullName,
          phone: p.phone || prev.phone,
          email: p.email || prev.email,
          avatarUrl: p.avatarUrl || prev.avatarUrl,
          cccd: p.cccd || prev.cccd,
          hometown: p.hometown || prev.hometown,
          cccdFrontUrl: p.cccdFrontUrl || prev.cccdFrontUrl,
          cccdBackUrl: p.cccdBackUrl || prev.cccdBackUrl,
          role: p.role || 'Tenant',
          createdAt: p.createdAt || prev.createdAt,
          roomNumber: p.roomNumber || prev.roomNumber,
          zoneName: p.zoneName || prev.zoneName,
        }));
        const count = Number(p.vehicleCount !== undefined && p.vehicleCount !== null ? p.vehicleCount : (activeTenant?.vehicleCount || 0));
        const infoStr = p.vehicleInfo !== undefined && p.vehicleInfo !== null ? p.vehicleInfo : (activeTenant?.vehicleInfo || '');
        setVehicleData({
          vehicleCount: count,
          vehicleInfo: infoStr,
        });
        const parsed = infoStr.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
        setVehicleList(Array.from({ length: count }, (_, i) => parsed[i] || ''));
      }
    }).catch(err => {
      console.warn('Get profile error:', err);
      if (profileService.getVehicle) {
        profileService.getVehicle().then(v => {
          if (v) {
            const count = Number(v.vehicleCount ?? 0);
            const infoStr = v.vehicleInfo ?? '';
            setVehicleData({
              vehicleCount: count,
              vehicleInfo: infoStr,
            });
            const parsed = infoStr.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
            setVehicleList(Array.from({ length: count }, (_, i) => parsed[i] || ''));
          }
        }).catch(e => console.warn('Get vehicle error:', e));
      }
    });
  }, [activeTenant]);

  const handleVehicleCountChange = (val) => {
    const count = Math.max(0, Math.min(10, parseInt(val, 10) || 0));
    setVehicleData(prev => ({ ...prev, vehicleCount: count }));
    setVehicleList(prev => {
      return Array.from({ length: count }, (_, i) => prev[i] || '');
    });
  };

  const handlePlateChange = (index, val) => {
    setVehicleList(prev => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    if (!profileData.fullName || !isValidFullName(profileData.fullName)) {
      alert('Họ và tên không hợp lệ! Tên chỉ được chứa chữ cái, không được chứa số hoặc ký tự đặc biệt.');
      return;
    }
    if (!profileData.phone || !isValidPhone(profileData.phone)) {
      alert('Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 chữ số và bắt đầu bằng số 0 (VD: 0912345678).');
      return;
    }
    if (profileData.cccd && !isValidCccd(profileData.cccd)) {
      alert('Số CCCD không hợp lệ! Vui lòng nhập đúng 12 chữ số và bắt đầu bằng số 0 (VD: 001201012345).');
      return;
    }
    setSavingInfo(true);
    try {
      const updated = await profileService.updateProfile({
        fullName: profileData.fullName.trim(),
        phone: profileData.phone.trim(),
        avatarUrl: profileData.avatarUrl,
        cccd: profileData.cccd,
        hometown: profileData.hometown,
        cccdFrontUrl: profileData.cccdFrontUrl,
        cccdBackUrl: profileData.cccdBackUrl,
      });
      if (updated) {
        setProfileData(prev => ({
          ...prev,
          fullName: updated.fullName || prev.fullName,
          phone: updated.phone || prev.phone,
          avatarUrl: updated.avatarUrl || prev.avatarUrl,
          cccd: updated.cccd !== undefined ? updated.cccd : prev.cccd,
          hometown: updated.hometown !== undefined ? updated.hometown : prev.hometown,
          cccdFrontUrl: updated.cccdFrontUrl !== undefined ? updated.cccdFrontUrl : prev.cccdFrontUrl,
          cccdBackUrl: updated.cccdBackUrl !== undefined ? updated.cccdBackUrl : prev.cccdBackUrl,
        }));
      }
      if (setActiveTenant) {
        setActiveTenant(prev => ({ ...prev, ...profileData, ...(updated || {}) }));
      }
      setSuccessMsg('✅ Đã cập nhật hồ sơ cá nhân và ảnh CCCD thành công!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert('Lỗi cập nhật hồ sơ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingInfo(false);
    }
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    const count = Number(vehicleData.vehicleCount || 0);

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const plate = (vehicleList[i] || '').trim();
        if (!plate) {
          alert(`⚠️ Bạn đã chọn gửi ${count} xe. Vui lòng nhập đầy đủ biển số cho Xe #${i + 1}!`);
          return;
        }
        if (plate.length < 4 || plate.length > 25) {
          alert(`⚠️ Biển số Xe #${i + 1} "${plate}" không hợp lệ (độ dài thông thường từ 4 đến 25 ký tự).`);
          return;
        }
      }
    }

    const combinedInfo = count > 0 ? vehicleList.slice(0, count).map(p => p.trim()).join(', ') : '';

    setSavingVehicle(true);
    try {
      const payload = {
        vehicleCount: count,
        vehicleInfo: combinedInfo,
      };
      const res = await profileService.updateVehicle(payload);
      if (res) {
        setVehicleData({
          vehicleCount: res.vehicleCount !== undefined ? res.vehicleCount : payload.vehicleCount,
          vehicleInfo: res.vehicleInfo !== undefined ? res.vehicleInfo : payload.vehicleInfo,
        });
      }
      if (setActiveTenant) {
        setActiveTenant(prev => ({ 
          ...prev, 
          vehicleCount: payload.vehicleCount,
          vehicleInfo: payload.vehicleInfo
        }));
      }
      setVehicleSuccessMsg('✅ Đã cập nhật thông tin xe gửi thành công!');
      setTimeout(() => setVehicleSuccessMsg(''), 4000);
    } catch (err) {
      alert('Lỗi cập nhật thông tin xe: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPass !== passwordData.confirmPass) {
      alert('Mật khẩu xác nhận không trùng khớp!');
      return;
    }
    setSavingPass(true);
    try {
      await profileService.changePassword({
        oldPassword: passwordData.oldPass,
        newPassword: passwordData.newPass,
        confirmPassword: passwordData.confirmPass,
      });
      setPassSuccessMsg('✅ Đổi mật khẩu thành công!');
      setPasswordData({ oldPass: '', newPass: '', confirmPass: '' });
      setTimeout(() => setPassSuccessMsg(''), 4000);
    } catch (err) {
      alert('Lỗi đổi mật khẩu: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h2 className="page-title"><UserCheck size={24} color="#6366f1" /> Hồ Sơ Khách Thuê</h2>
          <p className="page-subtitle">Quản lý thông tin cá nhân, cập nhật định danh CCCD 2 mặt và đăng ký phương tiện gửi tại trọ</p>
        </div>
      </div>

      {/* Main 2-Column Responsive Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 370px) minmax(460px, 1fr)', gap: '24px', alignItems: 'start' }}>
        
        {/* ─── CỘT TRÁI: THÔNG TIN TỔNG QUAN & ĐỔI MẬT KHẨU ────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Card 1: Profile Summary Card */}
          <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            {/* Header Banner */}
            <div style={{ height: '90px', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%)', position: 'relative' }}>
              <div style={{ position: 'absolute', right: '14px', top: '12px', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', color: '#fff', fontWeight: '600' }}>
                👤 Khách Thuê
              </div>
            </div>

            {/* Avatar & Basic Info */}
            <div style={{ padding: '0 20px 20px', marginTop: '-46px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', marginBottom: '10px' }}>
                <AvatarUploader
                  value={profileData.avatarUrl}
                  onChange={(newUrl) => {
                    setProfileData(prev => ({ ...prev, avatarUrl: newUrl }));
                    if (setActiveTenant) setActiveTenant(prev => ({ ...prev, avatarUrl: newUrl }));
                  }}
                  size={92}
                  compact={true}
                />
              </div>

              <h3 style={{ fontSize: '19px', fontWeight: '800', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                {profileData.fullName || 'Khách thuê'}
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Mail size={13} /> {profileData.email || 'Chưa cập nhật email'}
              </div>

              {/* Status List Box */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border-color)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Home size={14} color="#6366f1" /> Phòng đang thuê:
                  </span>
                  <strong style={{ color: profileData.roomNumber ? '#6366f1' : 'var(--text-secondary)' }}>
                    {profileData.roomNumber ? `Phòng ${profileData.roomNumber}` : 'Chưa xếp'}
                  </strong>
                </div>

                {profileData.zoneName && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={14} color="#0ea5e9" /> Khu trọ:
                    </span>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{profileData.zoneName}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} color="#10b981" /> Số điện thoại:
                  </span>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{profileData.phone || 'Chưa có'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={14} color="#f59e0b" /> Căn cước công dân:
                  </span>
                  <span style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {profileData.cccd || 'Chưa cập nhật'}
                  </span>
                </div>

                {profileData.hometown && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} color="#ec4899" /> Quê quán:
                    </span>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{profileData.hometown}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bike size={14} color="#10b981" /> Xe đăng ký:
                  </span>
                  <span style={{ fontWeight: '600', color: vehicleData.vehicleCount > 0 ? '#10b981' : 'var(--text-muted)' }}>
                    {vehicleData.vehicleCount > 0 ? `${vehicleData.vehicleCount} xe` : 'Không đăng ký'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Security & Password Change */}
          <div className="card" style={{ padding: '20px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={16} color="#f59e0b" /> Đổi Mật Khẩu Đăng Nhập
            </h3>

            {passSuccessMsg && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', fontWeight: '600' }}>
                {passSuccessMsg}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12.5px' }}>Mật Khẩu Hiện Tại *</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  placeholder="Nhập mật khẩu cũ"
                  value={passwordData.oldPass}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPass: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12.5px' }}>Mật Khẩu Mới *</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  minLength="6"
                  placeholder="Tối thiểu 6 ký tự"
                  value={passwordData.newPass}
                  onChange={(e) => setPasswordData({ ...passwordData, newPass: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12.5px' }}>Xác Nhận Mật Khẩu Mới *</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  minLength="6"
                  placeholder="Nhập lại mật khẩu mới"
                  value={passwordData.confirmPass}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPass: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-secondary" style={{ width: '100%' }} disabled={savingPass}>
                {savingPass ? '⏳ Đang đổi...' : 'Đổi Mật Khẩu'}
              </button>
            </form>
          </div>
        </div>

        {/* ─── CỘT PHẢI: FORM CHỈNH SỬA THÔNG TIN, CCCD 2 MẶT & ĐĂNG KÝ XE ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Card 3: Thông Tin Định Danh & CCCD 2 Mặt */}
          <div className="card" style={{ padding: '22px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="#6366f1" /> Thông Tin Định Danh & Căn Cước Công Dân
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                * Bắt buộc điền thông tin chính xác
              </span>
            </div>

            {successMsg && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', padding: '12px 16px', borderRadius: '8px', marginBottom: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={18} /> {successMsg}
              </div>
            )}

            <form onSubmit={handleUpdateInfo}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Họ và Tên Khách Thuê *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="VD: Nguyễn Văn A"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  />
                  <small style={{ fontSize: '11px', color: profileData.fullName && !isValidFullName(profileData.fullName) ? '#ef4444' : 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    {profileData.fullName && !isValidFullName(profileData.fullName)
                      ? '⚠️ Tên không được có số hoặc ký tự đặc biệt'
                      : 'Tên chỉ gồm chữ cái tiếng Việt và khoảng trắng'}
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Số Điện Thoại Liên Hệ *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="VD: 0912345678 (10 số)"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: sanitizePhone(e.target.value) })}
                  />
                  <small style={{ fontSize: '11px', color: profileData.phone && !isValidPhone(profileData.phone) ? '#ef4444' : 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    {profileData.phone && !isValidPhone(profileData.phone)
                      ? '⚠️ Số điện thoại phải gồm đúng 10 số và bắt đầu bằng số 0'
                      : 'Chỉ nhận 10 chữ số, không được nhập chữ'}
                  </small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email Đăng Nhập (Chỉ xem)</label>
                  <input
                    type="email"
                    className="form-control"
                    readOnly
                    disabled
                    value={profileData.email}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Số Thẻ CCCD / CMND *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    maxLength={12}
                    inputMode="numeric"
                    placeholder="VD: 001201012345 (12 số, bắt đầu bằng 0)"
                    value={profileData.cccd}
                    onChange={(e) => setProfileData({ ...profileData, cccd: sanitizeCccd(e.target.value) })}
                  />
                  <small style={{ fontSize: '11px', color: profileData.cccd && !isValidCccd(profileData.cccd) ? '#ef4444' : 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    {profileData.cccd && !isValidCccd(profileData.cccd)
                      ? '⚠️ CCCD phải gồm đúng 12 chữ số và bắt đầu bằng số 0'
                      : 'CCCD 12 số chuẩn, chỉ nhận số và bắt đầu bằng 0'}
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Quê Quán / Địa Chỉ Thường Trú</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: Hải Phòng, Nam Định, Nghệ An..."
                  value={profileData.hometown}
                  onChange={(e) => setProfileData({ ...profileData, hometown: e.target.value })}
                />
              </div>

              {/* Khu vực Tải Ảnh CCCD 2 Mặt */}
              <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                    📷 Ảnh Chụp Căn Cước Công Dân (CCCD 2 Mặt)
                  </label>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Xem ảnh to hoặc thay ảnh mới
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <CccdCardUploader
                    label="Mặt Trước CCCD"
                    value={profileData.cccdFrontUrl}
                    onChange={(url) => setProfileData({ ...profileData, cccdFrontUrl: url })}
                  />
                  <CccdCardUploader
                    label="Mặt Sau CCCD"
                    value={profileData.cccdBackUrl}
                    onChange={(url) => setProfileData({ ...profileData, cccdBackUrl: url })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={savingInfo} style={{ minWidth: '220px' }}>
                  {savingInfo ? '⏳ Đang lưu...' : 'Lưu Thay Đổi Hồ Sơ & CCCD'}
                </button>
              </div>
            </form>
          </div>

          {/* Card 4: Đăng Ký Thông Tin Xe Cộ */}
          <div className="card" style={{ padding: '22px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Car size={18} color="#3b82f6" /> Đăng Ký Phương Tiện & Giữ Xe
            </h3>

            {vehicleSuccessMsg && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', fontWeight: '600' }}>
                {vehicleSuccessMsg}
              </div>
            )}

            <form onSubmit={handleUpdateVehicle}>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: '700' }}>Số Lượng Xe Gửi Tại Khu Trọ *</label>
                <select
                  className="form-control"
                  style={{ maxWidth: '260px' }}
                  value={vehicleData.vehicleCount}
                  onChange={(e) => handleVehicleCountChange(e.target.value)}
                >
                  <option value={0}>0 xe (Không gửi phương tiện)</option>
                  <option value={1}>1 xe máy / xe đạp điện</option>
                  <option value={2}>2 xe máy / xe đạp điện</option>
                  <option value={3}>3 xe máy / xe đạp điện</option>
                  <option value={4}>4 xe máy / xe đạp điện</option>
                  <option value={5}>5 xe máy / xe đạp điện</option>
                </select>
              </div>

              {Number(vehicleData.vehicleCount) > 0 ? (
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#3b82f6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bike size={18} /> Danh sách biển số ({vehicleData.vehicleCount} xe - bắt buộc nhập đủ tất cả):
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: Number(vehicleData.vehicleCount) > 1 ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr', gap: '12px' }}>
                    {Array.from({ length: Number(vehicleData.vehicleCount) }).map((_, index) => (
                      <div key={index} className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                          Biển số xe #{index + 1} <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          placeholder={`VD: 29A1-${index + 1}23.45 (Vision)`}
                          value={vehicleList[index] || ''}
                          onChange={(e) => handlePlateChange(index, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                  ℹ️ Bạn đang chọn 0 xe. Nếu có phương tiện đi lại gửi tại khu trọ, vui lòng chọn số lượng xe ở trên để khai báo biển số.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="submit" className="btn btn-primary" disabled={savingVehicle}>
                  {savingVehicle ? '⏳ Đang lưu...' : 'Lưu Đăng Ký Xe'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
