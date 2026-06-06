import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, TablePagination } from '../components/common';
import { AbsensiService } from '../services/AbsensiService';
import { PenggunaService } from '../services/PenggunaService';
import { FaHistory, FaPenNib, FaCheckCircle, FaCalendarDay } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

function AbsensiPetugas() {
  const [data, setData] = useState([]);
  const [totalData, setTotalData] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [sudahAbsen, setSudahAbsen] = useState(false);

  // Server-side pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Canvas Ref
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Ambil Profil jika belum ada
      let currentProf = profile;
      if (!currentProf) {
        currentProf = await PenggunaService.getCurrentUserProfile();
        if (!currentProf) return setLoading(false);
        setProfile(currentProf);
      }

      // Proses 1: Cek apakah sudah absen hari ini
      const isHariIniAbsen = await AbsensiService.cekAbsensiHariIni(currentProf.nip);
      setSudahAbsen(isHariIniAbsen);

      // Proses 2: Fetch history paged dari Server
      const { data: absData, count } = await AbsensiService.getRiwayatAbsensiPetugas(
        currentProf.nip, 
        currentPage, 
        itemsPerPage, 
        6 // Ambil 6 bulan terakhir
      );
      
      setData(absData || []);
      setTotalData(count || 0);

    } catch (e) {
      toast.error('Gagal mengambil data absensi dari server.');
      console.error(e);
    }
    setLoading(false);
  }, [profile, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Logic Tanda Tangan Native HTML5 Canvas
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (sudahAbsen) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || sudahAbsen) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (sudahAbsen) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const submitAbsensi = async () => {
    if (!profile) return;

    // Periksa apakah canvas kosong
    const canvas = canvasRef.current;
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      toast.error("Harap berikan tanda tangan kehadiran Anda terlebih dahulu!");
      return;
    }

    // Konfirmasi via SweetAlert2
    const confirmResult = await Swal.fire({
      title: 'Kirim Absensi?',
      text: "Pastikan tanda tangan Anda sudah benar.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#cbd5e1',
      confirmButtonText: 'Ya, Kirim!'
    });

    if (!confirmResult.isConfirmed) return;

    setIsSubmitting(true);
    const loadingToast = toast.loading('Mengirim data absensi...');
    
    try {
      const signatureBase64 = canvas.toDataURL('image/png');
      
      // Kirim via Service (Bukan langsung panggil SupabaseAdmin dari Komponen!)
      await AbsensiService.submitAbsensiBiometrik(profile.nip, signatureBase64);

      setSudahAbsen(true); 
      toast.success("Tanda tangan kehadiran berhasil terkirim!", { id: loadingToast });
      fetchData();
    } catch (err) {
      toast.error("Gagal mengirim absensi: " + err.message, { id: loadingToast });
    }
    setIsSubmitting(false);
  };

  if (loading) return <Card><p>Memuat rekam jejak historis kehadiran Anda...</p></Card>;

  return (
    <>
      {/* SEKSI FORM ABSENSI HARI INI */}
      <Card className="mb-20">
        <div className="flex-center-gap mb-15">
          <FaPenNib size={24} color="#0ea5e9" />
          <h3 className="m-0">Silahkan Absen Hari Ini</h3>
        </div>

        <div className="info-box-slate">
          <p className="fw-semibold text-dark-blue m-0">
            <FaCalendarDay style={{ color: "#0ea5e9", marginRight: "8px" }} /> Hari Ini: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {sudahAbsen ? (
          <div className="success-box">
            <FaCheckCircle size={30} className="mb-10" />
            <h4 className="m-0">Absensi kehadiran hari ini sukses terdaftar</h4>
            <p className="mt-5">Menunggu proses verifikasi penyelesaian tugas Anda oleh Admin.</p>
          </div>
        ) : (
          <div className="canvas-container-outer">
            <p className="text-slate fw-semibold mb-15">Torehkan Tanda Tangan Absen (Verifikasi Biometrik Manual)</p>
            <div className="canvas-wrapper">
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="signature-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={endDrawing}
                onMouseLeave={endDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={endDrawing}
              />
            </div>
            <div className="flex-end-gap mt-15">
              <button onClick={clearCanvas} className="btn-outline-slate">Ulangi TTD</button>
              <button onClick={submitAbsensi} disabled={isSubmitting} className="btn-solid-blue">
                {isSubmitting ? 'Mengirim...' : 'Submit Tanda Tangan Hadir'}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* SEKSI HISTORI */}
      <Card>
        <div className="flex-center-gap mb-20">
          <FaHistory size={20} color="#64748b" />
          <h3 className="m-0 text-slate">Riwayat Bukti Kehadiran</h3>
          <span className="text-slate-light text-xs-normal">(6 bulan terakhir)</span>
        </div>

        <div className="table-responsive">
          <table className="tabel-absensi" style={{ minWidth: '800px' }}>
            <thead>
              <tr>
                <th>Waktu Cek-in Sistem</th>
                <th>Status (Verifikasi)</th>
                <th>Status Tugas Pembersihan (Dari Checklist)</th>
                <th>Rekaman TTD</th>
              </tr>
            </thead>
            <tbody>
              {data && data.length > 0 ? data.map(a => (
                <tr key={a.id_absensi}>
                  <td>
                    {a.waktu ? (() => {
                      const d = new Date(a.waktu);
                      const p = v => String(v).padStart(2, '0');
                      return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}/${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
                    })() : '-'}
                  </td>
                  <td>
                    <span className={`badge ${a.status === 'Terverifikasi' ? 'badge-success' : a.status === 'Ditolak' ? 'badge-danger' : 'badge-warning'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td><i className="text-slate">{a.deskripsi || '-'}</i></td>
                  <td>
                    {a.foto_url && a.foto_url.startsWith('data:image') ? (
                      <img src={a.foto_url} alt="TTD" style={{ height: '40px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              )) : <tr><td colSpan="4" className="empty-state-text">Anda belum memiliki record riwayat absensi.</td></tr>}
            </tbody>
          </table>
        </div>

        {!loading && totalData > 0 && (
          <TablePagination 
            totalItems={totalData} 
            itemsPerPage={itemsPerPage} 
            currentPage={currentPage} 
            onPageChange={(page) => {
              if (page !== currentPage) setCurrentPage(page);
            }} 
            onItemsPerPageChange={(limit) => {
              if (limit !== itemsPerPage) {
                setItemsPerPage(limit);
                setCurrentPage(1); // Balik ke halaman awal jika ganti limit
              }
            }} 
          />
        )}
      </Card>
    </>
  );
}
export default AbsensiPetugas;
