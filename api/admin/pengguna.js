import { supabaseAdmin, verifyAdminRole, jsonResponse, errorResponse } from '../lib/adminClient.js';

/**
 * GET /api/admin/pengguna
 * Mengambil seluruh data tabel pengguna (bypass RLS).
 * Memerlukan auth token dengan role Admin atau Kepegawaian.
 * 
 * Query params opsional:
 *   ?auth_id=xxx  → filter by auth_id (untuk profil sendiri)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return jsonResponse(res, 405, { error: 'Method not allowed' });
  }

  try {
    await verifyAdminRole(req);

    let query = supabaseAdmin.from('pengguna').select('*');

    // Filter opsional berdasarkan auth_id
    const { auth_id } = req.query;
    if (auth_id) {
      query = query.eq('auth_id', auth_id).single();
    }

    const { data, error } = await query;

    if (error) {
      return jsonResponse(res, 400, { error: error.message });
    }

    return jsonResponse(res, 200, { data });
  } catch (err) {
    return errorResponse(res, err);
  }
}
