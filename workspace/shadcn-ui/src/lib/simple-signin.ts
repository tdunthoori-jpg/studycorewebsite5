import { supabase } from './supabase';
import { toast } from '@/components/ui/sonner';

/**
 * Ultra-simple direct sign-in function with minimal dependencies
 * Uses direct window location navigation to avoid any race conditions
 */
export async function simpleSignIn(email: string, password: string) {
  try {
    console.log('Simple sign-in attempt for:', email);
    
    // Clear any existing state/flags
    localStorage.removeItem('auth_debug');
    localStorage.removeItem('direct_signin');
    
    // Show a loading message
    toast.loading('Signing in...');
    
    // Attempt to sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    
    // Handle errors
    if (error) {
      console.error('Sign in error:', error);
      
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Please verify your email first');
        setTimeout(() => {
          window.location.href = '/verify-email?email=' + encodeURIComponent(email);
        }, 1500);
      } else {
        toast.error(error.message);
      }
      
      return { success: false, error };
    }
    
    // Check if we have user data
    if (!data.user) {
      toast.error('Sign-in succeeded but user data is missing');
      return { success: false, error: new Error('No user data') };
    }
    
    // Now decide where to send the user
    
    // If email is not verified
    if (!data.user.email_confirmed_at) {
      toast.info('Please verify your email to continue');
      setTimeout(() => {
        window.location.href = '/verify-email';
      }, 1500);
      return { success: true, user: data.user };
    }
    
    // Email is verified, now check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
    
    // Handle profile fetch error
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
      toast.error('Could not load your profile');
      return { success: true, user: data.user, error: profileError };
    }
    
    // If no profile, we need to create one
    if (profileError && profileError.code === 'PGRST116') {
      // Create a profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || 'student'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating profile:', createError);
        toast.error('Could not create your profile');
        return { success: true, user: data.user, error: createError };
      }
      
      // Navigate to profile setup
      toast.success('Please complete your profile');
      setTimeout(() => {
        window.location.href = '/setup-profile';
      }, 1500);
      return { success: true, user: data.user, profile: newProfile };
    }
    
    // We have a profile
    if (!profile.full_name) {
      // Profile is incomplete
      toast.success('Please complete your profile');
      setTimeout(() => {
        window.location.href = '/setup-profile';
      }, 1500);
    } else {
      // Profile is complete
      toast.success('Welcome back!');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    }
    
    return { success: true, user: data.user, profile };
  } catch (error) {
    console.error('Unexpected error in simpleSignIn:', error);
    toast.error('An unexpected error occurred');
    return { success: false, error };
  }
}