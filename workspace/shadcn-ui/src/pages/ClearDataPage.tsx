import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, RefreshCw, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';
import { clearAuthData } from '@/lib/simple-auth';
import { resetAuthState } from '@/lib/auth-utils';

export default function ClearDataPage() {
  const clearAllData = async () => {
    try {
      // Use our simple auth clear data function
      await clearAuthData();
      
      // The clearAuthData function already does all of the following:
      // - Signs out from Supabase
      // - Clears localStorage and sessionStorage
      // - Redirects to login page
      
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Error clearing data. Please try manually clearing browser data.');
    }
  };

  const clearCookiesOnly = () => {
    // Get all cookies and delete them
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      
      // Delete cookie for current domain
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
    });
    
    toast.success('Cookies cleared! Reloading page...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">Clear Browser Data</h1>
        
        <Alert>
          <AlertDescription>
            If you're seeing old email addresses or having login issues, try clearing your browser data.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Clear All Authentication Data
            </CardTitle>
            <CardDescription>
              This will clear all stored sessions, cookies, and local data. You'll need to log in again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={clearAllData} variant="destructive" className="w-full">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
            <Button 
              onClick={() => resetAuthState()} 
              variant="outline" 
              className="w-full"
            >
              <ShieldAlert className="h-4 w-4 mr-2" />
              Reset Auth State Only
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Clear Cookies Only
            </CardTitle>
            <CardDescription>
              This will only clear cookies, keeping other local data intact.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={clearCookiesOnly} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear Cookies
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual Steps</CardTitle>
            <CardDescription>
              If the automatic clearing doesn't work, try these manual steps:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Chrome/Edge:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Press F12 to open DevTools</li>
                <li>Go to Application tab</li>
                <li>Click "Clear storage" in the left sidebar</li>
                <li>Click "Clear site data"</li>
              </ol>
              
              <p className="mt-4"><strong>Firefox:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Press F12 to open DevTools</li>
                <li>Go to Storage tab</li>
                <li>Right-click on the domain and select "Delete All"</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}