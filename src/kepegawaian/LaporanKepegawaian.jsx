import React, { useState, useEffect } from 'react';
import { Card, TablePagination } from '../components/common';
import { usePagination } from '../hooks/usePagination';
import { supabase } from '../supabaseClient';
import { FaFilePdf, FaBoxOpen, FaEye } from "react-icons/fa";

function LaporanKepegawaian() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, getPaginatedData } = usePagination(5);

  const fetchData = async () => {
    try {
      const { data: rs, error } = await supabase.from('arsip_laporan').select('*').order('created_at', { ascending: false });
      if (rs) setData(rs);
      if (error && error.message.includes('relation "arsip_laporan" does not exist')) {
        alert("Tabel arsip_laporan belum dibentuk di Supabase! Harap minta developer mengeksekusi SQL penciptaan tabelnya.");
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const bukaDokumen = (html) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      alert('Browser memblokir popup! Silakan izinkan popup untuk situs ini, lalu coba lagi.');
    }
  };

  return (
    <div>
      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Dokumen Rekapitulasi SIBERSIH</h2>
          <p>Pusat penerimaan berkas PDF yang diserahkan/diajukan secara administratif oleh Administrator lapangan secara periodik.</p>
        </div>
      </div>

      <Card style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <FaBoxOpen size={24} color="#f59e0b" />
          <h3 style={{ margin: 0 }}>Brankas Dokumen Pengajuan Masuk</h3>
        </div>

        {loading ? <p>Memuat data...</p> : (
          <div className="table-responsive">
            <table className="tabel-absensi" style={{ minWidth: '800px' }}>
              <thead>
                <tr>
                  <th>Waktu Pengajuan</th>
                  <th>Kategori Laporan</th>
                  <th>Informasi Snapshot Terapan</th>
                  <th style={{ textAlign: 'center' }}>Aksi Arsip</th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedData(data).length > 0 ? getPaginatedData(data).map(d => {
                  const dt = new Date(d.created_at);
                  const p = v => String(v).padStart(2, '0');
                  const tStr = d.created_at ? `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${String(dt.getFullYear()).slice(-2)} / ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}` : '-';

                  return (
                    <tr key={d.id_arsip || Math.random()}>
                      <td><span style={{ fontWeight: 'bold' }}>{tStr}</span></td>
                      <td>
                        <span className={`badge ${d.jenis_laporan === 'Absensi' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '13px' }}>
                          {d.jenis_laporan}
                        </span>
                      </td>
                      <td>{d.keterangan_periode}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => bukaDokumen(d.html_content)} style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', margin: '0 auto', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                          <FaEye /> Lihat PDF
                        </button>
                      </td>
                    </tr>
                  )
                }) : <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Belum ada pengajuan arsip terkini dari sistem Admin untuk Anda tinjau.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {!loading && data.length > 0 && (
          <TablePagination 
            totalItems={data.length} 
            itemsPerPage={itemsPerPage} 
            currentPage={currentPage} 
            onPageChange={setCurrentPage} 
            onItemsPerPageChange={setItemsPerPage} 
          />
        )}
      </Card>
    </div>
  );
}

export default LaporanKepegawaian;
