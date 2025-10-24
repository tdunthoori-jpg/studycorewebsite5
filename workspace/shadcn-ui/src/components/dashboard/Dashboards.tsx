import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase, Class, Schedule, Resource, Assignment } from '@/lib/supabase';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { checkDatabaseConnection, logDatabaseDebugInfo } from '@/lib/db-checker';
import { createTestDataIfNeeded } from '@/lib/test-data';
import { toast } from '@/components/ui/sonner';
import { CalendarIcon, BookOpenIcon, FileTextIcon, MessageSquareIcon, ExternalLinkIcon, ClockIcon, UsersIcon, ChevronRightIcon } from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';

export function StudentDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Use ref to track if data has been loaded to prevent unnecessary tab-switch reloading
  const dataLoadedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!user || !profile || profile.role !== 'student') {
      navigate('/login');
      return;
    }

    // Only fetch data if user has changed or data hasn't been loaded yet
    if (dataLoadedRef.current && userIdRef.current === user.id) {
      setLoading(false);
      return;
    }
    
    // Only fetch data once unless explicitly refreshed
    let isMounted = true;
    
    const fetchStudentData = async () => {
      // Check database connection first
      const isDbConnected = await checkDatabaseConnection();
      if (!isDbConnected) {
        if (isMounted) {
          toast.error('Database connection issues. Please try logging in again.');
        }
        return;
      }
      
      if (isMounted) {
        setLoading(true);
      }
      
      try {
        console.log('Fetching student data for user:', user.id);
        
        // Initialize data arrays
        let classesData: Class[] = [];
        let schedulesData: Schedule[] = [];
        let assignmentsData: Assignment[] = [];
        let resourcesData: Resource[] = [];
        
        // Make sure we're using a valid ID format
        if (!user.id || typeof user.id !== 'string' || user.id.length < 5) {
          console.error('Invalid user ID:', user.id);
          throw new Error('Invalid user ID format');
        }
        
        // Run database connection check first
        await logDatabaseDebugInfo().catch((err: any) => console.error('Debug info error:', err));
        
        console.log('Attempting to fetch enrollments with user ID:', user.id);
        
        // Fetch enrolled classes
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('class_id')
          .eq('student_id', user.id)
          .eq('status', 'active');

        console.log('Enrollment query result:', { enrollments, error: enrollmentError });

        if (enrollmentError) {
          console.error('Error fetching enrollments:', enrollmentError);
          toast.error('Error loading enrollments');
        } else if (enrollments && enrollments.length > 0) {
          console.log(`Found ${enrollments.length} enrollments`);
          const classIds = enrollments.map(enrollment => enrollment.class_id);
          
          // Fetch class details
          const { data: classes, error: classesError } = await supabase
            .from('classes')
            .select('*')
            .in('id', classIds);
            
          if (classesError) {
            console.error('Error fetching classes:', classesError);
            toast.error('Error loading class details');
          } else if (classes) {
            classesData = classes;
            
            // Fetch schedules
            const { data: schedules, error: schedulesError } = await supabase
              .from('schedules')
              .select('*')
              .in('class_id', classIds);
              
            if (schedulesError) {
              console.error('Error fetching schedules:', schedulesError);
            } else if (schedules) {
              schedulesData = schedules;
            }
            
            // Fetch assignments
            const { data: assignments, error: assignmentsError } = await supabase
              .from('assignments')
              .select('*')
              .in('class_id', classIds)
              .order('due_date', { ascending: true });
              
            if (assignmentsError) {
              console.error('Error fetching assignments:', assignmentsError);
            } else if (assignments) {
              assignmentsData = assignments;
            }
            
            // Fetch resources
            const { data: resources, error: resourcesError } = await supabase
              .from('resources')
              .select('*')
              .in('class_id', classIds);
              
            if (resourcesError) {
              console.error('Error fetching resources:', resourcesError);
            } else if (resources) {
              resourcesData = resources;
            }
          }
        } else if (!enrollments || enrollments.length === 0) {
          console.log('No enrollments found for student');
          toast.info('You are not enrolled in any classes yet.');
        }
        
        // Update state with fetched data (even if empty)
        setClasses(classesData);
        setSchedules(schedulesData);
        setAssignments(assignmentsData);
        setResources(resourcesData);
        
        console.log(`Loaded ${classesData.length} classes, ${schedulesData.length} schedules, ${assignmentsData.length} assignments, and ${resourcesData.length} resources`);
        
        // Mark data as loaded for this user
        if (isMounted) {
          dataLoadedRef.current = true;
          userIdRef.current = user.id;
        }
        
      } catch (error) {
        console.error('Error fetching student data:', error);
        toast.error('Error loading dashboard data');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchStudentData();
    
    // Cleanup function to cancel any pending operations
    return () => {
      isMounted = false;
    };
  }, [user?.id, profile?.role]); // Only re-run if user ID or role changes
  
  // Add a refresh function that can be called manually
  const refreshData = () => {
    dataLoadedRef.current = false;
    setLoading(true);
    // This will trigger the useEffect to run again
  };
  
  // Filter schedules for the selected date
  const todaySchedules = selectedDate 
    ? schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.start_time);
        return scheduleDate.toDateString() === selectedDate.toDateString();
      })
    : [];

  // Get upcoming assignments (due within 7 days)
  const upcomingAssignments = assignments.filter(assignment => {
    const dueDate = new Date(assignment.due_date);
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    return dueDate >= now && dueDate <= sevenDaysFromNow;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-3/4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Welcome, {profile?.full_name || 'Student'}!</CardTitle>
              <CardDescription>Here's an overview of your classes and upcoming events.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="classes">
                <TabsList className="mb-4">
                  <TabsTrigger value="classes">My Classes</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="assignments">Assignments</TabsTrigger>
                  <TabsTrigger value="resources">Resources</TabsTrigger>
                </TabsList>
                
                <TabsContent value="classes">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classes.length > 0 ? (
                      classes.map((cls) => (
                        <Card key={cls.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                            <CardTitle>{cls.name}</CardTitle>
                            <CardDescription>{cls.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center text-sm">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {schedules.filter(s => s.class_id === cls.id).length > 0 
                                  ? `${schedules.filter(s => s.class_id === cls.id).length} scheduled sessions` 
                                  : 'No scheduled sessions'}
                              </div>
                              <div className="flex items-center text-sm">
                                <FileTextIcon className="mr-2 h-4 w-4" />
                                {assignments.filter(a => a.class_id === cls.id).length > 0 
                                  ? `${assignments.filter(a => a.class_id === cls.id).length} assignments` 
                                  : 'No assignments'}
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/classes/${cls.id}`)}
                            >
                              View Details
                            </Button>
                          </CardFooter>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-2 p-4 text-center">
                        <p>You are not currently enrolled in any classes.</p>
                        <Button 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => navigate('/classes')}
                        >
                          Browse Available Classes
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="schedule">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="md:col-span-1">
                      <CardHeader>
                        <CardTitle className="text-lg">Calendar</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          className="rounded-md border"
                        />
                      </CardContent>
                    </Card>
                    
                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {selectedDate ? `Sessions for ${format(selectedDate, 'PPP')}` : 'Sessions'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {todaySchedules.length > 0 ? (
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-4">
                              {todaySchedules.map((schedule) => {
                                const classInfo = classes.find(c => c.id === schedule.class_id);
                                return (
                                  <div key={schedule.id} className="flex items-center justify-between p-3 rounded-md border">
                                    <div>
                                      <p className="font-medium">{classInfo?.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {format(new Date(schedule.start_time), 'h:mm a')} - {format(new Date(schedule.end_time), 'h:mm a')}
                                      </p>
                                    </div>
                                    {schedule.google_meet_link && (
                                      <Button size="sm" asChild>
                                        <a href={schedule.google_meet_link} target="_blank" rel="noopener noreferrer">
                                          <ExternalLinkIcon className="h-4 w-4 mr-1" />
                                          Join
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="text-center py-8">
                            <p>No sessions scheduled for this date.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="assignments">
                  {assignments.length > 0 ? (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4">
                        {assignments.map((assignment) => {
                          const classInfo = classes.find(c => c.id === assignment.class_id);
                          const dueDate = new Date(assignment.due_date);
                          const isOverdue = dueDate < new Date();
                          const isDueSoon = !isOverdue && dueDate <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
                          
                          return (
                            <Card key={assignment.id} className={`
                              hover:shadow-md transition-shadow
                              ${isOverdue ? 'border-red-400' : isDueSoon ? 'border-yellow-400' : 'border-green-400'}
                            `}>
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                  <CardTitle className="text-lg">{assignment.title}</CardTitle>
                                  <Badge variant={isOverdue ? "destructive" : isDueSoon ? "outline" : "default"}>
                                    {isOverdue 
                                      ? 'Overdue' 
                                      : `Due ${format(dueDate, 'MMM d')}`
                                    }
                                  </Badge>
                                </div>
                                <CardDescription>{classInfo?.name}</CardDescription>
                              </CardHeader>
                              <CardContent className="pb-2">
                                <p className="text-sm">{assignment.description}</p>
                              </CardContent>
                              <CardFooter className="flex justify-between">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate(`/assignments/${assignment.id}`)}
                                >
                                  View Details
                                </Button>
                                {assignment.file_url && (
                                  <Button 
                                    size="sm"
                                    variant="secondary"
                                    asChild
                                  >
                                    <a href={assignment.file_url} target="_blank" rel="noopener noreferrer">
                                      Download
                                    </a>
                                  </Button>
                                )}
                              </CardFooter>
                            </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8">
                      <p>No assignments found.</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="resources">
                  {resources.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {resources.map((resource) => {
                        const classInfo = classes.find(c => c.id === resource.class_id);
                        return (
                          <Card key={resource.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">{resource.title}</CardTitle>
                              <CardDescription>{classInfo?.name}</CardDescription>
                            </CardHeader>
                            <CardContent className="pb-2">
                              <Badge variant="outline" className="mb-2">{resource.resource_type}</Badge>
                              {resource.description && <p className="text-sm">{resource.description}</p>}
                            </CardContent>
                            <CardFooter>
                              <Button 
                                asChild 
                                size="sm"
                              >
                                <a href={resource.resource_url} target="_blank" rel="noopener noreferrer">
                                  Access Resource
                                </a>
                              </Button>
                            </CardFooter>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p>No resources available.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:w-1/4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Upcoming Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAssignments.length > 0 ? (
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    {upcomingAssignments.map((assignment) => (
                      <div 
                        key={assignment.id} 
                        className="p-2 rounded-md border hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/assignments/${assignment.id}`)}
                      >
                        <div className="font-medium line-clamp-1">{assignment.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Due {format(new Date(assignment.due_date), 'MMM d')}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-center py-4 text-sm">No upcoming assignments!</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/messages')}
              >
                <MessageSquareIcon className="h-4 w-4 mr-2" />
                Open Messages
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="link" 
                className="w-full justify-start p-0"
                onClick={() => navigate('/profile')}
              >
                My Profile
              </Button>
              <Button 
                variant="link" 
                className="w-full justify-start p-0"
                onClick={() => navigate('/resources')}
              >
                All Resources
              </Button>
              <Button 
                variant="link" 
                className="w-full justify-start p-0"
                onClick={() => navigate('/classes')}
              >
                Browse Classes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function TutorDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<{id: string, name: string, email: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Use ref to track if data has been loaded to prevent unnecessary tab-switch reloading
  const dataLoadedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!user || !profile || profile.role !== 'tutor') {
      navigate('/login');
      return;
    }

    // Only fetch data if user has changed or data hasn't been loaded yet
    if (dataLoadedRef.current && userIdRef.current === user.id) {
      setLoading(false);
      return;
    }

    // Run database connection check first
    logDatabaseDebugInfo().catch((err: any) => console.error('Debug info error:', err));
    
    const fetchTutorData = async () => {
      // Check database connection first
      const isDbConnected = await checkDatabaseConnection();
      if (!isDbConnected) {
        toast.error('Database connection issues. Please try logging in again.');
        return;
      }
      
      setLoading(true);
      
      try {
        console.log('Fetching tutor data for user:', user.id);
        
        // Initialize data arrays
        let classesData: Class[] = [];
        let schedulesData: Schedule[] = [];
        let assignmentsData: Assignment[] = [];
        let formattedStudents: {id: string, name: string, email: string}[] = [];
        
        // Make sure we're using a valid ID format
        if (!user.id || typeof user.id !== 'string' || user.id.length < 5) {
          console.error('Invalid user ID:', user.id);
          throw new Error('Invalid user ID format');
        }
        
        // Test data creation disabled
        console.log('Attempting to fetch classes with tutor ID:', user.id);
        
        // Fetch tutor's classes - this is the main data source
        const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select('*')
          .eq('tutor_id', user.id);
          
        console.log('Classes query result:', { classes, error: classesError });
          
        if (classesError) {
          console.error('Error fetching classes:', classesError);
          toast.error('Error loading classes');
        } else if (classes && classes.length > 0) {
          // Store the classes
          classesData = classes;
          
          const classIds = classes.map(cls => cls.id);
          
          // Fetch schedules for these classes
          const { data: schedules, error: schedulesError } = await supabase
            .from('schedules')
            .select('*')
            .in('class_id', classIds);
            
          if (schedulesError) {
            console.error('Error fetching schedules:', schedulesError);
          } else if (schedules) {
            schedulesData = schedules;
          }
          
          // Fetch assignments for these classes
          const { data: assignments, error: assignmentsError } = await supabase
            .from('assignments')
            .select('*')
            .in('class_id', classIds)
            .order('due_date', { ascending: true });
            
          if (assignmentsError) {
            console.error('Error fetching assignments:', assignmentsError);
          } else if (assignments) {
            assignmentsData = assignments;
          }
          
          // Fetch students enrolled in tutor's classes
          const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('student_id')
            .in('class_id', classIds)
            .eq('status', 'active');
            
          if (enrollmentsError) {
            console.error('Error fetching enrollments:', enrollmentsError);
          } else if (enrollments && enrollments.length > 0) {
            // Get unique student IDs
            const studentIds = [...new Set(enrollments.map(e => e.student_id))];
            
            // Fetch student profiles
            const { data: studentsData, error: studentsError } = await supabase
              .from('profiles')
              .select('id, user_id, full_name, email')
              .in('user_id', studentIds);
              
            if (studentsError) {
              console.error('Error fetching student profiles:', studentsError);
            } else if (studentsData) {
              // Map the profile data to match the expected student format
              formattedStudents = studentsData.map(student => ({
                id: student.user_id,
                name: student.full_name || 'Unknown',
                email: student.email
              }));
            }
          }
        } else if (!classes || classes.length === 0) {
          console.log('No classes found for tutor');
          toast.info('You have not created any classes yet.');
        }
        
        // Update state with fetched data (even if empty)
        setClasses(classesData);
        setSchedules(schedulesData);
        setAssignments(assignmentsData);
        setStudents(formattedStudents);
        
        console.log(`Loaded ${classesData.length} classes, ${schedulesData.length} schedules, ${assignmentsData.length} assignments, and ${formattedStudents.length} students`);
        
        // Mark data as loaded for this user
        dataLoadedRef.current = true;
        userIdRef.current = user.id;
        
      } catch (error) {
        console.error('Error fetching tutor data:', error);
        toast.error('Error loading dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTutorData();
  }, [user?.id, profile?.role]); // Only re-run if user ID or role changes
  
  // Filter schedules for the selected date
  const todaySchedules = selectedDate 
    ? schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.start_time);
        return scheduleDate.toDateString() === selectedDate.toDateString();
      })
    : [];

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-3/4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Welcome, {profile?.full_name || 'Tutor'}!</CardTitle>
              <CardDescription>Manage your classes and students here.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="classes">
                <TabsList className="mb-4">
                  <TabsTrigger value="classes">My Classes</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="assignments">Assignments</TabsTrigger>
                  <TabsTrigger value="students">Students</TabsTrigger>
                </TabsList>
                
                <TabsContent value="classes">
                  <div className="flex justify-end mb-4">
                    <Button onClick={() => navigate('/classes/create')}>
                      Create New Class
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classes.length > 0 ? (
                      classes.map((cls) => (
                        <Card key={cls.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                            <CardTitle>{cls.name}</CardTitle>
                            <CardDescription>{cls.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center text-sm">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {schedules.filter(s => s.class_id === cls.id).length > 0 
                                  ? `${schedules.filter(s => s.class_id === cls.id).length} scheduled sessions` 
                                  : 'No scheduled sessions'}
                              </div>
                              <div className="flex items-center text-sm">
                                <FileTextIcon className="mr-2 h-4 w-4" />
                                {assignments.filter(a => a.class_id === cls.id).length} assignments
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter className="flex justify-between">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/classes/${cls.id}`)}
                            >
                              View Details
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/classes/${cls.id}/edit`)}
                            >
                              Edit
                            </Button>
                          </CardFooter>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-2 p-4 text-center">
                        <p>You haven't created any classes yet.</p>
                        <Button 
                          className="mt-2"
                          onClick={() => navigate('/classes/create')}
                        >
                          Create Your First Class
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="schedule">
                  <div className="flex justify-end mb-4">
                    <Button onClick={() => navigate('/schedule/create')}>
                      Add New Session
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="md:col-span-1">
                      <CardHeader>
                        <CardTitle className="text-lg">Calendar</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          className="rounded-md border"
                        />
                      </CardContent>
                    </Card>
                    
                    <Card className="md:col-span-2">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">
                          {selectedDate ? `Sessions for ${format(selectedDate, 'PPP')}` : 'Sessions'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {todaySchedules.length > 0 ? (
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-4">
                              {todaySchedules.map((schedule) => {
                                const classInfo = classes.find(c => c.id === schedule.class_id);
                                return (
                                  <div key={schedule.id} className="flex items-center justify-between p-3 rounded-md border">
                                    <div>
                                      <p className="font-medium">{classInfo?.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {format(new Date(schedule.start_time), 'h:mm a')} - {format(new Date(schedule.end_time), 'h:mm a')}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {schedule.google_meet_link && (
                                        <Button size="sm" asChild>
                                          <a href={schedule.google_meet_link} target="_blank" rel="noopener noreferrer">
                                            <ExternalLinkIcon className="h-4 w-4 mr-1" />
                                            Join
                                          </a>
                                        </Button>
                                      )}
                                      <Button size="sm" variant="outline" onClick={() => navigate(`/schedule/${schedule.id}/edit`)}>
                                        Edit
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="text-center py-8">
                            <p>No sessions scheduled for this date.</p>
                            <Button 
                              variant="outline" 
                              className="mt-2"
                              onClick={() => navigate('/schedule/create')}
                            >
                              Add Session
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="assignments">
                  <div className="flex justify-end mb-4">
                    <Button onClick={() => navigate('/assignments/create')}>
                      Create Assignment
                    </Button>
                  </div>
                  
                  {assignments.length > 0 ? (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4">
                        {assignments.map((assignment) => {
                          const classInfo = classes.find(c => c.id === assignment.class_id);
                          const dueDate = new Date(assignment.due_date);
                          
                          return (
                            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                  <CardTitle className="text-lg">{assignment.title}</CardTitle>
                                  <Badge>Due {format(dueDate, 'MMM d')}</Badge>
                                </div>
                                <CardDescription>{classInfo?.name}</CardDescription>
                              </CardHeader>
                              <CardContent className="pb-2">
                                <p className="text-sm">{assignment.description}</p>
                              </CardContent>
                              <CardFooter className="flex justify-between">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate(`/assignments/${assignment.id}`)}
                                >
                                  View Submissions
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/assignments/${assignment.id}`)}
                                >
                                  Edit
                                </Button>
                              </CardFooter>
                            </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8">
                      <p>No assignments created yet.</p>
                      <Button 
                        className="mt-2"
                        onClick={() => navigate('/assignments/create')}
                      >
                        Create Your First Assignment
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="students">
                  {students.length > 0 ? (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4">
                        {students.map((student) => (
                          <Card key={student.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                              <div className="flex items-center gap-4">
                                <Avatar>
                                  <AvatarFallback>
                                    {student.name?.split(' ').map(n => n[0]).join('') || 'ST'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <CardTitle className="text-lg">{student.name}</CardTitle>
                                  <CardDescription>{student.email}</CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardFooter className="flex justify-between">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/students/${student.id}`)}
                              >
                                View Progress
                              </Button>
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/messages?to=${student.id}`)}
                              >
                                Message
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8">
                      <p>No students enrolled in your classes yet.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:w-1/4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {todaySchedules.length > 0 ? (
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    {todaySchedules.map((schedule) => {
                      const classInfo = classes.find(c => c.id === schedule.class_id);
                      return (
                        <div 
                          key={schedule.id} 
                          className="p-2 rounded-md border hover:bg-muted/50 cursor-pointer"
                          onClick={() => navigate(`/schedule/${schedule.id}`)}
                        >
                          <div className="font-medium line-clamp-1">{classInfo?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(schedule.start_time), 'h:mm a')} - {format(new Date(schedule.end_time), 'h:mm a')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-center py-4 text-sm">No sessions scheduled for today!</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/messages')}
              >
                <MessageSquareIcon className="h-4 w-4 mr-2" />
                Open Messages
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="link" 
                className="w-full justify-start p-0"
                onClick={() => navigate('/profile')}
              >
                My Profile
              </Button>
              <Button 
                variant="link" 
                className="w-full justify-start p-0"
                onClick={() => navigate('/classes/create')}
              >
                Create New Class
              </Button>
              <Button 
                variant="link" 
                className="w-full justify-start p-0"
                onClick={() => navigate('/resources/create')}
              >
                Upload Resource
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}