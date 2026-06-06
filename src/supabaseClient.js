import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 1. KLIEN UTAMA (AMAN UNTUK FRONTEND)
// Menggunakan sessionStorage agar setiap tab browser memiliki sesi login independen.
// Ini memungkinkan login multi-akun di tab berbeda secara bersamaan.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
  }
});

// 2. KLIEN ADMIN (HANYA UNTUK LOCAL DEVELOPMENT)
// PENTING: Variabel ini SENGAJA menggunakan nama TANPA prefix "VITE_"
// sehingga TIDAK akan ter-bundle/terekspos ke browser oleh Vite.
// Pada production build, supabaseServiceKey akan bernilai `undefined`
// dan supabaseAdmin tidak akan berfungsi — ini adalah PENGAMAN.
//
// Untuk production, pindahkan semua operasi admin ke:
// - Supabase Edge Functions, atau
// - Vercel Serverless API Routes
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;