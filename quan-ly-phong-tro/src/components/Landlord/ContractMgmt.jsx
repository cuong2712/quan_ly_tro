import React, { useState, useRef } from 'react';
import mammoth from 'mammoth';
import { FileText, Plus, Search, Edit, Trash2, Download, CheckCircle, Clock, Upload, Shield, Building2, UserX, AlertTriangle, CreditCard, DollarSign, ArrowLeft, RefreshCw, ChevronRight, UserCheck, ShieldCheck, Info, FileCode, Sparkles, BookOpen, Settings } from 'lucide-react';
import { formatVND, formatDate, exportToPDF, formatNumberWithDots, parseNumberFromDots } from '../../utils/formatters';
import { contractService, roomService } from '../../services';
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

  // ─── Quản Lý Mẫu Hợp Đồng Tùy Biến (Custom Template Engine) ───
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateContent, setTemplateContent] = useState('');
  const [isCustomTemplate, setIsCustomTemplate] = useState(false);
  const [availableVariables, setAvailableVariables] = useState([]);
  const [activeTemplateTab, setActiveTemplateTab] = useState('editor'); // 'editor' | 'preview'
  const [previewContent, setPreviewContent] = useState('');
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

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

  // ─── Modal Chuyển Quyền Đại Diện HĐ (Cố định layout) ───
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferringContract, setTransferringContract] = useState(null);
  const [transferOccupants, setTransferOccupants] = useState([]);
  const [loadingOccupants, setLoadingOccupants] = useState(false);
  const [transferForm, setTransferForm] = useState({
    newTenantProfileId: '',
    removeOldTenant: true,
    note: ''
  });
  const [isTransferring, setIsTransferring] = useState(false);

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
    initialElecMeter: 0,
    initialWaterMeter: 0,
  });

  // ─── 1. Tính toán Trạng thái & Thống kê ──────────────────────
  const getContractStatusInfo = (c) => {
    const rawStatus = String(c?.status || '').trim().toLowerCase();

    if (rawStatus === 'liquidated' || rawStatus === '4' || c?.status === 4) {
      return { label: 'Đã thanh lý', className: 'liquidated', isActive: false, type: 'liquidated' };
    }

    if (rawStatus === 'renewrequested' || rawStatus === 'renew_requested' || rawStatus === '3' || c?.status === 3 || Boolean(c?.requestedRenewMonths)) {
      return {
        label: `⏳ Chờ gia hạn (+${c?.requestedRenewMonths || 12}T)`,
        className: 'renew_requested',
        isActive: true,
        type: 'renew_requested',
        isRequested: true
      };
    }

    if (rawStatus === 'expired' || rawStatus === '2' || c?.status === 2) {
      return { label: 'Đã hết hạn', className: 'expired', isActive: false, type: 'expired' };
    }

    if (c?.endDate) {
      const endDateObj = new Date(c.endDate);
      endDateObj.setHours(23, 59, 59, 999);
      const now = new Date();
      if (endDateObj < now) {
        return { label: 'Đã hết hạn', className: 'expired', isActive: false, type: 'expired' };
      }
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

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

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
      initialElecMeter: selectedRoom?.elecMeter || 0,
      initialWaterMeter: selectedRoom?.waterMeter || 0,
    }));
  };

  const currentTenantId = editingContract
    ? (editingContract.tenantProfileId || editingContract.tenantId || editingContract.TenantProfileId)
    : null;
  const currentTenant = editingContract
    ? (tenants.find(t =>
        t.id === currentTenantId ||
        t.userId === currentTenantId ||
        (editingContract.tenantPhone && t.phone === editingContract.tenantPhone) ||
        (editingContract.tenantName && (t.fullName === editingContract.tenantName || t.name === editingContract.tenantName))
      ) || null)
    : null;
  const effectiveCurrentTenantId = currentTenant ? currentTenant.id : currentTenantId;

  const selectableTenants = editingContract
    ? (
        currentTenant && !tenants.some(t => t.id === currentTenant.id && !activeContractTenantIds.has(t.id))
          ? [currentTenant, ...tenants.filter(t => t.id !== currentTenant.id && !activeContractTenantIds.has(t.id))]
          : tenants.filter(t => t.id === effectiveCurrentTenantId || !activeContractTenantIds.has(t.id))
      )
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
      initialElecMeter: room?.elecMeter || 0,
      initialWaterMeter: room?.waterMeter || 0,
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
      initialElecMeter: room?.elecMeter || 0,
      initialWaterMeter: room?.waterMeter || 0,
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

    const cTenantId = c.tenantProfileId || c.tenantId || c.TenantProfileId;
    const matchingTenant = tenants.find(t =>
      t.id === cTenantId ||
      t.userId === cTenantId ||
      (c.tenantPhone && t.phone === c.tenantPhone) ||
      (c.tenantName && (t.fullName === c.tenantName || t.name === c.tenantName))
    );

    const formatDateForInput = (dStr) => {
      if (!dStr) return '';
      try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return String(dStr).slice(0, 10);
        return d.toISOString().split('T')[0];
      } catch {
        return String(dStr).slice(0, 10);
      }
    };

    setFormData({
      ...c,
      tenantId: matchingTenant?.id || cTenantId || '',
      roomId: c.roomId || c.RoomId || '',
      contractCode: c.contractCode || c.ContractCode || '',
      startDate: formatDateForInput(c.startDate || c.StartDate),
      endDate: formatDateForInput(c.endDate || c.EndDate),
      rentAmount: c.rentAmount !== undefined ? c.rentAmount : (c.RentAmount || 0),
      deposit: c.deposit !== undefined ? c.deposit : (c.Deposit || 0),
      paymentTermDay: c.paymentTermDay || c.PaymentTermDay || 5,
      terms: c.terms || c.Terms || '',
    });
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
    if (confirm('Xác nhận thanh lý hợp đồng này? Trạng thái sẽ chuyển thành Đã thanh lý và hủy liên kết phòng của khách thuê.')) {
      try {
        await contractService.terminate(id);
        setContracts(contracts.map(c => c.id === id ? { ...c, status: 'Liquidated' } : c));
        if (viewingContract?.id === id) {
          setViewingContract(prev => prev ? { ...prev, status: 'Liquidated' } : null);
        }
        alert('✅ Đã thanh lý hợp đồng thành công! Phòng đã được giải phóng và hủy liên kết với người thuê.');
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

  // ─── QUẢN LÝ MẪU HỢP ĐỒNG TÙY BIẾN (CUSTOM TEMPLATE HANDLERS) ───
  const handleOpenTemplateModal = async () => {
    setIsLoadingTemplate(true);
    setTemplateModalOpen(true);
    setActiveTemplateTab('editor');
    try {
      const res = await contractService.getTemplate();
      const data = res?.data || res;
      setTemplateContent(data.content || '');
      setIsCustomTemplate(data.isCustom || false);
      setAvailableVariables(data.availableVariables || []);
    } catch (err) {
      alert('Lỗi tải mẫu hợp đồng: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleInsertVariable = (tag) => {
    if (!textareaRef.current) {
      setTemplateContent(prev => prev + ' ' + tag);
      return;
    }
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = templateContent;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newText = before + tag + after;
    setTemplateContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleSaveTemplate = async () => {
    if (!templateContent.trim()) {
      alert('Vui lòng không để trống nội dung mẫu hợp đồng.');
      return;
    }
    setIsSavingTemplate(true);
    try {
      const res = await contractService.saveTemplate(templateContent);
      const data = res?.data || res;
      setIsCustomTemplate(true);
      alert('✅ Đã lưu mẫu hợp đồng tùy biến thành công! Mọi hợp đồng mới sẽ áp dụng mẫu này.');
    } catch (err) {
      alert('Lỗi lưu mẫu hợp đồng: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleResetTemplate = async () => {
    if (!confirm('Bạn có chắc chắn muốn khôi phục về Mẫu Hợp Đồng Chuẩn của Bộ Xây Dựng không?')) return;
    setIsSavingTemplate(true);
    try {
      const res = await contractService.resetTemplate();
      const data = res?.data || res;
      setTemplateContent(data.content || '');
      setIsCustomTemplate(false);
      alert('✅ Đã khôi phục về mẫu hợp đồng chuẩn thành công!');
    } catch (err) {
      alert('Lỗi khôi phục mẫu: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Hàm biên dịch nhanh bản xem trước mẫu hợp đồng trên Client
  const renderPreviewClient = (rawText) => {
    if (!rawText) return '';
    const map = {
      '{{MA_HOP_DONG}}': 'HD-MAU-2026',
      '{{NGAY_KY}}': formatDate(new Date().toISOString()),
      '{{TEN_CHU_TRO}}': 'Nguyễn Văn Hải (Chủ trọ)',
      '{{SDT_CHU_TRO}}': '0908.123.456',
      '{{CCCD_CHU_TRO}}': '079201012345',
      '{{STK_CHU_TRO}}': '6531211114',
      '{{NGAN_HANG_CHU_TRO}}': 'BIDV',
      '{{TEN_KHACH}}': 'Nguyễn Minh Tuấn',
      '{{SDT_KHACH}}': '0912.345.678',
      '{{CCCD_KHACH}}': '079202008899',
      '{{SO_PHONG}}': '202',
      '{{TEN_KHU_TRO}}': 'Khu Trọ Gigamall Thủ Đức',
      '{{DIA_CHI_KHU_TRO}}': '240 Phạm Văn Đồng, TP. Thủ Đức',
      '{{DIEN_TICH}}': '28 m²',
      '{{GIA_THUE}}': '4.000.000 đ',
      '{{TIEN_COC}}': '4.000.000 đ',
      '{{NGAY_BAT_DAU}}': '01/09/2026',
      '{{NGAY_KET_THUC}}': '01/09/2027',
      '{{THOI_HAN_THUE}}': '12 tháng',
      '{{NGAY_DONG_TIEN}}': 'Ngày 05 hàng tháng',
      '{{GIA_DIEN}}': '3.500 đ/kWh',
      '{{GIA_NUOC}}': '18.000 đ/m³',
      '{{CHI_SO_DIEN_BAN_DAU}}': '120 kWh',
      '{{CHI_SO_NUOC_BAN_DAU}}': '45 m³',
      '{{DIEU_KHOAN_RIENG}}': 'Bên B giữ gìn vệ sinh chung, không gây ồn sau 22h, thanh toán đúng hạn trước ngày 05 hàng tháng.'
    };
    let result = rawText;
    Object.keys(map).forEach(tag => {
      const reg = new RegExp(tag.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1'), 'gi');
      result = result.replace(reg, map[tag]);
    });
    return result;
  };

  const handlePreviewTemplate = async () => {
    setActiveTemplateTab('preview');
    const localRender = renderPreviewClient(templateContent);
    setPreviewContent(localRender);
    try {
      const res = await contractService.previewTemplate({ templateContent });
      const data = res?.data || res;
      if (data?.content) {
        setPreviewContent(data.content);
      }
    } catch (err) {
      // Giữ bản biên dịch localRender nếu API gặp độ trễ
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const mammothLib = mammoth?.default || mammoth;
        const result = await mammothLib.extractRawText({ arrayBuffer });
        const text = result?.value || '';
        if (text && text.trim()) {
          setTemplateContent(text.trim());
          alert(`✅ Đã trích xuất thành công toàn bộ văn bản từ file Word "${file.name}" vào trình soạn thảo!`);
        } else {
          alert('Không tìm thấy nội dung văn bản trong file Word này.');
        }
      } else {
        // Đọc file .txt hoặc định dạng văn bản thuần
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target.result;
          if (text) {
            setTemplateContent(text.trim());
            alert(`✅ Đã nạp thành công nội dung từ file "${file.name}" vào trình soạn thảo!`);
          }
        };
        reader.readAsText(file);
      }
    } catch (err) {
      alert('Lỗi đọc file: ' + (err.message || 'Không thể trích xuất văn bản từ file này.'));
    } finally {
      e.target.value = '';
    }
  };

  const handleCheckExpiring = async () => {
    try {
      const res = await contractService.checkExpiring();
      const count = res?.notifiedCount !== undefined ? res.notifiedCount : (res?.count !== undefined ? res.count : (Array.isArray(res) ? res.length : 0));
      alert(`✅ Đã quét tự động thành công! Tìm thấy và phát hành ${count} thông báo nhắc nhở hợp đồng sắp hết hạn trong 30 ngày tới tới khách thuê.`);
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

    const room = rooms.find(r => r.id === formData.roomId);
    const roomNumber = room?.roomNumber || '101';
    const payload = {
      contractCode: formData.contractCode.trim(),
      tenantProfileId: formData.tenantId,
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      endDate: formData.endDate || '2027-07-28',
      rentAmount: Number(formData.rentAmount || 0),
      deposit: Number(formData.deposit || 0),
      paymentTermDay: Number(formData.paymentTermDay || 5),
      terms: formData.terms || '',
      initialElecMeter: Number(formData.initialElecMeter || 0),
      initialWaterMeter: Number(formData.initialWaterMeter || 0),
    };

    try {
      if (editingContract) {
        const updated = await contractService.updateContract(editingContract.id, payload);
        const updatedContract = updated || { ...editingContract, ...formData, ...payload };
        setContracts(contracts.map(c => c.id === editingContract.id ? updatedContract : c));
        alert('✅ Cập nhật hợp đồng thành công!');
        if (modalReturnToDetail) {
          setViewingContract(updatedContract);
          setModalReturnToDetail(null);
        }
      } else {
        const created = await contractService.createContract(payload);
        setContracts(prev => [created || { id: `HD00${prev.length + 1}`, ...formData, ...payload }, ...prev]);
        alert('✅ Khởi tạo hợp đồng mới thành công!');
      }
      setIsModalOpen(false);
      setEditingContract(null);
      onRefresh?.();
    } catch (err) {
      alert('❌ Lỗi lưu hợp đồng: ' + (err.response?.data?.message || err.message));
    }
  };


  return (
    <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '20px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={22} color="#6366f1" /> Quản Lý Hợp Đồng Thuê Nhà
          </h2>
          <p className="page-subtitle" style={{ fontSize: '12px', margin: '2px 0 0 0' }}>
            Tạo mới, gia hạn, thanh lý và xuất file PDF hợp đồng pháp lý
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleOpenTemplateModal} style={{ padding: '6px 14px', fontSize: '12.5px', height: '34px', borderColor: 'rgba(99, 102, 241, 0.5)', color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <Settings size={16} color="#818cf8" /> Cấu Hình Mẫu HĐ
          </button>
          <button className="btn btn-secondary" onClick={handleCheckExpiring} style={{ padding: '6px 14px', fontSize: '12.5px', height: '34px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Clock size={16} color="#f59e0b" /> Quét HĐ Sắp Hết Hạn
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ padding: '6px 16px', fontSize: '12.5px', height: '34px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={18} /> Tạo Hợp Đồng Mới
          </button>
        </div>
      </div>

      {/* 📊 THẺ THỐNG KÊ TỔNG QUAN HỢP ĐỒNG (COMPACT & ĐỒNG NHẤT) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '8px' }}>

        <div
          className="card"
          onClick={() => { setFilterStatus('all'); setCurrentPage(1); }}
          style={{
            padding: '8px 12px', cursor: 'pointer', borderRadius: '10px',
            border: filterStatus === 'all' ? '2px solid #6366f1' : '1px solid var(--border-color)',
            background: 'var(--bg-card)', transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>📄 Tổng HĐ</div>
          <div style={{ fontSize: '21px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{contracts.length}</div>
        </div>

        {pendingRenewCount > 0 && (
          <div
            className="card"
            onClick={() => { setFilterStatus('renew_requested'); setCurrentPage(1); }}
            style={{
              padding: '8px 12px', cursor: 'pointer', borderRadius: '10px',
              border: filterStatus === 'renew_requested' ? '2px solid #f59e0b' : '1px solid rgba(245,158,11,0.4)',
              background: 'rgba(245,158,11,0.12)', transition: 'all 0.2s',
              boxShadow: '0 0 10px rgba(245,158,11,0.15)'
            }}
          >
            <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
              🔔 Chờ Gia Hạn
            </div>
            <div style={{ fontSize: '21px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>{pendingRenewCount}</div>
          </div>
        )}

        <div
          className="card"
          onClick={() => { setFilterStatus('active'); setCurrentPage(1); }}
          style={{
            padding: '8px 12px', cursor: 'pointer', borderRadius: '10px',
            border: filterStatus === 'active' ? '2px solid #10b981' : '1px solid var(--border-color)',
            background: 'rgba(16,185,129,0.08)', transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 700 }}>✅ Đang Hiệu Lực</div>
          <div style={{ fontSize: '21px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{activeCount}</div>
        </div>

        <div
          className="card"
          onClick={() => { setFilterStatus('expired'); setCurrentPage(1); }}
          style={{
            padding: '8px 12px', cursor: 'pointer', borderRadius: '10px',
            border: filterStatus === 'expired' ? '2px solid #ef4444' : '1px solid var(--border-color)',
            background: 'rgba(239,68,68,0.08)', transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: 700 }}>⏳ Hết Hạn</div>
          <div style={{ fontSize: '21px', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>{expiredCount}</div>
        </div>

        <div
          className="card"
          onClick={() => { setFilterStatus('liquidated'); setCurrentPage(1); }}
          style={{
            padding: '8px 12px', cursor: 'pointer', borderRadius: '10px',
            border: filterStatus === 'liquidated' ? '2px solid #6b7280' : '1px solid var(--border-color)',
            background: 'var(--bg-dark)', transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>🛑 Đã Thanh Lý</div>
          <div style={{ fontSize: '21px', fontWeight: 800, color: 'var(--text-secondary)', marginTop: '2px' }}>{liquidatedCount}</div>
        </div>

        <div
          className="card"
          onClick={() => { setFilterStatus('uncontracted'); setCurrentPage(1); }}
          style={{
            padding: '8px 12px', cursor: 'pointer', borderRadius: '10px',
            border: filterStatus === 'uncontracted' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
            background: 'rgba(245,158,11,0.08)', transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 700 }}>⚠️ Chưa Có HĐ</div>
          <div style={{ fontSize: '21px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>{uncontractedTenants.length} người</div>
        </div>

      </div>

      {/* ⚠️ NẾU CHỌN TAB "CHƯA CÓ HỢP ĐỒNG" ➔ HIỂN THỊ DANH SÁCH KHÁCH THUÊ CẦN TẠO HĐ */}
      {filterStatus === 'uncontracted' ? (
        <div className="card-table-container">
          <div style={{ padding: '12px 18px', background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color="#f59e0b" /> Khách Thuê Chưa Có Hợp Đồng Đang Hiệu Lực ({uncontractedTenants.length} người)
            </h3>
            <span style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Bấm nút "Tạo Hợp Đồng Ngay" để hoàn tất hồ sơ cho khách</span>
          </div>

          {uncontractedTenants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              <CheckCircle size={38} color="#10b981" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Tất cả khách thuê hiện tại đều đã có hợp đồng chính thức!</p>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ padding: '9px 14px', fontSize: '14px' }}>Tên Khách Thuê</th>
                  <th style={{ padding: '9px 14px', fontSize: '14px' }}>Số Điện Thoại</th>
                  <th style={{ padding: '9px 14px', fontSize: '14px' }}>Số CCCD</th>
                  <th style={{ padding: '9px 14px', fontSize: '14px' }}>Phòng Hiện Ở</th>
                  <th style={{ padding: '9px 14px', fontSize: '14px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {uncontractedTenants.map(t => {
                  const room = rooms.find(r => r.id === (t.roomId || t.RoomId));
                  return (
                    <tr key={t.id}>
                      <td style={{ padding: '7px 14px', fontSize: '15px' }}><strong>{t.fullName || t.name}</strong></td>
                      <td style={{ padding: '7px 14px', fontSize: '14.5px' }}>{t.phone}</td>
                      <td style={{ padding: '7px 14px', fontSize: '14.5px' }}>{t.cccd || t.CCCD}</td>
                      <td style={{ padding: '7px 14px' }}>
                        <span className="status-pill occupied" style={{ padding: '4px 10px', fontSize: '13px' }}>
                          {room ? `Phòng ${room.roomNumber}` : 'Chưa xếp phòng'}
                        </span>
                      </td>
                      <td style={{ padding: '7px 14px' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleOpenAddForTenant(t)}
                          style={{ fontWeight: 700, padding: '5px 12px', fontSize: '13.5px', height: '30px' }}
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
        /* BẢNG DANH SÁCH HỢP ĐỒNG KÈM BỘ LỌC TÍCH HỢP */
        <div className="card-table-container">
          
          {/* Thanh Toolbar tích hợp lọc và tìm kiếm */}
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.4)' }}>
            
            <div style={{ display: 'flex', gap: '8px', flex: '1 1 240px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tìm tên, SĐT, mã HĐ, số phòng..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  style={{ paddingLeft: '34px', fontSize: '14px', height: '36px', padding: '4px 10px 4px 34px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="form-control"
                value={filterZoneId}
                onChange={(e) => { setFilterZoneId(e.target.value); setCurrentPage(1); }}
                style={{ fontSize: '13.5px', height: '36px', padding: '4px 10px', width: 'auto', minWidth: '150px' }}
              >
                <option value="all">🏢 Tất cả khu ({zones.length})</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>

              <select
                className="form-control"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                style={{ fontSize: '13.5px', height: '36px', padding: '4px 10px', width: 'auto', minWidth: '150px' }}
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
              </select>
            </div>
          </div>

          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ padding: '9px 14px', fontSize: '14px' }}>Mã Hợp Đồng</th>
                <th style={{ padding: '9px 14px', fontSize: '14px' }}>Khu & Phòng</th>
                <th style={{ padding: '9px 14px', fontSize: '14px' }}>Khách Thuê</th>
                <th style={{ padding: '9px 14px', fontSize: '14px' }}>Thời Hạn Thuê</th>
                <th style={{ padding: '9px 14px', fontSize: '14px' }}>Tiền Thuê / Cọc</th>
                <th style={{ padding: '9px 14px', fontSize: '14px' }}>Trạng Thái</th>
                <th style={{ padding: '9px 14px', fontSize: '14px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '14.5px' }}>
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
                      title="Bấm vào dòng để xem chi tiết hợp đồng"
                    >
                      <td style={{ padding: '7px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '700', color: isRenewReq ? '#f59e0b' : '#6366f1', fontSize: '15px' }}>{c.contractCode}</span>
                          {isRenewReq && (
                            <span style={{
                              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                              color: '#ffffff',
                              fontSize: '11px',
                              fontWeight: '800',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                            }}>
                              🔥 DUYỆT
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Tạo: {formatDate(c.startDate)}</div>
                      </td>
                      <td style={{ padding: '7px 14px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' }}>
                          {room ? `Phòng ${room.roomNumber}` : 'Phòng N/A'}
                        </div>
                        {zone && <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>🏢 {zone.name}</div>}
                      </td>
                      <td style={{ padding: '7px 14px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' }}>{tenantName}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>SĐT: {tenantPhone}</div>
                      </td>
                      <td style={{ padding: '7px 14px', fontSize: '14.5px' }}>
                        <div>{formatDate(c.startDate)} - {formatDate(c.endDate)}</div>
                        {c.endDate && (
                          <div style={{ fontSize: '12.5px', color: statusInfo.type === 'expired' ? '#ef4444' : 'var(--text-muted)' }}>
                            {statusInfo.type === 'expired' ? '⚠️ Đã hết hạn' : `Hạn: ${formatDate(c.endDate)}`}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '7px 14px', fontSize: '14.5px' }}>
                        <div>Thuê: <strong style={{ color: '#34d399' }}>{formatVND(c.rentAmount)}</strong></div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Cọc: {formatVND(c.deposit)}</div>
                      </td>
                      <td style={{ padding: '7px 14px' }}>
                        <span className={`badge badge-${statusInfo.className}`} style={{
                          padding: '4px 11px',
                          fontSize: '13px',
                          borderRadius: '9999px',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '7px 14px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                          {statusInfo.isRequested ? (
                            <>
                              <button
                                className="btn btn-sm btn-primary"
                                title="Khách gửi yêu cầu gia hạn - Bấm để duyệt"
                                onClick={() => handleOpenRenew(c)}
                                style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 9px', height: '30px', fontSize: '13px' }}
                              >
                                <Clock size={14} /> Duyệt
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                title="Từ chối yêu cầu gia hạn"
                                onClick={() => handleOpenRejectRenew(c)}
                                style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', height: '30px', fontSize: '13px' }}
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
                                style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 9px', height: '30px', fontSize: '13px' }}
                              >
                                <Clock size={14} /> Gia Hạn
                              </button>
                            )
                          )}

                          <button
                            className="btn btn-sm btn-danger"
                            title="Xóa hợp đồng"
                            onClick={() => handleOpenDelete(c)}
                            style={{ padding: '3px 8px', height: '30px' }}
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

          <div style={{ padding: '0 14px 8px' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredContracts.length}
              pageSize={pageSize}
            />
          </div>
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
                    <Download size={15} /> Xuất PDF
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

                  {statusInfo.isActive && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleOpenTransfer(viewingContract, true)}
                      style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <RefreshCw size={15} /> Chuyển Đại Diện
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
              <div className="modal-body contract-paper" id="contract-pdf-content" style={{ background: '#ffffff', color: '#0f172a', padding: '32px 40px', overflowY: 'auto', flex: 1, fontFamily: 'serif, system-ui' }}>
                {viewingContract.customContent ? (
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.9', fontSize: '14.5px', color: '#0f172a', fontFamily: 'Times New Roman, serif' }}>
                    {viewingContract.customContent}
                  </div>
                ) : (
                  <>
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
                  </>
                )}
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
                    <label className="form-label">
                      Chọn Khách Thuê (Email) {editingContract ? '🔒 (Người đang sửa HĐ)' : '(Chưa có HĐ)'} *
                    </label>
                    <select
                      className="form-control"
                      required
                      value={formData.tenantId}
                      onChange={(e) => handleTenantChange(e.target.value)}
                    >
                      <option value="">-- Chọn Khách Thuê (Theo Email) --</option>
                      {selectableTenants.map(t => {
                        const tRoomId = t.roomId || t.RoomId;
                        const room = rooms.find(r => r.id === tRoomId);
                        const roomInfo = room ? ` [Phòng ${room.roomNumber}]` : '';
                        const emailDisplay = t.email || t.Email || 'Chưa có email';
                        const nameDisplay = t.fullName || t.name || 'Khách thuê';
                        return (
                          <option key={t.id} value={t.id}>
                            {emailDisplay} - {nameDisplay}{roomInfo} ({t.phone})
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
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      required
                      placeholder="0"
                      value={formatNumberWithDots(formData.rentAmount)}
                      onChange={(e) => setFormData({ ...formData, rentAmount: parseNumberFromDots(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tiền Đặt Cọc (VND)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      required
                      placeholder="0"
                      value={formatNumberWithDots(formData.deposit)}
                      onChange={(e) => setFormData({ ...formData, deposit: parseNumberFromDots(e.target.value) })}
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

                {(() => {
                  const selectedRoom = rooms.find(r => r.id === formData.roomId);
                  if (selectedRoom && (selectedRoom.status === 'Deposit' || selectedRoom.depositAmount)) {
                    return (
                      <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Sparkles size={18} style={{ flexShrink: 0 }} />
                        <div>
                          <strong>Phòng đang có cọc giữ chỗ:</strong> {formatVND(selectedRoom.depositAmount || 0)} (Khách: {selectedRoom.depositTenantName || 'Khách cọc'} - {selectedRoom.depositTenantPhone || ''}). Khi ký HĐ, cọc giữ chỗ này sẽ tự động chuyển thành hợp đồng chính thức.
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">⚡ Số Điện Ban Đầu (kWh)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="0"
                      value={formData.initialElecMeter || 0}
                      onChange={(e) => setFormData({ ...formData, initialElecMeter: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">💧 Số Nước Ban Đầu (m³)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="0"
                      value={formData.initialWaterMeter || 0}
                      onChange={(e) => setFormData({ ...formData, initialWaterMeter: Number(e.target.value) })}
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
                    type="text"
                    inputMode="numeric"
                    className="form-control"
                    placeholder="0"
                    value={formatNumberWithDots(settleForm.damageDeductionAmount)}
                    onChange={(e) => setSettleForm({ ...settleForm, damageDeductionAmount: parseNumberFromDots(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Khấu Trừ Chi Phí Khác (VND)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="form-control"
                    placeholder="0"
                    value={formatNumberWithDots(settleForm.otherDeductionAmount)}
                    onChange={(e) => setSettleForm({ ...settleForm, otherDeductionAmount: parseNumberFromDots(e.target.value) })}
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
                    type="text"
                    inputMode="numeric"
                    className="form-control"
                    required
                    placeholder="0"
                    value={formatNumberWithDots(renewForm.newRentAmount)}
                    onChange={e => setRenewForm({ ...renewForm, newRentAmount: parseNumberFromDots(e.target.value) })}
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
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '20px'
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
              {/* Cảnh báo đặc biệt khi hợp đồng đã thanh lý */}
              {(deletingContract.status || '').toLowerCase() === 'liquidated' && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.10)',
                  border: '1.5px solid rgba(245, 158, 11, 0.45)',
                  borderRadius: 10, padding: '13px 16px',
                  display: 'flex', gap: 12, alignItems: 'flex-start'
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>🔒</span>
                  <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                    <strong style={{ color: '#f59e0b', display: 'block', marginBottom: 4 }}>
                      Hợp đồng đã được Quyết Toán &amp; Thanh Lý
                    </strong>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Hợp đồng này đã có bản ghi quyết toán cọc trong hệ thống.
                      Xóa hợp đồng sẽ <strong style={{ color: '#f59e0b' }}>bị từ chối</strong> để bảo toàn lịch sử kiểm toán.
                      Nếu cần xóa, hãy liên hệ quản trị viên hệ thống.
                    </span>
                  </div>
                </div>
              )}

              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa vĩnh viễn hợp đồng này không? Dữ liệu hợp đồng sẽ bị gỡ bỏ khỏi hệ thống.
              </p>

              <div style={{ background: 'var(--bg-dark)', padding: '14px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mã hợp đồng:</span>
                  <strong style={{ color: '#6366f1' }}>{deletingContract.contractCode}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Trạng thái:</span>
                  <strong style={{ color: (deletingContract.status || '').toLowerCase() === 'liquidated' ? '#f59e0b' : 'var(--text-primary)' }}>
                    {(deletingContract.status || '').toLowerCase() === 'liquidated' ? '🔒 Đã thanh lý' :
                     (deletingContract.status || '').toLowerCase() === 'active' ? '🟢 Đang hiệu lực' :
                     (deletingContract.status || '').toLowerCase() === 'expired' ? '⏰ Hết hạn' : deletingContract.status}
                  </strong>
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

              {(deletingContract.status || '').toLowerCase() !== 'liquidated' && (
                <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: 8, padding: '12px 14px', fontSize: 12.5, color: '#f43f5e' }}>
                  <strong>⚠️ Lưu ý:</strong> Nếu khách thuê dọn đi và cần hoàn lại tiền cọc, vui lòng sử dụng tính năng <strong>"Quyết toán cọc &amp; Thanh lý"</strong> thay vì xóa hợp đồng để lưu lại lịch sử thu chi.
                </div>
              )}
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

      {/* ── MODAL: CHUYỂN QUYỀN ĐẠI DIỆN HỢP ĐỒNG (CỐ ĐỊNH LAYOUT) ── */}
      {transferModalOpen && transferringContract && (
        <div
          className="modal-backdrop"
          onClick={handleCloseTransferModal}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '20px'
          }}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '600px', width: '100%', maxHeight: '88vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              background: 'var(--bg-card)', borderRadius: '16px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', margin: 'auto'
            }}
          >
            {/* Header Cố Định */}
            <div className="modal-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)', padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {modalReturnToDetail && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={isTransferring}
                    onClick={handleCloseTransferModal}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 12 }}
                    title="Quay lại xem chi tiết hợp đồng"
                  >
                    <ArrowLeft size={14} /> Quay lại
                  </button>
                )}
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '18px', fontWeight: 800, margin: 0 }}>
                  <RefreshCw size={20} color="#f59e0b" /> Chuyển Quyền Đại Diện Hợp Đồng
                </h3>
              </div>
              <button className="btn-close" disabled={isTransferring} onClick={handleCloseTransferModal}>✕</button>
            </div>

            {/* Body Cuộn Độc Lập */}
            <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1, minHeight: 0 }}>
              
              {/* Banner Thông Tin */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '12px', padding: '12px 16px',
                display: 'flex', gap: 12, alignItems: 'flex-start',
                fontSize: '13px', lineHeight: '1.5', flexShrink: 0
              }}>
                <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ color: '#f59e0b' }}>Chuyển giao hợp đồng {transferringContract.contractCode}:</strong>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 3 }}>
                    Chuyển quyền đứng tên hợp đồng chính và bàn giao nghĩa vụ thanh toán tiền phòng sang thành viên ở ghép khi người đại diện cũ dọn đi.
                  </div>
                </div>
              </div>

              {/* Minh Họa Trực Quan: Cũ -> Mới */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12,
                alignItems: 'center', background: 'var(--bg-dark)',
                padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-color)',
                flexShrink: 0
              }}>
                {/* Đại diện hiện tại */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                    Đại diện hiện tại
                  </div>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981, #047857)',
                    margin: '0 auto 6px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16
                  }}>
                    {transferringContract.tenantName?.charAt(0) || 'P'}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    {transferringContract.tenantName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {transferringContract.tenantPhone}
                  </div>
                </div>

                {/* Mũi tên chuyển giao */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#f59e0b' }}>
                  <ChevronRight size={22} />
                  <span style={{ fontSize: '10px', fontWeight: 800, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 6px', borderRadius: 4 }}>
                    BÀN GIAO
                  </span>
                </div>

                {/* Đại diện mới */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                    Đại diện mới nhận HĐ
                  </div>
                  {(() => {
                    const selectedOccupant = transferOccupants.find(o => o.id === transferForm.newTenantProfileId);
                    return selectedOccupant ? (
                      <>
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          margin: '0 auto 6px', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16
                        }}>
                          {selectedOccupant.fullName?.charAt(0) || 'N'}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#818cf8' }}>
                          {selectedOccupant.fullName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {selectedOccupant.phone}
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: '12px 6px', border: '1px dashed var(--border-color)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        Chưa chọn thành viên
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Chọn Thành Viên Ở Ghép */}
              <div style={{ flexShrink: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', marginBottom: 6 }}>
                  Chọn thành viên ở ghép đứng tên đại diện mới <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {loadingOccupants ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>Đang tải danh sách thành viên...</div>
                ) : transferOccupants.length === 0 ? (
                  <div style={{ padding: 16, background: 'rgba(15,23,42,0.6)', borderRadius: 10, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Phòng này hiện không có thành viên ở ghép nào để chuyển giao.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    {transferOccupants.map(o => {
                      const isSelected = transferForm.newTenantProfileId === o.id;
                      return (
                        <div
                          key={o.id}
                          onClick={() => setTransferForm({ ...transferForm, newTenantProfileId: o.id })}
                          style={{
                            padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                            border: isSelected ? '2px solid #6366f1' : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-dark)',
                            display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s',
                            boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.2)' : 'none'
                          }}
                        >
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: isSelected ? '#6366f1' : 'rgba(99, 102, 241, 0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0
                          }}>
                            {o.fullName?.charAt(0) || 'U'}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: isSelected ? '#818cf8' : 'var(--text-primary)' }}>
                              {o.fullName}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{o.phone}</div>
                          </div>
                          {isSelected && <CheckCircle size={16} color="#6366f1" style={{ flexShrink: 0 }} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Xử Lý Người Đại Diện Cũ */}
              <div style={{ flexShrink: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', marginBottom: 6 }}>
                  Phương án đối với người đại diện cũ ({transferringContract.tenantName}) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div
                    onClick={() => setTransferForm({ ...transferForm, removeOldTenant: true })}
                    style={{
                      padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                      border: transferForm.removeOldTenant ? '2px solid #ef4444' : '1px solid var(--border-color)',
                      background: transferForm.removeOldTenant ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-dark)',
                      transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 6,
                      boxShadow: transferForm.removeOldTenant ? '0 0 12px rgba(239, 68, 68, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '13.5px', color: '#ef4444' }}>
                        <UserX size={16} color="#ef4444" /> Gỡ khỏi phòng
                      </span>
                      <input type="radio" checked={transferForm.removeOldTenant} readOnly style={{ accentColor: '#ef4444' }} />
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      Người cũ dọn đi hoàn toàn, gỡ khỏi danh sách thành viên phòng này.
                    </span>
                  </div>

                  <div
                    onClick={() => setTransferForm({ ...transferForm, removeOldTenant: false })}
                    style={{
                      padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                      border: !transferForm.removeOldTenant ? '2px solid #6366f1' : '1px solid var(--border-color)',
                      background: !transferForm.removeOldTenant ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-dark)',
                      transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 6,
                      boxShadow: !transferForm.removeOldTenant ? '0 0 12px rgba(99, 102, 241, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '13.5px', color: '#818cf8' }}>
                        <Users size={16} color="#6366f1" /> Giữ lại Ở ghép
                      </span>
                      <input type="radio" checked={!transferForm.removeOldTenant} readOnly style={{ accentColor: '#6366f1' }} />
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      Người cũ vẫn ở phòng nhưng chuyển thành Thành viên ở ghép.
                    </span>
                  </div>
                </div>
              </div>

              {/* Ghi Chú */}
              <div style={{ flexShrink: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', marginBottom: 6 }}>
                  Ghi chú bàn giao (Tùy chọn)
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Lý do chuyển giao, thỏa thuận tiền cọc giữa các bên..."
                  value={transferForm.note}
                  onChange={e => setTransferForm({ ...transferForm, note: e.target.value })}
                  style={{ resize: 'vertical', fontSize: '13.5px' }}
                />
              </div>
            </div>

            {/* Footer Cố Định */}
            <div className="modal-footer" style={{ position: 'sticky', bottom: 0, zIndex: 10, background: 'var(--bg-card)', padding: '14px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isTransferring}
                onClick={handleCloseTransferModal}
              >
                {modalReturnToDetail ? '⬅ Quay Lại Chi Tiết' : 'Hủy Bỏ'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!transferForm.newTenantProfileId || isTransferring}
                onClick={handleConfirmTransfer}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <CheckCircle size={16} /> {isTransferring ? 'Đang xử lý...' : 'Xác Nhận Chuyển Quyền'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ MODAL CẤU HÌNH MẪU HỢP ĐỒNG TÙY BIẾN (CUSTOM TEMPLATE ENGINE) */}
      {templateModalOpen && (
        <div className="modal-overlay" onClick={() => setTemplateModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1050px', width: '100%', maxHeight: '94vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden' }}>
            
            {/* Header */}
            <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={20} color="#818cf8" />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                    Cấu Hình Mẫu Hợp Đồng Thuê Nhà
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Tùy chỉnh nội dung điều khoản pháp lý và quy định riêng áp dụng tự động cho mọi khách thuê mới
                  </p>
                </div>
                <span className="badge" style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  borderRadius: '20px',
                  background: isCustomTemplate ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  color: isCustomTemplate ? '#10b981' : '#818cf8',
                  border: isCustomTemplate ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)'
                }}>
                  {isCustomTemplate ? '✨ Đang dùng Mẫu Tùy Biến Riêng' : '🏛️ Đang dùng Mẫu Chuẩn Bộ Xây Dựng'}
                </span>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => setTemplateModalOpen(false)}>✕</button>
            </div>

            {/* Sub-Header Toolbar (Tabs & Quick Tools) */}
            <div style={{ padding: '10px 24px', background: 'rgba(15, 23, 42, 0.4)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 6, background: 'var(--bg-dark)', padding: 4, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setActiveTemplateTab('editor')}
                  style={{
                    padding: '6px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeTemplateTab === 'editor' ? 'var(--primary)' : 'transparent',
                    color: activeTemplateTab === 'editor' ? '#fff' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Edit size={14} /> Soạn Thảo Mẫu
                </button>
                <button
                  type="button"
                  onClick={handlePreviewTemplate}
                  style={{
                    padding: '6px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeTemplateTab === 'preview' ? 'var(--primary)' : 'transparent',
                    color: activeTemplateTab === 'preview' ? '#fff' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <BookOpen size={14} /> Xem Trước Trực Quan
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileImport}
                  accept=".txt,.doc,.docx"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12.5px' }}
                  title="Nhập nội dung mẫu từ file Word hoặc Text có sẵn"
                >
                  <Upload size={14} /> 📥 Import File (.txt / Word)
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={handleResetTemplate}
                  disabled={isSavingTemplate}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12.5px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                  title="Khôi phục về mẫu hợp đồng theo quy định chuẩn của Bộ Xây Dựng"
                >
                  <RefreshCw size={14} /> 🔄 Khôi Phục Mẫu Chuẩn
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ padding: '16px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {isLoadingTemplate ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={32} className="spin-slow" style={{ marginBottom: 12, color: 'var(--primary)' }} />
                  <div>Đang tải nội dung mẫu hợp đồng...</div>
                </div>
              ) : activeTemplateTab === 'editor' ? (
                <>
                  {/* Variable Chips Toolbar */}
                  <div style={{ background: 'var(--bg-dark)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={14} color="#818cf8" /> BẤM ĐỂ CHÈN BIẾN SỐ TỰ ĐỘNG VÀO VỊ TRÍ CON TRỎ:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {[
                        { tag: '{{TEN_KHACH}}', label: 'Tên Khách', color: '#60a5fa' },
                        { tag: '{{SDT_KHACH}}', label: 'SĐT Khách', color: '#60a5fa' },
                        { tag: '{{CCCD_KHACH}}', label: 'CCCD Khách', color: '#60a5fa' },
                        { tag: '{{SO_PHONG}}', label: 'Số Phòng', color: '#34d399' },
                        { tag: '{{TEN_KHU_TRO}}', label: 'Tên Khu Trọ', color: '#34d399' },
                        { tag: '{{DIA_CHI_KHU_TRO}}', label: 'Địa Chỉ Khu', color: '#34d399' },
                        { tag: '{{DIEN_TICH}}', label: 'Diện Tích', color: '#34d399' },
                        { tag: '{{GIA_THUE}}', label: 'Giá Thuê', color: '#fbbf24' },
                        { tag: '{{TIEN_COC}}', label: 'Tiền Cọc', color: '#fbbf24' },
                        { tag: '{{GIA_DIEN}}', label: 'Giá Điện', color: '#fbbf24' },
                        { tag: '{{GIA_NUOC}}', label: 'Giá Nước', color: '#fbbf24' },
                        { tag: '{{NGAY_DONG_TIEN}}', label: 'Hạn Đóng Tiền', color: '#fbbf24' },
                        { tag: '{{NGAY_BAT_DAU}}', label: 'Ngày Bắt Đầu', color: '#a78bfa' },
                        { tag: '{{NGAY_KET_THUC}}', label: 'Ngày Hết Hạn', color: '#a78bfa' },
                        { tag: '{{THOI_HAN_THUE}}', label: 'Thời Hạn', color: '#a78bfa' },
                        { tag: '{{NGAY_KY}}', label: 'Ngày Ký', color: '#a78bfa' },
                        { tag: '{{TEN_CHU_TRO}}', label: 'Tên Chủ Trọ', color: '#f472b6' },
                        { tag: '{{SDT_CHU_TRO}}', label: 'SĐT Chủ Trọ', color: '#f472b6' },
                        { tag: '{{STK_CHU_TRO}}', label: 'STK Nhận Tiền', color: '#f472b6' },
                        { tag: '{{DIEU_KHOAN_RIENG}}', label: 'Điều Khoản Riêng', color: '#38bdf8' },
                      ].map(item => (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => handleInsertVariable(item.tag)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${item.color}55`,
                            color: item.color,
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title={`Chèn biến ${item.tag}`}
                        >
                          <span style={{ fontWeight: 700 }}>+</span> {item.label} <code style={{ fontSize: '10px', opacity: 0.8 }}>{item.tag}</code>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Textarea Editor */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <textarea
                      ref={textareaRef}
                      className="form-control"
                      value={templateContent}
                      onChange={e => setTemplateContent(e.target.value)}
                      placeholder="Dán hoặc soạn thảo nội dung hợp đồng mẫu tại đây..."
                      style={{
                        flex: 1,
                        minHeight: '380px',
                        fontFamily: 'Consolas, "Fira Code", monospace',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        padding: '16px',
                        background: 'var(--bg-dark)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        resize: 'vertical',
                        whiteSpace: 'pre'
                      }}
                    />
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Info size={14} color="#818cf8" /> Mẹo: Mọi hợp đồng tạo mới sẽ tự động nạp dữ liệu khách và phòng vào đúng các vị trí thẻ biến số dạng <code>{"{{TEN_BIEN}}"}</code>.
                  </div>
                </>
              ) : (
                /* Preview Paper View (A4 Document Layout with Full Length Continuous Scrolling) */
                <div style={{
                  background: 'var(--bg-dark, #0b0f19)',
                  padding: '24px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  minHeight: '450px'
                }}>
                  <div style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    padding: '48px 56px',
                    borderRadius: '8px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    fontFamily: '"Times New Roman", Times, serif',
                    lineHeight: '1.9',
                    fontSize: '15px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    width: '100%',
                    maxWidth: '850px',
                    height: 'fit-content',
                    minHeight: '100%',
                    border: '1px solid #cbd5e1',
                    boxSizing: 'border-box'
                  }}>
                    {previewContent || 'Đang biên dịch bản xem trước mẫu hợp đồng...'}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {templateContent.length} ký tự
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setTemplateModalOpen(false)}>
                  Đóng
                </button>
                {activeTemplateTab === 'editor' && (
                  <button type="button" className="btn btn-secondary" onClick={handlePreviewTemplate} style={{ color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.4)' }}>
                    <BookOpen size={16} /> Xem Thử
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                >
                  <CheckCircle size={16} /> {isSavingTemplate ? 'Đang lưu...' : 'Lưu Mẫu Hợp Đồng Mới'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};



