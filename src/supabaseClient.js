import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// KLIEN UTAMA (AMAN UNTUK FRONTEND)
// Menggunakan sessionStorage agar setiap tab browser memiliki sesi login independen.
// Ini memungkinkan login multi-akun di tab berbeda secara bersamaan.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
  }
});

/**
 * Helper untuk memanggil Vercel Serverless API Routes.
 * Otomatis menyertakan JWT token dari sesi Supabase saat ini.
 *
 * @param {string} endpoint - Path API (contoh: '/api/admin/pengguna')
 * @param {object} options - { method, body } (default GET)
 * @returns {Promise<object>} - Response JSON dari API
 */
export async function apiCall(endpoint, options = {}) {
  const { method = 'GET', body } = options;

  // Ambil token JWT dari sesi aktif
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || '';

  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, fetchOptions);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return data;
}