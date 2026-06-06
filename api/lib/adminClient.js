import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

/**
 * Supabase Admin Client — hanya digunakan di server-side (API Routes).
 * Menggunakan Service Role Key dari process.env (TIDAK ter-expose ke browser).
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Verifikasi JWT token dari header Authorization.
 * Mengembalikan data user jika valid, throw error jika tidak.
 */
export async function verifyAuth(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Token tidak ditemukan.');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new Error('Unauthorized: Token tidak valid atau kedaluwarsa.');
  }

  return user;
}

/**
 * Verifikasi bahwa user memiliki role Admin atau Kepegawaian.
 */
export async function verifyAdminRole(req) {
  const user = await verifyAuth(req);

  const { data: pengguna, error } = await supabaseAdmin
    .from('pengguna')
    .select('role')
    .eq('auth_id', user.id)
    .single();

  if (error || !pengguna) {
    throw new Error('Forbidden: Data pengguna tidak ditemukan.');
  }

  const role = String(pengguna.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'kepegawaian') {
    throw new Error('Forbidden: Anda tidak memiliki akses admin.');
  }

  return { user, role };
}

/**
 * Helper untuk mengirim response JSON.
 */
export function jsonResponse(res, statusCode, data) {
  res.status(statusCode).json(data);
}

/**
 * Helper untuk mengirim error response.
 */
export function errorResponse(res, error) {
  const statusCode = error.message.includes('Unauthorized') ? 401
    : error.message.includes('Forbidden') ? 403
    : 500;
  res.status(statusCode).json({ error: error.message });
}
