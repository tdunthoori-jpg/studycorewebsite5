import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { toast } from '@/components/ui/sonner';

// Define profile type
type Profile = {
  id: string; // This is a generated UUID, not the auth user id
  user_id: string; // This references the auth.users(id)
  email: string;
  full_name: string | null;
  role: 'student' | 'tutor' | 'admin';
  bio?: string | null;
  avatar_url?: string | null;
  approved: boolean;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
};

// Define auth context type
type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, role: 'student' | 'tutor' | 'admin') => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Clean up subscription
    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile when user changes
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      try {
        // Use only user_id as that's how the profiles table is structured
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
          return;
        }
        
        if (data) {
          console.log('Profile found:', data);
          setProfile(data);
        } else {
          console.log('No profile found for user:', user.id);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [user]);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      return { error: null };
    } catch (error) {
      toast.error('An unexpected error occurred');
      return { error };
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, role: 'student' | 'tutor' | 'admin') => {
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
        toast.error(error.message);
        return { error };
      }

      toast.success('Please check your email to verify your account');
      return { error: null };
    } catch (error) {
      toast.error('An unexpected error occurred');
      return { error };
    }
  };

  // Sign out function
  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  // Refresh profile function
  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      // Use only user_id as that's how the profiles table is structured
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error) {
        console.error('Error refreshing profile:', error);
        return;
      }
      
      setProfile(data);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};