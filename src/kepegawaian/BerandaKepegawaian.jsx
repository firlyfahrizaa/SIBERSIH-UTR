import React, { useState, useEffect } from 'react';
import { Card, SummaryCard } from '../components/common';
import { supabase } from '../supabaseClient';
import { FaUserCircle, FaHandshake } from 'react-icons/fa';

function BerandaKepegawaian() {
  const [stats, setStats] = useState({
    totalPetugas: 0,
    hadirHariIni: 0,
    aduanTertunda: 0,
    aduanSelesai: 0,
  });

  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const memuatData = async () => {
      try {
        // 1. Hitung Total Pengguna
        const { data: pData } = await supabase.from('pengguna').select('nip');
        const countPetugas = pData ? pData.length : 0;

        // 2. Hitung Hadir Hari Ini
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

        const { data: absHariIni } = await supabase.from('absensi')
          .select('id_absensi')
          .gte('waktu', startOfToday)
          .lte('waktu', endOfToday)
          .eq('status', 'Terverifikasi');
        const countHadir = absHariIni ? absHariIni.length : 0;

        // 3. Status Aduan
        const { data: aTertunda } = await supabase.from('pengaduan').select('id_pengaduan').in('status', ['Diteruskan']); // Kepegawaian fokus ke yang sudah diteruskan
        const countTertunda = aTertunda ? aTertunda.length : 0;

        const { data: aSelesai } = await supabase.from('pengaduan').select('id_pengaduan').eq('status', 'Selesai');
        const countSelesai = aSelesai ? aSelesai.length : 0;

        setStats({
          totalPetugas: countPetugas,
          hadirHariIni: countHadir,
          aduanTertunda: countTertunda,
          aduanSelesai: countSelesai
        });

        // 4. Proses Data Chart (6 Bulan Terakhir)
        const dMonths = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

        for (let i = 5; i >= 0; i--) {
          let d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          dMonths.push({
            idx: d.getMonth(),
            year: d.getFullYear(),
            label: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
            absensi: 0,
            aduan: 0
          });
        }

        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString();
        const { data: allAbs } = await supabase.from('absensi').select('waktu').gte('waktu', sixMonthsAgo);
        const { data: allAdu } = await supabase.from('pengaduan').select('tanggal');

        (allAbs || []).forEach(ab => {
          if (!ab.waktu) return;
          const d = new Date(ab.waktu);
          const m = dMonths.find(x => x.idx === d.getMonth() && x.year === d.getFullYear());
          if (m) m.absensi++;
        });

        (allAdu || []).forEach(ad => {
          if (!ad.tanggal) return;
          const d = new Date(ad.tanggal);
          const m = dMonths.find(x => x.idx === d.getMonth() && x.year === d.getFullYear());
          if (m) m.aduan++;
        });

        setChartData(dMonths);

      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    memuatData();
  }, []);

  const arrStats = [
    { label: 'Total Pengguna', value: stats.totalPetugas, className: 'primary' },
    { label: 'Kehadiran Lapangan Hari Ini', value: stats.hadirHariIni, className: 'success' },
    { label: 'Aduan Tertunda', value: stats.aduanTertunda, className: 'danger' },
    { label: 'Total Aduan Diselesaikan', value: stats.aduanSelesai, className: 'warning' },
  ];

  const maxAbsensi = Math.max(...chartData.map(d => d.absensi), 1);
  const maxAduan = Math.max(...chartData.map(d => d.aduan), 1);

  return (
    <div>
      <div style={{ padding: '30px', borderRadius: '16px', marginBottom: '30px', background: 'linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgba(139,92,246, 0.4)' }}>
        <div>
          <h2 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '28px', fontWeight: 'bold' }}>Selamat Datang, Bapak/Ibu Kepegawaian! <FaHandshake /></h2>
          <p style={{ color: '#ddd6fe', margin: 0, fontSize: '15px' }}>Analisa pengawasan pekerjaan pegawai, petugas kebersihan, pengaduan, dan lain sebagainya.</p>
        </div>
        <FaUserCircle size={40} color="white" style={{ opacity: 0.8 }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>Menyusun komputasi chart metriks...</div>
      ) : (
        <>
          <div className="dashboard-cards">
            {arrStats.map((stat) => (
              <SummaryCard key={stat.label} label={stat.label} value={stat.value} variant={stat.className} />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
            <Card>
              <h3 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Total Absensi (Satu Semester)</h3>
              <div style={{ display: 'flex', height: '220px', alignItems: 'flex-end', gap: '10px', paddingTop: '20px' }}>
                {chartData.map((d, i) => {
                  const heightPx = Math.max((d.absensi / maxAbsensi) * 160, 5);
                  return (
                    <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{d.absensi}</div>
                      <div style={{ width: '100%', maxWidth: '40px', height: `${heightPx}px`, background: 'linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)', borderRadius: '4px 4px 0 0', transition: 'height 1s ease-out' }}></div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{d.label}</div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card>
              <h3 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Total Aduan Petugas (Satu Semester)</h3>
              <div style={{ display: 'flex', height: '220px', alignItems: 'flex-end', gap: '10px', paddingTop: '20px' }}>
                {chartData.map((d, i) => {
                  const heightPx = Math.max((d.aduan / maxAduan) * 160, 5);
                  return (
                    <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{d.aduan}</div>
                      <div style={{ width: '100%', maxWidth: '40px', height: `${heightPx}px`, background: 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)', borderRadius: '4px 4px 0 0', transition: 'height 1s ease-out' }}></div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{d.label}</div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default BerandaKepegawaian;