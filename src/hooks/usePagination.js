import { useState } from 'react';

export function usePagination(initialItemsPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const getPaginatedData = (dataArray) => {
    // Pastikan dataArray adalah array sejati
    if (!Array.isArray(dataArray)) return [];

    const isAll = itemsPerPage === 'Semua';
    // Jika semua, limit sepanjang array, jika tidak gunakan itemsPerPage
    const limit = isAll ? dataArray.length : parseInt(itemsPerPage);
    
    // Cegah limit <= 0
    if (limit <= 0) return dataArray;

    const totalPages = isAll ? 1 : Math.ceil(dataArray.length / limit);
    // Boundary check jika data berubah tiba-tiba (misal sedang di page 3 tapi data dihapus semua)
    const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
    
    // Jangan ubah state dalam render phase secara langsung (React Warning), return value saja
    if (safePage !== currentPage && totalPages > 0) {
      // Kita kembalikan nilai yang telah disesuaikan agar komponen yg manggil bisa merender data yg benar
      // Tapi kita biarkan useEffect di komponennya yang reset page
    }

    const indexOfLastItem = safePage * limit;
    const indexOfFirstItem = indexOfLastItem - limit;
    const currentData = dataArray.slice(indexOfFirstItem, indexOfLastItem);

    return currentData;
  };

  return {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    getPaginatedData
  };
}
