import React from 'react';

/**
 * Komponen Pagination Serbaguna untuk Tabel
 * Mendukung interaktif "Tampilkan X entry" dan "Sebelumnya/Selanjutnya"
 */
function TablePagination({ 
  totalItems, 
  itemsPerPage, 
  currentPage, 
  onPageChange, 
  onItemsPerPageChange 
}) {
  const isAll = itemsPerPage === 'Semua';
  const totalPages = isAll ? 1 : Math.ceil(totalItems / itemsPerPage);

  // Jika tidak ada data, jangan tampilkan pagination
  if (totalItems === 0) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '15px' }}>
      
      {/* Dropdown "Show Entities" */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '14px', color: '#64748b' }}>Tampilkan</span>
        <select 
          value={itemsPerPage} 
          onChange={(e) => {
            onItemsPerPageChange(e.target.value === 'Semua' ? 'Semua' : parseInt(e.target.value));
            onPageChange(1); // Reset page saat merubah limit
          }}
          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: 'white', cursor: 'pointer' }}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value="Semua">Semua baris</option>
        </select>
        <span style={{ fontSize: '14px', color: '#64748b' }}>entri (dari {totalItems} total data)</span>
      </div>

      {/* Tombol Navigasi Halaman */}
      {!isAll && totalPages > 1 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === 1 ? '#f1f5f9' : 'white', color: currentPage === 1 ? '#94a3b8' : '#475569', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 500, transition: 'all 0.2s' }}
          >
            Sebelumnya
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => {
            // Logika Truncate: Tampilkan halaman 1, terakhir, dan ±1 dari currentPage
            if (number === 1 || number === totalPages || (number >= currentPage - 1 && number <= currentPage + 1)) {
              return (
                <button
                  key={number}
                  onClick={() => onPageChange(number)}
                  style={{ 
                    padding: '6px 12px', 
                    border: 'none', 
                    borderRadius: '6px', 
                    background: currentPage === number ? '#3b82f6' : 'white', 
                    color: currentPage === number ? 'white' : '#475569', 
                    cursor: 'pointer', 
                    fontWeight: currentPage === number ? 'bold' : 'normal', 
                    boxShadow: currentPage === number ? '0 2px 4px rgba(59, 130, 246, 0.3)' : 'inset 0 0 0 1px #cbd5e1',
                    transition: 'all 0.2s'
                  }}
                >
                  {number}
                </button>
              );
            }
            if (number === currentPage - 2 || number === currentPage + 2) {
              return <span key={number} style={{ padding: '6px 4px', color: '#94a3b8' }}>...</span>;
            }
            return null;
          })}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === totalPages ? '#f1f5f9' : 'white', color: currentPage === totalPages ? '#94a3b8' : '#475569', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 500, transition: 'all 0.2s' }}
          >
            Selanjutnya
          </button>
        </div>
      )}
    </div>
  );
}

export default TablePagination;
