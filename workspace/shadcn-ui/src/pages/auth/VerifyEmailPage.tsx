import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { toast } from '@/components/ui/sonner';
import { checkAuthStatus } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabase';

export default function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, resendVerificationEmail } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<'checking' | 'verified' | 'error'>('checking');
  const [isResending, setIsResending] = useState(false);
  
  const verified = searchParams.get('verified');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const emailParam = searchParams.get('email');

  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        // Check for URL parameters first
        if (error) {
          setVerificationStatus('error');
          return;
        }

        if (verified === 'true') {
          setVerificationStatus('verified');
          return;
        }

        // Check directly with Supabase for most up-to-date status
        const status = await checkAuthStatus();
        
        if (status.isVerified) {
          setVerificationStatus('verified');
          return;
        }
        
        // If we get here and we have a user from auth context, do another check
        if (user && !user.email_confirmed_at) {
          // Force refresh the user data to get the latest verification status
          const { data } = await supabase.auth.getUser();
          if (data?.user?.email_confirmed_at) {
            setVerificationStatus('verified');
          }
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };
    
    checkVerificationStatus();
  }, [verified, error, user]);

  const handleContinue = () => {
    if (user?.email_confirmed_at) {
      navigate('/setup-profile');
    } else {
      navigate('/login');
    }
  };

  const handleResendEmail = async () => {
    const email = emailParam || user?.email;
    if (!email) {
      toast.error('No email address found. Please try logging in again.');
      navigate('/login');
      return;
    }

    try {
      setIsResending(true);
      
      // First try using auth context
      if (resendVerificationEmail) {
        await resendVerificationEmail(email);
      } else {
        // Fallback to direct Supabase call
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim().toLowerCase(),
          options: {
            emailRedirectTo: `${window.location.origin}/login?verified=true`
          }
        });
        
        if (error) {
          throw error;
        }
        
        toast.success('Verification email sent!');
      }
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      toast.error(error?.message || 'Failed to send verification email');
    } finally {
      setIsResending(false);
    }
  };

  if (loading || verificationStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Verifying your email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {verificationStatus === 'verified' ? (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-600">Email Verified!</CardTitle>
              <CardDescription>
                Your email has been successfully verified. You can now complete your profile.
              </CardDescription>
            </>
          ) : verificationStatus === 'error' ? (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-600">Verification Failed</CardTitle>
              <CardDescription>
                There was an issue verifying your email address.
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
              <CardDescription>
                We've sent a verification link to your email address.
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {verificationStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorDescription || 'The verification link may be invalid or expired.'}
              </AlertDescription>
            </Alert>
          )}

          {verificationStatus === 'verified' ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Welcome! Let's complete your profile to get started.
                </AlertDescription>
              </Alert>
              <Button onClick={handleContinue} className="w-full">
                Complete Profile
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 space-y-2">
                <p>• Click the verification link in your email</p>
                <p>• Check your spam folder if you don't see it</p>
                <p>• The link will redirect you back here</p>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleResendEmail} 
                  variant="outline" 
                  className="w-full" 
                  disabled={isResending}
                >
                  {isResending ? 'Sending...' : 'Resend Verification Email'}
                </Button>
                <Button onClick={() => navigate('/login')} variant="ghost" className="w-full">
                  Back to Login
                </Button>
                <Button onClick={() => navigate('/clear-data')} variant="ghost" className="w-full text-xs text-gray-500">
                  Clear Browser Data
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}