import React, { useState } from 'react';
import { UserCheck, Plus, Search, Edit, Trash2, ArrowRightLeft, FileText, Upload, Eye, Shield, Bike, Image as ImageIcon } from 'lucide-react';
import { formatVND, formatDate, getImageUrl, sanitizeCccd, isValidCccd } from '../../utils/formatters';
import { tenantService } from '../../services';
import { Pagination } from '../Common/Pagination';
import { AvatarUploader, CccdCardUploader, ImageLightboxModal } from '../Common/ImageUploader';

// Helper che mờ số CCCD bảo vệ thông tin cá nhân (PII Masking)
const maskCCCD = (cccd) => {
  if (!cccd) return 'Chưa cập nhật';
  const clean = String(cccd).trim();
  if (clean.length <= 6) return clean;
  return clean.slice(0, 4) + '******' + clean.slice(-3);
};

export const TenantMgmt = ({ tenants = [], setTenants, rooms = [], zones = [], contracts = [], setContracts, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    avatarUrl: '',
    cccd: '',
    hometown: '',
    roomId: '',
    moveInDate: '',
    deposit: 4000000,
    vehicleCount: 0,
    vehicleInfo: '',
    cccdFrontUrl: '',
    cccdBackUrl: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  const filteredTenants = tenants.filter(t => {
    const name = (t.fullName || t.name || '').toLowerCase();
    const phone = t.phone || '';
    const cccd = t.cccd || t.CCCD || '';
    return name.includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      cccd.includes(searchTerm);
  });

  const totalPages = Math.ceil(filteredTenants.length / pageSize);
  const paginatedTenants = filteredTenants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenAdd = () => {
    setEditingTenant(null);
    const initialZone = zones[0] || null;
    const zoneId = initialZone?.id || '';
    setSelectedZoneId(zoneId);
    const zoneRooms = rooms.filter(r => !zoneId || r.zoneId === zoneId || r.ZoneId === zoneId);
    const initialRoom = zoneRooms[0] || rooms[0];
    setFormData({
      name: '',
      phone: '',
      email: '',
      password: '',
      avatarUrl: '',
      cccd: '',
      hometown: '',
      roomId: initialRoom?.id || '',
      moveInDate: new Date().toISOString().split('T')[0],
      deposit: initialRoom?.price || 4000000,
      vehicleCount: 0,
      vehicleInfo: '',
      cccdFrontUrl: '',
      cccdBackUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTenant(t);
    const currentRoom = rooms.find(r => r.id === (t.roomId || t.RoomId));
    setSelectedZoneId(currentRoom?.zoneId || currentRoom?.ZoneId || zones[0]?.id || '');
    setFormData({
      ...t,
      name: t.fullName || t.name || '',
      avatarUrl: t.avatarUrl || '',
      cccd: t.cccd || t.CCCD || '',
      roomId: t.roomId || t.RoomId || '',
      vehicleCount: t.vehicleCount || 0,
      vehicleInfo: t.vehicleInfo || '',
      cccdFrontUrl: t.cccdFrontUrl || '',
      cccdBackUrl: t.cccdBackUrl || '',
      password: ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa người thuê này?')) {
      try {
        await tenantService.deleteTenant(id);
        setTenants(tenants.filter(t => t.id !== id));
        onRefresh?.();
      } catch (err) {
        alert('Lỗi xóa người thuê: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name && !formData.fullName) {
      alert('Vui lòng nhập họ và tên khách thuê');
      return;
    }
    if (!formData.phone) {
      alert('Vui lòng nhập số điện thoại');
      return;
    }
    if (!formData.roomId) {
      alert('Vui lòng chọn phòng để xếp khách thuê vào');
      return;
    }
    if (formData.cccd && !isValidCccd(formData.cccd)) {
      alert('Số CCCD không hợp lệ! Vui lòng nhập đúng 12 chữ số và bắt đầu bằng số 0 (VD: 001201012345).');
      return;
    }

    if (formData.email) {
      const duplicateEmail = tenants.find(t => 
        t.email?.toLowerCase() === formData.email.toLowerCase() && 
        (!editingTenant || t.id !== editingTenant.id)
      );
      if (duplicateEmail) {
        alert(`Lỗi Email: Email "${formData.email}" đã tồn tại trong hệ thống. Vui lòng nhập email khác!`);
        return;
      }
    }

    if (formData.phone) {
      const duplicatePhone = tenants.find(t => 
        t.phone === formData.phone && 
        (!editingTenant || t.id !== editingTenant.id)
      );
      if (duplicatePhone) {
        alert(`Lỗi Số điện thoại: SĐT "${formData.phone}" đã đăng ký cho khách hàng khác. Vui lòng kiểm tra lại!`);
        return;
      }
    }

    setSaving(true);
    let createdOrUpdated = null;

    try {
      if (editingTenant) {
        if (tenantService && tenantService.updateTenant) {
          createdOrUpdated = await tenantService.updateTenant(editingTenant.id, {
            fullName: formData.name || formData.fullName,
            phone: formData.phone,
            hometown: formData.hometown,
            roomId: formData.roomId,
            vehicleCount: Number(formData.vehicleCount || 0),
            vehicleInfo: formData.vehicleInfo || '',
            cccdFrontUrl: formData.cccdFrontUrl,
            cccdBackUrl: formData.cccdBackUrl,
            avatarUrl: formData.avatarUrl,
            cccd: formData.cccd || formData.CCCD,
          });
        }
      } else {
        if (tenantService && tenantService.createTenant) {
          createdOrUpdated = await tenantService.createTenant({
            fullName: formData.name || formData.fullName,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            cccd: formData.cccd || formData.CCCD || '000000000000',
            hometown: formData.hometown,
            roomId: formData.roomId,
            moveInDate: formData.moveInDate || new Date().toISOString(),
            deposit: Number(formData.deposit || 0),
            vehicleCount: Number(formData.vehicleCount || 0),
            vehicleInfo: formData.vehicleInfo || '',
            cccdFrontUrl: formData.cccdFrontUrl,
            cccdBackUrl: formData.cccdBackUrl,
            avatarUrl: formData.avatarUrl,
          });
        }
      }
    } catch (apiErr) {
      const errMsg = apiErr.response?.data?.message || apiErr.message;
      alert(`Lỗi tạo/cập nhật người thuê: ${errMsg}. Vui lòng kiểm tra và nhập lại thông tin!`);
      setSaving(false);
      return;
    }

    if (editingTenant) {
      setTenants(tenants.map(t => t.id === editingTenant.id ? { ...t, ...formData, ...(createdOrUpdated || {}) } : t));
    } else {
      const newTenant = createdOrUpdated || {
        id: `T00${tenants.length + 1}`,
        ...formData,
        fullName: formData.name,
      };
      setTenants([...tenants, newTenant]);
    }
    setIsModalOpen(false);
    setSaving(false);
    onRefresh?.();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><UserCheck size={24} color="#6366f1" /> Quản Lý Người Thuê</h2>
          <p className="page-subtitle">Thêm mới, cập nhật thông tin định danh, chuyển phòng và quản lý phương tiện gửi tại nhà trọ</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Thêm Người Thuê Mới
        </button>
      </div>

      <div className="card-table-container">
        <div className="table-toolbar">
          <div className="search-input-group">
            <Search size={16} />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, số CCCD..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Họ và Tên</th>
              <th>Liên Hệ & Định Danh</th>
              <th>Phòng & Khu Trọ</th>
              <th>Mã Hợp Đồng</th>
              <th>Ngày Chuyển Vào</th>
              <th>Tiền Cọc</th>
              <th>Chi Tiết CCCD</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTenants.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Không tìm thấy khách thuê nào phù hợp.
                </td>
              </tr>
            ) : (
              paginatedTenants.map(t => {
                const room = rooms.find(r => r.id === (t.roomId || t.RoomId));
                const zone = zones.find(z => z.id === room?.zoneId || z.id === room?.ZoneId);
                const roomNumber = t.roomNumber || (room ? room.roomNumber : 'Chưa xếp');
                const zoneName = t.zoneName || (zone ? zone.name : '');
                const contractCode = t.contractCode || t.ContractCode;

                return (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: '1.5px solid rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>
                          {t.avatarUrl ? (
                            <img src={getImageUrl(t.avatarUrl)} alt={t.fullName || t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            (t.fullName || t.name || 'K')[0].toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{t.fullName || t.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{t.phone}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        CCCD: <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{maskCCCD(t.cccd || t.CCCD)}</span>
                      </div>
                      {t.vehicleCount > 0 && (
                        <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Bike size={12} /> {t.vehicleCount} xe {t.vehicleInfo ? `(${t.vehicleInfo})` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        {roomNumber !== 'Chưa xếp' ? `Phòng ${roomNumber}` : 'Chưa xếp phòng'}
                      </div>
                      {zoneName && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🏢 {zoneName}</div>}
                    </td>
                    <td>
                      {contractCode ? (
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                          {contractCode}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                          ⚠️ Chưa có HĐ
                        </span>
                      )}
                    </td>
                    <td>{formatDate(t.moveInDate)}</td>
                    <td><strong style={{ color: '#34d399' }}>{formatVND(t.deposit)}</strong></td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => setViewingProfile(t)}>
                        <Eye size={14} /> Xem CCCD & Hồ sơ
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-sm btn-secondary" title="Sửa thông tin" onClick={() => handleOpenEdit(t)}>
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-sm btn-danger" title="Xóa" onClick={() => handleDelete(t.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredTenants.length}
          pageSize={pageSize}
        />
      </div>

      {/* Profile Detail Modal */}
      {viewingProfile && (
        <div className="modal-overlay" onClick={() => setViewingProfile(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px', width: '95%' }}>
            <div className="modal-header">
              <h3 className="modal-title">Hồ Sơ Khách Thuê: {viewingProfile.fullName || viewingProfile.name}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewingProfile(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
                <div style={{ width: '74px', height: '74px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #6366f1', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#6366f1', flexShrink: 0 }}>
                  {viewingProfile.avatarUrl ? (
                    <img src={getImageUrl(viewingProfile.avatarUrl)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (viewingProfile.fullName || viewingProfile.name || 'K')[0].toUpperCase()
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', margin: 0 }}>{viewingProfile.fullName || viewingProfile.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: '4px 0' }}>SĐT: <strong>{viewingProfile.phone}</strong> | Email: {viewingProfile.email}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Số CCCD: <strong style={{ color: 'var(--text-primary)' }}>{viewingProfile.cccd || viewingProfile.CCCD || 'Chưa cập nhật'}</strong></p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0' }}>Quê quán: {viewingProfile.hometown || 'Chưa cập nhật'} | Ngày nhận phòng: {formatDate(viewingProfile.moveInDate)}</p>
                  {viewingProfile.vehicleCount > 0 && (
                    <p style={{ color: '#10b981', fontSize: '13px', margin: '2px 0' }}>Xe gửi: {viewingProfile.vehicleCount} xe ({viewingProfile.vehicleInfo || 'Chưa ghi biển số'})</p>
                  )}
                </div>
              </div>

              <h4 style={{ marginBottom: '12px', fontSize: '15px' }}>Hình Ảnh Căn Cước Công Dân (CCCD 2 Mặt)</h4>
              <div className="form-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Mặt Trước CCCD:</div>
                  {viewingProfile.cccdFrontUrl ? (
                    <div style={{ position: 'relative', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }} onClick={() => setLightboxImage({ url: viewingProfile.cccdFrontUrl, title: `Mặt trước CCCD - ${viewingProfile.fullName || viewingProfile.name}` })}>
                      <img src={getImageUrl(viewingProfile.cccdFrontUrl)} alt="CCCD Front" style={{ width: '100%', height: '170px', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={12} /> Bấm xem lớn
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: '140px', background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Chưa có ảnh mặt trước
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Mặt Sau CCCD:</div>
                  {viewingProfile.cccdBackUrl ? (
                    <div style={{ position: 'relative', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }} onClick={() => setLightboxImage({ url: viewingProfile.cccdBackUrl, title: `Mặt sau CCCD - ${viewingProfile.fullName || viewingProfile.name}` })}>
                      <img src={getImageUrl(viewingProfile.cccdBackUrl)} alt="CCCD Back" style={{ width: '100%', height: '170px', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={12} /> Bấm xem lớn
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: '140px', background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Chưa có ảnh mặt sau
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewingProfile(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingTenant ? 'Chỉnh Sửa Hồ Sơ Khách Thuê' : 'Thêm Khách Thuê Mới'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {/* 1. Avatar Uploader */}
                <div style={{ marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ marginBottom: '8px' }}>Ảnh Đại Diện Khách Thuê</label>
                  <AvatarUploader
                    value={formData.avatarUrl}
                    onChange={(url) => setFormData({ ...formData, avatarUrl: url })}
                    size={76}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Họ và Tên Khách Thuê *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="VD: Nguyễn Văn A"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Số Điện Thoại *</label>
                    <input
                      type="tel"
                      className="form-control"
                      required
                      placeholder="VD: 0912345678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Đăng Nhập *</label>
                    <input
                      type="email"
                      className="form-control"
                      required
                      disabled={!!editingTenant}
                      placeholder="VD: khachthue@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {!editingTenant && (
                  <div className="form-group">
                    <label className="form-label">Mật Khẩu Khởi Tạo Tài Khoản *</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      placeholder="Nhập mật khẩu cho khách thuê"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Số CCCD / CMND *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      maxLength={12}
                      inputMode="numeric"
                      placeholder="VD: 001201012345 (12 số, bắt đầu bằng 0)"
                      value={formData.cccd}
                      onChange={(e) => setFormData({ ...formData, cccd: sanitizeCccd(e.target.value) })}
                    />
                    <small style={{ fontSize: '11px', color: formData.cccd && !isValidCccd(formData.cccd) ? '#ef4444' : 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      {formData.cccd && !isValidCccd(formData.cccd)
                        ? '⚠️ CCCD phải gồm đúng 12 chữ số và bắt đầu bằng số 0'
                        : 'CCCD 12 số chuẩn, chỉ nhận số và bắt đầu bằng 0'}
                    </small>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quê Quán</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: Hải Phòng, Nam Định..."
                      value={formData.hometown}
                      onChange={(e) => setFormData({ ...formData, hometown: e.target.value })}
                    />
                  </div>
                </div>

                {/* CCCD Image Uploader 2 Mặt */}
                <div style={{ marginTop: '12px', marginBottom: '16px', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={15} color="#6366f1" /> Ảnh Giấy Tờ Căn Cước Công Dân (CCCD 2 Mặt)
                  </label>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <CccdCardUploader
                      label="Mặt Trước CCCD"
                      value={formData.cccdFrontUrl}
                      onChange={(url) => setFormData({ ...formData, cccdFrontUrl: url })}
                    />
                    <CccdCardUploader
                      label="Mặt Sau CCCD"
                      value={formData.cccdBackUrl}
                      onChange={(url) => setFormData({ ...formData, cccdBackUrl: url })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Chọn Khu Trọ</label>
                    <select
                      className="form-control"
                      value={selectedZoneId}
                      onChange={(e) => {
                        const newZoneId = e.target.value;
                        setSelectedZoneId(newZoneId);
                        const zoneRooms = rooms.filter(r => !newZoneId || r.zoneId === newZoneId || r.ZoneId === newZoneId);
                        setFormData({ ...formData, roomId: zoneRooms[0]?.id || '' });
                      }}
                    >
                      <option value="">-- Tất cả khu trọ --</option>
                      {zones.map(z => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Xếp Phòng Thuê *</label>
                    <select
                      className="form-control"
                      required
                      value={formData.roomId}
                      onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                    >
                      <option value="">-- Chọn phòng --</option>
                      {rooms
                        .filter(r => !selectedZoneId || r.zoneId === selectedZoneId || r.ZoneId === selectedZoneId)
                        .map(r => (
                          <option key={r.id} value={r.id}>
                            Phòng {r.roomNumber} ({r.zoneName || 'Khu trọ'}) - {formatVND(r.price)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Số Lượng Xe Gửi</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={formData.vehicleCount}
                      onChange={(e) => setFormData({ ...formData, vehicleCount: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Biển Số / Loại Xe</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: 59-P1 123.45 (Vision)"
                      value={formData.vehicleInfo || ''}
                      onChange={(e) => setFormData({ ...formData, vehicleInfo: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ngày Nhận Phòng</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.moveInDate ? formData.moveInDate.split('T')[0] : ''}
                      onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tiền Cọc (VNĐ)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.deposit}
                      onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Đang lưu...' : (editingTenant ? 'Cập Nhật Hồ Sơ' : 'Lưu Khách Thuê')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {lightboxImage && (
        <ImageLightboxModal
          imageUrl={lightboxImage.url}
          title={lightboxImage.title}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};
