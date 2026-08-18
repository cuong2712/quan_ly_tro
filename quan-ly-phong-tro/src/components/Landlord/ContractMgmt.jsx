import React, { useState } from 'react';
import { FileText, Plus, Search, Edit, Trash2, Printer, CheckCircle, Clock, Upload, Shield, Building2, UserX, AlertTriangle, CreditCard, DollarSign, ArrowLeft } from 'lucide-react';
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
  const [modalReturnToDetail, setModalReturnToDetail] = useState(null); // Lưu lại hợp đồng để quay lại khi đóng popup con
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settlingContract, setSettlingContract] = useState(null);
  const [settleForm, setSettleForm] = useState({
    damageDeductionAmount: 0,
    otherDeductionAmount: 0,
    settlementNotes: ''
  });

  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewingContract, setRenewingContract] = useState(null);
  const [renewForm, setRenewForm] = useState({
    extendMonths: 12,
    newRentAmount: 0
  });

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingContract, setRejectingContract] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingContract, setDeletingContract] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

    if (rawStatus === 'renewrequested' || rawStatus === 'renew_requested' || Boolean(c.requestedRenewMonths)) {
      return {
        label: `⏳ Chờ gia hạn (+${c.requestedRenewMonths || 12}T)`,
        className: 'renew_requested',
        isActive: true,
        type: 'renew_requested',
        isRequested: true
      };
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
  let pendingRenewCount = 0;

  contracts.forEach(c => {
    const info = getContractStatusInfo(c);
    if (info.isRequested) pendingRenewCount++;
    if (info.isActive) activeCount++;
    if (info.type === 'expired') expiredCount++;
    if (info.type === 'liquidated') liquidatedCount++;
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
      (filterStatus === 'renew_requested' && stInfo.isRequested) ||
      (filterStatus === 'active' && stInfo.isActive) ||
      (filterStatus === 'expired' && stInfo.type === 'expired') ||
      (filterStatus === 'liquidated' && stInfo.type === 'liquidated');

    return matchesSearch && matchesZone && matchesStatus;
  }).sort((a, b) => {
    // 🌟 ƯU TIÊN 1: Đưa hợp đồng đang có yêu cầu gia hạn lên đầu tiên
    const aReq = getContractStatusInfo(a).isRequested ? 1 : 0;
    const bReq = getContractStatusInfo(b).isRequested ? 1 : 0;
    if (aReq !== bReq) return bReq - aReq;

    // 🌟 ƯU TIÊN 2: Sắp xếp theo ngày tạo / ngày bắt đầu mới nhất
    return new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate);
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

  const handleOpenEdit = (c, fromDetail = false) => {
    if (fromDetail) {
      setModalReturnToDetail(c);
      setViewingContract(null);
    } else {
      setModalReturnToDetail(null);
    }
    setEditingContract(c);
    const room = rooms.find(r => r.id === c.roomId || r.id === c.RoomId);
    setSelectedZoneId(room?.zoneId || room?.ZoneId || zones[0]?.id || '');
    setFormData({ ...c });
    setIsModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsModalOpen(false);
    setEditingContract(null);
    if (modalReturnToDetail) {
      setViewingContract(modalReturnToDetail);
      setModalReturnToDetail(null);
    }
  };

  const handleOpenDelete = (c, fromDetail = false) => {
    if (fromDetail) {
      setModalReturnToDetail(c);
      setViewingContract(null);
    } else {
      setModalReturnToDetail(null);
    }
    const room = rooms.find(r => r.id === c.roomId || r.id === c.RoomId);
    const tenant = tenants.find(t => t.id === c.tenantId || t.id === c.TenantProfileId || t.id === c.tenantProfileId);
    setDeletingContract({
      ...c,
      roomNumber: room?.roomNumber || c.roomNumber,
      tenantName: tenant?.fullName || tenant?.name || c.tenantName,
      tenantPhone: tenant?.phone || c.tenantPhone,
    });
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeletingContract(null);
    if (modalReturnToDetail) {
      setViewingContract(modalReturnToDetail);
      setModalReturnToDetail(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingContract) return;
    setIsDeleting(true);
    try {
      await contractService.deleteContract(deletingContract.id);
      setContracts(contracts.filter(c => c.id !== deletingContract.id));
      if (viewingContract?.id === deletingContract.id) {
        setViewingContract(null);
      }
      setDeleteModalOpen(false);
      setDeletingContract(null);
      setModalReturnToDetail(null);
      alert(`✅ Đã xóa hợp đồng ${deletingContract.contractCode} thành công!`);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi xóa hợp đồng: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
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

  const handleOpenRenew = (c, fromDetail = false) => {
    if (fromDetail) {
      setModalReturnToDetail(c);
      setViewingContract(null);
    } else {
      setModalReturnToDetail(null);
    }
    setRenewingContract(c);
    setRenewForm({
      extendMonths: c.requestedRenewMonths || 12,
      newRentAmount: c.rentAmount || 0,
    });
    setRenewModalOpen(true);
  };

  const handleCloseRenewModal = () => {
    setRenewModalOpen(false);
    setRenewingContract(null);
    if (modalReturnToDetail) {
      setViewingContract(modalReturnToDetail);
      setModalReturnToDetail(null);
    }
  };

  const handleSaveRenew = async (e) => {
    e.preventDefault();
    if (!renewingContract) return;

    const months = parseInt(renewForm.extendMonths);
    if (isNaN(months) || months <= 0) { alert('Số tháng không hợp lệ'); return; }

    const oldEnd = new Date(renewingContract.endDate);
    oldEnd.setMonth(oldEnd.getMonth() + months);
    const newEndDateStr = oldEnd.toISOString().split('T')[0];

    try {
      await contractService.renew(renewingContract.id, {
        extendMonths: months,
        newRentAmount: Number(renewForm.newRentAmount) || renewingContract.rentAmount
      });
      const updatedContract = {
        ...renewingContract,
        endDate: newEndDateStr,
        rentAmount: Number(renewForm.newRentAmount) || renewingContract.rentAmount,
        status: 'active',
        requestedRenewMonths: null,
        renewNotes: null,
        renewRequestedAt: null,
      };
      setContracts(contracts.map(item => item.id === renewingContract.id ? updatedContract : item));
      setRenewModalOpen(false);
      if (modalReturnToDetail) {
        setViewingContract(updatedContract);
        setModalReturnToDetail(null);
      }
      alert(`✅ Đã phê duyệt gia hạn hợp đồng ${renewingContract.contractCode} thêm ${months} tháng đến ngày ${formatDate(newEndDateStr)}!`);
      onRefresh?.();
    } catch (e) {
      alert('Lỗi gia hạn hợp đồng: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleOpenRejectRenew = (c, fromDetail = false) => {
    if (fromDetail) {
      setModalReturnToDetail(c);
      setViewingContract(null);
    } else {
      setModalReturnToDetail(null);
    }
    setRejectingContract(c);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleCloseRejectModal = () => {
    setRejectModalOpen(false);
    setRejectingContract(null);
    if (modalReturnToDetail) {
      setViewingContract(modalReturnToDetail);
      setModalReturnToDetail(null);
    }
  };

  const handleSaveRejectRenew = async (e) => {
    e.preventDefault();
    if (!rejectingContract) return;

    try {
      await contractService.rejectRenew(rejectingContract.id, {
        reason: rejectReason || 'Không đáp ứng điều kiện gia hạn vào thời điểm này.'
      });
      const updatedContract = {
        ...rejectingContract,
        status: 'active',
        requestedRenewMonths: null,
        renewNotes: null,
        renewRequestedAt: null,
      };
      setContracts(contracts.map(c => c.id === rejectingContract.id ? updatedContract : c));
      setRejectModalOpen(false);
      if (modalReturnToDetail) {
        setViewingContract(updatedContract);
        setModalReturnToDetail(null);
      }
      alert(`✅ Đã từ chối yêu cầu gia hạn hợp đồng ${rejectingContract.contractCode} và gửi thông báo cho khách thuê!`);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi từ chối gia hạn: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCheckExpiring = async () => {
    try {
      const res = await contractService.checkExpiring();
      const count = res?.count !== undefined ? res.count : (Array.isArray(res) ? res.length : 0);
      alert(`✅ Đã quét tự động thành công! Tìm thấy ${count} hợp đồng sắp/đã hết hạn. Đã gửi thông báo nhắc nhở tới khách thuê và chủ trọ.`);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi quét hợp đồng hết hạn: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenSettle = (c, fromDetail = false) => {
    if (fromDetail) {
      setModalReturnToDetail(c);
      setViewingContract(null);
    } else {
      setModalReturnToDetail(null);
    }
    setSettlingContract(c);
    setSettleForm({
      damageDeductionAmount: 0,
      otherDeductionAmount: 0,
      settlementNotes: 'Quyết toán thanh lý hợp đồng và hoàn trả tiền cọc.'
    });
    setSettleModalOpen(true);
  };

  const handleCloseSettleModal = () => {
    setSettleModalOpen(false);
    setSettlingContract(null);
    if (modalReturnToDetail) {
      setViewingContract(modalReturnToDetail);
      setModalReturnToDetail(null);
    }
  };

  const handleSaveSettle = async (e) => {
    e.preventDefault();
    if (!settlingContract) return;

    try {
      const res = await contractService.settle(settlingContract.id, {
        damageDeductionAmount: Number(settleForm.damageDeductionAmount || 0),
        otherDeductionAmount: Number(settleForm.otherDeductionAmount || 0),
        settlementNotes: settleForm.settlementNotes
      });
      alert(`✅ Đã quyết toán hợp đồng ${settlingContract.contractCode} thành công!\nSố tiền hoàn cọc thực tế: ${formatVND(res?.refundAmount || res?.RefundAmount || 0)}`);
      const updatedContract = { ...settlingContract, status: 'liquidated' };
      setContracts(contracts.map(c => c.id === settlingContract.id ? updatedContract : c));
      setSettleModalOpen(false);
      if (modalReturnToDetail) {
        setViewingContract(updatedContract);
        setModalReturnToDetail(null);
      }
      onRefresh?.();
    } catch (err) {
      alert('Lỗi quyết toán hợp đồng: ' + (err.response?.data?.message || err.message));
    }
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
      const updatedContract = { ...editingContract, ...formData, ...payload };
      setContracts(contracts.map(c => c.id === editingContract.id ? updatedContract : c));
      setIsModalOpen(false);
      if (modalReturnToDetail) {
        setViewingContract(updatedContract);
        setModalReturnToDetail(null);
      }
    } else {
      const newContract = {
        id: `HD00${contracts.length + 1}`,
        ...formData,
        ...payload,
      };
      setContracts([...contracts, newContract]);
      setIsModalOpen(false);
    }

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
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleCheckExpiring}>
            <Clock size={16} color="#f59e0b" /> Quét HĐ Sắp Hết Hạn
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Tạo Hợp Đồng Mới
          </button>
        </div>
      </div>

      {/* 📊 THẺ THỐNG KÊ TỔNG QUAN HỢP ĐỒNG */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '20px' }}>

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

        {pendingRenewCount > 0 && (
          <div
            className="card"
            onClick={() => setFilterStatus('renew_requested')}
            style={{
              padding: '16px', cursor: 'pointer', borderRadius: '12px',
              border: filterStatus === 'renew_requested' ? '2px solid #f59e0b' : '1px solid rgba(245,158,11,0.4)',
              background: 'rgba(245,158,11,0.12)', transition: 'all 0.2s',
              boxShadow: '0 0 15px rgba(245,158,11,0.15)'
            }}
          >
            <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              🔔 Chờ Gia Hạn <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{pendingRenewCount}</div>
          </div>
        )}

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

      {/* 🔔 BANNER NỔI BẬT KHI CÓ YÊU CẦU GIA HẠN HỢP ĐỒNG */}
      {pendingRenewCount > 0 && filterStatus !== 'uncontracted' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(217, 119, 6, 0.06))',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 4px 20px -4px rgba(245, 158, 11, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#f59e0b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.5)'
            }}>
              <Clock size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: '#f59e0b', fontSize: '15px', fontWeight: '800' }}>
                🔔 Có {pendingRenewCount} Yêu Cầu Gia Hạn Hợp Đồng Cần Phê Duyệt!
              </h4>
            </div>
          </div>
          {filterStatus !== 'renew_requested' && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setFilterStatus('renew_requested')}
              style={{ background: '#f59e0b', borderColor: '#f59e0b', fontWeight: '700', flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              Chỉ xem {pendingRenewCount} yêu cầu
            </button>
          )}
        </div>
      )}

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
        <div style={{ width: '220px' }}>
          <select
            className="form-control"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ fontSize: '13px' }}
          >
            <option value="all">📋 Tất cả trạng thái ({contracts.length})</option>
            {pendingRenewCount > 0 && (
              <option value="renew_requested" style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                🔔 Chờ gia hạn ({pendingRenewCount})
              </option>
            )}
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
                  const tenant = tenants.find(t => t.id === c.tenantId || t.id === c.TenantProfileId || t.id === c.tenantProfileId);
                  const tenantName = tenant ? (tenant.fullName || tenant.name) : (c.tenantName || 'Khách thuê');
                  const tenantPhone = tenant?.phone || c.tenantPhone || '';
                  const statusInfo = getContractStatusInfo(c);
                  const isRenewReq = statusInfo.isRequested;

                  return (
                    <tr
                      key={c.id}
                      className={`clickable-contract-row ${isRenewReq ? 'highlight-renew-row' : ''}`}
                      onClick={() => setViewingContract(c)}
                      title="Bấm vào dòng để xem chi tiết hợp đồng & các thao tác mở rộng"
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '700', color: isRenewReq ? '#f59e0b' : '#6366f1' }}>{c.contractCode}</span>
                          {isRenewReq && (
                            <span style={{
                              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                              color: '#ffffff',
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '3px 9px',
                              borderRadius: '9999px',
                              letterSpacing: '0.04em',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)'
                            }}>
                              🔥 CẦN DUYỆT
                            </span>
                          )}
                        </div>
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
                        {isRenewReq && (
                          <div style={{
                            fontSize: '11.5px',
                            color: '#f59e0b',
                            fontWeight: '700',
                            marginTop: '4px',
                            background: 'rgba(245, 158, 11, 0.12)',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            display: 'inline-block',
                            border: '1px solid rgba(245, 158, 11, 0.25)'
                          }}>
                            🔔 Xin gia hạn +{c.requestedRenewMonths || 12} tháng
                          </div>
                        )}
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
                        <span className={`badge badge-${statusInfo.className}`} style={{
                          padding: '6px 14px',
                          fontSize: '12px',
                          borderRadius: '9999px',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          ...(statusInfo.isRequested ? {
                            background: 'rgba(245, 158, 11, 0.16)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.5)',
                            boxShadow: '0 2px 10px rgba(245, 158, 11, 0.25)',
                            borderRadius: '9999px',
                          } : {
                            borderRadius: '9999px',
                          })
                        }}>
                          {statusInfo.label}
                        </span>
                        {c.renewNotes && (
                          <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px', fontStyle: 'italic', maxWidth: 160 }} title={c.renewNotes}>
                            💬 "{c.renewNotes.length > 25 ? c.renewNotes.slice(0, 25) + '...' : c.renewNotes}"
                          </div>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {statusInfo.isRequested ? (
                            <>
                              <button
                                className="btn btn-sm btn-primary"
                                title="Khách gửi yêu cầu gia hạn - Bấm để duyệt"
                                onClick={() => handleOpenRenew(c)}
                                style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 9px' }}
                              >
                                <Clock size={14} /> Duyệt
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                title="Từ chối yêu cầu gia hạn"
                                onClick={() => handleOpenRejectRenew(c)}
                                style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 8px' }}
                              >
                                <UserX size={14} /> Từ Chối
                              </button>
                            </>
                          ) : (
                            statusInfo.isActive && (
                              <button
                                className="btn btn-sm btn-secondary"
                                title="Gia Hạn Hợp Đồng"
                                onClick={() => handleOpenRenew(c)}
                                style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 9px' }}
                              >
                                <Clock size={14} /> Gia Hạn
                              </button>
                            )
                          )}

                          <button
                            className="btn btn-sm btn-danger"
                            title="Xóa hợp đồng"
                            onClick={() => handleOpenDelete(c)}
                            style={{ padding: '5px 8px' }}
                          >
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

      {/* 📄 MODAL XEM CHI TIẾT & THAO TÁC HỢP ĐỒNG */}
      {viewingContract && (() => {
        const room = rooms.find(r => r.id === viewingContract.roomId || r.id === viewingContract.RoomId);
        const zone = zones.find(z => z.id === (room?.zoneId || room?.ZoneId || viewingContract.zoneId || viewingContract.ZoneId));
        const tenant = tenants.find(t => t.id === viewingContract.tenantId || t.id === viewingContract.tenantProfileId || t.id === viewingContract.TenantProfileId);
        const statusInfo = getContractStatusInfo(viewingContract);
        const isRenewReq = statusInfo.isRequested;

        const landlordName = viewingContract.landlordName || viewingContract.LandlordName || zone?.landlordName || 'Chủ trọ';
        const landlordPhone = viewingContract.landlordPhone || viewingContract.LandlordPhone || zone?.landlordPhone || '';
        const landlordEmail = viewingContract.landlordEmail || viewingContract.LandlordEmail || '';
        const zoneName = viewingContract.zoneName || viewingContract.ZoneName || zone?.name || 'Khu trọ';
        const zoneAddress = viewingContract.zoneAddress || viewingContract.ZoneAddress || zone?.address || '';

        const tenantName = viewingContract.tenantName || viewingContract.TenantName || tenant?.fullName || tenant?.name || 'Khách thuê';
        const tenantPhone = viewingContract.tenantPhone || viewingContract.TenantPhone || tenant?.phone || '';
        const tenantCccd = viewingContract.tenantCccd || viewingContract.TenantCccd || tenant?.cccd || tenant?.CCCD || 'Đã xác minh';

        return (
          <div className="modal-overlay" onClick={() => setViewingContract(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

              {/* Modal Header */}
              <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 className="modal-title" style={{ margin: 0, fontSize: '18px' }}>
                    Chi Tiết Hợp Đồng: <span style={{ color: isRenewReq ? '#f59e0b' : '#6366f1' }}>{viewingContract.contractCode}</span>
                  </h3>
                  <span className={`badge badge-${statusInfo.className}`} style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    ...(isRenewReq ? { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid #f59e0b' } : {})
                  }}>
                    {statusInfo.label}
                  </span>
                </div>
                <button className="btn btn-sm btn-secondary" onClick={() => setViewingContract(null)}>✕</button>
              </div>

              {/* 🛠️ QUICK ACTION TOOLBAR */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '12px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => exportToPDF('contract-pdf-content', `${viewingContract.contractCode}.pdf`)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <Printer size={15} /> In / Xuất PDF
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleOpenEdit(viewingContract, true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <Edit size={15} /> Sửa Điều Khoản
                  </button>

                  {statusInfo.isActive && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleOpenSettle(viewingContract, true)}
                      style={{ color: '#0ea5e9', borderColor: 'rgba(14, 165, 233, 0.4)', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <CheckCircle size={15} /> Quyết Toán & Thanh Lý
                    </button>
                  )}

                  {statusInfo.isActive && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleOpenRenew(viewingContract, true)}
                      style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <Clock size={15} /> Gia Hạn HĐ
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => handleOpenDelete(viewingContract, true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <Trash2 size={15} /> Xóa HĐ
                </button>
              </div>

              {/* Modal Document Body */}
              <div className="modal-body contract-paper" id="contract-pdf-content" style={{ background: '#ffffff', color: '#0f172a', padding: '28px', overflowY: 'auto', flex: 1 }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '20px', textTransform: 'uppercase', color: '#1e3a8a', fontWeight: '800', margin: 0 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
                  <p style={{ fontWeight: 'bold', color: '#0f172a', marginTop: '4px', marginBottom: 0 }}>Độc lập - Tự do - Hạnh phúc</p>
                  <h3 style={{ marginTop: '16px', marginBottom: '4px', fontSize: '18px', color: '#1e3a8a', fontWeight: '700' }}>HỢP ĐỒNG THUÊ PHÒNG TRỌ</h3>
                  <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Mã số: {viewingContract.contractCode}</p>
                </div>

                <div style={{ lineHeight: '1.8', fontSize: '14px', color: '#0f172a' }}>
                  <p style={{ color: '#0f172a', margin: '6px 0' }}><strong style={{ color: '#0f172a' }}>BÊN CHO THUÊ (BÊN A):</strong> {landlordName} {landlordPhone ? `- SĐT: ${landlordPhone}` : ''} {landlordEmail ? `(${landlordEmail})` : ''}</p>
                  <p style={{ color: '#0f172a', margin: '6px 0' }}><strong style={{ color: '#0f172a' }}>BÊN THUÊ PHÒNG (BÊN B):</strong> {tenantName} {tenantPhone ? `- SĐT: ${tenantPhone}` : ''} - CCCD: {tenantCccd}</p>

                  <h4 style={{ marginTop: '16px', marginBottom: '6px', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', color: '#1e3a8a', fontWeight: '700' }}>ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG</h4>
                  <p style={{ color: '#0f172a', margin: '4px 0' }}>Bên A đồng ý cho Bên B thuê phòng số <strong style={{ color: '#0f172a' }}>{room?.roomNumber || viewingContract.roomNumber || viewingContract.roomId}</strong> thuộc {zoneName} {zoneAddress ? `(Địa chỉ: ${zoneAddress})` : ''}.</p>
                  <p style={{ color: '#0f172a', margin: '4px 0' }}>Thời hạn thuê: Từ ngày <strong style={{ color: '#0f172a' }}>{formatDate(viewingContract.startDate)}</strong> đến ngày <strong style={{ color: '#0f172a' }}>{formatDate(viewingContract.endDate)}</strong>.</p>

                  <h4 style={{ marginTop: '16px', marginBottom: '6px', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', color: '#1e3a8a', fontWeight: '700' }}>ĐIỀU 2: GIÁ THUÊ VÀ ĐẶT CỌC</h4>
                  <p style={{ color: '#0f172a', margin: '4px 0' }}>1. Giá tiền thuê phòng: <strong style={{ color: '#059669' }}>{formatVND(viewingContract.rentAmount)} / tháng</strong>.</p>
                  <p style={{ color: '#0f172a', margin: '4px 0' }}>2. Số tiền đặt cọc giữ phòng: <strong style={{ color: '#0f172a' }}>{formatVND(viewingContract.deposit)}</strong>.</p>
                  <p style={{ color: '#0f172a', margin: '4px 0' }}>3. Ngày thanh toán tiền nhà hàng tháng: Trước ngày <strong style={{ color: '#0f172a' }}>{viewingContract.paymentTermDay || 5}</strong> hàng tháng.</p>

                  <h4 style={{ marginTop: '16px', marginBottom: '6px', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', color: '#1e3a8a', fontWeight: '700' }}>ĐIỀU 3: QUY ĐỊNH CHUNG</h4>
                  <p style={{ color: '#0f172a', margin: '4px 0' }}>{viewingContract.terms || 'Các bên tuân thủ quy định chung của nhà trọ.'}</p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)' }}>
                <button className="btn btn-secondary" onClick={() => setViewingContract(null)}>Đóng Cửa Sổ</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {modalReturnToDetail && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleCloseEditModal}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 12 }}
                    title="Quay lại xem chi tiết hợp đồng"
                  >
                    <ArrowLeft size={14} /> Quay lại
                  </button>
                )}
                <h3 className="modal-title">{editingContract ? 'Chỉnh Sửa Hợp Đồng' : 'Tạo Hợp Đồng Thuê Nhà Mới'}</h3>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={handleCloseEditModal}>✕</button>
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
                <button type="button" className="btn btn-secondary" onClick={handleCloseEditModal}>
                  {modalReturnToDetail ? '⬅ Quay Lại Chi Tiết' : 'Hủy'}
                </button>
                <button type="submit" className="btn btn-primary">Lưu Hợp Đồng</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Settle Contract Modal (Quyết toán & Hoàn cọc) */}
      {settleModalOpen && settlingContract && (
        <div className="modal-overlay" onClick={handleCloseSettleModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {modalReturnToDetail && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleCloseSettleModal}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 12 }}
                    title="Quay lại xem chi tiết hợp đồng"
                  >
                    <ArrowLeft size={14} /> Quay lại
                  </button>
                )}
                <h3 className="modal-title">Quyết Toán & Hoàn Cọc: {settlingContract.contractCode}</h3>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={handleCloseSettleModal}>✕</button>
            </div>
            <form onSubmit={handleSaveSettle}>
              <div className="modal-body">
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Tiền cọc ban đầu:</span>
                    <strong>{formatVND(settlingContract.deposit || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Khấu trừ hư hỏng thiết bị:</span>
                    <strong style={{ color: '#ef4444' }}>-{formatVND(settleForm.damageDeductionAmount || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Khấu trừ khác:</span>
                    <strong style={{ color: '#ef4444' }}>-{formatVND(settleForm.otherDeductionAmount || 0)}</strong>
                  </div>
                  <hr style={{ borderColor: 'var(--border-color)', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
                    <span>Số tiền hoàn cọc dự kiến:</span>
                    <span style={{ color: '#10b981' }}>
                      {formatVND(Math.max(0, (settlingContract.deposit || 0) - (Number(settleForm.damageDeductionAmount) || 0) - (Number(settleForm.otherDeductionAmount) || 0)))}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Khấu Trừ Hư Hỏng Thiết Bị (VND)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={settleForm.damageDeductionAmount}
                    onChange={(e) => setSettleForm({ ...settleForm, damageDeductionAmount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Khấu Trừ Chi Phí Khác (VND)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={settleForm.otherDeductionAmount}
                    onChange={(e) => setSettleForm({ ...settleForm, otherDeductionAmount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi Chú Quyết Toán</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={settleForm.settlementNotes}
                    onChange={(e) => setSettleForm({ ...settleForm, settlementNotes: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseSettleModal}>
                  {modalReturnToDetail ? '⬅ Quay Lại Chi Tiết' : 'Hủy'}
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }}>Xác Nhận Quyết Toán</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔄 MODAL GIA HẠN HỢP ĐỒNG (CHỦ TRỌ) */}
      {renewModalOpen && renewingContract && (
        <div className="modal-overlay" onClick={handleCloseRenewModal} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {modalReturnToDetail && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleCloseRenewModal}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 12 }}
                    title="Quay lại xem chi tiết hợp đồng"
                  >
                    <ArrowLeft size={14} /> Quay lại
                  </button>
                )}
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '18px' }}>
                  <Clock size={20} color="#10b981" /> Phê Duyệt / Gia Hạn HĐ
                </h3>
              </div>
              <button className="btn-close" onClick={handleCloseRenewModal}>✕</button>
            </div>
            <form onSubmit={handleSaveRenew}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'var(--bg-dark)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }}>
                  <div>Mã hợp đồng: <strong style={{ color: '#6366f1' }}>{renewingContract.contractCode || 'HĐ'}</strong> {renewingContract.roomNumber ? `(Phòng ${renewingContract.roomNumber})` : ''}</div>
                  <div style={{ marginTop: 4 }}>Khách thuê: <strong>{renewingContract.tenantName || 'Khách thuê'}</strong> {renewingContract.tenantPhone ? `(${renewingContract.tenantPhone})` : ''}</div>
                  <div style={{ marginTop: 4 }}>Hạn hiện tại: Đến ngày <strong>{formatDate(renewingContract.endDate)}</strong></div>
                </div>

                {renewingContract.renewNotes && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: '#d97706' }}>
                    <strong>💬 Lời nhắn từ khách thuê:</strong>
                    <div style={{ fontStyle: 'italic', marginTop: 2, color: 'var(--text-primary)' }}>"{renewingContract.renewNotes}"</div>
                  </div>
                )}

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Số Tháng Gia Hạn *</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    {[3, 6, 12, 24].map(m => (
                      <button
                        key={m}
                        type="button"
                        className={`btn btn-sm ${Number(renewForm.extendMonths) === m ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '6px 0', fontSize: 13 }}
                        onClick={() => setRenewForm({ ...renewForm, extendMonths: m })}
                      >
                        +{m} tháng
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    className="form-control"
                    required
                    value={renewForm.extendMonths}
                    onChange={e => setRenewForm({ ...renewForm, extendMonths: parseInt(e.target.value) || 1 })}
                  />
                </div>

                {(() => {
                  try {
                    if (!renewingContract.endDate) return null;
                    const oldD = new Date(renewingContract.endDate);
                    if (isNaN(oldD.getTime())) return null;
                    const months = parseInt(renewForm.extendMonths) || 0;
                    if (months <= 0) return null;
                    oldD.setMonth(oldD.getMonth() + months);
                    const nextEndStr = oldD.toISOString().split('T')[0];
                    return (
                      <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, padding: '10px 14px', color: '#10b981', fontSize: 13 }}>
                        <CheckCircle size={15} style={{ display: 'inline', marginRight: 6 }} />
                        Hạn hợp đồng mới sau khi gia hạn: <strong>{formatDate(nextEndStr)}</strong>
                      </div>
                    );
                  } catch (e) {
                    return null;
                  }
                })()}

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Giá Thuê Mới (VNĐ/tháng)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    className="form-control"
                    required
                    value={renewForm.newRentAmount}
                    onChange={e => setRenewForm({ ...renewForm, newRentAmount: e.target.value })}
                  />
                  <small style={{ color: 'var(--text-muted)' }}>Giá hiện tại: {formatVND(renewingContract.rentAmount || 0)}</small>
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseRenewModal}>
                  {modalReturnToDetail ? '⬅ Quay Lại Chi Tiết' : 'Hủy'}
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }}>
                  <CheckCircle size={15} style={{ marginRight: 4 }} />
                  Xác Nhận Gia Hạn HĐ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ❌ MODAL TỪ CHỐI GIA HẠN HỢP ĐỒNG (CHỦ TRỌ) */}
      {rejectModalOpen && rejectingContract && (
        <div className="modal-overlay" onClick={handleCloseRejectModal} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '100%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {modalReturnToDetail && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleCloseRejectModal}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 12 }}
                    title="Quay lại xem chi tiết hợp đồng"
                  >
                    <ArrowLeft size={14} /> Quay lại
                  </button>
                )}
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '18px', color: '#f43f5e' }}>
                  <AlertTriangle size={20} color="#f43f5e" /> Từ Chối Yêu Cầu Gia Hạn HĐ
                </h3>
              </div>
              <button className="btn-close" onClick={handleCloseRejectModal}>✕</button>
            </div>
            <form onSubmit={handleSaveRejectRenew}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'var(--bg-dark)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }}>
                  <div>Hợp đồng: <strong style={{ color: '#6366f1' }}>{rejectingContract.contractCode}</strong> {rejectingContract.roomNumber ? `(Phòng ${rejectingContract.roomNumber})` : ''}</div>
                  <div style={{ marginTop: 4 }}>Khách thuê: <strong>{rejectingContract.tenantName || 'Khách thuê'}</strong></div>
                  <div style={{ marginTop: 4 }}>Số tháng khách xin gia hạn: <strong style={{ color: '#f59e0b' }}>+{rejectingContract.requestedRenewMonths || 12} tháng</strong></div>
                  {rejectingContract.renewNotes && (
                    <div style={{ marginTop: 4, fontStyle: 'italic', color: 'var(--text-muted)' }}>
                      Lời nhắn của khách: "{rejectingContract.renewNotes}"
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Lý Do Từ Chối (gửi thông báo đến khách thuê) *</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Nhập lý do giải thích cho khách thuê (ví dụ: kế hoạch tu sửa phòng, tăng giá thuê mới, hoặc hết thời hạn giữ phòng...)"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseRejectModal}>
                  {modalReturnToDetail ? '⬅ Quay Lại Chi Tiết' : 'Hủy'}
                </button>
                <button type="submit" className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <UserX size={15} /> Xác Nhận Từ Chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🗑️ MODAL XÁC NHẬN XÓA HỢP ĐỒNG */}
      {deleteModalOpen && deletingContract && (
        <div
          className="modal-overlay"
          onClick={() => !isDeleting && handleCloseDeleteModal()}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '100%' }}>
            <div className="modal-header" style={{ borderBottomColor: 'rgba(244, 63, 94, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {modalReturnToDetail && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={isDeleting}
                    onClick={handleCloseDeleteModal}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 12 }}
                    title="Quay lại xem chi tiết hợp đồng"
                  >
                    <ArrowLeft size={14} /> Quay lại
                  </button>
                )}
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '18px', color: '#f43f5e' }}>
                  <AlertTriangle size={22} color="#f43f5e" /> Xác Nhận Xóa Hợp Đồng
                </h3>
              </div>
              <button className="btn-close" disabled={isDeleting} onClick={handleCloseDeleteModal}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa vĩnh viễn hợp đồng này không? Dữ liệu hợp đồng sẽ bị gỡ bỏ khỏi hệ thống.
              </p>

              <div style={{ background: 'var(--bg-dark)', padding: '14px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mã hợp đồng:</span>
                  <strong style={{ color: '#6366f1' }}>{deletingContract.contractCode}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Phòng thuê:</span>
                  <strong>{deletingContract.roomNumber ? `Phòng ${deletingContract.roomNumber}` : 'Phòng N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Khách thuê:</span>
                  <strong>{deletingContract.tenantName || 'Khách thuê'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Thời hạn:</span>
                  <span>{formatDate(deletingContract.startDate)} - {formatDate(deletingContract.endDate)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tiền cọc giữ phòng:</span>
                  <strong style={{ color: '#10b981' }}>{formatVND(deletingContract.deposit)}</strong>
                </div>
              </div>

              <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: 8, padding: '12px 14px', fontSize: 12.5, color: '#f43f5e' }}>
                <strong>⚠️ Lưu ý:</strong> Nếu khách thuê dọn đi và cần hoàn lại tiền cọc, vui lòng sử dụng tính năng <strong>"Quyết toán cọc & Thanh lý"</strong> thay vì xóa hợp đồng để lưu lại lịch sử thu chi.
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isDeleting}
                onClick={handleCloseDeleteModal}
              >
                {modalReturnToDetail ? '⬅ Quay Lại Chi Tiết' : 'Hủy Bỏ'}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <Trash2 size={16} /> {isDeleting ? 'Đang xóa...' : 'Xác Nhận Xóa Vĩnh Viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



