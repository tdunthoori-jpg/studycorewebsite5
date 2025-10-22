import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/sonner';
import { Users, UserCheck, UserX, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

type PendingUser = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'student' | 'tutor';
  bio?: string;
  created_at: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
};

type ApprovedUser = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'student' | 'tutor';
  approved_at: string;
  approved_by_name?: string;
};

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [recentApprovals, setRecentApprovals] = useState<ApprovedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (!user || !profile) {
      navigate('/login');
      return;
    }
    
    if (profile.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      navigate('/dashboard');
      return;
    }
    
    loadData();
  }, [user, profile, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load pending approvals
      const { data: pending, error: pendingError } = await supabase
        .from('pending_approvals')
        .select('*');
      
      if (pendingError) {
        console.error('Error loading pending approvals:', pendingError);
        toast.error('Failed to load pending approvals');
      } else {
        setPendingUsers(pending || []);
      }

      // Load recent approvals
      const { data: recent, error: recentError } = await supabase
        .from('recent_approvals')
        .select('*');
      
      if (recentError) {
        console.error('Error loading recent approvals:', recentError);
        toast.error('Failed to load recent approvals');
      } else {
        setRecentApprovals(recent || []);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string, userName: string) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.rpc('approve_user', {
        target_user_id: userId
      });

      if (error) {
        console.error('Error approving user:', error);
        toast.error('Failed to approve user');
        return;
      }

      toast.success(`${userName} has been approved successfully!`);
      loadData(); // Refresh the data
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectUser = async (userId: string, userName: string) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.rpc('reject_user', {
        target_user_id: userId
      });

      if (error) {
        console.error('Error rejecting user:', error);
        toast.error('Failed to reject user');
        return;
      }

      toast.success(`${userName} has been rejected.`);
      loadData(); // Refresh the data
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user || !profile || profile.role !== 'admin') {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={loadData} className="border border-input bg-background hover:bg-accent">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              Users awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Approvals</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentApprovals.length}</div>
            <p className="text-xs text-muted-foreground">
              Approved in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingUsers.length + recentApprovals.length}</div>
            <p className="text-xs text-muted-foreground">
              Active platform users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Management Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approvals ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Recent Approvals ({recentApprovals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending User Approvals</CardTitle>
              <CardDescription>
                Review and approve new user registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingUsers.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pending approvals</h3>
                  <p className="text-muted-foreground">All users have been processed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{user.full_name}</h4>
                            <Badge className="capitalize border border-input bg-background">
                              {user.role}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Registered {format(new Date(user.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={actionLoading === user.user_id}
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approve User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to approve {user.full_name}? 
                                  They will gain access to the platform immediately.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleApproveUser(user.user_id, user.full_name)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Approve User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={actionLoading === user.user_id}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to reject {user.full_name}? 
                                  They will remain unable to access the platform.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRejectUser(user.user_id, user.full_name)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Reject User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      {user.bio && (
                        <div className="pt-2 border-t">
                          <p className="text-sm">
                            <span className="font-medium">Bio:</span> {user.bio}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Recently Approved Users</CardTitle>
              <CardDescription>
                Users approved in the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentApprovals.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No recent approvals</h3>
                  <p className="text-muted-foreground">No users have been approved in the last 30 days.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentApprovals.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{user.full_name}</h4>
                            <Badge className="capitalize border border-input bg-background">
                              {user.role}
                            </Badge>
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Approved
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Approved {format(new Date(user.approved_at), 'MMM d, yyyy')}
                            {user.approved_by_name && ` by ${user.approved_by_name}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}