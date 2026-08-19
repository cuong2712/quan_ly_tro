import React, { useState } from 'react';
import { Wrench, Plus, Upload, Trash2, Clock, CheckCircle, AlertTriangle, Image as ImageIcon, Eye } from 'lucide-react';
import { maintenanceService } from '../../services';

export const TenantRepair = ({ activeTenant, maintenanceRequests = [], setMaintenanceRequests, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const myRequests = Array.isArray(maintenanceRequests) ? maintenanceRequests : [];

  const [formData, setFormData] = useState({
    issueType: 'Máy lạnh',
    title: '',
    description: '',
    priority: 'Medium',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400',
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Dung lượng ảnh vượt quá 10MB. Vui lòng chọn ảnh nhỏ hơn.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const createFn = maintenanceService.createRequest || maintenanceService.create;
      const created = await createFn(formData);

      if (created && setMaintenanceRequests) {
        setMaintenanceRequests(prev => [created, ...(Array.isArray(prev) ? prev : [])]);
      }
      setIsModalOpen(false);
      alert('✅ Đã gửi yêu cầu báo hỏng & ảnh minh chứng tới Chủ trọ thành công!');
      setFormData({
        issueType: 'Máy lạnh',
        title: '',
        description: '',
        priority: 'Medium',
        imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400'
      });
      onRefresh?.();
    } catch (err) {
      alert('Lỗi tạo yêu cầu: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReq = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn hủy yêu cầu sửa chữa này?')) return;
    try {
      const updated = await maintenanceService.cancel(id);
      if (setMaintenanceRequests) {
        setMaintenanceRequests(prev => (Array.isArray(prev) ? prev : []).map(r => r.id === id ? { ...r, ...updated, status: 'Cancelled' } : r));
      }
      alert('✅ Đã hủy yêu cầu sửa chữa thành công!');
      onRefresh?.();
    } catch (err) {
      alert('Lỗi hủy yêu cầu: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Wrench size={24} color="#6366f1" /> Báo Sự Cố & Sửa Chữa Thiết Bị</h2>
          <p className="page-subtitle">Gửi ảnh chụp sự cố máy lạnh, điện nước... cho chủ trọ để sắp xếp thợ sửa chữa</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Tạo Báo Sửa Chữa Mới
        </button>
      </div>

      <div className="card-table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Loại Thiết Bị</th>
              <th>Tiêu Đề & Mô Tả Sự Cố</th>
              <th>Ảnh Minh Chứng</th>
              <th>Mức Độ Ưu Tiên</th>
              <th>Thợ Sửa Chữa</th>
              <th>Trạng Thái Tiến Độ</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {myRequests.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Bạn chưa có báo cáo sửa chữa nào. Nhấn "+ Tạo Báo Sửa Chữa Mới" để gửi cho chủ trọ.
                </td>
              </tr>
            ) : (
              myRequests.map((r) => {
                const img = r.imageUrl || r.ImageUrl;
                const statusLower = (r.status || '').toLowerCase();
                const isDone = statusLower === 'completed' || statusLower === 'resolved';
                const isDoing = statusLower === 'in_progress' || statusLower === 'inprogress';
                const isCancelled = statusLower === 'cancelled' || statusLower === 'canceled';

                return (
                  <tr key={r.id}>
                    <td><span className="status-pill vacant">{r.issueType}</span></td>
                    <td style={{ maxWidth: '280px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{r.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.description}</div>
                    </td>
                    <td>
                      {img ? (
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                          onClick={() => setViewingImage(img)}
                          title="Bấm để xem phóng to ảnh sự cố"
                        >
                          <img
                            src={img}
                            alt="Hỏng hóc"
                            style={{ width: 34, height: 34, borderRadius: 4, objectFit: 'cover', border: '1px solid var(--border-color)' }}
                          />
                          <span style={{ fontSize: 12, color: '#6366f1', textDecoration: 'underline' }}>Xem ảnh</span>
                        </div>
                      ) : 'Không có'}
                    </td>
                    <td>
                      <span className={`status-pill ${r.priority === 'High' ? 'overdue' : 'pending'}`}>
                        {r.priority === 'High' ? '🔥 Gấp' : 'Trung bình'}
                      </span>
                    </td>
                    <td>{r.assignedTo || 'Chưa phân công'}</td>
                    <td>
                      <span className={`status-pill ${isDone ? 'occupied' : isDoing ? 'renew_requested' : isCancelled ? 'overdue' : 'pending'}`}>
                        {isDone ? '✅ Đã sửa xong' : isDoing ? '⚙️ Đang sửa' : isCancelled ? '❌ Đã hủy' : '⏳ Chờ chủ trọ xử lý'}
                      </span>
                    </td>
                    <td>
                      {(!r.status || statusLower === 'pending') && (
                        <button className="btn btn-sm btn-danger" onClick={() => handleCancelReq(r.id)}>
                          <Trash2 size={14} /> Hủy Yêu Cầu
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tạo Báo Sự Cố Mới */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">🔧 Báo Sự Cố Thiết Bị Mới</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Loại Thiết Bị Hỏng *</label>
                    <select
                      className="form-control"
                      value={formData.issueType}
                      onChange={(e) => setFormData({ ...formData, issueType: e.target.value })}
                    >
                      <option value="Máy lạnh">Máy lạnh</option>
                      <option value="Vòi nước / Bồn rửa">Vòi nước / Bồn rửa</option>
                      <option value="Hệ thống Điện / Đèn">Hệ thống Điện / Đèn</option>
                      <option value="Cửa / Khóa phòng">Cửa / Khóa phòng</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mức Độ Ưu Tiên *</label>
                    <select
                      className="form-control"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="Medium">Trung bình</option>
                      <option value="High">🔥 Gấp / Mức độ cao</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tiêu Đề Tóm Tắt Sự Cố *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="VD: Máy lạnh kêu to và không mát..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mô Tả Chi Tiết Tình Trạng *</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    required
                    placeholder="Mô tả hiện tượng hỏng hóc, vị trí để thợ dễ xử lý..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Tải Ảnh Từ Thiết Bị */}
                <div className="form-group">
                  <label className="form-label">Tải Ảnh Chụp Minh Chứng Hỏng Hóc *</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control"
                    onChange={handleFileChange}
                    style={{ fontSize: '13px', cursor: 'pointer' }}
                  />
                  <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Chọn ảnh trực tiếp từ điện thoại hoặc máy tính
                  </small>

                  {/* Preview Box */}
                  {formData.imageUrl && (
                    <div style={{ marginTop: '10px', textAlign: 'center', background: 'var(--bg-dark)', padding: '10px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <ImageIcon size={14} /> Xem trước ảnh sự cố sẽ gửi Chủ trọ:
                      </div>
                      <img
                        src={formData.imageUrl}
                        alt="Ảnh minh chứng sự cố"
                        style={{ maxHeight: '140px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? '⏳ Đang gửi...' : 'Gửi Báo Sửa Chữa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Phóng To Ảnh */}
      {viewingImage && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 550, textAlign: 'center' }}>
            <div className="modal-header">
              <h3 className="modal-title">🖼️ Ảnh Minh Chứng Hỏng Hóc</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewingImage(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px' }}>
              <img src={viewingImage} alt="Phóng to ảnh hỏng" style={{ maxHeight: '420px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain' }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewingImage(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
