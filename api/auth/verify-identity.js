import { supabaseAdmin, jsonResponse, errorResponse } from '../lib/adminClient.js';

/**
 * POST /api/auth/verify-identity
 * Verifikasi kombinasi Email + NIP di tabel pengguna.
 * Digunakan untuk fitur reset password (user belum login, tanpa auth).
 * 
 * Body: { email, nip }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'Method not allowed' });
  }

  try {
    const { email, nip } = req.body;

    if (!email || !nip) {
      return jsonResponse(res, 400, { error: 'Email dan NIP wajib diisi.' });
    }

    // Query tabel pengguna menggunakan admin client (bypass RLS)
    const { data: pengguna, error: dbErr } = await supabaseAdmin
      .from('pengguna')
      .select('nip, email')
      .eq('email', email)
      .single();

    if (dbErr || !pengguna || String(pengguna.nip) !== String(nip)) {
      return jsonResponse(res, 404, {
        error: 'Kombinasi Email dan NIP tidak ditemukan atau tidak sesuai.',
      });
    }

    return jsonResponse(res, 200, { verified: true });
  } catch (err) {
    return errorResponse(res, err);
  }
}
