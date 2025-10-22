import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'student' | 'tutor';
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const authActionInProgress = useRef<string | null>(null); // Track current auth action
  const navigate = useNavigate();
  
  // Create log helpers with timestamps to track state changes
  const logAuthState = (message: string, data?: any) => {
    console.log(`AUTH STATE [${new Date().toISOString()}] - ${message}`, 
      { user: !!user, profile: !!profile, loading, initializing, isSigningIn, authAction: authActionInProgress.current, ...data }
    );
  };
  
  // Debug state changes
  useEffect(() => {
    logAuthState('Auth state changed');
  }, [user, profile, loading, initializing, isSigningIn]);
  
  // Global safety mechanism - ensure loading states never get stuck
  useEffect(() => {
    const safetyInterval = setInterval(() => {
      // Check if loading has been true for too long
      if (loading || isSigningIn) {
        logAuthState('GLOBAL SAFETY CHECK: Checking hung loading states', {
          loading, isSigningIn, authAction: authActionInProgress.current,
          hasUser: !!user
        });
        
        // We'll use localStorage to track when loading started
        const loadingStartTime = localStorage.getItem('auth_loading_start');
        const now = Date.now();
        
        if (!loadingStartTime) {
          // First time seeing loading state, record it
          localStorage.setItem('auth_loading_start', now.toString());
        } else {
          // Check how long we've been loading
          const loadingStarted = parseInt(loadingStartTime, 10);
          const loadingDuration = now - loadingStarted;
          
          // If loading for more than 10 seconds, something is wrong (reduced from 15s)
          if (loadingDuration > 10000) {
            logAuthState('GLOBAL SAFETY: Loading state stuck for 10+ seconds, forcing reset', {
              loadingDuration: `${loadingDuration / 1000}s`,
              hasUser: !!user,
              hasProfile: !!profile
            });
            
            // Force reset all auth states
            setLoading(false);
            setIsSigningIn(false);
            authActionInProgress.current = null;
            localStorage.removeItem('auth_loading_start');
            
            // Show an error to the user
            if (user && !profile) {
              // Special case: we have user but no profile - common reason for hanging
              toast.error('Profile data unavailable. Please reload and try again.');
              
              // Try to recover by refreshing the profile
              fetchProfile(user.id).then(profile => {
                if (profile) {
                  setProfile(profile);
                  toast.success('Profile data recovered!');
                }
              });
            } else {
              toast.error('Authentication took too long. Please try again.');
            }
          }
        }
      } else {
        // Not loading, clear the timestamp
        localStorage.removeItem('auth_loading_start');
      }
    }, 3000); // Check more frequently (3s instead of 5s)
    
    return () => clearInterval(safetyInterval);
  }, [loading, isSigningIn, user, profile]);

  // Simplified profile fetch with better error handling and explicit loading state management
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    // Always clear loading state when this function exits
    const ensureLoadingCleared = () => {
      if (loading) {
        logAuthState('Clearing loading state from fetchProfile');
        setLoading(false);
      }
    };
    
    try {
      logAuthState('Fetching profile for user', { userId });
      
      if (!userId) {
        logAuthState('Invalid user ID provided to fetchProfile');
        ensureLoadingCleared();
        return null;
      }
      
      // Check if we have a profile in local storage first to speed things up
      const cachedProfile = localStorage.getItem(`profile_${userId}`);
      if (cachedProfile) {
        try {
          const profile = JSON.parse(cachedProfile) as Profile;
          logAuthState('Using cached profile', { profile });
          ensureLoadingCleared();
          return profile;
        } catch (e) {
          // Cache invalid, remove it
          localStorage.removeItem(`profile_${userId}`);
        }
      }
      
      // Fetch from supabase with a timeout
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timed out')), 3000)
      );
      
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      // Use a simple timeout for simplicity
      const fetchResult = await fetchPromise;
      const { data, error } = fetchResult;

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create it
          logAuthState('Profile not found, creating new profile');
          const profile = await createProfile(userId);
          ensureLoadingCleared();
          return profile;
        }
        
        logAuthState('Error fetching profile', { error: error.message });
        ensureLoadingCleared();
        return null;
      }

      // Cache the profile
      if (data) {
        localStorage.setItem(`profile_${userId}`, JSON.stringify(data));
      }
      
      logAuthState('Profile fetched successfully');
      ensureLoadingCleared();
      return data;
    } catch (error) {
      logAuthState('Exception in fetchProfile', { error: (error as Error).message });
      ensureLoadingCleared();
      return null;
    }
  };

  const createProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return null;

      const email = user.data.user.email;
      const role = user.data.user.user_metadata?.role || 'student';

      console.log('Creating profile for user:', userId, email, role);

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

      console.log('Profile created successfully:', data);
      return data;
    } catch (error) {
      console.error('Exception creating profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    const profile = await fetchProfile(user.id);
    setProfile(profile);
  };

  // Watch for profile changes and handle navigation
  useEffect(() => {
    if (!initializing && user && user.email_confirmed_at && profile?.full_name) {
      console.log('Profile is complete, checking if we should navigate to dashboard');
      // Only navigate if we're currently on the profile setup page
      if (window.location.pathname === '/setup-profile') {
        console.log('Navigating from profile setup to dashboard');
        navigate('/dashboard');
      }
    }
  }, [profile?.full_name, user, initializing, navigate]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        logAuthState('Initializing auth...');
        setLoading(true);
        setInitializing(true);
        
        // Check for debug reset flag
        const authDebug = window.localStorage.getItem('auth_debug');
        if (authDebug === 'true') {
          logAuthState('DEBUG MODE: Forcing auth state reset');
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setIsSigningIn(false);
          authActionInProgress.current = null;
          window.localStorage.removeItem('auth_debug');
          
          toast.info('Auth state manually reset');
          logAuthState('DEBUG MODE: Auth state reset complete');
          
          // Short delay to ensure everything is reset
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Set a timeout to ensure initialization completes even if there's an issue
        const initTimeout = setTimeout(() => {
          logAuthState('Auth initialization timed out, forcing completion');
          setLoading(false);
          setInitializing(false);
          setIsSigningIn(false);
          authActionInProgress.current = null;
        }, 5000); // 5 second timeout
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Clear timeout as we got a response
        clearTimeout(initTimeout);
        
        if (error) {
          logAuthState('Error getting session', { error: error.message });
          setLoading(false);
          setInitializing(false);
          return;
        }

        if (session?.user) {
          logAuthState('Found existing session', { email: session.user.email });
          setUser(session.user);
          
          // Only fetch profile if user is email confirmed
          if (session.user.email_confirmed_at) {
            logAuthState('Email confirmed, fetching profile on init');
            const profile = await fetchProfile(session.user.id);
            setProfile(profile);
          } else {
            logAuthState('User email not confirmed yet');
          }
        } else {
          logAuthState('No active session found');
        }
      } catch (error) {
        logAuthState('Error initializing auth', { error: (error as Error).message });
      } finally {
        logAuthState('Auth initialization complete');
        setLoading(false);
        setInitializing(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logAuthState(`Auth event fired: ${event}`, { 
          userEmail: session?.user?.email, 
          eventType: event,
          sessionExists: !!session,
          timestamp: new Date().toISOString()
        });

        if (event === 'SIGNED_IN' && session?.user) {
          logAuthState('SIGNED_IN event processing');
          
          // Check if we've already handled this sign-in in the direct success path
          if (authActionInProgress.current === 'signin_completed') {
            logAuthState('Sign-in already completed in direct path, cleaning up only');
            // Just ensure all loading states are cleared
            setIsSigningIn(false);
            setLoading(false);
            authActionInProgress.current = null;
            return;
          }
          
          // If we're in the middle of signing in, mark as completed
          if (authActionInProgress.current === 'signin') {
            logAuthState('Marking sign-in as completed');
            authActionInProgress.current = 'signin_completed';
          }
          
          setUser(session.user);
          
          // Check if we were actively signing in
          const wasSigningIn = authActionInProgress.current === 'signin_completed';
          logAuthState('Checking auth action', { wasSigningIn });
          
          // Clear the signing in state immediately to fix UI
          setIsSigningIn(false);
          logAuthState('Set isSigningIn to false');
          
          // Simplified auth state change handling
          
          // FIRST: always clear the signing in state immediately
          setIsSigningIn(false);
          
          // Check if email is confirmed
          if (session.user.email_confirmed_at) {
            logAuthState('Email confirmed, fetching profile from auth change event');
            
            // Fetch profile - our improved function handles timeouts internally
            try {
              const profile = await fetchProfile(session.user.id);
              
              if (profile) {
                setProfile(profile);
                logAuthState('Profile loaded successfully from auth event');
                
                // Only navigate if we were actively signing in and not initializing
                if (wasSigningIn && !initializing) {
                  if (profile?.full_name) {
                    logAuthState('Profile complete, navigating to dashboard');
                    toast.success('Welcome back!');
                    navigate('/dashboard');
                  } else {
                    logAuthState('Profile incomplete, navigating to setup');
                    toast.success('Please complete your profile');
                    navigate('/setup-profile');
                  }
                }
              } else {
                logAuthState('Profile fetch returned null from auth change event');
                setLoading(false);
                
                if (wasSigningIn) {
                  toast.error('Could not load your profile. Please try again.');
                }
              }
            } catch (error) {
              logAuthState('Error fetching profile from auth change event');
              setLoading(false);
              
              if (wasSigningIn) {
                toast.error('Error loading your profile. Please try again.');
              }
            }
          } else {
            logAuthState('User signed in but email not confirmed');
            setLoading(false);
            
            if (wasSigningIn) {
              toast.info('Please check your email to verify your account');
              navigate('/verify-email');
            }
          }
          
          // Reset auth action state
          logAuthState('Resetting auth action state');
          authActionInProgress.current = null;
          
        } else if (event === 'SIGNED_OUT') {
          logAuthState('SIGNED_OUT event processing');
          setUser(null);
          setProfile(null);
          authActionInProgress.current = null;
          setLoading(false);
          
          // Only navigate if we're not initializing
          if (!initializing) {
            navigate('/');
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          logAuthState('TOKEN_REFRESHED event processing');
          setUser(session.user);
        } else {
          logAuthState('Unhandled auth event', { event });
        }
        
        logAuthState('Auth event processing complete');
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, initializing]);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured. Please check your environment variables.');
      navigate('/config');
      return;
    }

    try {
      // Prevent multiple sign-in attempts
      if (authActionInProgress.current === 'signin') {
        logAuthState('Sign in already in progress, ignoring duplicate request');
        return;
      }

      logAuthState('Starting sign in process', { email });
      setIsSigningIn(true);
      authActionInProgress.current = 'signin';
      setLoading(true);
      logAuthState('Set initial sign in states');

      const normalizedEmail = email.trim().toLowerCase();
      logAuthState('Calling Supabase signInWithPassword');
      const startTime = Date.now();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      
      const duration = Date.now() - startTime;
      logAuthState(`Supabase auth call completed in ${duration}ms`, { 
        success: !error, 
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message
      });

      if (error) {
        logAuthState('Sign in error', { error: error.message });
        
        // Provide better error messages
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please check your email and click the verification link before signing in.');
          // Navigate to verification page with email context
          navigate('/verify-email?email=' + encodeURIComponent(normalizedEmail));
        } else if (error.message.includes('Email address not found')) {
          toast.error('No account found with this email address. Please sign up first.');
        } else {
          toast.error(error.message);
        }

        // Clear auth states on error
        logAuthState('Clearing auth states due to error');
        setIsSigningIn(false);
        authActionInProgress.current = null;
        setLoading(false);
        
        throw error;
      }

      // SIMPLIFIED APPROACH: Let the auth state change event handle most of the work
      logAuthState('Sign in successful - minimal direct handling');
      
      // Set the user directly from the response data
      if (data && data.user) {
        logAuthState('Setting user from sign in response');
        setUser(data.user);
        
        // Mark the sign-in as being handled by auth state change
        authActionInProgress.current = 'signin_completed';
        
        // Always clear these states immediately
        setIsSigningIn(false);
        setLoading(false);
        
        // Show a toast to indicate success while we wait for auth state to catch up
        toast.success('Sign in successful!');
      } else {
        // Clear the loading states
        logAuthState('No user data in successful response, clearing states');
        setIsSigningIn(false);
        setLoading(false);
      }
      
      // We'll let the auth state change handler clear the authActionInProgress
      
      // Add a safety timeout as backup - always reset states after a timeout
      setTimeout(() => {
        logAuthState('SAFETY TIMEOUT: Checking auth states');
        
        // Always check all states regardless of current auth action
        const stillLoading = loading;
        const stillSigningIn = isSigningIn;
        const pendingAction = authActionInProgress.current;
        
        if (stillLoading || stillSigningIn || pendingAction === 'signin' || pendingAction === 'signin_completed') {
          logAuthState('SAFETY TIMEOUT: Some auth states still set, force resetting', {
            stillLoading, stillSigningIn, pendingAction
          });
          
          if (stillSigningIn) setIsSigningIn(false);
          if (stillLoading) setLoading(false);
          if (pendingAction === 'signin' || pendingAction === 'signin_completed') {
            authActionInProgress.current = null;
          }
          
          toast.info('Authentication reset due to timeout');
        } else {
          logAuthState('SAFETY TIMEOUT: Auth states already cleared, no action needed');
        }
      }, 8000); // 8 seconds - increased from 5s to allow for network latency
      
    } catch (error) {
      logAuthState('Error in signIn', { error: (error as Error).message });
      setIsSigningIn(false);
      authActionInProgress.current = null;
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, role: 'student' | 'tutor') => {
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured. Please check your environment variables.');
      navigate('/config');
      return;
    }

    try {
      setLoading(true);
      console.log('Signing up:', email, 'as', role);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            role: role,
          },
          emailRedirectTo: `${window.location.origin}/login?verified=true`
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        toast.error(error.message);
        throw error;
      }

      if (data.user && !data.session) {
        // User created but needs email verification
        console.log('Sign up successful, email verification required');
        toast.success('Account created! Please check your email and click the verification link to continue.');
      } else if (data.session) {
        // User created and automatically signed in (email verification disabled)
        console.log('Sign up successful, user automatically signed in');
        toast.success('Account created successfully!');
      }

      // Don't navigate - let the auth state change handle it
    } catch (error) {
      console.error('Error in signUp:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Prevent multiple sign-out attempts
      if (authActionInProgress.current === 'signout') {
        console.log('Sign out already in progress, ignoring duplicate request');
        return;
      }
      
      console.log('Signing out user');
      authActionInProgress.current = 'signout';
      setIsSigningIn(false);
      setLoading(true);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        toast.error(error.message);
        throw error;
      }

      // Clear local state
      setUser(null);
      setProfile(null);

      toast.success('Signed out successfully!');
      
      // Reset loading state and navigate
      setLoading(false);
      authActionInProgress.current = null;
      navigate('/');
      
    } catch (error) {
      console.error('Error in signOut:', error);
      setLoading(false);
      authActionInProgress.current = null;
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
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
        throw error;
      }

      toast.success('Password reset email sent!');
    } catch (error) {
      console.error('Error in resetPassword:', error);
      throw error;
    }
  };

  const resendVerificationEmail = async (email: string) => {
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
        throw error;
      }

      toast.success('Verification email sent! Please check your inbox.');
    } catch (error) {
      console.error('Error in resendVerificationEmail:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      console.log('Updating profile:', updates);

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
        console.error('Update profile error:', error);
        toast.error('Failed to update profile: ' + error.message);
        throw error;
      }

      console.log('Profile updated successfully:', data);
      setProfile(data);
      // Don't show toast here - let the calling component handle it
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  };

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
