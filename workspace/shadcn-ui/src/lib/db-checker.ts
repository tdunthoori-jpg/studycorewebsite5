import { supabase } from './supabase';
import { toast } from '@/components/ui/sonner';
import { handleError } from './error-handler';

/**
 * Checks if the Supabase connection and authentication are working properly
 * @returns Promise<boolean> - true if everything seems to be working
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    console.log('Checking database connection...');
    
    // 1. Check basic connectivity by querying a known table instead of using RPC
    const { data: healthData, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.error('Database connection error:', healthError);
      toast.error('Database connection error');
      return false;
    }
    
    console.log('Database connection successful - profiles table is accessible');
    
    // 2. Check if we're authenticated
    const { data: authData } = await supabase.auth.getSession();
    
    if (!authData.session) {
      console.error('No authentication session found');
      toast.error('Not authenticated, please sign in');
      return false;
    }
    
    console.log('Authentication session found for user:', authData.session.user.id);
    
    // 3. Check if we can access the profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authData.session.user.id)
      .single();
      
    if (profileError) {
      console.error('Error accessing profiles table:', profileError);
      toast.error('Error accessing user profile');
      return false;
    }
    
    console.log('Profile access successful:', profileData);
    
    // 4. Try a query on the enrollments table
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', authData.session.user.id)
      .limit(1);
      
    if (enrollmentError) {
      console.error('Error accessing enrollments table:', enrollmentError);
      toast.error('Error accessing enrollments');
      return false;
    }
    
    console.log('Enrollments access successful:', enrollmentData);
    
    return true;
  } catch (error) {
    handleError(error, 'Database connection check failed');
    return false;
  }
}

/**
 * Logs detailed debug info about the database and auth state
 */
export async function logDatabaseDebugInfo(): Promise<void> {
  try {
    console.log('====== DATABASE DEBUG INFO ======');
    
    // Check basic database connectivity
    const { data: connectionCheck, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
      
    console.log('Database Connection:', connectionError ? 'ERROR' : 'OK');
    if (connectionError) {
      console.error('Connection Error:', connectionError);
    }
    
    // Auth state
    const { data: authData } = await supabase.auth.getSession();
    console.log('Auth Session:', authData.session ? {
      id: authData.session.user.id,
      email: authData.session.user.email,
      aud: authData.session.user.aud,
      role: authData.session.user.role,
      appMetadata: authData.session.user.app_metadata,
      userMetadata: authData.session.user.user_metadata,
    } : 'No session');
    
    if (authData.session) {
      // Profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authData.session.user.id);
      
      console.log('Profile Data:', profileData || 'No profile');
      if (profileError) console.error('Profile Error:', profileError);
      
      // Enrollments (for student)
      const { data: enrollData, error: enrollError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', authData.session.user.id);
        
      console.log('Enrollment Data:', enrollData || 'No enrollments');
      if (enrollError) console.error('Enrollment Error:', enrollError);
      
      // Classes (for tutor)
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('tutor_id', authData.session.user.id);
        
      console.log('Class Data:', classData || 'No classes');
      if (classError) console.error('Class Error:', classError);
    }
    
    console.log('==============================');
  } catch (error) {
    handleError(error, 'Error logging database debug info', false);
  }
}