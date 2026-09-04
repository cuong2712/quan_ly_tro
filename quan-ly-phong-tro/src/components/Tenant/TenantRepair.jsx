import React, { useState, useRef } from 'react';
import { 
  Wrench, Plus, Upload, Trash2, Clock, CheckCircle2, 
  AlertTriangle, Image as ImageIcon, Camera, Send, 
  Sparkles, Maximize2, Wind, Zap, Droplets, Lock, 
  HelpCircle, X, Check, Flame, ChevronRight, RefreshCw, FileText
} from 'lucide-react';
import { maintenanceService } from '../../services';
import { formatDate, getContractStatusInfo } from '../../utils/formatters';

const ISSUE_TYPES = [
  { value: 'Máy lạnh', label: 'Máy lạnh', icon: Wind, color: '#06b6d4', desc: 'Không lạnh, chảy nước, kêu' },
  { value: 'Hệ thống Điện / Đèn', label: 'Điện / Đèn', icon: Zap, color: '#f59e0b', desc: 'Mất điện, cháy bóng, ổ cắm' },
  { value: 'Vòi nước / Bồn rửa', label: 'Nước / Vệ sinh', icon: Droplets, color: '#38bdf8', desc: 'Rò rỉ, tắc bồn, nghẹt nước' },
  { value: 'Cửa / Khóa phòng', label: 'Khóa & Cửa', icon: Lock, color: '#a855f7', desc: 'Kẹt khóa, hỏng bản lề' },
  { value: 'Khác', label: 'Sự cố khác', icon: Wrench, color: '#10b981', desc: 'Tường trần, thiết bị khác' },
];

const QUICK_TAGS = [
  'Không phả hơi lạnh',
  'Bị rò rỉ / chảy nước',
  'Mất nguồn / sập aptomat',
  'Kẹt ổ khóa cửa',
  'Kêu to bất thường',
  'Tắc đường ống thoát'
];

