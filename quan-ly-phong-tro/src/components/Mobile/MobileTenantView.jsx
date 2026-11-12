import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home, Receipt, FileText, Wrench, User, Bell, Sun, Moon,
  QrCode, PhoneCall, ShieldCheck, CheckCircle2, Clock, AlertTriangle,
  ChevronRight, ArrowLeft, Camera, ExternalLink, Sparkles,
  Info, Building2, Zap, Send, Check, RefreshCw, Copy,
  LogOut, Plus, ChevronDown, CheckCheck, Upload, AlertCircle, X,
  FileCheck, Shield, DollarSign, Calendar, Search, Droplets,
  Lock, Wind, Image as ImageIcon, CreditCard, Bike, Car, Trash2,
  ZoomIn, Eye, MessageSquare, AlertOctagon, HelpCircle, Edit
} from 'lucide-react';
import {
  formatVND,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getVietQRUrl,
  getImageUrl,
  getContractStatusInfo,
  VIETNAM_BANKS
} from '../../utils/formatters';
import {
  invoiceService,
  contractService,
  maintenanceService,
  profileService,
  paymentService,
  fileService
} from '../../services';

export const MobileTenantView = ({
  dashboard,
  invoices = [],
  contracts = [],
  maintenanceRequests = [],
  payments = [],
  profile,
  vehicle,
  notifications = [],
  onRefresh,
  isLight = false,
  theme = 'dark',
  onOpenNotif,
  onLogout,
  onSwitchToDesktop
}) => {
  // ── Tab chính: 'home' | 'invoices' | 'payments' | 'repairs' | 'contracts' | 'profile' ──
  const [activeTab, setActiveTab] = useState('home');

  // Sub-tabs trong Thanh toán: 'qr_pay' | 'history'
  const [paymentSubTab, setPaymentSubTab] = useState('qr_pay');

  // Sub-tabs trong Hồ sơ: 'info' | 'vehicle' | 'password'
  const [profileSubTab, setProfileSubTab] = useState('info');

  // Bộ lọc bảo trì: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  const [repairFilter, setRepairFilter] = useState('ALL');

  // Bộ lọc hóa đơn: tìm kiếm từ khóa
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // ── Các Modals / Subviews ──
  // 'invoice_detail' | 'dispute' | 'dispute_detail' | 'repair_create' | 'repair_detail' |
  // 'contract_detail' | 'contract_sign' | 'contract_renew' | 'qr_zoom' | 'proof_zoom' | null
  const [activeModal, setActiveModal] = useState(null);

  // Đối tượng đang được chọn xem/thao tác
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [zoomedImageUrl, setZoomedImageUrl] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // ── Lọc hợp đồng chặt chẽ: chỉ hiển thị hợp đồng của chính khách thuê này ──
  const myContracts = useMemo(() => {
    if (!contracts || !Array.isArray(contracts)) return [];
    const myProfileId = profile?.id || dashboard?.tenantProfileId;
    const myRoomNumber = profile?.roomNumber || dashboard?.roomNumber;
    const myEmail = profile?.email || dashboard?.email;
    const myName = profile?.fullName || dashboard?.fullName;

    const filtered = contracts.filter(c => {
      if (myProfileId && c.tenantProfileId && c.tenantProfileId === myProfileId) return true;
      if (myEmail && c.tenantEmail && c.tenantEmail.toLowerCase() === myEmail.toLowerCase()) return true;
      if (myName && c.tenantName && c.tenantName.trim().toLowerCase() === myName.trim().toLowerCase()) return true;
      if (myRoomNumber && c.roomNumber && String(c.roomNumber) === String(myRoomNumber)) return true;
      return false;
    });

    return filtered.length > 0 ? filtered : (contracts.length > 0 ? [contracts[0]] : []);
  }, [contracts, profile, dashboard]);

  // ── Form State: Khiếu nại hóa đơn ──
  const [disputeForm, setDisputeForm] = useState({
    reason: 'Sai chỉ số điện / Tiền điện',
    description: '',
    suggestedElecNumber: '',
    suggestedWaterNumber: '',
    proofImage: '',
    proofFile: null
  });

  // ── Form State: Thanh toán VietQR & Gửi biên lai ──
  const [paymentForm, setPaymentForm] = useState({
    note: '',
    proofFile: null,
    proofPreview: ''
  });
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // ── Form State: Báo hỏng sửa chữa ──
  const [repairForm, setRepairForm] = useState({
    issueType: 'Máy lạnh',
    title: '',
    description: '',
    priority: 'Medium',
    imageFile: null,
    imagePreview: ''
  });

  // ── Form State: Gia hạn hợp đồng ──
  const [renewForm, setRenewForm] = useState({
    extendMonths: 12,
    notes: ''
  });

  // ── Form State: Ký hợp đồng online ──
  const [signForm, setSignForm] = useState({
    agreed: false,
    note: ''
  });

  // ── Form State: Chỉnh sửa hồ sơ ──
  const [editProfileForm, setEditProfileForm] = useState({
    fullName: '',
    phone: '',
    hometown: '',
    cccd: '',
    cccdFrontFile: null,
    cccdFrontPreview: '',
    cccdBackFile: null,
    cccdBackPreview: ''
  });

  // ── Form State: Đăng ký xe ──
  const [vehicleForm, setVehicleForm] = useState({
    count: 0,
    plates: []
  });

  // ── Form State: Đổi mật khẩu ──
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // ── Dữ liệu tổng hợp ──
  const unpaidInvoices = useMemo(() => {
    return (invoices || []).filter(i => {
      const s = (i.status || '').toLowerCase();
      return s === 'unpaid' || s === 'pending' || s === 'overdue';
    });
  }, [invoices]);

  const paidInvoices = useMemo(() => {
    return (invoices || []).filter(i => {
      const s = (i.status || '').toLowerCase();
      return s === 'paid' || s === 'completed';
    });
  }, [invoices]);

  const activeContract = useMemo(() => {
    return (contracts || []).find(c => {
      const info = getContractStatusInfo(c);
      return info.isActive;
    }) || contracts[0] || null;
  }, [contracts]);

  const contractStatusInfo = useMemo(() => {
    return getContractStatusInfo(activeContract);
  }, [activeContract]);

  const isContractLiquidated = contractStatusInfo.isLiquidated;
  const isContractExpired = contractStatusInfo.isExpired && !contractStatusInfo.isRenewPending && !isContractLiquidated;
  const isRenewPending = Boolean(activeContract && (
    (activeContract.status || '').toLowerCase() === 'renewrequested' ||
    (activeContract.status || '').toLowerCase() === 'renew_requested' ||
    activeContract.requestedRenewMonths
  ));

  const currentRoomNumber = dashboard?.roomNumber || activeContract?.roomNumber || profile?.roomNumber || '---';
  const currentZoneName = dashboard?.zoneName || activeContract?.zoneName || profile?.zoneName || 'Nhà trọ SmartRent';

  // Lắng nghe sự kiện điều hướng tab từ header / bottomSheet bên ngoài
  useEffect(() => {
    const handleTenantTab = (e) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
        if (e.detail?.subTab) {
          setProfileSubTab(e.detail.subTab);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('smartrent:mobile-tenant-tab', handleTenantTab);
    return () => window.removeEventListener('smartrent:mobile-tenant-tab', handleTenantTab);
  }, []);

  // Đồng bộ thông tin khi mở form
  useEffect(() => {
    const p = profile || dashboard;
    if (p) {
      setEditProfileForm({
        fullName: p.fullName || p.tenantName || p.name || '',
        phone: p.phoneNumber || p.phone || '',
        hometown: p.hometown || '',
        cccd: p.cccd || '',
        cccdFrontFile: null,
        cccdFrontPreview: p.cccdFrontUrl ? getImageUrl(p.cccdFrontUrl) : '',
        cccdBackFile: null,
        cccdBackPreview: p.cccdBackUrl ? getImageUrl(p.cccdBackUrl) : ''
      });
    }
  }, [profile, dashboard]);

  useEffect(() => {
    const count = Number(vehicle?.vehicleCount ?? profile?.vehicleCount ?? (vehicle?.licensePlate ? 1 : 0));
    const infoStr = vehicle?.vehicleInfo ?? profile?.vehicleInfo ?? vehicle?.licensePlate ?? '';
    const parsed = infoStr.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    setVehicleForm({
      count: count,
      plates: Array.from({ length: Math.max(count, parsed.length) }, (_, i) => parsed[i] || '')
    });
  }, [vehicle, profile]);

  // Tiện ích sao chép text
  const handleCopy = (text, fieldName) => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(String(text));
      }
    } catch {}
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const showToast = (type, text) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4000);
  };

  // ════════════════════════════════════════════════════════════
  // ── XỬ LÝ: KHIẾU NẠI HÓA ĐƠN (DISPUTE INVOICE) ──────────────
  // ════════════════════════════════════════════════════════════
  const handleOpenDispute = (inv) => {
    setSelectedInvoice(inv);
    if (inv.isReported && inv.disputeStatus) {
      setActiveModal('dispute_detail');
    } else {
      setDisputeForm({
        reason: 'Sai chỉ số điện / Tiền điện',
        description: '',
        suggestedElecNumber: '',
        suggestedWaterNumber: '',
        proofImage: '',
        proofFile: null
      });
      setActiveModal('dispute');
    }
  };

  const handleDisputeFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setDisputeForm(prev => ({ ...prev, proofImage: reader.result, proofFile: file }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitDispute = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setActionLoading(true);
    try {
      let uploadedUrl = disputeForm.proofImage;
      if (disputeForm.proofFile && fileService.uploadDisputeProof) {
        try {
          const res = await fileService.uploadDisputeProof(disputeForm.proofFile);
          uploadedUrl = res.url || res.data?.url || res;
        } catch (uploadErr) {
          console.warn('Lỗi tải ảnh qua API, dùng base64 fallback:', uploadErr);
        }
      }

      await invoiceService.reportInvoice(selectedInvoice.id, {
        reason: disputeForm.reason,
        description: disputeForm.description,
        imageUrl: uploadedUrl,
        suggestedElecNumber: disputeForm.suggestedElecNumber ? Number(disputeForm.suggestedElecNumber) : null,
        suggestedWaterNumber: disputeForm.suggestedWaterNumber ? Number(disputeForm.suggestedWaterNumber) : null
      });

      showToast('success', '✅ Đã gửi phản ánh / khiếu nại hóa đơn tới chủ trọ thành công!');
      setActiveModal(null);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi gửi khiếu nại: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDispute = async (inv) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy yêu cầu khiếu nại hóa đơn này?')) return;
    setActionLoading(true);
    try {
      await invoiceService.cancelReportInvoice(inv.id);
      showToast('success', '✅ Đã hủy khiếu nại hóa đơn thành công.');
      setActiveModal(null);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi hủy khiếu nại: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // ── XỬ LÝ: THANH TOÁN TIỀN PHÒNG & NỘP BIÊN LAI ─────────────
  // ════════════════════════════════════════════════════════════
  const handleOpenQrPay = (inv = null) => {
    const target = inv || unpaidInvoices[0] || invoices[0] || null;
    setSelectedInvoice(target);
    setPaymentSuccess(false);
    setPaymentForm({ note: '', proofFile: null, proofPreview: '' });
    setActiveTab('payments');
    setPaymentSubTab('qr_pay');
  };

  const handlePaymentFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh biên lai (JPG, PNG).');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentForm(prev => ({
        ...prev,
        proofFile: file,
        proofPreview: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmPayment = async () => {
    const inv = selectedInvoice || unpaidInvoices[0];
    if (!inv) {
      alert('Không tìm thấy hóa đơn cần thanh toán.');
      return;
    }

    setActionLoading(true);
    try {
      let uploadedUrl = paymentForm.proofPreview;
      if (paymentForm.proofFile && fileService.uploadPaymentProof) {
        try {
          const res = await fileService.uploadPaymentProof(paymentForm.proofFile);
          uploadedUrl = res.url || res.data?.url || res;
        } catch (uploadErr) {
          console.warn('Lỗi tải biên lai qua API, dùng base64:', uploadErr);
        }
      }

      await paymentService.submit({
        invoiceId: inv.id,
        amount: inv.totalAmount,
        proofImageUrl: uploadedUrl,
        notes: paymentForm.note || `Khách phòng ${inv.roomNumber || currentRoomNumber} thanh toan ${inv.invoiceCode}`
      });

      setPaymentSuccess(true);
      showToast('success', '🎉 Đã gửi xác nhận thanh toán thành công! Chủ trọ sẽ duyệt cho bạn.');
      onRefresh?.();
    } catch (err) {
      alert('Lỗi xác nhận thanh toán: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // ── XỬ LÝ: BÁO HỎNG SỰ CỐ & SỬA CHỮA ────────────────────────
  // ════════════════════════════════════════════════════════════
  const handleRepairFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp hình ảnh sự cố (JPG, PNG).');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setRepairForm(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitRepair = async (e) => {
    e.preventDefault();
    if (!repairForm.title.trim()) {
      alert('Vui lòng nhập tiêu đề sự cố.');
      return;
    }

    setActionLoading(true);
    try {
      let uploadedUrl = repairForm.imagePreview;
      if (repairForm.imageFile && fileService.uploadDocument) {
        try {
          const res = await fileService.uploadDocument(repairForm.imageFile);
          uploadedUrl = res.url || res.data?.url || res;
        } catch (uploadErr) {
          console.warn('Lỗi tải ảnh sửa chữa qua API:', uploadErr);
        }
      }

      await maintenanceService.createRequest({
        issueType: repairForm.issueType,
        title: repairForm.title,
        description: repairForm.description,
        priority: repairForm.priority,
        imageUrl: uploadedUrl,
        roomId: dashboard?.roomId || profile?.roomId || undefined
      });

      showToast('success', '✅ Đã gửi phiếu báo hỏng tới Chủ trọ thành công!');
      setRepairForm({
        issueType: 'Máy lạnh',
        title: '',
        description: '',
        priority: 'Medium',
        imageFile: null,
        imagePreview: ''
      });
      setActiveModal(null);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi gửi báo hỏng: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // ── XỬ LÝ: HỢP ĐỒNG, GIA HẠN & KÝ ONLINE ────────────────────
  // ════════════════════════════════════════════════════════════
  const handleOpenRenewModal = (cont) => {
    setSelectedContract(cont || activeContract);
    setRenewForm({
      extendMonths: cont?.requestedRenewMonths || 12,
      notes: cont?.renewNotes || ''
    });
    setActiveModal('contract_renew');
  };

  const handleSubmitRenew = async (e) => {
    e.preventDefault();
    const cont = selectedContract || activeContract;
    if (!cont) return;

    setActionLoading(true);
    try {
      await contractService.requestRenew(cont.id, {
        extendMonths: Number(renewForm.extendMonths),
        notes: renewForm.notes
      });
      showToast('success', `✅ Đã gửi yêu cầu gia hạn thêm ${renewForm.extendMonths} tháng tới Chủ trọ!`);
      setActiveModal(null);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi gửi yêu cầu gia hạn: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRenew = async (cont) => {
    const target = cont || activeContract;
    if (!target) return;
    if (!window.confirm('Bạn có chắc muốn hủy đăng ký gia hạn hợp đồng này?')) return;

    setActionLoading(true);
    try {
      await contractService.cancelRenew(target.id);
      showToast('success', '✅ Đã hủy yêu cầu gia hạn hợp đồng.');
      onRefresh?.();
    } catch (err) {
      alert('Lỗi hủy yêu cầu: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenSignModal = (cont) => {
    setSelectedContract(cont || activeContract);
    setSignForm({ agreed: false, note: '' });
    setActiveModal('contract_sign');
  };

  const handleSubmitSign = async (e) => {
    e.preventDefault();
    const cont = selectedContract || activeContract;
    if (!cont || !signForm.agreed) return;

    setActionLoading(true);
    try {
      await contractService.signContract(cont.id, { note: signForm.note });
      showToast('success', '🎉 Chúc mừng! Bạn đã hoàn tất thủ tục ký xác nhận hợp đồng online.');
      setActiveModal(null);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi ký hợp đồng: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // ── XỬ LÝ: HỒ SƠ CÁ NHÂN, XE CỘ & ĐỔI MẬT KHẨU ──────────────
  // ════════════════════════════════════════════════════════════
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      let frontUrl = editProfileForm.cccdFrontPreview;
      let backUrl = editProfileForm.cccdBackPreview;

      if (editProfileForm.cccdFrontFile && fileService.uploadCccd) {
        try {
          const res = await fileService.uploadCccd(editProfileForm.cccdFrontFile);
          frontUrl = res.url || res.data?.url || res;
        } catch {}
      }
      if (editProfileForm.cccdBackFile && fileService.uploadCccd) {
        try {
          const res = await fileService.uploadCccd(editProfileForm.cccdBackFile);
          backUrl = res.url || res.data?.url || res;
        } catch {}
      }

      await profileService.updateProfile({
        fullName: editProfileForm.fullName,
        phone: editProfileForm.phone,
        hometown: editProfileForm.hometown,
        cccd: editProfileForm.cccd,
        cccdFrontUrl: frontUrl,
        cccdBackUrl: backUrl
      });

      showToast('success', '✅ Đã lưu cập nhật thông tin cá nhân và CCCD!');
      onRefresh?.();
    } catch (err) {
      alert('Lỗi cập nhật hồ sơ: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const platesClean = vehicleForm.plates.map(p => p.trim()).filter(Boolean);
      await profileService.updateVehicle({
        vehicleCount: Number(vehicleForm.count),
        vehicleInfo: platesClean.join(', ')
      });
      showToast('success', '✅ Đã cập nhật thông tin đăng ký phương tiện gửi xe!');
      onRefresh?.();
    } catch (err) {
      alert('Lỗi cập nhật xe: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Mật khẩu mới và xác nhận mật khẩu không khớp.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      alert('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setActionLoading(true);
    try {
      await profileService.changePassword({
        currentPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      showToast('success', '🔒 Đã đổi mật khẩu tài khoản thành công!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      alert('Lỗi đổi mật khẩu: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // ── DANH SÁCH BẢO TRÌ ĐÃ LỌC ────────────────────────────────
  // ════════════════════════════════════════════════════════════
  const filteredRepairs = useMemo(() => {
    const list = maintenanceRequests || [];
    if (repairFilter === 'ALL') return list;
    if (repairFilter === 'PENDING') return list.filter(r => (r.status || '').toLowerCase() === 'pending');
    if (repairFilter === 'IN_PROGRESS') return list.filter(r => ['in_progress', 'inprogress'].includes((r.status || '').toLowerCase()));
    if (repairFilter === 'COMPLETED') return list.filter(r => ['completed', 'resolved'].includes((r.status || '').toLowerCase()));
    return list;
  }, [maintenanceRequests, repairFilter]);

  // Danh sách hóa đơn đã lọc theo từ khóa
  const filteredInvoices = useMemo(() => {
    if (!invoiceSearch.trim()) return invoices || [];
    const q = invoiceSearch.toLowerCase();
    return (invoices || []).filter(i =>
      (i.invoiceCode || '').toLowerCase().includes(q) ||
      String(i.month || '').includes(q) ||
      (i.status || '').toLowerCase().includes(q)
    );
  }, [invoices, invoiceSearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 84 }}>

      {/* ── TOAST THÔNG BÁO TẠM THỜI ── */}
      {feedbackMsg.text && (
        <div style={{
          position: 'fixed',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: feedbackMsg.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: 30,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: '90%',
          animation: 'slideDown 0.25s ease'
        }}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* ⚠️ BANNER CẢNH BÁO NẾU HỢP ĐỒNG ĐÃ HẾT HẠN HOẶC THANH LÝ */}
        {isContractLiquidated && (
          <div style={{
            background: isLight ? '#fef2f2' : 'rgba(239,68,68,0.1)',
            border: '1.5px solid rgba(239,68,68,0.3)',
            borderRadius: 16, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <div style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: 8, borderRadius: 10 }}>
              <AlertOctagon size={20} />
            </div>
            <div style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
              <strong style={{ color: '#ef4444', display: 'block', fontSize: '13.5px' }}>Hợp đồng đã thanh lý</strong>
              Bạn đã hoàn tất trả phòng và thanh lý hợp đồng. Dữ liệu được lưu trữ để tra cứu lịch sử.
            </div>
          </div>
        )}

        {!isContractLiquidated && isContractExpired && (
          <div style={{
            background: isLight ? '#fff1f2' : 'rgba(239,68,68,0.12)',
            border: '1.5px solid #ef4444',
            borderRadius: 16, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#ef4444', color: '#fff', padding: 6, borderRadius: 8 }}>
                <Clock size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '13.5px' }}>
                  Hợp đồng thuê phòng đã hết hạn!
                </div>
                <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
                  Hết hạn ngày: {formatDate(activeContract?.endDate)}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleOpenRenewModal(activeContract)}
              style={{
                background: '#ef4444', color: '#fff', border: 'none',
                borderRadius: 10, padding: '9px 14px', fontWeight: 800, fontSize: '12.5px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
              }}
            >
              <Clock size={15} /> Gia Hạn Hợp Đồng Ngay
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* ──────── TAB 1: TRANG CHỦ (HOME / DASHBOARD) ───────── */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <>
            {/* Card Phòng Hiện Tại Của Khách Thuê */}
            <div style={{
              background: isLight
                ? 'linear-gradient(135deg, #ffffff, #f0fdf4)'
                : 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(15,23,42,0.9))',
              border: `1px solid ${isLight ? '#bbf7d0' : 'rgba(16,185,129,0.3)'}`,
              borderRadius: '20px',
              padding: '18px',
              boxShadow: isLight ? '0 4px 18px rgba(16,185,129,0.08)' : '0 8px 24px rgba(0,0,0,0.3)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{
                    fontSize: '11px', fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '0.6px', color: '#10b981', display: 'inline-block', marginBottom: 4
                  }}>
                    Phòng Trọ Đang Thuê
                  </span>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: isLight ? '#0f172a' : '#fff' }}>
                    {currentRoomNumber.startsWith('P.') || currentRoomNumber.startsWith('Phòng') ? currentRoomNumber : `Phòng ${currentRoomNumber}`}
                  </h2>
                  <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Building2 size={13} color="#10b981" /> {currentZoneName}
                  </div>
                </div>

                <div style={{
                  background: isContractLiquidated ? 'rgba(148,163,184,0.15)' : 'rgba(16,185,129,0.15)',
                  color: isContractLiquidated ? '#94a3b8' : '#10b981',
                  padding: '5px 12px', borderRadius: 20, fontSize: '11px', fontWeight: 800
                }}>
                  {isContractLiquidated ? 'Đã trả phòng' : 'Đang hiệu lực'}
                </div>
              </div>

              {/* Thông số nhanh */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                marginTop: 16, paddingTop: 14,
                borderTop: `1px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Tiền thuê/tháng</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                    {formatVND(dashboard?.rentAmount || activeContract?.rentAmount || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Tiền cọc giữ</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, marginTop: 2 }}>
                    {formatVND(dashboard?.deposit || activeContract?.deposit || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>Phương tiện</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#6366f1', marginTop: 2 }}>
                    {vehicleForm.count > 0 ? `${vehicleForm.count} xe gửi` : 'Chưa đăng ký'}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Hồ Sơ Cá Nhân & Định Danh CCCD của Khách Thuê */}
            <div style={{
              background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '20px',
              padding: '16px',
              boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.03)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={getImageUrl(profile?.avatarUrl, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100')}
                    alt="Avatar"
                    style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #10b981', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: isLight ? '#0f172a' : '#fff' }}>
                      {profile?.fullName || dashboard?.tenantName || 'Khách thuê'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      {profile?.phoneNumber || profile?.phone || dashboard?.phone || 'Chưa cập nhật SĐT'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setActiveTab('profile'); setProfileSubTab('info'); }}
                  style={{
                    background: 'rgba(16,185,129,0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 10,
                    padding: '7px 12px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <Edit size={13} /> Sửa hồ sơ
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                paddingTop: 10,
                borderTop: `1px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)'}`,
                fontSize: '11.5px'
              }}>
                <div style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 8 }}>
                  <div style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Số CCCD:</div>
                  <div style={{ fontWeight: 700, marginTop: 2, color: profile?.cccd ? (isLight ? '#0f172a' : '#fff') : '#f59e0b' }}>
                    {profile?.cccd || 'Chưa định danh'}
                  </div>
                </div>
                <div style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 8 }}>
                  <div style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Quê quán:</div>
                  <div style={{ fontWeight: 700, marginTop: 2, color: isLight ? '#0f172a' : '#fff' }}>
                    {profile?.hometown || 'Chưa cập nhật'}
                  </div>
                </div>
              </div>
            </div>

            {/* ── LỐI TẮT THAO TÁC NGHIỆP VỤ NHANH DÀNH CHO KHÁCH THUÊ ── */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={15} color="#f59e0b" /> Thao Tác Nghiệp Vụ Nhanh
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  {
                    label: 'Báo sửa', icon: Wrench, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',
                    onClick: () => { setRepairForm(prev => ({ ...prev, title: '', description: '' })); setActiveModal('repair_create'); }
                  },
                  {
                    label: 'Quét QR', icon: QrCode, color: '#10b981', bg: 'rgba(16,185,129,0.12)',
                    onClick: () => handleOpenQrPay()
                  },
                  {
                    label: 'Hồ sơ & CCCD', icon: User, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',
                    onClick: () => { setActiveTab('profile'); setProfileSubTab('info'); }
                  },
                  {
                    label: 'Đăng ký xe', icon: Bike, color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',
                    onClick: () => { setActiveTab('profile'); setProfileSubTab('vehicle'); }
                  },
                  {
                    label: 'Hợp đồng', icon: FileText, color: '#6366f1', bg: 'rgba(99,102,241,0.12)',
                    onClick: () => setActiveTab('contracts')
                  },
                  {
                    label: 'Khiếu nại', icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.12)',
                    onClick: () => {
                      if (unpaidInvoices.length > 0) handleOpenDispute(unpaidInvoices[0]);
                      else setActiveTab('invoices');
                    }
                  }
                ].map((act, i) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={i}
                      onClick={act.onClick}
                      style={{
                        background: isLight ? '#ffffff' : 'rgba(17,24,39,0.8)',
                        border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 14, padding: '12px 6px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        cursor: 'pointer', transition: 'transform 0.15s ease'
                      }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: act.bg, color: act.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Icon size={18} />
                      </div>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: isLight ? '#334155' : '#cbd5e1' }}>
                        {act.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hóa Đơn Tiền Nhà Mới Nhất */}
            {unpaidInvoices.length > 0 ? (
              <div style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                border: `1.5px solid ${isLight ? '#fca5a5' : 'rgba(239,68,68,0.4)'}`,
                borderRadius: '18px', padding: '16px',
                boxShadow: isLight ? '0 4px 16px rgba(239,68,68,0.06)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <span style={{
                      fontSize: '10.5px', fontWeight: 800, background: 'rgba(239,68,68,0.15)',
                      color: '#ef4444', padding: '2px 8px', borderRadius: 4
                    }}>
                      ⚡ Cần thanh toán
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '6px 0 2px' }}>
                      Hóa đơn {unpaidInvoices[0].month ? `Tháng ${unpaidInvoices[0].month}/${unpaidInvoices[0].year}` : unpaidInvoices[0].invoiceCode}
                    </h3>
                    <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      Mã: {unpaidInvoices[0].invoiceCode} • Hạn nộp: {formatDate(unpaidInvoices[0].dueDate || unpaidInvoices[0].createdAt)}
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#ef4444' }}>
                    {formatVND(unpaidInvoices[0].totalAmount)}
                  </div>
                </div>

                {/* Bảng kê chỉ số */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                  background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)',
                  padding: 10, borderRadius: 12, marginBottom: 12
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>⚡ Tiền điện ({unpaidInvoices[0].electricityUsage || 0} kWh)</div>
                    <strong style={{ color: '#f59e0b', fontSize: '13px' }}>{formatVND(unpaidInvoices[0].electricityCost || 0)}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>💧 Tiền nước ({unpaidInvoices[0].waterUsage || 0} m³)</div>
                    <strong style={{ color: '#06b6d4', fontSize: '13px' }}>{formatVND(unpaidInvoices[0].waterCost || 0)}</strong>
                  </div>
                </div>

                {/* Nút hành động cho hóa đơn */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                  <button
                    onClick={() => handleOpenQrPay(unpaidInvoices[0])}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff', border: 'none', borderRadius: 10,
                      padding: '10px 14px', fontWeight: 800, fontSize: '13px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                    }}
                  >
                    <QrCode size={16} /> Thanh Toán Ngay Bằng QR
                  </button>
                  <button
                    onClick={() => handleOpenDispute(unpaidInvoices[0])}
                    style={{
                      background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                      color: isLight ? '#334155' : '#cbd5e1', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 10, padding: '10px 12px', fontWeight: 700, fontSize: '12px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                    }}
                    title="Khiếu nại số điện nước bị sai"
                  >
                    <AlertTriangle size={15} color="#ef4444" /> Khiếu nại
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: 10, borderRadius: 12 }}>
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <strong style={{ fontSize: '14px', color: '#10b981', display: 'block' }}>Đã thanh toán đủ tiền nhà!</strong>
                  <span style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>Hiện tại bạn không còn hóa đơn nào quá hạn.</span>
                </div>
              </div>
            )}

            {/* Yêu Cầu Sửa Chữa Mới Nhất */}
            {maintenanceRequests.length > 0 && (
              <div style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '16px', padding: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Wrench size={15} color="#f59e0b" /> Sự Cố Báo Hỏng Gần Đây
                  </div>
                  <button
                    onClick={() => setActiveTab('repairs')}
                    style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Xem tất cả ({maintenanceRequests.length}) →
                  </button>
                </div>

                <div
                  onClick={() => { setSelectedRepair(maintenanceRequests[0]); setActiveModal('repair_detail'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    padding: 8, borderRadius: 10, background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.5)'
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Wrench size={18} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: isLight ? '#0f172a' : '#fff' }}>
                      {maintenanceRequests[0].title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 2 }}>
                      Trạng thái: <strong style={{ color: '#10b981' }}>{maintenanceRequests[0].status || 'Chờ xử lý'}</strong> • {formatDate(maintenanceRequests[0].createdAt)}
                    </div>
                  </div>
                  <ChevronRight size={16} color={isLight ? '#94a3b8' : '#64748b'} />
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* ──────── TAB 2: HÓA ĐƠN & KHIẾU NẠI (INVOICES) ─────── */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeTab === 'invoices' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header & Thanh tìm kiếm */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 900, margin: 0 }}>Hóa Đơn Của Tôi</h3>
                <div style={{ fontSize: '12px', color: unpaidInvoices.length > 0 ? '#ef4444' : '#10b981', fontWeight: 700, marginTop: 2 }}>
                  {unpaidInvoices.length > 0 ? `${unpaidInvoices.length} hóa đơn cần thanh toán` : 'Đã thanh toán đủ các kỳ'}
                </div>
              </div>
              <button
                onClick={() => handleOpenQrPay()}
                style={{
                  background: '#10b981', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '7px 12px', fontSize: '12px', fontWeight: 800,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
                }}
              >
                <QrCode size={14} /> Quét QR
              </button>
            </div>

            {/* Ô tìm kiếm hóa đơn */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: isLight ? '#94a3b8' : '#64748b' }} />
              <input
                type="text"
                placeholder="Tìm theo mã HĐ, tháng (VD: 10, HD-101)..."
                value={invoiceSearch}
                onChange={e => setInvoiceSearch(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10,
                  background: isLight ? '#ffffff' : '#1f2937',
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Danh Sách Hóa Đơn Chưa Thanh Toán */}
            {filteredInvoices.filter(i => (i.status || '').toLowerCase() !== 'paid').map(inv => (
              <div
                key={inv.id}
                style={{
                  background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                  border: `1.5px solid ${isLight ? '#fca5a5' : 'rgba(239,68,68,0.4)'}`,
                  borderRadius: '16px', padding: '16px',
                  boxShadow: isLight ? '0 4px 14px rgba(239,68,68,0.06)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: 4 }}>
                        Chưa thanh toán
                      </span>
                      {inv.isReported && (
                        <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: 4 }}>
                          ⚠️ Đang khiếu nại
                        </span>
                      )}
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '8px 0 2px' }}>
                      Hóa đơn {inv.month ? `Tháng ${inv.month}/${inv.year}` : inv.invoiceCode}
                    </h4>
                    <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      Mã: {inv.invoiceCode} • Hạn: {formatDate(inv.dueDate || inv.createdAt)}
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#ef4444' }}>
                    {formatVND(inv.totalAmount)}
                  </div>
                </div>

                {/* Bảng kê chi tiết từng dòng */}
                <div style={{
                  margin: '12px 0', padding: '10px 12px',
                  background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)',
                  borderRadius: 10, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 6
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền phòng</span>
                    <strong>{formatVND(inv.rentAmount || inv.roomPrice || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                      Điện: {inv.electricityUsage || 0} kWh ({inv.oldElectricityIndex || 0} → {inv.newElectricityIndex || 0})
                    </span>
                    <strong style={{ color: '#f59e0b' }}>{formatVND(inv.electricityCost || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                      Nước: {inv.waterUsage || 0} m³ ({inv.oldWaterIndex || 0} → {inv.newWaterIndex || 0})
                    </span>
                    <strong style={{ color: '#06b6d4' }}>{formatVND(inv.waterCost || 0)}</strong>
                  </div>
                  {inv.servicesCost > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Dịch vụ phòng</span>
                      <strong>{formatVND(inv.servicesCost)}</strong>
                    </div>
                  )}
                  {inv.penaltyAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                      <span>Phạt nợ cũ</span>
                      <strong>+{formatVND(inv.penaltyAmount)}</strong>
                    </div>
                  )}
                </div>

                {/* Các nút hành động */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleOpenQrPay(inv)}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff', border: 'none', borderRadius: 10,
                      padding: '10px', fontWeight: 800, fontSize: '13px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                    }}
                  >
                    <QrCode size={16} /> Thanh Toán QR
                  </button>

                  <button
                    onClick={() => handleOpenDispute(inv)}
                    style={{
                      background: inv.isReported ? 'rgba(245,158,11,0.15)' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)'),
                      color: inv.isReported ? '#f59e0b' : (isLight ? '#475569' : '#cbd5e1'),
                      border: `1px solid ${inv.isReported ? '#f59e0b' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)')}`,
                      borderRadius: 10, padding: '10px 14px', fontWeight: 700, fontSize: '12px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
                    }}
                  >
                    <AlertTriangle size={15} color={inv.isReported ? '#f59e0b' : '#ef4444'} />
                    {inv.isReported ? 'Xem khiếu nại' : 'Khiếu nại'}
                  </button>
                </div>
              </div>
            ))}

            {/* Danh Sách Hóa Đơn Đã Thanh Toán */}
            {filteredInvoices.filter(i => (i.status || '').toLowerCase() === 'paid').map(inv => (
              <div
                key={inv.id}
                style={{
                  background: isLight ? '#ffffff' : 'rgba(17,24,39,0.7)',
                  border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '16px', padding: '16px', opacity: 0.95
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: 4 }}>
                      ✅ Đã thanh toán
                    </span>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '8px 0 2px' }}>
                      Hóa đơn {inv.month ? `Tháng ${inv.month}/${inv.year}` : inv.invoiceCode}
                    </h4>
                    <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      Ngày trả: {formatDate(inv.paidAt || inv.updatedAt || inv.createdAt)}
                    </div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>
                    {formatVND(inv.totalAmount)}
                  </div>
                </div>

                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setSelectedInvoice(inv); setActiveModal('invoice_detail'); }}
                    style={{
                      background: 'none', border: 'none', color: '#6366f1',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <Eye size={14} /> Xem phiếu thu chi tiết →
                  </button>
                </div>
              </div>
            ))}

            {filteredInvoices.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: isLight ? '#64748b' : '#94a3b8' }}>
                <Receipt size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div>Không tìm thấy hóa đơn nào phù hợp</div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* ──────── TAB 3: THANH TOÁN & BIÊN LAI (PAYMENTS) ────── */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeTab === 'payments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Sub-tab Switcher: Quét mã QR vs Lịch sử thanh toán */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
              background: isLight ? '#e2e8f0' : 'rgba(15,23,42,0.8)',
              padding: 4, borderRadius: 12
            }}>
              <button
                onClick={() => setPaymentSubTab('qr_pay')}
                style={{
                  border: 'none', borderRadius: 8, padding: '9px 12px',
                  fontWeight: 800, fontSize: '12.5px', cursor: 'pointer',
                  background: paymentSubTab === 'qr_pay' ? (isLight ? '#fff' : '#10b981') : 'transparent',
                  color: paymentSubTab === 'qr_pay' ? (isLight ? '#0f172a' : '#fff') : (isLight ? '#64748b' : '#94a3b8'),
                  boxShadow: paymentSubTab === 'qr_pay' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <QrCode size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                Quét Mã VietQR
              </button>
              <button
                onClick={() => setPaymentSubTab('history')}
                style={{
                  border: 'none', borderRadius: 8, padding: '9px 12px',
                  fontWeight: 800, fontSize: '12.5px', cursor: 'pointer',
                  background: paymentSubTab === 'history' ? (isLight ? '#fff' : '#10b981') : 'transparent',
                  color: paymentSubTab === 'history' ? (isLight ? '#0f172a' : '#fff') : (isLight ? '#64748b' : '#94a3b8'),
                  boxShadow: paymentSubTab === 'history' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <Clock size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                Lịch Sử Duyệt ({payments.length})
              </button>
            </div>

            {/* ── SUB-TAB 1: QUÉT MÃ VIETQR TỰ ĐỘNG ── */}
            {paymentSubTab === 'qr_pay' && (
              <div>
                {paymentSuccess ? (
                  <div style={{
                    background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                    borderRadius: 18, padding: '30px 20px', textAlign: 'center',
                    border: '1.5px solid #10b981'
                  }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: 'rgba(16,185,129,0.15)', color: '#10b981',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px'
                    }}>
                      <CheckCircle2 size={36} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', margin: '0 0 6px' }}>
                      Đã Gửi Biên Lai Thành Công!
                    </h3>
                    <p style={{ fontSize: '13px', color: isLight ? '#64748b' : '#94a3b8', margin: '0 0 18px', lineHeight: 1.5 }}>
                      Khoản thanh toán của bạn đang được Chủ trọ kiểm tra và đối soát. Bạn có thể theo dõi tiến độ ở mục <strong>"Lịch Sử Duyệt"</strong>.
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => setPaymentSubTab('history')}
                        style={{
                          flex: 1, background: '#10b981', color: '#fff', border: 'none',
                          borderRadius: 10, padding: '11px', fontWeight: 800, fontSize: '13px', cursor: 'pointer'
                        }}
                      >
                        Xem Lịch Sử Duyệt
                      </button>
                      <button
                        onClick={() => setPaymentSuccess(false)}
                        style={{
                          background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                          color: isLight ? '#334155' : '#cbd5e1', border: 'none',
                          borderRadius: 10, padding: '11px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer'
                        }}
                      >
                        Gửi tiếp
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Bộ chọn hóa đơn nếu có nhiều hóa đơn chưa trả */}
                    {unpaidInvoices.length > 1 && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                          Chọn hóa đơn cần thanh toán:
                        </label>
                        <select
                          value={selectedInvoice?.id || unpaidInvoices[0]?.id || ''}
                          onChange={e => {
                            const found = unpaidInvoices.find(i => i.id === e.target.value);
                            if (found) setSelectedInvoice(found);
                          }}
                          style={{
                            width: '100%', padding: '9px 12px', borderRadius: 10,
                            background: isLight ? '#ffffff' : '#1f2937',
                            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                            color: isLight ? '#0f172a' : '#fff', fontSize: '13px'
                          }}
                        >
                          {unpaidInvoices.map(inv => (
                            <option key={inv.id} value={inv.id}>
                              HĐ Tháng {inv.month}/{inv.year} ({inv.invoiceCode}) - {formatVND(inv.totalAmount)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(() => {
                      const inv = selectedInvoice || unpaidInvoices[0] || invoices[0] || null;
                      const amt = inv ? inv.totalAmount : 0;
                      const bank = inv?.landlordBankName || dashboard?.landlordBankName || '';
                      const accNo = inv?.landlordBankAccountNumber || dashboard?.landlordBankAccountNumber || '';
                      const accName = inv?.landlordBankAccountName || dashboard?.landlordBankAccountName || '';
                      const content = `Phong ${inv?.roomNumber || currentRoomNumber} thanh toan ${inv?.invoiceCode || 'tien nha'}`;
                      const qrUrl = accNo ? getVietQRUrl({
                        bankId: bank || 'BIDV',
                        accountNo: accNo,
                        accountName: accName,
                        amount: amt,
                        addInfo: content
                      }) : '';

                      return (
                        <div style={{
                          background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: '18px', padding: '16px'
                        }}>
                          {/* Khung Mã QR */}
                          <div style={{ textAlign: 'center', marginBottom: 14 }}>
                            {accNo && qrUrl ? (
                              <div style={{ display: 'inline-block' }}>
                                <div
                                  onClick={() => { setZoomedImageUrl(qrUrl); setActiveModal('qr_zoom'); }}
                                  style={{
                                    padding: 12, background: '#fff', borderRadius: 16,
                                    border: '2px solid #10b981', cursor: 'pointer',
                                    boxShadow: '0 8px 24px rgba(16,185,129,0.15)',
                                    display: 'inline-block'
                                  }}
                                  title="Bấm để phóng to mã QR"
                                >
                                  <img
                                    src={qrUrl}
                                    alt="VietQR Code"
                                    style={{ width: '210px', height: '210px', display: 'block', margin: '0 auto' }}
                                  />
                                  <div style={{
                                    marginTop: 6, background: '#10b981', color: '#fff',
                                    padding: '3px 10px', borderRadius: 20, fontSize: '11px',
                                    fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4
                                  }}>
                                    <ZoomIn size={13} /> Phóng to QR
                                  </div>
                                </div>
                                <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', marginTop: 8 }}>
                                  📸 Dùng app ngân hàng bất kỳ (MB, Vietcombank, Techcombank, VCB...) để quét
                                </div>
                              </div>
                            ) : (
                              <div style={{
                                padding: '24px 16px', borderRadius: 14,
                                background: 'rgba(239,68,68,0.08)', border: '1.5px dashed rgba(239,68,68,0.3)',
                                color: '#ef4444', fontSize: '13px', lineHeight: 1.5
                              }}>
                                ⚠️ Chủ trọ chưa thiết lập tài khoản ngân hàng nhận tiền trên hệ thống.<br />
                                Vui lòng liên hệ trực tiếp chủ trọ để thanh toán tiền mặt hoặc lấy STK.
                              </div>
                            )}
                          </div>

                          {/* Chi tiết tài khoản nhận tiền */}
                          <div style={{
                            background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)',
                            border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 14, padding: '12px 14px', fontSize: '12.5px',
                            display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Ngân hàng:</span>
                              <strong>{bank || 'Chưa thiết lập'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Số tài khoản:</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <strong style={{ color: '#10b981', fontSize: '14px' }}>{accNo || 'Chưa thiết lập'}</strong>
                                {accNo && (
                                  <button
                                    onClick={() => handleCopy(accNo, 'accNo')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981' }}
                                  >
                                    {copiedField === 'accNo' ? <Check size={14} /> : <Copy size={14} />}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Chủ tài khoản:</span>
                              <strong>{accName || 'Chưa thiết lập'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Số tiền chuyển:</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <strong style={{ color: '#ef4444', fontSize: '15px' }}>{formatVND(amt)}</strong>
                                <button
                                  onClick={() => handleCopy(amt, 'amt')}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                >
                                  {copiedField === 'amt' ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Nội dung CK:</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <strong style={{ color: '#f59e0b' }}>{content}</strong>
                                <button
                                  onClick={() => handleCopy(content, 'content')}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b' }}
                                >
                                  {copiedField === 'content' ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Đính kèm ảnh biên lai thanh toán */}
                          <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                              📷 Đính kèm ảnh biên lai / ủy nhiệm chi (để chủ trọ duyệt nhanh):
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePaymentFileChange}
                              style={{ width: '100%', fontSize: '12px' }}
                            />
                            {paymentForm.proofPreview && (
                              <div style={{ position: 'relative', marginTop: 8 }}>
                                <img
                                  src={paymentForm.proofPreview}
                                  alt="Minh chứng"
                                  style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 10, border: '1px solid #10b981' }}
                                />
                                <button
                                  onClick={() => setPaymentForm(prev => ({ ...prev, proofFile: null, proofPreview: '' }))}
                                  style={{
                                    position: 'absolute', top: 6, right: 6,
                                    background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                                    borderRadius: '50%', width: 24, height: 24, cursor: 'pointer'
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Ghi chú chuyển tiền */}
                          <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                              Ghi chú thêm (tùy chọn):
                            </label>
                            <input
                              type="text"
                              placeholder="Ví dụ: Đã chuyển qua Vietcombank lúc 14:30..."
                              value={paymentForm.note}
                              onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })}
                              style={{
                                width: '100%', padding: '9px 12px', borderRadius: 10,
                                background: isLight ? '#f8fafc' : '#1f2937',
                                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                                color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box'
                              }}
                            />
                          </div>

                          <button
                            onClick={handleConfirmPayment}
                            disabled={actionLoading || !accNo}
                            style={{
                              width: '100%',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#fff', border: 'none', borderRadius: 12,
                              padding: '12px', fontWeight: 800, fontSize: '14px',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                              opacity: !accNo ? 0.6 : 1
                            }}
                          >
                            <CheckCircle2 size={18} /> {actionLoading ? 'Đang gửi...' : '✅ Tôi Đã Chuyển Khoản Xong'}
                          </button>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* ── SUB-TAB 2: LỊCH SỬ DUYỆT THANH TOÁN ── */}
            {paymentSubTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {payments.map(p => {
                  const s = (p.status || '').toLowerCase();
                  const isApproved = s === 'approved' || s === 'completed';
                  const isRejected = s === 'rejected';
                  const isPending = !isApproved && !isRejected;

                  return (
                    <div
                      key={p.id}
                      style={{
                        background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                        border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 16, padding: '14px 16px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{
                            fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                            background: isApproved ? 'rgba(16,185,129,0.15)' : isRejected ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                            color: isApproved ? '#10b981' : isRejected ? '#ef4444' : '#f59e0b'
                          }}>
                            {isApproved ? '✅ Đã duyệt' : isRejected ? '❌ Bị từ chối' : '⏳ Chờ chủ trọ duyệt'}
                          </span>
                          <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '6px 0 2px' }}>
                            {p.roomNumber ? `Phòng ${p.roomNumber}` : 'Thanh toán tiền nhà'}
                          </h4>
                          <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
                            Ngày gửi: {formatDateTime(p.createdAt || p.paymentDate)}
                          </div>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>
                          {formatVND(p.amount)}
                        </div>
                      </div>

                      {p.notes && (
                        <div style={{
                          margin: '8px 0', padding: '6px 10px',
                          background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.5)',
                          borderRadius: 8, fontSize: '12px', color: isLight ? '#475569' : '#cbd5e1'
                        }}>
                          Ghi chú: {p.notes}
                        </div>
                      )}

                      {/* Lý do từ chối nếu có */}
                      {isRejected && p.rejectionReason && (
                        <div style={{
                          margin: '8px 0', padding: '8px 10px',
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 8, fontSize: '12px', color: '#ef4444'
                        }}>
                          ⚠️ <strong>Lý do từ chối:</strong> {p.rejectionReason}
                        </div>
                      )}

                      {/* Ảnh minh chứng biên lai đính kèm */}
                      {p.proofImageUrl && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button
                            onClick={() => { setZoomedImageUrl(getImageUrl(p.proofImageUrl)); setActiveModal('proof_zoom'); }}
                            style={{
                              background: 'none', border: 'none', color: '#6366f1',
                              fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                            }}
                          >
                            <ImageIcon size={14} /> Xem ảnh biên lai đã gửi
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {payments.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: isLight ? '#64748b' : '#94a3b8' }}>
                    <CreditCard size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div>Chưa có lịch sử thanh toán nào được ghi nhận</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* ──────── TAB 4: BÁO HỎNG & SỬA CHỮA (REPAIRS) ──────── */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeTab === 'repairs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 900, margin: 0 }}>Sự Cố & Báo Hỏng</h3>
                <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>
                  {maintenanceRequests.length} phiếu báo sửa chữa
                </div>
              </div>
              <button
                onClick={() => { setRepairForm(prev => ({ ...prev, title: '', description: '' })); setActiveModal('repair_create'); }}
                style={{
                  background: '#f59e0b', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '8px 14px', fontSize: '12.5px', fontWeight: 800,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
                }}
              >
                <Plus size={16} /> Gửi Báo Hỏng
              </button>
            </div>

            {/* Bộ lọc trạng thái */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5,
              background: isLight ? '#e2e8f0' : 'rgba(15,23,42,0.8)',
              padding: 4, borderRadius: 12
            }}>
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'PENDING', label: 'Chờ duyệt' },
                { id: 'IN_PROGRESS', label: 'Đang sửa' },
                { id: 'COMPLETED', label: 'Đã xong' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setRepairFilter(f.id)}
                  style={{
                    border: 'none', borderRadius: 8, padding: '7px 4px',
                    fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                    background: repairFilter === f.id ? (isLight ? '#fff' : '#f59e0b') : 'transparent',
                    color: repairFilter === f.id ? (isLight ? '#0f172a' : '#fff') : (isLight ? '#64748b' : '#94a3b8')
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Danh sách các yêu cầu sửa chữa */}
            {filteredRepairs.map(item => (
              <div
                key={item.id}
                onClick={() => { setSelectedRepair(item); setActiveModal('repair_detail'); }}
                style={{
                  background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                  border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '16px', padding: '16px', cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{
                      fontSize: '11px', fontWeight: 800,
                      background: item.status === 'Completed' ? 'rgba(16,185,129,0.15)' : item.status === 'InProgress' ? 'rgba(6,182,212,0.15)' : 'rgba(245,158,11,0.15)',
                      color: item.status === 'Completed' ? '#10b981' : item.status === 'InProgress' ? '#06b6d4' : '#f59e0b',
                      padding: '2px 8px', borderRadius: 4
                    }}>
                      {item.status === 'Completed' ? '✅ Đã hoàn thành' : item.status === 'InProgress' ? '🛠️ Đang sửa chữa' : '⏳ Chờ tiếp nhận'}
                    </span>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '8px 0 2px' }}>
                      {item.title}
                    </h4>
                    <div style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
                      Loại: {item.issueType || 'Sự cố'} • Ngày gửi: {formatDate(item.createdAt)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 700,
                    color: item.priority === 'High' || item.priority === 'Urgent' ? '#ef4444' : '#6366f1'
                  }}>
                    {item.priority === 'High' || item.priority === 'Urgent' ? '⚡ Khẩn cấp' : 'Bình thường'}
                  </span>
                </div>

                {item.description && (
                  <div style={{
                    margin: '10px 0 0', padding: '8px 10px',
                    background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.5)',
                    borderRadius: 8, fontSize: '12px', color: isLight ? '#475569' : '#cbd5e1'
                  }}>
                    {item.description}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)'}` }}>
                  <span style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8' }}>
                    {item.imageUrl ? '📷 Có ảnh hiện trường' : 'Không có ảnh'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
                    Xem chi tiết xử lý →
                  </span>
                </div>
              </div>
            ))}

            {filteredRepairs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: isLight ? '#64748b' : '#94a3b8' }}>
                <Wrench size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div>Không có phiếu báo hỏng nào trong mục này</div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* ──────── TAB 5: HỢP ĐỒNG & KÝ SỐ (CONTRACTS) ───────── */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeTab === 'contracts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 900, margin: 0 }}>Hợp Đồng Của Tôi</h3>
                <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>
                  {myContracts.length} hợp đồng thuê phòng
                </div>
              </div>
            </div>

            {myContracts.map(cont => {
              const info = getContractStatusInfo(cont);
              const isPendingSign = cont.status === 'PendingSignature' || !cont.isSignedByTenant;
              const hasRenewPending = Boolean(cont.requestedRenewMonths);

              return (
                <div
                  key={cont.id}
                  style={{
                    background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                    border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(99,102,241,0.35)'}`,
                    borderRadius: '18px', padding: '18px',
                    boxShadow: isLight ? '0 4px 14px rgba(0,0,0,0.04)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 800, background: 'rgba(99,102,241,0.15)',
                      color: '#6366f1', padding: '3px 8px', borderRadius: 6
                    }}>
                      {cont.isCoTenant ? '👥 Phụ lục HĐ Ở Ghép' : '📜 Hợp Đồng Thuê Nhà'}
                    </span>
                    <span style={{
                      fontSize: '11px', fontWeight: 800,
                      background: info.isActive ? 'rgba(16,185,129,0.15)' : info.isLiquidated ? 'rgba(148,163,184,0.15)' : 'rgba(245,158,11,0.15)',
                      color: info.isActive ? '#10b981' : info.isLiquidated ? '#94a3b8' : '#f59e0b',
                      padding: '3px 8px', borderRadius: 6
                    }}>
                      {info.isActive ? '✅ Đang hiệu lực' : info.isLiquidated ? 'Đã thanh lý' : cont.status || 'Chờ xác nhận'}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '17px', fontWeight: 900, margin: '0 0 4px' }}>
                    {cont.contractCode || `HĐ-${cont.roomNumber || currentRoomNumber}`}
                  </h4>
                  <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8', marginBottom: 14 }}>
                    Phòng: <strong style={{ color: isLight ? '#0f172a' : '#fff' }}>{cont.roomNumber || currentRoomNumber}</strong> • {cont.zoneName || currentZoneName}
                  </div>

                  {/* 4 Chỉ số quan trọng */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
                    background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)',
                    padding: 12, borderRadius: 12, fontSize: '12px', marginBottom: 14
                  }}>
                    <div>
                      <div style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền cọc giữ chỗ</div>
                      <strong style={{ color: '#10b981', fontSize: '14px' }}>{formatVND(cont.deposit || cont.depositAmount || 0)}</strong>
                    </div>
                    <div>
                      <div style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền thuê hàng tháng</div>
                      <strong style={{ fontSize: '14px' }}>{formatVND(cont.rentAmount || cont.monthlyRent || 0)}</strong>
                    </div>
                    <div>
                      <div style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Ngày bắt đầu</div>
                      <strong>{formatDate(cont.startDate)}</strong>
                    </div>
                    <div>
                      <div style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Ngày kết thúc</div>
                      <strong>{formatDate(cont.endDate)}</strong>
                    </div>
                  </div>

                  {/* Trạng thái yêu cầu gia hạn */}
                  {hasRenewPending && (
                    <div style={{
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: '12px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <strong style={{ color: '#f59e0b' }}>⏳ Đang chờ gia hạn:</strong> {cont.requestedRenewMonths} tháng
                      </div>
                      <button
                        onClick={() => handleCancelRenew(cont)}
                        disabled={actionLoading}
                        style={{
                          background: 'none', border: '1px solid #ef4444', color: '#ef4444',
                          borderRadius: 6, padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        Hủy
                      </button>
                    </div>
                  )}

                  {/* Nhóm nút bấm hành động hợp đồng */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Ký Online nếu chưa ký */}
                    {isPendingSign && !info.isLiquidated && (
                      <button
                        onClick={() => handleOpenSignModal(cont)}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: '#fff', border: 'none', borderRadius: 10,
                          padding: '11px', fontWeight: 800, fontSize: '13px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                        }}
                      >
                        <FileCheck size={16} /> ✍️ Đọc & Ký Điện Tử Online Ngay
                      </button>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button
                        onClick={() => { setSelectedContract(cont); setActiveModal('contract_detail'); }}
                        style={{
                          background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                          color: isLight ? '#334155' : '#cbd5e1', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: 10, padding: '9px', fontWeight: 700, fontSize: '12.5px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                        }}
                      >
                        <Eye size={15} /> Xem Toàn Văn HĐ
                      </button>

                      {!info.isLiquidated && (
                        <button
                          onClick={() => handleOpenRenewModal(cont)}
                          style={{
                            background: info.isExpired ? '#ef4444' : (isLight ? '#e0e7ff' : 'rgba(99,102,241,0.15)'),
                            color: info.isExpired ? '#fff' : '#6366f1',
                            border: `1px solid ${info.isExpired ? '#ef4444' : 'rgba(99,102,241,0.3)'}`,
                            borderRadius: 10, padding: '9px', fontWeight: 800, fontSize: '12.5px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                          }}
                        >
                          <Clock size={15} /> {hasRenewPending ? 'Sửa Gia Hạn' : 'Gia Hạn HĐ'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {myContracts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: isLight ? '#64748b' : '#94a3b8' }}>
                <FileText size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div>Bạn chưa có hợp đồng thuê nhà nào trên hệ thống</div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* ──────── TAB 6: HỒ SƠ, CCCD & XE CỘ (PROFILE) ──────── */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Thẻ đại diện cá nhân */}
            <div style={{
              background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '18px', padding: '18px', textAlign: 'center'
            }}>
              <img
                src={getImageUrl(profile?.avatarUrl, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120')}
                alt="Avatar"
                style={{ width: 68, height: 68, borderRadius: '50%', border: '3px solid #10b981', margin: '0 auto 8px', objectFit: 'cover' }}
              />
              <h3 style={{ fontSize: '17px', fontWeight: 900, margin: '0 0 2px' }}>
                {profile?.fullName || 'Khách Thuê Phòng'}
              </h3>
              <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8' }}>
                {profile?.email || 'tenant@smartrent.vn'} • {profile?.phoneNumber || profile?.phone || 'Chưa cập nhật SĐT'}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '4px 12px', borderRadius: 20, fontSize: '11px', fontWeight: 800, marginTop: 8 }}>
                <ShieldCheck size={13} /> {profile?.cccd ? 'Đã xác thực CCCD' : 'Khách thuê SmartRent'}
              </div>
            </div>

            {/* Sub-tab Switcher: Thông tin cá nhân | Đăng ký xe | Đổi mật khẩu */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5,
              background: isLight ? '#e2e8f0' : 'rgba(15,23,42,0.8)',
              padding: 4, borderRadius: 12
            }}>
              {[
                { id: 'info', label: 'Hồ Sơ & CCCD', icon: User },
                { id: 'vehicle', label: 'Xe Gửi', icon: Bike },
                { id: 'password', label: 'Bảo Mật', icon: Lock }
              ].map(st => {
                const Icon = st.icon;
                const isAct = profileSubTab === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setProfileSubTab(st.id)}
                    style={{
                      border: 'none', borderRadius: 8, padding: '8px 4px',
                      fontSize: '11.5px', fontWeight: 800, cursor: 'pointer',
                      background: isAct ? (isLight ? '#fff' : '#10b981') : 'transparent',
                      color: isAct ? (isLight ? '#0f172a' : '#fff') : (isLight ? '#64748b' : '#94a3b8'),
                      boxShadow: isAct ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <Icon size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    {st.label}
                  </button>
                );
              })}
            </div>

            {/* ── MỤC 1: SỬA HỒ SƠ & CCCD ── */}
            {profileSubTab === 'info' && (
              <form onSubmit={handleUpdateProfile} style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12
              }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Họ và tên:
                  </label>
                  <input
                    type="text"
                    value={editProfileForm.fullName}
                    onChange={e => setEditProfileForm({ ...editProfileForm, fullName: e.target.value })}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      background: isLight ? '#f8fafc' : '#1f2937',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Số điện thoại liên hệ:
                  </label>
                  <input
                    type="tel"
                    value={editProfileForm.phone}
                    onChange={e => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      background: isLight ? '#f8fafc' : '#1f2937',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Số CCCD / Định danh:
                  </label>
                  <input
                    type="text"
                    value={editProfileForm.cccd}
                    onChange={e => setEditProfileForm({ ...editProfileForm, cccd: e.target.value })}
                    placeholder="Nhập 12 số CCCD..."
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      background: isLight ? '#f8fafc' : '#1f2937',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Quê quán / Địa chỉ thường trú:
                  </label>
                  <input
                    type="text"
                    value={editProfileForm.hometown}
                    onChange={e => setEditProfileForm({ ...editProfileForm, hometown: e.target.value })}
                    placeholder="Tỉnh/Thành phố quê quán..."
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      background: isLight ? '#f8fafc' : '#1f2937',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Quản lý ảnh CCCD 2 mặt */}
                <div style={{ borderTop: `1px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, paddingTop: 10 }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', display: 'block', marginBottom: 6 }}>
                    🆔 Ảnh chụp 2 mặt CCCD (để đăng ký tạm trú):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <span style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8', display: 'block', marginBottom: 4 }}>
                        Mặt trước:
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setEditProfileForm(prev => ({ ...prev, cccdFrontFile: file, cccdFrontPreview: reader.result }));
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{ fontSize: '11px', width: '100%' }}
                      />
                      {editProfileForm.cccdFrontPreview && (
                        <img
                          src={editProfileForm.cccdFrontPreview}
                          alt="CCCD Trước"
                          style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 8, marginTop: 6, border: '1px solid #10b981' }}
                        />
                      )}
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8', display: 'block', marginBottom: 4 }}>
                        Mặt sau:
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setEditProfileForm(prev => ({ ...prev, cccdBackFile: file, cccdBackPreview: reader.result }));
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{ fontSize: '11px', width: '100%' }}
                      />
                      {editProfileForm.cccdBackPreview && (
                        <img
                          src={editProfileForm.cccdBackPreview}
                          alt="CCCD Sau"
                          style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 8, marginTop: 6, border: '1px solid #10b981' }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: '#10b981', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '11px', fontWeight: 800, fontSize: '13px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    marginTop: 6
                  }}
                >
                  <Check size={16} /> {actionLoading ? 'Đang lưu...' : 'Lưu Thay Đổi Hồ Sơ'}
                </button>
              </form>
            )}

            {/* ── MỤC 2: ĐĂNG KÝ PHƯƠNG TIỆN GỬI XE ── */}
            {profileSubTab === 'vehicle' && (
              <form onSubmit={handleUpdateVehicle} style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12
              }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Số lượng xe gửi tại nhà trọ:
                  </label>
                  <select
                    value={vehicleForm.count}
                    onChange={e => {
                      const count = Number(e.target.value);
                      setVehicleForm(prev => ({
                        count,
                        plates: Array.from({ length: count }, (_, i) => prev.plates[i] || '')
                      }));
                    }}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      background: isLight ? '#f8fafc' : '#1f2937',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      color: isLight ? '#0f172a' : '#fff', fontSize: '13px'
                    }}
                  >
                    {[0, 1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n} xe máy / xe đạp điện</option>
                    ))}
                  </select>
                </div>

                {vehicleForm.count > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block' }}>
                      Biển số các xe gửi:
                    </label>
                    {Array.from({ length: vehicleForm.count }).map((_, idx) => (
                      <input
                        key={idx}
                        type="text"
                        placeholder={`Biển số xe ${idx + 1} (VD: 59B1-123.45)...`}
                        value={vehicleForm.plates[idx] || ''}
                        onChange={e => {
                          const updated = [...vehicleForm.plates];
                          updated[idx] = e.target.value;
                          setVehicleForm(prev => ({ ...prev, plates: updated }));
                        }}
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          background: isLight ? '#f8fafc' : '#1f2937',
                          border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                          color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box'
                        }}
                        required
                      />
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: '#6366f1', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '11px', fontWeight: 800, fontSize: '13px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    marginTop: 6
                  }}
                >
                  <Bike size={16} /> {actionLoading ? 'Đang lưu...' : 'Lưu Đăng Ký Xe Gửi'}
                </button>
              </form>
            )}

            {/* ── MỤC 3: ĐỔI MẬT KHẨU ── */}
            {profileSubTab === 'password' && (
              <form onSubmit={handleChangePassword} style={{
                background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12
              }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Mật khẩu hiện tại:
                  </label>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    placeholder="Nhập mật khẩu cũ..."
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      background: isLight ? '#f8fafc' : '#1f2937',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Mật khẩu mới:
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự..."
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      background: isLight ? '#f8fafc' : '#1f2937',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Xác nhận mật khẩu mới:
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Nhập lại mật khẩu mới..."
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      background: isLight ? '#f8fafc' : '#1f2937',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: '#f59e0b', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '11px', fontWeight: 800, fontSize: '13px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    marginTop: 6
                  }}
                >
                  <Lock size={16} /> {actionLoading ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
                </button>
              </form>
            )}

            {/* Nút Đăng Xuất */}
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn đăng xuất khỏi tài khoản không?')) {
                  onLogout?.();
                }
              }}
              style={{
                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12,
                padding: '12px', fontSize: '14px', fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <LogOut size={16} /> Đăng Xuất Tài Khoản
            </button>
          </div>
        )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── 2. BOTTOM NAVIGATION BAR CHUẨN NATIVE ──────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 520,
        background: isLight ? 'rgba(255,255,255,0.96)' : 'rgba(11,17,32,0.96)',
        backdropFilter: 'blur(16px)',
        borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        padding: '8px 2px 14px',
        flexShrink: 0,
        zIndex: 90
      }}>
        {[
          { id: 'home', label: 'Trang chủ', icon: Home },
          { id: 'invoices', label: 'Hóa đơn', icon: Receipt, badge: unpaidInvoices.length > 0 ? String(unpaidInvoices.length) : null },
          { id: 'payments', label: 'Thanh toán', icon: CreditCard },
          { id: 'repairs', label: 'Báo sửa', icon: Wrench, badge: maintenanceRequests.length > 0 ? String(maintenanceRequests.length) : null },
          { id: 'contracts', label: 'Hợp đồng', icon: FileText },
          { id: 'profile', label: 'Cá nhân', icon: User }
        ].map(tab => {
          const Icon = tab.icon;
          const isAct = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                cursor: 'pointer',
                color: isAct ? '#10b981' : (isLight ? '#64748b' : '#94a3b8'),
                position: 'relative',
                padding: '4px 0',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon size={20} strokeWidth={isAct ? 2.5 : 1.8} />
                {tab.badge && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -9,
                    background: tab.id === 'invoices' ? '#ef4444' : '#f59e0b',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 900,
                    minWidth: 15,
                    height: 15,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '10.5px', fontWeight: isAct ? 800 : 500, letterSpacing: '-0.2px' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── 3. CÁC MODALS & SUBVIEWS CHO KHÁCH THUÊ ─────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}

      {/* ── MODAL 1: KHIẾU NẠI HÓA ĐƠN (DISPUTE FORM) ── */}
      {activeModal === 'dispute' && selectedInvoice && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#111827',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '20px', maxHeight: '90%', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={18} color="#ef4444" /> Khiếu Nại Sai Sót Hóa Đơn
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: isLight ? '#64748b' : '#94a3b8' }}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: isLight ? '#64748b' : '#94a3b8', margin: '0 0 14px' }}>
              Hóa đơn: <strong>{selectedInvoice.invoiceCode}</strong> (Tháng {selectedInvoice.month}/{selectedInvoice.year}) • Phòng {selectedInvoice.roomNumber || currentRoomNumber}
            </p>

            <form onSubmit={handleSubmitDispute} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Lý do phản ánh:
                </label>
                <select
                  value={disputeForm.reason}
                  onChange={e => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 10,
                    background: isLight ? '#f8fafc' : '#1f2937',
                    border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                    color: isLight ? '#0f172a' : '#fff', fontSize: '13px'
                  }}
                >
                  <option value="Sai chỉ số điện / Tiền điện">⚡ Sai chỉ số điện / Tiền điện</option>
                  <option value="Sai chỉ số nước / Tiền nước">💧 Sai chỉ số nước / Tiền nước</option>
                  <option value="Sai tiền phòng thỏa thuận">🏠 Sai tiền phòng thỏa thuận</option>
                  <option value="Dịch vụ tính sai (Wifi, xe, rác...)">📦 Dịch vụ phòng tính sai</option>
                  <option value="Lý do khác">⚠️ Lý do khác</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Chỉ số điện đúng đề xuất:
                  </label>
                  <input
                    type="number"
                    placeholder={`Ghi nhận: ${selectedInvoice.newElectricityIndex || 0}`}
                    value={disputeForm.suggestedElecNumber}
                    onChange={e => setDisputeForm({ ...disputeForm, suggestedElecNumber: e.target.value })}
                    style={{
                      width: '100%', padding: '9px', borderRadius: 8,
                      background: isLight ? '#f8fafc' : '#1f2937',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Chỉ số nước đúng đề xuất:
                  </label>
                  <input
                    type="number"
                    placeholder={`Ghi nhận: ${selectedInvoice.newWaterIndex || 0}`}
                    value={disputeForm.suggestedWaterNumber}
                    onChange={e => setDisputeForm({ ...disputeForm, suggestedWaterNumber: e.target.value })}
                    style={{
                      width: '100%', padding: '9px', borderRadius: 8,
                      background: isLight ? '#f8fafc' : '#1f2937',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Mô tả chi tiết sai sót:
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi rõ đồng hồ điện/nước phòng em hiển thị bao nhiêu, chênh lệch thế nào..."
                  value={disputeForm.description}
                  onChange={e => setDisputeForm({ ...disputeForm, description: e.target.value })}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 10,
                    background: isLight ? '#f8fafc' : '#1f2937',
                    border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                    color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box', resize: 'none'
                  }}
                  required
                />
              </div>

              {/* Chụp / Tải ảnh đồng hồ điện nước thực tế */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  📷 Ảnh chụp công tơ thực tế làm bằng chứng:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleDisputeFileChange}
                  style={{ width: '100%', fontSize: '12px' }}
                />
                {disputeForm.proofImage && (
                  <div style={{ position: 'relative', marginTop: 8 }}>
                    <img
                      src={disputeForm.proofImage}
                      alt="Công tơ minh chứng"
                      style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 8, border: '1px solid #ef4444' }}
                    />
                    <button
                      type="button"
                      onClick={() => setDisputeForm(prev => ({ ...prev, proofImage: '', proofFile: null }))}
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                        borderRadius: '50%', width: 22, height: 22, cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                style={{
                  width: '100%', marginTop: 6,
                  background: '#ef4444', color: '#fff', border: 'none',
                  borderRadius: 12, padding: '12px', fontWeight: 800, fontSize: '14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 4px 14px rgba(239,68,68,0.35)'
                }}
              >
                <Send size={16} /> {actionLoading ? 'Đang gửi...' : 'Gửi Khiếu Nại Cho Chủ Trọ'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: XEM CHI TIẾT KHIẾU NẠI (DISPUTE DETAIL) ── */}
      {activeModal === 'dispute_detail' && selectedInvoice && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#111827',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '20px', maxHeight: '85%', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={18} color="#f59e0b" /> Tiến Độ Khiếu Nại Hóa Đơn
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: isLight ? '#64748b' : '#94a3b8' }}>
                ✕
              </button>
            </div>

            <div style={{
              background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)',
              borderRadius: 14, padding: '14px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Mã hóa đơn:</span>
                <strong>{selectedInvoice.invoiceCode}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Trạng thái xử lý:</span>
                <span style={{
                  fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                  background: selectedInvoice.disputeStatus === 'Approved' ? 'rgba(16,185,129,0.15)' : selectedInvoice.disputeStatus === 'Rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                  color: selectedInvoice.disputeStatus === 'Approved' ? '#10b981' : selectedInvoice.disputeStatus === 'Rejected' ? '#ef4444' : '#f59e0b'
                }}>
                  {selectedInvoice.disputeStatus === 'Approved' ? '✅ Đã chấp thuận sửa' : selectedInvoice.disputeStatus === 'Rejected' ? '❌ Chủ trọ từ chối' : '⏳ Đang chờ chủ trọ duyệt'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Lý do phản ánh:</span>
                <strong>{selectedInvoice.disputeReason || 'Sai chỉ số điện nước'}</strong>
              </div>
              {selectedInvoice.disputeDescription && (
                <div style={{ borderTop: `1px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, paddingTop: 6 }}>
                  <span style={{ color: isLight ? '#64748b' : '#94a3b8', display: 'block', marginBottom: 2 }}>Mô tả của bạn:</span>
                  <div>{selectedInvoice.disputeDescription}</div>
                </div>
              )}
              {selectedInvoice.disputeResponse && (
                <div style={{
                  borderTop: `1px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, paddingTop: 6,
                  color: selectedInvoice.disputeStatus === 'Rejected' ? '#ef4444' : '#10b981'
                }}>
                  <strong style={{ display: 'block', marginBottom: 2 }}>Phản hồi từ Chủ trọ:</strong>
                  <div>{selectedInvoice.disputeResponse}</div>
                </div>
              )}
            </div>

            {/* Ảnh bằng chứng công tơ */}
            {selectedInvoice.disputeImageUrl && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: 4 }}>Ảnh công tơ đã gửi:</div>
                <img
                  src={getImageUrl(selectedInvoice.disputeImageUrl)}
                  alt="Ảnh công tơ"
                  style={{ width: '100%', maxHeight: 150, objectFit: 'contain', borderRadius: 8, border: '1px solid #f59e0b' }}
                />
              </div>
            )}

            {/* Nút hủy khiếu nại nếu còn đang pending */}
            {selectedInvoice.disputeStatus !== 'Approved' && selectedInvoice.disputeStatus !== 'Rejected' && (
              <button
                onClick={() => handleCancelDispute(selectedInvoice)}
                disabled={actionLoading}
                style={{
                  width: '100%', background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
                  padding: '11px', fontWeight: 800, fontSize: '13px', cursor: 'pointer'
                }}
              >
                ✕ Hủy Khiếu Nại Này
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 3: GỬI BÁO HỎNG SỬA CHỮA (REPAIR CREATE) ── */}
      {activeModal === 'repair_create' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#111827',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '20px', maxHeight: '90%', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wrench size={18} color="#f59e0b" /> Báo Sự Cố & Sửa Chữa Phòng
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: isLight ? '#64748b' : '#94a3b8' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRepair} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Loại sự cố */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                  Khu vực / Loại sự cố:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {[
                    { id: 'Máy lạnh', label: 'Máy lạnh', icon: Wind },
                    { id: 'Hệ thống Điện / Đèn', label: 'Điện / Đèn', icon: Zap },
                    { id: 'Vòi nước / Bồn rửa', label: 'Nước / Cống', icon: Droplets },
                    { id: 'Cửa / Khóa phòng', label: 'Khóa cửa', icon: Lock },
                    { id: 'Khác', label: 'Khác', icon: Wrench }
                  ].map(cat => {
                    const Icon = cat.icon;
                    const isSel = repairForm.issueType === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setRepairForm({ ...repairForm, issueType: cat.id })}
                        style={{
                          border: `1.5px solid ${isSel ? '#f59e0b' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)')}`,
                          borderRadius: 8, padding: '8px 4px', fontSize: '11px', fontWeight: 700,
                          background: isSel ? 'rgba(245,158,11,0.15)' : 'transparent',
                          color: isSel ? '#f59e0b' : (isLight ? '#475569' : '#cbd5e1'),
                          cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                        }}
                      >
                        <Icon size={16} /> {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tag gợi ý nhanh */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: isLight ? '#64748b' : '#94a3b8', display: 'block', marginBottom: 4 }}>
                  ⚡ Gợi ý lỗi phổ biến (chạm để chọn nhanh):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    'Không phả hơi lạnh',
                    'Bị rò rỉ / chảy nước',
                    'Mất nguồn / sập aptomat',
                    'Kẹt ổ khóa cửa',
                    'Tắc đường ống thoát nước'
                  ].map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRepairForm(prev => ({ ...prev, title: tag }))}
                      style={{
                        background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                        border: 'none', borderRadius: 14, padding: '4px 9px',
                        fontSize: '11px', color: isLight ? '#334155' : '#cbd5e1', cursor: 'pointer'
                      }}
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tiêu đề */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Tiêu đề sự cố:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Máy lạnh chảy nước xuống sàn..."
                  value={repairForm.title}
                  onChange={e => setRepairForm({ ...repairForm, title: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: isLight ? '#f8fafc' : '#1f2937',
                    border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                    color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Mức độ ưu tiên */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Mức độ khẩn cấp:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setRepairForm({ ...repairForm, priority: 'Medium' })}
                    style={{
                      padding: '8px', borderRadius: 8, fontSize: '12px', fontWeight: 700,
                      border: repairForm.priority === 'Medium' ? '2px solid #6366f1' : `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      background: repairForm.priority === 'Medium' ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: repairForm.priority === 'Medium' ? '#6366f1' : (isLight ? '#64748b' : '#94a3b8'),
                      cursor: 'pointer'
                    }}
                  >
                    Bình thường
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepairForm({ ...repairForm, priority: 'Urgent' })}
                    style={{
                      padding: '8px', borderRadius: 8, fontSize: '12px', fontWeight: 700,
                      border: repairForm.priority === 'Urgent' ? '2px solid #ef4444' : `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      background: repairForm.priority === 'Urgent' ? 'rgba(239,68,68,0.15)' : 'transparent',
                      color: repairForm.priority === 'Urgent' ? '#ef4444' : (isLight ? '#64748b' : '#94a3b8'),
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ Khẩn cấp (ảnh hưởng sinh hoạt)
                  </button>
                </div>
              </div>

              {/* Mô tả chi tiết */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Mô tả vị trí & tình trạng chi tiết:
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả chi tiết để thợ chuẩn bị dụng cụ sửa chữa phù hợp..."
                  value={repairForm.description}
                  onChange={e => setRepairForm({ ...repairForm, description: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: isLight ? '#f8fafc' : '#1f2937',
                    border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                    color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box', resize: 'none'
                  }}
                />
              </div>

              {/* Chụp / Tải ảnh hiện trường sự cố */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  📷 Ảnh chụp hiện trường sự cố (rất khuyến khích):
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleRepairFileChange}
                  style={{ width: '100%', fontSize: '12px' }}
                />
                {repairForm.imagePreview && (
                  <div style={{ position: 'relative', marginTop: 8 }}>
                    <img
                      src={repairForm.imagePreview}
                      alt="Ảnh sự cố"
                      style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 8, border: '1px solid #f59e0b' }}
                    />
                    <button
                      type="button"
                      onClick={() => setRepairForm(prev => ({ ...prev, imageFile: null, imagePreview: '' }))}
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                        borderRadius: '50%', width: 22, height: 22, cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                style={{
                  width: '100%', marginTop: 6,
                  background: '#f59e0b', color: '#fff', border: 'none',
                  borderRadius: 12, padding: '12px', fontWeight: 800, fontSize: '14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 4px 14px rgba(245,158,11,0.35)'
                }}
              >
                <Send size={16} /> {actionLoading ? 'Đang gửi...' : 'Gửi Phiếu Báo Sửa Chữa'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: XEM CHI TIẾT SỰ CỐ & NGHIỆM THU (REPAIR DETAIL) ── */}
      {activeModal === 'repair_detail' && selectedRepair && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#111827',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '20px', maxHeight: '85%', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wrench size={18} color="#f59e0b" /> Chi Tiết Phiếu Sửa Chữa
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: isLight ? '#64748b' : '#94a3b8' }}>
                ✕
              </button>
            </div>

            <div style={{
              background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)',
              borderRadius: 14, padding: '14px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiêu đề:</span>
                <strong>{selectedRepair.title}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Trạng thái:</span>
                <span style={{
                  fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                  background: selectedRepair.status === 'Completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: selectedRepair.status === 'Completed' ? '#10b981' : '#f59e0b'
                }}>
                  {selectedRepair.status === 'Completed' ? '✅ Đã hoàn thành' : selectedRepair.status === 'InProgress' ? '🛠️ Đang sửa' : '⏳ Chờ tiếp nhận'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Người sửa chữa:</span>
                <strong>{selectedRepair.assignedTo || 'Chủ trọ phân công'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Ngày gửi:</span>
                <strong>{formatDate(selectedRepair.createdAt)}</strong>
              </div>
              {selectedRepair.completionNote && (
                <div style={{ borderTop: `1px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, paddingTop: 6, color: '#10b981' }}>
                  <strong style={{ display: 'block', marginBottom: 2 }}>Ghi chú nghiệm thu của thợ:</strong>
                  <div>{selectedRepair.completionNote}</div>
                </div>
              )}
            </div>

            {selectedRepair.imageUrl && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: 4 }}>Ảnh hiện trường sự cố:</div>
                <img
                  src={getImageUrl(selectedRepair.imageUrl)}
                  alt="Hiện trường"
                  style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 8, border: '1px solid #f59e0b' }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 5: GIA HẠN HỢP ĐỒNG (CONTRACT RENEW) ── */}
      {activeModal === 'contract_renew' && selectedContract && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#111827',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '20px', maxHeight: '85%', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={18} color="#6366f1" /> Đăng Ký Gia Hạn Hợp Đồng
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: isLight ? '#64748b' : '#94a3b8' }}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: isLight ? '#64748b' : '#94a3b8', margin: '0 0 14px', lineHeight: 1.5 }}>
              Hợp đồng hiện tại: <strong>{selectedContract.contractCode}</strong> (Hết hạn ngày: {formatDate(selectedContract.endDate)})
            </p>

            <form onSubmit={handleSubmitRenew} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Thời gian gia hạn thêm:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[3, 6, 12].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRenewForm({ ...renewForm, extendMonths: m })}
                      style={{
                        padding: '10px 4px', borderRadius: 8, fontSize: '12.5px', fontWeight: 800,
                        border: renewForm.extendMonths === m ? '2px solid #6366f1' : `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                        background: renewForm.extendMonths === m ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: renewForm.extendMonths === m ? '#6366f1' : (isLight ? '#64748b' : '#94a3b8'),
                        cursor: 'pointer'
                      }}
                    >
                      +{m} tháng
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Ghi chú gửi Chủ trọ (tùy chọn):
                </label>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Em muốn gia hạn thêm 1 năm và giữ nguyên giá phòng hiện tại..."
                  value={renewForm.notes}
                  onChange={e => setRenewForm({ ...renewForm, notes: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: isLight ? '#f8fafc' : '#1f2937',
                    border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                    color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box', resize: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                style={{
                  width: '100%', marginTop: 6,
                  background: '#6366f1', color: '#fff', border: 'none',
                  borderRadius: 12, padding: '12px', fontWeight: 800, fontSize: '14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
                }}
              >
                <Send size={16} /> {actionLoading ? 'Đang gửi...' : 'Gửi Đăng Ký Gia Hạn Cho Chủ Trọ'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 6: KÝ HỢP ĐỒNG ONLINE (CONTRACT SIGN) ── */}
      {activeModal === 'contract_sign' && selectedContract && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#111827',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '20px', maxHeight: '85%', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileCheck size={18} color="#10b981" /> Ký Xác Nhận Hợp Đồng Online
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: isLight ? '#64748b' : '#94a3b8' }}>
                ✕
              </button>
            </div>

            <div style={{
              background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)',
              borderRadius: 14, padding: '12px 14px', fontSize: '12.5px', marginBottom: 14,
              border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)'}`
            }}>
              <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
                Hợp đồng: {selectedContract.contractCode} (Phòng {selectedContract.roomNumber || currentRoomNumber})
              </p>
              <p style={{ margin: '0 0 6px', color: isLight ? '#64748b' : '#94a3b8' }}>
                Thời hạn thuê: Từ {formatDate(selectedContract.startDate)} đến {formatDate(selectedContract.endDate)}
              </p>
              <p style={{ margin: 0, color: '#10b981', fontWeight: 800 }}>
                Tiền thuê: {formatVND(selectedContract.rentAmount || 0)} / tháng • Tiền cọc: {formatVND(selectedContract.deposit || 0)}
              </p>
            </div>

            <form onSubmit={handleSubmitSign} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Ghi chú ký xác nhận (tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đã nhận phòng và đủ chìa khóa..."
                  value={signForm.note}
                  onChange={e => setSignForm({ ...signForm, note: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: isLight ? '#f8fafc' : '#1f2937',
                    border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                    color: isLight ? '#0f172a' : '#fff', fontSize: '13px', boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Checkbox cam kết */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '12px', lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  checked={signForm.agreed}
                  onChange={e => setSignForm({ ...signForm, agreed: e.target.checked })}
                  style={{ marginTop: 2 }}
                  required
                />
                <span>
                  Tôi đã đọc, hiểu rõ và <strong>đồng ý với tất cả điều khoản pháp lý</strong> trong hợp đồng thuê nhà này.
                </span>
              </label>

              <button
                type="submit"
                disabled={actionLoading || !signForm.agreed}
                style={{
                  width: '100%', marginTop: 6,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff', border: 'none',
                  borderRadius: 12, padding: '12px', fontWeight: 800, fontSize: '14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                  opacity: !signForm.agreed ? 0.6 : 1
                }}
              >
                <FileCheck size={18} /> {actionLoading ? 'Đang xác nhận...' : 'Xác Nhận Ký Điện Tử Hợp Đồng'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 7: XEM TOÀN VĂN HỢP ĐỒNG (CONTRACT DETAIL) ── */}
      {activeModal === 'contract_detail' && selectedContract && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#111827',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '20px', maxHeight: '90%', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={18} color="#6366f1" /> Toàn Văn Hợp Đồng Thuê Nhà
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: isLight ? '#64748b' : '#94a3b8' }}>
                ✕
              </button>
            </div>

            <div style={{
              background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)',
              borderRadius: 14, padding: '16px', fontSize: '12.5px', lineHeight: 1.7,
              border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)'}`
            }}>
              <h4 style={{ textAlign: 'center', margin: '0 0 4px', fontSize: '14px', textTransform: 'uppercase' }}>
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </h4>
              <p style={{ textAlign: 'center', margin: '0 0 12px', fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>
                Độc lập - Tự do - Hạnh phúc
              </p>

              <h3 style={{ textAlign: 'center', color: '#6366f1', margin: '0 0 12px', fontSize: '15px' }}>
                HỢP ĐỒNG THUÊ PHÒNG TRỌ: {selectedContract.contractCode}
              </h3>

              <div style={{ marginBottom: 10 }}>
                <strong>BÊN A (BÊN CHO THUÊ):</strong>
                <div>Họ tên: {selectedContract.landlordName || 'Chủ trọ SmartRent'}</div>
                <div>Điện thoại: {selectedContract.landlordPhone || '0908.123.456'}</div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <strong>BÊN B (BÊN THUÊ PHÒNG):</strong>
                <div>Họ tên: {selectedContract.tenantName || profile?.fullName || 'Khách thuê'}</div>
                <div>Số điện thoại: {selectedContract.tenantPhone || profile?.phoneNumber || 'Chưa cập nhật'}</div>
                <div>Số CCCD: {profile?.cccd || 'Đã xác thực hệ thống'}</div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <strong>ĐIỀU KHOẢN THUÊ VÀ THANH TOÁN:</strong>
                <div>• Phòng thuê: <strong>{selectedContract.roomNumber || currentRoomNumber}</strong> - Khu trọ: {selectedContract.zoneName || currentZoneName}</div>
                <div>• Thời hạn thuê: Từ ngày <strong>{formatDate(selectedContract.startDate)}</strong> đến <strong>{formatDate(selectedContract.endDate)}</strong></div>
                <div>• Giá thuê hàng tháng: <strong style={{ color: '#10b981' }}>{formatVND(selectedContract.rentAmount || 0)}/tháng</strong></div>
                <div>• Tiền đặt cọc bảo đảm: <strong>{formatVND(selectedContract.deposit || 0)}</strong></div>
                <div>• Kỳ thanh toán: Trước ngày 05 hàng tháng bằng hình thức chuyển khoản VietQR hoặc tiền mặt.</div>
              </div>

              <div>
                <strong>TRÁCH NHIỆM BẢO QUẢN & AN NINH:</strong>
                <div>• Bên B giữ gìn vệ sinh chung, không gây ồn sau 22h đêm, không tàng trữ chất cấm cháy nổ.</div>
                <div>• Khi hết hạn hợp đồng, nếu muốn gia hạn cần đăng ký trên ứng dụng trước ít nhất 15 ngày.</div>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              style={{
                width: '100%', marginTop: 14,
                background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                color: isLight ? '#334155' : '#cbd5e1', border: 'none',
                borderRadius: 10, padding: '11px', fontWeight: 800, fontSize: '13px', cursor: 'pointer'
              }}
            >
              Đóng Xem Toàn Văn
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 8: XEM CHI TIẾT HÓA ĐƠN ĐÃ THANH TOÁN (INVOICE DETAIL) ── */}
      {activeModal === 'invoice_detail' && selectedInvoice && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#111827',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '20px', maxHeight: '85%', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Receipt size={18} color="#10b981" /> Phiếu Thu Hóa Đơn {selectedInvoice.invoiceCode}
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: isLight ? '#64748b' : '#94a3b8' }}>
                ✕
              </button>
            </div>

            <div style={{
              background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.6)',
              borderRadius: 14, padding: '16px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: 8
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Kỳ hóa đơn:</span>
                <strong>Tháng {selectedInvoice.month}/{selectedInvoice.year}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Phòng:</span>
                <strong>Phòng {selectedInvoice.roomNumber || currentRoomNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền phòng:</span>
                <strong>{formatVND(selectedInvoice.rentAmount || selectedInvoice.roomPrice || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền điện ({selectedInvoice.electricityUsage || 0} kWh):</span>
                <strong style={{ color: '#f59e0b' }}>{formatVND(selectedInvoice.electricityCost || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tiền nước ({selectedInvoice.waterUsage || 0} m³):</span>
                <strong style={{ color: '#06b6d4' }}>{formatVND(selectedInvoice.waterCost || 0)}</strong>
              </div>
              {selectedInvoice.servicesCost > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Phí dịch vụ:</span>
                  <strong>{formatVND(selectedInvoice.servicesCost)}</strong>
                </div>
              )}
              <div style={{ borderTop: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                <strong>Tổng thanh toán:</strong>
                <strong style={{ color: '#10b981' }}>{formatVND(selectedInvoice.totalAmount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#10b981' }}>
                <span>Trạng thái:</span>
                <strong>✅ Đã thanh toán đầy đủ</strong>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              style={{
                width: '100%', marginTop: 14,
                background: '#10b981', color: '#fff', border: 'none',
                borderRadius: 10, padding: '11px', fontWeight: 800, fontSize: '13px', cursor: 'pointer'
              }}
            >
              Đóng Phiếu Thu
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 9: PHÓNG TO MÃ QR HOẶC ẢNH BIÊN LAI (IMAGE ZOOM) ── */}
      {(activeModal === 'qr_zoom' || activeModal === 'proof_zoom') && (
        <div
          onClick={() => setActiveModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90%', textAlign: 'center' }}>
            <img
              src={zoomedImageUrl}
              alt="Phóng to"
              style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 16, background: '#fff', padding: 8 }}
            />
            <button
              onClick={() => setActiveModal(null)}
              style={{
                marginTop: 14, background: '#fff', color: '#0f172a', border: 'none',
                borderRadius: 20, padding: '8px 24px', fontWeight: 800, fontSize: '13px', cursor: 'pointer'
              }}
            >
              Đóng Phóng To
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
