import React, { useState } from 'react';
import { Wrench, CheckCircle, Clock, XCircle, UserCheck, AlertTriangle, Eye } from 'lucide-react';
import { maintenanceService } from '../../services';
import { Pagination } from '../Common/Pagination';

export const MaintenanceMgmt = ({ maintenanceRequests = [], setMaintenanceRequests, rooms = [], onRefresh }) => {
  const [selectedReq, setSelectedReq] = useState(null);
  const [assignedName, setAssignedName] = useState('');
  const [statusVal, setStatusVal] = useState('In_Progress');
  const [noteVal, setNoteVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  const totalPages = Math.ceil(maintenanceRequests.length / pageSize);
  const paginatedRequests = maintenanceRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenAssignModal = (req) => {
    setSelectedReq(req);
    setAssignedName(req.assignedTo || 'Thợ sửa chữa');
    setStatusVal(req.status || 'In_Progress');
    setNoteVal(req.completionNote || '');
  };

  const handleUpdateProgress = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    setSaving(true);
    try {
      const payload = {
        status: statusVal,
        assignedTo: assignedName,
        completionNote: noteVal,
      };

      const updated = await maintenanceService.update(selectedReq.id, payload);
      setMaintenanceRequests(maintenanceRequests.map(r => r.id === selectedReq.id ? { ...r, ...updated } : r));
      setSelectedReq(null);
      alert('✅ Đã cập nhật tiến độ sửa chữa thành công!');
      onRefresh?.();
    } catch (err) {
      alert('Lỗi cập nhật bảo trì: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Wrench size={24} color="#6366f1" /> Quản Lý Bảo Trì & Sửa Chữa</h2>
          <p className="page-subtitle">Tiếp nhận báo sự cố kèm ảnh từ người thuê, phân công thợ và cập nhật tiến độ</p>
        </div>
      </div>

      <div className="card-table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Phòng</th>
              <th>Khách Báo</th>
              <th>Loại Sự Cố & Tiêu Đề</th>
              <th>Ảnh Sự Cố</th>
              <th>Độ Ưu Tiên</th>
              <th>Người Xử Lý</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {maintenanceRequests.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Không có yêu cầu bảo trì hỏng hóc nào.
                </td>
              </tr>
            ) : (
              paginatedRequests.map((r) => {
                const img = r.imageUrl || r.image || r.ImageUrl;
                const statusLower = (r.status || '').toLowerCase();
                const isDone = statusLower === 'completed' || statusLower === 'resolved';
                const isDoing = statusLower === 'in_progress' || statusLower === 'inprogress';

                return (
                  <tr key={r.id}>
                    <td><span className="status-pill vacant">Phòng {r.roomNumber || r.roomId}</span></td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{r.tenantName || 'Khách thuê'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.tenantPhone}</div>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--primary)' }}>[{r.issueType}] {r.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.description}</div>
                    </td>
                    <td>
                      {img ? (
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                          onClick={() => setViewingImage(img)}
                          title="Bấm để xem phóng to ảnh hỏng hóc"
                        >
                          <img
                            src={img}
                            alt="Ảnh sự cố"
                            style={{ width: 34, height: 34, borderRadius: 4, objectFit: 'cover', border: '1px solid var(--border-color)' }}
                          />
                          <span style={{ fontSize: 12, color: '#6366f1', textDecoration: 'underline' }}>Xem ảnh</span>
                        </div>
                      ) : 'Không có'}
                    </td>
                    <td>
                      <span className={`status-pill ${r.priority === 'High' ? 'overdue' : 'pending'}`}>
                        {r.priority === 'High' ? '🔥 Cao' : 'Trung bình'}
                      </span>
                    </td>
                    <td>{r.assignedTo || 'Chưa phân công'}</td>
                    <td>
                      <span className={`status-pill ${isDone ? 'occupied' : isDoing ? 'renew_requested' : 'vacant'}`}>
                        {isDone ? '✅ Hoàn thành' : isDoing ? '⚙️ Đang sửa' : '⏳ Chờ tiếp nhận'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => handleOpenAssignModal(r)}>
                        Phân Công & Tiến Độ
                      </button>
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
          totalItems={maintenanceRequests.length}
          pageSize={pageSize}
        />
      </div>

      {/* Progress Modal */}
      {selectedReq && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">🛠️ Xử Lý Yêu Cầu Sửa Chữa</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setSelectedReq(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateProgress}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-dark)', padding: '12px 14px', borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                    Phòng {selectedReq.roomNumber} - {selectedReq.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {selectedReq.description}
                  </div>
                  {(selectedReq.imageUrl || selectedReq.ImageUrl) && (
                    <div style={{ marginTop: 8 }}>
                      <img
                        src={selectedReq.imageUrl || selectedReq.ImageUrl}
                        alt="Ảnh báo hỏng"
                        style={{ maxHeight: 120, borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border-color)' }}
                        onClick={() => setViewingImage(selectedReq.imageUrl || selectedReq.ImageUrl)}
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Phân công người xử lý (Thợ / Kỹ thuật) *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="VD: Thợ điện Nguyễn Văn A"
                    value={assignedName}
                    onChange={(e) => setAssignedName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Trạng thái tiến độ *</label>
                  <select
                    className="form-control"
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                  >
                    <option value="In_Progress">⚙️ Đang tiến hành sửa chữa</option>
                    <option value="Completed">✅ Đã hoàn thành sửa chữa</option>
                    <option value="Cancelled">❌ Hủy yêu cầu</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú kết quả xử lý (Tùy chọn)</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="VD: Đã thay linh kiện mới ngày 15/08..."
                    value={noteVal}
                    onChange={(e) => setNoteVal(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedReq(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Đang lưu...' : 'Lưu Tiến Độ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
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