export const TenantRepair = ({ activeTenant, contracts = [], setActiveTab, maintenanceRequests = [], setMaintenanceRequests, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const myRequests = Array.isArray(maintenanceRequests) ? maintenanceRequests : [];

  const activeContract = contracts.find(c => {
    const info = getContractStatusInfo(c);
    return info.isActive;
  });
  const myContract = activeContract || contracts[0] || null;
  const statusInfo = getContractStatusInfo(myContract);
  const isRenewPending = statusInfo.isRenewPending;
  const isLiquidated = statusInfo.isLiquidated || (!activeTenant?.roomNumber && !activeTenant?.roomId && !myContract);
  const isExpired = (statusInfo.isExpired || (!myContract && !activeTenant?.roomNumber)) && !isRenewPending && !isLiquidated;

  const roomDisplay = activeTenant?.roomNumber 
    ? (activeTenant.roomNumber.toString().startsWith('P.') ? activeTenant.roomNumber : `P.${activeTenant.roomNumber}`) 
    : (myContract?.roomNumber ? `P.${myContract.roomNumber}` : 'Phòng trọ');

  const [formData, setFormData] = useState({
    issueType: 'Máy lạnh',
    title: '',
    description: '',
    priority: 'Medium',
    imageUrl: '',
  });

  // KPI stats calculation
  const totalCount = myRequests.length;
  const pendingCount = myRequests.filter(r => (r.status || '').toLowerCase() === 'pending').length;
  const inProgressCount = myRequests.filter(r => ['in_progress', 'inprogress'].includes((r.status || '').toLowerCase())).length;
  const completedCount = myRequests.filter(r => ['completed', 'resolved'].includes((r.status || '').toLowerCase())).length;

  const filteredRequests = myRequests.filter(r => {
    const s = (r.status || '').toLowerCase();
    if (filterStatus === 'PENDING') return s === 'pending';
    if (filterStatus === 'IN_PROGRESS') return s === 'in_progress' || s === 'inprogress';
    if (filterStatus === 'COMPLETED') return s === 'completed' || s === 'resolved';
    return true;
  });

  const handleProcessFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chỉ chọn tệp hình ảnh (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Dung lượng ảnh vượt quá 10MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, imageUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleOpenCreateModal = () => {
    if (isLiquidated) {
      alert('Hợp đồng của bạn đã thanh lý. Không thể gửi yêu cầu sửa chữa.');
      return;
    }
    if (isExpired) {
      alert('Hợp đồng hết hạn vui lòng gia hạn hợp đồng');
      if (setActiveTab) setActiveTab('tn_contract');
      return;
    }
    setIsModalOpen(true);
  };

  const handleAddQuickTag = (tag) => {
    setFormData(prev => {
      if (!prev.description) return { ...prev, description: tag };
      if (prev.description.includes(tag)) return prev;
      return { ...prev, description: `${prev.description}, ${tag}` };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isExpired) {
      alert('Hợp đồng hết hạn vui lòng gia hạn hợp đồng');
      setIsModalOpen(false);
      return;
    }
    setSubmitting(true);
    try {
      const createFn = maintenanceService.createRequest || maintenanceService.create;
      const payload = {
        ...formData,
        roomNumber: roomDisplay
      };
      const created = await createFn(payload);

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
        imageUrl: ''
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 🏷️ PAGE HEADER */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '38px', 
              height: '38px', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              <Wrench size={22} color="#818cf8" />
            </span>
            Báo Sự Cố & Sửa Chữa Thiết Bị
          </h2>
          <p className="page-subtitle">
            Gửi hình ảnh và mô tả hỏng hóc {roomDisplay ? `(cho ${roomDisplay})` : ''} để Chủ trọ điều phối thợ xử lý kịp thời
          </p>
        </div>

        {!isLiquidated && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className={`btn ${isExpired ? 'btn-secondary' : 'btn-primary'}`} 
              onClick={handleOpenCreateModal}
              title={isExpired ? 'Hợp đồng hết hạn vui lòng gia hạn hợp đồng' : 'Tạo Báo Sửa Chữa Mới'}
              style={isExpired 
                ? { opacity: 0.7, cursor: 'not-allowed', borderColor: 'rgba(239, 68, 68, 0.5)', color: '#ef4444' } 
                : { 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
                    padding: '10px 20px',
                    fontWeight: 700
                  }
              }
            >
              {isExpired ? <AlertTriangle size={18} color="#ef4444" /> : <Plus size={18} />} 
              {isExpired ? 'Hợp đồng hết hạn' : 'Báo Sự Cố Mới'}
            </button>
          </div>
        )}
      </div>

      {/* ⚠️ BANNER NẾU HỢP ĐỒNG ĐÃ THANH LÝ */}
      {isLiquidated && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: '#ef4444' }}>Hợp đồng phòng trọ đã thanh lý:</strong> Bạn không còn phòng đang ở nên không thể gửi yêu cầu bảo trì mới. Danh sách dưới đây lưu lại lịch sử các yêu cầu sửa chữa trước đây của bạn.
          </div>
        </div>
      )}

      {/* ⚠️ BANNER NẾU HỢP ĐỒNG ĐÃ HẾT HẠN */}
      {!isLiquidated && isExpired && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#ef4444' }}>
                Hợp đồng hết hạn vui lòng gia hạn hợp đồng
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                Hợp đồng thuê phòng của bạn đã hết hạn {myContract?.endDate ? `(vào ngày ${formatDate(myContract.endDate)})` : ''}. Bạn không thể gửi yêu cầu báo hỏng / sửa chữa thiết bị mới cho đến khi hợp đồng được gia hạn thành công.
              </div>
            </div>
          </div>
          {setActiveTab && (
            <button 
              className="btn btn-primary" 
              onClick={() => setActiveTab('tn_contract')}
              style={{ background: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Clock size={16} /> Đi Đến Gia Hạn Hợp Đồng
            </button>
          )}
        </div>
      )}

      {/* 📊 TỔNG QUAN THỐNG KÊ (KPI CARDS) */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="kpi-card" onClick={() => setFilterStatus('ALL')} style={{ cursor: 'pointer', border: filterStatus === 'ALL' ? '1px solid var(--primary)' : undefined }}>
          <div className="kpi-icon indigo"><FileText size={20} /></div>
          <div className="kpi-info">
            <h3>Tổng Yêu Cầu</h3>
            <div className="value">{totalCount}</div>
          </div>
        </div>

        <div className="kpi-card" onClick={() => setFilterStatus('PENDING')} style={{ cursor: 'pointer', border: filterStatus === 'PENDING' ? '1px solid var(--accent-amber)' : undefined }}>
          <div className="kpi-icon amber"><Clock size={20} /></div>
          <div className="kpi-info">
            <h3>Chờ Xử Lý</h3>
            <div className="value" style={{ color: '#fbbf24' }}>{pendingCount}</div>
          </div>
        </div>

        <div className="kpi-card" onClick={() => setFilterStatus('IN_PROGRESS')} style={{ cursor: 'pointer', border: filterStatus === 'IN_PROGRESS' ? '1px solid var(--accent-cyan)' : undefined }}>
          <div className="kpi-icon cyan"><Sparkles size={20} /></div>
          <div className="kpi-info">
            <h3>Đang Sửa Chữa</h3>
            <div className="value" style={{ color: '#22d3ee' }}>{inProgressCount}</div>
          </div>
        </div>

        <div className="kpi-card" onClick={() => setFilterStatus('COMPLETED')} style={{ cursor: 'pointer', border: filterStatus === 'COMPLETED' ? '1px solid var(--primary)' : undefined }}>
          <div className="kpi-icon emerald"><CheckCircle2 size={20} /></div>
          <div className="kpi-info">
            <h3>Đã Hoàn Thành</h3>
            <div className="value" style={{ color: '#34d399' }}>{completedCount}</div>
          </div>
        </div>
      </div>

      {/* 📑 DANH SÁCH & BỘ LỌC */}
      <div className="card-table-container">
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Tabs Lọc Nhanh */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: `Tất Cả (${totalCount})` },
              { key: 'PENDING', label: `⏳ Chờ Xử Lý (${pendingCount})` },
              { key: 'IN_PROGRESS', label: `⚙️ Đang Sửa (${inProgressCount})` },
              { key: 'COMPLETED', label: `✅ Đã Xong (${completedCount})` },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: filterStatus === tab.key ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  background: filterStatus === tab.key ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: filterStatus === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: '12.5px',
                  fontWeight: filterStatus === tab.key ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Hiển thị <strong>{filteredRequests.length}</strong> yêu cầu
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Loại Thiết Bị</th>
              <th>Tiêu Đề & Mô Tả Sự Cố</th>
              <th>Ảnh Hiện Trường</th>
              <th>Mức Độ</th>
              <th>Thợ Phụ Trách</th>
              <th>Trạng Thái Tiến Độ</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '45px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '54px', 
                      height: '54px', 
                      borderRadius: '50%', 
                      background: 'rgba(255, 255, 255, 0.04)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'var(--text-muted)'
                    }}>
                      <Wrench size={26} />
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {isLiquidated 
                        ? 'Bạn không có lịch sử báo cáo sửa chữa nào.' 
                        : isExpired 
                          ? 'Hợp đồng hết hạn. Vui lòng gia hạn để gửi yêu cầu sửa chữa mới.'
                          : 'Không có yêu cầu sửa chữa nào trong mục này.'}
                    </div>
                    {!isLiquidated && !isExpired && (
                      <button 
                        className="btn btn-sm btn-primary" 
                        onClick={handleOpenCreateModal}
                        style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Plus size={15} /> Gửi Báo Sự Cố Mới
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredRequests.map((r) => {
                const img = r.imageUrl || r.ImageUrl;
                const statusLower = (r.status || '').toLowerCase();
                const isDone = statusLower === 'completed' || statusLower === 'resolved';
                const isDoing = statusLower === 'in_progress' || statusLower === 'inprogress';
                const isCancelled = statusLower === 'cancelled' || statusLower === 'canceled';

                const matchedType = ISSUE_TYPES.find(t => t.value === r.issueType);
                const TypeIcon = matchedType ? matchedType.icon : Wrench;

                return (
                  <tr key={r.id}>
                    <td>
                      <span className="status-pill vacant" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <TypeIcon size={13} color={matchedType?.color || '#818cf8'} />
                        {r.issueType || 'Khác'}
                      </span>
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13.5px' }}>{r.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                        {r.description || 'Không có mô tả chi tiết'}
                      </div>
                    </td>
                    <td>
                      {img ? (
                        <div
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-color)',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setViewingImage(img)}
                          title="Bấm để xem phóng to ảnh sự cố"
                        >
                          <img
                            src={img}
                            alt="Hỏng hóc"
                            style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                          />
                          <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Maximize2 size={12} /> Xem
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Không có</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill ${r.priority === 'High' ? 'overdue' : 'pending'}`} style={{ fontWeight: 700 }}>
                        {r.priority === 'High' ? '🔥 Khẩn cấp' : '⚡ Bình thường'}
                      </span>
                    </td>
                    <td>
                      {r.assignedTo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                          {r.assignedTo}
                        </div>
                      ) : (
                        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa phân công</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill ${isDone ? 'occupied' : isDoing ? 'renew_requested' : isCancelled ? 'overdue' : 'pending'}`}>
                        {isDone ? '✅ Đã sửa xong' : isDoing ? '⚙️ Đang xử lý' : isCancelled ? '❌ Đã hủy' : '⏳ Chờ tiếp nhận'}
                      </span>
                    </td>
                    <td>
                      {(!r.status || statusLower === 'pending') && (
                        <button 
                          className="btn btn-sm btn-danger" 
                          onClick={() => handleCancelReq(r.id)}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          <Trash2 size={13} /> Hủy Yêu Cầu
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

      {/* 🚀 MODAL TẠO BÁO SỰ CỐ MỚI (BỐ CỤC NẰM NGANG HIỆN ĐẠI - 2 CỘT CÂN ĐỐI) */}
      {isModalOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => setIsModalOpen(false)} 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0, 0, 0, 0.82)', 
            backdropFilter: 'blur(10px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 9999, 
            padding: '20px' 
          }}
        >
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '880px', 
              width: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: '20px', 
              overflow: 'hidden', 
              boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              background: 'var(--bg-card)',
              border: '1px solid rgba(255, 255, 255, 0.14)'
            }}
          >
            
            {/* Header Hiện Đại Có Badge Phòng */}
            <div 
              className="modal-header" 
              style={{ 
                padding: '18px 26px', 
                borderBottom: '1px solid var(--border-color)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                flexShrink: 0,
                background: 'rgba(255, 255, 255, 0.02)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(16, 185, 129, 0.25))',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)'
                }}>
                  <Wrench size={22} color="#818cf8" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      Báo Sự Cố & Yêu Cầu Sửa Chữa
                    </h3>
                    <span style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: '6px',
                      background: 'rgba(99, 102, 241, 0.16)',
                      color: '#a5b4fc',
                      border: '1px solid rgba(99, 102, 241, 0.3)'
                    }}>
                      🏠 {roomDisplay}
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                    Điền thông tin và đính kèm ảnh để Chủ trọ bố trí thợ kỹ thuật đến xử lý nhanh nhất
                  </p>
                </div>
              </div>

              <button 
                type="button"
                className="btn btn-sm btn-secondary" 
                style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} 
                onClick={() => setIsModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="modal-body" style={{ padding: '22px 26px', overflow: 'visible' }}>
                
                {/* 2 Cột Nằm Ngang Cân Đối */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '26px', alignItems: 'stretch' }}>
                  
                  {/* CỘT TRÁI: THÔNG TIN CHI TIẾT SỰ CỐ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    {/* 1. Chọn loại thiết bị dạng Card Tiles (3 trên - 2 dưới) */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text-secondary)' }}>
                          Loại Thiết Bị Gặp Sự Cố *
                        </label>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Chọn 1 loại</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        {/* Hàng 1: 3 thiết bị phổ biến */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '7px' }}>
                          {ISSUE_TYPES.slice(0, 3).map(item => {
                            const isSelected = formData.issueType === item.value;
                            const IconComponent = item.icon;
                            return (
                              <div
                                key={item.value}
                                onClick={() => setFormData({ ...formData, issueType: item.value })}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '10px',
                                  border: isSelected ? `2px solid ${item.color}` : '1px solid var(--border-color)',
                                  background: isSelected ? `${item.color}1a` : 'rgba(255, 255, 255, 0.03)',
                                  cursor: 'pointer',
                                  transition: 'all 0.18s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  boxShadow: isSelected ? `0 4px 14px ${item.color}33` : 'none',
                                  transform: isSelected ? 'translateY(-1px)' : 'none'
                                }}
                              >
                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  background: isSelected ? `${item.color}33` : 'rgba(255, 255, 255, 0.05)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <IconComponent size={16} color={isSelected ? item.color : 'var(--text-secondary)'} />
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ 
                                    fontSize: '12.5px', 
                                    fontWeight: isSelected ? 800 : 600, 
                                    color: isSelected ? '#ffffff' : 'var(--text-primary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {item.label}
                                  </div>
                                </div>
                                {isSelected && <Check size={14} color={item.color} style={{ flexShrink: 0 }} />}
                              </div>
                            );
                          })}
                        </div>

                        {/* Hàng 2: 2 thiết bị còn lại */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '7px' }}>
                          {ISSUE_TYPES.slice(3).map(item => {
                            const isSelected = formData.issueType === item.value;
                            const IconComponent = item.icon;
                            return (
                              <div
                                key={item.value}
                                onClick={() => setFormData({ ...formData, issueType: item.value })}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '10px',
                                  border: isSelected ? `2px solid ${item.color}` : '1px solid var(--border-color)',
                                  background: isSelected ? `${item.color}1a` : 'rgba(255, 255, 255, 0.03)',
                                  cursor: 'pointer',
                                  transition: 'all 0.18s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  boxShadow: isSelected ? `0 4px 14px ${item.color}33` : 'none',
                                  transform: isSelected ? 'translateY(-1px)' : 'none'
                                }}
                              >
                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  background: isSelected ? `${item.color}33` : 'rgba(255, 255, 255, 0.05)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <IconComponent size={16} color={isSelected ? item.color : 'var(--text-secondary)'} />
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ 
                                    fontSize: '12.5px', 
                                    fontWeight: isSelected ? 800 : 600, 
                                    color: isSelected ? '#ffffff' : 'var(--text-primary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {item.label}
                                  </div>
                                </div>
                                {isSelected && <Check size={14} color={item.color} style={{ flexShrink: 0 }} />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 2. Mức độ ưu tiên dạng Segmented Card */}
                    <div>
                      <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '7px', color: 'var(--text-secondary)' }}>
                        Mức Độ Khẩn Cấp *
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {/* Bình thường */}
                        <div
                          onClick={() => setFormData({ ...formData, priority: 'Medium' })}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: formData.priority === 'Medium' ? '2px solid #6366f1' : '1px solid var(--border-color)',
                            background: formData.priority === 'Medium' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.2s',
                            boxShadow: formData.priority === 'Medium' ? '0 4px 14px rgba(99, 102, 241, 0.25)' : 'none'
                          }}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: formData.priority === 'Medium' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#818cf8',
                            flexShrink: 0
                          }}>
                            ⚡
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: formData.priority === 'Medium' ? '#fff' : 'var(--text-primary)' }}>
                              Bình thường
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Xử lý trong 1 - 2 ngày
                            </div>
                          </div>
                        </div>

                        {/* Khẩn cấp */}
                        <div
                          onClick={() => setFormData({ ...formData, priority: 'High' })}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: formData.priority === 'High' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                            background: formData.priority === 'High' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.2s',
                            boxShadow: formData.priority === 'High' ? '0 4px 14px rgba(239, 68, 68, 0.25)' : 'none'
                          }}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: formData.priority === 'High' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#f87171',
                            flexShrink: 0
                          }}>
                            <Flame size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: formData.priority === 'High' ? '#fca5a5' : 'var(--text-primary)' }}>
                              Khẩn cấp
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Cần thợ xử lý ngay
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Tiêu đề tóm tắt */}
                    <div>
                      <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                        Tiêu Đề Tóm Tắt *
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        style={{ height: '42px', padding: '8px 14px', fontSize: '13.5px', lineHeight: '1.5', boxSizing: 'border-box' }}
                        placeholder="VD: Máy lạnh bật không lên / Vòi nước bồn rửa bị rò..."
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>

                    {/* 4. Mô tả chi tiết & Quick tags */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text-secondary)' }}>
                          Mô Tả Chi Tiết Sự Cố *
                        </label>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gợi ý nhanh bấm bên dưới</span>
                      </div>

                      <textarea
                        className="form-control"
                        rows="3"
                        required
                        style={{ fontSize: '13px', padding: '10px 14px', resize: 'none', lineHeight: '1.5', minHeight: '68px', boxSizing: 'border-box' }}
                        placeholder="Mô tả cụ thể hiện tượng hư hỏng, thời gian phát hiện, vị trí trong phòng..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />

                      {/* Gợi ý tags nhanh */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '7px' }}>
                        {QUICK_TAGS.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleAddQuickTag(tag)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              background: 'rgba(255, 255, 255, 0.04)',
                              color: 'var(--text-secondary)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#818cf8'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* CỘT PHẢI: KHUNG TẢI ẢNH MINH CHỨNG & XEM TRƯỚC */}
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text-secondary)' }}>
                        Ảnh Chụp Minh Chứng Thực Tế
                      </label>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tối đa 10MB</span>
                    </div>

                    {/* Hidden input file */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />

                    {/* Khu vực Drag and Drop */}
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      style={{
                        border: isDragging 
                          ? '2px dashed #10b981' 
                          : formData.imageUrl 
                            ? '1px solid rgba(16, 185, 129, 0.4)' 
                            : '2px dashed rgba(99, 102, 241, 0.35)',
                        borderRadius: '16px',
                        background: isDragging 
                          ? 'rgba(16, 185, 129, 0.08)' 
                          : 'rgba(15, 23, 42, 0.65)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        minHeight: '290px',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                    >
                      {formData.imageUrl ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ position: 'relative', width: '100%', textAlign: 'center', marginTop: '2px' }}>
                            <div 
                              onClick={() => setViewingImage(formData.imageUrl)}
                              style={{ 
                                position: 'relative', 
                                display: 'inline-block', 
                                cursor: 'pointer',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                              }}
                            >
                              <img
                                src={formData.imageUrl}
                                alt="Ảnh minh chứng sự cố"
                                style={{ maxHeight: '185px', maxWidth: '100%', display: 'block', objectFit: 'contain' }}
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: '8px',
                                right: '8px',
                                background: 'rgba(0, 0, 0, 0.78)',
                                color: '#fff',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                backdropFilter: 'blur(4px)'
                              }}>
                                <Maximize2 size={12} /> Bấm xem to
                              </div>
                            </div>

                            <div style={{ 
                              fontSize: '12px', 
                              color: '#10b981', 
                              marginTop: '10px', 
                              fontWeight: 700, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              gap: '6px' 
                            }}>
                              <CheckCircle2 size={15} /> Ảnh chụp thực tế đã sẵn sàng
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              style={{ fontSize: '12px', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload size={13} /> Đổi ảnh khác
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                            >
                              <Trash2 size={13} /> Xóa ảnh
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          style={{ textAlign: 'center', cursor: 'pointer', padding: '20px 14px', width: '100%' }}
                        >
                          <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 14px',
                            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.2)'
                          }}>
                            <Camera size={30} color="#818cf8" />
                          </div>
                          <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            Chụp ảnh hoặc tải lên minh chứng
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '240px', margin: '0 auto', lineHeight: 1.4 }}>
                            Kéo & thả ảnh vào đây hoặc bấm để duyệt tệp từ máy
                          </div>
                          <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.12)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '5px 14px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600 }}>
                            <Upload size={12} /> Hỗ trợ JPG, PNG, WEBP (tối đa 10MB)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer Thẩm Mỹ & Rõ Ràng */}
              <div 
                className="modal-footer" 
                style={{ 
                  padding: '16px 26px', 
                  borderTop: '1px solid var(--border-color)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.02)', 
                  flexShrink: 0 
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="#f59e0b" />
                  <span>Chủ trọ sẽ liên hệ qua SĐT của bạn khi thợ bắt đầu đến</span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '9px 20px', fontSize: '13.5px', borderRadius: '8px' }} 
                    onClick={() => setIsModalOpen(false)}
                  >
                    Hủy Bỏ
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{
                      padding: '9px 24px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      borderColor: '#10b981',
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)'
                    }} 
                    disabled={submitting}
                  >
                    <Send size={15} /> {submitting ? 'Đang gửi báo cáo...' : 'Gửi Yêu Cầu Sửa Chữa'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔍 MODAL PHÓNG TO ẢNH */}
      {viewingImage && (
        <div 
          className="modal-overlay" 
          onClick={() => setViewingImage(null)} 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0, 0, 0, 0.85)', 
            backdropFilter: 'blur(8px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 10000, 
            padding: '20px' 
          }}
        >
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: 680, width: '100%', textAlign: 'center', borderRadius: '16px', overflow: 'hidden' }}
          >
            <div className="modal-header" style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} color="#818cf8" /> Ảnh Minh Chứng Sự Cố
              </h3>
              <button 
                className="btn btn-sm btn-secondary" 
                style={{ width: '30px', height: '30px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setViewingImage(null)}
              >
                <X size={15} />
              </button>
            </div>
            <div className="modal-body" style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '20px', textAlign: 'center' }}>
              <img 
                src={viewingImage} 
                alt="Phóng to ảnh hỏng" 
                style={{ maxHeight: '480px', maxWidth: '100%', borderRadius: '10px', objectFit: 'contain', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
              />
            </div>
            <div className="modal-footer" style={{ padding: '12px 22px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setViewingImage(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
