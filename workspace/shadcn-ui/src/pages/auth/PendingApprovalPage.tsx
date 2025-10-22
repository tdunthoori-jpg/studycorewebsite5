import { useAuth } from '@/contexts/SimpleAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Mail, User, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function PendingApprovalPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleRefresh = () => {
    navigate('/dashboard');
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold">Account Pending Approval</h1>
          <p className="text-muted-foreground">
            Your account is waiting for administrator approval before you can access the platform.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your account details are shown below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="font-medium">{profile.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="font-medium">{profile.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <div className="flex items-center gap-2">
                  <Badge className="capitalize border border-input bg-background">
                    {profile.role}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Created</label>
                <p className="font-medium">
                  {format(new Date(profile.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            {profile.bio && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bio</label>
                <p className="text-sm">{profile.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your account has been created successfully and is now pending administrator approval. 
            You'll receive access to the platform once an administrator reviews and approves your account.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What happens next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Administrator Review</p>
                <p className="text-sm text-muted-foreground">
                  An administrator will review your account information and verify your details.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                2
              </div>
              <div>
                <p className="font-medium">Approval Notification</p>
                <p className="text-sm text-muted-foreground">
                  Once approved, you'll be able to log in and access all platform features.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Full Access</p>
                <p className="text-sm text-muted-foreground">
                  {profile.role === 'tutor' 
                    ? 'Create classes, manage students, and start tutoring!' 
                    : 'Browse classes, enroll in courses, and start learning!'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button className="border border-input bg-background hover:bg-accent hover:text-accent-foreground" onClick={handleRefresh}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Check Again
          </Button>
          <Button className="border border-input bg-background hover:bg-accent hover:text-accent-foreground" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact support at{' '}
            <a href="mailto:support@example.com" className="text-primary hover:underline">
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}