/**
 * Komponen Table yang reusable
 * Menampilkan data dalam format table dengan columns dan rows fleksibel
 * 
 * Props:
 * - columns: Array of { key: string, label: string, render?: function }
 * - data: Array of objects yang akan ditampilkan
 * - rowClassName?: function(row) => string untuk custom styling
 */

import React from 'react';

const Table = ({ columns, data, rowClassName }) => {
  const getRowClass = (row) => {
    if (typeof rowClassName === 'function') {
      return rowClassName(row);
    }
    return '';
  };

  const renderCell = (column, row) => {
    // Jika column punya custom render function, gunakan itu
    if (column.render) {
      return column.render(row[column.key], row);
    }
    return row[column.key];
  };

  return (
    <div className="table-responsive">
      <table className="tabel-absensi">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={row.id || index} className={getRowClass(row)}>
              {columns.map((column) => (
                <td key={`${row.id || index}-${column.key}`}>
                  {renderCell(column, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
