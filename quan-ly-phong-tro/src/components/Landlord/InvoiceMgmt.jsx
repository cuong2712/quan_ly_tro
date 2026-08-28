import React, { useState } from 'react';
import { 
  Receipt, Plus, Search, Edit, Trash2, Printer, Mail, 
  CheckCircle, Clock, Zap, AlertCircle, AlertTriangle, 
  MessageSquare, Check, X, Eye, ArrowRight, DollarSign,
  Home, BarChart3, FileSpreadsheet, Download, Building2, Filter
} from 'lucide-react';
import { formatVND, formatDate, exportToPDF, exportToExcel, formatNumberWithDots, parseNumberFromDots } from '../../utils/formatters';
import { invoiceService, utilityService } from '../../services';
import { BulkUtilityModal } from './BulkUtilityModal';
import { Pagination } from '../Common/Pagination';
const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';

const getImageFullUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const InvoiceMgmt = ({ invoices = [], setInvoices, rooms = [], zones = [], tenants = [], utilityLogs = [], services = [], onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'disputed' | 'Unpaid' | 'Paid' | 'Overdue'
  const [monthFilter, setMonthFilter] = useState(''); // '' or 'YYYY-MM'
  const [zoneFilter, setZoneFilter] = useState('all'); // 'all' or zoneId
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [resolvingInvoice, setResolvingInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [singleSaving, setSingleSaving] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Form lập hóa đơn lẻ từng phòng
  const [formData, setFormData] = useState({
    rentFee: 4200000,
    elecFee: 350000,
    waterFee: 270000,
    serviceFee: 270000,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'Unpaid',
  });

  // Form xử lý khiếu nại của khách thuê
  const [disputeResolveData, setDisputeResolveData] = useState({
    action: 'Accept', // 'Accept' | 'Reject'
    reply: '',
    rentFee: 0,
    elecFee: 0,
    waterFee: 0,
    serviceFee: 0,
    dueDate: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  // Chuẩn hóa props thành mảng an toàn
  const invoicesList = Array.isArray(invoices) ? invoices : (invoices?.items || []);
  const roomsList = Array.isArray(rooms) ? rooms : (rooms?.items || []);
  const zonesList = Array.isArray(zones) ? zones : (zones?.items || []);
  const tenantsList = Array.isArray(tenants) ? tenants : (tenants?.items || []);
  const utilityLogsList = Array.isArray(utilityLogs) ? utilityLogs : (utilityLogs?.items || []);
  const servicesList = Array.isArray(services) ? services : (services?.items || []);

  const pendingDisputesCount = invoicesList.filter(i => i.isReported && i.disputeStatus === 'Pending').length;

  const currentMonthKey = monthFilter || new Date().toISOString().slice(0, 7);

  const normalizeRoomNum = (num) => String(num || '').toLowerCase().replace(/^p\.?\s*/i, '').trim();
  const isRoomMatchingInvoice = (r, i) => {
    if (!r || !i) return false;
    const rId = String(r.id || r.Id || '').toLowerCase();
    const iRoomId = String(i.roomId || i.RoomId || '').toLowerCase();
    if (rId && iRoomId && rId === iRoomId) return true;
    const rNum = normalizeRoomNum(r.roomNumber || r.RoomNumber);
    const iNum = normalizeRoomNum(i.roomNumber || i.RoomNumber);
    return !!(rNum && iNum && rNum === iNum);
  };

  // Lọc theo Khu trọ
  const roomMatchesZone = (roomId, zId) => {
    if (zId === 'all') return true;
    const r = roomsList.find(room => room.id === roomId || room.Id === roomId);
    return r && (r.zoneId === zId || r.ZoneId === zId);
  };

  const relevantRooms = zoneFilter === 'all' ? roomsList : roomsList.filter(r => r.zoneId === zoneFilter || r.ZoneId === zoneFilter);
  const occupiedRooms = relevantRooms.filter(r => (r.status || '').toLowerCase() === 'occupied');
  const targetRooms = occupiedRooms.length > 0 ? occupiedRooms : relevantRooms;

  const billedRoomsThisMonth = targetRooms.filter(r => 
    invoicesList.some(i => isRoomMatchingInvoice(r, i) && i.month === currentMonthKey)
  );
  const unbilledRoomsThisMonth = targetRooms.filter(r => 
    !invoicesList.some(i => isRoomMatchingInvoice(r, i) && i.month === currentMonthKey)
  );

  // Bộ lọc hóa đơn tổng hợp
  const filteredInvoices = invoicesList.filter(inv => {
    const code = (inv.invoiceCode || '').toLowerCase();
    const roomNum = (inv.roomNumber || inv.roomId || '').toLowerCase();
    const tenantName = (inv.tenantName || '').toLowerCase();
    const matchesSearch = code.includes(searchTerm.toLowerCase()) || roomNum.includes(searchTerm.toLowerCase()) || tenantName.includes(searchTerm.toLowerCase());
    const matchesMonth = !monthFilter || inv.month === monthFilter;
    const matchesZone = zoneFilter === 'all' || roomMatchesZone(inv.roomId, zoneFilter);

    if (statusFilter === 'disputed') {
      return matchesSearch && matchesMonth && matchesZone && (inv.isReported && inv.disputeStatus === 'Pending');
    }
    const matchesStatus = statusFilter === 'all' || (inv.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesMonth && matchesZone && matchesStatus;
  });

  // KPI Calculations dựa trên khu trọ và tháng đã chọn
  const relevantInvoices = invoicesList.filter(inv => {
    const matchesMonth = !monthFilter || inv.month === monthFilter;
    const matchesZone = zoneFilter === 'all' || roomMatchesZone(inv.roomId, zoneFilter);
    return matchesMonth && matchesZone;
  });

  const totalCollected = relevantInvoices
    .filter(i => (i.status || '').toLowerCase() === 'paid')
    .reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);

  const totalPending = relevantInvoices
    .filter(i => (i.status || '').toLowerCase() !== 'paid')
    .reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);

  const totalRoomsCount = relevantRooms.length;
  const occupiedRoomsCount = relevantRooms.filter(r => (r.status || '').toLowerCase() === 'occupied').length;
  const occupancyPercentage = totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : (relevantInvoices.length > 0 ? 100 : 0);

  const totalElecWater = relevantInvoices.reduce((sum, i) => sum + (Number(i.elecFee) || 0) + (Number(i.waterFee) || 0), 0);

  const totalPages = Math.ceil(filteredInvoices.length / pageSize);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const [editingInvoice, setEditingInvoice] = useState(null);
  const [singleInvoiceForm, setSingleInvoiceForm] = useState({
    roomId: '',
    zoneId: '',
    month: new Date().toISOString().slice(0, 7),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    entryMode: 'meter', // 'meter' | 'direct'
    oldElec: 0,
    newElec: 0,
    oldWater: 0,
    newWater: 0,
    rentFee: 0,
    elecFee: 0,
    waterFee: 0,
    serviceFee: 0,
  });

  const getRoomServiceFee = (roomId, zoneId) => {
    let totalService = 0;
    const currentZone = zonesList.find(z => (z.id || z.Id) === zoneId);
    const roomObj = roomsList.find(r => (r.id || r.Id) === roomId);
    const roomTenants = (roomObj?.tenants || tenantsList.filter(t => (t.roomId || t.RoomId) === roomId)) || [];
    const totalVehicles = roomTenants.reduce((sum, t) => sum + (Number(t.vehicleCount || t.VehicleCount) || 0), 0);

    if (currentZone && currentZone.services) {
      currentZone.services.forEach(s => {
        const isParking = (s.name || s.Name || '').toLowerCase().includes('xe');
        if (isParking) {
          if (totalVehicles > 0) {
            totalService += (Number(s.price || s.Price || 0) * totalVehicles);
          }
        } else {
          totalService += Number(s.price || s.Price || 0);
        }
      });
    }
    return totalService;
  };

  const handleOpenCreateSingle = () => {
    const firstRoom = roomsList[0];
    const initialZoneId = firstRoom ? (firstRoom.zoneId || firstRoom.ZoneId || '') : '';
    const initialRent = firstRoom ? (firstRoom.price || firstRoom.Price || 0) : 0;
    const initialOldElec = firstRoom ? (firstRoom.elecMeter || firstRoom.ElecMeter || 0) : 0;
    const initialOldWater = firstRoom ? (firstRoom.waterMeter || firstRoom.WaterMeter || 0) : 0;

    setSingleInvoiceForm({
      roomId: firstRoom ? (firstRoom.id || firstRoom.Id) : '',
      zoneId: initialZoneId,
      month: new Date().toISOString().slice(0, 7),
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      entryMode: 'meter',
      oldElec: initialOldElec,
      newElec: initialOldElec,
      oldWater: initialOldWater,
      newWater: initialOldWater,
      rentFee: initialRent,
      elecFee: 0,
      waterFee: 0,
      serviceFee: firstRoom ? getRoomServiceFee(firstRoom.id || firstRoom.Id, initialZoneId) : 0,
    });
    setIsCreateModalOpen(true);
  };

  const handleSingleRoomChange = (roomId) => {
    const room = roomsList.find(r => (r.id || r.Id) === roomId);
    if (!room) return;
    const zId = room.zoneId || room.ZoneId || singleInvoiceForm.zoneId;
    const oldE = room.elecMeter || room.ElecMeter || 0;
    const oldW = room.waterMeter || room.WaterMeter || 0;
    const price = room.price || room.Price || 0;

    setSingleInvoiceForm(prev => ({
      ...prev,
      roomId,
      zoneId: zId,
      oldElec: oldE,
      newElec: oldE,
      oldWater: oldW,
      newWater: oldW,
      rentFee: price,
      serviceFee: getRoomServiceFee(roomId, zId),
    }));
  };

  const handleSingleZoneChange = (zoneId) => {
    const zoneRooms = roomsList.filter(r => !zoneId || (r.zoneId || r.ZoneId) === zoneId);
    const firstRoom = zoneRooms[0];
    if (firstRoom) {
      handleSingleRoomChange(firstRoom.id || firstRoom.Id);
    } else {
      setSingleInvoiceForm(prev => ({ ...prev, zoneId, roomId: '' }));
    }
  };

  const handleCreateSingleSubmit = async (e) => {
    e.preventDefault();
    if (!singleInvoiceForm.roomId) {
      alert('Vui lòng chọn phòng cần lập hóa đơn!');
      return;
    }

    const elecPrice = 3500;
    const waterPrice = 18000;

    const oldE = Number(singleInvoiceForm.oldElec || 0);
    const newE = Number(singleInvoiceForm.newElec || 0);
    const oldW = Number(singleInvoiceForm.oldWater || 0);
    const newW = Number(singleInvoiceForm.newWater || 0);

    const calculatedElecFee = singleInvoiceForm.entryMode === 'meter' 
      ? Math.max(0, newE - oldE) * elecPrice 
      : Number(singleInvoiceForm.elecFee || 0);

    const calculatedWaterFee = singleInvoiceForm.entryMode === 'meter' 
      ? Math.max(0, newW - oldW) * waterPrice 
      : Number(singleInvoiceForm.waterFee || 0);

    const totalAmount = Number(singleInvoiceForm.rentFee || 0) + calculatedElecFee + calculatedWaterFee + Number(singleInvoiceForm.serviceFee || 0);

    setSingleSaving(true);
    try {
      if (singleInvoiceForm.entryMode === 'meter' && utilityService && utilityService.record) {
        try {
          await utilityService.record({
            roomId: singleInvoiceForm.roomId,
            newElec: newE,
            newWater: newW,
            month: singleInvoiceForm.month,
          });
        } catch (utilErr) {
          console.warn('Ghi chỉ số điện nước tự động:', utilErr);
        }
      }

      const selectedRoom = roomsList.find(r => (r.id || r.Id) === singleInvoiceForm.roomId);
      const existing = invoicesList.find(i => 
        isRoomMatchingInvoice(selectedRoom, i) && 
        i.month === singleInvoiceForm.month
      );

      const payload = {
        roomId: singleInvoiceForm.roomId,
        month: singleInvoiceForm.month,
        rentFee: Number(singleInvoiceForm.rentFee || 0),
        elecFee: calculatedElecFee,
        waterFee: calculatedWaterFee,
        serviceFee: Number(singleInvoiceForm.serviceFee || 0),
        totalAmount,
        dueDate: singleInvoiceForm.dueDate ? new Date(singleInvoiceForm.dueDate).toISOString() : new Date().toISOString(),
        status: 'Unpaid',
      };

      if (existing && invoiceService.updateInvoice) {
        await invoiceService.updateInvoice(existing.id, payload);
      } else if (invoiceService.createInvoice) {
        await invoiceService.createInvoice(payload);
      }

      setIsCreateModalOpen(false);
      alert(existing 
        ? `✅ Đã cập nhật hóa đơn tháng ${singleInvoiceForm.month} cho phòng ${selectedRoom?.roomNumber || ''} thành công!`
        : `✅ Đã lập & phát hành hóa đơn tháng ${singleInvoiceForm.month} cho phòng ${selectedRoom?.roomNumber || ''} thành công!`);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi lập hóa đơn lẻ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSingleSaving(false);
    }
  };

  const handleOpenEdit = (inv) => {
    setEditingInvoice(inv);
    setFormData({
      rentFee: inv.rentFee || 0,
      elecFee: inv.elecFee || 0,
      waterFee: inv.waterFee || 0,
      serviceFee: inv.serviceFee || 0,
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: inv.status || 'Unpaid',
    });
    setIsModalOpen(true);
  };

  const handleOpenResolveDispute = (inv) => {
    setResolvingInvoice(inv);
    setDisputeResolveData({
      action: 'Accept',
      reply: 'Chủ trọ đã kiểm tra lại số liệu và điều chỉnh hóa đơn.',
      rentFee: inv.rentFee || 0,
      elecFee: inv.elecFee || 0,
      waterFee: inv.waterFee || 0,
      serviceFee: inv.serviceFee || 0,
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
  };

  const handleSendEmail = (inv) => {
    alert(`Đã gửi hóa đơn ${inv.invoiceCode} tới email khách thuê thành công!`);
  };

  const handleDeleteInvoice = async (inv, e) => {
    e?.stopPropagation();
    if (!window.confirm(`⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA HÓA ĐƠN NÀY?\n\n• Mã hóa đơn: ${inv.invoiceCode || inv.id}\n• Phòng: ${inv.roomNumber || inv.roomId}\n• Tháng: ${inv.month}\n• Tổng tiền: ${formatVND(inv.totalAmount)}\n\nSau khi xóa, hóa đơn và các dữ liệu liên quan sẽ bị loại bỏ hoàn toàn để bạn có thể dễ dàng test lại.`)) {
      return;
    }

    try {
      await invoiceService.deleteInvoice(inv.id);
      setInvoices(invoicesList.filter(i => i.id !== inv.id));
      if (viewingInvoice?.id === inv.id) {
        setViewingInvoice(null);
      }
      alert(`✅ Đã xóa hóa đơn ${inv.invoiceCode || ''} thành công!`);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi xóa hóa đơn: ' + (err.response?.data?.message || err.message));
    }
  };

  // Xuất Báo Cáo Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) {
      alert('Không có dữ liệu hóa đơn để xuất Excel!');
      return;
    }

    const reportData = filteredInvoices.map(inv => {
      const room = roomsList.find(r => r.id === inv.roomId);
      const isPaid = (inv.status || '').toLowerCase() === 'paid';
      return {
        'Mã Hóa Đơn': inv.invoiceCode || '',
        'Kỳ Tháng': inv.month || '',
        'Phòng': inv.roomNumber || (room ? room.roomNumber : inv.roomId),
        'Khách Thuê': inv.tenantName || 'Khách thuê',
        'Tiền Thuê Phòng': inv.rentFee || 0,
        'Tiền Điện': inv.elecFee || 0,
        'Tiền Nước': inv.waterFee || 0,
        'Phí Dịch Vụ': inv.serviceFee || 0,
        'Tổng Tiền (VNĐ)': inv.totalAmount || 0,
        'Trạng Thái': isPaid ? 'Đã thanh toán' : (inv.status === 'Overdue' ? 'Quá hạn' : 'Chưa thanh toán'),
        'Hạn Thanh Toán': inv.dueDate ? formatDate(inv.dueDate) : '',
      };
    });

    exportToExcel(reportData, `Bao_Cao_Doanh_Thu_SmartRent_${monthFilter || 'Tat_Ca'}.xlsx`, 'Doanh Thu');
  };

  // Xuất Báo Cáo CSV (.csv)
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      alert('Không có dữ liệu hóa đơn để xuất CSV!');
      return;
    }

    const headers = ['Mã Hóa Đơn', 'Kỳ Tháng', 'Phòng', 'Khách Thuê', 'Tiền Phòng', 'Tiền Điện', 'Tiền Nước', 'Phí Dịch Vụ', 'Tổng Tiền', 'Trạng Thái', 'Hạn Thanh Toán'];
    const rows = filteredInvoices.map(inv => {
      const room = roomsList.find(r => r.id === inv.roomId);
      const isPaid = (inv.status || '').toLowerCase() === 'paid';
      return [
        `"${inv.invoiceCode || ''}"`,
        `"${inv.month || ''}"`,
        `"${inv.roomNumber || (room ? room.roomNumber : inv.roomId)}"`,
        `"${inv.tenantName || 'Khách thuê'}"`,
        inv.rentFee || 0,
        inv.elecFee || 0,
        inv.waterFee || 0,
        inv.serviceFee || 0,
        inv.totalAmount || 0,
        `"${isPaid ? 'Đã thanh toán' : (inv.status === 'Overdue' ? 'Quá hạn' : 'Chưa thanh toán')}"`,
        `"${inv.dueDate ? formatDate(inv.dueDate) : ''}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_Cao_Hoa_Don_SmartRent_${monthFilter || 'Tat_Ca'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setSaving(true);

    const totalAmount = Number(formData.rentFee || 0) + Number(formData.elecFee || 0) + Number(formData.waterFee || 0) + Number(formData.serviceFee || 0);

    try {
      const payload = {
        rentFee: Number(formData.rentFee || 0),
        elecFee: Number(formData.elecFee || 0),
        waterFee: Number(formData.waterFee || 0),
        serviceFee: Number(formData.serviceFee || 0),
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : new Date().toISOString(),
        status: formData.status,
      };

      if (invoiceService && invoiceService.updateInvoice) {
        await invoiceService.updateInvoice(editingInvoice.id, payload);
      } else if (invoiceService && invoiceService.updateStatus) {
        await invoiceService.updateStatus(editingInvoice.id, formData.status);
      }

      setInvoices(invoicesList.map(inv => inv.id === editingInvoice.id ? {
        ...inv,
        rentFee: Number(formData.rentFee || 0),
        elecFee: Number(formData.elecFee || 0),
        waterFee: Number(formData.waterFee || 0),
        serviceFee: Number(formData.serviceFee || 0),
        totalAmount,
        dueDate: formData.dueDate,
        status: formData.status,
      } : inv));

      setIsModalOpen(false);
      alert(`✅ Đã cập nhật điều chỉnh hóa đơn ${editingInvoice.invoiceCode} thành công!`);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi cập nhật hóa đơn: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleResolveDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!resolvingInvoice) return;

    if (disputeResolveData.action === 'Reject' && !disputeResolveData.reply.trim()) {
      alert('Vui lòng nhập lý do/giải thích cho khách thuê khi từ chối yêu cầu.');
      return;
    }

    setResolving(true);
    try {
      const payload = {
        action: disputeResolveData.action,
        reply: disputeResolveData.reply.trim() || undefined,
        rentFee: disputeResolveData.action === 'Accept' ? Number(disputeResolveData.rentFee || 0) : undefined,
        elecFee: disputeResolveData.action === 'Accept' ? Number(disputeResolveData.elecFee || 0) : undefined,
        waterFee: disputeResolveData.action === 'Accept' ? Number(disputeResolveData.waterFee || 0) : undefined,
        serviceFee: disputeResolveData.action === 'Accept' ? Number(disputeResolveData.serviceFee || 0) : undefined,
        dueDate: disputeResolveData.dueDate ? new Date(disputeResolveData.dueDate).toISOString() : undefined,
      };

      const updated = await invoiceService.resolveDispute(resolvingInvoice.id, payload);

      setInvoices(invoicesList.map(inv => inv.id === resolvingInvoice.id ? { ...inv, ...updated } : inv));
      setResolvingInvoice(null);
      alert(`✅ Đã ${disputeResolveData.action === 'Accept' ? 'điều chỉnh lại' : 'phản hồi'} hóa đơn ${resolvingInvoice.invoiceCode} thành công! Hệ thống đã gửi thông báo đến khách thuê.`);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi xử lý khiếu nại: ' + (err.response?.data?.message || err.message));
    } finally {
      setResolving(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header with Title & Export Actions */}
      <div className="page-header" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '25px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt size={28} color="#6366f1" /> Quản Lý Hóa Đơn & Doanh Thu
          </h2>
          <p className="page-subtitle" style={{ fontSize: '14px', margin: '4px 0 0 0' }}>
            Theo dõi tổng quan tài chính, công nợ, quản lý thanh toán hóa đơn và xuất báo cáo kế toán
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleOpenCreateSingle} 
            style={{ fontSize: '13.5px', height: '36px', padding: '6px 14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }} 
            title="Lập hóa đơn tiền nhà và chốt điện nước cho từng phòng lẻ"
          >
            <Plus size={16} /> Lập Hóa Đơn Lẻ
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsBulkModalOpen(true)} 
            style={{ fontSize: '13.5px', height: '36px', padding: '6px 14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }} 
            title="Nhập chỉ số điện nước từ file Excel để lập hàng loạt hóa đơn"
          >
            <FileSpreadsheet size={16} /> Lập Hóa Đơn Hàng Loạt (Excel)
          </button>
          <button className="btn btn-secondary" onClick={handleExportExcel} style={{ fontSize: '13.5px', height: '36px', padding: '6px 14px', fontWeight: 600 }} title="Xuất dữ liệu hóa đơn ra file Excel">
            <FileSpreadsheet size={16} color="#10b981" /> Xuất Excel
          </button>
          <button className="btn btn-secondary" onClick={handleExportCSV} style={{ fontSize: '13.5px', height: '36px', padding: '6px 14px', fontWeight: 600 }} title="Tải file CSV cho kế toán">
            <Download size={16} color="#0ea5e9" /> Xuất CSV
          </button>
        </div>
      </div>

      {/* 4 Thẻ KPI Doanh Thu & Hiệu Suất (Tách biệt, ngắn gọn, có khoảng cách rõ ràng) */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {/* 1. Tổng Thu Đã Thu */}
        <div
          className="card"
          onClick={() => { setStatusFilter('Paid'); setCurrentPage(1); }}
          style={{
            flex: '1 1 200px',
            maxWidth: '350px',
            padding: '14px 18px',
            cursor: 'pointer',
            borderRadius: '14px',
            border: statusFilter === 'Paid' ? '2px solid #10b981' : '1px solid var(--border-color)',
            background: 'rgba(16, 185, 129, 0.08)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
          }}
        >
          <div style={{ fontSize: '14.5px', color: '#10b981', fontWeight: 700 }}>💵 Tổng Thu Đã Thu</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{formatVND(totalCollected)}</div>
        </div>

        {/* 2. Công Nợ Chưa Thu */}
        <div
          className="card"
          onClick={() => { setStatusFilter('Unpaid'); setCurrentPage(1); }}
          style={{
            flex: '1 1 200px',
            maxWidth: '350px',
            padding: '14px 18px',
            cursor: 'pointer',
            borderRadius: '14px',
            border: statusFilter === 'Unpaid' ? '2px solid #ef4444' : '1px solid var(--border-color)',
            background: 'rgba(239, 68, 68, 0.08)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
          }}
        >
          <div style={{ fontSize: '14.5px', color: '#ef4444', fontWeight: 700 }}>⏳ Công Nợ Chưa Thu</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{formatVND(totalPending)}</div>
        </div>

        {/* 3. Tỷ Lệ Phòng Thuê */}
        <div
          className="card"
          style={{
            flex: '1 1 200px',
            maxWidth: '350px',
            padding: '14px 18px',
            borderRadius: '14px',
            border: '1px solid var(--border-color)',
            background: 'rgba(59, 130, 246, 0.08)',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)'
          }}
        >
          <div style={{ fontSize: '14.5px', color: '#3b82f6', fontWeight: 700 }}>🏠 Tỷ Lệ Phòng Thuê</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
            {occupancyPercentage}% <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>({occupiedRoomsCount}/{totalRoomsCount})</span>
          </div>
        </div>

        {/* 4. Tổng Tiền Điện Nước */}
        <div
          className="card"
          style={{
            flex: '1 1 200px',
            maxWidth: '350px',
            padding: '14px 18px',
            borderRadius: '14px',
            border: '1px solid var(--border-color)',
            background: 'rgba(245, 158, 11, 0.08)',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
          }}
        >
          <div style={{ fontSize: '14.5px', color: '#f59e0b', fontWeight: 700 }}>⚡ Tiền Điện & Nước</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{formatVND(totalElecWater)}</div>
        </div>
      </div>

      {/* THANH THỐNG KÊ TIẾN ĐỘ LẬP HÓA ĐƠN CÁC PHÒNG */}
      {targetRooms.length > 0 && (
        <div style={{
          background: unbilledRoomsThisMonth.length === 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
          border: `1px solid ${unbilledRoomsThisMonth.length === 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.25)'}`,
          borderRadius: '12px',
          padding: '10px 16px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Receipt size={17} color="#6366f1" />
              Tiến độ lập hóa đơn Tháng {currentMonthKey}: 
              <span style={{ color: unbilledRoomsThisMonth.length === 0 ? '#10b981' : '#6366f1', fontWeight: 800 }}>
                {billedRoomsThisMonth.length} / {targetRooms.length} phòng ({Math.round((billedRoomsThisMonth.length / (targetRooms.length || 1)) * 100)}%)
              </span>
            </div>
            {unbilledRoomsThisMonth.length > 0 ? (
              <div style={{ fontSize: '13px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span>⏳ Còn <strong>{unbilledRoomsThisMonth.length} phòng</strong> chưa lập HĐ:</span>
                {unbilledRoomsThisMonth.map(r => (
                  <span key={r.id} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '3px 8px', borderRadius: '4px', fontSize: '12.5px', fontWeight: 700 }}>
                    P.{r.roomNumber}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>
                🎉 Tất cả {targetRooms.length} phòng đã được lập hóa đơn đầy đủ cho kỳ này!
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card-table-container">
        {/* Table Toolbar: Tìm kiếm, Chọn khu trọ, Chọn tháng thẳng hàng nhau */}
        <div className="table-toolbar" style={{ padding: '12px 18px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto' }}>
            {/* 1. Tìm kiếm */}
            <div className="search-input-group" style={{ width: '260px' }}>
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Tìm mã hóa đơn, phòng, khách..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{ fontSize: '14px', height: '36px' }}
              />
            </div>

            {/* 2. Bộ lọc Khu Trọ */}
            {zones.length > 0 && (
              <select
                className="filter-select"
                value={zoneFilter}
                onChange={(e) => { setZoneFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '5px 12px', fontSize: '14px', height: '36px', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              >
                <option value="all">🏢 Tất cả khu trọ</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            )}

            {/* 3. Bộ lọc kỳ tháng (Thẳng hàng) */}
            <input 
              type="month" 
              className="form-control" 
              style={{ padding: '5px 12px', fontSize: '14px', height: '36px', width: 'auto', background: 'var(--bg-card)', borderRadius: '8px', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              value={monthFilter} 
              onChange={e => { setMonthFilter(e.target.value); setCurrentPage(1); }} 
              title="Lọc theo kỳ tháng"
            />
          </div>

          {/* 4. Nhóm nút trạng thái */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              style={{ fontSize: '13.5px', padding: '5px 12px', height: '36px' }}
            >
              Tất cả
            </button>

            <button
              className={`btn btn-sm ${statusFilter === 'disputed' ? 'btn-primary' : 'btn-secondary'}`}
              style={statusFilter !== 'disputed' && pendingDisputesCount > 0 ? { color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)', fontSize: '13.5px', padding: '5px 12px', height: '36px' } : { fontSize: '13.5px', padding: '5px 12px', height: '36px' }}
              onClick={() => { setStatusFilter('disputed'); setCurrentPage(1); }}
            >
              ⚠️ Cần kiểm tra ({pendingDisputesCount})
            </button>

            <button
              className={`btn btn-sm ${statusFilter === 'Unpaid' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setStatusFilter('Unpaid'); setCurrentPage(1); }}
              style={{ fontSize: '13.5px', padding: '5px 12px', height: '36px' }}
            >
              ⏳ Chưa trả
            </button>

            <button
              className={`btn btn-sm ${statusFilter === 'Paid' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setStatusFilter('Paid'); setCurrentPage(1); }}
              style={{ fontSize: '13.5px', padding: '5px 12px', height: '36px' }}
            >
              ✅ Đã trả
            </button>

            <button
              className={`btn btn-sm ${statusFilter === 'Overdue' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setStatusFilter('Overdue'); setCurrentPage(1); }}
              style={{ fontSize: '13.5px', padding: '5px 12px', height: '36px' }}
            >
              🔥 Quá hạn
            </button>
          </div>
        </div>

        {/* Bảng Dữ Liệu (Đã bỏ cột Chi Tiết Các Khoản Phí, chữ to rõ ràng) */}
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>MÃ HÓA ĐƠN</th>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>PHÒNG</th>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>KỲ THU</th>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>TỔNG SỐ TIỀN</th>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>HẠN NỘP</th>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>TRẠNG THÁI</th>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>BÁO CÁO SAI SÓT</th>
              <th style={{ padding: '10px 16px', fontSize: '14.5px' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '15px' }}>
                  {statusFilter === 'disputed' 
                    ? 'Hiện tại không có hóa đơn nào bị khách thuê báo sai sót.' 
                    : 'Chưa có hóa đơn nào phù hợp với bộ lọc.'}
                </td>
              </tr>
            ) : (
              paginatedInvoices.map((inv) => {
                const isPendingDispute = inv.isReported && inv.disputeStatus === 'Pending';
                const isResolvedDispute = inv.disputeStatus === 'Resolved';
                const isRejectedDispute = inv.disputeStatus === 'Rejected';

                return (
                  <tr 
                    key={inv.id}
                    style={isPendingDispute ? { background: 'rgba(245, 158, 11, 0.06)', borderLeft: '3px solid #f59e0b' } : {}}
                  >
                    <td style={{ padding: '9px 16px' }}>
                      <strong style={{ color: 'var(--primary)', fontSize: '15.5px', letterSpacing: '0.2px' }}>
                        {inv.invoiceCode || inv.id}
                      </strong>
                    </td>
                    <td style={{ padding: '9px 16px' }}>
                      <span className="status-pill occupied" style={{ fontSize: '13.5px', padding: '4px 10px', fontWeight: 700 }}>
                        P.{inv.roomNumber || inv.roomId}
                      </span>
                    </td>
                    <td style={{ padding: '9px 16px', fontSize: '14.5px', color: 'var(--text-primary)' }}>
                      Tháng {inv.month}
                    </td>
                    <td style={{ padding: '9px 16px' }}>
                      <strong style={{ color: isPendingDispute ? '#f59e0b' : '#34d399', fontSize: '16px' }}>
                        {formatVND(inv.totalAmount)}
                      </strong>
                    </td>
                    <td style={{ padding: '9px 16px', fontSize: '14px', color: 'var(--text-primary)' }}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('vi-VN') : ''}
                    </td>
                    <td style={{ padding: '9px 16px' }}>
                      <span className={`status-pill ${(inv.status || '').toLowerCase() === 'paid' ? 'occupied' : 'vacant'}`} style={{ fontSize: '13px', padding: '4px 10px', fontWeight: 600 }}>
                        {(inv.status || '').toLowerCase() === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}
                      </span>
                    </td>
                    <td style={{ padding: '9px 16px' }}>
                      {isPendingDispute ? (
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{
                            color: '#f59e0b',
                            background: 'rgba(245, 158, 11, 0.15)',
                            borderColor: 'rgba(245, 158, 11, 0.4)',
                            fontWeight: 700,
                            fontSize: '13px',
                            padding: '4px 10px',
                            height: '32px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleOpenResolveDispute(inv)}
                          title="Bấm để xem và xử lý báo sai của khách"
                        >
                          <AlertTriangle size={14} /> Khách báo sai
                        </button>
                      ) : isResolvedDispute ? (
                        <span className="status-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '13px', padding: '3px 8px' }}>
                          <CheckCircle size={13} /> Đã chỉnh
                        </span>
                      ) : isRejectedDispute ? (
                        <span className="status-pill" style={{ background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', fontSize: '13px', padding: '3px 8px' }}>
                          <MessageSquare size={13} /> Đã phản hồi
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>Không có</span>
                      )}
                    </td>
                    <td style={{ padding: '9px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button 
                          className="btn btn-sm btn-secondary" 
                          style={{ padding: '4px 8px', height: '32px', borderRadius: '6px' }}
                          title="Xem Chi Tiết Hóa Đơn & In PDF" 
                          onClick={() => setViewingInvoice(inv)}
                        >
                          <Eye size={15} color="#6366f1" />
                        </button>
                        {isPendingDispute ? (
                          <button 
                            className="btn btn-sm btn-primary" 
                            style={{ background: '#f59e0b', borderColor: '#f59e0b', padding: '4px 10px', height: '32px', fontSize: '13px', fontWeight: 700 }}
                            title="Xử lý báo cáo sai sót hóa đơn của khách thuê"
                            onClick={() => handleOpenResolveDispute(inv)}
                          >
                            <AlertTriangle size={14} /> Xử lý
                          </button>
                        ) : (
                          <button className="btn btn-sm btn-secondary" style={{ padding: '4px 8px', height: '32px', borderRadius: '6px' }} title="Chỉnh Sửa Hóa Đơn" onClick={() => handleOpenEdit(inv)}>
                            <Edit size={15} color="#f59e0b" />
                          </button>
                        )}
                        <button 
                          className="btn btn-sm btn-danger" 
                          style={{ padding: '4px 8px', height: '32px', borderRadius: '6px' }}
                          title="Xóa Hóa Đơn" 
                          onClick={(e) => handleDeleteInvoice(inv, e)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div style={{ padding: '8px 16px' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredInvoices.length}
            pageSize={pageSize}
          />
        </div>
      </div>

      {/* Modal 1: Xử Lý Báo Cáo / Khiếu Nại Hóa Đơn Của Khách Thuê */}
      {resolvingInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                <AlertTriangle size={20} /> Xử Lý Báo Cáo Hóa Đơn: {resolvingInvoice.invoiceCode}
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setResolvingInvoice(null)}>✕</button>
            </div>

            <form onSubmit={handleResolveDisputeSubmit}>
              <div className="modal-body">
                {/* Hộp thông tin phản ánh từ khách thuê */}
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>
                    📌 Thông Tin Khách Thuê Báo Sai (Phòng {resolvingInvoice.roomNumber || resolvingInvoice.roomId}):
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-primary)' }}>
                    <div><strong>Lý do:</strong> {resolvingInvoice.disputeReason}</div>
                    <div><strong>Chi tiết:</strong> {resolvingInvoice.disputeDescription}</div>
                    {resolvingInvoice.suggestedElecNumber && (
                      <div><strong>Chỉ số điện khách đề xuất:</strong> <span style={{ color: '#6366f1', fontWeight: 600 }}>{resolvingInvoice.suggestedElecNumber} kWh</span></div>
                    )}
                    {resolvingInvoice.suggestedWaterNumber && (
                      <div><strong>Chỉ số nước khách đề xuất:</strong> <span style={{ color: '#6366f1', fontWeight: 600 }}>{resolvingInvoice.suggestedWaterNumber} m³</span></div>
                    )}
                  </div>

                  {/* Hiển thị ảnh minh chứng công tơ do khách upload trực tiếp */}
                  {resolvingInvoice.disputeImageUrl && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        📷 Ảnh minh chứng khách gửi (Bấm vào ảnh để xem kích thước gốc):
                      </div>
                      <a href={getImageFullUrl(resolvingInvoice.disputeImageUrl)} target="_blank" rel="noreferrer">
                        <img
                          src={getImageFullUrl(resolvingInvoice.disputeImageUrl)}
                          alt="Ảnh công tơ khách gửi"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            objectFit: 'contain',
                            background: '#000'
                          }}
                        />
                      </a>
                    </div>
                  )}
                </div>

                {/* Chọn hành động xử lý */}
                <div className="form-group">
                  <label className="form-label">Phương Án Xử Lý Của Bạn *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      className={`btn ${disputeResolveData.action === 'Accept' ? 'btn-primary' : 'btn-secondary'}`}
                      style={disputeResolveData.action === 'Accept' ? { background: '#10b981', borderColor: '#10b981' } : {}}
                      onClick={() => setDisputeResolveData({ ...disputeResolveData, action: 'Accept', reply: 'Chủ trọ đã kiểm tra lại và điều chỉnh hóa đơn theo đúng số liệu thực tế.' })}
                    >
                      <CheckCircle size={16} /> Chấp Nhận & Điều Chỉnh
                    </button>
                    <button
                      type="button"
                      className={`btn ${disputeResolveData.action === 'Reject' ? 'btn-primary' : 'btn-secondary'}`}
                      style={disputeResolveData.action === 'Reject' ? { background: '#ef4444', borderColor: '#ef4444' } : {}}
                      onClick={() => setDisputeResolveData({ ...disputeResolveData, action: 'Reject', reply: 'Chủ trọ đã kiểm tra lại công tơ và xác nhận số liệu hóa đơn là chính xác.' })}
                    >
                      <X size={16} /> Từ Chối & Giữ Nguyên
                    </button>
                  </div>
                </div>

                {/* Nếu Chấp nhận: Hiển thị form điều chỉnh các khoản phí */}
                {disputeResolveData.action === 'Accept' && (
                  <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: '#10b981' }}>
                      ✏️ Nhập Số Tiền Điều Chỉnh Lại:
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Tiền Thuê Phòng (VND)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="form-control"
                          required
                          value={formatNumberWithDots(disputeResolveData.rentFee)}
                          onChange={(e) => setDisputeResolveData({ ...disputeResolveData, rentFee: parseNumberFromDots(e.target.value) })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Tiền Điện (VND)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="form-control"
                          required
                          value={formatNumberWithDots(disputeResolveData.elecFee)}
                          onChange={(e) => setDisputeResolveData({ ...disputeResolveData, elecFee: parseNumberFromDots(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Tiền Nước (VND)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="form-control"
                          required
                          value={formatNumberWithDots(disputeResolveData.waterFee)}
                          onChange={(e) => setDisputeResolveData({ ...disputeResolveData, waterFee: parseNumberFromDots(e.target.value) })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Phí Dịch Vụ Khác (VND)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="form-control"
                          required
                          value={formatNumberWithDots(disputeResolveData.serviceFee)}
                          onChange={(e) => setDisputeResolveData({ ...disputeResolveData, serviceFee: parseNumberFromDots(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '6px',
                      marginTop: '8px'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>TỔNG TIỀN MỚI SAU ĐIỀU CHỈNH:</span>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>{formatVND(resolveCalculatedTotal)}</span>
                    </div>
                  </div>
                )}

                {/* Lời nhắn / Phản hồi gửi cho khách */}
                <div className="form-group">
                  <label className="form-label">
                    {disputeResolveData.action === 'Accept' ? 'Lời Nhắn Gửi Khách Thuê (Tùy chọn)' : 'Giải Thích Lý Do Cho Khách Thuê *'}
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    required={disputeResolveData.action === 'Reject'}
                    placeholder={disputeResolveData.action === 'Accept' ? 'VD: Đã trừ lại 50 số điện tính nhầm theo ảnh công tơ bạn gửi...' : 'VD: Đã kiểm tra lại chỉ số công tơ niêm phong tầng 2, chỉ số 1520 kWh là chính xác...'}
                    value={disputeResolveData.reply}
                    onChange={(e) => setDisputeResolveData({ ...disputeResolveData, reply: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setResolvingInvoice(null)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={disputeResolveData.action === 'Accept' ? { background: '#10b981', borderColor: '#10b981' } : { background: '#ef4444', borderColor: '#ef4444' }}
                  disabled={resolving}
                >
                  <Check size={16} /> {resolving ? '⏳ Đang lưu...' : (disputeResolveData.action === 'Accept' ? 'Xác Nhận Điều Chỉnh Hóa Đơn' : 'Xác Nhận Giữ Nguyên & Trả Lời')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Invoice Regular Edit Modal */}
      {isModalOpen && editingInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">✏️ Điều Chỉnh Hóa Đơn: {editingInvoice.invoiceCode}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                  <strong>Phòng:</strong> Phòng {editingInvoice.roomNumber || editingInvoice.roomId} | <strong>Kỳ thu:</strong> Tháng {editingInvoice.month}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tiền Thuê Phòng (VND)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      required
                      value={formatNumberWithDots(formData.rentFee)}
                      onChange={(e) => setFormData({ ...formData, rentFee: parseNumberFromDots(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tiền Điện (VND)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      required
                      value={formatNumberWithDots(formData.elecFee)}
                      onChange={(e) => setFormData({ ...formData, elecFee: parseNumberFromDots(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tiền Nước (VND)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      required
                      value={formatNumberWithDots(formData.waterFee)}
                      onChange={(e) => setFormData({ ...formData, waterFee: parseNumberFromDots(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phí Dịch Vụ Khác (VND)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      required
                      value={formatNumberWithDots(formData.serviceFee)}
                      onChange={(e) => setFormData({ ...formData, serviceFee: parseNumberFromDots(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Hạn Thanh Toán</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Trạng Thái Hóa Đơn</label>
                    <select
                      className="form-control"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Unpaid">⏳ Chưa thanh toán</option>
                      <option value="Paid">✅ Đã thanh toán</option>
                      <option value="Overdue">🔥 Quá hạn</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Invoice View / Transparent Receipt Modal */}
      {viewingInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={20} color="#6366f1" /> Chi Tiết Hóa Đơn: {viewingInvoice.invoiceCode}
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewingInvoice(null)}>✕</button>
            </div>
            
            <div className="modal-body" id="invoice-pdf-content" style={{ background: '#fff', color: '#1e293b', padding: '24px', borderRadius: '8px' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #6366f1', paddingBottom: '14px', marginBottom: '16px' }}>
                <h2 style={{ color: '#4f46e5', margin: '0 0 4px', fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  PHIẾU BÁO THU TIỀN NHÀ & DỊCH VỤ
                </h2>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                  PHÒNG {viewingInvoice.roomNumber || viewingInvoice.roomId}
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                  Mã HĐ: <strong>{viewingInvoice.invoiceCode}</strong> • Kỳ thu: <strong>Tháng {viewingInvoice.month}</strong>
                </p>
              </div>

              {viewingInvoice.disputeStatus === 'Resolved' && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '14px',
                  fontSize: '12.5px'
                }}>
                  <strong>✅ Đã điều chỉnh theo phản ánh của khách thuê:</strong> {viewingInvoice.disputeReply}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                <div><strong>Khách thuê:</strong> {viewingInvoice.tenantName || 'Đang cập nhật'}</div>
                <div><strong>Trạng thái:</strong> <span style={{ color: (viewingInvoice.status || '').toLowerCase() === 'paid' ? '#16a34a' : '#ea580c', fontWeight: 700 }}>{(viewingInvoice.status || '').toLowerCase() === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}</span></div>
                <div><strong>Ngày phát hành:</strong> {formatDate(viewingInvoice.createdAt || new Date())}</div>
                <div><strong>Hạn thanh toán:</strong> <span style={{ color: '#dc2626', fontWeight: 600 }}>{formatDate(viewingInvoice.dueDate)}</span></div>
              </div>

              {/* BẢNG KÊ CHI TIẾT TỪNG KHOẢN TIỀN MINH BẠCH */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>Danh Mục Khoản Thu</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#475569', width: '110px' }}>Phân Loại</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', color: '#475569', width: '140px' }}>Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 1. Tiền phòng */}
                  <tr>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0' }}>
                      <strong>🏠 Tiền thuê phòng {viewingInvoice.roomNumber || ''}</strong>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>Cố định</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{formatVND(viewingInvoice.rentFee || 0)}</td>
                  </tr>

                  {/* 2. Tiền điện */}
                  <tr>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#d97706' }}>⚡ Tiền điện tiêu thụ</span>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>Theo đồng hồ</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{formatVND(viewingInvoice.elecFee || 0)}</td>
                  </tr>

                  {/* 3. Tiền nước */}
                  <tr>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#0284c7' }}>💧 Tiền nước tiêu thụ</span>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>Theo đồng hồ</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{formatVND(viewingInvoice.waterFee || 0)}</td>
                  </tr>

                  {/* 4. Danh sách các khoản tiền dịch vụ chi tiết từng mục */}
                  {(() => {
                    const serviceItems = viewingInvoice.items ? viewingInvoice.items.filter(it => 
                      !it.name.startsWith('Tiền thuê phòng') && 
                      !it.name.startsWith('Tiền điện') && 
                      !it.name.startsWith('Tiền nước')
                    ) : [];

                    if (serviceItems.length > 0) {
                      return serviceItems.map((sItem, sIdx) => (
                        <tr key={`svc-${sIdx}`} style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                          <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', paddingLeft: '20px' }}>
                            <span style={{ color: '#6366f1' }}>• {sItem.name}</span>
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#6366f1', fontSize: '12px' }}>Dịch vụ</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#4338ca', fontWeight: 600 }}>
                            {formatVND(sItem.amount || 0)}
                          </td>
                        </tr>
                      ));
                    } else if (viewingInvoice.serviceFee > 0) {
                      return (
                        <tr style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                          <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', paddingLeft: '20px' }}>
                            <span style={{ color: '#6366f1' }}>• Phí dịch vụ cố định (Wi-Fi, rác, vệ sinh...)</span>
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#6366f1', fontSize: '12px' }}>Dịch vụ</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#4338ca', fontWeight: 600 }}>
                            {formatVND(viewingInvoice.serviceFee)}
                          </td>
                        </tr>
                      );
                    }
                    return null;
                  })()}

                  {/* Tổng tiền dịch vụ subtotal nếu có */}
                  {viewingInvoice.serviceFee > 0 && (
                    <tr style={{ background: '#f8fafc', fontSize: '12.5px', color: '#475569' }}>
                      <td colSpan="2" style={{ padding: '6px 10px', borderBottom: '2px solid #cbd5e1', textAlign: 'right', fontStyle: 'italic' }}>
                        Tổng cộng phí dịch vụ:
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', fontWeight: 700, color: '#4338ca' }}>
                        {formatVND(viewingInvoice.serviceFee)}
                      </td>
                    </tr>
                  )}

                  {/* 5. TỔNG CỘNG THANH TOÁN */}
                  <tr style={{ background: '#ecfdf5', borderTop: '2px solid #10b981' }}>
                    <td colSpan="2" style={{ padding: '12px 10px', color: '#065f46' }}>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>TỔNG CỘNG CẦN THANH TOÁN</div>
                      <div style={{ fontSize: '11.5px', color: '#047857', marginTop: '2px' }}>
                        (Tiền phòng: {formatVND(viewingInvoice.rentFee || 0)} + Điện: {formatVND(viewingInvoice.elecFee || 0)} + Nước: {formatVND(viewingInvoice.waterFee || 0)} + DV: {formatVND(viewingInvoice.serviceFee || 0)})
                      </div>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#059669', fontSize: '18px', fontWeight: 800 }}>
                      {formatVND(viewingInvoice.totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', marginTop: '12px', fontStyle: 'italic' }}>
                Quý khách vui lòng kiểm tra kỹ chi tiết từng khoản trước khi thanh toán. Mọi thắc mắc xin liên hệ chủ trọ để được hỗ trợ.
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-danger" 
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={(e) => handleDeleteInvoice(viewingInvoice, e)}
              >
                <Trash2 size={15} /> Xóa Hóa Đơn Này
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                  onClick={() => {
                    const inv = viewingInvoice;
                    setViewingInvoice(null);
                    handleOpenEdit(inv);
                  }}
                >
                  <Edit size={15} /> Sửa Tiền
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setViewingInvoice(null)}
                >
                  Đóng
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => exportToPDF('invoice-pdf-content', `${viewingInvoice.invoiceCode}.pdf`)}
                >
                  <Printer size={16} /> In Hóa Đơn / Xuất PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📊 MODAL NHẬP EXCEL & TẠO HÀNG LOẠT HÓA ĐƠN */}
      <BulkUtilityModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        rooms={roomsList}
        zones={zonesList}
        currentRate={{ elecPrice: 3500, waterPrice: 18000 }}
        onSuccess={() => {
          onRefresh?.();
        }}
      />

      {/* 📝 MODAL LẬP HÓA ĐƠN LẺ TỪNG PHÒNG */}
      {isCreateModalOpen && (() => {
        const zoneRooms = roomsList.filter(r => !singleInvoiceForm.zoneId || (r.zoneId || r.ZoneId) === singleInvoiceForm.zoneId);
        const selectedRoom = roomsList.find(r => (r.id || r.Id) === singleInvoiceForm.roomId);
        
        const elecPrice = 3500;
        const waterPrice = 18000;
        
        const elecUsed = Math.max(0, Number(singleInvoiceForm.newElec || 0) - Number(singleInvoiceForm.oldElec || 0));
        const calculatedElecCost = singleInvoiceForm.entryMode === 'meter' ? (elecUsed * elecPrice) : Number(singleInvoiceForm.elecFee || 0);
        
        const waterUsed = Math.max(0, Number(singleInvoiceForm.newWater || 0) - Number(singleInvoiceForm.oldWater || 0));
        const calculatedWaterCost = singleInvoiceForm.entryMode === 'meter' ? (waterUsed * waterPrice) : Number(singleInvoiceForm.waterFee || 0);
        
        const totalEstAmount = Number(singleInvoiceForm.rentFee || 0) + calculatedElecCost + calculatedWaterCost + Number(singleInvoiceForm.serviceFee || 0);

        const existingInvoice = invoicesList.find(i => 
          isRoomMatchingInvoice(selectedRoom, i) && 
          i.month === singleInvoiceForm.month
        );

        return (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content" style={{ maxWidth: 600, width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, margin: 0, fontWeight: 700 }}>
                  <Plus size={20} color="#6366f1" /> Lập Hóa Đơn Lẻ (Từng Phòng)
                </h3>
                <button className="btn btn-sm btn-secondary" onClick={() => setIsCreateModalOpen(false)} style={{ padding: '4px 8px' }}>✕</button>
              </div>

              <form onSubmit={handleCreateSingleSubmit}>
                <div className="modal-body" style={{ padding: '18px 20px' }}>
                  
                  {/* Báo hiệu nếu phòng đã có HĐ */}
                  {existingInvoice && (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#f59e0b',
                      padding: '10px 14px',
                      borderRadius: 8,
                      marginBottom: 16,
                      fontSize: 12.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                      <div>
                        Phòng này đã có hóa đơn tháng {singleInvoiceForm.month} (<strong>{existingInvoice.invoiceCode}</strong>). Khi xác nhận, hệ thống sẽ cập nhật lại số tiền theo thông tin mới.
                      </div>
                    </div>
                  )}

                  {/* CHỌN KHU TRỌ & PHÒNG */}
                  <div className="form-row" style={{ marginBottom: 14 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12.5, fontWeight: 600 }}>Khu Trọ</label>
                      <select 
                        className="form-control"
                        value={singleInvoiceForm.zoneId}
                        onChange={(e) => handleSingleZoneChange(e.target.value)}
                        style={{ height: 40, padding: '8px 12px', fontSize: 13.5, boxSizing: 'border-box' }}
                      >
                        <option value="">-- Tất cả khu trọ --</option>
                        {zonesList.map(z => (
                          <option key={z.id || z.Id} value={z.id || z.Id}>{z.name || z.Name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12.5, fontWeight: 600 }}>Chọn Phòng *</label>
                      <select 
                        className="form-control"
                        required
                        value={singleInvoiceForm.roomId}
                        onChange={(e) => handleSingleRoomChange(e.target.value)}
                        style={{ height: 40, padding: '8px 12px', fontSize: 13.5, boxSizing: 'border-box' }}
                      >
                        <option value="" disabled>-- Chọn phòng --</option>
                        {zoneRooms.map(r => {
                          const tName = r.currentTenantName || r.CurrentTenantName || r.tenants?.[0]?.user?.fullName || r.tenants?.[0]?.fullName || r.tenantName || 'Trống';
                          return (
                            <option key={r.id || r.Id} value={r.id || r.Id}>
                              P.{r.roomNumber || r.RoomNumber} - ({tName}) - {formatVND(r.price || r.Price || 0)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* THÁNG & HẠN ĐÓNG TIỀN */}
                  <div className="form-row" style={{ marginBottom: 14 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12.5, fontWeight: 600 }}>Tháng Chốt Hóa Đơn *</label>
                      <input 
                        type="month"
                        className="form-control"
                        required
                        value={singleInvoiceForm.month}
                        onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, month: e.target.value })}
                        style={{ height: 40, padding: '8px 12px', fontSize: 13.5, boxSizing: 'border-box' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12.5, fontWeight: 600 }}>Hạn Nộp Tiền *</label>
                      <input 
                        type="date"
                        className="form-control"
                        required
                        value={singleInvoiceForm.dueDate}
                        onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, dueDate: e.target.value })}
                        style={{ height: 40, padding: '8px 12px', fontSize: 13.5, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* CHẾ ĐỘ NHẬP ĐIỆN NƯỚC */}
                  <div style={{ background: 'var(--bg-secondary, rgba(255,255,255,0.03))', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Chỉ Số Điện & Nước</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button 
                          type="button"
                          className={`btn btn-sm ${singleInvoiceForm.entryMode === 'meter' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setSingleInvoiceForm({ ...singleInvoiceForm, entryMode: 'meter' })}
                          style={{ fontSize: 11.5, padding: '3px 8px' }}
                        >
                          Theo Đồng Hồ
                        </button>
                        <button 
                          type="button"
                          className={`btn btn-sm ${singleInvoiceForm.entryMode === 'direct' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setSingleInvoiceForm({ ...singleInvoiceForm, entryMode: 'direct' })}
                          style={{ fontSize: 11.5, padding: '3px 8px' }}
                        >
                          Nhập Tiền Trực Tiếp
                        </button>
                      </div>
                    </div>

                    {singleInvoiceForm.entryMode === 'meter' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {/* ĐIỆN THEO ĐỒNG HỒ */}
                        <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: 10, borderRadius: 6, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', marginBottom: 6 }}>⚡ Điện (3.500đ/kWh)</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 4 }}>
                            Số cũ: <strong>{singleInvoiceForm.oldElec}</strong>
                          </div>
                          <input 
                            type="number"
                            min={singleInvoiceForm.oldElec}
                            className="form-control"
                            placeholder="Số mới"
                            value={singleInvoiceForm.newElec}
                            onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, newElec: e.target.value })}
                            style={{ fontSize: 13, height: 36, padding: '6px 10px', boxSizing: 'border-box' }}
                          />
                          <div style={{ fontSize: 11.5, marginTop: 4, color: '#f59e0b', fontWeight: 600 }}>
                            Dùng: {elecUsed} kWh = {formatVND(calculatedElecCost)}
                          </div>
                        </div>

                        {/* NƯỚC THEO ĐỒNG HỒ */}
                        <div style={{ background: 'rgba(6, 182, 212, 0.05)', padding: 10, borderRadius: 6, border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#06b6d4', marginBottom: 6 }}>💧 Nước (18.000đ/m³)</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 4 }}>
                            Số cũ: <strong>{singleInvoiceForm.oldWater}</strong>
                          </div>
                          <input 
                            type="number"
                            min={singleInvoiceForm.oldWater}
                            className="form-control"
                            placeholder="Số mới"
                            value={singleInvoiceForm.newWater}
                            onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, newWater: e.target.value })}
                            style={{ fontSize: 13, height: 36, padding: '6px 10px', boxSizing: 'border-box' }}
                          />
                          <div style={{ fontSize: 11.5, marginTop: 4, color: '#06b6d4', fontWeight: 600 }}>
                            Dùng: {waterUsed} m³ = {formatVND(calculatedWaterCost)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="form-row" style={{ gap: 10 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: 12 }}>Tiền Điện (VND)</label>
                          <input 
                            type="text"
                            inputMode="numeric"
                            className="form-control"
                            value={formatNumberWithDots(singleInvoiceForm.elecFee)}
                            onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, elecFee: parseNumberFromDots(e.target.value) })}
                            style={{ height: 36, padding: '6px 10px', fontSize: 13, boxSizing: 'border-box' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: 12 }}>Tiền Nước (VND)</label>
                          <input 
                            type="text"
                            inputMode="numeric"
                            className="form-control"
                            value={formatNumberWithDots(singleInvoiceForm.waterFee)}
                            onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, waterFee: parseNumberFromDots(e.target.value) })}
                            style={{ height: 36, padding: '6px 10px', fontSize: 13, boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TIỀN PHÒNG VÀ DỊCH VỤ */}
                  <div className="form-row" style={{ marginBottom: 14 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12.5, fontWeight: 600 }}>Tiền Thuê Phòng (VND) *</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        className="form-control"
                        required
                        value={formatNumberWithDots(singleInvoiceForm.rentFee)}
                        onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, rentFee: parseNumberFromDots(e.target.value) })}
                        style={{ height: 40, padding: '8px 12px', fontSize: 13.5, boxSizing: 'border-box' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12.5, fontWeight: 600 }}>Phí Dịch Vụ (VND)</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        className="form-control"
                        value={formatNumberWithDots(singleInvoiceForm.serviceFee)}
                        onChange={(e) => setSingleInvoiceForm({ ...singleInvoiceForm, serviceFee: parseNumberFromDots(e.target.value) })}
                        style={{ height: 40, padding: '8px 12px', fontSize: 13.5, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* HỘP TỔNG TIỀN DỰ KIẾN */}
                  <div style={{
                    background: '#ecfdf5',
                    border: '1px solid #10b981',
                    borderRadius: 8,
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>TỔNG CỘNG HÓA ĐƠN</div>
                      <div style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>
                        (Phòng: {formatVND(singleInvoiceForm.rentFee || 0)} + Điện: {formatVND(calculatedElecCost)} + Nước: {formatVND(calculatedWaterCost)} + DV: {formatVND(singleInvoiceForm.serviceFee || 0)})
                      </div>
                    </div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: '#059669' }}>
                      {formatVND(totalEstAmount)}
                    </div>
                  </div>

                </div>

                <div className="modal-footer" style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={singleSaving || !singleInvoiceForm.roomId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    {singleSaving ? '⏳ Đang lưu...' : (existingInvoice ? '🔄 Cập Nhật Hóa Đơn' : '🚀 Xác Nhận Phát Hành Hóa Đơn')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
