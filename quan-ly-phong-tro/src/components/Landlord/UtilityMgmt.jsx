import React, { useState } from 'react';
import { Zap, Droplet, Plus, Edit, Settings, History, Calculator } from 'lucide-react';
import { formatVND, formatDate } from '../../utils/formatters';
import { utilityService } from '../../services';
import { Pagination } from '../Common/Pagination';

export const UtilityMgmt = ({ rooms = [], setRooms, zones = [], utilityLogs = [], setUtilityLogs, utilityRates = [], setUtilityRates, onRefresh }) => {
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  const totalPages = Math.ceil(utilityLogs.length / pageSize);
  const paginatedLogs = utilityLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const currentRate = utilityRates[0] || { elecPrice: 3500, waterPrice: 18000 };

  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || '');
  const [elecNew, setElecNew] = useState(100);
  const [waterNew, setWaterNew] = useState(10);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const [tempRates, setTempRates] = useState({
    elecPrice: currentRate.elecPrice || 3500,
    waterPrice: currentRate.waterPrice || 18000,
  });

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const elecUsed = selectedRoom ? Math.max(0, elecNew - selectedRoom.elecMeter) : 0;
  const waterUsed = selectedRoom ? Math.max(0, waterNew - selectedRoom.waterMeter) : 0;
  const elecCost = elecUsed * currentRate.elecPrice;
  const waterCost = waterUsed * currentRate.waterPrice;

  const handleOpenRecord = () => {
    const initialZone = zones[0] || null;
    const zId = initialZone?.id || '';
    setSelectedZoneId(zId);
    const zoneRooms = rooms.filter(r => !zId || r.zoneId === zId || r.ZoneId === zId);
    const room = zoneRooms[0] || rooms[0];
    if (room) {
      setSelectedRoomId(room.id);
      setElecNew(room.elecMeter + 10);
      setWaterNew(room.waterMeter + 2);
    } else {
      setSelectedRoomId('');
    }
    setIsRecordModalOpen(true);
  };

  const handleSaveMeterReading = async (e) => {
    e.preventDefault();
    if (!selectedRoom) {
      alert('Vui lòng chọn phòng để chốt số điện nước');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        roomId: selectedRoom.id,
        month: month,
        newElec: Number(elecNew),
        newWater: Number(waterNew),
      };

      const newLog = await utilityService.record(payload);
      setUtilityLogs([newLog, ...utilityLogs]);

      setRooms(rooms.map(r => r.id === selectedRoom.id ? {
        ...r,
        elecMeter: Number(elecNew),
        waterMeter: Number(waterNew),
      } : r));

      setIsRecordModalOpen(false);
      alert(`✅ Đã chốt chỉ số điện nước & TỰ ĐỘNG XUẤT HÓA ĐƠN cho Phòng ${selectedRoom.roomNumber} thành công!`);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi chốt số điện nước: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRates = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        elecPrice: Number(tempRates.elecPrice),
        waterPrice: Number(tempRates.waterPrice),
      };
      const updated = await utilityService.updateRate(payload);
      setUtilityRates([updated]);
      setIsRateModalOpen(false);
      alert('✅ Đã cập nhật đơn giá điện nước thành công!');
      onRefresh?.();
    } catch (err) {
      alert('Lỗi cập nhật đơn giá: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Zap size={24} color="#f59e0b" /> Quản Lý Điện Nước</h2>
          <p className="page-subtitle">Nhập chỉ số điện nước hàng tháng, thay đổi đơn giá và tự động tính tiền</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => { setTempRates({ elecPrice: currentRate.elecPrice, waterPrice: currentRate.waterPrice }); setIsRateModalOpen(true); }}>
            <Settings size={18} /> Đơn Giá: {formatVND(currentRate.elecPrice)}/kWh | {formatVND(currentRate.waterPrice)}/m³
          </button>
          <button className="btn btn-primary" onClick={handleOpenRecord}>
            <Plus size={18} /> Nhập Chỉ Số Mới
          </button>
        </div>
      </div>

      <div className="card-table-container">
        <div className="table-toolbar">
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
            <History size={18} style={{ display: 'inline', marginRight: '6px' }} /> Lịch Sử Chốt Số Điện Nước
          </h3>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Kỳ Tháng</th>
              <th>Phòng</th>
              <th>Số Điện (Cũ → Mới)</th>
              <th>Số Nước (Cũ → Mới)</th>
              <th>Tiền Điện</th>
              <th>Tiền Nước</th>
              <th>Tổng Tiền Điện Nước</th>
              <th>Ngày Chốt</th>
            </tr>
          </thead>
          <tbody>
            {utilityLogs.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Chưa có lịch sử chốt số điện nước nào. Vui lòng bấm <strong>"+ Chốt Số Điện Nước Mới"</strong>!
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => (
                <tr key={log.id}>
                  <td><strong>Tháng {log.month}</strong></td>
                  <td><span className="status-pill occupied">Phòng {log.roomNumber || log.roomId}</span></td>
                  <td>{log.oldElec} kWh → <strong>{log.newElec} kWh</strong> ({log.elecUsed} kWh)</td>
                  <td>{log.oldWater} m³ → <strong>{log.newWater} m³</strong> ({log.waterUsed} m³)</td>
                  <td>{formatVND(log.elecCost)}</td>
                  <td>{formatVND(log.waterCost)}</td>
                  <td><strong style={{ color: '#34d399' }}>{formatVND(log.elecCost + log.waterCost)}</strong></td>
                  <td>{formatDate(log.recordedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={utilityLogs.length}
          pageSize={pageSize}
        />
      </div>

      {/* Record Modal */}
      {isRecordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">⚡ Ghi Chốt Số Điện Nước Mới</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsRecordModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveMeterReading}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">1. Chọn Khu Trọ *</label>
                  <select
                    className="form-control"
                    required
                    value={selectedZoneId}
                    onChange={(e) => {
                      const zId = e.target.value;
                      setSelectedZoneId(zId);
                      const filteredRooms = rooms.filter(r => !zId || r.zoneId === zId || r.ZoneId === zId);
                      const firstRoom = filteredRooms[0];
                      if (firstRoom) {
                        setSelectedRoomId(firstRoom.id);
                        setElecNew(firstRoom.elecMeter + 10);
                        setWaterNew(firstRoom.waterMeter + 2);
                      } else {
                        setSelectedRoomId('');
                      }
                    }}
                  >
                    <option value="">-- Tất cả khu trọ --</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name} ({z.address})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">2. Chọn Phòng Chốt Số *</label>
                  <select
                    className="form-control"
                    required
                    value={selectedRoomId}
                    onChange={(e) => {
                      const rId = e.target.value;
                      setSelectedRoomId(rId);
                      const r = rooms.find(rm => rm.id === rId);
                      if (r) {
                        setElecNew(r.elecMeter + 10);
                        setWaterNew(r.waterMeter + 2);
                      }
                    }}
                  >
                    <option value="">-- Chọn phòng chốt số --</option>
                    {rooms
                      .filter(r => !selectedZoneId || r.zoneId === selectedZoneId || r.ZoneId === selectedZoneId)
                      .map(r => (
                        <option key={r.id} value={r.id}>
                          Phòng {r.roomNumber} (Chỉ số điện cũ: {r.elecMeter} | Chỉ số nước cũ: {r.waterMeter})
                        </option>
                      ))}
                  </select>
                  {rooms.filter(r => !selectedZoneId || r.zoneId === selectedZoneId || r.ZoneId === selectedZoneId).length === 0 && (
                    <small style={{ color: '#ef4444', marginTop: 4, display: 'block' }}>
                      Khu trọ này chưa có phòng nào. Vui lòng chọn khu trọ khác hoặc tạo thêm phòng.
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Kỳ tháng *</label>
                  <input
                    type="month"
                    className="form-control"
                    required
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Chỉ số Điện mới (kWh) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      min={selectedRoom?.elecMeter || 0}
                      value={elecNew}
                      onChange={(e) => setElecNew(e.target.value)}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Dùng: <strong>{elecUsed} kWh</strong> ({formatVND(elecCost)})
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Chỉ số Nước mới (m³) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      min={selectedRoom?.waterMeter || 0}
                      value={waterNew}
                      onChange={(e) => setWaterNew(e.target.value)}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Dùng: <strong>{waterUsed} m³</strong> ({formatVND(waterCost)})
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRecordModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Đang lưu...' : 'Lưu Chỉ Số'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rates Modal */}
      {isRateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">⚙️ Thay Đổi Đơn Giá Điện Nước</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsRateModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveRates}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Đơn giá Điện (VNĐ / kWh) *</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min="0"
                    value={tempRates.elecPrice}
                    onChange={(e) => setTempRates({ ...tempRates, elecPrice: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Đơn giá Nước (VNĐ / m³) *</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min="0"
                    value={tempRates.waterPrice}
                    onChange={(e) => setTempRates({ ...tempRates, waterPrice: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRateModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Đang lưu...' : 'Lưu Đơn Giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
