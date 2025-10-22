import { supabase, isSupabaseConfigured } from './supabase';
import { handleError } from './error-handler';
import { toast } from '@/components/ui/sonner';

/**
 * Checks if the required database tables exist
 * @returns Promise<boolean> - true if all required tables exist
 */
export async function checkRequiredTables(): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.error('Supabase is not properly configured');
    return false;
  }

  try {
    // List of required tables
    const requiredTables = [
      'profiles',
      'classes',
      'enrollments',
      'schedules',
      'assignments',
      'submissions',
      'resources',
      'messages'
    ];

    // Track which tables are missing
    const missingTables: string[] = [];

    // Check each table
    for (const tableName of requiredTables) {
      try {
        // Try to select a single row from the table
        const { data, error } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);

        if (error) {
          console.error(`Error checking table ${tableName}:`, error);
          missingTables.push(tableName);
        }
      } catch (error) {
        console.error(`Exception checking table ${tableName}:`, error);
        missingTables.push(tableName);
      }
    }

    // Report results
    if (missingTables.length > 0) {
      const errorMessage = `Missing required tables: ${missingTables.join(', ')}`;
      console.error(errorMessage);
      toast.error(errorMessage);
      
      // Suggest setup
      toast.error('Please run the database setup script. See DATABASE_SETUP.md for instructions.');
      return false;
    }

    console.log('All required database tables exist');
    return true;
  } catch (error) {
    handleError(error, 'Error checking required tables');
    return false;
  }
}

/**
 * Helper function for checking database configuration on app startup
 */
export async function verifyDatabaseSetup(): Promise<void> {
  try {
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not properly configured. Please check your environment variables.');
      console.error('Supabase configuration missing or invalid');
      return;
    }
    
    // Check tables
    const tablesExist = await checkRequiredTables();
    if (!tablesExist) {
      console.error('Database setup is incomplete');
      return;
    }
    
    console.log('Database setup verified successfully');
  } catch (error) {
    handleError(error, 'Database verification failed');
  }
}