import React, { useState } from 'react';
import { UserCheck, Plus, Search, Edit, Trash2, ArrowRightLeft, FileText, Upload, Eye, Shield, Bike, Image as ImageIcon, KeyRound } from 'lucide-react';
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
  const [resetModalTenant, setResetModalTenant] = useState(null);
  const [customNewPass, setCustomNewPass] = useState('Tenant@123456');
  const [isResetting, setIsResetting] = useState(false);
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

  const handleResetPassword = async (e) => {
    e?.preventDefault();
    if (!resetModalTenant) return;
    if (!customNewPass || customNewPass.trim().length < 6) {
      alert('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }
    setIsResetting(true);
    try {
      const res = await tenantService.resetPassword(resetModalTenant.id, customNewPass.trim());
      alert(`✅ ${res?.message || 'Đặt lại mật khẩu thành công!'}`);
      setResetModalTenant(null);
    } catch (err) {
      alert('Lỗi đặt lại mật khẩu: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsResetting(false);
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

    // Kiểm tra sức chứa tối đa của phòng
    const targetRoom = rooms.find(r => r.id === formData.roomId);
    if (targetRoom) {
      const roomTenants = tenants.filter(t => (t.roomId || t.RoomId) === targetRoom.id);
      const otherTenantsCount = editingTenant
        ? roomTenants.filter(t => t.id !== editingTenant.id).length
        : roomTenants.length;
      const max = targetRoom.maxTenants || targetRoom.MaxTenants || 2;
      if (otherTenantsCount >= max) {
        alert(`❌ Phòng ${targetRoom.roomNumber} đã đạt sức chứa tối đa (${otherTenantsCount}/${max} người). Vui lòng chọn phòng khác còn chỗ!`);
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
    <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '20px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={24} color="#6366f1" /> Quản Lý Người Thuê
          </h2>
          <p className="page-subtitle" style={{ fontSize: '12.5px', margin: '2px 0 0 0' }}>
            Thêm mới, cập nhật thông tin định danh, chuyển phòng và quản lý phương tiện gửi tại nhà trọ
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd} style={{ padding: '7px 18px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}>
          <Plus size={18} /> Thêm Người Thuê Mới
        </button>
      </div>

      <div className="card-table-container">
        <div className="table-toolbar" style={{ padding: '10px 18px' }}>
          <div className="search-input-group" style={{ padding: '6px 14px', minWidth: '280px' }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, số CCCD..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: '13px' }}
            />
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ padding: '9px 16px', fontSize: '14px' }}>Họ và Tên</th>
              <th style={{ padding: '9px 16px', fontSize: '14px' }}>Liên Hệ & Định Danh</th>
              <th style={{ padding: '9px 16px', fontSize: '14px' }}>Phòng & Khu Trọ</th>
              <th style={{ padding: '9px 16px', fontSize: '14px' }}>Mã Hợp Đồng</th>
              <th style={{ padding: '9px 16px', fontSize: '14px' }}>Ngày Chuyển Vào</th>
              <th style={{ padding: '9px 16px', fontSize: '14px' }}>Tiền Cọc</th>
              <th style={{ padding: '9px 16px', fontSize: '14px' }}>Chi Tiết CCCD</th>
              <th style={{ padding: '9px 16px', fontSize: '14px' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTenants.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '14.5px' }}>
                  Không tìm thấy khách thuê nào phù hợp.
                </td>
              </tr>
            ) : (
              paginatedTenants.map(t => {
                const room = rooms.find(r => r.id === (t.roomId || t.RoomId));
                const zone = zones.find(z => z.id === room?.zoneId || z.id === room?.ZoneId);
                const hasRoom = Boolean(t.roomId || t.RoomId);
                const roomNumber = t.roomNumber || (room ? room.roomNumber : null);
                const zoneName = t.zoneName || (zone ? zone.name : '');

                const tenantContracts = contracts.filter(c => (
                  c.tenantId === t.id ||
                  c.TenantProfileId === t.id ||
                  c.tenantProfileId === t.id ||
                  c.tenantId === t.userId ||
                  c.tenantProfileId === t.userId ||
                  (t.roomId && (c.roomId === t.roomId || c.RoomId === t.roomId))
                ));
                const activeContract = tenantContracts.find(c => {
                  const s = String(c.status || '').toLowerCase();
                  return s === 'active' || s === 'renewrequested' || s === 'renew_requested';
                });
                const hasActiveContract = Boolean(activeContract) || Boolean(t.contractCode || t.ContractCode);
                const isLiquidated = !hasActiveContract && tenantContracts.some(c => String(c.status || '').toLowerCase() === 'liquidated');
                const contractCode = activeContract?.contractCode || t.contractCode || t.ContractCode || tenantContracts[0]?.contractCode;

                return (
                  <tr key={t.id}>
                    <td style={{ padding: '7px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: '1.5px solid rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>
                          {t.avatarUrl ? (
                            <img src={getImageUrl(t.avatarUrl)} alt={t.fullName || t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            (t.fullName || t.name || 'K')[0].toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' }}>{t.fullName || t.name}</div>
                          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{t.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '7px 16px' }}>
                      <div style={{ fontSize: '14.5px', fontWeight: '600' }}>{t.phone}</div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                        CCCD: <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{maskCCCD(t.cccd || t.CCCD)}</span>
                      </div>
                      {t.vehicleCount > 0 && (
                        <div style={{ fontSize: '12.5px', color: '#10b981', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Bike size={12} /> {t.vehicleCount} xe {t.vehicleInfo ? `(${t.vehicleInfo})` : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '7px 16px' }}>
                      <div style={{ fontWeight: '700', color: hasRoom ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '15px' }}>
                        {hasRoom && roomNumber ? `Phòng ${roomNumber}` : isLiquidated ? '🔒 Đã trả phòng' : 'Chưa xếp phòng'}
                      </div>
                      {hasRoom && zoneName && <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>🏢 {zoneName}</div>}
                    </td>
                    <td style={{ padding: '7px 16px' }}>
                      {hasActiveContract && contractCode ? (
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '3px 8px', borderRadius: '5px', display: 'inline-block' }}>
                          {contractCode}
                        </span>
                      ) : isLiquidated ? (
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#ef4444', background: 'rgba(239,68,68,0.12)', padding: '3px 8px', borderRadius: '5px', display: 'inline-block' }}>
                          🔒 Đã thanh lý
                        </span>
                      ) : (
                        <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '3px 8px', borderRadius: '5px', display: 'inline-block' }}>
                          ⚠️ Chưa có HĐ
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '7px 16px', fontSize: '14.5px' }}>{formatDate(t.moveInDate)}</td>
                    <td style={{ padding: '7px 16px', fontSize: '14.5px' }}><strong style={{ color: '#34d399' }}>{formatVND(t.deposit)}</strong></td>
                    <td style={{ padding: '7px 16px' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => setViewingProfile(t)} style={{ padding: '4px 10px', fontSize: '13px', height: '30px' }}>
                        <Eye size={14} /> Xem CCCD & Hồ sơ
                      </button>
                    </td>
                    <td style={{ padding: '7px 16px' }}>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          title="Đặt lại mật khẩu cho khách thuê"
                          style={{ padding: '3px 8px', height: '30px' }}
                          onClick={() => {
                            setResetModalTenant(t);
                            setCustomNewPass('Tenant@123456');
                          }}
                        >
                          <KeyRound size={14} color="#6366f1" />
                        </button>
                        <button className="btn btn-sm btn-secondary" title="Sửa thông tin" style={{ padding: '3px 8px', height: '30px' }} onClick={() => handleOpenEdit(t)}>
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-sm btn-danger" title="Xóa" style={{ padding: '3px 8px', height: '30px' }} onClick={() => handleDelete(t.id)}>
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

        <div style={{ padding: '0 16px 10px' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredTenants.length}
            pageSize={pageSize}
          />
        </div>
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
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366f1', borderColor: 'rgba(99,102,241,0.4)' }}
                onClick={() => {
                  const target = viewingProfile;
                  setViewingProfile(null);
                  setResetModalTenant(target);
                  setCustomNewPass('Tenant@123456');
                }}
              >
                <KeyRound size={14} /> Đặt Lại Mật Khẩu
              </button>
              <button className="btn btn-secondary" onClick={() => setViewingProfile(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingTenant ? 'Chỉnh Sửa Hồ Sơ Khách Thuê' : 'Thêm Khách Thuê Mới'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body">
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
                        .map(r => {
                          const roomTenants = tenants.filter(t => (t.roomId || t.RoomId) === r.id);
                          const isCurrentRoom = editingTenant && (editingTenant.roomId || editingTenant.RoomId) === r.id;
                          const otherTenantsCount = isCurrentRoom
                            ? roomTenants.filter(t => t.id !== editingTenant.id).length
                            : roomTenants.length;
                          const max = r.maxTenants || r.MaxTenants || 2;
                          const isFull = otherTenantsCount >= max;

                          return (
                            <option key={r.id} value={r.id} disabled={isFull}>
                              Phòng {r.roomNumber} ({r.zoneName || 'Khu trọ'}) - {formatVND(r.price)} {isFull ? `[🚫 ĐÃ ĐẦY ${otherTenantsCount}/${max} người]` : `[Còn chỗ ${otherTenantsCount}/${max}]`}
                            </option>
                          );
                        })}
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

      {/* Reset Password Modal */}
      {resetModalTenant && (
        <div className="modal-overlay" onClick={() => setResetModalTenant(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '95%' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="#6366f1" /> Đặt Lại Mật Khẩu Khách Thuê
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setResetModalTenant(null)}>✕</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>
                    {resetModalTenant.fullName || resetModalTenant.name}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    Email: <strong>{resetModalTenant.email}</strong> | SĐT: {resetModalTenant.phone}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Mật khẩu mới (Cung cấp cho khách thuê đăng nhập) *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={customNewPass}
                    onChange={(e) => setCustomNewPass(e.target.value)}
                    placeholder="Nhập mật khẩu mới (VD: Tenant@123456)"
                  />
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    Gợi ý: Mặc định là <code>Tenant@123456</code>. Sau khi đặt lại, khách thuê có thể dùng mật khẩu này đăng nhập vào hệ thống và tự đổi mật khẩu mới trong mục Hồ sơ.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setResetModalTenant(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={isResetting}>
                  {isResetting ? '⏳ Đang lưu...' : 'Xác Nhận Đặt Lại Mật Khẩu'}
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
