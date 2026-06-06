import React, { useState, useEffect } from 'react';
import { supabase, apiCall } from '../supabaseClient';
import { FaRecycle, FaKey } from 'react-icons/fa';
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";
import './Login.css';

const AnimatedBackground = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Hindari binding MouseMove di tampilan mobile sama sekali untuk menghemat RAM & CPU (100% Sat-Set)
    if (window.innerWidth <= 768) return;

    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) - 0.5,
        y: (e.clientY / window.innerHeight) - 0.5
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>

      {/* Wrapper Parallax terpisah agar transform CSS dan React tidak saling membentur */}
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${mousePos.x * -150}px, ${mousePos.y * -150}px)`, transition: 'transform 0.3s ease-out' }}>
        <div className="abstract-shape shape1"></div>
      </div>

      <div style={{ position: 'absolute', inset: 0, transform: `translate(${mousePos.x * 250}px, ${mousePos.y * 250}px)`, transition: 'transform 0.3s ease-out' }}>
        <div className="abstract-shape shape2"></div>
      </div>

      <div className="desktop-only-shape" style={{ position: 'absolute', inset: 0, transform: `translate(${mousePos.x * -350}px, ${mousePos.y * 300}px)`, transition: 'transform 0.3s ease-out' }}>
        <div className="abstract-shape shape3"></div>
      </div>

      <div className="desktop-only-shape" style={{ position: 'absolute', inset: 0, transform: `translate(${mousePos.x * 200}px, ${mousePos.y * -200}px)`, transition: 'transform 0.3s ease-out' }}>
        <div className="abstract-shape shape4"></div>
      </div>
    </div>
  );
};

const Login = () => {
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(sessionStorage.getItem('loginError') || '');
  const [showResetForm, setShowResetForm] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem('loginError');
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email || !nip) {
      setErrorMsg('Isi Email dan NIP terlebih dahulu.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Verifikasi identitas: Cek apakah Email dan NIP cocok di tabel pengguna
      // Memanggil API route server-side (tanpa auth karena user belum login)
      await apiCall('/api/auth/verify-identity', {
        method: 'POST',
        body: { email, nip },
      });

      // 2. Jika cocok, kirim email reset password via SMTP
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (resetErr) {
        throw new Error('Gagal mengirim link reset: ' + resetErr.message);
      }

      alert('Link reset password berhasil dikirim! Silakan cek inbox/spam email Anda.');

      setShowResetForm(false);

    } catch (err) {
      setErrorMsg(err.message);
    }
    setLoading(false);
  };

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Beri tahu App.jsx untuk JANGAN memuat Dashboard sebelum semuanya divalidasi
    sessionStorage.setItem('loginFreeze', 'true');

    // Tahap 1: Autentikasi dasar dengan Email & Password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      sessionStorage.removeItem('loginFreeze');
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }

    // Tahap 2: Validasi ekstra untuk NIP dan Role dari tabel pengguna (Atau Bypass dari Meta)
    if (authData?.user) {
      let finalRole = '';
      let finalNip = '';

      const { data: penggunaData, error: dbError } = await supabase
        .from('pengguna')
        .select('nip, role')
        .eq('auth_id', authData.user.id)
        .single();

      if (penggunaData && !dbError) {
        finalRole = penggunaData.role;
        finalNip = penggunaData.nip;
      } else {
        // Fallback Jitu: Jika RLS Database memblokir bacaan atau telat tersinkron, kita pungut dari memori Auth Supabase!
        if (authData.user.user_metadata?.role) {
          finalRole = authData.user.user_metadata.role;
          finalNip = authData.user.user_metadata.nip;
        } else {
          await supabase.auth.signOut();
          setErrorMsg('Akses ditolak: Data pengguna belum berizin atau tidak ada di sistem.');
          setLoading(false);
          return;
        }
      }

      // Validasi NIP
      if (String(finalNip) !== nip) {
        sessionStorage.removeItem('loginFreeze');
        setErrorMsg('Email, NIP, atau Password salah!');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Finalisasi Sesi
      sessionStorage.setItem('loginFreeze', 'false');
      const userRole = String(finalRole || '').toLowerCase();

      // Validasi Role Ketat Sesuai Jabatan
      if (isAdminLogin) {
        if (userRole !== 'admin' && userRole !== 'kepegawaian') {
          sessionStorage.removeItem('loginFreeze');
          setErrorMsg('Akses Ditolak!');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
      } else {
        if (userRole !== 'petugas') {
          sessionStorage.removeItem('loginFreeze');
          setErrorMsg('Akses Ditolak!');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
      }

      // LOLOS SEMUA VALIDASI! Beri aba-aba kepada App.jsx untuk memuat Dashboard.
      sessionStorage.removeItem('loginFreeze');
      window.dispatchEvent(new Event('authValidated'));
    }

    setLoading(false);
  };

  return (
    <div className="login-container">

      <AnimatedBackground />

      <div className="login-card">
        <div className="login-header text-center">
          <div className="login-logo"><FaRecycle /></div>
          <h2 className="login-title">
            {isAdminLogin ? 'SIBERSIH Admin' : 'SIBERSIH'}
          </h2>
          <p className="login-subtitle">
            Masuk untuk melanjutkan ke Dashboard
          </p>
        </div>

        {errorMsg && (
          <div className="error-alert">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuthAction} className="login-form">

          {/* Kolom Email */}
          <div className="form-group-login">
            <label className="form-label-login">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh@sibersih.com"
              required
              className="form-input-login"
            />
          </div>

          {/* Kolom NIP (Wajib) */}
          <div className="form-group-login">
            <label className="form-label-login">NIP</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={nip}
              onChange={(e) => setNip(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Nomor Induk Pegawai"
              required
              className="form-input-login"
            />
          </div>

          {/* Kolom Password */}
          <div className="form-group-login">
            <label className="form-label-login">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="form-input-login input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="btn-toggle-password"
                title={showPassword ? "Sembunyikan password" : "Lihat password"}
              >
                {showPassword ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-login-submit"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>

          {/* Alternate links */}
          <div className="login-links">
            <span
              onClick={() => {
                setIsAdminLogin(!isAdminLogin);
                setErrorMsg('');
              }}
              className="link-primary"
            >
              {isAdminLogin ? 'Login sebagai petugas' : 'Login sebagai admin'}
            </span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span
              onClick={() => { setShowResetForm(true); setErrorMsg(''); }}
              className="link-warning"
            >
              Lupa Password?
            </span>
          </div>
        </form>

        {/* Modal Reset Password */}
        {showResetForm && (
          <div className="reset-modal">
            <h3 className="reset-modal-title"><FaKey style={{ marginRight: "8px" }} /> Lupa Password?</h3>
            <p className="reset-modal-desc">
              Masukkan <b>Email</b> dan <b>NIP</b> Anda yang terdaftar pada form di atas. Kami akan mengirimkan link untuk mereset password ke email Anda.
            </p>
            <form onSubmit={handleResetPassword} className="reset-form">
              <div className="reset-btn-group">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-reset-submit"
                >
                  {loading ? 'Mencocokkan Data...' : 'Kirim Link Reset'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowResetForm(false); setErrorMsg(''); }}
                  className="btn-reset-cancel"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;