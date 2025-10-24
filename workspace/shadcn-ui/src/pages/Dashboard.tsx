import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  BookOpen, 
  Users, 
  Calendar, 
  FileText, 
  MessageSquare, 
  Bell,
  Plus,
  Clock,
  TrendingUp
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations';

interface DashboardStats {
  totalClasses: number;
  totalStudents: number;
  totalAssignments: number;
  unreadMessages: number;
  upcomingClasses: number;
  pendingSubmissions: number;
}

interface RecentActivity {
  id: string;
  type: 'enrollment' | 'assignment' | 'submission' | 'message';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
  };
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalClasses: 0,
    totalStudents: 0,
    totalAssignments: 0,
    unreadMessages: 0,
    upcomingClasses: 0,
    pendingSubmissions: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) {
      navigate('/login');
      return;
    }

    const loadDashboardData = async () => {
      setLoading(true);
      try {
        if (profile.role === 'tutor') {
          await loadTutorData();
        } else {
          await loadStudentData();
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user, profile]);

  const loadTutorData = async () => {
    try {
      // Get tutor's classes
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name, max_students')
        .eq('tutor_id', user!.id);

      const classIds = classes?.map(c => c.id) || [];

      // Get enrollment count
      const { count: studentCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .in('class_id', classIds)
        .eq('status', 'active');

      // Get assignments count
      const { count: assignmentCount } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .in('class_id', classIds);

      // Get unread messages
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user!.id)
        .eq('read', false);

      // Get pending submissions
      const { count: submissionCount } = await supabase
        .from('submissions')
        .select('*, assignments!inner(class_id)', { count: 'exact', head: true })
        .in('assignments.class_id', classIds)
        .is('grade', null);

      setStats({
        totalClasses: classes?.length || 0,
        totalStudents: studentCount || 0,
        totalAssignments: assignmentCount || 0,
        unreadMessages: messageCount || 0,
        upcomingClasses: 0, // Could implement schedule checking
        pendingSubmissions: submissionCount || 0
      });

      // Load recent activity
      await loadTutorActivity(classIds);

    } catch (error) {
      console.error('Error loading tutor data:', error);
      throw error;
    }
  };

  const loadStudentData = async () => {
    try {
      // Get student's enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id, classes(id, name)')
        .eq('student_id', user!.id)
        .eq('status', 'active');

      const classIds = enrollments?.map(e => e.class_id) || [];

      // Get assignments count
      const { count: assignmentCount } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .in('class_id', classIds);

      // Get unread messages
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user!.id)
        .eq('read', false);

      // Get pending submissions (assignments without submissions)
      const { data: submissions } = await supabase
        .from('submissions')
        .select('assignment_id')
        .eq('student_id', user!.id);

      const submittedAssignmentIds = submissions?.map(s => s.assignment_id) || [];

      const { count: pendingCount } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .in('class_id', classIds)
        .not('id', 'in', `(${submittedAssignmentIds.join(',') || 'null'})`);

      setStats({
        totalClasses: enrollments?.length || 0,
        totalStudents: 0,
        totalAssignments: assignmentCount || 0,
        unreadMessages: messageCount || 0,
        upcomingClasses: 0,
        pendingSubmissions: pendingCount || 0
      });

      // Load recent activity
      await loadStudentActivity(classIds);

    } catch (error) {
      console.error('Error loading student data:', error);
      throw error;
    }
  };

  const loadTutorActivity = async (classIds: string[]) => {
    // Implementation for recent tutor activity
    setRecentActivity([]);
  };

  const loadStudentActivity = async (classIds: string[]) => {
    // Implementation for recent student activity
    setRecentActivity([]);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="show"
      variants={staggerContainer}
    >
      {/* Header */}
      <motion.div 
        className="flex justify-between items-center"
        variants={fadeUp}
      >
        <div>
          <h1 className="text-3xl font-bold text-sky-300">
            Welcome back, {profile?.full_name}
          </h1>
          <p className="text-sky-100/70">
            {profile?.role === 'tutor' ? 'Manage your classes and students' : 'Track your learning progress'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/messages')}
            className="border-sky-400 text-sky-300 hover:bg-sky-500/20"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
            {stats.unreadMessages > 0 && (
              <Badge className="ml-2 bg-gradient-to-r from-sky-500 to-indigo-500">
                {stats.unreadMessages}
              </Badge>
            )}
          </Button>
          {profile?.role === 'tutor' && (
            <Button 
              onClick={() => navigate('/classes/create')}
              className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Class
            </Button>
          )}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={staggerContainer}
      >
        <motion.div variants={staggerItem}>
          <Card className="bg-blue-900/60 border-blue-700/60 hover:border-sky-500/50 transition-all duration-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">
                {profile?.role === 'tutor' ? 'Total Classes' : 'Enrolled Classes'}
              </CardTitle>
              <BookOpen className="h-4 w-4 text-sky-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalClasses}</div>
              <p className="text-xs text-sky-100/60">
                {profile?.role === 'tutor' ? 'Active classes' : 'Currently enrolled'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {profile?.role === 'tutor' && (
          <motion.div variants={staggerItem}>
            <Card className="bg-blue-900/60 border-blue-700/60 hover:border-sky-500/50 transition-all duration-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Total Students</CardTitle>
                <Users className="h-4 w-4 text-sky-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalStudents}</div>
                <p className="text-xs text-sky-100/60">
                  Across all classes
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={staggerItem}>
          <Card className="bg-blue-900/60 border-blue-700/60 hover:border-sky-500/50 transition-all duration-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">
                {profile?.role === 'tutor' ? 'Total Assignments' : 'Assignments'}
              </CardTitle>
              <FileText className="h-4 w-4 text-sky-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalAssignments}</div>
              <p className="text-xs text-sky-100/60">
                {profile?.role === 'tutor' ? 'Created assignments' : 'Available assignments'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card className="bg-blue-900/60 border-blue-700/60 hover:border-sky-500/50 transition-all duration-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">
                {profile?.role === 'tutor' ? 'Pending Reviews' : 'Pending Work'}
              </CardTitle>
              <Clock className="h-4 w-4 text-sky-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.pendingSubmissions}</div>
              <p className="text-xs text-sky-100/60">
                {profile?.role === 'tutor' ? 'Submissions to grade' : 'Assignments due'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={staggerContainer}
      >
        <motion.div variants={staggerItem}>
          <Card className="bg-blue-900/60 border-blue-700/60 hover:border-sky-500/50 transition-all duration-500">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
              <CardDescription className="text-sky-100/70">
                {profile?.role === 'tutor' ? 'Manage your teaching' : 'Access your learning tools'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start border-sky-400 text-sky-300 hover:bg-sky-500/20"
                onClick={() => navigate('/classes')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                {profile?.role === 'tutor' ? 'Manage Classes' : 'View Classes'}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-sky-400 text-sky-300 hover:bg-sky-500/20"
                onClick={() => navigate('/assignments')}
              >
                <FileText className="h-4 w-4 mr-2" />
                {profile?.role === 'tutor' ? 'Manage Assignments' : 'View Assignments'}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-sky-400 text-sky-300 hover:bg-sky-500/20"
                onClick={() => navigate('/schedule')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                View Schedule
              </Button>
              {profile?.role === 'tutor' && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-sky-400 text-sky-300 hover:bg-sky-500/20"
                  onClick={() => navigate('/students')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  View Students
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card className="bg-blue-900/60 border-blue-700/60 hover:border-sky-500/50 transition-all duration-500">
            <CardHeader>
              <CardTitle className="text-white">Recent Activity</CardTitle>
              <CardDescription className="text-sky-100/70">
                Latest updates from your {profile?.role === 'tutor' ? 'classes' : 'learning'}
              </CardDescription>
            </CardHeader>
            <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user?.avatar} />
                      <AvatarFallback>
                        {activity.user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{activity.title}</p>
                      <p className="text-xs text-sky-100/60">
                        {activity.description}
                      </p>
                      <p className="text-xs text-sky-100/60">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 mx-auto text-sky-400 mb-2" />
                <p className="text-sm text-sky-100/70">
                  No recent activity
                </p>
                <p className="text-xs text-sky-100/60">
                  {profile?.role === 'tutor' 
                    ? 'Start by creating your first class'
                    : 'Enroll in classes to see activity here'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      </motion.div>
    </motion.div>
  );
}