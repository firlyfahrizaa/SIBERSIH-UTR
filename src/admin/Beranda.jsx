import React, { useState, useEffect } from 'react';
import { Card, SummaryCard } from '../components/common';
import { supabase } from '../supabaseClient';
import { FaUserShield, FaHandSparkles } from 'react-icons/fa';

function Beranda() {
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
        // 1. Hitung Total Petugas
        const { data: pData } = await supabase.from('pengguna').select('*');
        const countPetugas = pData ? pData.filter(p => p.role && String(p.role).toLowerCase() === 'petugas').length : 0;

        // 2. Hitung Hadir Hari Ini
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

        const { data: absHariIni } = await supabase.from('absensi')
          .select('id_absensi')
          .gte('waktu', startOfToday)
          .lte('waktu', endOfToday);
        const countHadir = absHariIni ? absHariIni.length : 0;

        // 3. Status Aduan
        const { data: aData } = await supabase.from('pengaduan').select('status');
        const countTertunda = aData ? aData.filter(a => a.status === 'Pending' || !a.status).length : 0;
        const countDiteruskan = aData ? aData.filter(a => a.status === 'Diteruskan').length : 0;

        setStats({
          totalPetugas: countPetugas,
          hadirHariIni: countHadir,
          aduanTertunda: countTertunda,
          aduanSelesai: countDiteruskan
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

        // Ambil absensi 6 bln terakhir
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
    { label: 'Total Petugas', value: stats.totalPetugas, className: 'primary' },
    { label: 'Telah Hadir Hari Ini', value: stats.hadirHariIni, className: 'success' },
    { label: 'Aduan Tertunda', value: stats.aduanTertunda, className: 'danger' },
    { label: 'Aduan Diteruskan', value: stats.aduanSelesai, className: 'warning' },
  ];

  const maxAbsensi = Math.max(...chartData.map(d => d.absensi), 1);
  const maxAduan = Math.max(...chartData.map(d => d.aduan), 1);

  return (
    <div>
      <div className="welcome-banner flex-between-center">
        <div>
          <h2>Selamat Datang, Admin! <FaHandSparkles /></h2>
          <p>Statistik seluruh aktivitas operasional SIBERSIH terkini.</p>
        </div>
        <FaUserShield size={40} color="white" style={{ opacity: 0.8 }} />
      </div>

      {loading ? (
        <div className="loading-state-text padding-50">Mengkalkulasi metrik database...</div>
      ) : (
        <>
          <div className="dashboard-cards">
            {arrStats.map((stat) => (
              <SummaryCard key={stat.label} label={stat.label} value={stat.value} variant={stat.className} />
            ))}
          </div>

          <div className="chart-grid">
            <Card>
              <h3 className="chart-title">Total Absensi Petugas (Satu Semester)</h3>
              <div className="chart-container">
                {chartData.map((d, i) => {
                  const heightPx = Math.max((d.absensi / maxAbsensi) * 160, 5);
                  return (
                    <div key={i} className="chart-bar-wrapper">
                      <div className="chart-bar-value">{d.absensi}</div>
                      <div className="chart-bar chart-bar-blue" style={{ height: `${heightPx}px` }}></div>
                      <div className="chart-bar-label">{d.label}</div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card>
              <h3 className="chart-title">Total Aduan Petugas (Satu Semester)</h3>
              <div className="chart-container">
                {chartData.map((d, i) => {
                  const heightPx = Math.max((d.aduan / maxAduan) * 160, 5);
                  return (
                    <div key={i} className="chart-bar-wrapper">
                      <div className="chart-bar-value">{d.aduan}</div>
                      <div className="chart-bar chart-bar-red" style={{ height: `${heightPx}px` }}></div>
                      <div className="chart-bar-label">{d.label}</div>
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

export default Beranda;