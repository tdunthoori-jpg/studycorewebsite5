import { supabase } from './supabase';
import { toast } from '@/components/ui/sonner';

// Standard login flow with manual redirect
export async function login(email: string, password: string) {
  try {
    // Show loading toast
    toast.loading('Signing in...');
    
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    
    // Handle auth errors
    if (error) {
      console.error('Login error:', error.message);
      toast.error(error.message);
      return { success: false, error };
    }
    
    if (!data.user) {
      toast.error('Login succeeded but user data is missing');
      return { success: false, error: new Error('No user data') };
    }
    
    // Success!
    toast.success('Login successful!');
    
    // Handle routing based on verification/profile status
    if (!data.user.email_confirmed_at) {
      toast.info('Please verify your email');
      setTimeout(() => {
        window.location.href = '/verify-email';
      }, 1000);
      return { success: true };
    }
    
    // Get profile using user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
      
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
      toast.error('Could not load your profile');
      return { success: true, error: profileError };
    }
    
    // Handle missing profile
    if (!profile || profileError?.code === 'PGRST116') {
      toast.info('Setting up your profile...');

      // Create basic profile WITHOUT full_name so user is prompted to complete it
      await supabase.from('profiles').insert({
        user_id: data.user.id,
        email: data.user.email || '',
        full_name: null, // Don't set a default - force user to complete profile
        role: data.user.user_metadata?.role || 'student',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      setTimeout(() => {
        window.location.href = '/setup-profile';
      }, 1000);
      return { success: true };
    }

    // Check if profile is complete (no name, empty name, or default 'User' name)
    if (!profile.full_name || profile.full_name.trim() === '' || profile.full_name === 'User') {
      toast.info('Please complete your profile');
      setTimeout(() => {
        window.location.href = '/setup-profile';
      }, 1000);
    } else {
      toast.success('Welcome back!');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Login error:', error);
    toast.error('An unexpected error occurred');
    return { success: false, error };
  }
}

// Register a new user
export async function register(email: string, password: string, role: 'student' | 'tutor') {
  try {
    toast.loading('Creating your account...');
    
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { role },
        emailRedirectTo: `${window.location.origin}/login?verified=true`
      },
    });
    
    if (error) {
      console.error('Registration error:', error);
      toast.error(error.message);
      return { success: false, error };
    }
    
    toast.success('Account created! Please check your email to verify.');
    
    setTimeout(() => {
      window.location.href = '/verify-email';
    }, 1500);
    
    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    toast.error('An unexpected error occurred');
    return { success: false, error };
  }
}

// Sign out
export async function logout() {
  try {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    window.location.href = '/';
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    toast.error('An error occurred while signing out');
    return { success: false, error };
  }
}

// Reset browser state
export async function resetAuthState() {
  try {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Sign out
    await supabase.auth.signOut({ scope: 'global' });
    
    toast.success('Authentication state reset');
    window.location.href = '/login';
    return { success: true };
  } catch (error) {
    console.error('Reset error:', error);
    toast.error('An error occurred while resetting auth state');
    return { success: false, error };
  }
}