import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { supabase } from './supabaseClient';
import { FaRecycle } from "react-icons/fa"; // Logo loading berputar

import Layout from './admin/Layout.jsx';
import Beranda from './admin/Beranda.jsx';
import Absensi from './admin/Absensi.jsx';
import Profil from './admin/Profil.jsx';
import ManajemenPetugas from './admin/ManajemenPetugas.jsx';
import AduanPetugas from './admin/AduanPetugas.jsx';
import Laporan from './admin/Laporan.jsx';
import Login from './auth/Login.jsx';
import UpdatePassword from './auth/UpdatePassword.jsx'; // <-- (1) TAMBAHAN BARU: Import UpdatePassword

// Komponen Wilayah Kepegawaian
import BerandaKepegawaian from './kepegawaian/BerandaKepegawaian.jsx';
import ManajemenKepegawaian from './kepegawaian/ManajemenKepegawaian.jsx';
import ManajemenTempat from './kepegawaian/ManajemenTempat.jsx';
import Penugasan from './kepegawaian/Penugasan.jsx';
import LaporanKepegawaian from './kepegawaian/LaporanKepegawaian.jsx';
import AduanMasuk from './kepegawaian/AduanMasuk.jsx';

// Komponen Wilayah Petugas Lapangan
import BerandaPetugas from './petugas/BerandaPetugas.jsx';
import AbsensiPetugas from './petugas/AbsensiPetugas.jsx';
import PengaduanPetugas from './petugas/PengaduanPetugas.jsx';

// Helper: Ambil role user dari database dengan fallback ke metadata
const fetchUserRole = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'guest';

  const { data } = await supabase.from('pengguna').select('role').eq('auth_id', user.id).single();
  let detectedRole = String(data?.role || '').toLowerCase();

  // Fallback jika ditolak RLS database
  if (!detectedRole && user.user_metadata?.role) {
    detectedRole = String(user.user_metadata.role).toLowerCase();
  }

  // Loloskan meski kosong (default ke petugas jika semua gagal)
  if (!detectedRole) detectedRole = 'petugas';

  return detectedRole;
};

// Role Director Interceptor
const RootRedirect = () => {
  const [role, setRole] = useState(null);

  useEffect(() => {
    fetchUserRole().then(setRole);
  }, []);

  if (!role) {
    return (
      <div className="loading-container">
        <FaRecycle size={60} className="loading-spinner" />
        <h3 className="loading-text">Mendeteksi Otoritas...</h3>
      </div>
    );
  }

  if (role.includes('kepegawaian')) return <Navigate to="/kepegawaian" replace />;
  if (role.includes('petugas')) return <Navigate to="/petugas" replace />;
  if (role === 'guest') return <Navigate to="/login" replace />;

  return <Navigate to="/admin" replace />;
};

