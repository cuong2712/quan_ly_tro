import React, { useState, useEffect } from 'react';
import {
  Award, User, Phone, Mail, Key, Check, ShieldCheck,
  CreditCard, MapPin, Building2, Calendar, Lock, Sparkles, AlertCircle
} from 'lucide-react';
import { profileService } from '../../services';
import { AvatarUploader, CccdCardUploader } from '../Common/ImageUploader';
import { sanitizeCccd, isValidCccd } from '../../utils/formatters';

export const LandlordProfile = ({ activeLandlord, setActiveLandlord }) => {
  const [profileData, setProfileData] = useState({
    fullName: activeLandlord?.fullName || activeLandlord?.name || '',
    phone: activeLandlord?.phone || '',
    email: activeLandlord?.email || '',
    avatarUrl: activeLandlord?.avatarUrl || activeLandlord?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    cccd: activeLandlord?.cccd || '',
    hometown: activeLandlord?.hometown || '',
    cccdFrontUrl: activeLandlord?.cccdFrontUrl || '',
    cccdBackUrl: activeLandlord?.cccdBackUrl || '',
    role: activeLandlord?.role || 'Landlord',
    createdAt: activeLandlord?.createdAt || null,
  });

  const [passwordData, setPasswordData] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [passSaving, setPassSaving] = useState(false);

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
          role: p.role || 'Landlord',
          createdAt: p.createdAt || prev.createdAt,
        }));
      }
    }).catch(err => console.warn('Get profile error:', err));
  }, []);

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    if (profileData.cccd && !isValidCccd(profileData.cccd)) {
      setErrorMsg('Số CCCD không hợp lệ! Vui lòng nhập đúng 12 chữ số và bắt đầu bằng số 0 (VD: 001201012345).');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const updated = await profileService.updateProfile({
        fullName: profileData.fullName,
        phone: profileData.phone,
        avatarUrl: profileData.avatarUrl,
        cccd: profileData.cccd,
        hometown: profileData.hometown,
        cccdFrontUrl: profileData.cccdFrontUrl,
        cccdBackUrl: profileData.cccdBackUrl,
      });
      if (setActiveLandlord) {
        setActiveLandlord(prev => ({ ...prev, ...profileData, ...updated }));
      }
      setSuccessMsg('✅ Đã cập nhật thông tin cá nhân và hồ sơ CCCD thành công!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi cập nhật hồ sơ');
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
    setPassSaving(true);
    setErrorMsg('');
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
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi đổi mật khẩu');
    } finally {
      setPassSaving(false);
    }
  };

  const hasCccd = Boolean(profileData.cccd?.trim());
  const hasCccdImages = Boolean(profileData.cccdFrontUrl && profileData.cccdBackUrl);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Award size={26} color="#6366f1" /> Hồ Sơ Cá Nhân Chủ Trọ
          </h2>
          <p className="page-subtitle">
            Cập nhật họ tên, số điện thoại, định danh CCCD 2 mặt để Ban Quản Trị xác thực và quản lý tài khoản
          </p>
        </div>
      </div>

      {/* Thông báo */}
      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '14px 18px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
          <Check size={20} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '14px 18px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
          <AlertCircle size={20} /> {errorMsg}
        </div>
      )}

      {/* Grid 2 Cột chuẩn Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 370px) minmax(460px, 1fr)', gap: 24, alignItems: 'start' }}>
        
        {/* CỘT TRÁI: Thẻ Tóm Tắt Chủ Trọ & Trạng Thái Xác Minh */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ padding: '28px 24px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <AvatarUploader
                value={profileData.avatarUrl}
                onChange={(newUrl) => setProfileData({ ...profileData, avatarUrl: newUrl })}
                size={110}
                compact={true}
              />
            </div>

            <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              {profileData.fullName || 'Chủ Trọ'}
            </h3>
            
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', borderRadius: 20, fontSize: 12.5, fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.3)', marginBottom: 18 }}>
              <Building2 size={13} /> Chủ Nhà Trọ / Quản Lý
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', background: 'var(--bg-dark)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)', marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                <Mail size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profileData.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                <Phone size={15} color="#10b981" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{profileData.phone || 'Chưa cập nhật SĐT'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                <MapPin size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)' }}>{profileData.hometown || 'Chưa cập nhật địa chỉ'}</span>
              </div>
            </div>

            {/* Trạng thái xác thực hồ sơ với SuperAdmin */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color)', textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                Trạng Thái Xác Minh Admin
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: hasCccd && hasCccdImages ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)', border: `1px solid ${hasCccd && hasCccdImages ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}` }}>
                {hasCccd && hasCccdImages ? (
                  <>
                    <ShieldCheck size={18} color="#10b981" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>Đã nộp đủ CCCD 2 mặt</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Admin đã có thể đối soát hồ sơ</div>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle size={18} color="#f59e0b" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>Chưa hoàn tất định danh</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Vui lòng tải ảnh CCCD 2 mặt</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Form Cập Nhật Thông Tin & Giấy Tờ CCCD + Đổi Mật Khẩu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Card 1: Thông tin cơ bản & CCCD */}
          <div className="card" style={{ padding: 26, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <User size={19} color="#6366f1" /> Thông Tin Định Danh & Căn Cước Công Dân
            </h3>

            <form onSubmit={handleUpdateInfo}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="form-label">Họ và Tên Chủ Trọ *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="VD: Nguyễn Văn A"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Số Điện Thoại Liên Hệ *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="VD: 0912345678"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label className="form-label">Email Đăng Nhập (Cố định)</label>
                  <input
                    type="email"
                    className="form-control"
                    disabled
                    readOnly
                    value={profileData.email}
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>

                <div>
                  <label className="form-label">Quê Quán / Địa Chỉ Thường Trú</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Hà Nội, TP.HCM, Đà Nẵng..."
                    value={profileData.hometown}
                    onChange={(e) => setProfileData({ ...profileData, hometown: e.target.value })}
                  />
                </div>
              </div>

              {/* Phần CCCD 2 mặt */}
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <CreditCard size={18} color="#10b981" />
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Căn Cước Công Dân (Phục vụ Quản Lý & Xác Minh Admin)
                  </h4>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Số Thẻ Căn Cước Công Dân (12 số)</label>
                  <input
                    type="text"
                    className="form-control"
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '10px 24px', fontWeight: 700 }}>
                  {saving ? '⏳ Đang lưu...' : 'Lưu Thay Đổi Hồ Sơ'}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Đổi Mật Khẩu Đăng Nhập */}
          <div className="card" style={{ padding: 26, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Key size={19} color="#f59e0b" /> Đổi Mật Khẩu Đăng Nhập
            </h3>

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Mật Khẩu Hiện Tại *</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  placeholder="Nhập mật khẩu đang sử dụng"
                  value={passwordData.oldPass}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPass: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div>
                  <label className="form-label">Mật Khẩu Mới *</label>
                  <input
                    type="password"
                    className="form-control"
                    required
                    minLength="6"
                    placeholder="Ít nhất 6 ký tự"
                    value={passwordData.newPass}
                    onChange={(e) => setPasswordData({ ...passwordData, newPass: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Xác Nhận Mật Khẩu Mới *</label>
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
              </div>

              <div style={{ textAlign: 'right' }}>
                <button type="submit" className="btn btn-secondary" disabled={passSaving} style={{ padding: '9px 20px', fontWeight: 700 }}>
                  {passSaving ? '⏳ Đang đổi...' : 'Đổi Mật Khẩu'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

