import React, { useState } from 'react';

/**
 * Reusable Pagination Component
 * Features:
 * - Page size selector (25, 50, 100)
 * - Jump-to-page input
 * - Smart page buttons (1 ... 4 5 [6] 7 8 ... 20)
 * - Items count display
 */
export default function Pagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [25, 50, 100],
    loading = false,
}) {
    const [jumpToPage, setJumpToPage] = useState('');

    // Calculate showing range
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const delta = 2; // Pages to show on each side of current

        if (totalPages <= 7) {
            // Show all pages if 7 or less
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > delta + 2) {
                pages.push('...');
            }

            // Pages around current
            const start = Math.max(2, currentPage - delta);
            const end = Math.min(totalPages - 1, currentPage + delta);

            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }

            if (currentPage < totalPages - delta - 1) {
                pages.push('...');
            }

            // Always show last page
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }

        return pages;
    };

    const handleJumpToPage = (e) => {
        if (e.key === 'Enter') {
            const page = parseInt(jumpToPage, 10);
            if (page >= 1 && page <= totalPages && page !== currentPage) {
                onPageChange(page);
            }
            setJumpToPage('');
        }
    };

    return (
        <div style={styles.container}>
            {/* Items count */}
            <div style={styles.itemsCount}>
                Showing <strong>{startItem}-{endItem}</strong> of <strong>{totalItems}</strong>
            </div>

            {/* Page size selector */}
            <div style={styles.pageSizeWrapper}>
                <span style={styles.label}>Per page:</span>
                <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
                    style={styles.select}
                    disabled={loading}
                >
                    {pageSizeOptions.map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
            </div>

            {/* Navigation controls */}
            <div style={styles.navigation}>
                {/* First & Previous */}
                <button
                    style={{ ...styles.navBtn, ...(currentPage === 1 ? styles.navBtnDisabled : {}) }}
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1 || loading}
                    title="First page"
                >
                    ««
                </button>
                <button
                    style={{ ...styles.navBtn, ...(currentPage === 1 ? styles.navBtnDisabled : {}) }}
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    title="Previous page"
                >
                    «
                </button>

                {/* Page numbers */}
                {getPageNumbers().map((page, idx) => (
                    page === '...' ? (
                        <span key={`ellipsis-${idx}`} style={styles.ellipsis}>...</span>
                    ) : (
                        <button
                            key={page}
                            style={{
                                ...styles.pageBtn,
                                ...(page === currentPage ? styles.pageBtnActive : {}),
                            }}
                            onClick={() => onPageChange(page)}
                            disabled={loading || page === currentPage}
                        >
                            {page}
                        </button>
                    )
                ))}

                {/* Next & Last */}
                <button
                    style={{ ...styles.navBtn, ...(currentPage === totalPages ? styles.navBtnDisabled : {}) }}
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    title="Next page"
                >
                    »
                </button>
                <button
                    style={{ ...styles.navBtn, ...(currentPage === totalPages ? styles.navBtnDisabled : {}) }}
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages || loading}
                    title="Last page"
                >
                    »»
                </button>
            </div>

            {/* Jump to page */}
            <div style={styles.jumpWrapper}>
                <span style={styles.label}>Go to:</span>
                <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpToPage}
                    onChange={(e) => setJumpToPage(e.target.value)}
                    onKeyDown={handleJumpToPage}
                    placeholder="#"
                    style={styles.jumpInput}
                    disabled={loading}
                />
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '16px 0',
        borderTop: '1px solid #e2e8f0',
        marginTop: 16,
    },
    itemsCount: {
        fontSize: '0.85rem',
        color: '#64748b',
    },
    pageSizeWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    },
    label: {
        fontSize: '0.85rem',
        color: '#64748b',
    },
    select: {
        padding: '6px 10px',
        borderRadius: 6,
        border: '1px solid #cbd5e1',
        fontSize: '0.85rem',
        cursor: 'pointer',
    },
    navigation: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    navBtn: {
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        padding: '6px 10px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 600,
        color: '#475569',
        transition: 'all 0.2s',
    },
    navBtnDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
    pageBtn: {
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        padding: '6px 12px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        color: '#475569',
        minWidth: 36,
        transition: 'all 0.2s',
    },
    pageBtnActive: {
        background: '#2563eb',
        color: '#fff',
        border: '1px solid #2563eb',
        fontWeight: 600,
    },
    ellipsis: {
        padding: '0 6px',
        color: '#94a3b8',
    },
    jumpWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    },
    jumpInput: {
        width: 50,
        padding: '6px 8px',
        borderRadius: 6,
        border: '1px solid #cbd5e1',
        fontSize: '0.85rem',
        textAlign: 'center',
    },
};
