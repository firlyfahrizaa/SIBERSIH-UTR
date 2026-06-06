import { supabaseAdmin, verifyAdminRole, jsonResponse, errorResponse } from '../lib/adminClient.js';

/**
 * POST /api/admin/update-user
 * Update data pengguna di Auth layer dan/atau tabel pengguna.
 * 
 * Body: { auth_id, nip, email, nama, alamat, nomor_telepon, role, jenis_kelamin }
 *   - auth_id: ID Auth user untuk update email di layer autentikasi
 *   - nip: Primary key di tabel pengguna (target update)
 *   - Sisanya: field yang akan diupdate
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'Method not allowed' });
  }

  try {
    await verifyAdminRole(req);

    const { auth_id, nip, email, nama, alamat, nomor_telepon, role, jenis_kelamin } = req.body;

    if (!nip && !auth_id) {
      return jsonResponse(res, 400, { error: 'NIP atau auth_id wajib diisi.' });
    }

    // 1. Update email di Auth layer jika auth_id dan email disediakan
    if (auth_id && email) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(auth_id, {
        email,
        email_confirm: true,
      });
      if (authErr) {
        return jsonResponse(res, 400, { error: 'Gagal update email Auth: ' + authErr.message });
      }
    }

    // 2. Update data di tabel pengguna
    const updatePayload = {};
    if (nama !== undefined) updatePayload.nama = nama;
    if (email !== undefined) updatePayload.email = email;
    if (alamat !== undefined) updatePayload.alamat = alamat;
    if (nomor_telepon !== undefined) updatePayload.nomor_telepon = nomor_telepon;
    if (role !== undefined) updatePayload.role = role;
    if (jenis_kelamin !== undefined) updatePayload.jenis_kelamin = jenis_kelamin;

    // Tentukan target: gunakan nip jika ada, fallback ke auth_id
    let query = supabaseAdmin.from('pengguna').update(updatePayload);
    if (nip) {
      query = query.eq('nip', nip);
    } else {
      query = query.eq('auth_id', auth_id);
    }

    const { error: dbErr } = await query;
    if (dbErr) {
      return jsonResponse(res, 400, { error: 'Gagal update data pengguna: ' + dbErr.message });
    }

    return jsonResponse(res, 200, { success: true });
  } catch (err) {
    return errorResponse(res, err);
  }
}
