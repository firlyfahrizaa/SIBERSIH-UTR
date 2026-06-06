import React, { useState, useEffect } from 'react';
import { Card, TablePagination } from '../components/common';
import { usePagination } from '../hooks/usePagination';
import { supabase } from '../supabaseClient';
import { FaUserCheck, FaTasks, FaTimes, FaCheck } from 'react-icons/fa';

function Absensi() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, getPaginatedData } = usePagination(5);

  const fetchAbsensi = async () => {
    setLoading(true);

    // Hanya ambil absensi HARI INI
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data: absData } = await supabase
      .from('absensi')
      .select('*')
      .gte('waktu', startOfToday.toISOString())
      .order('waktu', { ascending: false });

    // Ambil semua petugas (role = Petugas)
    const { data: pData } = await supabase
      .from('pengguna')
      .select('nip, nama, role')
      .eq('role', 'Petugas');

    const { data: tbData } = await supabase.from('pembagian_tugas').select('nip_petugas, id_tempat');
    const { data: tData } = await supabase.from('tempat').select('id_tempat, nama_gedung');

    const petugasList = pData || [];
    const absensiHariIni = absData || [];

    // Gabungkan: petugas yang sudah absen + yang belum (Alfa)
    const combinedData = petugasList.map(petugas => {
      const absensi = absensiHariIni.find(ab => String(ab.nip_petugas) === String(petugas.nip));
      const tg = (tbData || []).find(t => String(t.nip_petugas) === String(petugas.nip));
      const lk = tg ? (tData || []).find(tm => tm.id_tempat === tg.id_tempat) : null;

      if (absensi) {
        // Petugas SUDAH absen hari ini
        return {
          ...absensi,
          nama_petugas: petugas.nama,
          nip_display: petugas.nip,
          nama_gedung: lk ? lk.nama_gedung : 'Belum Di-Plot',
          isAlfa: false,
        };
      } else {
        // Petugas BELUM absen = Alfa
        return {
          id_absensi: `alfa-${petugas.nip}`,
          nip_petugas: petugas.nip,
          nama_petugas: petugas.nama,
          nip_display: petugas.nip,
          nama_gedung: lk ? lk.nama_gedung : 'Belum Di-Plot',
          waktu: null,
          foto_url: null,
          deskripsi: null,
          status: 'Alfa',
          isAlfa: true,
        };
      }
    });

    // Urutkan: yang sudah absen (menunggu verifikasi) di atas, Alfa di bawah
    combinedData.sort((a, b) => {
      if (a.isAlfa && !b.isAlfa) return 1;
      if (!a.isAlfa && b.isAlfa) return -1;
      return 0;
    });

    setData(combinedData);
    setLoading(false);
  };

  useEffect(() => {
    fetchAbsensi();
  }, []);

  const verifikasiKehadiran = async (id, putusan) => {
    if (!window.confirm(`Yakin memberikan status "${putusan}" pada baris absensi ini?`)) return;
    try {
      await supabase.from('absensi').update({ status: putusan }).eq('id_absensi', id);
      fetchAbsensi();
    } catch (e) {
      alert('Error DB: ' + e.message);
    }
  };

  const currentData = getPaginatedData(data);

  return (
    <Card>
      <div className="flex-center-gap mb-10">
        <FaUserCheck size={26} color="#3b82f6" />
        <h3 className="m-0">Verifikasi Kehadiran & Operasional</h3>
      </div>
      <p className="card-description mb-20" style={{ lineHeight: 1.6 }}>Verifikasi tanda tangan digital yang dikirim Petugas dari Lapangan. Petugas yang belum mengirim absensi hari ini otomatis berstatus <b className="text-red">Alfa</b>.</p>

      {loading ? (
        <div className="loading-state-text">Menyinkronisasi absensi...</div>
      ) : (
        <div className="table-responsive">
          <table className="tabel-absensi" style={{ minWidth: '1000px' }}>
            <thead>
              <tr>
                <th>Waktu & Tanggal Absensi</th>
                <th>Nama Petugas (NIP)</th>
                <th>Lokasi Tugas</th>
                <th>Tanda Tangan</th>
                <th>Log Laporan Pekerjaan (Checklist)</th>
                <th>Status</th>
                <th className="text-center">Validasi Admin</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length > 0 ? (
                currentData.map((row) => (
                  <tr key={row.id_absensi} className={row.isAlfa ? 'bg-red-light' : ''} style={{ opacity: row.isAlfa ? 0.65 : 1 }}>
                    <td>
                      {row.waktu ? (() => {
                        const d = new Date(row.waktu);
                        const p = v => String(v).padStart(2, '0');
                        return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}/${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
                      })() : <span className="text-red-bold text-xs">— Tidak hadir —</span>}
                    </td>
                    <td className="fw-semibold">{row.nama_petugas}</td>
                    <td>{row.nama_gedung}</td>

                    <td className="text-center">
                      {row.isAlfa ? (
                        <span className="text-red text-xs">—</span>
                      ) : row.foto_url && row.foto_url.startsWith('data:image') ? (
                        <div className="signature-container">
                          <img src={row.foto_url} alt="Signature" className="signature-img" />
                        </div>
                      ) : (
                        <span className="text-red text-xs">TTD Tidak Terbaca</span>
                      )}
                    </td>

                    <td className="desc-cell">
                      {row.isAlfa ? (
                        <span className="text-red text-sm">Tidak ada laporan</span>
                      ) : row.deskripsi && row.deskripsi.includes('Tuntas') ? (
                        <span className="text-green-bold text-sm" style={{ display: 'block' }}><FaTasks /> {row.deskripsi}</span>
                      ) : (
                        <span className="text-orange text-sm" style={{ display: 'block' }}>{row.deskripsi || 'Sistem belum diset / masih di lokasi...'}</span>
                      )}
                    </td>

                    <td>
                      <span className={`badge ${row.status === 'Terverifikasi' ? 'badge-success' : row.status === 'Ditolak' || row.status === 'Alfa' ? 'badge-danger' : 'badge-warning'}`}>
                        {row.status || 'Menunggu Verifikasi'}
                      </span>
                    </td>

                    <td className="text-center" style={{ minWidth: '150px' }}>
                      {row.isAlfa ? (
                        <span className="text-red-bold text-xs">Otomatis Alfa</span>
                      ) : row.status === 'Menunggu Verifikasi' || !row.status ? (
                        <div className="flex-center-gap-5">
                          <button onClick={() => verifikasiKehadiran(row.id_absensi, 'Terverifikasi')} className="btn-valid-sah">
                            Sah <FaCheck size={10} />
                          </button>
                          <button onClick={() => verifikasiKehadiran(row.id_absensi, 'Ditolak')} className="btn-valid-tolak">
                            Tolak <FaTimes size={10} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-light text-xs">Sudah Valid</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state-text">Belum ada petugas terdaftar di sistem</td>
                </tr>
              )}
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
  );
}

export default Absensi;