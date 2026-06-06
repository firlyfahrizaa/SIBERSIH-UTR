-- === SQL SCRIPT UNTUK MENGAMANKAN DATABASE SIBERSIH-STTR ===
-- Buka Dashboard Supabase -> SQL Editor -> New Query. Paste dan jalankan ini.

-- 1. AKTIFKAN RLS PADA SEMUA TABEL
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengguna ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengaduan ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembagian_tugas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tempat ENABLE ROW LEVEL SECURITY;

-- 2. KEBIJAKAN (POLICIES) UNTUK ADMIN DAN KEPEGAWAIAN
-- Memberikan akses dewa (ALL) kepada akun yang memiliki role Admin atau Kepegawaian di tabel "pengguna"
-- Pertama, buat fungsi helper untuk mendeteksi siapa yang login:
CREATE OR REPLACE FUNCTION is_admin_or_kepegawaian()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pengguna 
    WHERE auth_id = auth.uid() 
    AND role IN ('Admin', 'Kepegawaian')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Terapkan kebijakan Admin ke semua tabel
CREATE POLICY "Admin All Access Absensi" ON absensi FOR ALL USING (is_admin_or_kepegawaian());
CREATE POLICY "Admin All Access Aduan" ON pengaduan FOR ALL USING (is_admin_or_kepegawaian());
CREATE POLICY "Admin All Access Pengguna" ON pengguna FOR ALL USING (is_admin_or_kepegawaian());
CREATE POLICY "Admin All Access Tugas" ON pembagian_tugas FOR ALL USING (is_admin_or_kepegawaian());
CREATE POLICY "Admin All Access Tempat" ON tempat FOR ALL USING (is_admin_or_kepegawaian());

-- 3. KEBIJAKAN (POLICIES) UNTUK PETUGAS (Self-Service)
-- Petugas HANYA boleh membaca data profilnya sendiri
CREATE POLICY "Petugas Info Sendiri" ON pengguna FOR SELECT USING (auth_id = auth.uid());

-- Petugas bisa melihat tempat/tugasnya sendiri
CREATE POLICY "Petugas Tugas Sendiri" ON pembagian_tugas FOR SELECT USING (
  nip_petugas = (SELECT nip FROM pengguna WHERE auth_id = auth.uid() LIMIT 1)
);

CREATE POLICY "Petugas Baca Tempat" ON tempat FOR SELECT USING (true); -- Tempat bersifat publik untuk di-query

-- Petugas HANYA bisa mengirim, mengubah, dan membaca absensi miliknya sendiri
CREATE POLICY "Petugas Absensi Sendiri" ON absensi FOR ALL USING (
  nip_petugas = (SELECT nip FROM pengguna WHERE auth_id = auth.uid() LIMIT 1)
);

-- Petugas HANYA bisa mengirim, mengubah, dan membaca pengaduan miliknya sendiri
CREATE POLICY "Petugas Pengaduan Sendiri" ON pengaduan FOR ALL USING (
  nip_petugas = (SELECT nip FROM pengguna WHERE auth_id = auth.uid() LIMIT 1)
);

-- Note: Policies tambahan dapat Anda sesuaikan lebih lanjut jika kurang mendetail.
