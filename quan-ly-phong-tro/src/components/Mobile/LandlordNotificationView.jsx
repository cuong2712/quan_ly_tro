import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, Send, Building2, DoorClosed, Bell,
  Sparkles, RefreshCw, AlertTriangle, CheckCircle2, MessageSquare
} from 'lucide-react';
import { notificationService } from '../../services';

const QUICK_TEMPLATES = [
  {
    label: '💵 Nhắc đóng tiền phòng',
    title: 'Nhắc nhở thanh toán tiền phòng tháng này',
    content: 'Kính gửi các bạn cư dân, kỳ thanh toán tiền phòng và điện nước tháng này đã đến hạn. Vui lòng kiểm tra mục Hóa đơn trên app SmartRent và quét mã VietQR để thanh toán đúng hạn. Xin cảm ơn!'
  },
  {
    label: '⚡ Thông báo cúp điện/nước',
    title: 'Thông báo tạm ngưng cung cấp điện nước để bảo trì',
    content: 'Ban quản lý xin thông báo: Do khu trọ tiến hành bảo dưỡng hệ thống bồn chứa nước và lưới điện định kỳ, khu trọ sẽ tạm cắt nước từ 08:30 đến 11:30 ngày mai. Mong các bạn chủ động trữ nước sinh hoạt.'
  },
  {
    label: '🛡️ Nội quy an ninh & giờ giấc',
    title: 'Nhắc nhở an ninh trật tự và khóa cổng khu trọ',
    content: 'Nhằm đảm bảo an ninh chung cho tất cả cư dân, các bạn vui lòng chú ý đóng khóa cổng cẩn thận sau 23h00, để xe đúng vị trí quy định và không gây ồn ào ảnh hưởng đến các phòng lân cận.'
  },
  {
    label: '🧹 Lịch vệ sinh chung',
    title: 'Lịch tổng vệ sinh hành lang và khu vực để xe',
    content: 'Chủ trọ sẽ tiến hành dọn dẹp vệ sinh tổng thể hành lang các tầng vào sáng Chủ Nhật tuần này. Cư dân vui lòng cất gọn giày dép và tư trang vào trong phòng.'
  }
];

