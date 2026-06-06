/**
 * Komponen Card yang reusable
 * Digunakan untuk membungkus konten utama
 */

import React from 'react';

const Card = ({ children, className = '' }) => {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
};

export default Card;
