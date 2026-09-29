import React, { useState, useEffect } from 'react';
import {
  X, Camera, Compass, Images, Globe, Sparkles, Upload, Trash2,
  ExternalLink, Copy, Check, Info, ShieldCheck, CheckCircle2,
  DollarSign, ArrowUpRight, Plus, Eye
} from 'lucide-react';
import { Panorama360Viewer } from '../Common/Panorama360Viewer';
import { fileService, roomService } from '../../services';
import { formatVND } from '../../utils/formatters';

const DEFAULT_AMENITIES = [
  'Máy lạnh', 'Tủ lạnh', 'Máy giặt', 'Gác lửng',
  'Ban công', 'Thang máy', 'Giờ tự do', 'Khóa vân tay / Camera',
  'Kệ bếp nấu ăn', 'Giường nệm', 'Tủ quần áo', 'Wifi tốc độ cao'
];

const SAMPLE_360_PRESETS = [
  {
    name: 'Phòng Studio Tiêu Chuẩn',
    url: '/sample_room_360.jpg',
    desc: 'Không gian mở có gác, sàn gỗ và cửa sổ ban công sáng'
  }
];

export const RoomMediaStudioModal = ({ isOpen, onClose, room, onSaved }) => {
  const [activeTab, setActiveTab] = useState('360'); // '360' | 'gallery' | 'marketing'
  const [uploading360, setUploading360] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form state
  const [form, setForm] = useState({
    panorama360Url: '',
    images: [],
    isPublic: true,
    depositAmount: 500000,
    amenities: [],
    description: ''
  });

  useEffect(() => {
    if (room && isOpen) {
      // Phân tích danh sách ảnh
      let parsedImages = [];
      if (Array.isArray(room.images)) {
        parsedImages = room.images;
      } else if (typeof room.images === 'string' && room.images.trim()) {
        try {
          const parsed = JSON.parse(room.images);
          parsedImages = Array.isArray(parsed) ? parsed : [room.images];
        } catch {
          parsedImages = room.images.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      // Phân tích danh sách tiện ích
      let parsedAmenities = [];
      if (Array.isArray(room.amenities)) {
        parsedAmenities = room.amenities;
      } else if (typeof room.amenities === 'string' && room.amenities.trim()) {
        try {
          const parsed = JSON.parse(room.amenities);
          parsedAmenities = Array.isArray(parsed) ? parsed : [];
        } catch {
          parsedAmenities = room.amenities.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      setForm({
        panorama360Url: room.panorama360Url || '/sample_room_360.jpg',
        images: parsedImages,
        isPublic: room.isPublic ?? true,
        depositAmount: room.depositAmount || 500000,
        amenities: parsedAmenities,
        description: room.description || ''
      });
    }
  }, [room, isOpen]);

  if (!isOpen || !room) return null;

  const publicUrl = `${window.location.origin}/phong/${room.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Upload ảnh 360 Panorama
  const handleUpload360 = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('⚠️ Kích thước ảnh 360° vượt quá 25MB. Vui lòng chọn ảnh nhẹ hơn.');
      return;
    }

    setUploading360(true);
    try {
      const res = await fileService.uploadPanorama(file);
      const url = res.data?.url || res.url;
      if (url) {
        setForm(prev => ({ ...prev, panorama360Url: url }));
      }
    } catch (err) {
      alert('❌ Lỗi tải lên ảnh 360°: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading360(false);
      e.target.value = '';
    }
  };

  // Upload nhiều ảnh thực tế
  const handleUploadGallery = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingGallery(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) continue;
        const res = await fileService.uploadRoomImage(file);
        const url = res.data?.url || res.url;
        if (url) uploadedUrls.push(url);
      }

      setForm(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
    } catch (err) {
      alert('❌ Lỗi tải lên ảnh thực tế: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSetCoverImage = (index) => {
    if (index === 0) return;
    setForm(prev => {
      const updated = [...prev.images];
      const [item] = updated.splice(index, 1);
      updated.unshift(item);
      return { ...prev, images: updated };
    });
  };

  const toggleAmenity = (item) => {
    setForm(prev => {
      const exists = prev.amenities.includes(item);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter(a => a !== item)
          : [...prev.amenities, item]
      };
    });
  };

  const handleSave = async (openPreviewAfterSave = false) => {
    setSaving(true);
    try {
      const payload = {
        ...room,
        roomNumber: room.roomNumber,
        floor: Number(room.floor),
        price: Number(room.price),
        area: Number(room.area),
        maxTenants: Number(room.maxTenants),
        status: room.status,
        elecMeter: Number(room.elecMeter || 0),
        waterMeter: Number(room.waterMeter || 0),
        description: form.description?.trim() || '',
        panorama360Url: form.panorama360Url?.trim() || null,
        images: JSON.stringify(form.images),
        isPublic: form.isPublic,
        depositAmount: Number(form.depositAmount) || 0,
        amenities: JSON.stringify(form.amenities)
      };

      await roomService.updateRoom(room.id, payload);
      if (onSaved) onSaved({ ...room, ...payload });

      if (openPreviewAfterSave) {
        window.open(publicUrl, '_blank');
      }
      onClose();
    } catch (err) {
      alert('❌ Lỗi lưu thông tin: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 1050,
      background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: '960px', maxHeight: '92vh',
        background: 'var(--bg-card)', borderRadius: '20px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>

        {/* Modal Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--bg-dark)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
              }}>
                <Camera size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Studio Ảnh & Tour 360° • Phòng {room.roomNumber}
                </h3>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {room.zoneName || 'Khu trọ'} • Tầng {room.floor} • {formatVND(room.price)}/tháng
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
              title="Mở xem trang thực tế của khách"
            >
              <ExternalLink size={14} /> Trang công khai
            </a>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', padding: 6, borderRadius: 8
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div style={{
          display: 'flex', gap: 8, padding: '12px 24px',
          borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)'
        }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === '360' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('360')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 10, padding: '8px 16px' }}
          >
            <Compass size={16} /> Tour 360° Virtual
            {form.panorama360Url && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />}
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'gallery' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('gallery')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 10, padding: '8px 16px' }}
          >
            <Images size={16} /> Thư viện ảnh thực tế ({form.images.length})
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'marketing' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('marketing')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 10, padding: '8px 16px' }}
          >
            <Globe size={16} /> Cài đặt tiếp thị & Đặt cọc
            {form.isPublic && <span style={{ fontSize: 11, background: '#10b98122', color: '#10b981', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>Đang mở</span>}
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* TAB 1: TOUR 360 VIRTUAL */}
          {activeTab === '360' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <Sparkles size={24} color="#6366f1" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                  <strong>Công nghệ Tour 360° không gian thực tế:</strong> Khách thuê có thể kéo chuột hoặc nghiêng điện thoại để ngắm trần, sàn, góc bếp, ban công chân thực 100%. Giúp tăng tỷ lệ khách chốt cọc nhanh gấp 3 lần!
                </div>
              </div>

              {/* Trình xem trước 360° trực tiếp */}
              <div style={{
                borderRadius: 14, overflow: 'hidden',
                border: '1.5px solid var(--border-color)', position: 'relative'
              }}>
                <div style={{
                  padding: '8px 14px', background: 'rgba(0,0,0,0.6)',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Compass size={14} color="#6366f1" /> Xem thử góc nhìn 360° hiện tại (Dùng chuột kéo xoay để xem)
                  </span>
                  <span>{form.panorama360Url ? 'Đang kích hoạt' : 'Chưa có ảnh 360°'}</span>
                </div>
                {form.panorama360Url ? (
                  <Panorama360Viewer
                    imageUrl={form.panorama360Url}
                    height="360px"
                    title={`Phòng ${room.roomNumber} (360°)`}
                  />
                ) : (
                  <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: 'var(--text-muted)', flexDirection: 'column', gap: 10 }}>
                    <Compass size={40} style={{ opacity: 0.3 }} />
                    <span>Phòng này chưa có ảnh 360°. Vui lòng tải ảnh lên bên dưới.</span>
                  </div>
                )}
              </div>

              {/* Upload & Preset Options */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {/* Upload Custom 360 */}
                <div className="card" style={{ padding: 18, border: '1px dashed #6366f1', borderRadius: 14, textAlign: 'center', background: 'var(--bg-dark)' }}>
                  <Upload size={32} color="#6366f1" style={{ margin: '0 auto 10px auto' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700 }}>Tải lên ảnh 360° của phòng</h4>
                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                    Chấp nhận ảnh toàn cảnh tỷ lệ 2:1 (.jpg, .png, .webp). Hỗ trợ tối đa <strong>25MB</strong>.
                  </p>
                  <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {uploading360 ? 'Đang tải lên...' : 'Chọn file ảnh 360°'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUpload360}
                      disabled={uploading360}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {/* Chọn ảnh mẫu có sẵn */}
                <div className="card" style={{ padding: 18, borderRadius: 14, border: '1px solid var(--border-color)', background: 'var(--bg-dark)' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700 }}>Thư viện 360° mẫu</h4>
                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                    Nếu chưa kịp chụp ảnh 360, bạn có thể áp dụng mẫu phòng tiêu chuẩn:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {SAMPLE_360_PRESETS.map((preset, idx) => (
                      <div
                        key={idx}
                        onClick={() => setForm(prev => ({ ...prev, panorama360Url: preset.url }))}
                        style={{
                          padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                          border: `1.5px solid ${form.panorama360Url === preset.url ? '#6366f1' : 'var(--border-color)'}`,
                          background: form.panorama360Url === preset.url ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-card)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{preset.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{preset.desc}</div>
                        </div>
                        {form.panorama360Url === preset.url ? (
                          <CheckCircle2 size={18} color="#6366f1" />
                        ) : (
                          <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>Chọn mẫu</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nhập URL thủ công nếu có */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Hoặc nhập đường dẫn ảnh 360° trực tiếp (URL):
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="/uploads/panoramas/... hoặc https://..."
                  value={form.panorama360Url || ''}
                  onChange={e => setForm(prev => ({ ...prev, panorama360Url: e.target.value }))}
                  style={{ fontSize: 13 }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: GALLERY ẢNH THỰC TẾ */}
          {activeTab === 'gallery' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700 }}>Bộ ảnh chụp thực tế phòng ({form.images.length})</h4>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Tải lên hình ảnh giường ngủ, toilet, kệ bếp, hành lang... để khách xem rõ không gian.
                  </p>
                </div>

                <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={16} /> {uploadingGallery ? 'Đang tải lên...' : 'Thêm ảnh thực tế'}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleUploadGallery}
                    disabled={uploadingGallery}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Grid Images */}
              {form.images.length === 0 ? (
                <div style={{
                  padding: '48px 20px', textAlign: 'center', borderRadius: 14,
                  border: '2px dashed var(--border-color)', background: 'var(--bg-dark)',
                  color: 'var(--text-muted)'
                }}>
                  <Images size={44} style={{ opacity: 0.3, margin: '0 auto 12px auto' }} />
                  <p style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 600 }}>Chưa có hình ảnh chụp thực tế nào</p>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                    Chọn ảnh từ máy tính
                    <input type="file" multiple accept="image/*" onChange={handleUploadGallery} style={{ display: 'none' }} />
                  </label>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 16
                }}>
                  {form.images.map((imgUrl, index) => (
                    <div
                      key={index}
                      style={{
                        position: 'relative', borderRadius: 12, overflow: 'hidden',
                        border: index === 0 ? '2px solid #6366f1' : '1px solid var(--border-color)',
                        background: 'var(--bg-dark)', height: 160, display: 'flex', flexDirection: 'column'
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt={`Ảnh phòng ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />

                      {/* Cover Badge */}
                      {index === 0 && (
                        <div style={{
                          position: 'absolute', top: 6, left: 6,
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: '#fff', fontSize: 10.5, fontWeight: 700,
                          padding: '3px 8px', borderRadius: 6, boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }}>
                          Ảnh đại diện
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{
                        position: 'absolute', top: 6, right: 6,
                        display: 'flex', gap: 4
                      }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          title="Xóa ảnh này"
                          style={{
                            background: 'rgba(239, 68, 68, 0.85)', color: '#fff',
                            border: 'none', borderRadius: 6, width: 26, height: 26,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {index !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetCoverImage(index)}
                          style={{
                            position: 'absolute', bottom: 6, left: 6, right: 6,
                            background: 'rgba(0, 0, 0, 0.75)', color: '#fff',
                            border: 'none', borderRadius: 6, padding: '4px 8px',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center'
                          }}
                        >
                          Đặt làm ảnh bìa
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MARKETING & CỌC */}
          {activeTab === 'marketing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Toggle Public */}
              <div style={{
                padding: '16px 20px', borderRadius: 14,
                border: '1px solid var(--border-color)', background: 'var(--bg-dark)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Globe size={18} color="#6366f1" /> Công khai phòng lên Cổng tìm phòng SmartRent
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Khi bật, phòng sẽ hiển thị trên trang chủ tìm phòng cho khách tham quan và đặt cọc trực tuyến.
                  </div>
                </div>

                <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={e => setForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                    style={{ width: 22, height: 22, accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                </label>
              </div>

              {/* Tiền cọc giữ chỗ qua VietQR */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <DollarSign size={16} color="#10b981" /> Tiền cọc giữ chỗ trực tuyến qua VietQR (VNĐ)
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    step="50000"
                    min="0"
                    className="form-control"
                    value={form.depositAmount}
                    onChange={e => setForm(prev => ({ ...prev, depositAmount: Number(e.target.value) }))}
                    style={{ maxWidth: 220, fontSize: 15, fontWeight: 700, color: '#10b981' }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[500000, 1000000, 1500000, 2000000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setForm(prev => ({ ...prev, depositAmount: amt }))}
                        style={{ fontSize: 12, borderRadius: 8, padding: '4px 10px' }}
                      >
                        {amt / 1000}k
                      </button>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  Khách quét mã VietQR sẽ chuyển đúng số tiền này. Khi API nhận tiền, phòng tự động khóa sang trạng thái <strong>Đã cọc</strong>.
                </span>
              </div>

              {/* Tiện ích phòng (Amenities) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={16} color="#6366f1" /> Tiện ích nổi bật của phòng
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DEFAULT_AMENITIES.map(amenity => {
                    const isChecked = form.amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        style={{
                          padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.2s',
                          border: `1.5px solid ${isChecked ? '#6366f1' : 'var(--border-color)'}`,
                          background: isChecked ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-dark)',
                          color: isChecked ? '#6366f1' : 'var(--text-secondary)'
                        }}
                      >
                        {isChecked ? '✓ ' : '+ '} {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mô tả tiếp thị */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Lời giới thiệu phòng (Hiển thị cho khách thuê)
                </label>
                <textarea
                  rows={4}
                  className="form-control"
                  placeholder="Mô tả ưu điểm của phòng (ánh sáng, yên tĩnh, gần trường ĐH, chợ, giờ giấc tự do...)"
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{ fontSize: 13.5, resize: 'vertical' }}
                />
              </div>

              {/* Marketing Toolkit */}
              <div style={{
                padding: '16px 20px', borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08))',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex', flexDirection: 'column', gap: 10
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ExternalLink size={16} color="#6366f1" /> Link tiếp thị & chia sẻ cho khách thuê:
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="form-control"
                    style={{ fontSize: 13, background: 'var(--bg-dark)', color: 'var(--text-primary)' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopyLink}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 105, height: 38 }}
                  >
                    {copiedLink ? <><Check size={15} color="#10b981" /> Đã chép</> : <><Copy size={15} /> Sao chép</>}
                  </button>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Gửi link này cho khách qua Zalo, Messenger hoặc đính kèm bài đăng Facebook để khách tự trải nghiệm tour 360° và cọc phòng!
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Đóng
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleSave(true)}
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Eye size={16} /> Lưu & Xem thử trang khách
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSave(false)}
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
