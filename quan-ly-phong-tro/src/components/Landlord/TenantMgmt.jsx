import React, { useState } from 'react';
import { UserCheck, Plus, Search, Edit, Trash2, ArrowRightLeft, FileText, Upload, Eye, CreditCard } from 'lucide-react';
import { formatVND, formatDate } from '../../utils/formatters';
import { tenantService } from '../../services';
import { Pagination } from '../Common/Pagination';

export const TenantMgmt = ({ tenants = [], setTenants, rooms = [], zones = [], contracts = [], setContracts, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    cccd: '',
    hometown: '',
    roomId: '',
    moveInDate: '',
    deposit: 4000000,
    vehicleCount: 0,
    vehicleInfo: '',
    cccdFrontUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400',
    cccdBackUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400',
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
      cccd: '',
      hometown: '',
      roomId: initialRoom?.id || '',
      moveInDate: new Date().toISOString().split('T')[0],
      deposit: initialRoom?.price || 4000000,
      vehicleCount: 0,
      vehicleInfo: '',
      cccdFrontUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400',
      cccdBackUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400',
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
      cccd: t.cccd || t.CCCD || '',
      roomId: t.roomId || t.RoomId || '',
      password: '',
      vehicleCount: t.vehicleCount || 0,
      vehicleInfo: t.vehicleInfo || '',
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
    if (!editingTenant && !formData.password?.trim()) {
      alert('Vui lòng nhập mật khẩu cho tài khoản mới');
      return;
    }

    if (formData.roomId) {
      const targetRoom = rooms.find(r => r.id === formData.roomId);
      if (targetRoom) {
        const max = targetRoom.maxTenants || 2;
        const count = tenants.filter(t => 
          (t.roomId === formData.roomId || t.RoomId === formData.roomId) && 
          (!editingTenant || t.id !== editingTenant.id)
        ).length;

        if (count >= max) {
          alert(`Lỗi chọn phòng: Phòng ${targetRoom.roomNumber} đã đạt sức chứa tối đa (${max} người). Vui lòng chọn phòng khác!`);
          return;
        }
      }
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
          <p className="page-subtitle">Thêm mới, cập nhật thông tin, upload CCCD, chuyển phòng và xem hồ sơ chi tiết</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Thêm Người Thuê Mới
        </button>
      </div>

      <div className="card-table-container">
        <div className="table-toolbar">
          <div className="search-input-group">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tìm theo họ tên, SĐT, số CCCD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Khách Thuê</th>
              <th>Số Điện Thoại / CCCD</th>
              <th>Khu Trọ & Phòng</th>
              <th>Hợp Đồng Thuê</th>
              <th>Ngày Nhận Phòng</th>
              <th>Đăng Ký Xe</th>
              <th>Tiền Cọc</th>
              <th>Giấy Tờ & CCCD</th>
              <th>Thao Tác</th>
            </tr>

          </thead>
          <tbody>
            {paginatedTenants.map((t) => {
              const room = rooms.find(r => r.id === (t.roomId || t.RoomId));
              const zoneName = t.zoneName || t.ZoneName || room?.zoneName || zones.find(z => z.id === (room?.zoneId || room?.ZoneId))?.name || '';
              const roomNumber = t.roomNumber || t.RoomNumber || room?.roomNumber || 'Chưa xếp';
              const contractCode = t.contractCode || t.ContractCode;

              return (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>
                        {(t.fullName || t.name || 'K')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{t.fullName || t.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{t.phone}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CCCD: {t.cccd || t.CCCD}</div>
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
                  <td>
                    <div style={{ fontWeight: '600' }}>🛵 {t.vehicleCount || 0} xe</div>
                    {t.vehicleInfo && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.vehicleInfo}</div>}
                  </td>
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
            })}
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
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Hồ Sơ Chi Tiết Khách Thuê: {viewingProfile.name}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewingProfile(null)}>X</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
                <img src={viewingProfile.avatar} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
                <div>
                  <h3 style={{ fontSize: '18px' }}>{viewingProfile.name}</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>SĐT: {viewingProfile.phone} | Email: {viewingProfile.email}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Quê quán: {viewingProfile.hometown} | Ngày chuyển vào: {formatDate(viewingProfile.moveInDate)}</p>
                </div>
              </div>

              <h4 style={{ marginBottom: '12px', fontSize: '15px' }}>Hình Ảnh Căn Cước Công Dân (CCCD 2 Mặt)</h4>
              <div className="form-row">
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Mặt Trước CCCD:</div>
                  <img src={viewingProfile.cccdFrontUrl} alt="CCCD Front" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Mặt Sau CCCD:</div>
                  <img src={viewingProfile.cccdBackUrl} alt="CCCD Back" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
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
          <div className="modal-content" style={{ maxWidth: '920px', width: '95vw', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '10px 18px', background: 'var(--surface-card, #1e2235)', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))' }}>
              <h3 className="modal-title" style={{ fontSize: '14px', fontWeight: 700 }}>
                {editingTenant ? '✏️ Chỉnh Sửa Hồ Sơ Khách Thuê' : '👤 Thêm Khách Thuê Mới'}
              </h3>
              <button className="btn btn-sm btn-secondary" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ padding: '14px 18px', overflow: 'hidden' }}>
                <style>{`
                  .tenant-form-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px 12px;
                  }
                  .tf-label {
                    display: block;
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--text-muted, #9ca3af);
                    margin-bottom: 3px;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  }
                  .tf-input {
                    width: 100%;
                    height: 32px;
                    background: var(--input-bg, rgba(255,255,255,0.05));
                    border: 1px solid var(--border-color, rgba(255,255,255,0.12));
                    border-radius: 6px;
                    padding: 0 9px;
                    font-size: 12px;
                    color: var(--text-primary, #fff);
                    outline: none;
                    box-sizing: border-box;
                  }
                  .tf-input:focus {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
                  }
                  .tf-input:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                  }
                `}</style>

                {/* Grid 4 cột x 3 hàng = 12 trường thông tin */}
                <div className="tenant-form-grid">

                  {/* ── HÀNG 1: Họ tên | SĐT | Email | Mật khẩu ── */}
                  <div>
                    <label className="tf-label">Họ và Tên *</label>
                    <input className="tf-input" type="text" required value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nguyễn Văn A" />
                  </div>
                  <div>
                    <label className="tf-label">Số Điện Thoại *</label>
                    <input className="tf-input" type="text" required value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="09xxxxxxxx" />
                  </div>
                  <div>
                    <label className="tf-label">Email *</label>
                    <input className="tf-input" type="email" required value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                  </div>
                  <div>
                    <label className="tf-label">Mật Khẩu {!editingTenant && '*'}</label>
                    <input className="tf-input" type="password" required={!editingTenant} value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingTenant ? '(Giữ nguyên)' : 'Nhập mật khẩu'} />
                  </div>

                  {/* ── HÀNG 2: CCCD | Quê quán | Khu trọ | Phòng ── */}
                  <div>
                    <label className="tf-label">Số CCCD / CMND *</label>
                    <input className="tf-input" type="text" required value={formData.cccd}
                      onChange={(e) => setFormData({ ...formData, cccd: e.target.value })} placeholder="012345678901" />
                  </div>
                  <div>
                    <label className="tf-label">Quê Quán</label>
                    <input className="tf-input" type="text" value={formData.hometown}
                      onChange={(e) => setFormData({ ...formData, hometown: e.target.value })} placeholder="Tỉnh / Thành phố" />
                  </div>
                  <div>
                    <label className="tf-label">Chọn Khu Trọ *</label>
                    <select className="tf-input" required value={selectedZoneId}
                      onChange={(e) => {
                        const zoneId = e.target.value;
                        setSelectedZoneId(zoneId);
                        const zoneRooms = rooms.filter(r => !zoneId || r.zoneId === zoneId || r.ZoneId === zoneId);
                        const firstRoom = zoneRooms[0];
                        setFormData(prev => ({ ...prev, roomId: firstRoom?.id || '', deposit: firstRoom?.price || prev.deposit }));
                      }}>
                      <option value="">-- Chọn khu --</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="tf-label">Xếp Vào Phòng *</label>
                    <select className="tf-input" required value={formData.roomId}
                      onChange={(e) => {
                        const selectedRoom = rooms.find(r => r.id === e.target.value);
                        setFormData({ ...formData, roomId: e.target.value, deposit: selectedRoom?.price || formData.deposit });
                      }}>
                      <option value="">-- Chọn phòng --</option>
                      {rooms.filter(r => !selectedZoneId || r.zoneId === selectedZoneId || r.ZoneId === selectedZoneId).map(r => {
                        const count = tenants.filter(t => (t.roomId === r.id || t.RoomId === r.id) && (!editingTenant || t.id !== editingTenant.id)).length;
                        const max = r.maxTenants || 2;
                        const isFull = count >= max;
                        return <option key={r.id} value={r.id} disabled={isFull}>P.{r.roomNumber} ({count}/{max}{isFull ? ' ĐẦY' : ''})</option>;
                      })}
                    </select>
                  </div>

                  {/* ── HÀNG 3: Ngày vào | Tiền cọc | Số xe | Biển số xe ── */}
                  <div>
                    <label className="tf-label">Ngày Chuyển Vào *</label>
                    <input className="tf-input" type="date" required value={formData.moveInDate}
                      onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="tf-label">Tiền Cọc (VND) *</label>
                    <input className="tf-input" type="number" required value={formData.deposit}
                      onChange={(e) => setFormData({ ...formData, deposit: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="tf-label">🛵 Số Lượng Xe</label>
                    <select className="tf-input" value={formData.vehicleCount}
                      onChange={(e) => setFormData({ ...formData, vehicleCount: parseInt(e.target.value) || 0 })}>
                      <option value={0}>Không xe</option>
                      <option value={1}>1 xe</option>
                      <option value={2}>2 xe</option>
                      <option value={3}>3 xe</option>
                      <option value={4}>4 xe</option>
                      <option value={5}>5 xe</option>
                    </select>
                  </div>
                  <div>
                    <label className="tf-label">Biển Số Xe</label>
                    <input className="tf-input" type="text"
                      placeholder={formData.vehicleCount > 0 ? 'VD: 51G1-12345' : 'Chưa có xe'}
                      value={formData.vehicleInfo}
                      disabled={!formData.vehicleCount || formData.vehicleCount <= 0}
                      onChange={(e) => setFormData({ ...formData, vehicleInfo: e.target.value })} />
                  </div>

                </div>
              </div>

              <div className="modal-footer" style={{ padding: '8px 18px', background: 'var(--surface-card, #1e2235)', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))' }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }} disabled={saving}>
                  {saving ? '⏳ Đang lưu...' : (editingTenant ? '💾 Cập Nhật Hồ Sơ' : '✅ Thêm Khách Thuê Mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
