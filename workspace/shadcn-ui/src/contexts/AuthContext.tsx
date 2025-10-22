import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';

// Simple interface for profile data
export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'student' | 'tutor';
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Simple interface for auth context
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initializing: boolean;
  isSigningIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: 'student' | 'tutor') => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Create the context with undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Main Auth Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Main state
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  // Navigation
  const navigate = useNavigate();
  
  // Simple logging helper
  const log = (message: string, data: any = {}) => {
    console.log(`AUTH [${new Date().toISOString()}]`, message, {
      user: user?.email,
      hasProfile: !!profile,
      loading,
      initializing,
      isSigningIn,
      ...data
    });
  };
  
  // Basic fetch profile function
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    log('Fetching profile', { userId });
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          log('Profile not found, creating new one');
          return await createProfile(userId);
        }
        
        console.error('Error fetching profile:', error);
        return null;
      }
      
      log('Profile fetched successfully');
      return data;
    } catch (error) {
      console.error('Exception in fetchProfile:', error);
      return null;
    }
  };
  
  // Create profile function
  const createProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return null;
      
      const email = user.data.user.email;
      const role = user.data.user.user_metadata?.role || 'student';
      
      log('Creating profile', { userId, email, role });
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          email: email,
          role: role,
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }
      
      log('Profile created successfully');
      return data;
    } catch (error) {
      console.error('Exception in createProfile:', error);
      return null;
    }
  };
  
  // Simple refresh profile function
  const refreshProfile = async () => {
    if (!user) return;
    log('Refreshing profile');
    
    const profile = await fetchProfile(user.id);
    if (profile) {
      setProfile(profile);
      log('Profile refreshed');
    }
  };
  
  // Initialize auth on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      log('Initializing auth');
      setInitializing(true);
      
      try {
        // Check if there's a debug flag to reset auth
        const authDebug = localStorage.getItem('auth_debug');
        if (authDebug === 'true') {
          log('DEBUG: Forcing auth reset');
          await supabase.auth.signOut();
          localStorage.removeItem('auth_debug');
          toast.info('Auth state reset');
        }
        
        // Get the current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setInitializing(false);
          return;
        }
        
        if (session?.user) {
          log('Found existing session', { email: session.user.email });
          setUser(session.user);
          
          if (session.user.email_confirmed_at) {
            const profile = await fetchProfile(session.user.id);
            setProfile(profile);
          }
        } else {
          log('No active session');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setInitializing(false);
        log('Auth initialization complete');
      }
    };
    
    initializeAuth();
    
    // Set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        log(`Auth state changed: ${event}`, { email: session?.user?.email });
        
        if (event === 'SIGNED_IN' && session) {
          // Always update the user state
          setUser(session.user);
          
          // Reset loading/signing states
          setIsSigningIn(false);
          setLoading(false);
          
          // Check if we're handling this via direct sign-in
          const directSignInActive = localStorage.getItem('direct_signin');
          
          if (directSignInActive) {
            // We're using direct sign-in, so just update state and skip navigation
            log('Auth state change detected after direct sign-in - skipping navigation');
            
            // Still update profile data in the context if email is verified
            if (session.user.email_confirmed_at) {
              const profile = await fetchProfile(session.user.id);
              setProfile(profile);
            }
            
            // Don't remove the flag - let the direct-signin function clean it up
            return;
          }
          
          // This is a regular auth state change (not from direct-signin)
          // Handle navigation based on user state
          
          // If email is verified, fetch profile and navigate
          if (session.user.email_confirmed_at) {
            const profile = await fetchProfile(session.user.id);
            setProfile(profile);
            
            if (profile?.full_name) {
              // Only navigate if we're not already on the dashboard
              if (window.location.pathname !== '/dashboard') {
                toast.success('Welcome back!');
                navigate('/dashboard');
              }
            } else {
              // Only navigate if we're not already on the setup page
              if (window.location.pathname !== '/setup-profile') {
                toast.success('Please complete your profile');
                navigate('/setup-profile');
              }
            }
          } else {
            // Only navigate if we're not already on the verification page
            if (!window.location.pathname.includes('/verify-email')) {
              toast.info('Please verify your email');
              navigate('/verify-email');
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          
          // Don't navigate on sign-out if direct-signin flag is active
          // (direct-signin might be signing out to sign in again)
          if (!localStorage.getItem('direct_signin')) {
            navigate('/');
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Just update the user if token refreshed
          if (session) {
            setUser(session.user);
          }
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);
  
  // Watch profile changes for navigation
  useEffect(() => {
    if (!initializing && user && profile?.full_name) {
      // Only navigate from profile setup to dashboard
      if (window.location.pathname === '/setup-profile') {
        log('Profile complete, navigating to dashboard');
        navigate('/dashboard');
      }
    }
  }, [profile?.full_name, user, initializing, navigate]);
  
  // Sign in function that uses direct-signin
  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      toast.error('Supabase not configured');
      navigate('/config');
      return;
    }
    
    try {
      // Set loading states
      setIsSigningIn(true);
      setLoading(true);
      log('Signing in (using direct sign-in)', { email });
      
      // Use our direct-signin function
      const { directSignIn } = await import('@/lib/direct-signin');
      
      // This will handle everything including navigation
      await directSignIn(email, password);
      
      // We don't need to do anything else - directSignIn has already handled everything
      // If we're still here, it means there was an error or navigation hasn't happened yet
      
      // Reset states after a short delay (we might already have navigated away)
      setTimeout(() => {
        setIsSigningIn(false);
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      log('Error in signIn', { error: (error as Error).message });
      toast.error('An unexpected error occurred during sign in');
      setIsSigningIn(false);
      setLoading(false);
      throw error;
    }
  };
  
  // Sign up function
  const signUp = async (email: string, password: string, role: 'student' | 'tutor') => {
    if (!isSupabaseConfigured) {
      toast.error('Supabase not configured');
      navigate('/config');
      return;
    }
    
    try {
      setLoading(true);
      log('Signing up', { email, role });
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { role },
          emailRedirectTo: `${window.location.origin}/login?verified=true`
        },
      });
      
      if (error) {
        log('Sign up error', { error: error.message });
        toast.error(error.message);
        throw error;
      }
      
      if (data.user && !data.session) {
        log('Sign up success, email verification required');
        toast.success('Account created! Please check your email to verify.');
      } else if (data.session) {
        log('Sign up success, automatically signed in');
        toast.success('Account created successfully!');
      }
      
      // Auth state change will handle the navigation
    } catch (error) {
      console.error('Error in signUp:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Sign out function
  const signOut = async () => {
    try {
      log('Signing out');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        log('Sign out error', { error: error.message });
        toast.error(error.message);
        throw error;
      }
      
      // Clear local state
      setUser(null);
      setProfile(null);
      
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      console.error('Error in signOut:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Reset password function
  const resetPassword = async (email: string) => {
    try {
      log('Requesting password reset', { email });
      
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );
      
      if (error) {
        log('Reset password error', { error: error.message });
        toast.error(error.message);
        throw error;
      }
      
      toast.success('Password reset email sent!');
    } catch (error) {
      console.error('Error in resetPassword:', error);
      throw error;
    }
  };
  
  // Resend verification email function
  const resendVerificationEmail = async (email: string) => {
    try {
      log('Resending verification email', { email });
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/login?verified=true`
        }
      });
      
      if (error) {
        log('Resend verification error', { error: error.message });
        toast.error(error.message);
        throw error;
      }
      
      toast.success('Verification email sent!');
    } catch (error) {
      console.error('Error in resendVerificationEmail:', error);
      throw error;
    }
  };
  
  // Update profile function
  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error('No user logged in');
      
      log('Updating profile', { updates });
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();
        
      if (error) {
        log('Update profile error', { error: error.message });
        toast.error('Failed to update profile: ' + error.message);
        throw error;
      }
      
      log('Profile updated successfully');
      setProfile(data);
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  };
  
  // Create context value
  const value = {
    user,
    profile,
    loading,
    initializing,
    isSigningIn,
    signIn,
    signUp,
    signOut,
    resetPassword,
    resendVerificationEmail,
    updateProfile,
    refreshProfile,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};