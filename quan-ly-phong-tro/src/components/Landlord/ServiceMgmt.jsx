import React, { useState } from 'react';
import { Settings, Plus, Edit, Trash2, Wifi, Bike, Trash, ShieldCheck, Loader2 } from 'lucide-react';
import { formatVND } from '../../utils/formatters';
import { serviceMgmtService } from '../../services';

export const ServiceMgmt = ({ services = [], setServices, zones = [], targetZone = null, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState(targetZone ? targetZone.id : 'all');

  const [formData, setFormData] = useState({
    name: '',
    price: 100000,
    unit: 'phòng/tháng',
    icon: 'Settings',
    isActive: true,
    zoneId: targetZone ? targetZone.id : '',
  });

  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'Wifi':
        return <Wifi size={16} color="#818cf8" />;
      case 'Bike':
        return <Bike size={16} color="#34d399" />;
      case 'Trash':
        return <Trash size={16} color="#f43f5e" />;
      case 'ShieldCheck':
        return <ShieldCheck size={16} color="#fbbf24" />;
      default:
        return <Settings size={16} color="#818cf8" />;
    }
  };

  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({
      name: '',
      price: 100000,
      unit: 'phòng/tháng',
      icon: 'Settings',
      isActive: true,
      zoneId: targetZone ? targetZone.id : (selectedZoneFilter !== 'all' ? selectedZoneFilter : ''),
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingService(s);
    setFormData({
      name: s.name || '',
      price: s.price || 0,
      unit: s.unit || 'phòng/tháng',
      icon: s.icon || 'Settings',
      isActive: s.isActive !== false,
      zoneId: s.zoneId || (targetZone ? targetZone.id : ''),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa dịch vụ này?')) {
      try {
        setSaving(true);
        await serviceMgmtService.deleteService(id);
        if (setServices && Array.isArray(services)) {
          setServices(services.filter((s) => s.id !== id));
        }
        onRefresh?.();
      } catch (err) {
        alert('Lỗi xóa dịch vụ: ' + (err.response?.data?.message || err.message));
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        price: Number(formData.price),
        unit: formData.unit,
        icon: formData.icon || 'Settings',
        isActive: formData.isActive,
        zoneId: formData.zoneId ? formData.zoneId : (targetZone ? targetZone.id : null),
      };

      if (editingService) {
        const updated = await serviceMgmtService.updateService(editingService.id, payload);
        if (setServices && Array.isArray(services)) {
          setServices(services.map((s) => (s.id === editingService.id ? updated : s)));
        }
      } else {
        const created = await serviceMgmtService.createService(payload);
        if (setServices && Array.isArray(services)) {
          setServices([...services, created]);
        }
      }
      setIsModalOpen(false);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi lưu dịch vụ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const serviceList = Array.isArray(services) ? services : [];
  const filteredServices = serviceList.filter((s) => {
    if (targetZone) {
      return !s.zoneId || s.zoneId === targetZone.id;
    }
    if (selectedZoneFilter === 'all') return true;
    return !s.zoneId || s.zoneId === selectedZoneFilter;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <Settings size={24} color="#6366f1" />{' '}
            {targetZone ? `Quản Lý Dịch Vụ - ${targetZone.name}` : 'Quản Lý Dịch Vụ Phụ Phí Theo Khu'}
          </h2>
          <p className="page-subtitle">
            {targetZone
              ? `Thêm mới, sửa đơn giá và cấu hình dịch vụ Internet, giữ xe, rác... riêng cho ${targetZone.name}.`
              : 'Cấu hình đơn giá dịch vụ (Internet, giữ xe, rác, vệ sinh...) linh hoạt riêng cho từng khu vực hoặc toàn hệ thống.'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd} disabled={saving}>
          <Plus size={18} /> Thêm Dịch Vụ Mới
        </button>
      </div>

      {/* Zone Filter Tabs (chỉ hiện khi ở chế độ xem tổng quan không chọn targetZone cụ thể) */}
      {!targetZone && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${selectedZoneFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedZoneFilter('all')}
          >
            🌐 Tất cả các khu ({serviceList.length})
          </button>
          {zones.map((z) => {
            const count = serviceList.filter((s) => s.zoneId === z.id || !s.zoneId).length;
            return (
              <button
                key={z.id}
                className={`btn btn-sm ${selectedZoneFilter === z.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedZoneFilter(z.id)}
              >
                🏢 {z.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className="card-table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã Dịch Vụ</th>
              <th>Khu Vực Áp Dụng</th>
              <th>Tên Dịch Vụ</th>
              <th>Đơn Giá Dịch Vụ</th>
              <th>Đơn Vị Tính</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                  Chưa có dịch vụ nào phù hợp với bộ lọc khu vực. Nhấn "Thêm Dịch Vụ Mới" để bắt đầu.
                </td>
              </tr>
            ) : (
              filteredServices.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>
                      {s.id ? (s.id.length > 8 ? s.id.substring(0, 8).toUpperCase() : s.id) : ''}
                    </strong>
                  </td>
                  <td>
                    <span className="status-pill occupied" style={{ background: s.zoneId ? '#3b82f620' : '#8b5cf620', color: s.zoneId ? '#60a5fa' : '#c084fc' }}>
                      {s.zoneName || (s.zoneId ? 'Khu vực cụ thể' : '🌐 Tất cả các khu')}
                    </span>
                  </td>
                  <td>
                    <div
                      style={{
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {renderIcon(s.icon)}
                      <span>{s.name}</span>
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: '#34d399' }}>{formatVND(s.price)}</strong>
                  </td>
                  <td>
                    <span className="status-pill vacant">{s.unit}</span>
                  </td>
                  <td>
                    {s.isActive !== false ? (
                      <span className="status-pill active">Hoạt động</span>
                    ) : (
                      <span className="status-pill expired">Tạm dừng</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        title="Sửa đơn giá"
                        onClick={() => handleOpenEdit(s)}
                        disabled={saving}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        title="Xóa dịch vụ"
                        onClick={() => handleDelete(s.id)}
                        disabled={saving}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingService ? 'Chỉnh Sửa Dịch Vụ' : 'Thêm Dịch Vụ Mới'}
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>
                X
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên Dịch Vụ</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="VD: Internet Wi-Fi, Giữ xe..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Khu Vực Áp Dụng</label>
                  <select
                    className="form-control"
                    value={formData.zoneId || ''}
                    onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                  >
                    <option value="">🌐 Tất cả các khu (Áp dụng chung)</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        🏢 {z.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Đơn Giá (VND)</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      step="5000"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Đơn Vị Tính</label>
                    <select
                      className="form-control"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="phòng/tháng">phòng/tháng</option>
                      <option value="người/tháng">người/tháng</option>
                      <option value="xe/tháng">xe/tháng</option>
                      <option value="lần">lần</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Biểu Tượng (Icon)</label>
                    <select
                      className="form-control"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    >
                      <option value="Settings">⚙️ Cấu hình chung</option>
                      <option value="Wifi">📶 Internet / Wi-Fi</option>
                      <option value="Bike">🛵 Giữ xe</option>
                      <option value="Trash">🗑️ Rác / Vệ sinh</option>
                      <option value="ShieldCheck">🛡️ Bảo vệ / An ninh</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Trạng Thái</label>
                    <select
                      className="form-control"
                      value={formData.isActive ? 'true' : 'false'}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.value === 'true' })
                      }
                    >
                      <option value="true">Đang hoạt động</option>
                      <option value="false">Tạm dừng cung cấp</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" size={16} /> : 'Lưu Dịch Vụ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

