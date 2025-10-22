import { createClient } from '@supabase/supabase-js';

// Define types inline instead of importing from separate file
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          avatar_url?: string | null;
          role: 'student' | 'tutor' | 'admin';
          email: string;
          bio?: string | null;
          approved: boolean;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role: 'student' | 'tutor' | 'admin';
          email: string;
          bio?: string | null;
          approved?: boolean;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'student' | 'tutor' | 'admin';
          email?: string;
          bio?: string | null;
          approved?: boolean;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log Supabase configuration (without exposing full key)
console.log('Supabase Configuration:');
console.log('URL:', supabaseUrl);
console.log('Key available:', !!supabaseAnonKey);
console.log('Key length:', supabaseAnonKey?.length || 0);

// Check if we have placeholder values
const hasPlaceholderUrl = supabaseUrl === 'your_supabase_project_url_here';
const hasPlaceholderKey = supabaseAnonKey === 'your_supabase_anon_key_here';

if (!supabaseUrl || !supabaseAnonKey || hasPlaceholderUrl || hasPlaceholderKey) {
  console.error('⚠️ Missing or placeholder Supabase environment variables!');
  console.error('Please update your .env.local file with actual Supabase credentials.');
  console.error('URL valid:', !hasPlaceholderUrl && !!supabaseUrl);
  console.error('Key valid:', !hasPlaceholderKey && !!supabaseAnonKey);
}

// Create Supabase client - use dummy values if not configured
const url = supabaseUrl && supabaseUrl !== 'your_supabase_project_url_here' 
  ? supabaseUrl 
  : 'https://placeholder.supabase.co';
  
const key = supabaseAnonKey && supabaseAnonKey !== 'your_supabase_anon_key_here' 
  ? supabaseAnonKey 
  : 'placeholder-key';

export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true, // Enable session persistence
    autoRefreshToken: true, // Enable auto refresh
    detectSessionInUrl: true,
  },
});

// Export flag to check if Supabase is properly configured
export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url_here' && 
  supabaseAnonKey !== 'your_supabase_anon_key_here'
);

// User type definitions
export type UserRole = 'student' | 'tutor' | 'admin';

export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  approved: boolean;
  approved_at?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
};

// Type definitions for resources
export type Class = {
  id: string;
  name: string;
  description?: string;
  tutor_id: string;
  max_students: number;
  status?: 'active' | 'inactive' | 'completed';
  subject?: string;
  level?: string;
  price_per_hour?: number;
  created_at: string;
  updated_at: string;
};

export type Enrollment = {
  id: string;
  class_id: string;
  student_id: string;
  status: 'active' | 'completed' | 'dropped';
  created_at: string;
  updated_at: string;
};

export type Schedule = {
  id: string;
  class_id: string;
  start_time: string;
  end_time: string;
  day_of_week: number; // 0-6, where 0 is Sunday
  google_meet_link?: string;
  recurring: boolean;
  created_at: string;
  updated_at: string;
};

export type Assignment = {
  id: string;
  class_id: string;
  title: string;
  description?: string;
  due_date: string;
  file_url?: string;
  created_at: string;
  updated_at: string;
};

export type Resource = {
  id: string;
  class_id: string;
  title: string;
  description?: string;
  resource_type: 'pdf' | 'video' | 'link' | 'other';
  resource_url: string;
  created_at: string;
  updated_at: string;
};

export type ClassResource = {
  id: string;
  class_id: string;
  title: string;
  description?: string;
  resource_type: 'pdf' | 'video' | 'link' | 'other';
  resource_url: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
  updated_at: string;
};

export type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  content?: string;
  file_url?: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  graded_at?: string;
  graded_by?: string;
  status: string;
  created_at: string;
  updated_at: string;
};

// Keep the old name as an alias for backwards compatibility
export type AssignmentSubmission = Submission;