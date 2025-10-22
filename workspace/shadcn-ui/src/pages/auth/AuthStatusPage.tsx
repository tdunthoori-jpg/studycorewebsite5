import { useAuth } from '@/contexts/SimpleAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Mail, User, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AuthStatusPage() {
  const { user, profile, loading, initializing } = useAuth();
  const navigate = useNavigate();

  if (loading || initializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading authentication status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">Authentication Status</h1>
        
        {/* User Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <Badge variant="default">Signed In</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Email:</span>
                  <span className="font-mono text-sm">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Email Verified:</span>
                  {user.email_confirmed_at ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Verified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Role:</span>
                  <Badge variant="outline">
                    {user.user_metadata?.role || 'Not Set'}
                  </Badge>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No user session found. Please sign in.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Profile Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Profile Status:</span>
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Full Name:</span>
                  <span>{profile.full_name || 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Bio:</span>
                  <span>{profile.bio || 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Role:</span>
                  <Badge variant="outline">{profile.role}</Badge>
                </div>
              </div>
            ) : user ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Profile not found or incomplete. Please complete your profile setup.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please sign in to view profile information.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Based on your current status, here are the next steps:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {!user && (
                <>
                  <Button onClick={() => navigate('/login')} className="w-full">
                    Sign In
                  </Button>
                  <Button onClick={() => navigate('/register')} variant="outline" className="w-full">
                    Create Account
                  </Button>
                </>
              )}
              
              {user && !user.email_confirmed_at && (
                <Button onClick={() => navigate('/verify-email')} className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Verify Email
                </Button>
              )}
              
              {user && user.email_confirmed_at && !profile?.full_name && (
                <Button onClick={() => navigate('/setup-profile')} className="w-full">
                  Complete Profile
                </Button>
              )}
              
              {user && user.email_confirmed_at && profile?.full_name && (
                <Button onClick={() => navigate('/dashboard')} className="w-full">
                  Go to Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}