export function LandlordNotificationView({
  zones = [],
  rooms = [],
  isLight = false,
  onBack,
  onSuccess
}) {
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [loading, setLoading] = useState(false);

  // Lọc phòng theo khu
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => !selectedZoneId || r.zoneId === selectedZoneId || r.ZoneId === selectedZoneId);
  }, [rooms, selectedZoneId]);

  // Áp dụng mẫu nhanh
  const applyTemplate = (tpl) => {
    setTitle(tpl.title);
    setContent(tpl.content);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!title.trim() || !content.trim()) {
      return alert('Vui lòng nhập Tiêu đề và Nội dung thông báo');
    }

    setLoading(true);
    try {
      await notificationService.create({
        title: title.trim(),
        content: content.trim(),
        roomId: selectedRoomId || undefined
      });
      alert('✅ Đã gửi thông báo thành công đến cư dân!');
      onSuccess?.();
    } catch (err) {
      alert('Lỗi gửi thông báo: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: isLight ? '#0f172a' : '#f8fafc',
      background: isLight ? '#f8fafc' : '#0b1120'
    }}>
      {/* ── 1. HEADER CHUẨN NATIVE APP (SÁT MÉP TRÊN) ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: isLight ? '#ffffff' : '#0f172a',
        borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
        padding: '10px 14px',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.05)' : '0 4px 14px rgba(0,0,0,0.25)'
      }}>
        <button
          onClick={onBack}
          title="Quay lại"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: 'none',
            background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isLight ? '#334155' : '#e2e8f0',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Send size={17} color="#8b5cf6" /> Soạn & Gửi Thông Báo
          </h2>
          <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>
            Phát thông báo tới ứng dụng điện thoại cư dân
          </div>
        </div>

        <div style={{ width: 36 }} />
      </div>

      {/* ── NỘI DUNG CUỘN CHÍNH ── */}
      <div style={{ padding: '14px 16px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* BƯỚC 1: CHỌN PHẠM VI GỬI */}
        <div style={{
          background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 16,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          <label style={{
            fontSize: '12.5px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#8b5cf6',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <Building2 size={16} /> Bước 1: Chọn Đối Tượng Nhận Tin
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Khu trọ:</label>
              <select
                value={selectedZoneId}
                onChange={e => { setSelectedZoneId(e.target.value); setSelectedRoomId(''); }}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8,
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                  background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                  fontSize: '13px', fontWeight: 700
                }}
              >
                <option value="">Tất cả các khu</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Phòng cụ thể:</label>
              <select
                value={selectedRoomId}
                onChange={e => setSelectedRoomId(e.target.value)}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8,
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                  background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                  fontSize: '13px', fontWeight: 700
                }}
              >
                <option value="">Toàn bộ cư dân trong khu</option>
                {filteredRooms.map(r => (
                  <option key={r.id} value={r.id}>Phòng {r.roomNumber}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* BƯỚC 2: MẪU SOẠN NHANH */}
        <div style={{
          background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 16,
          padding: '14px 16px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: isLight ? '#475569' : '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} color="#8b5cf6" /> Mẫu Soạn Sẵn (1 Chạm Tự Điền):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUICK_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyTemplate(tpl)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: `1px solid ${isLight ? '#ddd6fe' : 'rgba(139,92,246,0.3)'}`,
                  background: isLight ? '#f5f3ff' : 'rgba(139,92,246,0.12)',
                  color: '#8b5cf6',
                  cursor: 'pointer'
                }}
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* BƯỚC 3: TIÊU ĐỀ & NỘI DUNG */}
        <div style={{
          background: isLight ? '#ffffff' : 'rgba(17,24,39,0.85)',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 16,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Tiêu đề thông báo (*):
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Nhắc nhở thanh toán tiền phòng tháng này..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                fontSize: '14px', fontWeight: 700, boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Nội dung thông báo chi tiết (*):
            </label>
            <textarea
              rows={5}
              placeholder="Nhập nội dung thông báo gửi đến điện thoại người thuê..."
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                background: isLight ? '#f8fafc' : '#1f2937', color: isLight ? '#0f172a' : '#fff',
                fontSize: '13px', lineHeight: 1.5, boxSizing: 'border-box', outline: 'none'
              }}
              required
            />
          </div>
        </div>

        {/* XEM TRƯỚC TIN NHẮN TRÊN APP CƯ DÂN */}
        {title && (
          <div style={{
            background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.3)',
            borderRadius: 14,
            padding: '12px 14px',
            border: `1px dashed ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.12)'}`
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#8b5cf6', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MessageSquare size={13} /> Khách thuê sẽ nhận được tin nhắn như sau:
            </div>
            <div style={{
              background: isLight ? '#ffffff' : '#1e293b',
              borderRadius: 10,
              padding: '10px 12px',
              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`
            }}>
              <div style={{ fontWeight: 800, fontSize: '13px', color: '#8b5cf6' }}>🔔 {title}</div>
              <div style={{ fontSize: '12px', marginTop: 4, color: isLight ? '#475569' : '#cbd5e1', whiteSpace: 'pre-line' }}>
                {content}
              </div>
            </div>
          </div>
        )}

        {/* NÚT GỬI THÔNG BÁO */}
        <button
          type="submit"
          disabled={loading || !title.trim() || !content.trim()}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            color: '#fff',
            border: 'none',
            fontWeight: 800,
            fontSize: '15px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
            marginTop: 4
          }}
        >
          {loading ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
          {loading ? 'Đang phát thông báo...' : 'Gửi Thông Báo Tức Thì'}
        </button>
      </form>
      </div>
    </div>
  );
}
