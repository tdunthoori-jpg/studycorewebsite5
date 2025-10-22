import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase, Class, Assignment } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/sonner';
import { PlusIcon, SearchIcon, ClockIcon, CheckIcon, AlertCircleIcon } from 'lucide-react';
import { format, isPast, isToday, addDays, isBefore } from 'date-fns';

export default function AssignmentsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user || !profile) {
      navigate('/login');
      return;
    }
    
    const fetchAssignmentData = async () => {
      setLoading(true);
      try {
        console.log('Fetching assignment data for user:', user?.id, 'with role:', profile?.role);
        
        // Initialize data arrays
        let classesData: Class[] = [];
        let assignmentsData: Assignment[] = [];
        let classIds: string[] = [];
        
        // Make sure user ID is valid
        if (!user?.id || typeof user.id !== 'string' || user.id.length < 5) {
          console.error('Invalid user ID:', user?.id);
          toast.error('Invalid user ID format');
          return;
        }
        
        if (profile?.role === 'tutor') {
          // For tutors, fetch classes they teach
          console.log('Fetching classes for tutor with ID:', user.id);
          const { data: tutorClasses, error: classesError } = await supabase
            .from('classes')
            .select('*')
            .eq('tutor_id', user.id);
            
          console.log('Tutor classes query result:', { tutorClasses, error: classesError });
          
          if (classesError) {
            console.error('Error fetching tutor classes:', classesError);
          } else if (tutorClasses) {
            classesData = tutorClasses;
            classIds = tutorClasses.map(cls => cls.id);
            console.log(`Loaded ${tutorClasses.length} tutor classes`);
          }
        } else {
          // For students, fetch their enrolled classes
          console.log('Fetching enrollments for student with ID:', user.id);
          const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('class_id')
            .eq('student_id', user.id)
            .eq('status', 'active');
            
          console.log('Student enrollments query result:', { enrollments, error: enrollmentsError });
            
          if (enrollmentsError) {
            console.error('Error fetching enrollments:', enrollmentsError);
          } else if (enrollments && enrollments.length > 0) {
            classIds = enrollments.map(e => e.class_id);
            console.log(`Found ${enrollments.length} class enrollments`);
            
            // Fetch class details
            const { data: classesData2, error: classesError } = await supabase
              .from('classes')
              .select('*')
              .in('id', classIds);
              
            if (classesError) {
              console.error('Error fetching classes:', classesError);
            } else if (classesData2) {
              classesData = classesData2;
              console.log(`Loaded ${classesData2.length} enrolled classes`);
            }
          } else {
            console.log('Student has no class enrollments');
          }
        }
        
        // Update classes state regardless of whether we found any
        setClasses(classesData);
        
        // Fetch assignments for the identified classes (if any)
        if (classIds.length > 0) {
          const { data: assignmentData, error: assignmentError } = await supabase
            .from('assignments')
            .select('*, submissions(*)')
            .in('class_id', classIds)
            .order('due_date', { ascending: true });
            
          if (assignmentError) {
            console.error('Error fetching assignments:', assignmentError);
          } else if (assignmentData) {
            // For students, add submission status to each assignment
            if (profile.role === 'student') {
              assignmentsData = assignmentData.map(assignment => {
                const submissions = assignment.submissions || [];
                const userSubmission = submissions.find((sub: any) => sub.student_id === user.id);
                
                return {
                  ...assignment,
                  submitted: !!userSubmission,
                  submission: userSubmission,
                  // Remove the submissions array to avoid cluttering the state
                  submissions: undefined
                };
              });
            } else {
              // For tutors, just clean up the data
              assignmentsData = assignmentData.map(assignment => ({
                ...assignment,
                // Convert submission count to a number
                submissionCount: (assignment.submissions || []).length,
                // Remove the submissions array to avoid cluttering the state
                submissions: undefined
              }));
            }
            
            console.log(`Loaded ${assignmentData.length} assignments`);
          }
        }
        
        // Update assignments state
        setAssignments(assignmentsData);
        
      } catch (error) {
        console.error('Error fetching assignment data:', error);
        toast.error('Failed to load assignment data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignmentData();
  }, [user, profile, navigate]);
  
  // Filter assignments based on search term
  const filteredAssignments = assignments.filter(assignment => 
    assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    assignment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classes.find(c => c.id === assignment.class_id)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Categorize assignments
  const upcoming = filteredAssignments.filter(assignment => 
    !isPast(new Date(assignment.due_date)) || isToday(new Date(assignment.due_date))
  );
  
  const pastDue = filteredAssignments.filter(assignment => 
    isPast(new Date(assignment.due_date)) && !isToday(new Date(assignment.due_date))
  );
  
  const dueSoon = upcoming.filter(assignment => 
    isBefore(new Date(assignment.due_date), addDays(new Date(), 3))
  );
  
  // Render assignment card
  const renderAssignmentCard = (assignment: Assignment) => {
    const classInfo = classes.find(c => c.id === assignment.class_id);
    const dueDate = new Date(assignment.due_date);
    const isOverdue = isPast(dueDate) && !isToday(dueDate);
    const isDueSoon = !isOverdue && isBefore(dueDate, addDays(new Date(), 3));
    
    // Check if the assignment has been submitted (for students)
    const isSubmitted = (assignment as any).submitted === true;
    // Check submission count (for tutors)
    const submissionCount = (assignment as any).submissionCount || 0;
    
    return (
      <Card 
        key={assignment.id}
        className={`
          hover:shadow-md transition-shadow cursor-pointer
          ${isSubmitted ? 'border-blue-400' : isOverdue ? 'border-red-400' : isDueSoon ? 'border-yellow-400' : 'border-green-400'}
        `}
        onClick={() => navigate(`/assignments/${assignment.id}`)}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{assignment.title}</CardTitle>
            <div className="flex gap-2">
              {profile?.role === 'student' && isSubmitted && (
                <Badge variant="secondary">Submitted</Badge>
              )}
              {profile?.role === 'tutor' && (
                <Badge variant="outline">{submissionCount} {submissionCount === 1 ? 'submission' : 'submissions'}</Badge>
              )}
              <Badge variant={isOverdue ? "destructive" : isDueSoon ? "outline" : "default"}>
                {isOverdue 
                  ? 'Overdue' 
                  : isToday(dueDate)
                  ? 'Due Today'
                  : `Due ${format(dueDate, 'MMM d')}`
                }
              </Badge>
            </div>
          </div>
          <CardDescription>{classInfo?.name || 'Unknown Class'}</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-sm line-clamp-2">{assignment.description}</p>
          <div className="flex items-center mt-2 text-sm text-muted-foreground">
            <ClockIcon className="h-4 w-4 mr-1" />
            <span>Due {format(dueDate, 'PPPP')}</span>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" size="sm">
            {profile?.role === 'student' 
              ? (isSubmitted ? 'View Submission' : 'Submit Assignment') 
              : 'View Details'
            }
          </Button>
          
          {assignment.file_url && (
            <Button 
              size="sm"
              variant="secondary"
              asChild
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <a href={assignment.file_url} target="_blank" rel="noopener noreferrer">
                Download
              </a>
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground">
            {profile?.role === 'tutor' 
              ? 'Manage and track your class assignments'
              : 'View and submit your assignments'
            }
          </p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              type="text"
              placeholder="Search assignments..." 
              className="pl-9 w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {profile?.role === 'tutor' && (
            <Button onClick={() => navigate('/assignments/create')}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <p>Loading assignments...</p>
        </div>
      ) : filteredAssignments.length > 0 ? (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All Assignments ({filteredAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="due-soon">
              Due Soon ({dueSoon.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past Due ({pastDue.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredAssignments.map(renderAssignmentCard)}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="upcoming">
            {upcoming.length > 0 ? (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {upcoming.map(renderAssignmentCard)}
                </div>
              </ScrollArea>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckIcon className="h-5 w-5 mr-2 text-green-500" />
                    No Upcoming Assignments
                  </CardTitle>
                  <CardDescription>You're all caught up!</CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="due-soon">
            {dueSoon.length > 0 ? (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {dueSoon.map(renderAssignmentCard)}
                </div>
              </ScrollArea>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckIcon className="h-5 w-5 mr-2 text-green-500" />
                    No Assignments Due Soon
                  </CardTitle>
                  <CardDescription>Nothing due in the next few days!</CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="past">
            {pastDue.length > 0 ? (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {pastDue.map(renderAssignmentCard)}
                </div>
              </ScrollArea>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckIcon className="h-5 w-5 mr-2 text-green-500" />
                    No Past Due Assignments
                  </CardTitle>
                  <CardDescription>You're on track with your assignments!</CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="my-8">
          <CardHeader>
            <CardTitle>No Assignments Found</CardTitle>
            <CardDescription>
              {searchTerm 
                ? 'No assignments match your search criteria. Try a different search term.' 
                : profile?.role === 'tutor'
                  ? 'You haven\'t created any assignments yet.'
                  : 'You don\'t have any assignments at the moment.'
              }
            </CardDescription>
          </CardHeader>
          <CardFooter>
            {profile?.role === 'tutor' && !searchTerm && (
              <Button onClick={() => navigate('/assignments/create')}>
                Create Your First Assignment
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}