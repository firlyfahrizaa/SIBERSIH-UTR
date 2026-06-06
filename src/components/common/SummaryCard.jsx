/**
 * Komponen SummaryCard untuk dashboard statistics
 * Menampilkan label, value, dan styling berdasarkan type
 */

import React from 'react';

const SummaryCard = ({ label, value, variant = 'default' }) => {
  return (
    <div className={`summary-card ${variant}`}>
      <h4>{label}</h4>
      <h2>{value}</h2>
    </div>
  );
};

export default SummaryCard;
