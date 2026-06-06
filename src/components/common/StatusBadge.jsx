/**
 * Komponen untuk menampilkan status badge
 * Styling otomatis berdasarkan status
 */

import React from 'react';

const StatusBadge = ({ status }) => {
  const getStatusStyle = (status) => {
    if (status === 'Selesai' || status === 'Hadir') {
      return 'badge-success';
    }
    if (status === 'Menunggu Perbaikan' || status === 'Belum Hadir') {
      return 'badge-warning';
    }
    return 'badge-default';
  };

  return (
    <span className={`badge ${getStatusStyle(status)}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
