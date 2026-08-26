import React, { useState, useEffect } from 'react';
import {
  Award, User, Phone, Mail, Key, Check, ShieldCheck,
  CreditCard, MapPin, Building2, Calendar, Lock, Sparkles, AlertCircle, Save, QrCode, Landmark
} from 'lucide-react';
import { profileService } from '../../services';
import { AvatarUploader, CccdCardUploader } from '../Common/ImageUploader';
import { 
  sanitizeCccd, isValidCccd, isValidFullName, sanitizePhone, isValidPhone,
  VIETNAM_BANKS, sanitizeBankAccountNumber, isValidBankAccountNumber,
  sanitizeBankAccountName, isValidBankAccountName, getVietQRUrl
} from '../../utils/formatters';

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
    bankName: activeLandlord?.bankName || 'BIDV',
    bankAccountNumber: activeLandlord?.bankAccountNumber || '',
    bankAccountName: activeLandlord?.bankAccountName || '',
    role: activeLandlord?.role || 'Landlord',
    createdAt: activeLandlord?.createdAt || null,
  });

  const [passwordData, setPasswordData] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [passSuccessMsg, setPassSuccessMsg] = useState('');
  const [passErrorMsg, setPassErrorMsg] = useState('');
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
          bankName: p.bankName || prev.bankName || 'BIDV',
          bankAccountNumber: p.bankAccountNumber || prev.bankAccountNumber || '',
          bankAccountName: p.bankAccountName || prev.bankAccountName || (p.fullName ? p.fullName.toUpperCase() : ''),
          role: p.role || 'Landlord',
          createdAt: p.createdAt || prev.createdAt,
        }));
      }
    }).catch(err => console.warn('Get profile error:', err));
  }, []);

  const handleUpdateInfo = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    // 1. Kiểm tra họ tên hợp lệ (chữ cái, không số/ký tự đặc biệt)
    if (!profileData.fullName || !isValidFullName(profileData.fullName)) {
      setErrorMsg('Họ và tên không hợp lệ! Tên chỉ được chứa chữ cái tiếng Việt/quốc tế và khoảng trắng.');
      return;
    }

    // 2. Kiểm tra số điện thoại (đúng 10 số, không chứa chữ)
    if (!profileData.phone || !isValidPhone(profileData.phone)) {
      setErrorMsg('Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 chữ số và bắt đầu bằng số 0 (VD: 0912345678).');
      return;
    }

    // 3. Kiểm tra CCCD (nếu có nhập)
    if (profileData.cccd && !isValidCccd(profileData.cccd)) {
      setErrorMsg('Số CCCD không hợp lệ! Vui lòng nhập đúng 12 chữ số và bắt đầu bằng số 0 (VD: 001201012345).');
      return;
    }

    // 4. Kiểm tra Tên chủ tài khoản ngân hàng (nếu có nhập)
    if (profileData.bankAccountName && !isValidBankAccountName(profileData.bankAccountName)) {
      setErrorMsg('Tên chủ tài khoản ngân hàng không hợp lệ! Tên chỉ được chứa chữ cái, không được chứa số hoặc ký tự đặc biệt.');
      return;
    }

    // 5. Kiểm tra Số tài khoản ngân hàng (nếu có nhập)
    if (profileData.bankAccountNumber && !isValidBankAccountNumber(profileData.bankAccountNumber)) {
      setErrorMsg('Số tài khoản ngân hàng không hợp lệ! Số tài khoản chỉ gồm các chữ số (từ 6 đến 20 số).');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const updated = await profileService.updateProfile({
        fullName: profileData.fullName.trim(),
        phone: profileData.phone.trim(),
        avatarUrl: profileData.avatarUrl,
        cccd: profileData.cccd,
        hometown: profileData.hometown,
        cccdFrontUrl: profileData.cccdFrontUrl,
        cccdBackUrl: profileData.cccdBackUrl,
        bankName: profileData.bankName?.trim() || 'BIDV',
        bankAccountNumber: profileData.bankAccountNumber?.trim() || '',
        bankAccountName: profileData.bankAccountName?.trim().toUpperCase() || profileData.fullName.trim().toUpperCase(),
      });
      if (setActiveLandlord) {
        setActiveLandlord(prev => ({ ...prev, ...profileData, ...updated }));
      }
      setSuccessMsg('✅ Đã cập nhật thông tin cá nhân và tài khoản ngân hàng thành công!');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi cập nhật hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPass !== passwordData.confirmPass) {
      setPassErrorMsg('Mật khẩu xác nhận không trùng khớp!');
      return;
    }
    setPassSaving(true);
    setPassErrorMsg('');
    try {
      await profileService.changePassword({
        oldPassword: passwordData.oldPass,
        newPassword: passwordData.newPass,
        confirmPassword: passwordData.confirmPass,
      });
      setPassSuccessMsg('✅ Đổi mật khẩu thành công!');
      setPasswordData({ oldPass: '', newPass: '', confirmPass: '' });
      setTimeout(() => setPassSuccessMsg(''), 3500);
    } catch (err) {
      setPassErrorMsg(err.response?.data?.message || err.message || 'Lỗi đổi mật khẩu');
    } finally {
      setPassSaving(false);
    }
  };

  const hasCccd = Boolean(profileData.cccd?.trim());
  const hasCccdImages = Boolean(profileData.cccdFrontUrl && profileData.cccdBackUrl);

  return (
    <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
      {/* ─── Header with Quick Save ────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '21px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Award size={25} color="#6366f1" /> Hồ Sơ Cá Nhân Chủ Trọ
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
            Quản lý thông tin định danh, CCCD 2 mặt và bảo mật tài khoản
          </p>
        </div>

        {/* Nút lưu nhanh ngay trên đầu trang */}
        <button
          type="button"
          onClick={handleUpdateInfo}
          className="btn btn-primary"
          disabled={saving}
          style={{ padding: '8px 22px', fontSize: '13.5px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)', borderRadius: '8px' }}
        >
          <Save size={15} /> {saving ? '⏳ Đang lưu...' : 'Lưu Thay Đổi'}
        </button>
      </div>

      {/* Thông báo cập nhật hồ sơ */}
      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '8px 14px', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
          <Check size={17} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '8px 14px', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
          <AlertCircle size={17} /> {errorMsg}
        </div>
      )}

      {/* ─── Grid 2 Cột: Cột phải tự động kéo dài bằng chiều cao cột trái ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 370px) minmax(540px, 1fr)', gap: '18px', alignItems: 'stretch' }}>
        
        {/* ─── CỘT TRÁI: THẺ TỔNG QUAN & ĐỔI MẬT KHẨU TÓM GỌN ────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Card 1: Summary Card */}
          <div className="card" style={{ padding: '18px 20px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <AvatarUploader
                value={profileData.avatarUrl}
                onChange={(newUrl) => {
                  setProfileData(prev => ({ ...prev, avatarUrl: newUrl }));
                  if (setActiveLandlord) setActiveLandlord(prev => ({ ...prev, avatarUrl: newUrl }));
                }}
                size={82}
                compact={true}
              />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 4px' }}>
              {profileData.fullName || 'Chủ Trọ'}
            </h3>
            
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', borderRadius: '14px', fontSize: '12px', fontWeight: '700', border: '1px solid rgba(99, 102, 241, 0.25)', marginBottom: '12px' }}>
              <Building2 size={12} /> Chủ Nhà Trọ / Quản Lý
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', background: 'var(--bg-dark)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13.5px' }}>
                <Mail size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profileData.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13.5px' }}>
                <Phone size={14} color="#10b981" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{profileData.phone || 'Chưa cập nhật'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13.5px' }}>
                <MapPin size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profileData.hometown || 'Chưa có địa chỉ'}</span>
              </div>
            </div>

            {/* Trạng thái xác thực Admin */}
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', borderRadius: '8px', background: hasCccd && hasCccdImages ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)', border: `1px solid ${hasCccd && hasCccdImages ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}` }}>
                {hasCccd && hasCccdImages ? (
                  <>
                    <ShieldCheck size={16} color="#10b981" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#10b981' }}>Đã nộp đủ CCCD 2 mặt</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#f59e0b' }}>Chưa hoàn tất ảnh CCCD</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Đổi Mật Khẩu Đăng Nhập Tóm Gọn */}
          <div className="card" style={{ padding: '16px 18px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={15} color="#f59e0b" /> Đổi Mật Khẩu
            </h3>

            {passSuccessMsg && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px', fontSize: '12px', fontWeight: '600' }}>
                {passSuccessMsg}
              </div>
            )}

            {passErrorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px', fontSize: '12px', fontWeight: '600' }}>
                {passErrorMsg}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label" style={{ fontSize: '12.5px', marginBottom: '3px' }}>Mật khẩu hiện tại *</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  placeholder="Mật khẩu cũ"
                  value={passwordData.oldPass}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPass: e.target.value })}
                  style={{ height: '36px', fontSize: '13px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label" style={{ fontSize: '12.5px', marginBottom: '3px' }}>Mật khẩu mới *</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  minLength="6"
                  placeholder="Tối thiểu 6 ký tự"
                  value={passwordData.newPass}
                  onChange={(e) => setPasswordData({ ...passwordData, newPass: e.target.value })}
                  style={{ height: '36px', fontSize: '13px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12.5px', marginBottom: '3px' }}>Xác nhận mật khẩu mới *</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  minLength="6"
                  placeholder="Nhập lại mật khẩu mới"
                  value={passwordData.confirmPass}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPass: e.target.value })}
                  style={{ height: '36px', fontSize: '13px' }}
                />
              </div>

              <button type="submit" className="btn btn-secondary" style={{ width: '100%', height: '36px', fontSize: '13px', fontWeight: '700' }} disabled={passSaving}>
                {passSaving ? '⏳ Đang đổi...' : 'Cập Nhật Mật Khẩu'}
              </button>
            </form>
          </div>
        </div>

        {/* ─── CỘT PHẢI: KHUNG ĐỊNH DANH KÉO DÀI XUỐNG DƯỚI (HEIGHT 100%) ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '22px 26px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '7px', margin: 0 }}>
                <User size={19} color="#6366f1" /> Thông Tin Định Danh & Căn Cước Công Dân
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                * Thông tin chính xác theo giấy tờ
              </span>
            </div>

            <form onSubmit={handleUpdateInfo} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
              <div>
                {/* Row 1: Họ tên + SĐT + Email (3 Cột) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '13.5px', fontWeight: '600', marginBottom: '4px' }}>Họ và Tên Chủ Trọ *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="VD: Nguyễn Văn A"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      style={{ height: '38px', fontSize: '13.5px' }}
                    />
                    <small style={{ fontSize: '11px', color: profileData.fullName && !isValidFullName(profileData.fullName) ? '#ef4444' : 'var(--text-muted)', marginTop: '2px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {profileData.fullName && !isValidFullName(profileData.fullName)
                        ? '⚠️ Tên không chứa số / ký tự đặc biệt'
                        : 'Chữ cái tiếng Việt & khoảng trắng'}
                    </small>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '13.5px', fontWeight: '600', marginBottom: '4px' }}>Số Điện Thoại Liên Hệ *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      maxLength={10}
                      inputMode="numeric"
                      placeholder="VD: 0912345678 (10 số)"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: sanitizePhone(e.target.value) })}
                      style={{ height: '38px', fontSize: '13.5px' }}
                    />
                    <small style={{ fontSize: '11px', color: profileData.phone && !isValidPhone(profileData.phone) ? '#ef4444' : 'var(--text-muted)', marginTop: '2px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {profileData.phone && !isValidPhone(profileData.phone)
                        ? '⚠️ Đúng 10 số & bắt đầu bằng 0'
                        : 'Chỉ 10 chữ số, không nhập chữ'}
                    </small>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '13.5px', fontWeight: '600', marginBottom: '4px' }}>Email Đăng Nhập (Cố định)</label>
                    <input
                      type="email"
                      className="form-control"
                      disabled
                      readOnly
                      value={profileData.email}
                      style={{ opacity: 0.65, cursor: 'not-allowed', height: '38px', fontSize: '13.5px' }}
                    />
                  </div>
                </div>

                {/* Row 2: Số CCCD + Quê quán (2 Cột) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '13.5px', fontWeight: '600', marginBottom: '4px' }}>Số Thẻ CCCD (12 số chuẩn)</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={12}
                      inputMode="numeric"
                      placeholder="VD: 001201012345 (12 số, bắt đầu bằng 0)"
                      value={profileData.cccd}
                      onChange={(e) => setProfileData({ ...profileData, cccd: sanitizeCccd(e.target.value) })}
                      style={{ height: '38px', fontSize: '13.5px' }}
                    />
                    <small style={{ fontSize: '11px', color: profileData.cccd && !isValidCccd(profileData.cccd) ? '#ef4444' : 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                      {profileData.cccd && !isValidCccd(profileData.cccd)
                        ? '⚠️ CCCD phải gồm đúng 12 chữ số và bắt đầu bằng số 0'
                        : '12 số, bắt đầu bằng 0'}
                    </small>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '13.5px', fontWeight: '600', marginBottom: '4px' }}>Quê Quán / Địa Chỉ Thường Trú</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: Hà Nội, TP.HCM, Đà Nẵng..."
                      value={profileData.hometown}
                      onChange={(e) => setProfileData({ ...profileData, hometown: e.target.value })}
                      style={{ height: '38px', fontSize: '13.5px' }}
                    />
                  </div>
                </div>

                {/* Phần CCCD 2 mặt (Tỷ lệ thẻ CCCD chuẩn, cân đối, khoảng cách hài hòa) */}
                <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color)', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <CreditCard size={16} color="#10b981" />
                    <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Ảnh Căn Cước Công Dân (Mặt Trước & Mặt Sau)
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'start' }}>
                    <div style={{ width: '100%', maxWidth: '500px' }}>
                      <CccdCardUploader
                        label="Mặt Trước CCCD"
                        value={profileData.cccdFrontUrl}
                        onChange={(url) => setProfileData({ ...profileData, cccdFrontUrl: url })}
                        height="250px"
                      />
                    </div>
                    <div style={{ width: '100%', maxWidth: '500px' }}>
                      <CccdCardUploader
                        label="Mặt Sau CCCD"
                        value={profileData.cccdBackUrl}
                        onChange={(url) => setProfileData({ ...profileData, cccdBackUrl: url })}
                        height="250px"
                      />
                    </div>
                  </div>
                </div>

                {/* ─── PHẦN TÀI KHOẢN NGÂN HÀNG NHẬN TIỀN (VIETQR) ─── */}
                <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Landmark size={18} color="#6366f1" />
                      <span style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        Tài Khoản Ngân Hàng Nhận Tiền Thuê Trọ (VietQR Tự Động)
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      * Khách thuê quét mã QR sẽ tự động chuyển vào tài khoản này
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '14px' }}>
                    {/* 1. Chọn ngân hàng */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Ngân Hàng Thụ Hưởng *</label>
                      <select
                        className="form-control"
                        value={profileData.bankName}
                        onChange={(e) => setProfileData({ ...profileData, bankName: e.target.value })}
                        style={{ height: '40px', fontSize: '13px', padding: '6px 12px' }}
                      >
                        {VIETNAM_BANKS.map(b => (
                          <option key={b.code} value={b.code}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      <small style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                        Mã ngân hàng: <strong>{profileData.bankName}</strong>
                      </small>
                    </div>

                    {/* 2. Số tài khoản */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Số Tài Khoản Ngân Hàng *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="VD: 6531211114..."
                        maxLength={20}
                        inputMode="numeric"
                        value={profileData.bankAccountNumber}
                        onChange={(e) => setProfileData({ ...profileData, bankAccountNumber: sanitizeBankAccountNumber(e.target.value) })}
                        style={{ height: '40px', fontSize: '13.5px', fontWeight: '600', color: '#6366f1' }}
                      />
                      <small style={{ fontSize: '11px', color: profileData.bankAccountNumber && !isValidBankAccountNumber(profileData.bankAccountNumber) ? '#ef4444' : 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                        {profileData.bankAccountNumber && !isValidBankAccountNumber(profileData.bankAccountNumber)
                          ? '⚠️ Số tài khoản chỉ gồm chữ số (từ 6 đến 20 số)'
                          : 'Chỉ nhập số, không chứa chữ cái'}
                      </small>
                    </div>

                    {/* 3. Tên chủ tài khoản */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Tên Chủ Tài Khoản (In Hoa) *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="VD: NGUYEN VAN A"
                        value={profileData.bankAccountName}
                        onChange={(e) => setProfileData({ ...profileData, bankAccountName: sanitizeBankAccountName(e.target.value) })}
                        style={{ height: '40px', fontSize: '13.5px', fontWeight: '600', textTransform: 'uppercase' }}
                      />
                      <small style={{ fontSize: '11px', color: profileData.bankAccountName && !isValidBankAccountName(profileData.bankAccountName) ? '#ef4444' : 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                        {profileData.bankAccountName && !isValidBankAccountName(profileData.bankAccountName)
                          ? '⚠️ Tên không được chứa số hoặc ký tự đặc biệt'
                          : 'Chỉ gồm chữ cái và khoảng trắng'}
                      </small>
                    </div>
                  </div>

                  {/* Khung quét thử mã VietQR mẫu để chủ trọ kiểm tra */}
                  {profileData.bankAccountNumber && (
                    <div style={{ background: 'var(--bg-dark, rgba(0,0,0,0.25))', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                          <img 
                            src={getVietQRUrl({
                              bankId: profileData.bankName || 'BIDV',
                              accountNo: profileData.bankAccountNumber || '6531211114',
                              accountName: profileData.bankAccountName || profileData.fullName || 'CHU TRO',
                              amount: 0,
                              addInfo: 'Quet thu nghiem'
                            })} 
                            alt="Mã QR xem trước" 
                            style={{ width: '88px', height: '88px', display: 'block' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>
                            <Check size={15} /> Xem Trước Mã VietQR Của Bạn
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                            Ngân hàng: <strong>{VIETNAM_BANKS.find(b => b.code === profileData.bankName)?.shortName || profileData.bankName}</strong> | STK: <strong style={{ color: '#6366f1' }}>{profileData.bankAccountNumber}</strong>
                            <br />
                            Chủ tài khoản: <strong>{profileData.bankAccountName || profileData.fullName?.toUpperCase()}</strong>
                          </div>
                          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                            💡 Bạn có thể dùng app ngân hàng trên điện thoại quét thử để kiểm tra xem đã nhận đúng tên và STK chưa.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Nút lưu cuối form đặt ngay góc dưới cùng */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ padding: '9px 26px', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)', borderRadius: '8px' }}
                >
                  <Save size={15} /> {saving ? '⏳ Đang lưu...' : 'Lưu Thay Đổi Hồ Sơ & Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};




