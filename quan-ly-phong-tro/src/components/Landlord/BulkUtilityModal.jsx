import React, { useState, useMemo, useRef } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  Info, 
  Calendar,
  CheckCircle,
  Clock
} from 'lucide-react';
import { 
  formatVND, 
  exportUtilityTemplateExcel, 
  parseUtilityExcel 
} from '../../utils/formatters';
import { utilityService } from '../../services';

export const BulkUtilityModal = ({ 
  isOpen, 
  onClose, 
  rooms = [], 
  zones = [], 
  currentRate = { elecPrice: 3500, waterPrice: 18000 }, 
  onSuccess 
}) => {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [parsingError, setParsingError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const fileInputRef = useRef(null);

  const elecPrice = currentRate?.elecPrice || 3500;
  const waterPrice = currentRate?.waterPrice || 18000;

  // Xử lý tải file mẫu Excel
  const handleDownloadTemplate = () => {
    exportUtilityTemplateExcel(rooms, zones, month, selectedZoneId);
  };

  // Xử lý khi chọn file Excel
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file) => {
    setUploadedFile(file);
    setParsingError('');
    setSubmitResult(null);
    setIsParsing(true);

    try {
      const rows = await parseUtilityExcel(file);
      setParsedRows(rows);
    } catch (err) {
      setParsingError(err.message || 'Lỗi khi đọc file Excel');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  // Cập nhật giá trị trực tiếp trên bảng preview
  const handleCellChange = (index, field, value) => {
    setParsedRows(prev => {
      const updated = [...prev];
      const numVal = value === '' ? null : Number(value);
      updated[index] = {
        ...updated[index],
        [field]: isNaN(numVal) ? value : numVal
      };
      return updated;
    });
  };

  // Đánh giá dữ liệu và tính toán
  const evaluatedRows = useMemo(() => {
    return parsedRows.map(row => {
      // Tìm phòng theo RoomId ẩn hoặc Số phòng + Khu trọ
      const matchedRoom = rooms.find(r => {
        if (row.roomId && (r.id === row.roomId || String(r.id).toLowerCase() === String(row.roomId).toLowerCase())) return true;
        const sameNum = String(r.roomNumber || r.RoomNumber || '').trim().toLowerCase() === String(row.roomNumber || '').trim().toLowerCase();
        if (!sameNum) return false;
        if (!row.zoneName) return true;
        const z = zones.find(zone => (zone.id || zone.Id) === (r.zoneId || r.ZoneId));
        return (z?.name || r.zoneName || '').trim().toLowerCase() === String(row.zoneName).trim().toLowerCase();
      });

      const oldElec = matchedRoom ? Number(matchedRoom.elecMeter ?? matchedRoom.ElecMeter ?? 0) : Number(row.oldElec || 0);
      const oldWater = matchedRoom ? Number(matchedRoom.waterMeter ?? matchedRoom.WaterMeter ?? 0) : Number(row.oldWater || 0);
      const newElec = row.newElec;
      const newWater = row.newWater;

      let status = 'valid';
      let message = 'Hợp lệ';

      if (!matchedRoom && !row.roomId) {
        status = 'error';
        message = 'Không tìm thấy phòng tương ứng';
      } else if (newElec === null || newElec === undefined || newWater === null || newWater === undefined) {
        status = 'warning';
        message = 'Chưa nhập đủ chỉ số mới';
      } else if (newElec < oldElec) {
        status = 'error';
        message = `Số điện mới (${newElec}) nhỏ hơn số cũ (${oldElec})`;
      } else if (newWater < oldWater) {
        status = 'error';
        message = `Số nước mới (${newWater}) nhỏ hơn số cũ (${oldWater})`;
      }

      const elecUsed = (newElec !== null && newElec >= oldElec) ? (newElec - oldElec) : 0;
      const waterUsed = (newWater !== null && newWater >= oldWater) ? (newWater - oldWater) : 0;
      const elecCost = elecUsed * elecPrice;
      const waterCost = waterUsed * waterPrice;
      const totalCost = elecCost + waterCost;

      return {
        ...row,
        matchedRoom,
        oldElec,
        oldWater,
        elecUsed,
        waterUsed,
        elecCost,
        waterCost,
        totalCost,
        status,
        message
      };
    });
  }, [parsedRows, rooms, zones, elecPrice, waterPrice]);

  const validCount = evaluatedRows.filter(r => r.status === 'valid').length;
  const errorCount = evaluatedRows.filter(r => r.status === 'error').length;
  const warningCount = evaluatedRows.filter(r => r.status === 'warning').length;
  const totalEstimatedCost = evaluatedRows
    .filter(r => r.status === 'valid')
    .reduce((sum, r) => sum + r.totalCost, 0);

  // Gửi dữ liệu hàng loạt lên Server
  const handleSubmit = async () => {
    const validItems = evaluatedRows.filter(r => r.status === 'valid');
    if (validItems.length === 0) {
      alert('Không có dòng dữ liệu hợp lệ nào để ghi nhận.');
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    const payload = {
      month: month,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      items: validItems.map(item => ({
        roomId: item.matchedRoom?.id || item.roomId || null,
        roomNumber: item.roomNumber || item.matchedRoom?.roomNumber || null,
        zoneName: item.zoneName || null,
        newElec: Number(item.newElec),
        newWater: Number(item.newWater),
        note: item.note || null
      }))
    };

    try {
      const res = await utilityService.bulkRecord(payload);
      setSubmitResult(res);
      onSuccess?.();
    } catch (err) {
      alert('Lỗi khi chốt điện nước hàng loạt: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setUploadedFile(null);
    setParsedRows([]);
    setParsingError('');
    setSubmitResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Guard nằm sau tất cả hooks
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: 960, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER */}
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '17px', margin: 0 }}>Nhập Excel Điện Nước & Lập Hóa Đơn Hàng Loạt</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Tải file mẫu, nhập số điện nước mới và hệ thống sẽ tự động tính toán, tạo hóa đơn cho toàn bộ khu trọ
              </p>
            </div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          
          {/* THÔNG TIN CHỐT SỐ */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 14, 
            background: 'var(--bg-secondary, rgba(255,255,255,0.03))', 
            padding: 14, 
            borderRadius: 10, 
            border: '1px solid var(--border-color)',
            marginBottom: 18
          }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={13} color="#3b82f6" /> Tháng Chốt Điện Nước *
              </label>
              <input 
                type="month" 
                className="form-control" 
                value={month} 
                onChange={(e) => setMonth(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={13} color="#f59e0b" /> Hạn Nộp Hóa Đơn *
              </label>
              <input 
                type="date" 
                className="form-control" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12 }}>Lọc Khu Trọ (Tùy chọn)</label>
              <select 
                className="form-control" 
                value={selectedZoneId} 
                onChange={(e) => setSelectedZoneId(e.target.value)}
              >
                <option value="">-- Tất cả khu trọ --</option>
                {zones.map(z => (
                  <option key={z.id || z.Id} value={z.id || z.Id}>{z.name || z.Name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* KẾT QUẢ XỬ LÝ (NẾU ĐÃ GỬI THÀNH CÔNG) */}
          {submitResult && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: 10,
              padding: 16,
              marginBottom: 18
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 700, fontSize: 15 }}>
                <CheckCircle size={20} /> Chốt Điện Nước & Xuất Hóa Đơn Thành Công!
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 12 }}>
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px 12px', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng xử lý</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{submitResult.totalProcessed} phòng</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px 12px', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#10b981' }}>Thành công</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>{submitResult.successCount} phòng</div>
                </div>
                {submitResult.errorCount > 0 && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '8px 12px', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#ef4444' }}>Lỗi bỏ qua</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>{submitResult.errorCount}</div>
                  </div>
                )}
                <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '8px 12px', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#3b82f6' }}>Tổng tiền HĐ phát hành</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>{formatVND(submitResult.totalRevenue)}</div>
                </div>
              </div>

              {submitResult.errorMessages && submitResult.errorMessages.length > 0 && (
                <div style={{ marginTop: 12, padding: 10, background: 'rgba(239, 68, 68, 0.08)', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>Chi tiết các lỗi gặp phải:</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: '#ef4444' }}>
                    {submitResult.errorMessages.map((msg, idx) => (
                      <li key={idx}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* BƯỚC 1 & BƯỚC 2 */}
          {!submitResult && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              
              {/* BƯỚC 1: TẢI FILE MẪU */}
              <div style={{
                border: '1px dashed var(--border-color)',
                borderRadius: 10,
                padding: 16,
                background: 'var(--bg-card, rgba(255,255,255,0.02))',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13.5, marginBottom: 6 }}>
                    <span style={{ background: '#3b82f6', color: '#fff', width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>1</span>
                    Bước 1: Tải File Excel Mẫu
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                    File mẫu đã điền sẵn danh sách phòng, khách đại diện và <strong>chỉ số điện/nước cũ</strong> hiện tại của tháng {month}.
                  </p>
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleDownloadTemplate}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}
                >
                  <Download size={16} color="#3b82f6" /> Tải File Excel Mẫu (.xlsx)
                </button>
              </div>

              {/* BƯỚC 2: TẢI LÊN FILE EXCEL ĐÃ NHẬP */}
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{
                  border: '2px dashed #10b981',
                  borderRadius: 10,
                  padding: 16,
                  background: 'rgba(16, 185, 129, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".xlsx, .xls, .csv" 
                  style={{ display: 'none' }} 
                />
                <UploadCloud size={28} color="#10b981" style={{ marginBottom: 6 }} />
                <div style={{ fontWeight: 600, fontSize: 13, color: '#10b981' }}>
                  {uploadedFile ? uploadedFile.name : 'Bước 2: Tải lên file Excel đã nhập số mới'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {uploadedFile ? `Kích thước: ${(uploadedFile.size / 1024).toFixed(1)} KB (Nhấp để đổi file)` : 'Kéo thả file vào đây hoặc nhấp để chọn'}
                </div>
              </div>
            </div>
          )}

          {/* LỖI ĐỌC FILE */}
          {parsingError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              color: '#ef4444',
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} /> {parsingError}
            </div>
          )}

          {/* BẢNG XEM TRƯỚC VÀ XÁC NHẬN */}
          {evaluatedRows.length > 0 && !submitResult && (
            <div>
              {/* THANH THỐNG KÊ TỔNG QUAN */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                flexWrap: 'wrap', 
                gap: 10,
                background: 'var(--bg-secondary, rgba(255,255,255,0.04))',
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 12,
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12.5 }}>
                  <span>Tổng: <strong>{evaluatedRows.length}</strong> phòng</span>
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={14} /> Hợp lệ: <strong>{validCount}</strong>
                  </span>
                  {warningCount > 0 && (
                    <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={14} /> Thiếu số: <strong>{warningCount}</strong>
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={14} /> Lỗi: <strong>{errorCount}</strong>
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6' }}>
                  Ước tính tiền điện nước: <strong>{formatVND(totalEstimatedCost)}</strong>
                </div>
              </div>

              {/* BẢNG CHI TIẾT */}
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                <table className="table" style={{ width: '100%', fontSize: 12, margin: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card, #1e293b)', zIndex: 2 }}>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>STT</th>
                      <th>Phòng</th>
                      <th>Khu Trọ</th>
                      <th>Khách Thuê</th>
                      <th style={{ textAlign: 'right' }}>Điện (Cũ → Mới)</th>
                      <th style={{ textAlign: 'right' }}>Dùng (kWh)</th>
                      <th style={{ textAlign: 'right' }}>Nước (Cũ → Mới)</th>
                      <th style={{ textAlign: 'right' }}>Dùng (m³)</th>
                      <th style={{ textAlign: 'right' }}>Tiền Đ/N</th>
                      <th>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluatedRows.map((row, idx) => (
                      <tr 
                        key={idx} 
                        style={{ 
                          background: row.status === 'error' ? 'rgba(239, 68, 68, 0.05)' : (row.status === 'warning' ? 'rgba(245, 158, 11, 0.05)' : 'inherit')
                        }}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>P.{row.roomNumber || row.matchedRoom?.roomNumber}</td>
                        <td>{row.zoneName || row.matchedRoom?.zone?.name || 'Mặc định'}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{row.tenantName || 'Trống'}</td>
                        
                        {/* ĐIỆN CŨ & MỚI */}
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{row.oldElec}</span> →&nbsp;
                          <input 
                            type="number" 
                            value={row.newElec ?? ''} 
                            onChange={(e) => handleCellChange(idx, 'newElec', e.target.value)}
                            style={{ 
                              width: 65, 
                              padding: '2px 4px', 
                              borderRadius: 4, 
                              border: '1px solid var(--border-color)', 
                              background: 'var(--bg-input, rgba(0,0,0,0.2))',
                              color: 'inherit',
                              textAlign: 'right',
                              fontSize: 12
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>
                          {row.elecUsed} kWh
                        </td>

                        {/* NƯỚC CŨ & MỚI */}
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{row.oldWater}</span> →&nbsp;
                          <input 
                            type="number" 
                            value={row.newWater ?? ''} 
                            onChange={(e) => handleCellChange(idx, 'newWater', e.target.value)}
                            style={{ 
                              width: 60, 
                              padding: '2px 4px', 
                              borderRadius: 4, 
                              border: '1px solid var(--border-color)', 
                              background: 'var(--bg-input, rgba(0,0,0,0.2))',
                              color: 'inherit',
                              textAlign: 'right',
                              fontSize: 12
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#06b6d4' }}>
                          {row.waterUsed} m³
                        </td>

                        {/* TIỀN ĐIỆN NƯỚC */}
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatVND(row.totalCost)}
                        </td>

                        {/* TRẠNG THÁI */}
                        <td>
                          {row.status === 'valid' && (
                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                              <CheckCircle2 size={13} /> Sẵn sàng
                            </span>
                          )}
                          {row.status === 'warning' && (
                            <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5 }} title={row.message}>
                              <AlertTriangle size={13} /> {row.message}
                            </span>
                          )}
                          {row.status === 'error' && (
                            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5 }} title={row.message}>
                              <AlertCircle size={13} /> {row.message}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GHI CHÚ HƯỚNG DẪN */}
          <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Lưu ý:</strong> Đơn giá áp dụng: Điện <strong>{formatVND(elecPrice)}/kWh</strong>, Nước <strong>{formatVND(waterPrice)}/m³</strong>. Khi chốt số, hệ thống sẽ tự động gom các phí dịch vụ phòng (xe, wifi, rác...) và tiền phòng để tạo hoặc cập nhật Hóa đơn tương ứng trong tháng.
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="modal-footer" style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {uploadedFile && !submitResult ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={resetAll}>
              <RefreshCw size={14} /> Tải lại file khác
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {submitResult ? 'Đóng' : 'Hủy'}
            </button>

            {!submitResult && (
              <button 
                type="button" 
                className="btn btn-primary" 
                disabled={submitting || validCount === 0}
                onClick={handleSubmit}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {submitting ? (
                  <>⏳ Đang xử lý & tạo hóa đơn...</>
                ) : (
                  <>⚡ Xác Nhận & Tạo Hóa Đơn ({validCount} phòng)</>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};