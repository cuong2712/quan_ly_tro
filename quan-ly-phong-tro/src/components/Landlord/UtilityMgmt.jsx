import React, { useState } from 'react';
import { Zap, Droplet, Plus, Edit, Settings, History, Calculator, AlertTriangle, CheckCircle, FileText, Filter, Trash2 } from 'lucide-react';
import { formatVND, formatDate } from '../../utils/formatters';
import { utilityService } from '../../services';
import { Pagination } from '../Common/Pagination';

export const UtilityMgmt = ({ rooms = [], setRooms, zones = [], invoices = [], setInvoices, utilityLogs = [], setUtilityLogs, utilityRates = [], setUtilityRates, onRefresh }) => {
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [roomFilterStatus, setRoomFilterStatus] = useState('all'); // 'all' | 'unbilled' | 'billed'
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

  const getInvoiceForRoom = (rId, rNum, m) => {
    if (!invoices || !Array.isArray(invoices) || invoices.length === 0) return null;
    const targetMonth = (m || '').trim();
    return invoices.find(inv => {
      const invRoomId = inv.roomId || inv.RoomId;
      const invRoomNum = inv.roomNumber || inv.RoomNumber;
      const invMonth = (inv.month || inv.Month || '').trim();

      const isRoomMatch = (rId && invRoomId && String(invRoomId).toLowerCase() === String(rId).toLowerCase()) ||
                          (rNum && invRoomNum && String(invRoomNum).toLowerCase() === String(rNum).toLowerCase());

      const isMonthMatch = invMonth === targetMonth ||
                           invMonth.startsWith(targetMonth) ||
                           targetMonth.startsWith(invMonth);

      return isRoomMatch && isMonthMatch;
    });
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const selectedRoomInvoice = selectedRoom ? getInvoiceForRoom(selectedRoom.id, selectedRoom.roomNumber, month) : null;
  const isSelectedRoomBilled = !!selectedRoomInvoice;

  const elecUsed = selectedRoom ? Math.max(0, elecNew - selectedRoom.elecMeter) : 0;
  const waterUsed = selectedRoom ? Math.max(0, waterNew - selectedRoom.waterMeter) : 0;
  const elecCost = elecUsed * currentRate.elecPrice;
  const waterCost = waterUsed * currentRate.waterPrice;

  const handleDeleteLog = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi chỉ số điện nước này? Đồng hồ của phòng sẽ được hoàn tác về số cũ.')) return;
    try {
      await utilityService.deleteLog(id);
      setUtilityLogs(utilityLogs.filter(l => l.id !== id));
      alert('✅ Đã xóa bản ghi chốt điện nước thành công!');
      onRefresh?.();
    } catch (err) {
      alert('Lỗi khi xóa bản ghi: ' + (err.response?.data?.message || err.message));
    }
  };

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
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {utilityLogs.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
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
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      title="Xóa bản ghi chốt số này"
                      onClick={() => handleDeleteLog(log.id)}
                      style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={14} /> Xóa
                    </button>
                  </td>
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
          <div className="modal-content" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="#f59e0b" /> Ghi Chỉ Số Điện Nước & Xuất Hóa Đơn
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsRecordModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveMeterReading}>
              <div className="modal-body">
                {/* 1. Chọn Kỳ Tháng */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>1. Kỳ Tháng Xuất Hóa Đơn *</label>
                  <input
                    type="month"
                    className="form-control"
                    required
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  />
                </div>

                {/* 2. Chọn Khu Trọ */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>2. Khu Trọ *</label>
                  <select
                    className="form-control"
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

                {/* 3. Chọn Phòng Chốt Số kèm Bộ lọc Trạng thái HĐ */}
                {(() => {
                  const zoneRooms = rooms.filter(r => !selectedZoneId || r.zoneId === selectedZoneId || r.ZoneId === selectedZoneId);
                  const unbilledRooms = zoneRooms.filter(r => !getInvoiceForRoom(r.id, r.roomNumber, month));
                  const billedRooms = zoneRooms.filter(r => !!getInvoiceForRoom(r.id, r.roomNumber, month));
                  const displayedRooms = roomFilterStatus === 'unbilled' 
                    ? unbilledRooms 
                    : roomFilterStatus === 'billed' 
                      ? billedRooms 
                      : zoneRooms;

                  return (
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>3. Chọn Phòng Chốt Số *</label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            type="button" 
                            className={`btn btn-sm ${roomFilterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                            onClick={() => setRoomFilterStatus('all')}
                          >
                            Tất cả ({zoneRooms.length})
                          </button>
                          <button 
                            type="button" 
                            className={`btn btn-sm ${roomFilterStatus === 'unbilled' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '11px', padding: '2px 8px', borderColor: '#f59e0b', color: roomFilterStatus === 'unbilled' ? '#fff' : '#f59e0b' }}
                            onClick={() => {
                              setRoomFilterStatus('unbilled');
                              if (unbilledRooms.length > 0 && !unbilledRooms.some(r => r.id === selectedRoomId)) {
                                setSelectedRoomId(unbilledRooms[0].id);
                                setElecNew(unbilledRooms[0].elecMeter + 10);
                                setWaterNew(unbilledRooms[0].waterMeter + 2);
                              }
                            }}
                          >
                            ⏳ Chưa có HĐ ({unbilledRooms.length})
                          </button>
                          <button 
                            type="button" 
                            className={`btn btn-sm ${roomFilterStatus === 'billed' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '11px', padding: '2px 8px', borderColor: '#10b981', color: roomFilterStatus === 'billed' ? '#fff' : '#10b981' }}
                            onClick={() => {
                              setRoomFilterStatus('billed');
                              if (billedRooms.length > 0 && !billedRooms.some(r => r.id === selectedRoomId)) {
                                setSelectedRoomId(billedRooms[0].id);
                                setElecNew(billedRooms[0].elecMeter + 10);
                                setWaterNew(billedRooms[0].waterMeter + 2);
                              }
                            }}
                          >
                            ✅ Đã có HĐ ({billedRooms.length})
                          </button>
                        </div>
                      </div>

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
                        {displayedRooms.map(r => {
                          const inv = getInvoiceForRoom(r.id, r.roomNumber, month);
                          return (
                            <option key={r.id} value={r.id}>
                              {inv 
                                ? `✅ Phòng ${r.roomNumber} [ĐÃ CÓ HÓA ĐƠN THÁNG ${month}] - ${formatVND(inv.totalAmount)}`
                                : `⏳ Phòng ${r.roomNumber} [CHƯA TẠO HÓA ĐƠN THÁNG ${month}]`
                              }
                            </option>
                          );
                        })}
                      </select>

                      {displayedRooms.length === 0 && (
                        <small style={{ color: '#f59e0b', marginTop: 4, display: 'block' }}>
                          Không có phòng nào phù hợp với bộ lọc ({roomFilterStatus === 'unbilled' ? 'Tất cả các phòng đã được lập hóa đơn tháng này!' : 'Chưa có phòng nào'}).
                        </small>
                      )}
                    </div>
                  );
                })()}

                {/* 4. KHUNG CẢNH BÁO NHẬN BIẾT ĐÃ TẠO HÓA ĐƠN HAY CHƯA */}
                {selectedRoom && (
                  isSelectedRoomBilled ? (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      marginBottom: '14px',
                      fontSize: '12.5px'
                    }}>
                      <div style={{ color: '#d97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={15} /> Phòng {selectedRoom.roomNumber} ĐÃ CÓ hóa đơn Tháng {month}!
                      </div>
                      <div style={{ color: '#b45309', marginTop: '3px', fontSize: '12px' }}>
                        Mã HĐ: <strong>{selectedRoomInvoice.invoiceCode}</strong> • Tổng tiền: <strong>{formatVND(selectedRoomInvoice.totalAmount)}</strong> • Trạng thái: <strong>{(selectedRoomInvoice.status || '').toLowerCase() === 'paid' ? '✅ Đã trả' : '⏳ Chưa thanh toán'}</strong>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '3px', fontStyle: 'italic' }}>
                        ℹ️ Nếu tiếp tục lưu, hệ thống sẽ CẬP NHẬT lại số điện nước & giá trị của hóa đơn này.
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '14px',
                      color: '#10b981',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <CheckCircle size={14} /> <strong>Phòng {selectedRoom.roomNumber} CHƯA tạo hóa đơn Tháng {month}</strong>. Khi chốt số sẽ tự động xuất hóa đơn mới!
                    </div>
                  )
                )}

                {/* 5. Nhập Chỉ Số Điện Nước Mới */}
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
                      Số cũ: <strong>{selectedRoom?.elecMeter || 0}</strong> • Dùng: <strong>{elecUsed} kWh</strong> ({formatVND(elecCost)})
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
                      Số cũ: <strong>{selectedRoom?.waterMeter || 0}</strong> • Dùng: <strong>{waterUsed} m³</strong> ({formatVND(waterCost)})
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRecordModalOpen(false)}>Hủy</button>
                <button 
                  type="submit" 
                  className={`btn ${isSelectedRoomBilled ? 'btn-secondary' : 'btn-primary'}`} 
                  style={isSelectedRoomBilled ? { background: '#f59e0b', color: '#fff', borderColor: '#f59e0b' } : {}}
                  disabled={saving || !selectedRoom}
                >
                  {saving ? '⏳ Đang lưu...' : (isSelectedRoomBilled ? '🔄 Cập Nhật Lại Chỉ Số & Hóa Đơn' : '⚡ Chốt Điện Nước & Xuất Hóa Đơn')}
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
