import React, { useState, useRef } from 'react';
import { Camera, Upload, Link, Eye, Trash2, X, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { fileService } from '../../services';
import { getImageUrl } from '../../utils/formatters';

// ─── 1. MODAL XEM ẢNH PHÓNG TO (LIGHTBOX) ───────────────────────────
export const ImageLightboxModal = ({ imageUrl, title = 'Xem hình ảnh', onClose }) => {
  if (!imageUrl) return null;
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '850px',
          width: '95%',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '20px',
          borderRadius: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={18} color="#6366f1" /> {title}
          </h4>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={onClose}
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', maxHeight: '75vh', overflow: 'hidden', background: '#020617', borderRadius: '12px' }}>
          <img
            src={getImageUrl(imageUrl)}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: '8px' }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── 2. AVATAR UPLOADER (ẢNH ĐẠI DIỆN) ──────────────────────────────
export const AvatarUploader = ({
  value,
  onChange,
  size = 96,
  disabled = false,
  fallbackName = 'U',
  compact = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [previewZoom, setPreviewZoom] = useState(false);
  const fileInputRef = useRef(null);

  const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
  const displaySrc = getImageUrl(value, defaultAvatar);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (file.size > 5 * 1024 * 1024) {
      alert('Dung lượng ảnh đại diện tối đa là 5MB!');
      return;
    }

    setUploading(true);
    try {
      const res = await fileService.uploadAvatar(file);
      if (res?.url) {
        onChange(res.url);
      }
    } catch (err) {
      alert('Lỗi tải ảnh đại diện lên: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleApplyUrl = () => {
    if (tempUrl.trim()) {
      onChange(tempUrl.trim());
      setTempUrl('');
      setShowUrlInput(false);
    }
  };

  if (compact) {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        {/* Avatar Circular Container */}
        <div
          style={{
            position: 'relative',
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            border: '3.5px solid #6366f1',
            boxShadow: '0 6px 18px rgba(99, 102, 241, 0.35)',
            background: '#1e293b',
            overflow: 'hidden',
            cursor: !disabled ? 'pointer' : 'default'
          }}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          title={!disabled ? 'Bấm để đổi ảnh đại diện' : 'Ảnh đại diện'}
        >
          {uploading ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.85)', color: '#6366f1' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '10px', marginTop: '2px', color: '#cbd5e1' }}>Đang tải...</span>
            </div>
          ) : (
            <img
              src={displaySrc}
              alt="Avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.src = defaultAvatar; }}
            />
          )}

          {/* Hover Overlay */}
          {!disabled && !uploading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s ease',
                color: '#ffffff'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0'}
            >
              <Camera size={22} />
            </div>
          )}
        </div>

        {/* Floating Action Badge Button at bottom right */}
        {!disabled && !uploading && (
          <div style={{ position: 'absolute', bottom: -2, right: -4, display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                border: '2.5px solid #0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              title="Tải ảnh mới từ máy tính"
            >
              <Camera size={14} />
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#334155',
                border: '2.5px solid #0f172a',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = '#94a3b8'; }}
              title="Nhập đường link URL ảnh"
            >
              <Link size={13} />
            </button>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Direct URL Input Popup */}
        {showUrlInput && (
          <div style={{ position: 'absolute', top: '105%', zIndex: 50, display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.95)', padding: '8px', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', width: '260px' }}>
            <input
              type="url"
              className="form-control"
              style={{ fontSize: '12px', padding: '4px 8px', height: '30px' }}
              placeholder="Dán link ảnh https://..."
              value={tempUrl}
              autoFocus
              onChange={(e) => setTempUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyUrl(); } }}
            />
            <button
              type="button"
              className="btn btn-sm btn-primary"
              style={{ height: '30px', padding: '0 8px' }}
              onClick={handleApplyUrl}
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              style={{ height: '30px', padding: '0 8px' }}
              onClick={() => setShowUrlInput(false)}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Lightbox Preview */}
        {previewZoom && (
          <ImageLightboxModal
            imageUrl={value || defaultAvatar}
            title="Ảnh đại diện"
            onClose={() => setPreviewZoom(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        {/* Avatar Box with Overlay */}
        <div
          style={{
            position: 'relative',
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid #6366f1',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)',
            flexShrink: 0,
            background: '#1e293b'
          }}
        >
          {uploading ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.85)', color: '#6366f1' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '10px', marginTop: '4px', color: '#cbd5e1' }}>Đang tải...</span>
            </div>
          ) : (
            <img
              src={displaySrc}
              alt="Avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.src = defaultAvatar; }}
            />
          )}

          {!disabled && !uploading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s ease',
                border: 'none',
                cursor: 'pointer',
                color: '#ffffff'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0'}
              title="Nhấn để đổi ảnh đại diện"
            >
              <Camera size={22} />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        {!disabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={14} /> Tải ảnh từ máy
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setShowUrlInput(!showUrlInput)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Link size={14} /> Nhập link ảnh
              </button>
              {value && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPreviewZoom(true)}
                  title="Xem ảnh đầy đủ"
                >
                  <Eye size={14} />
                </button>
              )}
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Định dạng: JPG, PNG, WEBP. Tối đa 5MB.
            </span>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Direct URL Input Popup */}
      {showUrlInput && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <input
            type="url"
            className="form-control"
            style={{ fontSize: '13px', padding: '6px 12px' }}
            placeholder="Dán link ảnh (https://...)"
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyUrl(); } }}
          />
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleApplyUrl}
          >
            <Check size={14} /> Áp dụng
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setShowUrlInput(false)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Lightbox Preview */}
      {previewZoom && (
        <ImageLightboxModal
          imageUrl={value || defaultAvatar}
          title="Ảnh đại diện"
          onClose={() => setPreviewZoom(false)}
        />
      )}
    </div>
  );
};

