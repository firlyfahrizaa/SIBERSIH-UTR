import React, { useState } from 'react';
import { Card } from '../components/common';
import { supabase } from '../supabaseClient';
import { FaPaperPlane, FaExclamationTriangle } from 'react-icons/fa';

function PengaduanPetugas() {
  const [isi, setIsi] = useState('');
  const [lampiran, setLampiran] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    let validFiles = [];
    for (let file of files) {
      if (file.size > 1048576) {
        alert(`Maaf, foto ${file.name} melebihi batas 1MB.`);
      } else {
        validFiles.push(file);
      }
    }
    setLampiran(validFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isi) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('pengguna').select('nip').eq('auth_id', user.id).single();

      let finalFotoUrls = [];

      // Fase 1: Upload File ke CDN Bucket Supabase Storage
      if (lampiran && lampiran.length > 0) {
        for (let i = 0; i < lampiran.length; i++) {
          const fileExt = lampiran[i].name.split('.').pop();
          const fileName = `aduan_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('images').upload(fileName, lampiran[i]);
          if (uploadError) throw new Error("Gagal mengunggah foto: " + uploadError.message);
          const { data: finalUrlData } = supabase.storage.from('images').getPublicUrl(fileName);
          finalFotoUrls.push(finalUrlData.publicUrl);
        }
      }

      // Fase 2: Catat menggunakan mekanisme bypass secure RLS ke tabel
      const payload = {
        nip_petugas: profile.nip,
        deskripsi: isi,
        status: 'Pending'
      };

      if (finalFotoUrls.length > 0) payload.foto_url = finalFotoUrls.join(',');

      const { error } = await supabase.from('pengaduan').insert([payload]);
      if (error) throw new Error("Database gagal menyimpan pengaduan. Apakah kolom 'foto_url' sudah Anda tambahkan di tabel pengaduan?: " + error.message);

      alert('Terkirim! Pengaduan dan lampiran foto (jika ada) telah mendarat ke radar Admin.');
      setIsi('');
      setLampiran([]);
      // Reset input form file secara native
      const fileInput = document.getElementById("fileLampiranAduan");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      alert('Kegagalan Mesin: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <FaExclamationTriangle size={24} color="#f59e0b" />
        <h3 style={{ margin: 0 }}>Portal Pengaduan & Bantuan SIBERSIH</h3>
      </div>
      <p style={{ color: '#64748b', marginBottom: '20px', lineHeight: 1.6 }}>Apakah plafon Toilet roboh? Ataukah barang di Gudang menghilang? <br />Gunakan layanan pengaduan di bawah ini untuk melaporkan kerusakan atau keluhan yang akan dibaca langsung oleh Admin untuk diteruskan ke Kepegawaian dan akan segera ditindaklanjuti.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <textarea
          required
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          rows="6"
          placeholder="Ceritakan dengan detail titik lokasi dan jenis kerusakannya..."
          style={{ padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical', fontSize: '15px' }}>
        </textarea>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Lampiran Bukti Foto (Opsional - Max 1MB)</label>
          <input
            id="fileLampiranAduan"
            multiple
            type="file"
            accept="image/jpeg, image/png, image/webp"
            onChange={handleFileChange}
            style={{ padding: '10px', borderRadius: '8px', border: '1px dashed #cbd5e1', background: '#f8fafc', color: '#64748b', cursor: 'pointer' }}
          />
        </div>

        <button type="submit" disabled={loading} style={{ marginTop: '5px', background: '#f59e0b', color: 'white', padding: '16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s', opacity: loading ? 0.7 : 1 }}>
          <FaPaperPlane /> {loading ? 'Sedang Merekam...' : 'Kirim Aduan Sekarang'}
        </button>
      </form>
    </Card>
  );
}
export default PengaduanPetugas;
