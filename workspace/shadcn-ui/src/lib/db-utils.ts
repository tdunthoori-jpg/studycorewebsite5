import { supabase, Profile } from './supabase';

/**
 * Utility functions for database operations
 */
export const dbUtils = {
  /**
   * Creates a user profile with the basic required fields
   * This is designed to be more reliable than the standard profile creation
   * by using direct SQL with proper error handling
   */
  createUserProfile: async (
    userId: string,
    email: string,
    role: 'student' | 'tutor'
  ): Promise<boolean> => {
    try {
      console.log('DB Utils: Creating user profile for:', userId);
      
      // First check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (existingProfile) {
        console.log('DB Utils: Profile already exists for user:', userId);
        return true;
      }
      
      // Create profile using direct SQL to bypass RLS issues
      const { data, error } = await supabase.rpc('create_basic_profile', {
        p_user_id: userId,
        p_email: email,
        p_role: role
      });
      
      if (error) {
        console.error('DB Utils: Error creating profile via RPC:', error);
        
        // Fallback: Try direct insert with minimal fields
        const timestamp = new Date().toISOString();
        const { error: insertError } = await supabase.from('profiles').insert({
          user_id: userId,
          email,
          role,
          created_at: timestamp,
          updated_at: timestamp
        });
        
        if (insertError) {
          console.error('DB Utils: Fallback insert failed:', insertError);
          return false;
        }
        
        console.log('DB Utils: Profile created via fallback insert');
        return true;
      }
      
      console.log('DB Utils: Profile created successfully via RPC');
      return true;
    } catch (error) {
      console.error('DB Utils: Exception creating profile:', error);
      return false;
    }
  },
  
  /**
   * Fetches a user profile by user ID
   */
  getUserProfile: async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error) {
        console.error('DB Utils: Error fetching profile:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('DB Utils: Exception fetching profile:', error);
      return null;
    }
  },
  
  /**
   * Updates fields in a user profile
   */
  updateUserProfile: async (userId: string, updates: Partial<Profile>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
        
      if (error) {
        console.error('DB Utils: Error updating profile:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('DB Utils: Exception updating profile:', error);
      return false;
    }
  }
};