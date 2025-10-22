import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';

export default function QuickClearPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Immediately clear everything when this page loads
    const clearAll = async () => {
      try {
        // Sign out
        await supabase.auth.signOut();
        
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear form data
        if (typeof document !== 'undefined') {
          const forms = document.querySelectorAll('form');
          forms.forEach(form => form.reset());
        }
        
        toast.success('All data cleared!');
        
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 1000);
        
      } catch (error) {
        console.error('Error clearing data:', error);
        navigate('/login');
      }
    };
    
    clearAll();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
        <p className="text-muted-foreground">Clearing browser data...</p>
      </div>
    </div>
  );
}