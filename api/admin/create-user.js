import { supabaseAdmin, verifyAdminRole, jsonResponse, errorResponse } from '../lib/adminClient.js';

/**
 * POST /api/admin/create-user
 * Membuat Auth user baru via Supabase Admin API.
 * 
 * Body: { email, password, nama, role, nip, alamat, nomor_telepon, jenis_kelamin }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'Method not allowed' });
  }

  try {
    await verifyAdminRole(req);

    const { email, password, nama, role, nip, alamat, nomor_telepon, jenis_kelamin } = req.body;

    if (!email || !password || !nip) {
      return jsonResponse(res, 400, { error: 'Email, password, dan NIP wajib diisi.' });
    }

    // Buat Auth User dengan metadata
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nama,
        role,
        nip,
        alamat,
        nomor_telepon,
        jenis_kelamin,
      },
    });

    if (authError) {
      return jsonResponse(res, 400, { error: authError.message });
    }

    return jsonResponse(res, 201, { data: newUser });
  } catch (err) {
    return errorResponse(res, err);
  }
}
