import React, { useState } from 'react';
import {
  BellRing, Search, CheckCircle2, Trash2, CheckCheck,
  ShieldCheck, Home, Calendar, Eye, X, Filter,
  Wrench, Receipt, FileText, ArrowRight, Inbox, Clock
} from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';
import { Pagination } from '../Common/Pagination';

export const TenantNotify = ({ notifications: propNotifications, setNotifications }) => {
  const {
    notifications: contextNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotification();

  const notifications = propNotifications && propNotifications.length > 0
    ? propNotifications
    : (contextNotifications || []);

  const [searchTerm, setSearchTerm] = useState('');
  const [sourceTab, setSourceTab] = useState('all'); // 'all' | 'unread' | 'repairs' | 'landlord' | 'admin'
  const [viewingNotif, setViewingNotif] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  // ── Phân loại thông báo ───────────────────────────────────
  const isRepairNotif = (n) => {
    const text = `${n.title || ''} ${n.content || ''}`.toLowerCase();
    return text.includes('sự cố') ||
           text.includes('bảo trì') ||
           text.includes('sửa chữa') ||
           text.includes('tiếp nhận') ||
           text.includes('hoàn thành sửa') ||
           text.includes('hư hỏng') ||
           n.target === 'Maintenance';
  };

  const isInvoiceNotif = (n) => {
    const text = `${n.title || ''} ${n.content || ''}`.toLowerCase();
    return text.includes('hóa đơn') ||
           text.includes('tiền phòng') ||
           text.includes('tiền điện') ||
           text.includes('tiền nước') ||
           text.includes('thanh toán') ||
           text.includes('đóng tiền');
  };

  const isContractNotif = (n) => {
    const text = `${n.title || ''} ${n.content || ''}`.toLowerCase();
    return text.includes('hợp đồng') ||
           text.includes('gia hạn') ||
           text.includes('thanh lý') ||
           text.includes('đặt cọc') ||
           text.includes('trả phòng');
  };

  const isAdminNotif = (n) => {
    return n.target === 'SystemAll' ||
           n.target === 'All' ||
           n.target === 'SuperAdmin' ||
           (n.senderName && (n.senderName.toLowerCase().includes('hệ thống') || n.senderName.toLowerCase().includes('admin'))) ||
           n.senderRole === 'SuperAdmin';
  };

  const isLandlordNotif = (n) => !isAdminNotif(n);

  // ── Thống kê nhanh theo nhóm ──────────────────────────────
  const unreadNotifs = notifications.filter(n => !n.isRead);
  const repairNotifs = notifications.filter(isRepairNotif);
  const landlordNotifs = notifications.filter(isLandlordNotif);
  const adminNotifs = notifications.filter(isAdminNotif);

  // ── Bộ lọc danh sách ──────────────────────────────────────
  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (n.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (n.senderName || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (sourceTab === 'unread') return !n.isRead;
    if (sourceTab === 'repairs') return isRepairNotif(n);
    if (sourceTab === 'landlord') return isLandlordNotif(n);
    if (sourceTab === 'admin') return isAdminNotif(n);

    return true;
  });

  // ── Phân trang 7 thông báo 1 trang ────────────────────────
  const totalPages = Math.ceil(filteredNotifications.length / pageSize) || 1;
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleTabChange = (tab) => {
    setSourceTab(tab);
    setCurrentPage(1);
  };

  const handleOpenDetail = (n) => {
    if (!n.isRead) {
      markAsRead(n.id);
    }
    setViewingNotif(n);
  };

  const handleDelete = (id, e) => {
    e?.stopPropagation();
    if (window.confirm('Bạn có chắc muốn xóa thông báo này?')) {
      deleteNotification(id);
    }
  };

  const handleNavigate = (e, targetTab) => {
    e?.stopPropagation();
    window.dispatchEvent(new CustomEvent('smartrent:switch-tab', { detail: { tab: targetTab } }));
  };

  // Badge nguồn gửi
  const getSenderBadge = (n) => {
    if (isAdminNotif(n)) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          padding: '3px 10px', borderRadius: '16px', fontSize: '11.5px', fontWeight: 600
        }}>
          <ShieldCheck size={12} /> Ban Quản Trị Sàn
        </span>
      );
    }

    if (isRepairNotif(n)) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          padding: '3px 10px', borderRadius: '16px', fontSize: '11.5px', fontWeight: 600
        }}>
          <Wrench size={12} /> Yêu Cầu Sửa Chữa
        </span>
      );
    }

    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        background: 'rgba(16, 185, 129, 0.15)', color: '#34d399',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        padding: '3px 10px', borderRadius: '16px', fontSize: '11.5px', fontWeight: 600
      }}>
        <Home size={12} /> {n.senderName || 'Chủ Nhà Trọ'}
      </span>
    );
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="page-title"><BellRing size={24} color="#6366f1" /> Trung Tâm Thông Báo</h2>
          <p className="page-subtitle">Xem thông báo tiền phòng, bảo trì từ Chủ trọ và thông báo chính sách từ Ban Quản Trị SmartRent</p>
        </div>
        {unreadNotifs.length > 0 && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={markAllAsRead}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <CheckCheck size={16} color="#10b981" /> Đã đọc tất cả ({unreadNotifs.length})
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards Overview - Bo góc mềm mại 16px, icon hộp 46x46 chuẩn Landlord */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
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
            border: sourceTab === 'unread' ? '1.5px solid #ef4444' : '1px solid var(--border-color)',
            boxShadow: sourceTab === 'unread' ? '0 4px 16px rgba(239, 68, 68, 0.15)' : 'none',
            transition: 'all 0.2s ease'
          }}
          onClick={() => handleTabChange('unread')}
        >
          <div style={{ width: 46, height: 46, borderRadius: '14px', background: 'rgba(239, 68, 68, 0.15)', display: 'grid', placeItems: 'center', color: '#ef4444', flexShrink: 0 }}>
            <Inbox size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Chưa Đọc</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#ef4444', marginTop: '2px' }}>{unreadNotifs.length}</div>
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
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Sự Cố & Sửa Chữa</div>
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
            border: sourceTab === 'landlord' ? '1.5px solid #10b981' : '1px solid var(--border-color)',
            boxShadow: sourceTab === 'landlord' ? '0 4px 16px rgba(16, 185, 129, 0.15)' : 'none',
            transition: 'all 0.2s ease'
          }}
          onClick={() => handleTabChange('landlord')}
        >
          <div style={{ width: 46, height: 46, borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', display: 'grid', placeItems: 'center', color: '#10b981', flexShrink: 0 }}>
            <Home size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Từ Chủ Nhà Trọ</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>{landlordNotifs.length}</div>
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
            border: sourceTab === 'admin' ? '1.5px solid #818cf8' : '1px solid var(--border-color)',
            boxShadow: sourceTab === 'admin' ? '0 4px 16px rgba(129, 140, 248, 0.15)' : 'none',
            transition: 'all 0.2s ease'
          }}
          onClick={() => handleTabChange('admin')}
        >
          <div style={{ width: 46, height: 46, borderRadius: '14px', background: 'rgba(99, 102, 241, 0.15)', display: 'grid', placeItems: 'center', color: '#818cf8', flexShrink: 0 }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Từ Ban Quản Trị Sàn</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#818cf8', marginTop: '2px' }}>{adminNotifs.length}</div>
          </div>
        </div>
      </div>

      {/* Main Table & Filter Toolbar */}
      <div className="card-table-container">
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
          {/* Quick Source Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${sourceTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleTabChange('all')}
            >
              Tất Cả ({notifications.length})
            </button>
            <button
              className={`btn btn-sm ${sourceTab === 'unread' ? 'btn-primary' : 'btn-secondary'}`}
              style={sourceTab !== 'unread' && unreadNotifs.length > 0 ? { color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' } : {}}
              onClick={() => handleTabChange('unread')}
            >
              Chưa Đọc ({unreadNotifs.length})
            </button>
            <button
              className={`btn btn-sm ${sourceTab === 'repairs' ? 'btn-primary' : 'btn-secondary'}`}
              style={sourceTab !== 'repairs' && repairNotifs.length > 0 ? { color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)' } : {}}
              onClick={() => handleTabChange('repairs')}
            >
              <Wrench size={14} /> 🛠️ Sự Cố ({repairNotifs.length})
            </button>
            <button
              className={`btn btn-sm ${sourceTab === 'landlord' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleTabChange('landlord')}
            >
              <Home size={14} /> Chủ Trọ ({landlordNotifs.length})
            </button>
            <button
              className={`btn btn-sm ${sourceTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleTabChange('admin')}
            >
              <ShieldCheck size={14} /> Ban Quản Trị ({adminNotifs.length})
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
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '26%' }}>Tiêu Đề Thông Báo</th>
              <th style={{ width: '30%' }}>Nội Dung Chi Tiết</th>
              <th style={{ width: '18%' }}>Nguồn Gửi</th>
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
                const isInvoice = isInvoiceNotif(n);
                const isContract = isContractNotif(n);

                return (
                  <tr
                    key={n.id}
                    style={{
                      background: !n.isRead
                        ? 'rgba(99, 102, 241, 0.04)'
                        : (isRepair ? 'rgba(245, 158, 11, 0.02)' : 'transparent')
                    }}
                  >
                    <td>
                      <div
                        style={{
                          fontWeight: !n.isRead ? '700' : '600',
                          color: !n.isRead ? '#818cf8' : (isRepair ? '#f59e0b' : 'var(--text-primary)'),
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onClick={() => handleOpenDetail(n)}
                        title="Bấm để xem chi tiết thông báo"
                      >
                        {!n.isRead && (
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#6366f1',
                              flexShrink: 0,
                              boxShadow: '0 0 6px rgba(99, 102, 241, 0.6)'
                            }}
                            title="Thông báo mới chưa đọc"
                          />
                        )}
                        {isRepair && <Wrench size={15} color="#f59e0b" style={{ flexShrink: 0 }} />}
                        {isInvoice && <Receipt size={15} color="#10b981" style={{ flexShrink: 0 }} />}
                        {isContract && <FileText size={15} color="#3b82f6" style={{ flexShrink: 0 }} />}
                        {!isRepair && !isInvoice && !isContract && <BellRing size={15} color="#6366f1" style={{ flexShrink: 0 }} />}
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
                    <td>{getSenderBadge(n)}</td>
                    <td style={{ fontSize: '12.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }} title={formatDateTime(n.createdAt)}>
                      {n.createdAt ? formatRelativeTime(n.createdAt) : 'Vừa xong'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'nowrap' }}>
                        {/* Nút hành động nhanh điều hướng */}
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
                            onClick={(e) => handleNavigate(e, 'tn_repairs')}
                            title="Đi đến trang Báo Sự Cố để xem tiến độ"
                          >
                            <Wrench size={13} style={{ flexShrink: 0 }} />
                            <span>Xem sự cố</span>
                          </button>
                        )}
                        {isInvoice && !isRepair && (
                          <button
                            className="btn btn-sm"
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: '#10b981',
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
                            onClick={(e) => handleNavigate(e, 'tn_invoices')}
                            title="Đi đến trang Hóa Đơn để kiểm tra và đóng tiền"
                          >
                            <Receipt size={13} style={{ flexShrink: 0 }} />
                            <span>Hóa đơn</span>
                          </button>
                        )}
                        {isContract && !isRepair && !isInvoice && (
                          <button
                            className="btn btn-sm"
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: '#3b82f6',
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
                            onClick={(e) => handleNavigate(e, 'tn_contract')}
                            title="Đi đến trang Hợp Đồng"
                          >
                            <FileText size={13} style={{ flexShrink: 0 }} />
                            <span>Hợp đồng</span>
                          </button>
                        )}

                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '5px 8px', borderRadius: '6px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => handleOpenDetail(n)}
                          title="Xem toàn văn thông báo"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          style={{ padding: '5px 8px', borderRadius: '6px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={(e) => handleDelete(n.id, e)}
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

      {/* Modal Xem Toàn Văn Chi Tiết Thông Báo */}
      {viewingNotif && (
        <div className="modal-overlay" onClick={() => setViewingNotif(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '620px', width: '92%', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
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
                <div>{getSenderBadge(viewingNotif)}</div>
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

            <div className="modal-footer" style={{ padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                {isRepairNotif(viewingNotif) && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#f59e0b', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={(e) => {
                      setViewingNotif(null);
                      handleNavigate(e, 'tn_repairs');
                    }}
                  >
                    <Wrench size={14} /> Đi đến mục Báo Sự Cố
                  </button>
                )}
                {isInvoiceNotif(viewingNotif) && !isRepairNotif(viewingNotif) && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#10b981', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={(e) => {
                      setViewingNotif(null);
                      handleNavigate(e, 'tn_invoices');
                    }}
                  >
                    <Receipt size={14} /> Đi đến mục Hóa Đơn
                  </button>
                )}
                {isContractNotif(viewingNotif) && !isRepairNotif(viewingNotif) && !isInvoiceNotif(viewingNotif) && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={(e) => {
                      setViewingNotif(null);
                      handleNavigate(e, 'tn_contract');
                    }}
                  >
                    <FileText size={14} /> Đi đến mục Hợp Đồng
                  </button>
                )}
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '7px 18px', fontSize: '13px' }}
                onClick={() => setViewingNotif(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
