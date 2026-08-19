import React, { useState } from 'react';
import {
  BellRing, Plus, Send, Trash2, Users, Home, Building2,
  Search, Eye, Sparkles, Filter, CheckCircle2,
  Calendar, Layers, DoorOpen, User, X
} from 'lucide-react';
import { notificationService } from '../../services';
import { formatDateTime } from '../../utils/formatters';
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
  const [targetFilter, setTargetFilter] = useState('all');

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

  // Helper hiển thị tên và icon của Target
  const getTargetBadge = (n) => {
    if (n.target === 'AllTenants') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
        }}>
          <Home size={13} /> Toàn bộ hệ thống ({tenants.length} khách)
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
          <Building2 size={13} /> Khu: {zone ? zone.name : 'Khu trọ'}
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
          <DoorOpen size={13} /> Phòng: {room ? room.roomNumber : 'Phòng'} {zone ? `(${zone.name})` : ''}
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
          <User size={13} /> Khách: {tenant ? (tenant.fullName || tenant.name) : 'Cá nhân'}
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
          <Layers size={13} /> 🛡️ Ban Quản Trị Hệ Thống
        </span>
      );
    }

    return <span className="status-pill vacant">{n.target}</span>;
  };

  // Thống kê nhanh
  const totalNotifs = notifications.length;
  const allTenantsNotifs = notifications.filter(n => n.target === 'AllTenants').length;
  const zoneNotifs = notifications.filter(n => n.target === 'Zone').length;
  const specificNotifs = notifications.filter(n => n.target === 'Room' || n.target === 'User').length;

  // Lọc danh sách
  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (n.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (n.senderName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTarget = true;
    if (targetFilter === 'AllTenants') matchesTarget = n.target === 'AllTenants';
    else if (targetFilter === 'Zone') matchesTarget = n.target === 'Zone';
    else if (targetFilter === 'Room') matchesTarget = n.target === 'Room';
    else if (targetFilter === 'User') matchesTarget = n.target === 'User';

    return matchesSearch && matchesTarget;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="page-title"><BellRing size={24} color="#6366f1" /> Quản Lý Thông Báo Cho Khách Thuê</h2>
          <p className="page-subtitle">Tạo và phát thông báo tới toàn bộ hệ thống trọ, từng khu trọ, từng phòng hoặc riêng từng khách thuê</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => handleOpenCreateModal('AllTenants')}>
            <Plus size={18} /> Gửi Thông Báo Mới
          </button>
        </div>
      </div>

      {/* Stats Cards Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'grid', placeItems: 'center', color: '#6366f1' }}>
            <BellRing size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng Thông Báo Đã Gửi</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{totalNotifs}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', display: 'grid', placeItems: 'center', color: '#3b82f6' }}>
            <Home size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Toàn Bộ Hệ Thống</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6', marginTop: '2px' }}>{allTenantsNotifs}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'grid', placeItems: 'center', color: '#f59e0b' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Theo Từng Khu Trọ</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>{zoneNotifs}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'grid', placeItems: 'center', color: '#10b981' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Phòng / Cá Nhân</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>{specificNotifs}</div>
          </div>
        </div>
      </div>

      {/* Main Table & Filter Toolbar */}
      <div className="card-table-container">
        <div className="table-toolbar">
          <div className="search-input-group">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, nội dung thông báo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              className="filter-select"
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
            >
              <option value="all">Tất cả phạm vi gửi</option>
              <option value="AllTenants">🏠 Toàn bộ hệ thống trọ</option>
              <option value="Zone">🏢 Theo từng Khu Trọ</option>
              <option value="Room">🚪 Theo từng Phòng</option>
              <option value="User">👤 Riêng từng Khách Thuê</option>
            </select>
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Tiêu Đề Thông Báo</th>
              <th style={{ width: '32%' }}>Nội Dung Tóm Tắt</th>
              <th style={{ width: '18%' }}>Phạm Vi Người Nhận</th>
              <th style={{ width: '12%' }}>Thời Gian</th>
              <th style={{ width: '10%' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredNotifications.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <BellRing size={36} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
                  <div>Chưa có thông báo nào phù hợp với bộ lọc.</div>
                </td>
              </tr>
            ) : (
              filteredNotifications.map((n) => (
                <tr key={n.id}>
                  <td>
                    <div
                      style={{ fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={() => setViewingNotif(n)}
                      title="Bấm để xem chi tiết thông báo"
                    >
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
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {formatDateTime(n.createdAt)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setViewingNotif(n)}
                        title="Xem toàn văn thông báo"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(n.id)}
                        title="Xóa thông báo này"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
              </div>

              <div style={{
                background: 'var(--bg-dark)',
                padding: '16px 18px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                lineHeight: '1.6',
                whiteSpace: 'pre-line'
              }}>
                {viewingNotif.content}
              </div>
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
