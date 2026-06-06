import { supabase } from '../supabaseClient';

export const PenggunaService = {
  /**
   * Mengambil profil pengguna berdasarkan Auth ID
   */
  async getProfileByAuthId(authId) {
    const { data, error } = await supabase
      .from('pengguna')
      .select('*')
      .eq('auth_id', authId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },
  
  async getCurrentUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return this.getProfileByAuthId(user.id);
  }
};
