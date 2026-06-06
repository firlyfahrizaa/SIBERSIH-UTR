import React, { useState } from 'react';
import { Card } from '../components/common';
import { supabase } from '../supabaseClient';
import { BiTask } from "react-icons/bi";
import { MdOutlineReportProblem } from "react-icons/md";
import { FaPrint, FaSpinner, FaFilePdf } from 'react-icons/fa';

function Laporan() {
  const [printingAbsensi, setPrintingAbsensi] = useState(null); // null, 'view', 'submit'
  const [printingAduan, setPrintingAduan] = useState(null); // null, 'view', 'submit'

  // Document Printer - Absensi
  const handlePrintAbsensi = async (isViewOnly = false) => {
    setPrintingAbsensi(isViewOnly ? 'view' : 'submit');
    try {
      const today = new Date();
      let dateOffset = new Date();
      // Selalu 1 Bulan sesuai label UI terbaru
      dateOffset.setMonth(dateOffset.getMonth() - 1);

      const { data: absData } = await supabase.from('absensi').select('*').gte('waktu', dateOffset.toISOString()).order('waktu', { ascending: false });
      const { data: pData } = await supabase.from('pengguna').select('nip, nama');
      const { data: tData } = await supabase.from('pembagian_tugas').select('nip_petugas, id_tempat');
      const { data: tmData } = await supabase.from('tempat').select('id_tempat, nama_gedung');

      if (!absData || absData.length === 0) {
        alert("Tidak ada data absensi dalam durasi 1 bulan terakhir.");
        setPrintingAbsensi(null);
        return;
      }

      const combined = absData.map(ab => {
        const pg = (pData || []).find(p => String(p.nip) === String(ab.nip_petugas));
        const tg = (tData || []).find(t => String(t.nip_petugas) === String(ab.nip_petugas));
        const lk = tg ? (tmData || []).find(tm => tm.id_tempat === tg.id_tempat) : null;

        const isTodayStr = (ds) => {
          if (!ds) return false;
          const d = new Date(ds);
          const today = new Date();
          return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        };

        let visualStatus = ab.status;
        if (!isTodayStr(ab.waktu) && ab.status === 'Menunggu Verifikasi') visualStatus = 'Alfa';

        const fDate = new Date(ab.waktu);
        const p = v => String(v).padStart(2, '0');
        const ts = `${p(fDate.getDate())}/${p(fDate.getMonth() + 1)}/${String(fDate.getFullYear()).slice(-2)}/${p(fDate.getHours())}:${p(fDate.getMinutes())}:${p(fDate.getSeconds())}`;

        return `
           <tr>
             <td style="border:1px solid #cbd5e1; padding:8px;">${ts}</td>
             <td style="border:1px solid #cbd5e1; padding:8px;">${pg ? pg.nama : ab.nip_petugas}</td>
             <td style="border:1px solid #cbd5e1; padding:8px;">${lk ? lk.nama_gedung : 'Belum Terplot'}</td>
             <td style="border:1px solid #cbd5e1; padding:8px;">${ab.deskripsi || '-'}</td>
             <td style="border:1px solid #cbd5e1; padding:8px; text-align:center;">
                ${ab.foto_url && ab.foto_url.startsWith('data:image') ? `<img src="${ab.foto_url}" style="height:35px; mix-blend-mode: multiply;" />` : `<span style="font-size:12px; color:#ef4444;">Tanpa TTD</span>`}
             </td>
             <td style="border:1px solid #cbd5e1; padding:8px; font-weight:bold; color: ${visualStatus === 'Terverifikasi' ? '#16a34a' : visualStatus === 'Alfa' ? '#dc2626' : '#ca8a04'}">${visualStatus}</td>
         `;
      }).join('');

      const htmlPayload = `
        <html>
          <head>
            <title>Rekap Absensi Bulanan - SIBERSIH</title>
            <style>body { font-family: Arial, sans-serif; padding: 30px; } table { border-collapse: collapse; width: 100%; font-size: 14px; } th { background-color: #f8fafc; font-weight: bold; }</style>
          </head>
          <body>
            <div style="text-align:center; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 30px;">
              <h2 style="margin:0 0 5px 0;">Laporan Data Rekapitulasi Absensi Pekerja</h2>
              <p style="margin:0 0 5px 0; color:#475569; font-weight:bold;">(Periode: ${String(dateOffset.getDate()).padStart(2, '0')}/${String(dateOffset.getMonth() + 1).padStart(2, '0')}/${dateOffset.getFullYear()} - ${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()})</p>
              <p style="margin:0; color:#64748b; font-size:13px;">Dicetak pada: ${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}</p>
            </div>
            <table>
              <thead>
                <tr style="text-align:left;">
                  <th style="border:1px solid #cbd5e1; padding:10px;">Waktu & Tanggal</th>
                  <th style="border:1px solid #cbd5e1; padding:10px;">Nama Petugas</th>
                  <th style="border:1px solid #cbd5e1; padding:10px;">Lokasi Area</th>
                  <th style="border:1px solid #cbd5e1; padding:10px;">Tugas Selesai Terlapor (Checklist)</th>
                  <th style="border:1px solid #cbd5e1; padding:10px;">Validasi TTD</th>
                  <th style="border:1px solid #cbd5e1; padding:10px;">Keputusan Akhir</th>
                </tr>
              </thead>
              <tbody>${combined}</tbody>
            </table>
            <div style="margin-top:50px; display:flex; justify-content:flex-end;">
               <div style="text-align:center;">
                  <p style="margin-bottom:70px;">Administrator SIBERSIH,</p>
                  <p><strong>_____________________</strong></p>
               </div>
            </div>
          </body>
        </html>
      `;

      // Hanya Simpan Ke Database jika bukan sekedar "Lihat"
      if (!isViewOnly) {
        const { error: dbErr } = await supabase.from('arsip_laporan').insert({
          jenis_laporan: 'Absensi',
          html_content: htmlPayload,
          keterangan_periode: `1 Bulan Terakhir (Hingga ${today.toLocaleDateString('id-ID')})`
        });

        if (dbErr) {
          alert("Gagal menyetor data ke Kepegawaian! Pastikan tabel `arsip_laporan` sudah ADA di Supabase SQL.");
          setPrintingAbsensi(null);
          return;
        } else {
          alert("Dokumen berhasil direkam & diajukan mutlak ke brankas Kepegawaian.");
        }
      }

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlPayload);
        printWindow.document.close();
      } else {
        alert('Browser memblokir popup! Silakan izinkan popup untuk situs ini, lalu coba lagi.');
      }
    } catch (err) {
      alert("Sistem Gagal Mencetak: " + err.message);
    }
    setPrintingAbsensi(null);
  };

  // Document Printer - Pengaduan
  const handlePrintAduan = async (isViewOnly = false) => {
    setPrintingAduan(isViewOnly ? 'view' : 'submit');
    try {
      const today = new Date();
      let query = supabase.from('pengaduan').select('*');

      const { data: bgDataRaw } = await query;
      const bgData = (bgDataRaw || []).reverse();
      const { data: pData } = await supabase.from('pengguna').select('nip, nama');

      if (!bgData || bgData.length === 0) {
        alert("Laporan pengaduan kosong.");
        setPrintingAduan(null);
        return;
      }

      const combined = bgData.map(ad => {
        const pg = (pData || []).find(p => String(p.nip) === String(ad.nip_petugas));
        const dDate = new Date(ad.tanggal);
        const p = v => String(v).padStart(2, '0');
        const ts = ad.tanggal ? `${p(dDate.getDate())}/${p(dDate.getMonth() + 1)}/${String(dDate.getFullYear()).slice(-2)}/${p(dDate.getHours())}:${p(dDate.getMinutes())}:${p(dDate.getSeconds())}` : '<i style="color:#ef4444; font-size:11px;">Tanpa Rekam Jejak Waktu</i>';

        return `
           <tr>
             <td style="border:1px solid #cbd5e1; padding:10px;">${ts}</td>
             <td style="border:1px solid #cbd5e1; padding:10px; font-weight:bold;">${pg ? pg.nama : ad.nip_petugas}</td>
             <td style="border:1px solid #cbd5e1; padding:10px;">${ad.deskripsi || '-'}</td>
           </tr>
         `;
      }).join('');

      const htmlPayload = `
        <html>
          <head>
            <title>Laporan Komplain Area - SIBERSIH</title>
            <style>body { font-family: Arial, sans-serif; padding: 30px; } table { border-collapse: collapse; width: 100%; font-size: 14px; } th { background-color: #f8fafc; font-weight: bold; }</style>
          </head>
          <body>
            <div style="text-align:center; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 30px;">
              <h2 style="margin:0 0 5px 0;">Dokumen Arsip Keluhan & Aduan Lapangan</h2>
              <p style="margin:0 0 5px 0; color:#475569; font-weight:bold;">(Siklus Komprehensif Seluruh Pengaduan)</p>
              <p style="margin:0; color:#64748b; font-size:13px;">Dicetak pada: ${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}</p>
            </div>
            <table>
              <thead>
                <tr style="text-align:left;">
                  <th style="border:1px solid #cbd5e1; padding:12px;">Tanggal & Waktu Disampaikan</th>
                  <th style="border:1px solid #cbd5e1; padding:12px;">Nama Pelapor</th>
                  <th style="border:1px solid #cbd5e1; padding:12px;">Keterangan Spesifik Masalah / Alat</th>
                </tr>
              </thead>
              <tbody>${combined}</tbody>
            </table>
             <div style="margin-top:50px; display:flex; justify-content:flex-end;">
               <div style="text-align:center;">
                  <p style="margin-bottom:70px;">Administrator SIBERSIH,</p>
                  <p><strong>_____________________</strong></p>
               </div>
            </div>
          </body>
        </html>
      `;

      // Hanya Simpan Ke Database jika bukan sekedar "Lihat"
      if (!isViewOnly) {
        const { error: dbErr } = await supabase.from('arsip_laporan').insert({
          jenis_laporan: 'Aduan',
          html_content: htmlPayload,
          keterangan_periode: `Komprehensif Seluruh Pengaduan (s.d ${today.toLocaleDateString('id-ID')})`
        });

        if (dbErr) {
          alert("Gagal menyetor data ke Kepegawaian! Pastikan tabel `arsip_laporan` sudah ADA di Supabase SQL.");
          setPrintingAduan(null);
          return;
        } else {
          alert("Transkrip Aduan Laporan berhasil diajukan masuk ke rak arsip Kepegawaian.");
        }
      }

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlPayload);
        printWindow.document.close();
      } else {
        alert('Browser memblokir popup! Silakan izinkan popup untuk situs ini, lalu coba lagi.');
      }
    } catch (err) {
      alert("Error cetak: " + err.message);
    }
    setPrintingAduan(null);
  };

  return (
    <div>
      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Laporan & Transkrip PDF <FaFilePdf style={{ marginLeft: "8px", color: "#ef4444" }} /></h2>
          <p>Rekapitulasi data lapangan untuk keperluan berkas arsip Bagian Kepegawaian Kampus.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>

        {/* Card 1 */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <div style={{ background: '#ecfdf5', color: '#10b981', padding: '12px', borderRadius: '10px', display: 'flex' }}><BiTask size={24} /></div>
            <h3 style={{ margin: 0 }}>Arsip Kehadiran (1 Bulan)</h3>
          </div>
          <p className="card-description" style={{ marginBottom: '20px', color: '#64748b', minHeight: '60px' }}>Salin dan bentuk formulir lengkap daftar hadir Petugas dalam rentang waktu terentu yang ditarik hingga detik ini. Termasuk tanda tangan digital absensinya.</p>
          <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button disabled={printingAbsensi !== null} onClick={() => handlePrintAbsensi(true)} style={{ background: '#059669', color: 'white', border: 'none', padding: '14px 20px', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: printingAbsensi !== null ? 'not-allowed' : 'pointer', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'transform 0.1s', opacity: printingAbsensi !== null ? 0.7 : 1 }}>
              {printingAbsensi === 'view' ? <><FaSpinner className="spin" style={{ marginRight: '8px' }} size={18} /> Tunggu Sebentar...</> : <><FaPrint style={{ marginRight: '8px' }} size={18} /> Lihat Rekap Absensi PDF (1 Bulan)</>}
            </button>
            <button disabled={printingAbsensi !== null} onClick={() => handlePrintAbsensi(false)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '14px 20px', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: printingAbsensi !== null ? 'not-allowed' : 'pointer', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'transform 0.1s', opacity: printingAbsensi !== null ? 0.7 : 1 }}>
              {printingAbsensi === 'submit' ? <><FaSpinner className="spin" style={{ marginRight: '8px' }} size={18} /> Tunggu Sebentar...</> : <><FaPrint style={{ marginRight: '8px' }} size={18} /> Ajukan Rekap Absensi PDF (1 Bulan)</>}
            </button>
          </div>
        </Card>

        {/* Card 2 */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <div style={{ background: '#fef3c7', color: '#d97706', padding: '12px', borderRadius: '10px', display: 'flex' }}><MdOutlineReportProblem size={24} /></div>
            <h3 style={{ margin: 0 }}>Transkrip Pengaduan Petugas</h3>
          </div>
          <p className="card-description" style={{ marginBottom: '20px', color: '#64748b', minHeight: '60px' }}>Rekapitulasi pengaduan petugas (Tidak menyertakan URL Lampiran Foto).</p>
          <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button disabled={printingAduan !== null} onClick={() => handlePrintAduan(true)} style={{ background: '#b45309', color: 'white', border: 'none', padding: '14px 20px', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: printingAduan !== null ? 'not-allowed' : 'pointer', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'transform 0.1s', opacity: printingAduan !== null ? 0.7 : 1 }}>
              {printingAduan === 'view' ? <><FaSpinner className="spin" style={{ marginRight: '8px' }} size={18} /> Tunggu Sebentar...</> : <><FaPrint style={{ marginRight: '8px' }} size={18} /> Lihat Aduan PDF (Keseluruhan)</>}
            </button>
            <button disabled={printingAduan !== null} onClick={() => handlePrintAduan(false)} style={{ background: '#d97706', color: 'white', border: 'none', padding: '14px 20px', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: printingAduan !== null ? 'not-allowed' : 'pointer', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'transform 0.1s', opacity: printingAduan !== null ? 0.7 : 1 }}>
              {printingAduan === 'submit' ? <><FaSpinner className="spin" style={{ marginRight: '8px' }} size={18} /> Tunggu Sebentar...</> : <><FaPrint style={{ marginRight: '8px' }} size={18} /> Ajukan Pengaduan PDF (Keseluruhan)</>}
            </button>
          </div>
        </Card>

      </div>

      <style>{`
         .spin { animation: spin 1s linear infinite; }
         @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default Laporan;
