import { supabase } from './supabase';
import { toast } from '@/components/ui/sonner';

/**
 * Ultra-simple authentication functions
 * No context, no events, just direct calls and navigation
 */

// Simple login function
export async function simpleLogin(email: string, password: string) {
  try {
    toast.loading('Signing in...');
    
    // Basic sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    
    // Handle error
    if (error) {
      console.error('Sign in error:', error);
      
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Please verify your email before signing in');
        window.location.href = '/verify-email?email=' + encodeURIComponent(email);
      } else {
        toast.error(error.message);
      }
      
      return { success: false, error };
    }
    
    // Check for user
    if (!data.user) {
      toast.error('Sign in succeeded but no user data was returned');
      return { success: false, error: new Error('No user data') };
    }
    
    // Success path
    toast.success('Sign in successful!');
    
    // Different paths based on email verification
    if (!data.user.email_confirmed_at) {
      window.location.href = '/verify-email';
      return { success: true, user: data.user };
    }
    
    // Email is verified, check for profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
    
    // Profile error (not PGRST116 which means "not found")
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
      toast.error('Could not load your profile');
      window.location.href = '/dashboard';
      return { success: true, user: data.user, error: profileError };
    }
    
    // No profile found - create one
    if (profileError && profileError.code === 'PGRST116') {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || 'student',
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating profile:', createError);
        toast.error('Could not create your profile');
        window.location.href = '/dashboard';
        return { success: true, user: data.user, error: createError };
      }
      
      // Profile created but needs completion
      window.location.href = '/setup-profile';
      return { success: true, user: data.user, profile: newProfile };
    }
    
    // Profile exists - check if complete
    if (!profile.full_name) {
      window.location.href = '/setup-profile';
      return { success: true, user: data.user, profile };
    }
    
    // Profile is complete, go to dashboard
    window.location.href = '/dashboard';
    return { success: true, user: data.user, profile };
    
  } catch (error) {
    console.error('Exception in simpleLogin:', error);
    toast.error('An unexpected error occurred');
    return { success: false, error };
  }
}

// Simple logout function
export async function simpleLogout() {
  try {
    await supabase.auth.signOut();
    window.location.href = '/login';
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    toast.error('Error signing out');
    return { success: false, error };
  }
}

// Simple signup function
export async function simpleSignup(email: string, password: string, role: 'student' | 'tutor') {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { role },
        emailRedirectTo: `${window.location.origin}/login?verified=true`
      },
    });
    
    if (error) {
      console.error('Sign up error:', error);
      toast.error(error.message);
      return { success: false, error };
    }
    
    toast.success('Account created! Please check your email to verify.');
    window.location.href = '/verify-email?email=' + encodeURIComponent(email);
    return { success: true, user: data.user };
    
  } catch (error) {
    console.error('Exception in simpleSignup:', error);
    toast.error('An unexpected error occurred');
    return { success: false, error };
  }
}

// Simple function to complete a profile
export async function simpleUpdateProfile(userId: string, updates: any) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating profile:', error);
      toast.error('Could not update your profile');
      return { success: false, error };
    }
    
    toast.success('Profile updated successfully!');
    
    if (updates.full_name) {
      // If we're setting the full name, redirect to dashboard
      window.location.href = '/dashboard';
    }
    
    return { success: true, profile: data };
    
  } catch (error) {
    console.error('Exception in simpleUpdateProfile:', error);
    toast.error('An unexpected error occurred');
    return { success: false, error };
  }
}

// Check if user is authenticated
export async function checkAuth() {
  try {
    const { data } = await supabase.auth.getSession();
    return {
      isAuthenticated: !!data?.session?.user,
      user: data?.session?.user,
    };
  } catch (error) {
    console.error('Error checking auth:', error);
    return { isAuthenticated: false, error };
  }
}

// Reset password
export async function simpleResetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );
    
    if (error) {
      console.error('Reset password error:', error);
      toast.error(error.message);
      return { success: false, error };
    }
    
    toast.success('Password reset email sent!');
    return { success: true };
    
  } catch (error) {
    console.error('Exception in simpleResetPassword:', error);
    toast.error('An unexpected error occurred');
    return { success: false, error };
  }
}

// Resend verification email
export async function simpleResendVerification(email: string) {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/login?verified=true`
      }
    });
    
    if (error) {
      console.error('Resend verification error:', error);
      toast.error(error.message);
      return { success: false, error };
    }
    
    toast.success('Verification email sent!');
    return { success: true };
    
  } catch (error) {
    console.error('Exception in simpleResendVerification:', error);
    toast.error('An unexpected error occurred');
    return { success: false, error };
  }
}

// Clear all auth data from browser
export async function clearAuthData() {
  try {
    // Sign out
    await supabase.auth.signOut({ scope: 'global' });
    
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    toast.success('Auth data cleared');
    window.location.href = '/login';
    return { success: true };
    
  } catch (error) {
    console.error('Error clearing auth data:', error);
    toast.error('Error clearing auth data');
    return { success: false, error };
  }
}