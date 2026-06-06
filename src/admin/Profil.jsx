/**
 * Halaman Profil Pengguna
 * Menampilkan dan mengubah informasi profil user dari Supabase
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../components/common';
import { supabase, supabaseAdmin } from '../supabaseClient';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';

function Profil() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [profileData, setProfileData] = useState({
    nama: '',
    email: '',
    role: '',
    alamat: '',
    nomor_telepon: '',
    jenis_kelamin: true, // true = Laki-laki, false = Perempuan
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    
    if (user && !authErr) {
      setUserId(user.id);
      
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('pengguna')
        .select('*')
        .eq('auth_id', user.id)
        .single();
        
      if (data && !error) {
        setProfileData({
          nama: data.nama || '',
          email: data.email || '',
          role: data.role || '',
          alamat: data.alamat || '',
          nomor_telepon: data.nomor_telepon || '',
          jenis_kelamin: data.jenis_kelamin === null ? true : data.jenis_kelamin,
        });
      } else {
        // Fallback jika tidak ada record di tabel pengguna
        setProfileData(prev => ({
          ...prev,
          nama: user.user_metadata?.nama || user.email.split('@')[0],
          email: user.email,
          role: user.user_metadata?.role || 'Pengguna'
        }));
      }
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: type === 'radio' ? (value === 'true') : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    
    try {
      // Update email di layer autentikasi bila di-edit (Admin API = langsung aktif, tanpa konfirmasi email)
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email !== profileData.email) {
        if (!supabaseAdmin) throw new Error('Admin client tidak tersedia untuk mengubah email. Hubungi administrator.');
        const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { email: profileData.email, email_confirm: true }
        );
        if (updateAuthErr) throw new Error("Gagal mengubah email autentikasi: " + updateAuthErr.message);
      }

      // Update data ke Supabase menggunakan Admin client untuk bypass RLS (Gunakan auth_id sebagai sasaran)
      const adminClient = supabaseAdmin || supabase;
      const { error } = await adminClient
        .from('pengguna')
        .update({
          nama: profileData.nama,
          email: profileData.email,
          alamat: profileData.alamat,
          nomor_telepon: profileData.nomor_telepon,
          jenis_kelamin: profileData.jenis_kelamin
        })
        .eq('auth_id', userId);

      if (error) {
        throw new Error('Gagal mencetak rekam jejak identitas: ' + error.message);
      } else {
        setIsEditing(false);
        alert('Identitas Diri berhasil diperbarui secara menyeluruh!');
        // Beritahu Topbar untuk memuat ulang namanya
        window.dispatchEvent(new Event('profileUpdated'));
      }
    } catch (error) {
      alert(error.message);
    }
    
    setSaving(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassSubmitting(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (!user || authErr) throw new Error("Kehilangan sesi Auth atau Ditolak Server.");

      // Supabase updateUser tidak mewajibkan 'old password', tapi demi keamanan flow kita validasi manual:
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (signInErr) {
        throw new Error("Password lama salah! Sistem menolak.");
      }

      // Jika password lama lolos tes di atas, update ke password baru
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw new Error(updateErr.message);

      alert("Sandi berhasil diubah! Kunci operasional Anda kini terkunci rapat.");
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      alert("Gagal merubah password: " + err.message);
    }
    setPassSubmitting(false);
  };

  if (loading) {
    return <Card><p>Memuat spesifikasi profil...</p></Card>;
  }

  return (
    <>
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Profil Pengguna</h3>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Edit Profil
          </button>
        )}
      </div>
      
      {!isEditing ? (
        <div className="profile-content">
          <div className="profile-avatar" style={{ fontSize: '40px', background: '#e2e8f0', color: '#475569', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '80px', height: '80px', borderRadius: '50%', fontWeight: 'bold' }}>
            {profileData.nama ? profileData.nama.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="profile-info" style={{ marginTop: '15px' }}>
            <h2>{profileData.nama}</h2>
            <p className="profile-meta" style={{ textTransform: 'capitalize' }}><strong>Role:</strong> {profileData.role}</p>
            <p className="profile-meta"><strong>Email:</strong> {profileData.email}</p>
            <p className="profile-meta"><strong>No. Telepon:</strong> {profileData.nomor_telepon || '-'}</p>
            <p className="profile-meta"><strong>Jenis Kelamin:</strong> {profileData.jenis_kelamin ? 'Laki-laki' : 'Perempuan'}</p>
            <p className="profile-meta"><strong>Alamat:</strong> {profileData.alamat || '-'}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '500px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 600, fontSize: '14px' }}>Nama Lengkap</label>
            <input 
              type="text" 
              name="nama"
              value={profileData.nama} 
              onChange={handleChange}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              required 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 600, fontSize: '14px' }}>Email Akses</label>
            <input 
              type="email" 
              name="email"
              value={profileData.email} 
              onChange={handleChange}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 600, fontSize: '14px' }}>Role (Sistem)</label>
            <input 
              type="text" 
              value={profileData.role} 
              disabled
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#64748b' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 600, fontSize: '14px' }}>Nomor Telepon</label>
            <input 
              type="text" 
              name="nomor_telepon"
              value={profileData.nomor_telepon} 
              onChange={handleChange}
              placeholder="08xxxxxxxxxx"
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 600, fontSize: '14px' }}>Jenis Kelamin</label>
            <div style={{ display: 'flex', gap: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="jenis_kelamin" 
                  value="true" 
                  checked={profileData.jenis_kelamin === true} 
                  onChange={handleChange} 
                />
                Laki-laki
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="jenis_kelamin" 
                  value="false" 
                  checked={profileData.jenis_kelamin === false} 
                  onChange={handleChange} 
                />
                Perempuan
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 600, fontSize: '14px' }}>Alamat Lengkap</label>
            <textarea 
              name="alamat"
              value={profileData.alamat} 
              onChange={handleChange}
              rows="3"
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', resize: 'vertical' }}
            ></textarea>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              type="submit"
              disabled={saving}
              style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <button 
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={saving}
              style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e0', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </Card>

    {/* Form Ubah Password Standalone Card */}
    <Card style={{ marginTop: '20px' }}>
      <h3 style={{ margin: '0 0 15px 0' }}>Ubah Password</h3>
      <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '500px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontWeight: 600, fontSize: '14px' }}>Masukkan password lama anda</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type={showOldPass ? 'text' : 'password'} 
              value={oldPassword} 
              onChange={(e) => setOldPassword(e.target.value)} 
              required
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowOldPass(!showOldPass)}
              style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}
              title={showOldPass ? 'Sembunyikan' : 'Lihat password'}
            >
              {showOldPass ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontWeight: 600, fontSize: '14px' }}>Masukkan password baru anda</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type={showNewPass ? 'text' : 'password'} 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required
              minLength="6"
              placeholder="Min. 6 karakter rahasia"
              style={{ width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowNewPass(!showNewPass)}
              style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}
              title={showNewPass ? 'Sembunyikan' : 'Lihat password'}
            >
              {showNewPass ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
            </button>
          </div>
        </div>
        <button 
          type="submit"
          disabled={passSubmitting}
          style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: passSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: 'max-content', marginTop: '10px' }}
        >
          {passSubmitting ? 'Memeriksa Keamanan Brangkas...' : 'Ganti Kunci Sandi Baru'}
        </button>
      </form>
    </Card>
    </>
  );
}

export default Profil;