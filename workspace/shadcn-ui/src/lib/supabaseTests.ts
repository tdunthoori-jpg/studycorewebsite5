import { supabase } from './supabase';

// Function to test Supabase connection
export async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    // Test database connection by checking health endpoint
    // This is more reliable than calling rpc functions which might not exist
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase connection test failed:', response.status, errorText);
      return { success: false, error: { status: response.status, message: errorText } };
    }
    
    const data = await response.json();
    console.log('Supabase connection successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Supabase connection test exception:', error);
    return { success: false, error };
  }
}

// Function to test Supabase auth
export async function testSupabaseAuth() {
  console.log('Testing Supabase auth...');
  
  try {
    // Try to sign up a test user
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`Attempting to sign up test user: ${testEmail}`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signUpError) {
      console.error('Supabase auth test sign-up failed:', signUpError);
      return { success: false, error: signUpError };
    }
    
    console.log('Supabase auth test sign-up successful:', signUpData);
    
    // Sign out the test user
    await supabase.auth.signOut();
    
    return { success: true, data: signUpData };
  } catch (error) {
    console.error('Supabase auth test exception:', error);
    return { success: false, error };
  }
}

// Function to test profiles table access
export async function testProfilesTableAccess() {
  console.log('Testing profiles table access...');
  
  try {
    // First check if the profiles table exists using low-level API
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('Checking if profiles table exists...');
    const tableResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=count&limit=0`, 
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      }
    );
    
    // If the table doesn't exist, this will fail with a 404
    if (!tableResponse.ok) {
      // Table might not exist, let's log details
      const errorText = await tableResponse.text();
      console.error(`Profiles table might not exist: ${tableResponse.status}`, errorText);
      
      return { 
        success: false, 
        error: { 
          message: 'Profiles table might not exist or you might not have access to it.', 
          status: tableResponse.status,
          details: errorText
        } 
      };
    }
    
    // If we got here, the table exists, try using the Supabase client
    console.log('Profiles table exists, trying to access via Supabase client...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
      
    if (profilesError) {
      console.error('Profiles table read test failed:', profilesError);
      return { success: false, error: profilesError };
    }
    
    console.log('Profiles table read test successful:', profiles);
    
    return { success: true, data: profiles };
  } catch (error) {
    console.error('Profiles table access test exception:', error);
    return { success: false, error };
  }
}