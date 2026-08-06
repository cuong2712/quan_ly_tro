import React, { useState } from 'react';
import { Settings, Plus, Edit, Trash2, Wifi, Bike, Trash, ShieldCheck } from 'lucide-react';
import { formatVND } from '../../utils/formatters';

export const ServiceMgmt = ({ services, setServices }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    price: 100000,
    unit: 'phòng/tháng',
  });

  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({ name: '', price: 100000, unit: 'phòng/tháng' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingService(s);
    setFormData({ name: s.name, price: s.price, unit: s.unit });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa dịch vụ này?')) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingService) {
      setServices(services.map(s => s.id === editingService.id ? { ...s, ...formData } : s));
    } else {
      const newService = {
        id: `S00${services.length + 1}`,
        ...formData,
        icon: 'Settings',
      };
      setServices([...services, newService]);
    }
    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Settings size={24} color="#6366f1" /> Quản Lý Dịch Vụ Phụ Phí</h2>
          <p className="page-subtitle">Thêm mới, sửa đơn giá và cấu hình dịch vụ Internet, giữ xe, rác, vệ sinh...</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Thêm Dịch Vụ Mới
        </button>
      </div>

      <div className="card-table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã Dịch Vụ</th>
              <th>Tên Dịch Vụ</th>
              <th>Đơn Giá Dịch Vụ</th>
              <th>Đơn Vị Tính</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.id}</strong></td>
                <td>
                  <div style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={16} color="#818cf8" />
                    <span>{s.name}</span>
                  </div>
                </td>
                <td><strong style={{ color: '#34d399' }}>{formatVND(s.price)}</strong></td>
                <td><span className="status-pill vacant">{s.unit}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm btn-secondary" title="Sửa đơn giá" onClick={() => handleOpenEdit(s)}>
                      <Edit size={14} />
                    </button>
                    <button className="btn btn-sm btn-danger" title="Xóa dịch vụ" onClick={() => handleDelete(s.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingService ? 'Chỉnh Sửa Dịch Vụ' : 'Thêm Dịch Vụ Mới'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>X</button>
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

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Đơn Giá (VND)</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      step="10000"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
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
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu Dịch Vụ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
