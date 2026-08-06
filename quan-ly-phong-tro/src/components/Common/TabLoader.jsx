/**
 * LoadingSpinner - Hiện khi đang load dữ liệu cho tab
 */
import React from 'react';

export const TabLoader = ({ message = 'Đang tải dữ liệu...' }) => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: '300px', gap: '16px'
  }}>
    <div className="tab-spinner" />
    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{message}</p>
    <style>{`
      .tab-spinner {
        width: 40px; height: 40px;
        border: 3px solid var(--border-color);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  </div>
);

export const TabError = ({ message, onRetry }) => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: '300px', gap: '12px'
  }}>
    <div style={{ fontSize: '48px' }}>⚠️</div>
    <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>Lỗi tải dữ liệu</p>
    <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', maxWidth: '400px' }}>{message}</p>
    {onRetry && (
      <button className="btn btn-primary" onClick={onRetry}>Thử lại</button>
    )}
  </div>
);
