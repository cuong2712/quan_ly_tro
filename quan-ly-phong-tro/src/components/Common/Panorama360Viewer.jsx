import React, { useEffect, useRef, useState } from 'react';
import { RotateCw, Maximize2, Compass, Eye, Sparkles } from 'lucide-react';

/**
 * Panorama360Viewer - Component hiển thị ảnh toàn cảnh 360 độ (Cam 360 / Virtual Tour)
 * Sử dụng thư viện WebGL Pannellum được lưu trữ cục bộ trong public/lib/pannellum/
 */
export const Panorama360Viewer = ({
  imageUrl,
  title = 'Toàn cảnh phòng 360°',
  height = '500px',
  autoRotateSpeed = -2,
  className = '',
}) => {
  const containerRef = useRef(null);
  const viewerInstanceRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const viewerId = useRef(`panorama-viewer-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    let scriptEl = document.getElementById('pannellum-script');
    let linkEl = document.getElementById('pannellum-css');

    // 1. Nạp CSS Pannellum nếu chưa có
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.id = 'pannellum-css';
      linkEl.rel = 'stylesheet';
      linkEl.href = '/lib/pannellum/pannellum.css';
      document.head.appendChild(linkEl);
    }

    const initViewer = () => {
      if (!window.pannellum || !containerRef.current) return;

      try {
        // Hủy viewer cũ nếu đã khởi tạo
        if (viewerInstanceRef.current) {
          try {
            viewerInstanceRef.current.destroy();
          } catch {
            // ignore
          }
        }

        viewerInstanceRef.current = window.pannellum.viewer(viewerId.current, {
          type: 'equirectangular',
          panorama: imageUrl,
          autoLoad: true,
          autoRotate: autoRotateSpeed,
          autoRotateInactivityDelay: 3000,
          compass: false,
          showZoomCtrl: true,
          showFullscreenCtrl: true,
          mouseZoom: true,
          hfov: 100,
          minHfov: 50,
          maxHfov: 120,
          crossOrigin: 'anonymous',
          strings: {
            loadingLabel: 'Đang tải toàn cảnh 360°...',
            loadButtonLabel: 'Nhấn để xem 360°',
            genericError: 'Không thể tải ảnh toàn cảnh 360°',
          },
        });

        viewerInstanceRef.current.on('load', () => {
          setIsLoaded(true);
          setLoadError(null);
        });

        viewerInstanceRef.current.on('error', (err) => {
          console.warn('Pannellum load warning:', err);
          setIsLoaded(true); // Vẫn cho hiển thị
        });
      } catch (err) {
        console.error('Error initializing Pannellum:', err);
        setLoadError(err.message || 'Lỗi khởi tạo trình xem 360°');
      }
    };

    // 2. Nạp JS Pannellum
    if (!window.pannellum) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'pannellum-script';
        scriptEl.src = '/lib/pannellum/pannellum.js';
        scriptEl.onload = () => initViewer();
        scriptEl.onerror = () => {
          // Fallback sang CDN nếu file local bị thiếu
          const cdnScript = document.createElement('script');
          cdnScript.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
          cdnScript.onload = () => initViewer();
          cdnScript.onerror = () => setLoadError('Không thể tải thư viện Cam 360°');
          document.body.appendChild(cdnScript);
        };
        document.body.appendChild(scriptEl);
      } else {
        scriptEl.addEventListener('load', initViewer);
      }
    } else {
      initViewer();
    }

    return () => {
      if (viewerInstanceRef.current) {
        try {
          viewerInstanceRef.current.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [imageUrl, autoRotateSpeed]);

  const toggleAutoRotate = () => {
    if (viewerInstanceRef.current) {
      if (isRotating) {
        viewerInstanceRef.current.stopAutoRotate();
        setIsRotating(false);
      } else {
        viewerInstanceRef.current.startAutoRotate(autoRotateSpeed);
        setIsRotating(true);
      }
    }
  };

  const handleFullscreen = () => {
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.toggleFullscreen();
    }
  };

  return (
    <div
      className={`panorama-360-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: height,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        background: '#0f172a',
      }}
    >
      {/* Container chính nạp WebGL Canvas */}
      <div
        id={viewerId.current}
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Huy hiệu Badge Cam 360° góc trên */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '8px 14px',
          borderRadius: '30px',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 600,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 10px #10b981',
          }}
        />
        <Sparkles size={15} color="#38bdf8" />
        <span>Trải nghiệm Cam 360° Virtual Tour</span>
      </div>

      {/* Hướng dẫn tương tác */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          padding: '6px 14px',
          borderRadius: '20px',
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: '12px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          pointerEvents: 'none',
        }}
      >
        <RotateCw size={13} style={{ animation: 'spin 4s linear infinite' }} />
        <span>Kéo chuột hoặc vuốt để xoay toàn cảnh phòng</span>
      </div>

      {/* Floating Action Controls */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          onClick={toggleAutoRotate}
          title={isRotating ? 'Dừng tự động xoay' : 'Bật tự động xoay'}
          style={{
            background: isRotating ? 'rgba(59, 130, 246, 0.85)' : 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '12.5px',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          <RotateCw size={14} />
          <span>{isRotating ? 'Đang xoay' : 'Xoay'}</span>
        </button>

        <button
          onClick={handleFullscreen}
          title="Toàn màn hình"
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            padding: '8px 10px',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Maximize2 size={15} />
        </button>
      </div>

      {loadError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1e293b',
            color: '#94a3b8',
            padding: 20,
            textAlign: 'center',
          }}
        >
          <Eye size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>Chưa có ảnh Cam 360°</p>
          <p style={{ fontSize: '13px' }}>Chủ trọ chưa tải lên ảnh toàn cảnh cho phòng này.</p>
        </div>
      )}
    </div>
  );
};

export default Panorama360Viewer;
