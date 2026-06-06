import { supabaseAdmin, verifyAdminRole, jsonResponse, errorResponse } from '../lib/adminClient.js';

/**
 * POST /api/admin/delete-user
 * Menghapus Auth user via Supabase Admin API.
 * 
 * Body: { auth_id }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'Method not allowed' });
  }

  try {
    await verifyAdminRole(req);

    const { auth_id } = req.body;

    if (!auth_id) {
      return jsonResponse(res, 400, { error: 'auth_id wajib diisi.' });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(auth_id);
    if (error) {
      return jsonResponse(res, 400, { error: 'Gagal menghapus user: ' + error.message });
    }

    return jsonResponse(res, 200, { success: true });
  } catch (err) {
    return errorResponse(res, err);
  }
}
