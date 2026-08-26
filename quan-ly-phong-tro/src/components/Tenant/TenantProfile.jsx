import React, { useState, useEffect } from 'react';
import { UserCheck, Key, Car, Check, User, CreditCard, Building2, Home, Phone, Mail, MapPin, ShieldCheck, Bike, Sparkles } from 'lucide-react';
import { profileService } from '../../services';
import { AvatarUploader, CccdCardUploader } from '../Common/ImageUploader';
import { formatDate, sanitizeCccd, isValidCccd, isValidFullName, sanitizePhone, isValidPhone } from '../../utils/formatters';

const parsePlatesFromInfo = (info, count) => {
  if (!info) {
    return Array(Math.max(0, count || 0)).fill('');
  }
  const items = String(info).split(/[,;\n\r]+/).map(s => s.trim()).filter(Boolean);
  if (items.length < count) {
    return [...items, ...Array(count - items.length).fill('')];
  }
  return items.slice(0, count);
};

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
    plates: parsePlatesFromInfo(activeTenant?.vehicleInfo, activeTenant?.vehicleCount ?? 0),
  });

  const [passwordData, setPasswordData] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [vehicleSuccessMsg, setVehicleSuccessMsg] = useState('');
  const [vehicleErrorMsg, setVehicleErrorMsg] = useState('');
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
        const vCount = p.vehicleCount !== undefined && p.vehicleCount !== null ? p.vehicleCount : (activeTenant?.vehicleCount || 0);
        const vInfo = p.vehicleInfo !== undefined && p.vehicleInfo !== null ? p.vehicleInfo : (activeTenant?.vehicleInfo || '');
        setVehicleData({
          vehicleCount: p.vehicleCount !== undefined && p.vehicleCount !== null ? p.vehicleCount : (activeTenant?.vehicleCount || 0),
          vehicleInfo: p.vehicleInfo !== undefined && p.vehicleInfo !== null ? p.vehicleInfo : (activeTenant?.vehicleInfo || ''),
          vehicleCount: vCount,
          vehicleInfo: vInfo,
          plates: parsePlatesFromInfo(vInfo, vCount),
        });
      }
    }).catch(err => {
      console.warn('Get profile error:', err);
      if (profileService.getVehicle) {
        profileService.getVehicle().then(v => {
          if (v) {
            const vCount = v.vehicleCount ?? 0;
            const vInfo = v.vehicleInfo ?? '';
            setVehicleData({
              vehicleCount: v.vehicleCount ?? 0,
              vehicleInfo: v.vehicleInfo ?? '',
              vehicleCount: vCount,
              vehicleInfo: vInfo,
              plates: parsePlatesFromInfo(vInfo, vCount),
            });
          }
        }).catch(e => console.warn('Get vehicle error:', e));
      }
    });
  }, [activeTenant]);

  const handleVehicleCountChange = (val) => {
    setVehicleErrorMsg('');
    const num = Math.max(0, Math.min(10, parseInt(val, 10) || 0));
    setVehicleData(prev => {
      let currentPlates = prev.plates || [];
      if (currentPlates.length < num) {
        currentPlates = [...currentPlates, ...Array(num - currentPlates.length).fill('')];
      } else if (currentPlates.length > num) {
        currentPlates = currentPlates.slice(0, num);
      }
      return {
        ...prev,
        vehicleCount: num,
        plates: currentPlates,
        vehicleInfo: currentPlates.filter(Boolean).join(', ')
      };
    });
  };

  const handlePlateChange = (index, val) => {
    setVehicleErrorMsg('');
    setVehicleData(prev => {
      const newPlates = [...(prev.plates || [])];
      newPlates[index] = val;
      return {
        ...prev,
        plates: newPlates,
        vehicleInfo: newPlates.filter(Boolean).join(', ')
      };
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
    setVehicleErrorMsg('');
    const count = Number(vehicleData.vehicleCount || 0);
    const currentPlates = vehicleData.plates || [];

    if (count > 0) {
      const emptyPlates = [];
      const validPlates = [];

      for (let i = 0; i < count; i++) {
        const plate = (currentPlates[i] || '').trim();
        if (!plate) {
          emptyPlates.push(`Xe #${i + 1}`);
        } else {
          validPlates.push(plate);
        }
      }

      if (emptyPlates.length > 0) {
        const errorText = `⚠️ Bạn đã đăng ký ${count} xe nhưng chưa nhập biển số cho: ${emptyPlates.join(', ')}. Vui lòng nhập đủ ${count} biển số xe trước khi lưu!`;
        setVehicleErrorMsg(errorText);
        alert(errorText);
        return;
      }

      if (validPlates.length < count) {
        const errorText = `⚠️ Bạn đã đăng ký ${count} xe nhưng mới chỉ nhập ${validPlates.length} biển số xe. Vui lòng nhập đủ ${count} biển số xe!`;
        setVehicleErrorMsg(errorText);
        alert(errorText);
        return;
      }
    }

    setSavingVehicle(true);
    try {
      const cleanedInfo = count > 0 ? (vehicleData.plates || []).map(p => p.trim()).filter(Boolean).join(', ') : '';
      const payload = {
        vehicleCount: Number(vehicleData.vehicleCount || 0),
        vehicleInfo: vehicleData.vehicleInfo || '',
        vehicleCount: count,
        vehicleInfo: cleanedInfo,
      };
      const res = await profileService.updateVehicle(payload);
      if (res) {
        setVehicleData({
          vehicleCount: res.vehicleCount !== undefined ? res.vehicleCount : payload.vehicleCount,
          vehicleInfo: res.vehicleInfo !== undefined ? res.vehicleInfo : payload.vehicleInfo,
        });
      }
      const newCount = res?.vehicleCount !== undefined ? res.vehicleCount : payload.vehicleCount;
      const newInfo = res?.vehicleInfo !== undefined ? res.vehicleInfo : payload.vehicleInfo;

      setVehicleData({
        vehicleCount: newCount,
        vehicleInfo: newInfo,
        plates: parsePlatesFromInfo(newInfo, newCount),
      });

      if (setActiveTenant) {
        setActiveTenant(prev => ({ 
          ...prev, 
          vehicleCount: payload.vehicleCount,
          vehicleInfo: payload.vehicleInfo
          vehicleCount: newCount,
          vehicleInfo: newInfo
        }));
      }
      setVehicleSuccessMsg('✅ Đã cập nhật thông tin xe gửi thành công!');
      setVehicleSuccessMsg(`✅ Đã cập nhật đăng ký ${newCount} xe gửi thành công!`);
      setTimeout(() => setVehicleSuccessMsg(''), 4000);
    } catch (err) {
      alert('Lỗi cập nhật thông tin xe: ' + (err.response?.data?.message || err.message));
      const errMsg = err.response?.data?.message || err.message;
      setVehicleErrorMsg(`❌ ${errMsg}`);
      alert('Lỗi cập nhật thông tin xe: ' + errMsg);
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
          {/* Card 4: Đăng Ký Thông Tin Xe Cộ */}
          <div className="card" style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <Car size={20} color="#3b82f6" /> Đăng Ký Phương Tiện & Giữ Xe
              </h3>
              <span className="badge" style={{ background: vehicleData.vehicleCount > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.15)', color: vehicleData.vehicleCount > 0 ? '#10b981' : 'var(--text-muted)', fontSize: '12.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px' }}>
                {vehicleData.vehicleCount > 0 ? `Đang đăng ký ${vehicleData.vehicleCount} xe` : 'Chưa đăng ký xe'}
              </span>
            </div>

            {vehicleSuccessMsg && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', fontWeight: '600' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13.5px', fontWeight: '600' }}>
                {vehicleSuccessMsg}
              </div>
            )}

            {vehicleErrorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13.5px', fontWeight: '600' }}>
                {vehicleErrorMsg}
              </div>
            )}

            <form onSubmit={handleUpdateVehicle}>
              <div className="form-row">
                <div className="form-group" style={{ flex: '0 0 200px' }}>
                  <label className="form-label">Số Lượng Xe Gửi *</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
              <div className="form-row" style={{ marginBottom: '18px' }}>
                <div className="form-group" style={{ flex: '0 0 260px' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Số Lượng Xe Gửi Tại Nhà Trọ *</label>
                  <select
                    className="form-control"
                    required
                    value={vehicleData.vehicleCount}
                    onChange={(e) => setVehicleData({ ...vehicleData, vehicleCount: e.target.value })}
                  />
                    onChange={(e) => handleVehicleCountChange(e.target.value)}
                    style={{ height: '44px', fontWeight: 700, fontSize: '14px' }}
                  >
                    <option value={0}>0 xe (Không gửi xe tại trọ)</option>
                    <option value={1}>1 xe máy / xe điện</option>
                    <option value={2}>2 xe máy / xe điện</option>
                    <option value={3}>3 xe máy / xe điện</option>
                    <option value={4}>4 xe máy / xe điện</option>
                    <option value={5}>5 xe máy / xe điện</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: '1 1 260px' }}>
                  <label className="form-label">Chi Tiết Biển Số & Loại Xe</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: 29A1-12345 (Vision), 30B2-67890 (Exciter)"
                    value={vehicleData.vehicleInfo || ''}
                    onChange={(e) => setVehicleData({ ...vehicleData, vehicleInfo: e.target.value })}
                  />
                <div style={{ flex: '1 1 280px', display: 'flex', alignItems: 'center' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {vehicleData.vehicleCount === 0 
                      ? '💡 Bạn không đăng ký xe. Nếu có xe mới, hãy chọn số lượng xe và điền đầy đủ biển số tương ứng.'
                      : `💡 Bạn đã chọn đăng ký ${vehicleData.vehicleCount} xe. Hệ thống yêu cầu nhập đầy đủ đúng ${vehicleData.vehicleCount} biển số xe bên dưới để được lưu và cấp vé/thẻ xe.`}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="submit" className="btn btn-primary" disabled={savingVehicle}>
                  {savingVehicle ? '⏳ Đang lưu...' : 'Cập Nhật Đăng Ký Xe'}
              {/* Danh sách nhập biển số từng xe riêng biệt */}
              {vehicleData.vehicleCount > 0 && (
                <div style={{ background: 'var(--bg-dark, rgba(0,0,0,0.2))', padding: '18px 20px', borderRadius: '12px', marginBottom: '18px', border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '14px' }}>
                    <Bike size={16} /> Danh Sách Biển Số Của {vehicleData.vehicleCount} Xe Đăng Ký (Bắt buộc đủ {vehicleData.vehicleCount} xe) *
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                    {Array.from({ length: vehicleData.vehicleCount }).map((_, index) => {
                      const val = (vehicleData.plates && vehicleData.plates[index]) || '';
                      const isMissing = !val.trim();
                      return (
                        <div key={index} className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Biển số Xe #{index + 1} *</span>
                            {isMissing ? (
                              <span style={{ color: '#ef4444', fontSize: '11.5px', fontWeight: 600 }}>Chưa nhập</span>
                            ) : (
                              <span style={{ color: '#10b981', fontSize: '11.5px', fontWeight: 600 }}>✓ Hợp lệ</span>
                            )}
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            required
                            placeholder={`VD: 29A1-1234${index + 1} (Honda Vision)`}
                            value={val}
                            onChange={(e) => handlePlateChange(index, e.target.value)}
                            style={{
                              borderColor: isMissing ? 'rgba(239, 68, 68, 0.6)' : 'var(--border-color)',
                              background: 'var(--bg-card)',
                              height: '42px',
                              fontSize: '13.5px',
                              fontWeight: 600
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={savingVehicle} 
                  style={{ padding: '9px 26px', fontWeight: 800, fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {savingVehicle ? '⏳ Đang lưu...' : 'Lưu Đăng Ký Xe Gửi'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
