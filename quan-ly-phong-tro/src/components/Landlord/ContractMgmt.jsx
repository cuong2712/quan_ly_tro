import React, { useState } from 'react';
import { FileText, Plus, Search, Edit, Trash2, Printer, CheckCircle, Clock, Upload, Shield, Building2, UserX, AlertTriangle } from 'lucide-react';
import { formatVND, formatDate, exportToPDF } from '../../utils/formatters';
import { contractService } from '../../services';
import { Pagination } from '../Common/Pagination';

export const ContractMgmt = ({ contracts = [], setContracts, rooms = [], tenants = [], zones = [], onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZoneId, setFilterZoneId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'expired' | 'liquidated' | 'uncontracted'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [viewingContract, setViewingContract] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState('');

  const [formData, setFormData] = useState({
    contractCode: '',
    roomId: '',
    tenantId: '',
    startDate: '',
    endDate: '',
    rentAmount: 4200000,
    deposit: 4200000,
    paymentTermDay: 5,
    status: 'active',
    terms: 'Bên B giữ vệ sinh chung, không gây ồn sau 22h, thanh toán tiền nhà trước ngày 05 hàng tháng.',
  });

  // ─── 1. Tính toán Trạng thái & Thống kê ──────────────────────
  const getContractStatusInfo = (c) => {
    const rawStatus = (c.status || '').toLowerCase();
    
    if (rawStatus === 'liquidated') {
      return { label: 'Đã thanh lý', className: 'liquidated', isActive: false, type: 'liquidated' };
    }
    
    if (c.endDate) {
      const endDateObj = new Date(c.endDate);
      endDateObj.setHours(23, 59, 59, 999);
      const now = new Date();
      if (endDateObj < now) {
        return { label: 'Đã hết hạn', className: 'expired', isActive: false, type: 'expired' };
      }
    }

    if (rawStatus === 'expired') {
      return { label: 'Đã hết hạn', className: 'expired', isActive: false, type: 'expired' };
    }

    if (rawStatus === 'renewrequested' || rawStatus === 'renew_requested') {
      return { label: 'Chờ gia hạn', className: 'renew_requested', isActive: true, type: 'active' };
    }

    return { label: 'Đang hiệu lực', className: 'active', isActive: true, type: 'active' };
  };

  // Tập hợp tenantId đã có hợp đồng đang hiệu lực
  const activeContractTenantIds = new Set(
    contracts
      .filter(c => getContractStatusInfo(c).isActive)
      .map(c => c.tenantId || c.TenantProfileId || c.tenantProfileId)
  );

  // Danh sách khách thuê CHƯA CÓ HỢP ĐỒNG đang hiệu lực
  const uncontractedTenants = tenants.filter(t => !activeContractTenantIds.has(t.id));

  // Đếm các số liệu tổng quan
  let activeCount = 0;
  let expiredCount = 0;
  let liquidatedCount = 0;

  contracts.forEach(c => {
    const st = getContractStatusInfo(c).type;
    if (st === 'active') activeCount++;
    else if (st === 'expired') expiredCount++;
    else if (st === 'liquidated') liquidatedCount++;
  });

  // ─── 2. Lọc Hợp Đồng Theo Tìm Kiếm, Khu Trọ & Trạng Thái ─────
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredContracts = contracts.filter(c => {
    const room = rooms.find(r => r.id === c.roomId || r.id === c.RoomId);
    const tenant = tenants.find(t => t.id === c.tenantId || t.id === c.TenantProfileId || t.id === c.tenantProfileId);
    const tenantName = (tenant?.fullName || tenant?.name || c.tenantName || '').toLowerCase();
    const tenantPhone = (tenant?.phone || c.tenantPhone || '').toLowerCase();
    const code = (c.contractCode || '').toLowerCase();
    const roomNum = (room?.roomNumber || c.roomNumber || '').toLowerCase();
    
    // Tìm kiếm từ khóa (Mã HĐ, Tên khách, SĐT, Số phòng)
    const matchesSearch = !searchTerm ||
      code.includes(searchTerm.toLowerCase()) ||
      tenantName.includes(searchTerm.toLowerCase()) ||
      tenantPhone.includes(searchTerm.toLowerCase()) ||
      roomNum.includes(searchTerm.toLowerCase());

    // Lọc theo Khu trọ
    const matchesZone = filterZoneId === 'all' ||
      (room && (room.zoneId === filterZoneId || room.ZoneId === filterZoneId));

    // Lọc theo Trạng thái
    const stInfo = getContractStatusInfo(c);
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && stInfo.isActive) ||
      (filterStatus === 'expired' && stInfo.type === 'expired') ||
      (filterStatus === 'liquidated' && stInfo.type === 'liquidated');

    return matchesSearch && matchesZone && matchesStatus;
  });

  const totalPages = Math.ceil(filteredContracts.length / pageSize);
  const paginatedContracts = filteredContracts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ─── 3. Handlers Tạo / Sửa / Xóa / Gia Hạn ──────────────────
  const handleTenantChange = (tenantId) => {
    const selectedTenant = tenants.find(t => t.id === tenantId);
    const tenantRoomId = selectedTenant?.roomId || selectedTenant?.RoomId;
    const matchingRoom = rooms.find(r => r.id === tenantRoomId);
    const targetRoom = matchingRoom || (rooms.length > 0 ? rooms[0] : null);

    setFormData(prev => ({
      ...prev,
      tenantId,
      roomId: targetRoom?.id || prev.roomId,
      rentAmount: targetRoom?.price || prev.rentAmount,
      deposit: targetRoom?.price || prev.deposit,
      contractCode: targetRoom ? `HD-2026-${targetRoom.roomNumber}` : prev.contractCode
    }));
  };

  const handleRoomChange = (roomId) => {
    const selectedRoom = rooms.find(r => r.id === roomId);
    setFormData(prev => ({
      ...prev,
      roomId,
      rentAmount: selectedRoom?.price || prev.rentAmount,
      deposit: selectedRoom?.price || prev.deposit,
    }));
  };

  const currentTenantId = editingContract ? (editingContract.tenantId || editingContract.TenantProfileId) : null;
  const selectableTenants = editingContract
    ? tenants.filter(t => t.id === currentTenantId || !activeContractTenantIds.has(t.id))
    : uncontractedTenants;

  const handleOpenAddForTenant = (tenant) => {
    setEditingContract(null);
    const tenantRoomId = tenant?.roomId || tenant?.RoomId;
    const room = rooms.find(r => r.id === tenantRoomId) || rooms[0];
    const roomZoneId = room?.zoneId || room?.ZoneId || zones[0]?.id || '';
    setSelectedZoneId(roomZoneId);
    setFormData({
      contractCode: `HD-2026-${room?.roomNumber || 'R101'}`,
      roomId: room?.id || '',
      tenantId: tenant?.id || '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2027-07-28',
      rentAmount: room?.price || 4200000,
      deposit: room?.price || 4200000,
      paymentTermDay: 5,
      status: 'active',
      terms: 'Bên B giữ vệ sinh chung, không gây ồn sau 22h, thanh toán tiền nhà trước ngày 05 hàng tháng.',
    });
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingContract(null);
    const initialZone = zones[0] || null;
    const zoneId = initialZone?.id || '';
    setSelectedZoneId(zoneId);
    const zoneRooms = rooms.filter(r => !zoneId || r.zoneId === zoneId || r.ZoneId === zoneId);
    const tenant = selectableTenants[0] || null;
    const tenantRoomId = tenant?.roomId || tenant?.RoomId;
    const room = zoneRooms.find(r => r.id === tenantRoomId) || zoneRooms[0] || rooms[0];
    setFormData({
      contractCode: `HD-2026-${room?.roomNumber || 'R101'}`,
      roomId: room?.id || '',
      tenantId: tenant?.id || '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2027-07-28',
      rentAmount: room?.price || 4200000,
      deposit: room?.price || 4200000,
      paymentTermDay: 5,
      status: 'active',
      terms: 'Bên B giữ vệ sinh chung, không gây ồn sau 22h, thanh toán tiền nhà trước ngày 05 hàng tháng.',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingContract(c);
    const room = rooms.find(r => r.id === c.roomId);
    setSelectedZoneId(room?.zoneId || room?.ZoneId || zones[0]?.id || '');
    setFormData({ ...c });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa hợp đồng này?')) {
      try {
        await contractService.deleteContract(id);
        setContracts(contracts.filter(c => c.id !== id));
        alert('✅ Đã xóa hợp đồng thành công!');
        onRefresh?.();
      } catch (err) {
        alert('Lỗi xóa hợp đồng: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleLiquidate = async (id) => {
    if (confirm('Xác nhận thanh lý hợp đồng này? Trạng thái sẽ chuyển thành Đã thanh lý.')) {
      try {
        await contractService.terminate(id);
        setContracts(contracts.map(c => c.id === id ? { ...c, status: 'liquidated' } : c));
        alert('✅ Đã thanh lý hợp đồng thành công!');
        onRefresh?.();
      } catch (err) {
        alert('Lỗi thanh lý hợp đồng: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleRenew = (c) => {
    const monthsStr = prompt(`Gia hạn hợp đồng ${c.contractCode}.\nNhập số tháng muốn gia hạn (VD: 6 hoặc 12):`, '12');
    if (!monthsStr) return;
    const months = parseInt(monthsStr);
    if (isNaN(months) || months <= 0) { alert('Số tháng không hợp lệ'); return; }

    const oldEnd = new Date(c.endDate);
    oldEnd.setMonth(oldEnd.getMonth() + months);
    const newEndDateStr = oldEnd.toISOString().split('T')[0];

    try {
      if (contractService && contractService.renew) {
        contractService.renew(c.id, { extendMonths: months, newRentAmount: c.rentAmount });
      }
    } catch (e) { console.warn(e); }

    setContracts(contracts.map(item => item.id === c.id ? { ...item, endDate: newEndDateStr, status: 'active' } : item));
    alert(`✅ Đã gia hạn hợp đồng ${c.contractCode} thêm ${months} tháng đến ngày ${formatDate(newEndDateStr)}!`);
    onRefresh?.();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.tenantId) {
      alert('Vui lòng chọn khách thuê');
      return;
    }
    if (!formData.roomId) {
      alert('Vui lòng chọn phòng thuê');
      return;
    }

    if (!editingContract) {
      if (activeContractTenantIds.has(formData.tenantId)) {
        alert('Khách thuê này đã có hợp đồng đang hiệu lực! Không thể tạo thêm hợp đồng mới cho cùng một người.');
        return;
      }
    }

    const payload = {
      contractCode: formData.contractCode || `HD-2026-${formData.roomId}`,
      roomId: formData.roomId,
      tenantProfileId: formData.tenantId,
      tenantId: formData.tenantId,
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      endDate: formData.endDate || '2027-07-28',
      rentAmount: Number(formData.rentAmount || 0),
      deposit: Number(formData.deposit || 0),
      paymentTermDay: Number(formData.paymentTermDay || 5),
      terms: formData.terms || '',
    };

    let apiSuccess = false;
    try {
      if (contractService && contractService.createContract) {
        if (editingContract) {
          await contractService.updateContract(editingContract.id, payload);
        } else {
          await contractService.createContract(payload);
        }
        apiSuccess = true;
      }
    } catch (err) {
      console.warn('API save error, fallback to state update:', err);
    }

    if (editingContract) {
      setContracts(contracts.map(c => c.id === editingContract.id ? { ...c, ...formData, ...payload } : c));
    } else {
      const newContract = {
        id: `HD00${contracts.length + 1}`,
        ...formData,
        ...payload,
      };
      setContracts([...contracts, newContract]);
    }

    setIsModalOpen(false);
    if (apiSuccess) {
      onRefresh?.();
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title"><FileText size={24} color="#6366f1" /> Quản Lý Hợp Đồng Thuê Nhà</h2>
          <p className="page-subtitle">Tạo mới, gia hạn, thanh lý và in/xuất file PDF hợp đồng pháp lý</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Tạo Hợp Đồng Mới
        </button>
      </div>

      {/* 📊 THẺ THỐNG KÊ TỔNG QUAN HỢP ĐỒNG */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        
        <div
          className="card"
          onClick={() => setFilterStatus('all')}
          style={{
            padding: '16px', cursor: 'pointer', borderRadius: '12px',
            border: filterStatus === 'all' ? '2px solid #6366f1' : '1px solid var(--border-color)',
            background: 'var(--bg-card)', transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>📄 Tổng Hợp Đồng</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{contracts.length}</div>
        </div>

        <div
          className="card"
          onClick={() => setFilterStatus('active')}
          style={{
            padding: '16px', cursor: 'pointer', borderRadius: '12px',
            border: filterStatus === 'active' ? '2px solid #10b981' : '1px solid var(--border-color)',
            background: 'rgba(16,185,129,0.08)', transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>✅ Đang Hiệu Lực</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{activeCount}</div>
        </div>

        <div
          className="card"
          onClick={() => setFilterStatus('expired')}
          style={{
            padding: '16px', cursor: 'pointer', borderRadius: '12px',
            border: filterStatus === 'expired' ? '2px solid #ef4444' : '1px solid var(--border-color)',
            background: 'rgba(239,68,68,0.08)', transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>⏳ Đã / Sắp Hết Hạn</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{expiredCount}</div>
        </div>

        <div
          className="card"
          onClick={() => setFilterStatus('liquidated')}
          style={{
            padding: '16px', cursor: 'pointer', borderRadius: '12px',
            border: filterStatus === 'liquidated' ? '2px solid #6b7280' : '1px solid var(--border-color)',
            background: 'var(--bg-dark)', transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>🛑 Đã Thanh Lý</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-secondary)', marginTop: '4px' }}>{liquidatedCount}</div>
        </div>

        <div
          className="card"
          onClick={() => setFilterStatus('uncontracted')}
          style={{
            padding: '16px', cursor: 'pointer', borderRadius: '12px',
            border: filterStatus === 'uncontracted' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
            background: 'rgba(245,158,11,0.08)', transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700 }}>⚠️ Chưa Làm HĐ</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{uncontractedTenants.length} người</div>
        </div>

      </div>

      {/* 🔍 THANH BỘ LỌC NÂNG CAO (THEO TÊN, KHU TRỌ & TRẠNG THÁI) */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        
        {/* Lọc theo Từ khóa / Tên khách / Mã HĐ / Số phòng */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Tìm theo tên khách, SĐT, mã HĐ, số phòng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px', fontSize: '13px' }}
          />
        </div>

        {/* Lọc theo Khu trọ */}
        <div style={{ width: '220px' }}>
          <select
            className="form-control"
            value={filterZoneId}
            onChange={(e) => setFilterZoneId(e.target.value)}
            style={{ fontSize: '13px' }}
          >
            <option value="all">🏢 Tất cả khu trọ ({zones.length})</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>

        {/* Lọc theo Trạng thái hợp đồng */}
        <div style={{ width: '200px' }}>
          <select
            className="form-control"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ fontSize: '13px' }}
          >
            <option value="all">📋 Tất cả trạng thái</option>
            <option value="active">✅ Đang hiệu lực ({activeCount})</option>
            <option value="expired">⏳ Đã hết hạn ({expiredCount})</option>
            <option value="liquidated">🛑 Đã thanh lý ({liquidatedCount})</option>
            <option value="uncontracted">⚠️ Chưa có HĐ ({uncontractedTenants.length})</option>
          </select>
        </div>

      </div>

      {/* ⚠️ NẾU CHỌN TAB "CHƯA CÓ HỢP ĐỒNG" ➔ HIỂN THỊ DANH SÁCH KHÁCH THUÊ CẦN TẠO HĐ */}
      {filterStatus === 'uncontracted' ? (
        <div className="card-table-container">
          <div style={{ padding: '16px 20px', background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color="#f59e0b" /> Khách Thuê Chưa Có Hợp Đồng Đang Hiệu Lực ({uncontractedTenants.length} người)
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bấm nút "Tạo Hợp Đồng Ngay" để hoàn tất hồ sơ cho khách</span>
          </div>

          {uncontractedTenants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <CheckCircle size={40} color="#10b981" style={{ marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Tất cả khách thuê hiện tại đều đã có hợp đồng chính thức!</p>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tên Khách Thuê</th>
                  <th>Số Điện Thoại</th>
                  <th>Số CCCD</th>
                  <th>Phòng Hiện Ở</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {uncontractedTenants.map(t => {
                  const room = rooms.find(r => r.id === (t.roomId || t.RoomId));
                  return (
                    <tr key={t.id}>
                      <td><strong>{t.fullName || t.name}</strong></td>
                      <td>{t.phone}</td>
                      <td>{t.cccd || t.CCCD}</td>
                      <td>
                        <span className="status-pill occupied">
                          {room ? `Phòng ${room.roomNumber}` : 'Chưa xếp phòng'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleOpenAddForTenant(t)}
                          style={{ fontWeight: 700 }}
                        >
                          <Plus size={14} /> Tạo Hợp Đồng Ngay
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* BẢNG DANH SÁCH HỢP ĐỒNG */
        <div className="card-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã Hợp Đồng</th>
                <th>Khu Trọ & Phòng</th>
                <th>Khách Thuê</th>
                <th>Thời Hạn Thuê</th>
                <th>Tiền Thuê / Cọc</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Không tìm thấy hợp đồng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedContracts.map((c) => {
                  const room = rooms.find(r => r.id === c.roomId || r.id === c.RoomId);
                  const zone = zones.find(z => z.id === (room?.zoneId || room?.ZoneId));
                  const tenant = tenants.find(t => t.id === c.tenantId || t.id === c.TenantProfileId);
                  const tenantName = tenant ? (tenant.fullName || tenant.name) : (c.tenantName || 'Khách thuê');
                  const tenantPhone = tenant?.phone || c.tenantPhone || '';
                  const statusInfo = getContractStatusInfo(c);

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: '700', color: '#6366f1' }}>{c.contractCode}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tạo ngày: {formatDate(c.startDate)}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                          {room ? `Phòng ${room.roomNumber}` : 'Phòng N/A'}
                        </div>
                        {zone && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🏢 {zone.name}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{tenantName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SĐT: {tenantPhone}</div>
                      </td>
                      <td>
                        <div>{formatDate(c.startDate)} - {formatDate(c.endDate)}</div>
                        {c.endDate && (
                          <div style={{ fontSize: '11px', color: statusInfo.type === 'expired' ? '#ef4444' : 'var(--text-muted)' }}>
                            {statusInfo.type === 'expired' ? '⚠️ Đã hết hạn' : `Hạn chót: ${formatDate(c.endDate)}`}
                          </div>
                        )}
                      </td>
                      <td>
                        <div>Thuê: <strong style={{ color: '#34d399' }}>{formatVND(c.rentAmount)}</strong></div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cọc: {formatVND(c.deposit)}</div>
                      </td>
                      <td>
                        <span className={`badge badge-${statusInfo.className}`} style={{ padding: '6px 10px', fontSize: '12px' }}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-sm btn-secondary" title="In / Xem Hợp Đồng PDF" onClick={() => setViewingContract(c)}>
                            <Printer size={14} />
                          </button>
                          {statusInfo.isActive && (
                            <button className="btn btn-sm btn-secondary" title="Gia Hạn Hợp Đồng" onClick={() => handleRenew(c)} style={{ color: '#10b981' }}>
                              <Clock size={14} />
                            </button>
                          )}
                          <button className="btn btn-sm btn-secondary" title="Sửa điều khoản" onClick={() => handleOpenEdit(c)}>
                            <Edit size={14} />
                          </button>
                          {statusInfo.isActive && (
                            <button className="btn btn-sm btn-danger" title="Thanh lý hợp đồng" onClick={() => handleLiquidate(c.id)}>
                              <Shield size={14} />
                            </button>
                          )}
                          <button className="btn btn-sm btn-danger" title="Xóa" onClick={() => handleDelete(c.id)}>
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
        </div>
      )}

      {/* Contract View / Print Modal */}
      {viewingContract && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Xem Chi Tiết Hợp Đồng: {viewingContract.contractCode}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewingContract(null)}>X</button>
            </div>
            <div className="modal-body" id="contract-pdf-content">
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', textTransform: 'uppercase', color: 'var(--primary)' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
                <p style={{ fontWeight: 'bold' }}>Độc lập - Tự do - Hạnh phúc</p>
                <h3 style={{ marginTop: '16px', fontSize: '18px' }}>HỢP ĐỒNG THUÊ PHÒNG TRỌ</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mã số: {viewingContract.contractCode}</p>
              </div>

              <div style={{ lineHeight: '1.8', fontSize: '14px' }}>
                <p><strong>BÊN CHO THUÊ (BÊN A):</strong> NGUYỄN VĂN HẢI - SĐT: 0908123456</p>
                <p><strong>BÊN THUÊ PHÒNG (BÊN B):</strong> {tenants.find(t => t.id === viewingContract.tenantId)?.name || tenants.find(t => t.id === viewingContract.tenantId)?.fullName || 'Nguyễn Văn Minh'} - CCCD: {tenants.find(t => t.id === viewingContract.tenantId)?.cccd || '079201008899'}</p>
                
                <h4 style={{ marginTop: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG</h4>
                <p>Bên A đồng ý cho Bên B thuê phòng số <strong>{rooms.find(r => r.id === viewingContract.roomId)?.roomNumber || viewingContract.roomId}</strong> thuộc Khu trọ SmartRent.</p>
                <p>Thời hạn thuê: Từ ngày <strong>{formatDate(viewingContract.startDate)}</strong> đến ngày <strong>{formatDate(viewingContract.endDate)}</strong>.</p>

                <h4 style={{ marginTop: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>ĐIỀU 2: GIÁ THUÊ VÀ ĐẶT CỌC</h4>
                <p>1. Giá tiền thuê phòng: <strong>{formatVND(viewingContract.rentAmount)} / tháng</strong>.</p>
                <p>2. Số tiền đặt cọc giữ phòng: <strong>{formatVND(viewingContract.deposit)}</strong>.</p>
                <p>3. Ngày thanh toán tiền nhà hàng tháng: Trước ngày <strong>05</strong> mỗi tháng.</p>

                <h4 style={{ marginTop: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>ĐIỀU 3: QUY ĐỊNH CHUNG</h4>
                <p>{viewingContract.terms}</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewingContract(null)}>Đóng</button>
              <button className="btn btn-primary" onClick={() => exportToPDF('contract-pdf-content', `${viewingContract.contractCode}.pdf`)}>
                <Printer size={16} /> Xuất PDF / In Hợp Đồng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingContract ? 'Chỉnh Sửa Hợp Đồng' : 'Tạo Hợp Đồng Thuê Nhà Mới'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>X</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Mã Hợp Đồng *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={formData.contractCode}
                    onChange={(e) => setFormData({ ...formData, contractCode: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Chọn Khu Trọ *</label>
                  <select
                    className="form-control"
                    required
                    value={selectedZoneId}
                    onChange={(e) => {
                      const zoneId = e.target.value;
                      setSelectedZoneId(zoneId);
                      const filteredRooms = rooms.filter(r => !zoneId || r.zoneId === zoneId || r.ZoneId === zoneId);
                      const firstRoom = filteredRooms[0];
                      setFormData(prev => ({
                        ...prev,
                        roomId: firstRoom?.id || '',
                        rentAmount: firstRoom?.price || prev.rentAmount,
                        deposit: firstRoom?.price || prev.deposit,
                        contractCode: firstRoom ? `HD-2026-${firstRoom.roomNumber}` : prev.contractCode
                      }));
                    }}
                  >
                    <option value="">-- Chọn khu trọ --</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name} ({z.address})</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Chọn Khách Thuê {!editingContract && '(Chưa có hợp đồng)'}</label>
                    <select
                      className="form-control"
                      value={formData.tenantId}
                      onChange={(e) => handleTenantChange(e.target.value)}
                    >
                      <option value="">-- Chọn Khách Thuê --</option>
                      {selectableTenants.map(t => {
                        const tRoomId = t.roomId || t.RoomId;
                        const room = rooms.find(r => r.id === tRoomId);
                        const roomInfo = room ? ` (Phòng ${room.roomNumber})` : '';
                        return (
                          <option key={t.id} value={t.id}>
                            {t.fullName || t.name}{roomInfo} - {t.phone}
                          </option>
                        );
                      })}
                    </select>
                    {selectableTenants.length === 0 && !editingContract && (
                      <small style={{ color: '#f59e0b', marginTop: 4, display: 'block' }}>
                        Tất cả khách thuê hiện tại đều đã có hợp đồng còn hiệu lực.
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Chọn Phòng Thuê</label>
                    <select
                      className="form-control"
                      value={formData.roomId}
                      onChange={(e) => handleRoomChange(e.target.value)}
                    >
                      <option value="">-- Chọn Phòng Thuê --</option>
                      {rooms
                        .filter(r => !selectedZoneId || r.zoneId === selectedZoneId || r.ZoneId === selectedZoneId)
                        .map(r => (
                          <option key={r.id} value={r.id}>
                            Phòng {r.roomNumber} - {formatVND(r.price)} {r.status === 'occupied' || r.status === 'Occupied' ? '(Đang ở)' : '(Còn trống)'}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Giá Thuê Tháng (VND)</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={formData.rentAmount}
                      onChange={(e) => setFormData({ ...formData, rentAmount: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tiền Đặt Cọc (VND)</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={formData.deposit}
                      onChange={(e) => setFormData({ ...formData, deposit: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ngày Bắt Đầu Thuê</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ngày Kết Thúc Hợp Đồng</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Điều Khoản & Quy Định Hợp Đồng</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu Hợp Đồng</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
