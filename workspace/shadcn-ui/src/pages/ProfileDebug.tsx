import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/SimpleAuthContext';

export default function ProfileDebug() {
  const { user, profile } = useAuth();
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    const testProfileOperations = async () => {
      if (!user) return;

      try {
        // Test 1: Check if we can read from profiles table
        console.log('Testing profile table access...');
        const { data: allProfiles, error: readError } = await supabase
          .from('profiles')
          .select('*')
          .limit(1);

        if (readError) {
          setTestResult(`Read Error: ${readError.message}`);
          return;
        }

        // Test 2: Check current user's profile
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          setTestResult(`User Profile Error: ${userError.message}`);
          return;
        }

        // Test 3: Try to insert/update a profile
        if (!userProfile) {
          console.log('No profile found, trying to create one...');
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              email: user.email || '',
              role: 'student',
              full_name: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            setTestResult(`Insert Error: ${insertError.message}`);
            return;
          }
        }

        setTestResult('Profile operations working correctly!');
        setTableInfo({
          canRead: !readError,
          userProfile: userProfile || 'No profile found',
          profileCount: allProfiles?.length || 0
        });

      } catch (error) {
        setTestResult(`Exception: ${error}`);
      }
    };

    testProfileOperations();
  }, [user]);

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Profile Debug</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold">Current User</h2>
          <p>ID: {user.id}</p>
          <p>Email: {user.email}</p>
          <p>Role from metadata: {user.user_metadata?.role || 'Not set'}</p>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold">Current Profile</h2>
          <pre className="text-sm">
            {profile ? JSON.stringify(profile, null, 2) : 'No profile loaded'}
          </pre>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold">Test Results</h2>
          <p className={testResult.includes('Error') ? 'text-red-600' : 'text-green-600'}>
            {testResult || 'Running tests...'}
          </p>
        </div>

        {tableInfo && (
          <div className="p-4 border rounded">
            <h2 className="font-semibold">Table Info</h2>
            <pre className="text-sm">
              {JSON.stringify(tableInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}