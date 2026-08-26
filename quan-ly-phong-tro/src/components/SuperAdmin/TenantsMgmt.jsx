import React, { useState, useEffect } from 'react';
import {
  Users, Search, Lock, Unlock, KeyRound, Eye,
  CreditCard, ShieldCheck, AlertCircle, X, MapPin, Mail, Phone,
  Building2, Home, CheckCircle2, UserCheck, ShieldAlert, Bike,
  FileText, Receipt, Calendar, AlertTriangle
} from 'lucide-react';
import { adminService } from '../../services';
import { formatVND, formatDate, getImageUrl } from '../../utils/formatters';
import { Pagination } from '../Common/Pagination';
import { ImageLightboxModal } from '../Common/ImageUploader';

// Helper che mờ số CCCD bảo vệ quyền riêng tư
const maskCCCD = (cccd) => {
  if (!cccd) return 'Chưa cập nhật';
  const clean = String(cccd).trim();
  if (clean.length <= 6) return clean;
  return clean.slice(0, 4) + '******' + clean.slice(-3);
};

export const TenantsMgmt = ({ landlords = [], onRefresh }) => {
  const [allTenants, setAllTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'locked'
  const [rentFilter, setRentFilter] = useState('all'); // 'all' | 'renting' | 'vacated'
  const [debtFilter, setDebtFilter] = useState('all'); // 'all' | 'unpaid' | 'paid'
  const [verifiedFilter, setVerifiedFilter] = useState('all'); // 'all' | 'verified' | 'unverified'
  const [landlordFilter, setLandlordFilter] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [viewingDetail, setViewingDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [viewingCccdTenant, setViewingCccdTenant] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [resetModalTenant, setResetModalTenant] = useState(null);
  const [customNewPass, setCustomNewPass] = useState('Tenant@2026');
  const [isResetting, setIsResetting] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch toàn bộ danh sách khách thuê
  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await adminService.getTenants();
      const list = Array.isArray(data) ? data : (data?.items || []);
      setAllTenants(list);
    } catch (err) {
      console.error('Lỗi khi tải danh sách khách thuê:', err);
      showToast('⚠️ Không thể tải danh sách khách thuê!', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  // Xóa toàn bộ bộ lọc
  const handleResetAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setRentFilter('all');
    setDebtFilter('all');
    setVerifiedFilter('all');
    setLandlordFilter('');
    setCurrentPage(1);
  };

  const isFiltered = searchTerm || statusFilter !== 'all' || rentFilter !== 'all' || debtFilter !== 'all' || verifiedFilter !== 'all' || landlordFilter;

  // Xem chi tiết hồ sơ
  const handleOpenDetail = async (tenant) => {
    setDetailLoading(true);
    try {
      const detail = await adminService.getTenantDetail(tenant.id);
      setViewingDetail(detail);
    } catch (err) {
      console.error('Lỗi lấy chi tiết khách thuê:', err);
      showToast('⚠️ Không thể tải chi tiết hồ sơ khách thuê!', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // Khóa / Mở khóa tài khoản
  const handleToggleLock = async (tenant) => {
    const isLocking = tenant.isActive !== false;
    const actionName = isLocking ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản của khách thuê "${tenant.fullName}"?`)) return;

    try {
      await adminService.toggleLockTenant(tenant.id);
      showToast(`Đã ${actionName} tài khoản "${tenant.fullName}" thành công!`);
      loadTenants();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(`Lỗi khi ${actionName} tài khoản:`, err);
      showToast(`⚠️ Không thể ${actionName} tài khoản!`, 'error');
    }
  };

  // Đặt lại mật khẩu
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalTenant) return;
    if (!customNewPass || customNewPass.length < 6) {
      showToast('⚠️ Mật khẩu mới phải có ít nhất 6 ký tự!', 'error');
      return;
    }

    setIsResetting(true);
    try {
      await adminService.resetTenantPassword(resetModalTenant.id, customNewPass);
      showToast(`Đã đặt lại mật khẩu cho "${resetModalTenant.fullName}" thành: ${customNewPass}`);
      setResetModalTenant(null);
    } catch (err) {
      console.error('Lỗi đặt lại mật khẩu:', err);
      showToast('⚠️ Không thể đặt lại mật khẩu!', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Metrics summary (Luôn phản ánh tổng số thực tế toàn hệ thống)
  const totalTenants = allTenants.length;
  const activeRentingCount = allTenants.filter(t => t.roomId).length;
  const verifiedCccdCount = allTenants.filter(t => t.cccd && (t.cccdFrontUrl || t.cccdBackUrl)).length;
  const lockedCount = allTenants.filter(t => t.isActive === false).length;
  const unpaidCount = allTenants.filter(t => t.unpaidInvoicesCount > 0).length;

  // Lọc dữ liệu khách thuê đa tiêu chí
  const filteredTenants = allTenants.filter(t => {
    // 1. Tìm kiếm (Tên, Email, SĐT, CCCD, Quê quán, Số phòng, Khu trọ, Chủ trọ)
    const s = (searchTerm || '').trim().toLowerCase();
    const matchesSearch = !s ||
      (t.fullName && t.fullName.toLowerCase().includes(s)) ||
      (t.email && t.email.toLowerCase().includes(s)) ||
      (t.phone && t.phone.toLowerCase().includes(s)) ||
      (t.cccd && t.cccd.toLowerCase().includes(s)) ||
      (t.hometown && t.hometown.toLowerCase().includes(s)) ||
      (t.roomNumber && t.roomNumber.toLowerCase().includes(s)) ||
      (t.zoneName && t.zoneName.toLowerCase().includes(s)) ||
      (t.landlordName && t.landlordName.toLowerCase().includes(s));

    // 2. Trạng thái tài khoản
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && t.isActive !== false) ||
      (statusFilter === 'locked' && t.isActive === false);

    // 3. Tình trạng nơi ở
    const matchesRent = rentFilter === 'all' ||
      (rentFilter === 'renting' && !!t.roomId) ||
      (rentFilter === 'vacated' && !t.roomId);

    // 4. Tình trạng công nợ
    const matchesDebt = debtFilter === 'all' ||
      (debtFilter === 'unpaid' && t.unpaidInvoicesCount > 0) ||
      (debtFilter === 'paid' && (!t.unpaidInvoicesCount || t.unpaidInvoicesCount === 0));

    // 5. Trạng thái định danh CCCD
    const isVerified = !!(t.cccd && (t.cccdFrontUrl || t.cccdBackUrl));
    const matchesVerified = verifiedFilter === 'all' ||
      (verifiedFilter === 'verified' && isVerified) ||
      (verifiedFilter === 'unverified' && !isVerified);

    // 6. Chủ trọ quản lý
    const matchesLandlord = !landlordFilter ||
      (t.landlordId && String(t.landlordId).toLowerCase() === String(landlordFilter).toLowerCase());

    return matchesSearch && matchesStatus && matchesRent && matchesDebt && matchesVerified && matchesLandlord;
  });

  // Phân trang
  const totalPages = Math.ceil(filteredTenants.length / pageSize) || 1;
  const paginatedTenants = filteredTenants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="admin-page-container">
      {/* Toast alert */}
      {toast && (
        <div className={`notification-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Title */}
      <div className="section-header" style={{ marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Users className="text-primary" size={30} />
            Quản Lý Khách Thuê Toàn Hệ Thống
          </h2>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 14.5 }}>
            Tra cứu thông tin định danh, lịch sử hợp đồng, quản lý bảo mật và giám sát cư trú toàn sàn SmartRent.
          </p>
        </div>
      </div>

      {/* 5 Thẻ KPI — Radio-button style: bấm 1 thẻ thì reset filter còn lại */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '22px' }}>
        {/* 1. Tổng Khách Thuê — reset tất cả */}
        <div
          className="card"
          onClick={handleResetAllFilters}
          title="Nhấp để xem toàn bộ danh sách"
          style={{
            flex: '1 1 180px',
            padding: '16px 20px',
            cursor: 'pointer',
            borderRadius: '14px',
            border: !isFiltered ? '2px solid #6366f1' : '1px solid var(--border-color)',
            background: !isFiltered ? 'rgba(99, 102, 241, 0.14)' : 'rgba(99, 102, 241, 0.08)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)'
          }}
        >
          <div style={{ fontSize: '14.5px', color: '#6366f1', fontWeight: 700 }}>👥 Tổng Khách Thuê</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#6366f1', marginTop: '4px' }}>
            {totalTenants} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>người</span>
          </div>
        </div>

        {/* 2. Đang Thuê Phòng */}
        <div
          className="card"
          onClick={() => {
            const next = rentFilter === 'renting' ? 'all' : 'renting';
            setStatusFilter('all'); setDebtFilter('all'); setVerifiedFilter('all'); setLandlordFilter(''); setSearchTerm('');
            setRentFilter(next);
            setCurrentPage(1);
          }}
          title="Nhấp để lọc khách đang thuê phòng"
          style={{
            flex: '1 1 180px',
            padding: '16px 20px',
            cursor: 'pointer',
            borderRadius: '14px',
            border: rentFilter === 'renting' ? '2px solid #10b981' : '1px solid var(--border-color)',
            background: rentFilter === 'renting' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.08)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
          }}
        >
          <div style={{ fontSize: '14.5px', color: '#10b981', fontWeight: 700 }}>🏠 Đang Thuê Phòng</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {activeRentingCount} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>người</span>
          </div>
        </div>

        {/* 3. Đã Xác Thực CCCD */}
        <div
          className="card"
          onClick={() => {
            const next = verifiedFilter === 'verified' ? 'all' : 'verified';
            setStatusFilter('all'); setDebtFilter('all'); setRentFilter('all'); setLandlordFilter(''); setSearchTerm('');
            setVerifiedFilter(next);
            setCurrentPage(1);
          }}
          title="Nhấp để lọc khách đã xác thực CCCD"
          style={{
            flex: '1 1 180px',
            padding: '16px 20px',
            cursor: 'pointer',
            borderRadius: '14px',
            border: verifiedFilter === 'verified' ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
            background: verifiedFilter === 'verified' ? 'rgba(139, 92, 246, 0.14)' : 'rgba(139, 92, 246, 0.08)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.08)'
          }}
        >
          <div style={{ fontSize: '14.5px', color: '#8b5cf6', fontWeight: 700 }}>🛡️ Đã Xác Thực CCCD</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
            {verifiedCccdCount} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>hồ sơ</span>
          </div>
        </div>

        {/* 4. Tài Khoản Bị Khóa */}
        <div
          className="card"
          onClick={() => {
            const next = statusFilter === 'locked' ? 'all' : 'locked';
            setRentFilter('all'); setDebtFilter('all'); setVerifiedFilter('all'); setLandlordFilter(''); setSearchTerm('');
            setStatusFilter(next);
            setCurrentPage(1);
          }}
          title="Nhấp để lọc tài khoản bị khóa"
          style={{
            flex: '1 1 180px',
            padding: '16px 20px',
            cursor: 'pointer',
            borderRadius: '14px',
            border: statusFilter === 'locked' ? '2px solid #ef4444' : '1px solid var(--border-color)',
            background: statusFilter === 'locked' ? 'rgba(239, 68, 68, 0.14)' : 'rgba(239, 68, 68, 0.08)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
          }}
        >
          <div style={{ fontSize: '14.5px', color: '#ef4444', fontWeight: 700 }}>🔒 Tài Khoản Bị Khóa</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
            {lockedCount} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>tài khoản</span>
          </div>
        </div>

        {/* 5. Đang Nợ Tiền Phòng */}
        <div
          className="card"
          onClick={() => {
            const next = debtFilter === 'unpaid' ? 'all' : 'unpaid';
            setRentFilter('all'); setStatusFilter('all'); setVerifiedFilter('all'); setLandlordFilter(''); setSearchTerm('');
            setDebtFilter(next);
            setCurrentPage(1);
          }}
          title="Nhấp để lọc khách đang nợ tiền phòng"
          style={{
            flex: '1 1 180px',
            padding: '16px 20px',
            cursor: 'pointer',
            borderRadius: '14px',
            border: debtFilter === 'unpaid' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
            background: debtFilter === 'unpaid' ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.08)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
          }}
        >
          <div style={{ fontSize: '14.5px', color: '#f59e0b', fontWeight: 700 }}>⏳ Đang Nợ Tiền Phòng</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
            {unpaidCount} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>khách</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="filter-card" style={{ background: 'var(--surface-color)', padding: 18, borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 22 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          {/* Ô Tìm Kiếm */}
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <Search size={19} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Tìm theo tên, email, SĐT, CCCD, số phòng, khu trọ..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: 42, paddingRight: searchTerm ? 38 : 14, fontSize: 14.5 }}
            />
            {searchTerm && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', padding: '2px 6px', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Lọc Nơi Ở */}
          <div style={{ minWidth: 160 }}>
            <select
              className="form-control"
              value={rentFilter}
              onChange={(e) => { setRentFilter(e.target.value); setCurrentPage(1); }}
              style={{ fontSize: 14.5 }}
            >
              <option value="all">Tất cả nơi ở</option>
              <option value="renting">🏠 Đang thuê phòng</option>
              <option value="vacated">🚪 Chưa có phòng / Đã rời</option>
            </select>
          </div>

          {/* Lọc Trạng Thái TK */}
          <div style={{ minWidth: 160 }}>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{ fontSize: 14.5 }}
            >
              <option value="all">Tất cả trạng thái TK</option>
              <option value="active">🟢 Đang hoạt động</option>
              <option value="locked">🔴 Đã bị khóa</option>
            </select>
          </div>

          {/* Lọc Công Nợ */}
          <div style={{ minWidth: 160 }}>
            <select
              className="form-control"
              value={debtFilter}
              onChange={(e) => { setDebtFilter(e.target.value); setCurrentPage(1); }}
              style={{ fontSize: 14.5 }}
            >
              <option value="all">Tất cả công nợ</option>
              <option value="unpaid">⚠️ Đang nợ tiền phòng</option>
              <option value="paid">✓ Không nợ tiền</option>
            </select>
          </div>

          {/* Lọc Định Danh CCCD */}
          <div style={{ minWidth: 165 }}>
            <select
              className="form-control"
              value={verifiedFilter}
              onChange={(e) => { setVerifiedFilter(e.target.value); setCurrentPage(1); }}
              style={{ fontSize: 14.5 }}
            >
              <option value="all">Tất cả định danh</option>
              <option value="verified">🛡️ Đã xác thực CCCD</option>
              <option value="unverified">📄 Chưa xác thực</option>
            </select>
          </div>

          {/* Lọc Chủ Trọ */}
          {landlords.length > 0 && (
            <div style={{ minWidth: 180 }}>
              <select
                className="form-control"
                value={landlordFilter}
                onChange={(e) => { setLandlordFilter(e.target.value); setCurrentPage(1); }}
                style={{ fontSize: 14.5 }}
              >
                <option value="">Tất cả Chủ trọ</option>
                {landlords.map(l => (
                  <option key={l.id} value={l.id}>🏢 {l.fullName || l.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Nút Xóa Bộ Lọc nếu đang filter */}
          {isFiltered && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetAllFilters}
              style={{ fontSize: 14, padding: '9px 14px' }}
              title="Đặt lại toàn bộ tiêu chí lọc"
            >
              ✕ Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Main Tenant Table */}
      <div className="table-responsive" style={{ background: 'var(--surface-color)', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--table-header-bg, rgba(255,255,255,0.03))', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '16px 18px', fontWeight: 650, fontSize: 15 }}>Khách thuê</th>
              <th style={{ padding: '16px 18px', fontWeight: 650, fontSize: 15 }}>Liên hệ</th>
              <th style={{ padding: '16px 18px', fontWeight: 650, fontSize: 15 }}>Nơi ở & Chủ trọ</th>
              <th style={{ padding: '16px 18px', fontWeight: 650, fontSize: 15 }}>Công nợ</th>
              <th style={{ padding: '16px 18px', fontWeight: 650, fontSize: 15 }}>Trạng thái</th>
              <th style={{ padding: '16px 18px', fontWeight: 650, fontSize: 15, textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 15 }}>
                  <div className="spinner" style={{ margin: '0 auto 14px' }} />
                  Đang tải danh sách khách thuê...
                </td>
              </tr>
            ) : paginatedTenants.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 15 }}>
                  <div style={{ marginBottom: 8, fontSize: 28 }}>🔍</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-color)', marginBottom: 6, fontSize: 15 }}>
                    Không tìm thấy khách thuê nào phù hợp với bộ lọc hiện tại
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 12 }}>
                    {isFiltered ? 'Hãy thử điều chỉnh lại từ khóa tìm kiếm hoặc các tiêu chí lọc.' : 'Hệ thống hiện chưa có dữ liệu khách thuê.'}
                  </div>
                  {isFiltered && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={handleResetAllFilters}
                      style={{ fontSize: 13.5, padding: '6px 14px' }}
                    >
                      ✕ Xóa bộ lọc để xem tất cả ({totalTenants} khách)
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginatedTenants.map(t => {
                const isLocked = t.isActive === false;
                const hasRoom = !!t.roomId;

                return (
                  <tr
                    key={t.id}
                    onClick={() => handleOpenDetail(t)}
                    title="Nhấp để xem chi tiết hồ sơ khách thuê"
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.2s',
                      cursor: 'pointer'
                    }}
                    className="hover-highlight-row"
                  >
                    {/* Tenant Info (Avatar + Tên + CCCD) */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <img
                          src={getImageUrl(t.avatarUrl, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100')}
                          alt={t.fullName}
                          style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }}
                        />
                        <div>
                          <div style={{ fontWeight: 650, fontSize: 15.5, color: 'var(--text-color)' }}>{t.fullName}</div>
                          <div className="text-muted" style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                            <CreditCard size={13} /> {t.cccd ? maskCCCD(t.cccd) : 'Chưa có CCCD'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 7, fontWeight: 500 }}>
                        <Phone size={14} className="text-muted" /> {t.phone || 'Chưa có SĐT'}
                      </div>
                      <div className="text-muted" style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
                        <Mail size={14} /> {t.email}
                      </div>
                    </td>

                    {/* Room & Landlord */}
                    <td style={{ padding: '14px 18px' }}>
                      {hasRoom ? (
                        <div>
                          <div style={{ fontWeight: 650, color: '#3b82f6', fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Home size={15} /> Phòng {t.roomNumber} ({t.zoneName})
                          </div>
                          <div className="text-muted" style={{ fontSize: 13.5, marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Building2 size={13} /> Chủ trọ: {t.landlordName || 'N/A'}
                          </div>
                        </div>
                      ) : (
                        <span className="badge badge-secondary" style={{ padding: '5px 10px', borderRadius: 6, fontSize: 13 }}>
                          Chưa có phòng
                        </span>
                      )}
                    </td>

                    {/* Debt / Unpaid Invoices */}
                    <td style={{ padding: '14px 18px' }}>
                      {t.unpaidInvoicesCount > 0 ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontSize: 13.5, fontWeight: 650 }} title="Có hóa đơn chưa thanh toán">
                          <AlertTriangle size={14} /> Nợ {formatVND(t.totalUnpaidAmount)} ({t.unpaidInvoicesCount} HĐ)
                        </span>
                      ) : (
                        <span style={{ color: '#10b981', fontSize: 13.5, fontWeight: 550 }}>
                          ✓ Không nợ
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 18px' }}>
                      {isLocked ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontSize: 13.5, fontWeight: 650 }}>
                          <Lock size={14} /> Đã khóa
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: 13.5, fontWeight: 650 }}>
                          <CheckCircle2 size={14} /> Hoạt động
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          title="Đặt lại mật khẩu"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResetModalTenant(t);
                            setCustomNewPass('Tenant@2026');
                          }}
                          style={{ padding: '7px 9px', borderRadius: 6, color: '#f59e0b' }}
                        >
                          <KeyRound size={17} />
                        </button>

                        <button
                          type="button"
                          className={`btn btn-sm btn-ghost ${isLocked ? 'text-success' : 'text-danger'}`}
                          title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLock(t);
                          }}
                          style={{ padding: '7px 9px', borderRadius: 6 }}
                        >
                          {isLocked ? <Unlock size={17} color="#10b981" /> : <Lock size={17} color="#ef4444" />}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: 16 }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredTenants.length}
            pageSize={pageSize}
          />
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 1: CHI TIẾT HỒ SƠ & LỊCH SỬ THUÊ TRỌ */}
      {/* ========================================== */}
      {viewingDetail && (
        <div className="modal-overlay" onClick={() => setViewingDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800, width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users className="text-primary" size={22} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Hồ Sơ & Lịch Sử Khách Thuê</h3>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setViewingDetail(null)} style={{ padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {/* Profile Card Summary */}
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: 18, background: 'var(--surface-color)', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                <img
                  src={getImageUrl(viewingDetail.avatarUrl, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150')}
                  alt={viewingDetail.fullName}
                  style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-color)' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{viewingDetail.fullName}</h4>
                    {viewingDetail.isActive ? (
                      <span className="badge badge-success" style={{ fontSize: 12, padding: '2px 8px' }}>🟢 Hoạt động</span>
                    ) : (
                      <span className="badge badge-danger" style={{ fontSize: 12, padding: '2px 8px' }}>🔴 Đã khóa</span>
                    )}
                    {viewingDetail.roomId && (
                      viewingDetail.isPrimaryTenant ? (
                        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <UserCheck size={14} /> Đại diện Hợp đồng
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Users size={14} /> Thành viên ở ghép
                        </span>
                      )
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                    <span><Phone size={13} style={{ verticalAlign: -2 }} /> {viewingDetail.phone || 'Chưa có SĐT'}</span>
                    <span><Mail size={13} style={{ verticalAlign: -2 }} /> {viewingDetail.email}</span>
                    <span><MapPin size={13} style={{ verticalAlign: -2 }} /> Quê quán: {viewingDetail.hometown || 'Chưa cập nhật'}</span>
                    <span><CreditCard size={13} style={{ verticalAlign: -2 }} /> CCCD: {viewingDetail.cccd || 'Chưa có'}</span>
                  </div>
                </div>
              </div>

              {/* Current Residence Status */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Home size={18} className="text-primary" /> Nơi Ở Hiện Tại
                </h4>
                {viewingDetail.roomId ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, padding: 16, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 10, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <div>
                      <div className="text-muted" style={{ fontSize: 12 }}>Phòng đang ở</div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#3b82f6' }}>Phòng {viewingDetail.roomNumber} ({viewingDetail.zoneName})</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: 12 }}>Vai trò trong phòng</div>
                      <div style={{ fontWeight: 600, color: viewingDetail.isPrimaryTenant ? '#10b981' : '#8b5cf6' }}>
                        {viewingDetail.isPrimaryTenant ? '👑 Đại diện Hợp đồng' : '👥 Thành viên ở ghép'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: 12 }}>Chủ trọ phụ trách</div>
                      <div style={{ fontWeight: 600 }}>{viewingDetail.landlordName || 'N/A'} ({viewingDetail.landlordPhone || 'N/A'})</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: 12 }}>Tiền cọc giữ chỗ</div>
                      <div style={{ fontWeight: 600, color: '#10b981' }}>{formatVND(viewingDetail.deposit)}</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: 12 }}>Phương tiện gửi</div>
                      <div style={{ fontWeight: 600 }}><Bike size={14} style={{ verticalAlign: -2 }} /> {viewingDetail.vehicleCount} xe ({viewingDetail.vehicleInfo || 'Không có biển số'})</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 16, background: 'var(--surface-color)', borderRadius: 8, border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: 13 }}>
                    Khách thuê hiện không ở phòng nào hoặc đã trả phòng.
                  </div>
                )}
              </div>

              {/* CCCD Documents */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={18} className="text-primary" /> Giấy Tờ Định Danh CCCD
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div className="text-muted" style={{ fontSize: 12, marginBottom: 6 }}>Mặt trước CCCD:</div>
                    {viewingDetail.cccdFrontUrl ? (
                      <img
                        src={getImageUrl(viewingDetail.cccdFrontUrl)}
                        alt="CCCD Mặt trước"
                        onClick={() => setLightboxImage(getImageUrl(viewingDetail.cccdFrontUrl))}
                        style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer' }}
                      />
                    ) : (
                      <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: 12 }}>
                        Chưa tải lên mặt trước
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: 12, marginBottom: 6 }}>Mặt sau CCCD:</div>
                    {viewingDetail.cccdBackUrl ? (
                      <img
                        src={getImageUrl(viewingDetail.cccdBackUrl)}
                        alt="CCCD Mặt sau"
                        onClick={() => setLightboxImage(getImageUrl(viewingDetail.cccdBackUrl))}
                        style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer' }}
                      />
                    ) : (
                      <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: 12 }}>
                        Chưa tải lên mặt sau
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rental Contracts History */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} className="text-primary" /> Lịch Sử Hợp Đồng Thuê Nhà ({viewingDetail.contracts?.length || 0})
                </h4>
                {viewingDetail.contracts && viewingDetail.contracts.length > 0 ? (
                  <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: 8 }}>
                    <table className="custom-table" style={{ width: '100%', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '8px 12px' }}>Mã HĐ</th>
                          <th style={{ padding: '8px 12px' }}>Phòng & Khu</th>
                          <th style={{ padding: '8px 12px' }}>Chủ trọ</th>
                          <th style={{ padding: '8px 12px' }}>Thời hạn</th>
                          <th style={{ padding: '8px 12px' }}>Giá thuê</th>
                          <th style={{ padding: '8px 12px' }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingDetail.contracts.map(c => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{c.contractCode}</td>
                            <td style={{ padding: '8px 12px' }}>P.{c.roomNumber} ({c.zoneName})</td>
                            <td style={{ padding: '8px 12px' }}>{c.landlordName}</td>
                            <td style={{ padding: '8px 12px' }}>{formatDate(c.startDate)} - {formatDate(c.endDate)}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{formatVND(c.rentAmount)}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span className={`badge ${c.status === 'Active' ? 'badge-success' : c.status === 'Terminated' ? 'badge-secondary' : 'badge-warning'}`}>
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có hợp đồng nào được lưu trong hệ thống.</div>
                )}
              </div>

              {/* Unpaid Invoices */}
              {viewingDetail.unpaidInvoices && viewingDetail.unpaidInvoices.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
                    <Receipt size={18} /> Hóa Đơn Chưa Thanh Toán ({viewingDetail.unpaidInvoices.length})
                  </h4>
                  <div className="table-responsive" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8 }}>
                    <table className="custom-table" style={{ width: '100%', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'rgba(239, 68, 68, 0.05)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <th style={{ padding: '8px 12px' }}>Mã HĐ</th>
                          <th style={{ padding: '8px 12px' }}>Kỳ hóa đơn</th>
                          <th style={{ padding: '8px 12px' }}>Số tiền</th>
                          <th style={{ padding: '8px 12px' }}>Hạn thanh toán</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingDetail.unpaidInvoices.map(inv => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.1)' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{inv.invoiceCode}</td>
                            <td style={{ padding: '8px 12px' }}>{inv.month}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#ef4444' }}>{formatVND(inv.totalAmount)}</td>
                            <td style={{ padding: '8px 12px' }}>{formatDate(inv.dueDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setViewingDetail(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: XEM CCCD CHI TIẾT */}
      {/* ========================================== */}
      {viewingCccdTenant && (
        <div className="modal-overlay" onClick={() => setViewingCccdTenant(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, width: '90%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={20} className="text-primary" /> Ảnh CCCD Khách Thuê: {viewingCccdTenant.fullName}
              </h3>
              <button type="button" className="btn btn-ghost" onClick={() => setViewingCccdTenant(null)} style={{ padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <div style={{ marginBottom: 12, fontSize: 13 }}>
                <strong>Số CCCD:</strong> {viewingCccdTenant.cccd || 'Chưa cập nhật'} | <strong>Quê quán:</strong> {viewingCccdTenant.hometown || 'Chưa cập nhật'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Mặt trước</div>
                  {viewingCccdTenant.cccdFrontUrl ? (
                    <img
                      src={getImageUrl(viewingCccdTenant.cccdFrontUrl)}
                      alt="CCCD trước"
                      onClick={() => setLightboxImage(getImageUrl(viewingCccdTenant.cccdFrontUrl))}
                      style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer' }}
                    />
                  ) : <div style={{ height: 160, background: 'rgba(255,255,255,0.02)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Chưa có ảnh</div>}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Mặt sau</div>
                  {viewingCccdTenant.cccdBackUrl ? (
                    <img
                      src={getImageUrl(viewingCccdTenant.cccdBackUrl)}
                      alt="CCCD sau"
                      onClick={() => setLightboxImage(getImageUrl(viewingCccdTenant.cccdBackUrl))}
                      style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer' }}
                    />
                  ) : <div style={{ height: 160, background: 'rgba(255,255,255,0.02)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Chưa có ảnh</div>}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setViewingCccdTenant(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: ĐẶT LẠI MẬT KHẨU KHÁCH THUÊ */}
      {/* ========================================== */}
      {resetModalTenant && (
        <div className="modal-overlay" onClick={() => setResetModalTenant(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, width: '90%' }}>
            <form onSubmit={handleResetPassword}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <KeyRound size={20} className="text-warning" /> Đặt Lại Mật Khẩu Khách Thuê
                </h3>
                <button type="button" className="btn btn-ghost" onClick={() => setResetModalTenant(null)} style={{ padding: 4 }}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ padding: 20 }}>
                <p style={{ fontSize: 13, margin: '0 0 14px' }}>
                  Bạn đang yêu cầu cấp lại mật khẩu cho tài khoản <strong>{resetModalTenant.fullName}</strong> ({resetModalTenant.email}).
                </p>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Mật khẩu mới:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={customNewPass}
                    onChange={(e) => setCustomNewPass(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    required
                    minLength={6}
                  />
                  <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                    Mặc định khuyến nghị: <code>Tenant@2026</code>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setResetModalTenant(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={isResetting}>
                  {isResetting ? 'Đang cập nhật...' : 'Xác nhận đặt lại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Image Preview */}
      {lightboxImage && (
        <ImageLightboxModal imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
};
