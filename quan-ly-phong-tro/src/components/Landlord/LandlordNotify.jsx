import React, { useState } from 'react';
import {
  BellRing, Plus, Send, Trash2, Users, Home, Building2,
  Search, Eye, Sparkles, Filter, CheckCircle2,
  Calendar, Layers, DoorOpen, User, X, Wrench, Shield, ArrowRight, Inbox
} from 'lucide-react';
import { notificationService } from '../../services';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';
import { Pagination } from '../Common/Pagination';
import { useAuth } from '../../contexts/AuthContext';

export const LandlordNotify = ({
  notifications = [],
  setNotifications,
  zones = [],
  rooms = [],
  tenants = [],
  onRefresh
}) => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingNotif, setViewingNotif] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceTab, setSourceTab] = useState('inbox'); // 'inbox' | 'repairs' | 'outbox' | 'all'
  const [targetFilter, setTargetFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target: 'AllTenants', // 'AllTenants' | 'Zone' | 'Room' | 'User'
    targetId: '',
  });

  // Mẫu thông báo soạn sẵn
  const TEMPLATES = [
    {
      id: 'rent_reminder',
      name: '💰 Nhắc đóng tiền phòng',
      title: 'Thông báo đóng tiền phòng & điện nước tháng này',
      content: 'Chào các bạn sinh viên và cư dân nhà trọ,\n\nBan quản lý xin thông báo bảng kê hóa đơn tiền phòng và điện nước tháng này đã được cập nhật trên hệ thống SmartRent. Vui lòng kiểm tra và hoàn tất thanh toán trước ngày 05 để đảm bảo quyền lợi.\n\nXin cảm ơn sự hợp tác của các bạn!',
    },
    {
      id: 'maintenance',
      name: '⚡ Tạm cắt điện nước bảo trì',
      title: 'Thông báo tạm ngắt điện / nước để bảo trì hệ thống',
      content: 'Kính gửi toàn thể khách thuê,\n\nĐể đảm bảo an toàn và bảo dưỡng định kỳ hệ thống điện/nước, ban quản lý sẽ tiến hành bảo trì trong thời gian tới. Nguồn điện/nước có thể bị tạm ngắt cục bộ.\n\nRất mong các bạn thông cảm và sắp xếp công việc hợp lý!',
    },
    {
      id: 'security_clean',
      name: '🧹 Vệ sinh & An ninh PCCC',
      title: 'Nhắc nhở giữ gìn vệ sinh chung & an toàn PCCC',
      content: 'Chào toàn thể cư dân,\n\nNhằm đảm bảo môi trường sống văn minh, an toàn:\n1. Khóa cổ xe cẩn thận, đóng cổng sau 23h00.\n2. Tắt các thiết bị điện sinh nhiệt khi ra khỏi phòng.\n3. Đổ rác đúng nơi và giờ quy định.\n\nChúc các bạn có không gian sống thoải mái và an toàn!',
    },
    {
      id: 'urgent',
      name: '🚨 Thông báo khẩn cấp',
      title: 'THÔNG BÁO KHẨN CẤP TỪ BAN QUẢN LÝ NHÀ TRỌ',
      content: 'Kính gửi các bạn thuê trọ,\n\nBan quản lý có thông báo quan trọng cần lưu ý gấp liên quan đến an ninh / vận hành nhà trọ. Đề nghị các bạn chú ý kiểm tra và phối hợp thực hiện ngay.\n\nTrân trọng!',
    },
  ];

  const handleApplyTemplate = (tpl) => {
    setFormData(prev => ({
      ...prev,
      title: tpl.title,
      content: tpl.content,
    }));
  };

  const handleOpenCreateModal = (targetType = 'AllTenants', targetValue = '') => {
    setFormData({
      title: '',
      content: '',
      target: targetType,
      targetId: targetValue,
    });
    setIsModalOpen(true);
  };

  const handleNavigateToRepairs = (e, notif) => {
    e?.stopPropagation();
    window.dispatchEvent(new CustomEvent('smartrent:switch-tab', { detail: { tab: 'll_maintenance' } }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Vui lòng nhập tiêu đề thông báo');
      return;
    }
    if (!formData.content.trim()) {
      alert('Vui lòng nhập nội dung thông báo');
      return;
    }

    if (formData.target !== 'AllTenants' && !formData.targetId) {
      if (formData.target === 'Zone') alert('Vui lòng chọn Khu trọ cần gửi thông báo!');
      else if (formData.target === 'Room') alert('Vui lòng chọn Phòng cần gửi thông báo!');
      else if (formData.target === 'User') alert('Vui lòng chọn Khách thuê cụ thể!');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        target: formData.target,
        targetId: formData.targetId ? formData.targetId : null,
      };

      const created = await notificationService.create(payload);
      setNotifications([created, ...notifications]);
      setIsModalOpen(false);
      setFormData({ title: '', content: '', target: 'AllTenants', targetId: '' });
      alert('✅ Đã phát hành thông báo thành công!');
      onRefresh?.();
    } catch (err) {
      alert('Lỗi gửi thông báo: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
      try {
        await notificationService.delete(id);
        setNotifications(notifications.filter(n => n.id !== id));
        if (viewingNotif?.id === id) setViewingNotif(null);
        onRefresh?.();
      } catch (err) {
        alert('Lỗi xóa thông báo: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const isRepairNotif = (n) => {
    const text = `${n.title || ''} ${n.content || ''}`.toLowerCase();
    return text.includes('sự cố') || text.includes('bảo trì') || text.includes('sửa chữa') || text.includes('hỏng') || text.includes('máy lạnh') || text.includes('thiết bị') || text.includes('cống') || text.includes('khóa');
  };

  const isIncomingNotif = (n) => {
    if (isRepairNotif(n)) return true;
    if (n.target === 'AllLandlords' || n.target === 'SystemAll' || n.target === 'All') return true;
    if (n.target === 'User' && (n.targetId === user?.id || n.targetId === user?.userId)) return true;
    if (n.senderId && user?.id && n.senderId !== user.id) return true;
    return false;
  };

  // Helper hiển thị tên và icon của Target / Nguồn
  const getTargetBadge = (n) => {
    if (isRepairNotif(n)) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700
        }}>
          <Wrench size={13} /> 🛠️ Khách Báo Sự Cố
        </span>
      );
    }

    if (n.target === 'AllLandlords' || n.target === 'SystemAll' || n.target === 'All') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
        }}>
          <Shield size={13} /> 🛡️ Ban Quản Trị Hệ Thống
        </span>
      );
    }

    if (isIncomingNotif(n)) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(16, 185, 129, 0.12)', color: '#34d399',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
        }}>
          <User size={13} /> Từ: {n.senderName || 'Khách thuê'}
        </span>
      );
    }

    if (n.target === 'AllTenants') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
        }}>
          <Home size={13} /> Gửi: Toàn bộ hệ thống
        </span>
      );
    }

    if (n.target === 'Zone') {
      const zone = zones.find(z => z.id === n.targetId);
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
        }}>
          <Building2 size={13} /> Gửi Khu: {zone ? zone.name : 'Khu trọ'}
        </span>
      );
    }

    if (n.target === 'Room') {
      const room = rooms.find(r => r.id === n.targetId);
      const zone = room ? zones.find(z => z.id === (room.zoneId || room.ZoneId)) : null;
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
        }}>
          <DoorOpen size={13} /> Gửi Phòng: {room ? room.roomNumber : 'Phòng'} {zone ? `(${zone.name})` : ''}
        </span>
      );
    }

    if (n.target === 'User') {
      const tenant = tenants.find(t => (t.userId || t.UserId || t.id) === n.targetId);
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(16, 185, 129, 0.12)', color: '#34d399',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
        }}>
          <User size={13} /> Gửi Khách: {tenant ? (tenant.fullName || tenant.name) : 'Cá nhân'}
        </span>
      );
    }

    return <span className="status-pill vacant">{n.target}</span>;
  };

  // Thống kê nhanh
  const incomingNotifs = notifications.filter(isIncomingNotif);
  const repairNotifs = notifications.filter(isRepairNotif);
  const outgoingNotifs = notifications.filter(n => !isIncomingNotif(n));
  const systemNotifs = notifications.filter(n => n.target === 'AllLandlords' || n.target === 'SystemAll' || n.target === 'All');

  // Lọc danh sách
  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (n.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (n.senderName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (sourceTab === 'inbox' && !isIncomingNotif(n)) return false;
    if (sourceTab === 'repairs' && !isRepairNotif(n)) return false;
    if (sourceTab === 'outbox' && isIncomingNotif(n)) return false;

    if (sourceTab === 'outbox' && targetFilter !== 'all') {
      if (targetFilter === 'AllTenants' && n.target !== 'AllTenants') return false;
      if (targetFilter === 'Zone' && n.target !== 'Zone') return false;
      if (targetFilter === 'Room' && n.target !== 'Room') return false;
      if (targetFilter === 'User' && n.target !== 'User') return false;
    }

    return matchesSearch;
  });

  // Phân trang 7 thông báo 1 trang
  const totalPages = Math.ceil(filteredNotifications.length / pageSize);
  const paginatedNotifications = filteredNotifications.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleTabChange = (tab) => {
    setSourceTab(tab);
    setCurrentPage(1);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="page-title"><BellRing size={24} color="#6366f1" /> Trung Tâm Thông Báo</h2>
          <p className="page-subtitle">Xem thông báo sự cố từ khách thuê, thông báo hệ thống và phát thông báo tới các phòng trọ</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => handleOpenCreateModal('AllTenants')}>
            <Plus size={18} /> Gửi Thông Báo Cho Khách
          </button>
        </div>
      </div>

      {/* Stats Cards Overview - Bo góc mềm mại, hiển thị hiện đại */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div
          className="card"
          style={{
            padding: '16px 20px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'var(--card-bg)',
            cursor: 'pointer',
            border: sourceTab === 'inbox' ? '1.5px solid #6366f1' : '1px solid var(--border-color)',
            boxShadow: sourceTab === 'inbox' ? '0 4px 16px rgba(99, 102, 241, 0.15)' : 'none',
            transition: 'all 0.2s ease'
          }}
          onClick={() => handleTabChange('inbox')}
        >
          <div style={{ width: 46, height: 46, borderRadius: '14px', background: 'rgba(99, 102, 241, 0.15)', display: 'grid', placeItems: 'center', color: '#6366f1', flexShrink: 0 }}>
            <Inbox size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Hộp Thư Đến</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{incomingNotifs.length}</div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '16px 20px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'var(--card-bg)',
            cursor: 'pointer',
            border: sourceTab === 'repairs' ? '1.5px solid #f59e0b' : '1px solid var(--border-color)',
            boxShadow: sourceTab === 'repairs' ? '0 4px 16px rgba(245, 158, 11, 0.15)' : 'none',
            transition: 'all 0.2s ease'
          }}
          onClick={() => handleTabChange('repairs')}
        >
          <div style={{ width: 46, height: 46, borderRadius: '14px', background: 'rgba(245, 158, 11, 0.15)', display: 'grid', placeItems: 'center', color: '#f59e0b', flexShrink: 0 }}>
            <Wrench size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Sự Cố & Báo Sửa Chữa</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>{repairNotifs.length}</div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '16px 20px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'var(--card-bg)',
            cursor: 'pointer',
            border: sourceTab === 'outbox' ? '1.5px solid #10b981' : '1px solid var(--border-color)',
            boxShadow: sourceTab === 'outbox' ? '0 4px 16px rgba(16, 185, 129, 0.15)' : 'none',
            transition: 'all 0.2s ease'
          }}
          onClick={() => handleTabChange('outbox')}
        >
          <div style={{ width: 46, height: 46, borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', display: 'grid', placeItems: 'center', color: '#10b981', flexShrink: 0 }}>
            <Send size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Thông Báo Đã Gửi Đi</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>{outgoingNotifs.length}</div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '16px 20px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'var(--card-bg)',
            cursor: 'pointer',
            border: sourceTab === 'all' ? '1.5px solid #3b82f6' : '1px solid var(--border-color)',
            boxShadow: sourceTab === 'all' ? '0 4px 16px rgba(59, 130, 246, 0.15)' : 'none',
            transition: 'all 0.2s ease'
          }}
          onClick={() => handleTabChange('all')}
        >
          <div style={{ width: 46, height: 46, borderRadius: '14px', background: 'rgba(59, 130, 246, 0.15)', display: 'grid', placeItems: 'center', color: '#3b82f6', flexShrink: 0 }}>
            <BellRing size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Tất Cả Thông Báo</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#3b82f6', marginTop: '2px' }}>{notifications.length}</div>
          </div>
        </div>
      </div>

      {/* Main Table & Filter Toolbar */}
      <div className="card-table-container">
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
          {/* Quick Source Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${sourceTab === 'inbox' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleTabChange('inbox')}
            >
              <Inbox size={14} /> Hộp Thư Đến ({incomingNotifs.length})
            </button>
            <button
              className={`btn btn-sm ${sourceTab === 'repairs' ? 'btn-primary' : 'btn-secondary'}`}
              style={sourceTab !== 'repairs' && repairNotifs.length > 0 ? { color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)' } : {}}
              onClick={() => handleTabChange('repairs')}
            >
              <Wrench size={14} /> 🛠️ Báo Sự Cố ({repairNotifs.length})
            </button>
            <button
              className={`btn btn-sm ${sourceTab === 'outbox' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleTabChange('outbox')}
            >
              <Send size={14} /> Đã Phát Hành ({outgoingNotifs.length})
            </button>
            <button
              className={`btn btn-sm ${sourceTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleTabChange('all')}
            >
              Tất Cả ({notifications.length})
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: '280px' }}>
            <div className="search-input-group" style={{ flex: 1, maxWidth: '320px' }}>
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Tìm tiêu đề, nội dung, người gửi..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {sourceTab === 'outbox' && (
              <select
                className="filter-select"
                value={targetFilter}
                onChange={(e) => {
                  setTargetFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ padding: '6px 10px', fontSize: '13px' }}
              >
                <option value="all">Tất cả phạm vi</option>
                <option value="AllTenants">🏠 Toàn bộ hệ thống</option>
                <option value="Zone">🏢 Theo Khu Trọ</option>
                <option value="Room">🚪 Theo Phòng</option>
                <option value="User">👤 Riêng Khách Thuê</option>
              </select>
            )}
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Tiêu Đề Thông Báo</th>
              <th style={{ width: '31%' }}>Nội Dung Chi Tiết</th>
              <th style={{ width: '18%' }}>Nguồn / Đối Tượng</th>
              <th style={{ width: '12%' }}>Thời Gian</th>
              <th style={{ width: '14%', minWidth: '135px' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedNotifications.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <BellRing size={36} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
                  <div>Chưa có thông báo nào trong mục này.</div>
                </td>
              </tr>
            ) : (
              paginatedNotifications.map((n) => {
                const isRepair = isRepairNotif(n);
                return (
                  <tr key={n.id} style={isRepair ? { background: 'rgba(245, 158, 11, 0.03)' } : {}}>
                    <td>
                      <div
                        style={{ fontWeight: '600', color: isRepair ? '#f59e0b' : 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => setViewingNotif(n)}
                        title="Bấm để xem chi tiết thông báo"
                      >
                        {isRepair && <Wrench size={15} color="#f59e0b" style={{ flexShrink: 0 }} />}
                        <span>{n.title}</span>
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          color: 'var(--text-secondary)',
                          fontSize: '13px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.4'
                        }}
                      >
                        {n.content}
                      </div>
                    </td>
                    <td>{getTargetBadge(n)}</td>
                    <td style={{ fontSize: '12.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }} title={formatDateTime(n.createdAt)}>
                      {n.createdAt ? formatRelativeTime(n.createdAt) : 'Vừa xong'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'nowrap' }}>
                        {isRepair && (
                          <button
                            className="btn btn-sm"
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: '#f59e0b',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              cursor: 'pointer'
                            }}
                            onClick={(e) => handleNavigateToRepairs(e, n)}
                            title="Đi đến mục Bảo Trì để sắp xếp thợ sửa chữa"
                          >
                            <Wrench size={13} style={{ flexShrink: 0 }} />
                            <span>Xử lý</span>
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '5px 8px', borderRadius: '6px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => setViewingNotif(n)}
                          title="Xem toàn văn thông báo"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          style={{ padding: '5px 8px', borderRadius: '6px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => handleDelete(n.id)}
                          title="Xóa thông báo này"
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

        {/* Phân trang 7 thông báo 1 trang */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredNotifications.length}
          pageSize={pageSize}
        />
      </div>

      {/* Modal Soạn & Phát Hành Thông Báo Mới (Khung rộng rãi, thoáng đẹp, chữ hiển thị đầy đủ không bị che) */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content"
            style={{
              maxWidth: '880px',
              width: '95%',
              maxHeight: '94vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '16px 24px' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={19} color="#6366f1" />
                Soạn & Phát Hành Thông Báo Cho Khách Thuê
              </h3>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Mẫu Soạn Nhanh (Quick Templates) */}
                <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '12px 16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#818cf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} /> Mẫu Thông Báo Soạn Sẵn (Bấm để áp dụng nhanh):
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {TEMPLATES.map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '16px' }}
                        onClick={() => handleApplyTemplate(tpl)}
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chọn Phạm Vi Gửi - 4 Box Lựa Chọn Trực Quan Rộng Rãi */}
                <div>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                    Phạm Vi Gửi Thông Báo *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <div
                      onClick={() => setFormData({ ...formData, target: 'AllTenants', targetId: '' })}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '10px',
                        border: formData.target === 'AllTenants' ? '2px solid #6366f1' : '1px solid var(--border-color)',
                        background: formData.target === 'AllTenants' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-dark)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Home size={20} color={formData.target === 'AllTenants' ? '#6366f1' : 'var(--text-muted)'} style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '13px', fontWeight: 700, color: formData.target === 'AllTenants' ? '#6366f1' : 'var(--text-primary)' }}>Toàn Hệ Thống</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Tất cả các khu trọ</div>
                    </div>

                    <div
                      onClick={() => setFormData({ ...formData, target: 'Zone', targetId: zones[0]?.id || '' })}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '10px',
                        border: formData.target === 'Zone' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                        background: formData.target === 'Zone' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-dark)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Building2 size={20} color={formData.target === 'Zone' ? '#f59e0b' : 'var(--text-muted)'} style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '13px', fontWeight: 700, color: formData.target === 'Zone' ? '#f59e0b' : 'var(--text-primary)' }}>Từng Khu Trọ</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>1 Khu trọ cụ thể</div>
                    </div>

                    <div
                      onClick={() => setFormData({ ...formData, target: 'Room', targetId: rooms[0]?.id || '' })}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '10px',
                        border: formData.target === 'Room' ? '2px solid #a855f7' : '1px solid var(--border-color)',
                        background: formData.target === 'Room' ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-dark)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <DoorOpen size={20} color={formData.target === 'Room' ? '#a855f7' : 'var(--text-muted)'} style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '13px', fontWeight: 700, color: formData.target === 'Room' ? '#a855f7' : 'var(--text-primary)' }}>Từng Phòng</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Khách ở 1 phòng</div>
                    </div>

                    <div
                      onClick={() => setFormData({ ...formData, target: 'User', targetId: (tenants[0]?.userId || tenants[0]?.UserId || tenants[0]?.id) || '' })}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '10px',
                        border: formData.target === 'User' ? '2px solid #10b981' : '1px solid var(--border-color)',
                        background: formData.target === 'User' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-dark)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <User size={20} color={formData.target === 'User' ? '#10b981' : 'var(--text-muted)'} style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '13px', fontWeight: 700, color: formData.target === 'User' ? '#10b981' : 'var(--text-primary)' }}>Một Khách Thuê</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Gửi riêng cá nhân</div>
                    </div>
                  </div>
                </div>

                {/* Sub Dropdown nếu chọn Khu Trọ */}
                {formData.target === 'Zone' && (
                  <div style={{ background: 'var(--bg-dark)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: '#fbbf24' }}>
                      Chọn Khu Trọ Cần Nhận Thông Báo *
                    </label>
                    <select
                      className="form-control"
                      style={{ minHeight: '42px', padding: '8px 14px', fontSize: '13.5px', lineHeight: '1.4' }}
                      required
                      value={formData.targetId}
                      onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                    >
                      <option value="">-- Chọn một khu trọ --</option>
                      {zones.map(z => {
                        const zoneRooms = rooms.filter(r => (r.zoneId || r.ZoneId) === z.id);
                        return (
                          <option key={z.id} value={z.id}>
                            🏢 {z.name} ({zoneRooms.length} phòng) - {z.address}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Sub Dropdown nếu chọn Phòng */}
                {formData.target === 'Room' && (
                  <div style={{ background: 'var(--bg-dark)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: '#c084fc' }}>
                      Chọn Phòng Cụ Thể *
                    </label>
                    <select
                      className="form-control"
                      style={{ minHeight: '42px', padding: '8px 14px', fontSize: '13.5px', lineHeight: '1.4' }}
                      required
                      value={formData.targetId}
                      onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                    >
                      <option value="">-- Chọn phòng --</option>
                      {rooms.map(r => {
                        const zone = zones.find(z => z.id === (r.zoneId || r.ZoneId));
                        return (
                          <option key={r.id} value={r.id}>
                            🚪 Phòng {r.roomNumber} {zone ? `(Thuộc khu ${zone.name})` : ''} - Tầng {r.floor}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Sub Dropdown nếu chọn Khách Thuê */}
                {formData.target === 'User' && (
                  <div style={{ background: 'var(--bg-dark)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: '#34d399' }}>
                      Chọn Khách Thuê Nhận Thông Báo *
                    </label>
                    <select
                      className="form-control"
                      style={{ minHeight: '42px', padding: '8px 14px', fontSize: '13.5px', lineHeight: '1.4' }}
                      required
                      value={formData.targetId}
                      onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                    >
                      <option value="">-- Chọn khách thuê --</option>
                      {tenants.map(t => {
                        const room = rooms.find(r => r.id === (t.roomId || t.RoomId));
                        const roomText = room ? `Phòng ${room.roomNumber}` : 'Chưa xếp';
                        const uId = t.userId || t.UserId || t.id;
                        return (
                          <option key={t.id} value={uId}>
                            👤 {t.fullName || t.name} ({roomText}) - SĐT: {t.phone} {t.cccd ? `[CCCD: ${t.cccd}]` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Tiêu đề thông báo */}
                <div>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    Tiêu Đề Thông Báo *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ minHeight: '40px', padding: '8px 14px', fontSize: '13.5px' }}
                    required
                    placeholder="VD: Thông báo kiểm tra phòng cháy chữa cháy..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Nội dung chi tiết */}
                <div>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    Nội Dung Chi Tiết *
                  </label>
                  <textarea
                    className="form-control"
                    rows={4}
                    style={{ padding: '10px 14px', fontSize: '13.5px', lineHeight: '1.5', resize: 'vertical' }}
                    required
                    placeholder="Nhập nội dung chi tiết thông báo gửi tới người thuê..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  📡 Thông báo sẽ được đẩy Realtime qua SignalR tới khách thuê ngay lập tức.
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => setIsModalOpen(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }} disabled={saving}>
                    <Send size={15} /> {saving ? 'Đang phát hành...' : 'Phát Hành Thông Báo'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem Chi Tiết Toàn Văn Thông Báo */}
      {viewingNotif && (
        <div className="modal-overlay" onClick={() => setViewingNotif(null)}>
          <div className="modal-content" style={{ maxWidth: '650px', width: '92%', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '16px 22px' }}>
              <h3 className="modal-title" style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BellRing size={18} color="#6366f1" /> Chi Tiết Thông Báo
              </h3>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setViewingNotif(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', lineHeight: '1.4' }}>
                {viewingNotif.title}
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div>{getTargetBadge(viewingNotif)}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> {formatDateTime(viewingNotif.createdAt)}
                </div>
                {viewingNotif.senderName && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={13} /> Người gửi: <strong>{viewingNotif.senderName}</strong>
                  </div>
                )}
              </div>

              <div style={{
                background: 'var(--bg-dark)',
                padding: '16px 18px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                lineHeight: '1.6',
                whiteSpace: 'pre-line',
                marginBottom: isRepairNotif(viewingNotif) ? '16px' : 0
              }}>
                {viewingNotif.content}
              </div>

              {isRepairNotif(viewingNotif) && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wrench size={16} />
                    <span>Yêu cầu sửa chữa cần xếp thợ xử lý sớm</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ background: '#f59e0b', borderColor: '#f59e0b', padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={(e) => {
                      setViewingNotif(null);
                      handleNavigateToRepairs(e, viewingNotif);
                    }}
                  >
                    <Wrench size={14} /> Chuyển Tới Mục Bảo Trì & Sửa Chữa
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '14px 22px', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-danger"
                style={{ padding: '7px 14px', fontSize: '13px' }}
                onClick={() => handleDelete(viewingNotif.id)}
              >
                <Trash2 size={14} /> Xóa Thông Báo
              </button>
              <button type="button" className="btn btn-secondary" style={{ padding: '7px 16px', fontSize: '13px' }} onClick={() => setViewingNotif(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
