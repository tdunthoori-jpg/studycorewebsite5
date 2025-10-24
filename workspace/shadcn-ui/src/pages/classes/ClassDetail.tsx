import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase, Class, Schedule, ClassResource, Assignment, Profile } from '@/lib/supabase';
import CreateClassForm from '@/components/classes/CreateClassForm';
import TutorClassManagement from '@/components/classes/TutorClassManagement';
import StudentEnrollment from '@/components/classes/StudentEnrollment';
import ClassSchedule from '@/components/classes/ClassSchedule';
import ClassAssignments from '@/components/classes/ClassAssignments';
import ClassResources from '@/components/classes/ClassResources';
import ClassAnalytics from '@/components/classes/ClassAnalytics';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarIcon, 
  FileTextIcon, 
  Users2Icon, 
  BookOpenIcon,
  ExternalLinkIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/sonner';
import { motion } from 'framer-motion';
import { staggerContainer, fadeUp } from '@/lib/animations';

interface ClassDetailProps {
  isCreateMode?: boolean;
  defaultTab?: string;
}

export default function ClassDetail({ isCreateMode, defaultTab }: ClassDetailProps) {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [classData, setClassData] = useState<Class | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [resources, setResources] = useState<ClassResource[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [tutor, setTutor] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab || "overview");
  
  useEffect(() => {
    if (!user || !profile) {
      navigate('/dashboard');
      return;
    }
    
    // If in create mode, don't try to fetch a class
    if (isCreateMode) {
      setLoading(false);
      // Initialize empty class data for creation form
      // This would be expanded in a real implementation
      setClassData({
        id: '',
        name: '',
        description: '',
        tutor_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        max_students: 20,
        status: 'active'
      });
      return;
    }
    
    // Regular class detail mode - fetch existing class
    if (!id) {
      navigate('/classes');
      return;
    }
    
    const fetchClassData = async () => {
      setLoading(true);
      try {
        console.log(`Fetching data for class ID: ${id}`);
        
        if (!id || typeof id !== 'string' || id.length < 5) {
          console.error('Invalid class ID:', id);
          toast.error('Invalid class ID format');
          navigate('/classes');
          return;
        }
        
        // Fetch class details - this is the main requirement
        const { data: classDetails, error: classError } = await supabase
          .from('classes')
          .select('*')
          .eq('id', id)
          .single();
          
        console.log('Class details query result:', { classDetails, error: classError });
          
        if (classError) {
          console.error('Error fetching class details:', classError);
          toast.error('Class not found or you don\'t have access');
          navigate('/classes');
          return;
        }
        
        if (!classDetails) {
          console.log('No class details found in database');
          toast.error('Class not found');
          navigate('/classes');
          return;
        }
        
        // Class exists, set the data
        setClassData(classDetails);
        console.log('Class details loaded:', classDetails.name);
        
        // Now fetch all related data in parallel
        const promises = [];
        
        // 1. Fetch tutor profile
        const tutorPromise = supabase
          .from('profiles')
          .select('*')
          .eq('user_id', classDetails.tutor_id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching tutor details:', error);
            } else if (data) {
              setTutor(data);
              console.log('Tutor profile loaded:', data.full_name);
            }
          });
        promises.push(tutorPromise);
        
        // 2. Fetch schedules
        const schedulesPromise = supabase
          .from('schedules')
          .select('*')
          .eq('class_id', id)
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching schedules:', error);
            } else {
              setSchedules(data || []);
              console.log(`Loaded ${data?.length || 0} schedules`);
            }
          });
        promises.push(schedulesPromise);
        
        // 3. Fetch resources
        const resourcesPromise = supabase
          .from('resources')
          .select('*')
          .eq('class_id', id)
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching resources:', error);
            } else {
              setResources(data || []);
              console.log(`Loaded ${data?.length || 0} resources`);
            }
          });
        promises.push(resourcesPromise);
        
        // 4. Fetch assignments
        const assignmentsPromise = supabase
          .from('assignments')
          .select('*')
          .eq('class_id', id)
          .order('due_date', { ascending: true })
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching assignments:', error);
            } else {
              setAssignments(data || []);
              console.log(`Loaded ${data?.length || 0} assignments`);
            }
          });
        promises.push(assignmentsPromise);
        
        // 5. For student: check if enrolled
        if (profile.role === 'student') {
          const enrollmentPromise = supabase
            .from('enrollments')
            .select('*')
            .eq('class_id', id)
            .eq('student_id', user.id)
            .eq('status', 'active')
            .then(({ data, error }) => {
              if (error) {
                console.error('Error checking enrollment:', error);
              } else {
                const isStudentEnrolled = data && data.length > 0;
                setIsEnrolled(isStudentEnrolled);
                console.log('Enrollment status:', isStudentEnrolled ? 'Enrolled' : 'Not enrolled');
              }
            });
          promises.push(enrollmentPromise);
        }
        
        // 6. For tutor: fetch enrolled students
        if (profile.role === 'tutor' && user.id === classDetails.tutor_id) {
          const studentsPromise = supabase
            .from('enrollments')
            .select('student_id')
            .eq('class_id', id)
            .eq('status', 'active')
            .then(async ({ data: enrollmentsData, error: enrollmentsError }) => {
              if (enrollmentsError) {
                console.error('Error fetching enrollments:', enrollmentsError);
              } else if (enrollmentsData && enrollmentsData.length > 0) {
                const studentIds = enrollmentsData.map(e => e.student_id);
                
                // Get student profiles
                const { data: studentsData, error: studentsError } = await supabase
                  .from('profiles')
                  .select('*')
                  .in('user_id', studentIds);
                  
                if (studentsError) {
                  console.error('Error fetching student profiles:', studentsError);
                } else {
                  setStudents(studentsData || []);
                  console.log(`Loaded ${studentsData?.length || 0} enrolled students`);
                }
              } else {
                // No students enrolled
                setStudents([]);
                console.log('No students enrolled in this class');
              }
            });
          promises.push(studentsPromise);
        }
        
        // Wait for all data fetching to complete
        await Promise.all(promises);
        
      } catch (error) {
        console.error('Error fetching class data:', error);
        toast.error('Failed to load class data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClassData();
  }, [id, user, profile, navigate]);
  
  const handleEnroll = async () => {
    if (!user || !profile || profile.role !== 'student' || !classData) return;
    
    try {
      // Check if already enrolled
      const { data: existingEnrollment, error: checkError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('class_id', id)
        .eq('student_id', user.id)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') { // Not "no rows found" error
        console.error('Error checking enrollment:', checkError);
        toast.error('Failed to check enrollment status');
        return;
      }
      
      if (existingEnrollment) {
        toast.info('You are already enrolled in this class');
        setIsEnrolled(true);
        return;
      }
      
      // Create enrollment
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          class_id: id as string,
          student_id: user.id,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (enrollError) {
        console.error('Error enrolling in class:', enrollError);
        toast.error('Failed to enroll in class');
        return;
      }
      
      setIsEnrolled(true);
      toast.success('Successfully enrolled in class!');
    } catch (error) {
      console.error('Exception enrolling in class:', error);
      toast.error('An error occurred while enrolling');
    }
  };
  
  const handleUnenroll = async () => {
    if (!user || !profile || profile.role !== 'student') return;
    
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ status: 'dropped', updated_at: new Date().toISOString() })
        .eq('class_id', id)
        .eq('student_id', user.id);
        
      if (error) {
        console.error('Error unenrolling from class:', error);
        toast.error('Failed to unenroll from class');
        return;
      }
      
      setIsEnrolled(false);
      toast.success('Successfully unenrolled from class');
    } catch (error) {
      console.error('Exception unenrolling from class:', error);
      toast.error('An error occurred while unenrolling');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"></div>
        <p className="ml-3 text-sky-100">Loading class data...</p>
      </div>
    );
  }
  
  // If in create mode, show the create class form
  if (isCreateMode) {
    return (
      <CreateClassForm 
        onSuccess={(classId) => navigate(`/classes/${classId}`)}
        onCancel={() => navigate('/classes')}
      />
    );
  }
  
  if (!classData) {
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-blue-900/60 border-blue-700/60">
          <CardHeader>
            <CardTitle className="text-white">Class Not Found</CardTitle>
            <CardDescription className="text-sky-100/70">The class you are looking for does not exist or you do not have access to it.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400"
            >
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <motion.div 
      className="container mx-auto p-4 space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp} className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{classData.name}</h1>
          <p className="text-sky-100/70">{classData.description}</p>
        </div>
      </motion.div>
      
      {/* Student Enrollment Component */}
      {profile?.role === 'student' && (
        <motion.div variants={fadeUp}>
        <StudentEnrollment
          classData={classData}
          tutorProfile={tutor}
          isEnrolled={isEnrolled}
          onEnrollmentChange={setIsEnrolled}
        />
        </motion.div>
      )}
      
      {/* Tutor Class Management Component */}
      {profile?.role === 'tutor' && user?.id === classData.tutor_id && (
        <motion.div variants={fadeUp}>
        <TutorClassManagement
          classData={classData}
          enrolledStudents={students}
          onClassUpdate={setClassData}
          onStudentsUpdate={setStudents}
        />
        </motion.div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-blue-900/60 border-blue-700/60">
          <TabsTrigger value="overview" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300">Overview</TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300">Schedule</TabsTrigger>
          <TabsTrigger value="assignments" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300">Assignments</TabsTrigger>
          <TabsTrigger value="resources" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300">Resources</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300">Analytics</TabsTrigger>
          {profile?.role === 'tutor' && <TabsTrigger value="students" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300">Students</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="overview">
          <motion.div variants={fadeUp}>
          <Card className="bg-blue-900/60 border-blue-700/60">
            <CardHeader>
              <CardTitle className="text-white">Class Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-lg font-medium flex items-center text-white">
                    <CalendarIcon className="h-5 w-5 mr-2 text-sky-300" />
                    Schedule
                  </h3>
                  <div className="mt-2">
                    {schedules.length > 0 ? (
                      <div className="space-y-2">
                        {schedules.slice(0, 3).map((schedule) => {
                          // Handle new time format - times are stored as "HH:MM:SS" strings
                          const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][schedule.day_of_week];
                          
                          // Parse time strings and create Date objects for formatting
                          const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
                          const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
                          
                          const startTime = new Date();
                          startTime.setHours(startHour, startMinute, 0, 0);
                          const endTime = new Date();
                          endTime.setHours(endHour, endMinute, 0, 0);
                          
                          return (
                            <div key={schedule.id} className="p-2 border border-blue-700/60 bg-blue-900/40 rounded-md">
                              <p className="font-medium text-white">
                                {dayName}s
                              </p>
                              <p className="text-sm text-sky-100/70">
                                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sky-100/70">No scheduled sessions</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium flex items-center text-white">
                    <FileTextIcon className="h-5 w-5 mr-2 text-sky-300" />
                    Assignments
                  </h3>
                  <div className="mt-2">
                    {assignments.length > 0 ? (
                      <div className="space-y-2">
                        {assignments.slice(0, 3).map((assignment) => (
                          <div 
                            key={assignment.id} 
                            className="p-2 border border-blue-700/60 bg-blue-900/40 rounded-md cursor-pointer hover:bg-sky-500/10 hover:border-sky-500/50 transition-colors"
                            onClick={() => navigate(`/assignments/${assignment.id}`)}
                          >
                            <p className="font-medium text-white">{assignment.title}</p>
                            <p className="text-sm text-sky-100/70">
                              Due {format(new Date(assignment.due_date), 'PPP')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sky-100/70">No assignments</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium flex items-center text-white">
                    <BookOpenIcon className="h-5 w-5 mr-2 text-sky-300" />
                    Resources
                  </h3>
                  <div className="mt-2">
                    {resources.length > 0 ? (
                      <div className="space-y-2">
                        {resources.slice(0, 3).map((resource) => (
                          <div key={resource.id} className="p-2 border border-blue-700/60 bg-blue-900/40 rounded-md">
                            <p className="font-medium text-white">{resource.title}</p>
                            <p className="text-sm text-sky-100/70">
                              {resource.type}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sky-100/70">No resources available</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2 text-white">About the Tutor</h3>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-sky-500/30">
                    <AvatarImage src={tutor?.avatar_url || undefined} />
                    <AvatarFallback className="bg-blue-900 text-sky-300">
                      {tutor?.full_name?.charAt(0) || 'T'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">{tutor?.full_name || 'Tutor'}</p>
                    <p className="text-sm text-sky-100/70">{tutor?.email}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>
        
        <TabsContent value="schedule">
          <motion.div variants={fadeUp}>
          <ClassSchedule
            classData={classData}
            schedules={schedules}
            onSchedulesUpdate={setSchedules}
            isOwner={profile?.role === 'tutor' && profile.user_id === classData.tutor_id}
          />
          </motion.div>
        </TabsContent>
        
        <TabsContent value="assignments">
          <motion.div variants={fadeUp}>
          <ClassAssignments
            classData={classData}
            assignments={assignments}
            onAssignmentsUpdate={setAssignments}
            isOwner={profile?.role === 'tutor' && profile.user_id === classData.tutor_id}
          />
          </motion.div>
        </TabsContent>
        
        <TabsContent value="resources">
          <motion.div variants={fadeUp}>
          <ClassResources
            classData={classData}
            resources={resources}
            onResourcesUpdate={setResources}
            isOwner={profile?.role === 'tutor' && profile.user_id === classData.tutor_id}
          />
          </motion.div>
        </TabsContent>
        
        <TabsContent value="analytics">
          <motion.div variants={fadeUp}>
          <ClassAnalytics
            classData={classData}
            assignments={assignments}
            isOwner={profile?.role === 'tutor' && profile.user_id === classData.tutor_id}
          />
          </motion.div>
        </TabsContent>
        
        {profile?.role === 'tutor' && (
          <TabsContent value="students">
            <motion.div variants={fadeUp}>
            <Card className="bg-blue-900/60 border-blue-700/60">
              <CardHeader>
                <CardTitle className="text-white">Enrolled Students</CardTitle>
                <CardDescription className="text-sky-100/70">Students currently enrolled in this class</CardDescription>
              </CardHeader>
              <CardContent>
                {students.length > 0 ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {students.map((student) => (
                        <Card key={student.id} className="bg-blue-900/40 border-blue-700/60 hover:border-sky-500/50 transition-all">
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-4">
                              <Avatar className="border-2 border-sky-500/30">
                                <AvatarImage src={student.avatar_url || undefined} />
                                <AvatarFallback className="bg-blue-900 text-sky-300">
                                  {student.full_name?.split(' ').map(n => n[0]).join('') || 'ST'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <CardTitle className="text-lg text-white">{student.full_name}</CardTitle>
                                <CardDescription className="text-sky-100/70">{student.email}</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardFooter className="flex justify-between">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/students/${student.user_id}`)}
                              className="rounded-2xl border-blue-700/60 hover:bg-sky-500/10 hover:border-sky-500/50"
                            >
                              View Progress
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              className="rounded-2xl border-blue-700/60 hover:bg-sky-500/10 hover:border-sky-500/50"
                              onClick={() => navigate(`/messages?to=${student.user_id}`)}
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
                    <p className="text-sky-100/70">No students enrolled in this class yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>
        )}
      </Tabs>
    </motion.div>
  );
}