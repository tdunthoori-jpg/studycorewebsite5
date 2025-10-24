import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase, Class, Enrollment, Assignment, Submission, Schedule } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3Icon, 
  UsersIcon, 
  FileTextIcon,
  TrendingUpIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  GraduationCapIcon,
  ActivityIcon
} from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks } from 'date-fns';

interface ClassAnalyticsProps {
  classData: Class;
  assignments: Assignment[];
  isOwner: boolean;
}

interface AnalyticsData {
  enrollmentCount: number;
  activeStudents: number;
  assignmentCount: number;
  submissionRate: number;
  averageGrade: number;
  upcomingAssignments: number;
  scheduleCount: number;
  recentActivity: ActivityItem[];
  gradeDistribution: GradeDistribution[];
  submissionTrends: SubmissionTrend[];
  studentPerformance: StudentPerformance[];
}

interface ActivityItem {
  type: 'enrollment' | 'submission' | 'grade' | 'assignment';
  description: string;
  timestamp: string;
  studentName?: string;
}

interface GradeDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface SubmissionTrend {
  date: string;
  submissions: number;
  assignments: number;
}

interface StudentPerformance {
  studentId: string;
  studentName: string;
  submissionsCount: number;
  averageGrade: number;
  lastActivity: string;
}

export default function ClassAnalytics({ 
  classData, 
  assignments,
  isOwner 
}: ClassAnalyticsProps) {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    if (isOwner) {
      fetchAnalyticsData();
    } else {
      fetchStudentAnalytics();
    }
  }, [classData.id, assignments, isOwner]);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);

      // Get enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          *,
          profiles:student_id (full_name)
        `)
        .eq('class_id', classData.id);

      // Get submissions with student info
      const { data: submissions } = await supabase
        .from('submissions')
        .select(`
          *,
          assignments:assignment_id (title),
          profiles:student_id (full_name)
        `)
        .in('assignment_id', assignments.map(a => a.id));

      // Get schedules
      const { data: schedules } = await supabase
        .from('schedules')
        .select('*')
        .eq('class_id', classData.id);

      // Calculate analytics
      const enrollmentCount = enrollments?.length || 0;
      const activeStudents = enrollments?.filter(e => e.status === 'active').length || 0;
      const assignmentCount = assignments.length;
      
      const totalPossibleSubmissions = assignmentCount * activeStudents;
      const actualSubmissions = submissions?.length || 0;
      const submissionRate = totalPossibleSubmissions > 0 ? (actualSubmissions / totalPossibleSubmissions) * 100 : 0;

      const gradedSubmissions = submissions?.filter(s => s.grade !== null && s.grade !== undefined) || [];
      const averageGrade = gradedSubmissions.length > 0 
        ? gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length 
        : 0;

      const now = new Date();
      const upcomingAssignments = assignments.filter(a => parseISO(a.due_date) > now).length;

      // Grade distribution
      const gradeDistribution = calculateGradeDistribution(gradedSubmissions);

      // Submission trends (last 4 weeks)
      const submissionTrends = calculateSubmissionTrends(submissions || [], assignments);

      // Student performance
      const studentPerformance = calculateStudentPerformance(enrollments || [], submissions || []);

      // Recent activity
      const recentActivity = generateRecentActivity(enrollments || [], submissions || [], assignments);

      setAnalyticsData({
        enrollmentCount,
        activeStudents,
        assignmentCount,
        submissionRate,
        averageGrade,
        upcomingAssignments,
        scheduleCount: schedules?.length || 0,
        recentActivity,
        gradeDistribution,
        submissionTrends,
        studentPerformance,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentAnalytics = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get student's submissions
      const { data: submissions } = await supabase
        .from('submissions')
        .select(`
          *,
          assignments:assignment_id (title, due_date)
        `)
        .eq('student_id', user.id)
        .in('assignment_id', assignments.map(a => a.id));

      const submissionCount = submissions?.length || 0;
      const gradedSubmissions = submissions?.filter(s => s.grade !== null && s.grade !== undefined) || [];
      const averageGrade = gradedSubmissions.length > 0 
        ? gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length 
        : 0;

      const submissionRate = assignments.length > 0 ? (submissionCount / assignments.length) * 100 : 0;

      const now = new Date();
      const upcomingAssignments = assignments.filter(a => parseISO(a.due_date) > now).length;

      // Simple activity for students
      const recentActivity: ActivityItem[] = (submissions || [])
        .slice(-5)
        .map(s => ({
          type: s.grade !== null ? 'grade' : 'submission',
          description: s.grade !== null 
            ? `Received grade (${s.grade}%) for ${(s as any).assignments?.title}` 
            : `Submitted ${(s as any).assignments?.title}`,
          timestamp: s.grade !== null ? s.graded_at || s.updated_at : s.submitted_at,
        }))
        .reverse();

      setAnalyticsData({
        enrollmentCount: 1,
        activeStudents: 1,
        assignmentCount: assignments.length,
        submissionRate,
        averageGrade,
        upcomingAssignments,
        scheduleCount: 0,
        recentActivity,
        gradeDistribution: [],
        submissionTrends: [],
        studentPerformance: [],
      });
    } catch (error) {
      console.error('Error fetching student analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateGradeDistribution = (submissions: any[]): GradeDistribution[] => {
    const ranges = [
      { min: 90, max: 100, label: 'A (90-100%)' },
      { min: 80, max: 89, label: 'B (80-89%)' },
      { min: 70, max: 79, label: 'C (70-79%)' },
      { min: 60, max: 69, label: 'D (60-69%)' },
      { min: 0, max: 59, label: 'F (0-59%)' },
    ];

    const total = submissions.length;

    return ranges.map(range => {
      const count = submissions.filter(s => 
        s.grade >= range.min && s.grade <= range.max
      ).length;
      
      return {
        range: range.label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      };
    });
  };

  const calculateSubmissionTrends = (submissions: any[], assignments: Assignment[]): SubmissionTrend[] => {
    const weeks = [];
    const now = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i));
      const weekEnd = endOfWeek(weekStart);
      
      const weekSubmissions = submissions.filter(s => {
        const submissionDate = parseISO(s.submitted_at);
        return submissionDate >= weekStart && submissionDate <= weekEnd;
      }).length;

      const weekAssignments = assignments.filter(a => {
        const dueDate = parseISO(a.due_date);
        return dueDate >= weekStart && dueDate <= weekEnd;
      }).length;

      weeks.push({
        date: format(weekStart, 'MMM d'),
        submissions: weekSubmissions,
        assignments: weekAssignments,
      });
    }

    return weeks;
  };

  const calculateStudentPerformance = (enrollments: any[], submissions: any[]): StudentPerformance[] => {
    return enrollments
      .filter(e => e.status === 'active')
      .map(enrollment => {
        const studentSubmissions = submissions.filter(s => s.student_id === enrollment.student_id);
        const gradedSubmissions = studentSubmissions.filter(s => s.grade !== null);
        
        const averageGrade = gradedSubmissions.length > 0 
          ? gradedSubmissions.reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions.length 
          : 0;

        const lastSubmission = studentSubmissions
          .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0];

        return {
          studentId: enrollment.student_id,
          studentName: enrollment.profiles?.full_name || 'Unknown Student',
          submissionsCount: studentSubmissions.length,
          averageGrade,
          lastActivity: lastSubmission ? lastSubmission.submitted_at : enrollment.created_at,
        };
      })
      .sort((a, b) => b.averageGrade - a.averageGrade);
  };

  const generateRecentActivity = (enrollments: any[], submissions: any[], assignments: Assignment[]): ActivityItem[] => {
    const activities: ActivityItem[] = [];

    // Recent enrollments
    enrollments.slice(-3).forEach(e => {
      activities.push({
        type: 'enrollment',
        description: `${e.profiles?.full_name || 'A student'} enrolled in the class`,
        timestamp: e.created_at,
        studentName: e.profiles?.full_name,
      });
    });

    // Recent submissions
    submissions.slice(-5).forEach(s => {
      activities.push({
        type: s.grade !== null ? 'grade' : 'submission',
        description: s.grade !== null 
          ? `Graded ${s.assignments?.title} (${s.grade}%)`
          : `New submission for ${s.assignments?.title}`,
        timestamp: s.grade !== null ? s.graded_at || s.updated_at : s.submitted_at,
        studentName: s.profiles?.full_name,
      });
    });

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="h-5 w-5" />
            Class Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analyticsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="h-5 w-5" />
            Class Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircleIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Failed to load analytics data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-blue-900/60 border-blue-700/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <BarChart3Icon className="h-5 w-5 text-sky-300" />
          Class Analytics
        </CardTitle>
        <CardDescription className="text-sky-100/70">
          {isOwner 
            ? 'Insights and metrics for your class performance'
            : 'Your performance and progress in this class'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2 bg-blue-900/60 border-blue-700/60">
            <TabsTrigger value="overview" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300">Overview</TabsTrigger>
            <TabsTrigger value="performance" disabled={!isOwner} className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300">
              {isOwner ? 'Performance' : 'Detailed Stats'}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <UsersIcon className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {isOwner ? 'Active Students' : 'Class Size'}
                      </p>
                      <p className="text-2xl font-bold">{analyticsData.activeStudents}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <FileTextIcon className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Assignments</p>
                      <p className="text-2xl font-bold">{analyticsData.assignmentCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUpIcon className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {isOwner ? 'Submission Rate' : 'Completion Rate'}
                      </p>
                      <p className="text-2xl font-bold">{analyticsData.submissionRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <GraduationCapIcon className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Average Grade</p>
                      <p className="text-2xl font-bold">
                        {analyticsData.averageGrade > 0 ? `${analyticsData.averageGrade.toFixed(1)}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Class Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Assignments Completed</span>
                    <span>{analyticsData.submissionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={analyticsData.submissionRate} className="h-2" />
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{analyticsData.assignmentCount - analyticsData.upcomingAssignments}</p>
                    <p className="text-sm text-muted-foreground">Past Due</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{analyticsData.upcomingAssignments}</p>
                    <p className="text-sm text-muted-foreground">Upcoming</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{isOwner ? analyticsData.scheduleCount : 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">Scheduled Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ActivityIcon className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {analyticsData.recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {analyticsData.recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                          <div className="flex-shrink-0">
                            {activity.type === 'enrollment' && <UsersIcon className="h-4 w-4 text-blue-500" />}
                            {activity.type === 'submission' && <FileTextIcon className="h-4 w-4 text-green-500" />}
                            {activity.type === 'grade' && <GraduationCapIcon className="h-4 w-4 text-purple-500" />}
                            {activity.type === 'assignment' && <CalendarIcon className="h-4 w-4 text-orange-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{activity.description}</p>
                            {activity.studentName && isOwner && (
                              <p className="text-xs text-muted-foreground">by {activity.studentName}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(activity.timestamp), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          {isOwner && (
            <TabsContent value="performance" className="space-y-6">
              {/* Grade Distribution */}
              {analyticsData.gradeDistribution.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Grade Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analyticsData.gradeDistribution.map((grade, index) => (
                        <div key={index}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{grade.range}</span>
                            <span>{grade.count} students ({grade.percentage.toFixed(1)}%)</span>
                          </div>
                          <Progress value={grade.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Student Performance */}
              {analyticsData.studentPerformance.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Student Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {analyticsData.studentPerformance.map((student, index) => (
                          <div key={student.studentId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div>
                              <p className="font-medium">{student.studentName}</p>
                              <p className="text-sm text-muted-foreground">
                                {student.submissionsCount} submissions
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Last active: {format(parseISO(student.lastActivity), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge 
                                variant={student.averageGrade >= 90 ? "default" : student.averageGrade >= 70 ? "secondary" : "destructive"}
                                className="text-sm"
                              >
                                {student.averageGrade > 0 ? `${student.averageGrade.toFixed(1)}%` : 'No grades'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}