// Role Guard: Proteksi route agar hanya bisa diakses oleh role yang diizinkan
// Menggunakan cache sessionStorage agar re-mount saat pindah tab tidak menampilkan loading flash
const RoleGuard = ({ allowedRoles, children }) => {
  // Cek cache dulu untuk menghindari loading flash saat pindah tab
  const cacheKey = `roleGuard_${allowedRoles.join('_')}`;
  const cached = sessionStorage.getItem(cacheKey);
  const [status, setStatus] = useState(cached || 'loading'); // 'loading' | 'allowed' | 'denied'

  useEffect(() => {
    fetchUserRole().then(role => {
      const isAllowed = allowedRoles.some(allowed => role.includes(allowed));
      const result = isAllowed ? 'allowed' : 'denied';
      sessionStorage.setItem(cacheKey, result);
      setStatus(result);
    });
  }, []);

  if (status === 'loading') {
    return (
      <div className="loading-container">
        <FaRecycle size={60} className="loading-spinner" />
        <h3 className="loading-text">Memverifikasi Akses...</h3>
      </div>
    );
  }

  // Jika role tidak cocok, tendang kembali ke "/" agar RootRedirect mengarahkan ke dashboard yang benar
  if (status === 'denied') return <Navigate to="/" replace />;

  return children;
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety net: Bersihkan loginFreeze yang mungkin tersisa dari sesi login gagal/terpotong
    sessionStorage.removeItem('loginFreeze');

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Jika pengguna logout sengaja atau dibuang oleh sistem
      if (event === 'SIGNED_OUT') {
        // Bersihkan cache RoleGuard saat logout
        Object.keys(sessionStorage).forEach(k => { if (k.startsWith('roleGuard_')) sessionStorage.removeItem(k); });
        setSession(null);
        setLoading(false);
        return;
      }

      // Jika fase login sedang memproses validasi keamanan ekstra, tahan state session (jangan diloloskan)
      if (sessionStorage.getItem('loginFreeze') === 'true') {
        return;
      }

      // Jangan re-render jika user tidak berubah (misal: token refresh saat pindah tab)
      // Ini mencegah flickering / white screen flash
      setSession(prev => {
        if (prev?.user?.id && session?.user?.id && prev.user.id === session.user.id) {
          return prev; // User sama, skip re-render
        }
        return session;
      });
      setLoading(false);
    });

    // Pintu rahasia yang akan dipanggil oleh tombol Login setelah semua validasi 100% tuntas
    const handleResolvedAuth = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });
    };
    window.addEventListener('authValidated', handleResolvedAuth);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('authValidated', handleResolvedAuth);
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <FaRecycle size={60} className="loading-spinner" />
        <h3 className="loading-text">Mempersiapkan...</h3>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />

      {/* (2) TAMBAHAN BARU: Route untuk halaman Update Password */}
      <Route path="/update-password" element={<UpdatePassword />} />

      {/* Root Router Auto Redirect Berbasis Jabatan */}
      <Route path="/" element={<RootRedirect />} />

      {/* Rute Khusus Admin — Hanya role Admin yang diizinkan */}
      <Route path="/admin" element={session ? <RoleGuard allowedRoles={['admin']}><Layout /></RoleGuard> : <Navigate to="/login" replace />}>
        <Route index element={<Beranda />} />
        <Route path="absensi" element={<Absensi />} />
        <Route path="profil" element={<Profil />} />
        <Route path="manajemen-petugas" element={<ManajemenPetugas />} />
        <Route path="pengaduan" element={<AduanPetugas />} />
        <Route path="laporan" element={<Laporan />} />
      </Route>

      {/* Rute Khusus Kepegawaian — Hanya role Kepegawaian yang diizinkan */}
      <Route path="/kepegawaian" element={session ? <RoleGuard allowedRoles={['kepegawaian']}><Layout /></RoleGuard> : <Navigate to="/login" replace />}>
        <Route index element={<BerandaKepegawaian />} />
        <Route path="profil" element={<Profil />} /> {/* Menggunakan komponen Profil yang sama */}
        <Route path="manajemen" element={<ManajemenKepegawaian />} />
        <Route path="manajemen-tempat" element={<ManajemenTempat />} />
        <Route path="penugasan" element={<Penugasan />} />
        <Route path="aduan-masuk" element={<AduanMasuk />} />
        <Route path="laporan" element={<LaporanKepegawaian />} />
      </Route>

      {/* Rute Khusus Akses Petugas — Hanya role Petugas yang diizinkan */}
      <Route path="/petugas" element={session ? <RoleGuard allowedRoles={['petugas']}><Layout /></RoleGuard> : <Navigate to="/login" replace />}>
        <Route index element={<BerandaPetugas />} />
        <Route path="profil" element={<Profil />} /> {/* Shared Component */}
        <Route path="absensi" element={<AbsensiPetugas />} />
        <Route path="pengaduan" element={<PengaduanPetugas />} />
      </Route>

    </Routes>
  );
}

export default App;