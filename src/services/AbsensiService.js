import { supabase } from '../supabaseClient';

export const AbsensiService = {
  /**
   * Mengambil riwayat absensi dengan paginasi server-side
   */
  async getRiwayatAbsensiPetugas(nip, page = 1, limit = 5, monthsAgo = 6) {
    let query = supabase
      .from('absensi')
      .select('*', { count: 'exact' })
      .eq('nip_petugas', nip);

    if (monthsAgo > 0) {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1).toISOString();
      query = query.gte('waktu', startDate);
    }

    query = query.order('waktu', { ascending: false });

    if (limit !== 'Semua') {
      const offset = (page - 1) * parseInt(limit);
      const to = offset + parseInt(limit) - 1;
      query = query.range(offset, Math.max(offset, to));
    }

    const { data, count, error } = await query;
    if (error) throw error;
    
    return { data, count };
  },

  /**
   * Mengambil cek absensi untuk mendeteksi apakah sudah absen hari ini
   */
  async cekAbsensiHariIni(nip) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('absensi')
      .select('id_absensi')
      .eq('nip_petugas', nip)
      .gte('waktu', startOfToday.toISOString())
      .limit(1);

    if (error) throw error;
    return !!(data && data.length > 0);
  },

  /**
   * Insert absensi baru
   */
  async submitAbsensiBiometrik(nip, signatureBase64) {
    const { error } = await supabase.from('absensi').insert([{
      nip_petugas: nip,
      status: 'Menunggu Verifikasi',
      foto_url: signatureBase64,
      deskripsi: 'Belum Melaporkan Checklist (Menunggu)'
    }]);
    if (error) throw error;
  }
};
