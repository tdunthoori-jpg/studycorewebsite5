import { supabase } from './supabase';
import { toast } from '@/components/ui/sonner';

/**
 * Ultra-simple direct sign-in function that avoids auth state conflicts
 * Uses direct window.location navigation to prevent any race conditions
 */
export async function directSignIn(email: string, password: string) {
  console.log('Direct sign-in attempt for:', email);
  
  // Clear any existing flags/state
  localStorage.removeItem('auth_debug');
  localStorage.removeItem('direct_signin');
  sessionStorage.removeItem('auth_redirect');
  
  try {
    // Set flags to prevent duplicated navigation from auth events
    localStorage.setItem('direct_signin', 'true');
    
    // Step 1: Sign in with Supabase
    const signInResult = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    
    // Handle authentication errors
    if (signInResult.error) {
      console.error('Sign in error:', signInResult.error);
      
      if (signInResult.error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please check your credentials and try again.');
      } else if (signInResult.error.message.includes('Email not confirmed')) {
        toast.error('Please verify your email before signing in.');
        window.location.href = '/verify-email?email=' + encodeURIComponent(email);
      } else {
        toast.error(signInResult.error.message);
      }
      
      return { success: false, error: signInResult.error };
    }
    
    // Get the user and validate we have data
    const user = signInResult.data.user;
    if (!user) {
      console.error('No user in sign-in response');
      toast.error('Authentication succeeded but user data is missing');
      return { success: false, error: new Error('No user data') };
    }
    
    // Now determine where to navigate based on user state
    
    // Case 1: Email not verified
    if (!user.email_confirmed_at) {
      console.log('Email not verified, redirecting to verification page');
      toast.info('Please verify your email to continue');
      window.location.href = '/verify-email';
      return { success: true, user, destination: '/verify-email' };
    }
    
    // Case 2: Email is verified - check profile
    console.log('Email verified, checking profile');
    const profileResult = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    // Case 3: Profile doesn't exist - create one
    if (profileResult.error && profileResult.error.code === 'PGRST116') {
      console.log('Profile not found, creating a new one');
      
      // Create a new profile
      const createResult = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          email: user.email,
          role: user.user_metadata?.role || 'student',
        })
        .select()
        .single();
      
      if (createResult.error) {
        console.error('Error creating profile:', createResult.error);
        toast.error('Could not create your profile');
        return { success: true, error: createResult.error, user };
      }
      
      // New profile created - navigate to setup
      console.log('New profile created, redirecting to setup');
      toast.success('Please complete your profile');
      window.location.href = '/setup-profile';
      return { success: true, user, destination: '/setup-profile' };
    }
    
    // Case 4: Error fetching profile
    if (profileResult.error) {
      console.error('Profile fetch error:', profileResult.error);
      toast.error('Could not load your profile');
      return { success: true, error: profileResult.error, user };
    }
    
    // Case 5: We have a profile - check if it's complete
    const profile = profileResult.data;
    
    // Case 5a: Profile is incomplete
    if (!profile.full_name) {
      console.log('Profile incomplete, redirecting to setup');
      toast.success('Please complete your profile');
      window.location.href = '/setup-profile';
      return { success: true, user, profile, destination: '/setup-profile' };
    }
    
    // Case 5b: Profile is complete - go to dashboard
    console.log('Login successful, profile complete, redirecting to dashboard');
    toast.success('Welcome back!');
    window.location.href = '/dashboard';
    return { success: true, user, profile, destination: '/dashboard' };
    
  } catch (error) {
    console.error('Exception in directSignIn:', error);
    toast.error('An unexpected error occurred during sign in');
    localStorage.removeItem('direct_signin');
    return { success: false, error };
  }
}