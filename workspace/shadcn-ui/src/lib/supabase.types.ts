export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          avatar_url?: string;
          role: 'student' | 'tutor' | 'admin';
          email: string;
          bio?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          avatar_url?: string;
          role: 'student' | 'tutor' | 'admin';
          email: string;
          bio?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          avatar_url?: string;
          role?: 'student' | 'tutor' | 'admin';
          email?: string;
          bio?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      classes: {
        Row: {
          id: string;
          name: string;
          description?: string;
          tutor_id: string;
          max_students: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          tutor_id: string;
          max_students: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          tutor_id?: string;
          max_students?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      enrollments: {
        Row: {
          id: string;
          class_id: string;
          student_id: string;
          status: 'active' | 'completed' | 'dropped';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          student_id: string;
          status: 'active' | 'completed' | 'dropped';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          student_id?: string;
          status?: 'active' | 'completed' | 'dropped';
          created_at?: string;
          updated_at?: string;
        };
      };
      schedules: {
        Row: {
          id: string;
          class_id: string;
          start_time: string;
          end_time: string;
          day_of_week: number;
          google_meet_link?: string;
          recurring: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          start_time: string;
          end_time: string;
          day_of_week: number;
          google_meet_link?: string;
          recurring: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          start_time?: string;
          end_time?: string;
          day_of_week?: number;
          google_meet_link?: string;
          recurring?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      assignments: {
        Row: {
          id: string;
          class_id: string;
          title: string;
          description?: string;
          due_date: string;
          file_url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          title: string;
          description?: string;
          due_date: string;
          file_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          title?: string;
          description?: string;
          due_date?: string;
          file_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      resources: {
        Row: {
          id: string;
          class_id: string;
          title: string;
          description?: string;
          resource_type: 'pdf' | 'video' | 'link' | 'other';
          resource_url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          title: string;
          description?: string;
          resource_type: 'pdf' | 'video' | 'link' | 'other';
          resource_url: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          title?: string;
          description?: string;
          resource_type?: 'pdf' | 'video' | 'link' | 'other';
          resource_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          read: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          recipient_id?: string;
          content?: string;
          read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      submissions: {
        Row: {
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
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          student_id: string;
          submission_url?: string;
          grade?: number;
          feedback?: string;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          student_id?: string;
          submission_url?: string;
          grade?: number;
          feedback?: string;
          submitted_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      [key: string]: {
        [key: string]: string;
      };
    };
  };
};