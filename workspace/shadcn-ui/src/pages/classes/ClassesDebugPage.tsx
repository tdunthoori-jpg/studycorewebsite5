import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClassesDebugPage() {
  const { user, profile } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDebug = async () => {
      setLoading(true);
      const info: any = {
        user: user ? { id: user.id, email: user.email } : null,
        profile: profile ? { id: profile.id, role: profile.role, full_name: profile.full_name } : null,
        classesCount: 0,
        classesData: [],
        enrollmentsCount: 0,
        errors: []
      };

      try {
        // Test basic Supabase connection
        const { data: testData, error: testError } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);
        
        if (testError) {
          info.errors.push(`Supabase connection error: ${testError.message}`);
        } else {
          info.supabaseConnection = 'OK';
        }

        // Test classes table access
        const { data: allClasses, error: classesError } = await supabase
          .from('classes')
          .select('*');
          
        if (classesError) {
          info.errors.push(`Classes table error: ${classesError.message}`);
        } else {
          info.classesCount = allClasses?.length || 0;
          info.classesData = allClasses?.slice(0, 3) || []; // Show first 3
        }

        // Test enrollments table access if user exists
        if (user?.id) {
          const { data: enrollments, error: enrollmentError } = await supabase
            .from('enrollments')
            .select('*')
            .eq('student_id', user.id);
            
          if (enrollmentError) {
            info.errors.push(`Enrollments table error: ${enrollmentError.message}`);
          } else {
            info.enrollmentsCount = enrollments?.length || 0;
          }
        }

      } catch (error) {
        info.errors.push(`General error: ${error}`);
      }

      setDebugInfo(info);
      setLoading(false);
    };

    runDebug();
  }, [user, profile]);

  if (loading) {
    return <div>Loading debug info...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Classes Debug Information</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded text-sm overflow-auto">
            {JSON.stringify({
              user: debugInfo.user,
              profile: debugInfo.profile
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded text-sm overflow-auto">
            {JSON.stringify({
              supabaseConnection: debugInfo.supabaseConnection,
              classesCount: debugInfo.classesCount,
              enrollmentsCount: debugInfo.enrollmentsCount
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample Classes Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo.classesData, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {debugInfo.errors?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-red-50 p-4 rounded text-sm text-red-800 overflow-auto">
              {debugInfo.errors.join('\n')}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}