// ─── 3. CCCD CARD UPLOADER (MẶT TRƯỚC / MẶT SAU) ───────────────────
export const CccdCardUploader = ({
  label = 'Mặt Trước CCCD',
  value,
  onChange,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [previewZoom, setPreviewZoom] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (file.size > 5 * 1024 * 1024) {
      alert('Dung lượng ảnh CCCD tối đa là 5MB!');
      return;
    }

    setUploading(true);
    try {
      const res = await fileService.uploadCccd(file);
      if (res?.url) {
        onChange(res.url);
      }
    } catch (err) {
      alert(`Lỗi tải ${label} lên: ` + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleApplyUrl = () => {
    if (tempUrl.trim()) {
      onChange(tempUrl.trim());
      setTempUrl('');
      setShowUrlInput(false);
    }
  };

  return (
    <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
          {label}
        </label>
        {value && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              style={{ padding: '2px 8px', fontSize: '11.5px', height: '26px' }}
              onClick={() => setPreviewZoom(true)}
              title="Xem ảnh lớn"
            >
              <Eye size={12} /> Xem
            </button>
            {!disabled && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                style={{ padding: '2px 8px', fontSize: '11.5px', height: '26px' }}
                onClick={() => onChange('')}
                title="Xóa ảnh này"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image Preview Box */}
      <div
        style={{
          position: 'relative',
          height: '150px',
          borderRadius: '10px',
          border: value ? '1px solid rgba(99, 102, 241, 0.4)' : '2px dashed var(--border-color)',
          background: 'rgba(30, 41, 59, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease'
        }}
      >
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#6366f1' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Đang tải ảnh lên...</span>
          </div>
        ) : value ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img
              src={getImageUrl(value)}
              alt={label}
              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
              onClick={() => setPreviewZoom(true)}
            />
            {!disabled && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 6,
                  right: 6,
                  display: 'flex',
                  gap: '6px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  padding: '4px',
                  borderRadius: '6px',
                  backdropFilter: 'blur(4px)'
                }}
              >
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Thay ảnh mới"
                >
                  <Upload size={12} /> Đổi ảnh
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>
            <ImageIcon size={32} style={{ margin: '0 auto 6px', color: '#64748b' }} />
            <div style={{ fontSize: '12px', marginBottom: '8px' }}>Chưa có ảnh {label.toLowerCase()}</div>
            {!disabled && (
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={13} /> Tải ảnh lên
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={() => setShowUrlInput(!showUrlInput)}
                >
                  <Link size={13} /> Dán URL
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Direct URL Input Popup */}
      {showUrlInput && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <input
            type="url"
            className="form-control"
            style={{ fontSize: '12px', padding: '4px 8px', height: '30px' }}
            placeholder={`Dán link ảnh ${label}...`}
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyUrl(); } }}
          />
          <button
            type="button"
            className="btn btn-sm btn-primary"
            style={{ height: '30px', padding: '0 8px' }}
            onClick={handleApplyUrl}
          >
            <Check size={13} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            style={{ height: '30px', padding: '0 8px' }}
            onClick={() => setShowUrlInput(false)}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Lightbox Modal */}
      {previewZoom && (
        <ImageLightboxModal
          imageUrl={value}
          title={label}
          onClose={() => setPreviewZoom(false)}
        />
      )}
    </div>
  );
};
