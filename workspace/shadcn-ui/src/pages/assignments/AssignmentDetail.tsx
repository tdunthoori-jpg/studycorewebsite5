import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase, Assignment, Class, AssignmentSubmission } from '@/lib/supabase';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { CalendarIcon, ClockIcon, FileIcon, UploadIcon, CheckCircleIcon, ExternalLinkIcon } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

// Extended submission interface with student profile data
interface ExtendedSubmission extends AssignmentSubmission {
  student_name?: string;
  student_avatar?: string;
  student_email?: string;
  profiles?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
}

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [submissions, setSubmissions] = useState<ExtendedSubmission[]>([]);
  const [userSubmission, setUserSubmission] = useState<AssignmentSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [feedback, setFeedback] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    if (!user || !profile || !id) {
      navigate('/dashboard');
      return;
    }
    
    const fetchAssignmentData = async () => {
      setLoading(true);
      try {
        console.log(`Fetching data for assignment ID: ${id} for user:`, user?.id, 'with role:', profile?.role);
        
        // Make sure IDs are valid
        if (!id || typeof id !== 'string' || id.length < 5) {
          console.error('Invalid assignment ID:', id);
          toast.error('Invalid assignment ID format');
          navigate('/assignments');
          return;
        }
        
        if (!user?.id || typeof user.id !== 'string' || user.id.length < 5) {
          console.error('Invalid user ID:', user?.id);
          toast.error('Invalid user ID format');
          return;
        }
        
        // Fetch assignment details - this is critical
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('assignments')
          .select('*')
          .eq('id', id)
          .single();
          
        if (assignmentError) {
          console.error('Error fetching assignment details:', assignmentError);
          toast.error('Assignment not found');
          navigate('/assignments');
          return;
        }
        
        if (!assignmentData) {
          console.log('No assignment data found');
          navigate('/assignments');
          toast.error('Assignment not found');
          return;
        }
        
        // Assignment exists, set the data
        setAssignment(assignmentData);
        console.log('Assignment details loaded:', assignmentData.title);
        
        // Now fetch related data in parallel
        const promises = [];
        
        // 1. Fetch class details
        const classPromise = supabase
          .from('classes')
          .select('*')
          .eq('id', assignmentData.class_id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching class details:', error);
            } else if (data) {
              setClassInfo(data);
              console.log('Class details loaded:', data.name);
            }
          });
        promises.push(classPromise);
        
        // 2. For student: check for their submission
        if (profile.role === 'student') {
          console.log('Checking for existing student submission with student ID:', user.id);
          const submissionPromise = supabase
            .from('submissions')
            .select('*')
            .eq('assignment_id', id)
            .eq('student_id', user.id)
            .then(({ data, error }) => {
              console.log('Submission query result:', { data, error });
              
              if (error) {
                console.error('Error checking submission:', error);
              } else if (data && data.length > 0) {
                const submission = data[0];
                setUserSubmission(submission);
                // Pre-populate the submission URL for updates
                setSubmissionUrl(submission.file_url);
                console.log('Found existing submission:', submission);
              } else {
                console.log('No existing submission found');
              }
            });
          promises.push(submissionPromise);
        }
        
        // 3. For tutor: fetch all submissions with student profiles
        if (profile.role === 'tutor') {
          console.log('Fetching submissions for tutor view of assignment ID:', id);
          
          // First get all submissions for this assignment
          const { data: submissions, error: submissionsError } = await supabase
            .from('submissions')
            .select('*')
            .eq('assignment_id', id);

          if (submissionsError) {
            console.error('Error fetching submissions:', submissionsError);
          } else {
            // Fetch student profiles separately to avoid complex join issues
            let submissionsWithStudents: ExtendedSubmission[] = submissions || [];
            if (submissions && submissions.length > 0) {
              submissionsWithStudents = await Promise.all(
                submissions.map(async (submission) => {
                  const { data: studentProfile } = await supabase
                    .from('profiles')
                    .select('user_id, full_name, email')
                    .eq('user_id', submission.student_id)
                    .single();

                  return {
                    ...submission,
                    student_name: studentProfile?.full_name || 'Unknown Student',
                    student_email: studentProfile?.email || '',
                    student_avatar: null, // Can be added later if needed
                    profiles: studentProfile || null,
                  };
                })
              );
            }

            setSubmissions(submissionsWithStudents);
            console.log(`Loaded ${submissionsWithStudents.length} submissions:`, submissionsWithStudents);
          }
        }
        
        // Wait for all data fetching to complete
        await Promise.all(promises);
        
      } catch (error) {
        console.error('Error fetching assignment data:', error);
        toast.error('Failed to load assignment data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignmentData();
  }, [id, user, profile, navigate]);
  
  const handleSubmitAssignment = async () => {
    if (!user || !profile || profile.role !== 'student' || !assignment) return;
    
    try {
      setSubmitting(true);
      
      if (!submissionUrl) {
        toast.error('Please provide a submission URL');
        return;
      }
      
      if (userSubmission) {
        // Update existing submission
        const { error } = await supabase
          .from('submissions')
          .update({
            file_url: submissionUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', userSubmission.id);
          
        if (error) {
          console.error('Error updating submission:', error);
          toast.error('Failed to update submission');
          return;
        }
        
        setUserSubmission({
          ...userSubmission,
          file_url: submissionUrl,
          updated_at: new Date().toISOString()
        });
        
        toast.success('Submission updated successfully!');
      } else {
        // Create new submission
        const newSubmission = {
          assignment_id: id as string,
          student_id: user.id,
          file_url: submissionUrl,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('submissions')
          .insert(newSubmission)
          .select();
          
        if (error) {
          console.error('Error creating submission:', error);
          toast.error('Failed to submit assignment');
          return;
        }
        
        setUserSubmission(data[0]);
        toast.success('Assignment submitted successfully!');
      }
    } catch (error) {
      console.error('Exception submitting assignment:', error);
      toast.error('An error occurred while submitting');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleGradeSubmission = async (submissionId: string) => {
    if (!user || !profile || profile.role !== 'tutor') return;
    
    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('submissions')
        .update({
          grade,
          feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);
        
      if (error) {
        console.error('Error grading submission:', error);
        toast.error('Failed to grade submission');
        return;
      }
      
      // Update local state
      setSubmissions(submissions.map(sub => 
        sub.id === submissionId 
          ? { ...sub, grade, feedback, updated_at: new Date().toISOString() } 
          : sub
      ));
      
      toast.success('Submission graded successfully!');
      
      // Reset form
      setGrade(null);
      setFeedback('');
    } catch (error) {
      console.error('Exception grading submission:', error);
      toast.error('An error occurred while grading');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <p>Loading assignment data...</p>
      </div>
    );
  }
  
  if (!assignment || !classInfo) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Assignment Not Found</CardTitle>
            <CardDescription>The assignment you are looking for does not exist or you do not have access to it.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate('/assignments')}>Return to Assignments</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const dueDate = new Date(assignment.due_date);
  const isOverdue = isPast(dueDate) && !isToday(dueDate);
  const isDueSoon = !isOverdue && dueDate <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
  
  // Student view
  if (profile.role === 'student') {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{assignment.title}</CardTitle>
                <CardDescription>
                  <span className="inline-flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {classInfo.name}
                  </span>
                </CardDescription>
              </div>
              <Badge variant={isOverdue ? "destructive" : isDueSoon ? "outline" : "default"}>
                {isOverdue 
                  ? 'Overdue' 
                  : isToday(dueDate)
                  ? 'Due Today'
                  : `Due ${format(dueDate, 'MMM d')}`
                }
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center text-sm text-muted-foreground">
              <ClockIcon className="h-4 w-4 mr-2" />
              <span>Due {format(dueDate, 'PPPP')} at {format(dueDate, 'h:mm a')}</span>
            </div>
            
            <div className="prose max-w-none dark:prose-invert">
              <p>{assignment.description}</p>
            </div>
            
            {assignment.file_url && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Assignment Materials</h3>
                <div className="flex items-center p-3 rounded-md border">
                  <FileIcon className="h-5 w-5 mr-2 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">Assignment Document</p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={assignment.file_url} target="_blank" rel="noreferrer">
                      <ExternalLinkIcon className="h-4 w-4 mr-2" />
                      Open Assignment
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {userSubmission ? 'Your Submission' : 'Submit Assignment'}
            </CardTitle>
            {userSubmission && (
              <CardDescription>
                Submitted on {format(new Date(userSubmission.submitted_at), 'PPP')} at {format(new Date(userSubmission.submitted_at), 'h:mm a')}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {userSubmission ? (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="submission-link">Submission Link</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input 
                      id="submission-link"
                      value={submissionUrl || userSubmission.file_url}
                      onChange={(e) => setSubmissionUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleSubmitAssignment}
                      disabled={submitting}
                    >
                      Update
                    </Button>
                  </div>
                </div>
                
                {userSubmission.file_url && (
                  <div className="flex items-center p-3 rounded-md border bg-muted/50">
                    <FileIcon className="h-5 w-5 mr-2" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">Your Submission</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={userSubmission.file_url} target="_blank" rel="noreferrer">
                        <ExternalLinkIcon className="h-4 w-4 mr-2" />
                        View Submission
                      </a>
                    </Button>
                  </div>
                )}
                
                {userSubmission.grade !== null && (
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Grade</h3>
                      <Badge variant="outline" className="text-lg">
                        {userSubmission.grade}/100
                      </Badge>
                    </div>
                    
                    {userSubmission.feedback && (
                      <div className="mt-4">
                        <h3 className="text-lg font-medium mb-2">Feedback</h3>
                        <div className="p-4 rounded-md border bg-muted/50">
                          <p>{userSubmission.feedback}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="submission-url">Submission Link</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Provide a link to your assignment (Google Drive, Dropbox, etc.)
                  </p>
                  <Input 
                    id="submission-url"
                    value={submissionUrl}
                    onChange={(e) => setSubmissionUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                  />
                </div>
                
                <Button 
                  onClick={handleSubmitAssignment}
                  disabled={submitting || !submissionUrl}
                  className="w-full"
                >
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Submit Assignment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Tutor view
  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">{assignment.title}</CardTitle>
              <CardDescription>
                <span className="inline-flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {classInfo.name}
                </span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isOverdue ? "destructive" : isDueSoon ? "outline" : "default"}>
                {isOverdue 
                  ? 'Overdue' 
                  : isToday(dueDate)
                  ? 'Due Today'
                  : `Due ${format(dueDate, 'MMM d')}`
                }
              </Badge>
              <Button 
                variant="outline"
                onClick={() => navigate(`/assignments/${id}/edit`)}
              >
                Edit Assignment
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span>Due {format(dueDate, 'PPPP')} at {format(dueDate, 'h:mm a')}</span>
          </div>
          
          <div className="prose max-w-none dark:prose-invert">
            <p>{assignment.description}</p>
          </div>
          
          {assignment.file_url && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Assignment Materials</h3>
              <div className="flex items-center p-3 rounded-md border">
                <FileIcon className="h-5 w-5 mr-2 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">Assignment Document</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={assignment.file_url} target="_blank" rel="noreferrer">
                    <ExternalLinkIcon className="h-4 w-4 mr-2" />
                    Open Assignment
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Student Submissions</CardTitle>
          <CardDescription>
            {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'} received
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length > 0 ? (
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">
                  All ({submissions.length})
                </TabsTrigger>
                <TabsTrigger value="graded">
                  Graded ({submissions.filter(sub => sub.grade !== null).length})
                </TabsTrigger>
                <TabsTrigger value="ungraded">
                  Needs Grading ({submissions.filter(sub => sub.grade === null).length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-6">
                    {submissions.map((submission) => (
                      <div key={submission.id} className="p-4 rounded-lg border">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={(submission as any).student_avatar} />
                              <AvatarFallback>
                                {((submission as any).student_name || 'S').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{(submission as any).student_name || 'Student'}</p>
                              <p className="text-sm text-muted-foreground">
                                Submitted {format(new Date(submission.submitted_at), 'PPP')}
                              </p>
                            </div>
                          </div>
                          
                          {submission.grade !== null ? (
                            <Badge className="text-lg">
                              Grade: {submission.grade}/100
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Needs Grading
                            </Badge>
                          )}
                        </div>
                        
                        {submission.file_url && (
                          <div className="flex items-center p-3 rounded-md border mb-4">
                            <FileIcon className="h-5 w-5 mr-2" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">Submission</p>
                            </div>
                            <Button asChild variant="outline" size="sm">
                              <a href={submission.file_url} target="_blank" rel="noreferrer">
                                <ExternalLinkIcon className="h-4 w-4 mr-2" />
                                View Submission
                              </a>
                            </Button>
                          </div>
                        )}
                        
                        {submission.grade !== null ? (
                          <div className="mt-4">
                            <div className="space-y-2">
                              <h4 className="font-medium">Feedback:</h4>
                              <p className="text-sm p-3 rounded-md bg-muted/50">
                                {submission.feedback || "No feedback provided."}
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => {
                                setGrade(submission.grade);
                                setFeedback(submission.feedback || '');
                              }}
                            >
                              Edit Grade
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label htmlFor={`grade-${submission.id}`}>Grade (out of 100)</Label>
                              <Input 
                                id={`grade-${submission.id}`}
                                type="number"
                                min="0"
                                max="100"
                                value={grade === null ? '' : grade}
                                onChange={(e) => setGrade(e.target.value ? parseInt(e.target.value, 10) : null)}
                                placeholder="90"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`feedback-${submission.id}`}>Feedback</Label>
                              <Textarea 
                                id={`feedback-${submission.id}`}
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Provide feedback on the student's work..."
                                rows={4}
                              />
                            </div>
                            
                            <Button 
                              onClick={() => handleGradeSubmission(submission.id)}
                              disabled={submitting || grade === null || grade < 0 || grade > 100}
                              className="w-full"
                            >
                              <CheckCircleIcon className="h-4 w-4 mr-2" />
                              Save Grade
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="graded">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-6">
                    {submissions.filter(sub => sub.grade !== null).map((submission) => (
                      <div key={submission.id} className="p-4 rounded-lg border">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {submission.student_id.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">Student ID: {submission.student_id}</p>
                              <p className="text-sm text-muted-foreground">
                                Submitted {format(new Date(submission.submitted_at), 'PPP')}
                              </p>
                            </div>
                          </div>
                          
                          <Badge className="text-lg">
                            Grade: {submission.grade}/100
                          </Badge>
                        </div>
                        
                        {submission.file_url && (
                          <div className="flex items-center p-3 rounded-md border mb-4">
                            <FileIcon className="h-5 w-5 mr-2" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">Submission</p>
                            </div>
                            <Button asChild variant="outline" size="sm">
                              <a href={submission.file_url} target="_blank" rel="noreferrer">
                                <ExternalLinkIcon className="h-4 w-4 mr-2" />
                                View Submission
                              </a>
                            </Button>
                          </div>
                        )}
                        
                        <div className="mt-4">
                          <div className="space-y-2">
                            <h4 className="font-medium">Feedback:</h4>
                            <p className="text-sm p-3 rounded-md bg-muted/50">
                              {submission.feedback || "No feedback provided."}
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => {
                              setGrade(submission.grade);
                              setFeedback(submission.feedback || '');
                            }}
                          >
                            Edit Grade
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="ungraded">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-6">
                    {submissions.filter(sub => sub.grade === null).map((submission) => (
                      <div key={submission.id} className="p-4 rounded-lg border">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {submission.student_id.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">Student ID: {submission.student_id}</p>
                              <p className="text-sm text-muted-foreground">
                                Submitted {format(new Date(submission.submitted_at), 'PPP')}
                              </p>
                            </div>
                          </div>
                          
                          <Badge variant="outline">
                            Needs Grading
                          </Badge>
                        </div>
                        
                        {submission.file_url && (
                          <div className="flex items-center p-3 rounded-md border mb-4">
                            <FileIcon className="h-5 w-5 mr-2" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">Submission</p>
                            </div>
                            <Button asChild variant="outline" size="sm">
                              <a href={submission.file_url} target="_blank" rel="noreferrer">
                                <ExternalLinkIcon className="h-4 w-4 mr-2" />
                                View Submission
                              </a>
                            </Button>
                          </div>
                        )}
                        
                        <div className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor={`grade-${submission.id}`}>Grade (out of 100)</Label>
                            <Input 
                              id={`grade-${submission.id}`}
                              type="number"
                              min="0"
                              max="100"
                              value={grade === null ? '' : grade}
                              onChange={(e) => setGrade(e.target.value ? parseInt(e.target.value, 10) : null)}
                              placeholder="90"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`feedback-${submission.id}`}>Feedback</Label>
                            <Textarea 
                              id={`feedback-${submission.id}`}
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              placeholder="Provide feedback on the student's work..."
                              rows={4}
                            />
                          </div>
                          
                          <Button 
                            onClick={() => handleGradeSubmission(submission.id)}
                            disabled={submitting || grade === null || grade < 0 || grade > 100}
                            className="w-full"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            Save Grade
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8">
              <p>No submissions received yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
