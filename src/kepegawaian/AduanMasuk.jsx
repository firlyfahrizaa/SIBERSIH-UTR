import React, { useState, useEffect } from 'react';
import { Card, TablePagination } from '../components/common';
import { usePagination } from '../hooks/usePagination';
import { supabase } from '../supabaseClient';
import { FaExclamationTriangle, FaBan, FaTimes } from 'react-icons/fa';

function AduanMasuk() {
  const [data, setData] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [modalPage, setModalPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, getPaginatedData } = usePagination(5);

  const fetchData = async () => {
    // Hanya tangkap aduan yang sudah diloloskan Admin atau yang sudah diselesaikan
    const { data: aduan } = await supabase.from('pengaduan').select('*').in('status', ['Diteruskan', 'Selesai']);
    const { data: pengguna } = await supabase.from('pengguna').select('nip, nama');

    const sortedAduan = (aduan || []).reverse();

    const combined = sortedAduan.map(ad => {
      const p = (pengguna || []).find(x => String(x.nip) === String(ad.nip_petugas));
      return { ...ad, nama_petugas: p ? p.nama : ad.nip_petugas };
    });
    setData(combined);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tanggapiAduan = async (id_pengaduan) => {
    if (!window.confirm("Beri sinyal 'Selesai' bahwa kerusakan / keluhan ini telah diperbaiki di lapangan?")) return;
    try {
      await supabase.from('pengaduan').update({ status: 'Selesai' }).eq('id_pengaduan', id_pengaduan);
      fetchData();
    } catch (err) {
      alert("Error Database: " + err.message);
    }
  };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <FaExclamationTriangle size={24} color="#f59e0b" />
        <h3 style={{ margin: 0 }}>Tindak Lanjut Laporan Aduan Lapangan</h3>
      </div>
      <p style={{ color: '#64748b', marginBottom: '25px', lineHeight: 1.6 }}>Halaman ini diotorisasi penuh kepada Kepegawaian untuk mengevaluasi komplain lapangan dari Petugas dan merealisasikan penyelesaian fisiknya (Contoh: Menghubungi logistik penggantian alat). Jika proses reparasi sudah dilakukan, silakan eksekusi tombol <b>Tandai Selesai</b>.</p>

      {loading ? <p>Memuat Aduan...</p> : (
        <div className="table-responsive">
          <table className="tabel-absensi" style={{ minWidth: '800px' }}>
            <thead>
              <tr>
                <th>Waktu Pengajuan</th>
                <th>Pengirim</th>
                <th>Lampiran Foto</th>
                <th>Detail Pesan</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedData(data).length > 0 ? getPaginatedData(data).map((d) => (
                <tr key={d.id_pengaduan || Math.random()}>
                  <td>
                    {d.tanggal ? (() => {
                      const dt = new Date(d.tanggal);
                      const p = v => String(v).padStart(2, '0');
                      return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${String(dt.getFullYear()).slice(-2)}/${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
                    })() : '-'}
                  </td>
                  <td style={{ fontWeight: 'bold' }}>{d.nama_petugas}</td>

                  <td style={{ textAlign: 'center' }}>
                    {d.foto_url ? (
                      <button onClick={() => { setSelectedPhotos(d.foto_url.split(',')); setModalPage(1); }} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                        Detail ({d.foto_url.split(',').length} Foto)
                      </button>
                    ) : <span style={{ color: '#94a3b8', fontSize: '12px' }}>Tanpa Foto</span>}
                  </td>

                  <td style={{ minWidth: '150px' }}>
                    <button onClick={() => setSelectedText(d.deskripsi)} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                      Detail Pesan ➚
                    </button>
                  </td>
                  <td>
                    <span className={`badge ${d.status === 'Selesai' ? 'badge-success' : 'badge-info'}`}>
                      {d.status || 'Diteruskan'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', minWidth: '120px' }}>
                    {d.status !== 'Selesai' ? (
                      <button onClick={() => tanggapiAduan(d.id_pengaduan)} style={{ background: '#f59e0b', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)' }}>
                        Tandai Selesai
                      </button>
                    ) : (
                      <FaBan color="#cbd5e1" title="Sudah Selesai Ditangani" size={20} />
                    )}
                  </td>
                </tr>
              )) : <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>-</td></tr>}
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

      {selectedPhotos && (
        <div className="modal-overlay" onClick={() => setSelectedPhotos(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>Lampiran Foto Aduan</h3>
              <button onClick={() => setSelectedPhotos(null)} className="modal-close-btn"><FaTimes size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {selectedPhotos.slice((modalPage - 1) * 5, modalPage * 5).map((url, i) => {
                const actualIndex = (modalPage - 1) * 5 + i + 1;
                return (
                  <div key={actualIndex} style={{ padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                    <span style={{ fontWeight: 'bold', color: '#334155' }}>Foto Lampiran ${actualIndex}</span>
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>Lihat Foto ➚</a>
                  </div>
                )
              })}

              {selectedPhotos.length > 5 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', alignItems: 'center' }}>
                  <button disabled={modalPage === 1} onClick={() => setModalPage(p => p - 1)} style={{ padding: '6px 12px', background: modalPage === 1 ? '#e2e8f0' : '#8b5cf6', color: modalPage === 1 ? '#94a3b8' : 'white', border: 'none', borderRadius: '4px', cursor: modalPage === 1 ? 'not-allowed' : 'pointer' }}>Sebelah Kiri</button>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>Hal. {modalPage} / {Math.ceil(selectedPhotos.length / 5)}</span>
                  <button disabled={modalPage === Math.ceil(selectedPhotos.length / 5)} onClick={() => setModalPage(p => p + 1)} style={{ padding: '6px 12px', background: modalPage === Math.ceil(selectedPhotos.length / 5) ? '#e2e8f0' : '#8b5cf6', color: modalPage === Math.ceil(selectedPhotos.length / 5) ? '#94a3b8' : 'white', border: 'none', borderRadius: '4px', cursor: modalPage === Math.ceil(selectedPhotos.length / 5) ? 'not-allowed' : 'pointer' }}>Sebelah Kanan</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    
      {selectedText && (
        <div className="modal-overlay" onClick={() => setSelectedText(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>Detail Keterangan Aduan</h3>
              <button onClick={() => setSelectedText(null)} className="modal-close-btn"><FaTimes size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ lineHeight: 1.6, color: '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>{selectedText}</p>
            </div>
          </div>
        </div>
      )}
</Card>
  );
}
export default AduanMasuk;
