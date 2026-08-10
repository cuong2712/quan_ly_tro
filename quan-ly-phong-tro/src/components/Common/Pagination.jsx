import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ currentPage = 1, totalPages = 1, onPageChange, totalItems = 0, pageSize = 10 }) => {
  if (!totalPages || totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Tính danh sách các trang hiển thị
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
      paddingTop: 16,
      borderTop: '1px solid var(--border-color)',
      flexWrap: 'wrap',
      gap: 12
    }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        {totalItems > 0 ? (
          <>
            Hiển thị <strong style={{ color: 'var(--text-primary)' }}>{startItem} - {endItem}</strong> trên tổng số <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> mục
          </>
        ) : (
          <span>Trang <strong style={{ color: 'var(--text-primary)' }}>{currentPage} / {totalPages}</strong></span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          className="btn btn-sm btn-secondary"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: currentPage <= 1 ? 0.5 : 1 }}
        >
          <ChevronLeft size={15} /> Trước
        </button>

        {pages.map((p, idx) => (
          <React.Fragment key={idx}>
            {p === '...' ? (
              <span style={{ padding: '0 6px', color: 'var(--text-muted)' }}>...</span>
            ) : (
              <button
                className={`btn btn-sm ${currentPage === p ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onPageChange(p)}
                style={{
                  minWidth: 32,
                  height: 32,
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: currentPage === p ? 700 : 500
                }}
              >
                {p}
              </button>
            )}
          </React.Fragment>
        ))}

        <button
          className="btn btn-sm btn-secondary"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: currentPage >= totalPages ? 0.5 : 1 }}
        >
          Sau <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};
