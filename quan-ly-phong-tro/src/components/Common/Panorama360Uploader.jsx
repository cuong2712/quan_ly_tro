import React, { useState } from 'react';
import {
  Upload, Camera, Compass, Trash2, Eye, Sparkles, CheckCircle2,
  RefreshCw, Link as LinkIcon, AlertCircle, X
} from 'lucide-react';
import { fileService } from '../../services';
import { getMediaUrl } from '../../utils/media';
import { Panorama360Viewer } from './Panorama360Viewer';

/**
 * Panorama360Uploader - Bộ công cụ tải lên & quản lý ảnh 360° toàn cảnh (Equirectangular 2:1)
 * Cho phép:
 *  1. Chọn file ảnh 360° trực tiếp từ máy tính/điện thoại (upload lên server tới 25MB)
 *  2. Chọn nhanh ảnh mẫu phòng tiêu chuẩn
 *  3. Nhập URL thủ công nếu có link sẵn
 *  4. Xem thử góc nhìn 360° xoay thực tế ngay lập tức
 */
export const Panorama360Uploader = ({
  value = '',
  onChange,
  roomNumber = '',
  label = 'Ảnh không gian toàn cảnh 360° (Virtual Tour)'
}) => {
  const [uploading, setUploading] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('Kích thước ảnh vượt quá 25MB. Vui lòng chọn ảnh nhẹ hơn.');
      return;
    }

    setUploading(true);
    try {
      const res = await fileService.uploadPanorama(file);
      const url = res?.url || res?.data?.url;
      if (url) {
        onChange(url);
      } else {
        setUploadError('Không nhận được đường dẫn ảnh từ máy chủ.');
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || 'Lỗi khi tải ảnh lên.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleUsePreset = () => {
    onChange('/sample_room_360.jpg');
    setUploadError('');
  };

  const handleClear = () => {
    onChange('');
    setUploadError('');
  };

  const resolvedUrl = value ? getMediaUrl(value) : '';

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: '14px',
      background: 'rgba(99, 102, 241, 0.04)',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      {/* Header Label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary, #fff)' }}>
          <Compass size={17} color="#6366f1" />
          <span>{label}</span>
        </div>
        {value && (
          <span style={{
            fontSize: '11.5px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            padding: '2px 8px',
            borderRadius: 6,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}>
            <CheckCircle2 size={12} /> Đã có ảnh 360°
          </span>
        )}
      </div>

      {/* Main Upload / State Action Area */}
      {!value ? (
        // TRẠNG THÁI: CHƯA CÓ ẢNH
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            border: '2px dashed rgba(99, 102, 241, 0.35)',
            borderRadius: 12,
            padding: '18px 16px',
            textAlign: 'center',
            background: 'rgba(99, 102, 241, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366f1'
            }}>
              <Upload size={22} />
            </div>

            <div>
              <div style={{ fontWeight: 650, fontSize: '13.5px', color: 'var(--text-primary, #fff)' }}>
                Tải lên ảnh toàn cảnh 360° từ máy tính hoặc điện thoại
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                Ảnh Panorama tỷ lệ 2:1 (.jpg, .png, .webp). Hỗ trợ tối đa <strong>25MB</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
              {/* Nút chọn file tải lên */}
              <label className="btn btn-primary btn-sm" style={{
                cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: '13px',
                fontWeight: 600
              }}>
                {uploading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Đang tải lên server...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Chọn file ảnh từ máy</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleFileChange}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>

              {/* Nút dùng ảnh mẫu có sẵn */}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleUsePreset}
                disabled={uploading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 8,
                  fontSize: '12.5px',
                  fontWeight: 600
                }}
              >
                <Sparkles size={14} color="#f59e0b" />
                <span>Dùng ảnh mẫu 360°</span>
              </button>
            </div>
          </div>

          {/* Toggle mở nhập link URL thủ công */}
          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setShowManualUrl(!showManualUrl)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6366f1',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 4
              }}
            >
              {showManualUrl ? '▲ Ẩn ô nhập link URL' : '▼ Hoặc dán đường dẫn link ảnh URL có sẵn'}
            </button>
          </div>

          {showManualUrl && (
            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              <input
                type="text"
                className="form-control"
                placeholder="https://... hoặc /sample_room_360.jpg"
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{ fontSize: '12.5px' }}
              />
            </div>
          )}
        </div>
      ) : (
        // TRẠNG THÁI: ĐÃ CÓ ẢNH 360°
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-dark, #13141f)',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          gap: 12
        }}>
          {/* Thumbnail / Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
            <div style={{
              width: 52,
              height: 40,
              borderRadius: 6,
              overflow: 'hidden',
              background: '#000',
              flexShrink: 0,
              position: 'relative',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <img
                src={resolvedUrl}
                alt="360 preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.src = '/sample_room_360.jpg';
                }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700
              }}>
                360°
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 650,
                color: 'var(--text-primary, #fff)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {value === '/sample_room_360.jpg' ? 'Ảnh mẫu phòng Studio tiêu chuẩn' : (value.split('/').pop() || 'Ảnh 360°')}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #94a3b8)', wordBreak: 'break-all' }}>
                {value.length > 45 ? value.substring(0, 42) + '...' : value}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Nút Xem thử 360 */}
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setPreviewModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '12px',
                padding: '6px 10px',
                borderRadius: 8
              }}
              title="Xem góc nhìn xoay 360°"
            >
              <Eye size={14} color="#6366f1" />
              <span>Xem thử 360°</span>
            </button>

            {/* Nút đổi ảnh khác từ máy */}
            <label
              className="btn btn-sm btn-secondary"
              style={{
                cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '12px',
                padding: '6px 10px',
                borderRadius: 8
              }}
              title="Tải ảnh mới thay thế"
            >
              {uploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
              <span>Đổi ảnh</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileChange}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>

            {/* Nút Xóa */}
            <button
              type="button"
              onClick={handleClear}
              disabled={uploading}
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                padding: '6px 8px',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Xóa ảnh 360° này"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {uploadError && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 8,
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#fca5a5',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Modal Xem Thử 360° Trực Tiếp */}
      {previewModalOpen && value && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            width: '100%',
            maxWidth: '850px',
            background: 'var(--bg-card, #1e1e2e)',
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
          }}>
            <div style={{
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))',
              background: 'var(--bg-dark, #13141f)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: '#fff' }}>
                <Compass size={18} color="#6366f1" />
                <span>Xem trước toàn cảnh 360° {roomNumber ? `• Phòng ${roomNumber}` : ''}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 12 }}>
              <Panorama360Viewer
                imageUrl={value}
                height="480px"
                title={roomNumber ? `Phòng ${roomNumber}` : 'Ảnh 360°'}
              />
            </div>

            <div style={{
              padding: '12px 20px',
              background: 'var(--bg-dark, #13141f)',
              borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
                💡 Kéo chuột hoặc chạm vuốt để xoay nhìn không gian phòng
              </span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setPreviewModalOpen(false)}
              >
                Đóng xem thử
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Panorama360Uploader;
