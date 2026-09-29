import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, Compass, Eye, Sparkles, Search, Filter,
  Building2, Camera, ExternalLink, Check, Copy, AlertCircle,
  CheckCircle2, DollarSign, Home, Image as ImageIcon
} from 'lucide-react';
import { roomService, zoneService } from '../../services';
import { formatVND } from '../../utils/formatters';
import { RoomMediaStudioModal } from './RoomMediaStudioModal';

export const RoomShowcaseMgmt = () => {
  const [zones, setZones] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedZoneId, setSelectedZoneId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mediaFilter, setMediaFilter] = useState('all'); // 'all' | 'has360' | 'no360'
  const [searchTerm, setSearchTerm] = useState('');

  // Selected room for Studio modal
  const [selectedRoomForStudio, setSelectedRoomForStudio] = useState(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);

  // Tải dữ liệu toàn bộ khu trọ & phòng của chủ trọ
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const zonesRes = await zoneService.getZones();
      const zoneList = Array.isArray(zonesRes) ? zonesRes : (zonesRes?.data || []);
      setZones(zoneList);

      // Lấy tất cả phòng từ các khu trọ
      const allRooms = [];
      for (const z of zoneList) {
        try {
          const rRes = await roomService.getRooms(z.id);
          const rList = Array.isArray(rRes) ? rRes : (rRes?.data || []);
          rList.forEach(r => {
            allRooms.push({ ...r, zoneName: z.name, zoneAddress: z.address });
          });
        } catch {
          // ignore single zone error
        }
      }
      setRooms(allRooms);
    } catch (err) {
      console.error('Lỗi tải danh sách quảng bá phòng:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle nhanh trạng thái công khai
  const handleTogglePublic = async (room, e) => {
    e.stopPropagation();
    const newIsPublic = !(room.isPublic ?? true);
    try {
      await roomService.updateRoom(room.id, {
        ...room,
        isPublic: newIsPublic
      });
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, isPublic: newIsPublic } : r));
    } catch (err) {
      alert('❌ Không thể đổi trạng thái công khai: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenStudio = (room, e) => {
    if (e) e.stopPropagation();
    setSelectedRoomForStudio(room);
    setIsStudioOpen(true);
  };

  const handleStudioSaved = (updatedRoom) => {
    setRooms(prev => prev.map(r => r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r));
  };

  // Tính toán thống kê
  const totalRooms = rooms.length;
  const publicRoomsCount = rooms.filter(r => r.isPublic ?? true).length;
  const has360RoomsCount = rooms.filter(r => !!r.panorama360Url).length;
  const depositRoomsCount = rooms.filter(r => r.status === 'Deposit' || (r.depositAmount > 0)).length;

  // Lọc phòng
  const filteredRooms = rooms.filter(r => {
    const matchZone = selectedZoneId === 'all' || r.zoneId === selectedZoneId;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchMedia = mediaFilter === 'all' ||
      (mediaFilter === 'has360' && !!r.panorama360Url) ||
      (mediaFilter === 'no360' && !r.panorama360Url);
    const matchSearch = (r.roomNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.zoneName || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchZone && matchStatus && matchMedia && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header & Banner */}
      <div className="card" style={{
        padding: '24px', borderRadius: '18px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.10))',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
            }}>
              <Globe size={22} />
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              Quảng Bá & Tour 360° Phòng Trọ
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 680, lineHeight: 1.5 }}>
            Tự do thêm ảnh 360° không gian thực tế, thư viện ảnh phòng và thiết lập số tiền nhận cọc VietQR trực tuyến. Khách thuê có thể tham quan thực tế và đặt cọc ngay trên Cổng tìm phòng SmartRent.
          </p>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontWeight: 700 }}
        >
          <ExternalLink size={16} /> Mở Cổng Tìm Phòng Công Khai
        </a>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6 }}>TỔNG SỐ PHÒNG</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{totalRooms}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Trên tất cả khu trọ của bạn</div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Globe size={15} /> ĐANG CÔNG KHAI
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#10b981' }}>{publicRoomsCount}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Hiển thị trên Cổng tìm phòng</div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Compass size={15} /> ĐÃ CÓ TOUR 360°
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#6366f1' }}>{has360RoomsCount}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Đạt chuẩn tham quan không gian thực tế</div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={15} /> PHÒNG ĐÃ CỌC
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#f59e0b' }}>{depositRoomsCount}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Khách đã cọc giữ chỗ trực tuyến</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{
        padding: '16px 20px', borderRadius: 14, background: 'var(--bg-card)',
        border: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 200 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Tìm theo số phòng, khu trọ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 36, fontSize: 13 }}
          />
        </div>

        {/* Khu trọ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Building2 size={16} color="var(--text-secondary)" />
          <select
            className="form-control"
            value={selectedZoneId}
            onChange={e => setSelectedZoneId(e.target.value)}
            style={{ fontSize: 13, padding: '7px 12px', minWidth: 150 }}
          >
            <option value="all">Tất cả khu trọ</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>

        {/* Trạng thái phòng */}
        <select
          className="form-control"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ fontSize: 13, padding: '7px 12px', minWidth: 130 }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Vacant">Còn trống</option>
          <option value="Deposit">Đã cọc</option>
          <option value="Occupied">Đang thuê</option>
        </select>

        {/* Media 360 */}
        <select
          className="form-control"
          value={mediaFilter}
          onChange={e => setMediaFilter(e.target.value)}
          style={{ fontSize: 13, padding: '7px 12px', minWidth: 140 }}
        >
          <option value="all">Tất cả phòng</option>
          <option value="has360">Đã có Tour 360°</option>
          <option value="no360">Chưa có ảnh 360°</option>
        </select>
      </div>

      {/* Room Showcase Grid */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
          Đang tải danh sách phòng...
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="card" style={{ padding: '50px 20px', textAlign: 'center', borderRadius: 14, color: 'var(--text-muted)' }}>
          <Home size={40} style={{ opacity: 0.3, margin: '0 auto 12px auto' }} />
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Không tìm thấy phòng trọ nào phù hợp bộ lọc.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20
        }}>
          {filteredRooms.map(room => {
            const isPublic = room.isPublic ?? true;
            const has360 = !!room.panorama360Url;

            // Phân tích số ảnh
            let photoCount = 0;
            if (Array.isArray(room.images)) photoCount = room.images.length;
            else if (typeof room.images === 'string' && room.images.trim()) {
              try { photoCount = JSON.parse(room.images).length; } catch { photoCount = 1; }
            }

            return (
              <div
                key={room.id}
                className="card"
                style={{
                  borderRadius: 16, overflow: 'hidden',
                  border: isPublic ? '1.5px solid rgba(99, 102, 241, 0.35)' : '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-card)', transition: 'all 0.25s'
                }}
              >
                {/* Image Cover Preview */}
                <div style={{
                  height: 160, width: '100%', position: 'relative',
                  background: 'var(--bg-dark)', overflow: 'hidden'
                }}>
                  <img
                    src={room.panorama360Url || '/sample_room_360.jpg'}
                    alt={`Phòng ${room.roomNumber}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  {/* Gradient Overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)'
                  }} />

                  {/* Top Badges */}
                  <div style={{
                    position: 'absolute', top: 12, left: 12, right: 12,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    {/* Status Badge */}
                    <span style={{
                      padding: '4px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                      background: room.status === 'Vacant' ? 'rgba(16, 185, 129, 0.9)' :
                        room.status === 'Deposit' ? 'rgba(245, 158, 11, 0.9)' : 'rgba(99, 102, 241, 0.9)',
                      color: '#fff', backdropFilter: 'blur(4px)'
                    }}>
                      {room.status === 'Vacant' ? 'Còn trống' : room.status === 'Deposit' ? 'Đã cọc' : 'Đang thuê'}
                    </span>

                    {/* 360 Badge */}
                    {has360 ? (
                      <span style={{
                        padding: '4px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff', display: 'flex', alignItems: 'center', gap: 4,
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.5)'
                      }}>
                        <Compass size={13} /> Tour 360°
                      </span>
                    ) : (
                      <span style={{
                        padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                        background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)'
                      }}>
                        Chưa có 360°
                      </span>
                    )}
                  </div>

                  {/* Bottom info on Image */}
                  <div style={{
                    position: 'absolute', bottom: 10, left: 12, right: 12,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', color: '#fff'
                  }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>Phòng {room.roomNumber}</div>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>{room.zoneName} • Tầng {room.floor}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>{formatVND(room.price)}</div>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Public Toggle Switch */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: 10, background: 'var(--bg-dark)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: isPublic ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Globe size={14} /> {isPublic ? 'Đang công khai' : 'Đang ẩn'}
                    </span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={e => handleTogglePublic(room, e)}
                        style={{ width: 18, height: 18, accentColor: '#10b981', cursor: 'pointer' }}
                      />
                    </label>
                  </div>

                  {/* Media Status Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    <span>Ảnh thực tế: <strong>{photoCount} ảnh</strong></span>
                    <span>Cọc VietQR: <strong style={{ color: '#f59e0b' }}>{formatVND(room.depositAmount || 500000)}</strong></span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div style={{
                  padding: '12px 16px', borderTop: '1px solid var(--border-color)',
                  background: 'var(--bg-dark)', display: 'flex', gap: 8
                }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={e => handleOpenStudio(room, e)}
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700, borderRadius: 8 }}
                  >
                    <Camera size={15} /> Studio 360° & Ảnh
                  </button>

                  <a
                    href={`/phong/${room.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
                    title="Mở xem trang giới thiệu công khai"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Room Studio Modal */}
      {isStudioOpen && selectedRoomForStudio && (
        <RoomMediaStudioModal
          isOpen={isStudioOpen}
          room={selectedRoomForStudio}
          onClose={() => setIsStudioOpen(false)}
          onSaved={handleStudioSaved}
        />
      )}

    </div>
  );
};
