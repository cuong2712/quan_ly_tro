import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, User, Phone, Mail, CreditCard, ShieldCheck,
  Camera, Lock, Check, Save, AlertCircle, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { profileService, fileService } from '../../services';
import {
  VIETNAM_BANKS, getImageUrl, isValidFullName, isValidPhone,
  isValidCccd, isValidBankAccountNumber, isValidBankAccountName,
  getVietQRUrl, formatVND
} from '../../utils/formatters';

export function LandlordProfileEditView({
  profile,
  isLight = false,
  onBack,
  onSuccess
}) {
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    phone: profile?.phone || profile?.phoneNumber || '',
    email: profile?.email || '',
    avatarUrl: profile?.avatarUrl || '',
    cccd: profile?.cccd || '',
    hometown: profile?.hometown || '',
    cccdFrontUrl: profile?.cccdFrontUrl || '',
    cccdBackUrl: profile?.cccdBackUrl || '',
    bankName: profile?.bankName || 'BIDV',
    bankAccountNumber: profile?.bankAccountNumber || '',
    bankAccountName: profile?.bankAccountName || (profile?.fullName ? profile.fullName.toUpperCase() : '')
  });

  // Đổi mật khẩu state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passData, setPassData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPass, setShowPass] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCccd, setUploadingCccd] = useState(null); // 'front' | 'back'
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        phone: profile.phone || profile.phoneNumber || '',
        email: profile.email || '',
        avatarUrl: profile.avatarUrl || '',
        cccd: profile.cccd || '',
        hometown: profile.hometown || '',
        cccdFrontUrl: profile.cccdFrontUrl || '',
        cccdBackUrl: profile.cccdBackUrl || '',
        bankName: profile.bankName || 'BIDV',
        bankAccountNumber: profile.bankAccountNumber || '',
        bankAccountName: profile.bankAccountName || (profile.fullName ? profile.fullName.toUpperCase() : '')
      });
    }
  }, [profile]);

  // Upload Avatar
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ Kích thước ảnh đại diện vượt quá 5MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const res = await fileService.uploadAvatar(file);
      const url = res?.url || res?.data?.url;
      if (url) {
        setFormData(prev => ({ ...prev, avatarUrl: url }));
      }
    } catch (err) {
      alert('Lỗi tải ảnh đại diện: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  // Upload CCCD (mặt trước / mặt sau)
  const handleCccdUpload = async (e, side) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ Kích thước ảnh vượt quá 5MB');
      return;
    }
    setUploadingCccd(side);
    try {
      const res = await fileService.uploadCccd(file);
      const url = res?.url || res?.data?.url;
      if (url) {
        if (side === 'front') {
          setFormData(prev => ({ ...prev, cccdFrontUrl: url }));
        } else {
          setFormData(prev => ({ ...prev, cccdBackUrl: url }));
        }
      }
    } catch (err) {
      alert('Lỗi tải ảnh CCCD: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingCccd(null);
      e.target.value = '';
    }
  };

  // Lưu thông tin hồ sơ
  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validate họ tên
    if (!formData.fullName.trim() || !isValidFullName(formData.fullName)) {
      setErrorMsg('Họ và tên không hợp lệ! Vui lòng chỉ nhập chữ cái tiếng Việt.');
      return;
    }

    // Validate số điện thoại
    if (!formData.phone.trim() || !isValidPhone(formData.phone)) {
      setErrorMsg('Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 số (bắt đầu bằng số 0).');
      return;
    }

    // Validate CCCD (nếu có nhập)
    if (formData.cccd && !isValidCccd(formData.cccd)) {
      setErrorMsg('Số CCCD không hợp lệ! Vui lòng nhập đúng 12 chữ số.');
      return;
    }

    // Validate Ngân hàng (nếu có nhập)
    if (formData.bankAccountNumber && !isValidBankAccountNumber(formData.bankAccountNumber)) {
      setErrorMsg('Số tài khoản ngân hàng không hợp lệ! Chỉ gồm 6 đến 20 chữ số.');
      return;
    }

    if (formData.bankAccountName && !isValidBankAccountName(formData.bankAccountName)) {
      setErrorMsg('Tên chủ tài khoản ngân hàng không hợp lệ! Chỉ gồm chữ cái.');
      return;
    }

    setSaving(true);
    try {
      await profileService.updateProfile({
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        avatarUrl: formData.avatarUrl,
        cccd: formData.cccd?.trim() || null,
        hometown: formData.hometown?.trim() || null,
        cccdFrontUrl: formData.cccdFrontUrl || null,
        cccdBackUrl: formData.cccdBackUrl || null,
        bankName: formData.bankName,
        bankAccountNumber: formData.bankAccountNumber?.trim() || null,
        bankAccountName: formData.bankAccountName?.trim().toUpperCase() || null
      });

      // Nếu có yêu cầu đổi mật khẩu
      if (showPasswordSection && passData.newPassword) {
        if (!passData.oldPassword) {
          setErrorMsg('Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu mới!');
          setSaving(false);
          return;
        }
        if (passData.newPassword.length < 6) {
          setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự!');
          setSaving(false);
          return;
        }
        if (passData.newPassword !== passData.confirmPassword) {
          setErrorMsg('Mật khẩu mới và xác nhận mật khẩu không trùng khớp!');
          setSaving(false);
          return;
        }

        await profileService.changePassword({
          oldPassword: passData.oldPassword,
          newPassword: passData.newPassword,
          confirmPassword: passData.confirmPassword
        });
        setPassData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }

      setSuccessMsg('✅ Đã cập nhật thông tin hồ sơ và tài khoản thành công!');
      setTimeout(() => {
        onSuccess?.();
      }, 1200);
    } catch (err) {
      setErrorMsg('Lỗi lưu thông tin: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const previewQr = (formData.bankAccountNumber && formData.bankName)
    ? getVietQRUrl({
        bankId: formData.bankName,
        accountNo: formData.bankAccountNumber,
        accountName: formData.bankAccountName || formData.fullName,
        amount: 500000,
        addInfo: 'TEST VIETQR SMARTRENT'
      })
    : null;

  return (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: isLight ? '#0f172a' : '#f8fafc',
      background: isLight ? '#f8fafc' : '#0b1120'
    }}>
      {/* ── 1. HEADER NATIVE APP ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: isLight ? '#ffffff' : '#0f172a',
        borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.05)' : '0 4px 14px rgba(0,0,0,0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onBack}
            title="Quay lại"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: 'none',
              background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isLight ? '#0f172a' : '#fff'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: isLight ? '#0f172a' : '#fff' }}>
              Sửa Thông Tin Chủ Trọ
            </h2>
            <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>
              Cập nhật hồ sơ & tài khoản nhận VietQR
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={saving}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #6366f1)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)'
          }}
        >
          {saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
          <span>{saving ? 'Đang lưu...' : 'Lưu lại'}</span>
        </button>
      </div>

      {/* ── 2. BODY FORM CUỘN MƯỢT ── */}
      <form onSubmit={handleSaveProfile} style={{ flex: 1, padding: '16px 14px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Thông báo lỗi / thành công */}
        {errorMsg && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── AVATAR UPLOAD SECTION ── */}
        <div style={{
          background: isLight ? '#ffffff' : '#111827',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 16,
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
            <img
              src={getImageUrl(formData.avatarUrl, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')}
              alt="Avatar"
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #6366f1' }}
            />
            <label
              title="Đổi ảnh đại diện"
              style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 26, height: 26, borderRadius: '50%',
                background: '#6366f1', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }}
            >
              <Camera size={13} />
              <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} style={{ display: 'none' }} />
            </label>
          </div>

          <div>
            <div style={{ fontSize: '14.5px', fontWeight: 800, color: isLight ? '#0f172a' : '#fff' }}>
              Ảnh đại diện Chủ trọ
            </div>
            <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 2 }}>
              {uploadingAvatar ? 'Đang tải ảnh lên...' : 'Ảnh sẽ hiển thị khi khách thuê xem phòng và liên hệ'}
            </div>
            <label style={{ display: 'inline-block', marginTop: 6, fontSize: '12px', fontWeight: 700, color: '#6366f1', cursor: 'pointer' }}>
              {uploadingAvatar ? '⏳ Đang xử lý...' : '📸 Đổi ảnh đại diện'}
              <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* ── CARD 1: THÔNG TIN CÁ NHÂN CƠ BẢN ── */}
        <div style={{
          background: isLight ? '#ffffff' : '#111827',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 16,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, color: '#6366f1' }}>
            <User size={16} /> Thông Tin Cá Nhân
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Họ và tên chủ trọ: <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Ví dụ: Nguyễn Văn Hải"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: isLight ? '#f8fafc' : '#1f2937',
                color: isLight ? '#0f172a' : '#fff',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                boxSizing: 'border-box', fontSize: '13.5px'
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                Số điện thoại: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0908123456"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: isLight ? '#f8fafc' : '#1f2937',
                  color: isLight ? '#0f172a' : '#fff',
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  boxSizing: 'border-box', fontSize: '13.5px'
                }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                Email đăng nhập:
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                title="Email đăng nhập không thể thay đổi trực tiếp"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: isLight ? '#f1f5f9' : '#111827',
                  color: isLight ? '#94a3b8' : '#64748b',
                  border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}`,
                  boxSizing: 'border-box', fontSize: '13.5px',
                  cursor: 'not-allowed'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                Số CCCD:
              </label>
              <input
                type="text"
                value={formData.cccd}
                onChange={e => setFormData({ ...formData, cccd: e.target.value })}
                placeholder="001201012345"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: isLight ? '#f8fafc' : '#1f2937',
                  color: isLight ? '#0f172a' : '#fff',
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  boxSizing: 'border-box', fontSize: '13.5px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                Quê quán / Địa chỉ:
              </label>
              <input
                type="text"
                value={formData.hometown}
                onChange={e => setFormData({ ...formData, hometown: e.target.value })}
                placeholder="TP. Hồ Chí Minh"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: isLight ? '#f8fafc' : '#1f2937',
                  color: isLight ? '#0f172a' : '#fff',
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  boxSizing: 'border-box', fontSize: '13.5px'
                }}
              />
            </div>
          </div>
        </div>

        {/* ── CARD 2: TÀI KHOẢN NGÂN HÀNG NHẬN TIỀN VIETQR ── */}
        <div style={{
          background: isLight ? '#ffffff' : '#111827',
          border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(99,102,241,0.3)'}`,
          borderRadius: 16,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
              <CreditCard size={16} /> Tài Khoản Ngân Hàng Nhận Tiền VietQR
            </div>
            <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
              Tự Động Sinh Mã QR
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8', lineHeight: 1.4 }}>
            Mã VietQR sẽ tự động đính kèm vào hóa đơn tiền phòng và cọc giữ chỗ trực tuyến để khách thuê quét trả tiền ngay.
          </p>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Ngân hàng thụ hưởng:
            </label>
            <select
              value={formData.bankName}
              onChange={e => setFormData({ ...formData, bankName: e.target.value })}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: isLight ? '#f8fafc' : '#1f2937',
                color: isLight ? '#0f172a' : '#fff',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                boxSizing: 'border-box', fontSize: '13.5px', cursor: 'pointer'
              }}
            >
              {VIETNAM_BANKS.map(b => (
                <option key={b.code} value={b.code}>
                  {b.shortName || b.code} — {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Số tài khoản ngân hàng:
            </label>
            <input
              type="text"
              value={formData.bankAccountNumber}
              onChange={e => setFormData({ ...formData, bankAccountNumber: e.target.value })}
              placeholder="Ví dụ: 0397181879"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: isLight ? '#f8fafc' : '#1f2937',
                color: isLight ? '#0f172a' : '#fff',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                boxSizing: 'border-box', fontSize: '14px', fontWeight: 700, letterSpacing: '0.5px'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Tên chủ tài khoản (Viết hoa không dấu):
            </label>
            <input
              type="text"
              value={formData.bankAccountName}
              onChange={e => setFormData({ ...formData, bankAccountName: e.target.value.toUpperCase() })}
              placeholder="Ví dụ: NGUYEN VAN HAI"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: isLight ? '#f8fafc' : '#1f2937',
                color: isLight ? '#0f172a' : '#fff',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                boxSizing: 'border-box', fontSize: '13.5px', fontWeight: 700
              }}
            />
          </div>

          {/* Xem thử mã QR */}
          {previewQr && (
            <div style={{
              marginTop: 6, padding: '12px', borderRadius: 12,
              background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.25)',
              border: `1px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
              display: 'flex', alignItems: 'center', gap: 14
            }}>
              <img
                src={previewQr}
                alt="Xem thử VietQR"
                style={{ width: 68, height: 68, borderRadius: 8, background: '#fff', padding: 4 }}
              />
              <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
                <div style={{ fontWeight: 700, color: isLight ? '#0f172a' : '#fff', marginBottom: 2 }}>
                  Mã QR Hoạt Động Tốt
                </div>
                <div>Ngân hàng: <strong>{formData.bankName}</strong></div>
                <div>STK: <strong>{formData.bankAccountNumber}</strong></div>
                <div>Chủ TK: <strong>{formData.bankAccountName || formData.fullName}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* ── CARD 3: ẢNH CCCD 2 MẶT (XÁC MINH PHÁP LÝ) ── */}
        <div style={{
          background: isLight ? '#ffffff' : '#111827',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 16,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b' }}>
            <ShieldCheck size={16} /> Ảnh Chụp 2 Mặt CCCD (Hồ Sơ Pháp Lý)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Mặt trước */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, marginBottom: 6 }}>Mặt trước CCCD:</div>
              <div style={{
                height: 90, borderRadius: 10, overflow: 'hidden',
                border: `1.5px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                background: isLight ? '#f8fafc' : '#1f2937',
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
              }}>
                {formData.cccdFrontUrl ? (
                  <img src={getImageUrl(formData.cccdFrontUrl)} alt="Mặt trước" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Chưa có ảnh</span>
                )}
                {uploadingCccd === 'front' && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px' }}>
                    Đang tải...
                  </div>
                )}
              </div>
              <label style={{ display: 'inline-block', marginTop: 6, fontSize: '11.5px', fontWeight: 700, color: '#6366f1', cursor: 'pointer' }}>
                📸 Tải ảnh mặt trước
                <input type="file" accept="image/*" onChange={e => handleCccdUpload(e, 'front')} disabled={uploadingCccd !== null} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Mặt sau */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, marginBottom: 6 }}>Mặt sau CCCD:</div>
              <div style={{
                height: 90, borderRadius: 10, overflow: 'hidden',
                border: `1.5px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                background: isLight ? '#f8fafc' : '#1f2937',
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
              }}>
                {formData.cccdBackUrl ? (
                  <img src={getImageUrl(formData.cccdBackUrl)} alt="Mặt sau" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Chưa có ảnh</span>
                )}
                {uploadingCccd === 'back' && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px' }}>
                    Đang tải...
                  </div>
                )}
              </div>
              <label style={{ display: 'inline-block', marginTop: 6, fontSize: '11.5px', fontWeight: 700, color: '#6366f1', cursor: 'pointer' }}>
                📸 Tải ảnh mặt sau
                <input type="file" accept="image/*" onChange={e => handleCccdUpload(e, 'back')} disabled={uploadingCccd !== null} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>

        {/* ── CARD 4: ĐỔI MẬT KHẨU TÀI KHOẢN (TÙY CHỌN) ── */}
        <div style={{
          background: isLight ? '#ffffff' : '#111827',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 16,
          padding: '16px'
        }}>
          <div
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444' }}>
              <Lock size={16} /> Đổi Mật Khẩu Đăng Nhập
            </div>
            <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: 700 }}>
              {showPasswordSection ? 'Thu gọn ▲' : 'Mở rộng ▼'}
            </span>
          </div>

          {showPasswordSection && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Mật khẩu hiện tại:
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passData.oldPassword}
                  onChange={e => setPassData({ ...passData, oldPassword: e.target.value })}
                  placeholder="Nhập mật khẩu đang dùng"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    background: isLight ? '#f8fafc' : '#1f2937',
                    color: isLight ? '#0f172a' : '#fff',
                    border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                    boxSizing: 'border-box', fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Mật khẩu mới (tối thiểu 6 ký tự):
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passData.newPassword}
                  onChange={e => setPassData({ ...passData, newPassword: e.target.value })}
                  placeholder="Nhập mật khẩu mới"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    background: isLight ? '#f8fafc' : '#1f2937',
                    color: isLight ? '#0f172a' : '#fff',
                    border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                    boxSizing: 'border-box', fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Xác nhận mật khẩu mới:
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passData.confirmPassword}
                  onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })}
                  placeholder="Nhập lại mật khẩu mới"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    background: isLight ? '#f8fafc' : '#1f2937',
                    color: isLight ? '#0f172a' : '#fff',
                    border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                    boxSizing: 'border-box', fontSize: '13px'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}
              >
                {showPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              </button>
            </div>
          )}
        </div>

        {/* Nút lưu cuối trang */}
        <button
          type="submit"
          disabled={saving}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #6366f1)',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            padding: '14px',
            fontSize: '15px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
            marginTop: 8
          }}
        >
          {saving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
          <span>{saving ? 'Đang lưu cập nhật...' : 'Lưu Thay Đổi Hồ Sơ'}</span>
        </button>

      </form>
    </div>
  );
}

export default LandlordProfileEditView;
