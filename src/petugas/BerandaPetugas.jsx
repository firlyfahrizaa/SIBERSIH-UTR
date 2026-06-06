import React, { useState, useEffect } from 'react';
import { Card } from '../components/common';
import { FaBroom, FaSave, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { supabase } from '../supabaseClient';

import { Link } from 'react-router-dom';

function BerandaPetugas() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [lokasi, setLokasi] = useState(null);
  const [checklist, setChecklist] = useState({});
  const [dataAbsenHariIni, setDataAbsenHariIni] = useState(null);
  const [savingCheck, setSavingCheck] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pData } = await supabase.from('pengguna').select('nip, nama').eq('auth_id', user.id).single();
      if (!pData) return;
      setProfile(pData);

      // Cek apakah dia sudah tanda tangan Absensi Hari Ini di menu Absensi
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { data: absData } = await supabase.from('absensi').select('*').eq('nip_petugas', pData.nip).gte('waktu', startOfToday.toISOString());

      let absenObj = null;
      if (absData && absData.length > 0) {
        absenObj = absData[0];
        setDataAbsenHariIni(absenObj);
      }

      // Ambil Plotting Gedung dan Cakupan
      const { data: tData } = await supabase.from('pembagian_tugas').select('id_tempat').eq('nip_petugas', pData.nip).single();
      if (tData && tData.id_tempat) {
        const { data: tmpt } = await supabase.from('tempat').select('*').eq('id_tempat', tData.id_tempat).single();
        if (tmpt) {
          setLokasi(tmpt);
          let areas = [];
          try {
            areas = JSON.parse(tmpt.daftar_area);
            if (!Array.isArray(areas)) areas = [tmpt.daftar_area];
          } catch (e) {
            areas = [tmpt.daftar_area];
          }

          // Inisialisasi checklist: semua false dulu
          let initialChecklist = {};
          areas.forEach(a => { if (a) initialChecklist[a] = false; });

          // Restore checklist dari database (deskripsi absensi hari ini)
          if (absenObj && absenObj.deskripsi) {
            if (absenObj.deskripsi.includes('Tuntas:')) {
              // Semua sudah selesai & dilaporkan
              areas.forEach(a => { if (a) initialChecklist[a] = true; });
            } else if (absenObj.deskripsi.startsWith('Progress:')) {
              // Parsing area yang sudah diceklis dari format "Progress: Area1, Area2"
              const doneAreas = absenObj.deskripsi.replace('Progress: ', '').split(', ').map(s => s.trim());
              areas.forEach(a => {
                if (a && doneAreas.includes(a)) initialChecklist[a] = true;
              });
            }
          }

          setChecklist(initialChecklist);
        }
      }

    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  // Auto-save checklist ke database setiap kali diceklis/di-unceklis
  const toggleCheck = async (area) => {
    if (!dataAbsenHariIni) return;

    const updated = { ...checklist, [area]: !checklist[area] };
    setChecklist(updated);
    setSavingCheck(true);

    try {
      // Hitung area yang sudah diceklis
      const checkedAreas = Object.keys(updated).filter(k => updated[k]);
      const allChecked = Object.keys(updated).length > 0 && Object.values(updated).every(v => v);

      let deskripsi = '';
      if (checkedAreas.length === 0) {
        deskripsi = ''; // Belum ada yang diceklis
      } else if (allChecked) {
        deskripsi = `Area Tuntas: ${checkedAreas.join(', ')}`;
      } else {
        deskripsi = `Progress: ${checkedAreas.join(', ')}`;
      }

      await supabase.from('absensi')
        .update({ deskripsi })
        .eq('id_absensi', dataAbsenHariIni.id_absensi);

    } catch (err) {
      console.error('Gagal menyimpan checklist:', err);
    }
    setSavingCheck(false);
  };

  const isAllChecked = Object.keys(checklist).length > 0 && Object.values(checklist).every(v => v === true);

  // Deteksi apakah sudah dilaporin selesai dari database
  const apakahSudahTuntasDiDB = dataAbsenHariIni && dataAbsenHariIni.deskripsi && dataAbsenHariIni.deskripsi.includes('Tuntas:');

  const handleSubmitTugas = async () => {
    if (!isAllChecked && Object.keys(checklist).length > 0) return;
    setLoading(true);
    try {
      const summary = Object.keys(checklist).length > 0
        ? `Area Tuntas: ${Object.keys(checklist).join(', ')}`
        : 'Area Tuntas: Gedung Keseluruhan';

      // Update log Absensi (Murni pelaporan tugas, bukan presensinya lagi)
      const { error } = await supabase.from('absensi')
        .update({ deskripsi: summary })
        .eq('id_absensi', dataAbsenHariIni.id_absensi);

      if (error) throw error;
      alert('Laporan pembersihan telah dikirim ke Admin.');
      fetchData(); // Reload for UI check
    } catch (err) {
      alert('Gagal submit log pekerjaan: ' + err.message);
    }
    setLoading(false);
  };

  // Hitung progress
  const totalAreas = Object.keys(checklist).length;
  const doneAreas = Object.values(checklist).filter(v => v).length;

  if (loading) return <Card><p>Menyiapkan instrumen tugas Anda hari ini...</p></Card>;
  if (!profile) return <Card><p>Profil sistem tidak terdeteksi.</p></Card>;

  return (
    <div>
      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', color: 'white', display: 'flex', flexDirection: 'column' }}>
        <h2>Selamat Bekerja, {profile.nama}! <FaBroom style={{ color: "#f59e0b" }} /></h2>
        <p>Silakan selesaikan tugas harian pembersihan tepat waktu di lokasi yang sudah ditentukan.</p>
      </div>

      {!dataAbsenHariIni ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <FaExclamationCircle size={50} color="#f59e0b" style={{ marginBottom: '15px' }} />
            <h3 style={{ color: '#b45309' }}>Berhenti Sebentar! Akses Tugas Terkunci</h3>
            <p style={{ color: '#475569', fontSize: '16px', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 25px auto' }}>
              Menurut mesin absensi biometrik database, Anda <b>belum melakukan absen jari tanda tangan hari ini.</b> Sistem mewajibkan presensi kehadiran murni sebelum Anda bisa mengakses tabel rincian area lapangan yang perlu dibersihkan.
            </p>
            <Link to="/petugas/absensi">
              <button style={{ padding: '15px 30px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(245, 158, 11, 0.3)' }}>
                Isi Absensi Tanda Tangan Sekarang
              </button>
            </Link>
          </div>
        </Card>
      ) : !lokasi ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <FaExclamationCircle size={40} color="#cbd5e1" />
            <h3 style={{ color: '#64748b' }}>Anda Berstatus Siaga (Stand-By)</h3>
            <p style={{ color: '#94a3b8' }}>Terima kasih atas kehadiran absen Anda. Namun hari ini Admin belum menge-plot Anda di gedung manapun. Silakan berjaga di markas pusat.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0 }}><FaCheckCircle color="#0ea5e9" style={{ marginRight: '10px' }} /> Ceklis Tugas : {lokasi.nama_gedung}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {savingCheck && <span style={{ fontSize: '12px', color: '#0ea5e9', fontWeight: 500 }}><FaSave /> Menyimpan...</span>}
              {totalAreas > 0 && !apakahSudahTuntasDiDB && (
                <span style={{ background: isAllChecked ? '#dcfce7' : '#fef3c7', color: isAllChecked ? '#166534' : '#92400e', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px', border: `1px solid ${isAllChecked ? '#22c55e' : '#fbbf24'}` }}>
                  {doneAreas}/{totalAreas} Area
                </span>
              )}
              {apakahSudahTuntasDiDB && <span style={{ background: '#dcfce7', color: '#166534', padding: '6px 15px', borderRadius: '20px', fontWeight: 'bold', border: '1px solid #22c55e' }}>Laporan Selesai & Ditutup</span>}
            </div>
          </div>

          <p style={{ color: '#64748b', marginBottom: '20px' }}>Silakan berikan tanda centang spesifik pada area-area di bawah ini jika telah selesai membersihkannya hari ini. Centangan akan <b>otomatis tersimpan</b>.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            {Object.keys(checklist).length > 0 ? (
              Object.keys(checklist).map(area => (
                <label key={area} style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '18px', cursor: apakahSudahTuntasDiDB ? 'default' : 'pointer', padding: '15px', background: checklist[area] ? '#e0f2fe' : 'white', borderRadius: '10px', border: checklist[area] ? '2px solid #38bdf8' : '1px solid #cbd5e1', transition: 'all 0.2s', opacity: apakahSudahTuntasDiDB ? 0.8 : 1 }}>
                  <input type="checkbox" disabled={apakahSudahTuntasDiDB} checked={checklist[area]} onChange={() => toggleCheck(area)} style={{ transform: 'scale(1.8)', cursor: apakahSudahTuntasDiDB ? 'default' : 'pointer' }} />
                  <span style={{ fontWeight: checklist[area] ? 'bold' : 'normal', color: checklist[area] ? '#0369a1' : '#475569', textDecoration: checklist[area] ? 'line-through' : 'none' }}>{area}</span>
                </label>
              ))
            ) : (
              <p style={{ fontStyle: 'italic', color: '#94a3b8' }}>Gedung ini tidak memiliki area spesifik. Cukup tekan tombol di bawah untuk melaporkan pembersihan selesai.</p>
            )}
          </div>

          {!apakahSudahTuntasDiDB && (
            <button
              onClick={handleSubmitTugas}
              disabled={!(isAllChecked || Object.keys(checklist).length === 0)}
              style={{ width: '100%', padding: '18px', fontSize: '18px', borderRadius: '8px', background: isAllChecked || Object.keys(checklist).length === 0 ? '#0ea5e9' : '#cbd5e1', cursor: isAllChecked || Object.keys(checklist).length === 0 ? 'pointer' : 'not-allowed', color: 'white', border: 'none', fontWeight: 'bold', transition: 'all 0.3s' }}
            >
              Kirim Laporan Pembersihan ke Admin
            </button>
          )}
        </Card>
      )}
    </div>
  );
}

export default BerandaPetugas;
