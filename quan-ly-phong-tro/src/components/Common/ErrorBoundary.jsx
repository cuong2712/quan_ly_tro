import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: 'var(--bg-card, #1e1e2e)',
          borderRadius: 16,
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          margin: '20px 0'
        }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #fff)', marginBottom: 8 }}>
            {this.props.title || 'Có lỗi xảy ra khi tải dữ liệu'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #a0a0a0)', marginBottom: 20 }}>
            {this.state.error?.message || 'Không thể hiển thị giao diện phần này. Vui lòng thử lại.'}
          </p>
          <button className="btn btn-primary" onClick={this.handleReset} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} /> Thử tải lại phần này
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
