import { supabase } from './supabase';
import { toast } from '@/components/ui/sonner';

/**
 * Check authentication status directly with Supabase
 * Returns detailed status information about the current session
 */
export async function checkAuthStatus() {
  try {
    console.log('Checking auth status directly with Supabase');
    
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error checking session:', sessionError);
      return {
        isAuthenticated: false,
        isVerified: false,
        hasProfile: false,
        isProfileComplete: false,
        user: null,
        profile: null,
        error: sessionError
      };
    }
    
    // No session
    if (!sessionData?.session?.user) {
      console.log('No active session found');
      return {
        isAuthenticated: false,
        isVerified: false,
        hasProfile: false,
        isProfileComplete: false,
        user: null,
        profile: null
      };
    }
    
    const user = sessionData.session.user;
    
    // Check email verification
    const isVerified = !!user.email_confirmed_at;
    console.log('User verified:', isVerified);
    
    // If not verified, return early
    if (!isVerified) {
      return {
        isAuthenticated: true,
        isVerified: false,
        hasProfile: false, 
        isProfileComplete: false,
        user,
        profile: null
      };
    }
    
    // Check profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    // Error fetching profile
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
      return {
        isAuthenticated: true,
        isVerified: true,
        hasProfile: false,
        isProfileComplete: false,
        user,
        profile: null,
        error: profileError
      };
    }
    
    // No profile
    if (profileError && profileError.code === 'PGRST116') {
      console.log('No profile found for user');
      return {
        isAuthenticated: true, 
        isVerified: true,
        hasProfile: false,
        isProfileComplete: false,
        user,
        profile: null
      };
    }
    
    // Has profile - check if complete
    const isProfileComplete = !!profileData?.full_name;
    
    return {
      isAuthenticated: true,
      isVerified: true,
      hasProfile: true,
      isProfileComplete,
      user,
      profile: profileData
    };
    
  } catch (error) {
    console.error('Exception checking auth status:', error);
    return {
      isAuthenticated: false,
      isVerified: false,
      hasProfile: false,
      isProfileComplete: false,
      user: null,
      profile: null,
      error
    };
  }
}

/**
 * Reset all authentication state in the browser
 * This will clear localStorage, sessionStorage, and sign out the user
 */
export async function resetAuthState() {
  try {
    console.log('Resetting auth state');
    
    // Clear all auth-related flags
    localStorage.removeItem('auth_debug');
    localStorage.removeItem('direct_signin');
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.removeItem('supabase.auth.token');
    
    // Force sign out
    await supabase.auth.signOut({ scope: 'global' });
    
    console.log('Auth state reset complete');
    toast.success('Authentication state has been completely reset');
    
    // Force reload the page
    window.location.href = '/login';
  } catch (error) {
    console.error('Error resetting auth state:', error);
    toast.error('Failed to reset authentication state');
  }
}

/**
 * Navigate user based on their current auth status
 * Will determine the appropriate page based on verification and profile completion
 */
export async function navigateByAuthStatus() {
  try {
    const status = await checkAuthStatus();
    
    if (!status.isAuthenticated) {
      // Not authenticated - go to login
      window.location.href = '/login';
      return;
    }
    
    if (!status.isVerified) {
      // Not verified - go to verification
      window.location.href = '/verify-email';
      return;
    }
    
    if (!status.hasProfile || !status.isProfileComplete) {
      // Profile missing or incomplete - go to setup
      window.location.href = '/setup-profile';
      return;
    }
    
    // All good - go to dashboard
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('Error navigating by auth status:', error);
    toast.error('Could not determine your authentication status');
    window.location.href = '/login';
  }
}