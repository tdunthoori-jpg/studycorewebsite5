import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { StudentDashboard, TutorDashboard } from '@/components/dashboard/Dashboards';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // If auth context is still loading, wait for it
        if (authLoading) return;
        
        // Check if we have a user and profile
        if (!user) {
          console.log('Dashboard - No user found, redirecting to login');
          navigate('/login');
          return;
        }
        
        if (!profile?.full_name) {
          console.log('Dashboard - Incomplete profile, redirecting to setup');
          navigate('/setup-profile');
          return;
        }
        
        console.log('Dashboard - User authenticated:', user.email, 'Role:', profile.role);
        setLoading(false);
      } catch (error) {
        console.error('Error in Dashboard component:', error);
        setLoading(false);
      }
    };

    checkAuth();
  }, [user, profile, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {profile.role === 'student' ? <StudentDashboard /> : <TutorDashboard />}
    </div>
  );
}