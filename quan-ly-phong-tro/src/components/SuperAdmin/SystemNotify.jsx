import React, { useState } from 'react';
import {
  BellRing, Plus, Edit, Trash2, Send, Users, Home, User,
  Search, Filter, Sparkles, Calendar, Eye, ShieldCheck, X
} from 'lucide-react';
import { notificationService } from '../../services';
import { formatDateTime } from '../../utils/formatters';

export const SystemNotify = ({ notifications = [], setNotifications, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotify, setEditingNotify] = useState(null);
  const [viewingNotif, setViewingNotif] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [targetFilter, setTargetFilter] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target: 'SystemAll',
  });

  const TARGET_OPTIONS = [
    { value: 'SystemAll', label: '📢 Toàn Hệ Thống (Tất cả Chủ trọ & Khách thuê)', badge: 'Toàn hệ thống', color: '#6366f1' },
    { value: 'AllLandlords', label: '🏠 Tất cả Chủ Trọ trên toàn sàn', badge: 'Tất cả Chủ trọ', color: '#3b82f6' },
    { value: 'AllTenants', label: '👤 Tất cả Khách Thuê trên toàn sàn', badge: 'Tất cả Khách thuê', color: '#10b981' },
  ];

  // Mẫu thông báo hệ thống soạn sẵn của SuperAdmin
  const ADMIN_TEMPLATES = [
    {
      id: 'maintenance',
      name: '🛠️ Bảo trì máy chủ',
      target: 'SystemAll',
      title: 'Thông báo nâng cấp & bảo trì định kỳ hệ thống SmartRent',
      content: 'Kính gửi quý Chủ trọ và Khách thuê,\n\nBan quản trị SmartRent xin thông báo hệ thống sẽ tiến hành bảo trì định kỳ nhằm nâng cấp hiệu năng và tối ưu trải nghiệm vào khung giờ 00:00 - 02:00 sáng. Trong thời gian này, một số tính năng có thể gián đoạn trong ít phút.\n\nTrân trọng cảm ơn sự đồng hành và thấu hiểu của quý khách!',
    },
    {
      id: 'policy_update',
      name: '📜 Cập nhật chính sách',
      target: 'SystemAll',
      title: 'Cập nhật Quy chế & Chính sách vận hành nền tảng SmartRent',
      content: 'Kính gửi toàn thể người dùng,\n\nNhằm nâng cao chất lượng dịch vụ và bảo vệ tối đa quyền lợi của Chủ trọ và Người thuê, ban quản trị đã cập nhật một số quy định về quản lý hợp đồng và hóa đơn điện tử. Quý vị vui lòng tham khảo chi tiết tại mục điều khoản hệ thống.\n\nChúc quý vị có trải nghiệm tiện ích tuyệt vời cùng SmartRent!',
    },
    {
      id: 'landlord_reminder',
      name: '🏠 Nhắc nhở Chủ trọ',
      target: 'AllLandlords',
      title: 'Khuyến nghị cập nhật đầy đủ hồ sơ định danh CCCD và đăng ký tạm trú',
      content: 'Kính gửi quý Chủ nhà trọ,\n\nBan quản trị khuyến nghị các chủ trọ cập nhật đầy đủ thông tin định danh CCCD của khách thuê và thực hiện đăng ký tạm trú đúng quy định pháp luật hiện hành nhằm đảm bảo an ninh trật tự khu trọ.\n\nTrân trọng!',
    },
    {
      id: 'security_alert',
      name: '⚠️ Cảnh báo an ninh mạng',
      target: 'SystemAll',
      title: 'Khuyến cáo bảo mật tài khoản và cảnh giác phòng chống lừa đảo trực tuyến',
      content: 'Kính gửi quý khách hàng,\n\nBan quản trị SmartRent khuyến cáo quý khách tuyệt đối không chia sẻ mã OTP, mật khẩu cho bất kỳ đối tượng nào. Mọi thông tin hỗ trợ chính thống xin vui lòng liên hệ qua tổng đài hỗ trợ hoặc phản hồi trên hệ thống.\n\nTrân trọng!',
    },
    {
      id: 'holiday_notice',
      name: '🎆 Thông báo nghỉ Lễ/Tết',
      target: 'SystemAll',
      title: 'Thông báo lịch trực hỗ trợ kỹ thuật trong kỳ nghỉ Lễ',
      content: 'Kính gửi quý Chủ trọ và Khách thuê,\n\nNhân dịp kỳ nghỉ Lễ, ban quản trị SmartRent xin gửi lời chúc an khang thịnh vượng tới toàn thể quý khách. Đội ngũ hỗ trợ kỹ thuật vẫn duy trì trực hệ thống 24/7 để tiếp nhận các yêu cầu khẩn cấp.\n\nTrân trọng!',
    },
  ];

  const handleApplyTemplate = (tpl) => {
    setFormData({
      title: tpl.title,
      content: tpl.content,
      target: tpl.target || 'SystemAll',
    });
  };

  const handleOpenAdd = () => {
    setEditingNotify(null);
    setFormData({ title: '', content: '', target: 'SystemAll' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (n) => {
    setEditingNotify(n);
    setFormData({
      title: n.title,
      content: n.content,
      target: (n.target === 'All' ? 'SystemAll' : n.target) || 'SystemAll',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa thông báo hệ thống này?')) {
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

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        target: formData.target,
        targetId: null,
      };

      if (editingNotify) {
        setNotifications(notifications.map(n =>
          n.id === editingNotify.id ? { ...n, ...formData } : n
        ));
        alert('✅ Đã cập nhật thông báo thành công!');
      } else {
        const created = await notificationService.create(payload);
        setNotifications([created, ...notifications]);
        const targetLabel = TARGET_OPTIONS.find(t => t.value === formData.target)?.badge || formData.target;
        alert(`✅ Đã phát thông báo hệ thống tới [${targetLabel}] thành công!`);
      }
      setIsModalOpen(false);
      onRefresh?.();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Helper Badge
  const getTargetBadge = (target) => {
    if (target === 'SystemAll' || target === 'All') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
        }}>
          <Users size={13} /> Toàn hệ thống
        </span>
      );
    }
    if (target === 'AllLandlords') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
        }}>
          <Home size={13} /> Tất cả Chủ Trọ
        </span>
      );
    }
    if (target === 'AllTenants') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(16, 185, 129, 0.15)', color: '#34d399',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
        }}>
          <User size={13} /> Tất cả Khách Thuê
        </span>
      );
    }
    return <span className="status-pill vacant">{target}</span>;
  };

  // Thống kê nhanh của Admin
  const totalNotifs = notifications.length;
  const systemAllNotifs = notifications.filter(n => n.target === 'SystemAll' || n.target === 'All').length;
  const landlordNotifs = notifications.filter(n => n.target === 'AllLandlords').length;
  const tenantNotifs = notifications.filter(n => n.target === 'AllTenants').length;

  // Lọc thông báo
  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (n.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (n.senderName || '').toLowerCase().includes(searchTerm.toLowerCase());

    let matchesTarget = true;
    if (targetFilter === 'SystemAll') matchesTarget = n.target === 'SystemAll' || n.target === 'All';
    else if (targetFilter === 'AllLandlords') matchesTarget = n.target === 'AllLandlords';
    else if (targetFilter === 'AllTenants') matchesTarget = n.target === 'AllTenants';

    return matchesSearch && matchesTarget;
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="page-title"><BellRing size={24} color="#6366f1" /> Quản Lý Thông Báo Hệ Thống (SuperAdmin)</h2>
          <p className="page-subtitle">Soạn thảo và phát thông báo toàn sàn tới toàn bộ Chủ Trọ, Khách Thuê hoặc toàn hệ thống SmartRent</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Phát Thông Báo Mới
        </button>
      </div>

      {/* Stats Cards Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'grid', placeItems: 'center', color: '#6366f1' }}>
            <BellRing size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng Thông Báo Sàn</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{totalNotifs}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'grid', placeItems: 'center', color: '#818cf8' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Toàn Hệ Thống</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#818cf8', marginTop: '2px' }}>{systemAllNotifs}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', display: 'grid', placeItems: 'center', color: '#3b82f6' }}>
            <Home size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Tất Cả Chủ Trọ</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6', marginTop: '2px' }}>{landlordNotifs}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'grid', placeItems: 'center', color: '#10b981' }}>
            <User size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Tất Cả Khách Thuê</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>{tenantNotifs}</div>
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
              placeholder="Tìm theo tiêu đề, nội dung thông báo hệ thống..."
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
              <option value="all">Tất cả đối tượng nhận</option>
              <option value="SystemAll">📢 Toàn hệ thống (Chủ trọ + Khách thuê)</option>
              <option value="AllLandlords">🏠 Tất cả Chủ Trọ</option>
              <option value="AllTenants">👤 Tất cả Khách Thuê</option>
            </select>
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Tiêu Đề Thông Báo</th>
              <th style={{ width: '34%' }}>Nội Dung Chi Tiết</th>
              <th style={{ width: '18%' }}>Đối Tượng Nhận</th>
              <th style={{ width: '12%' }}>Thời Gian</th>
              <th style={{ width: '8%' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredNotifications.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                  <BellRing size={38} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
                  <div>Chưa có thông báo hệ thống nào phù hợp.</div>
                </td>
              </tr>
            ) : (
              filteredNotifications.map((n) => (
                <tr key={n.id}>
                  <td>
                    <div
                      style={{ fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={() => setViewingNotif(n)}
                      title="Bấm để xem toàn văn"
                    >
                      <ShieldCheck size={16} color="#6366f1" />
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
                  <td>{getTargetBadge(n.target)}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDateTime(n.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => setViewingNotif(n)} title="Xem chi tiết">
                        <Eye size={13} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(n.id)} title="Xóa">
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

      {/* Modal Phát / Sửa Thông Báo Hệ Thống */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content"
            style={{
              maxWidth: '780px',
              width: '95%',
              maxHeight: '96vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '16px 24px' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} color="#6366f1" />
                {editingNotify ? 'Sửa Thông Báo Hệ Thống' : 'Phát Thông Báo Toàn Sàn (SuperAdmin)'}
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
              <div className="modal-body" style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Mẫu soạn nhanh của Admin */}
                <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '10px 14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#818cf8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={13} /> Mẫu Thông Báo Ban Quản Trị (Bấm để áp dụng nhanh):
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {ADMIN_TEMPLATES.map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '11.5px', padding: '3px 10px', borderRadius: '16px' }}
                        onClick={() => handleApplyTemplate(tpl)}
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chọn Đối Tượng Nhận Hệ Thống */}
                <div>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                    Đối Tượng Nhận Thông Báo *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {TARGET_OPTIONS.map(opt => {
                      const isSelected = formData.target === opt.value;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => setFormData({ ...formData, target: opt.value })}
                          style={{
                            padding: '12px 10px',
                            borderRadius: '10px',
                            border: isSelected ? `2px solid ${opt.color}` : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-dark)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? opt.color : 'var(--text-primary)' }}>
                            {opt.badge}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {opt.value === 'SystemAll' ? 'Tất cả người dùng' : opt.value === 'AllLandlords' ? 'Toàn bộ chủ nhà trọ' : 'Toàn bộ người thuê trọ'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tiêu đề thông báo */}
                <div>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
                    Tiêu Đề Thông Báo *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ minHeight: '40px', padding: '8px 14px', fontSize: '13.5px' }}
                    required
                    placeholder="VD: Thông báo bảo trì nâng cấp máy chủ định kỳ..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Nội dung chi tiết */}
                <div>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
                    Nội Dung Chi Tiết *
                  </label>
                  <textarea
                    className="form-control"
                    rows={4}
                    style={{ padding: '10px 14px', fontSize: '13.5px', lineHeight: '1.5', resize: 'vertical' }}
                    required
                    placeholder="Nhập nội dung chi tiết thông báo hệ thống..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  📡 Thông báo sẽ được đẩy Realtime qua SignalR tới toàn bộ người nhận ngay lập tức.
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => setIsModalOpen(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }} disabled={saving}>
                    <Send size={15} /> {saving ? 'Đang phát hành...' : (editingNotify ? 'Lưu Thay Đổi' : 'Phát Thông Báo')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem Toàn Văn Chi Tiết Thông Báo */}
      {viewingNotif && (
        <div className="modal-overlay" onClick={() => setViewingNotif(null)}>
          <div className="modal-content" style={{ maxWidth: '640px', width: '92%', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '16px 22px' }}>
              <h3 className="modal-title" style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BellRing size={18} color="#6366f1" /> Chi Tiết Thông Báo Hệ Thống
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
                <div>{getTargetBadge(viewingNotif.target)}</div>
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
