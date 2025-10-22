import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase, Assignment, Submission, Class, Profile } from '@/lib/supabase';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { 
  FileTextIcon, 
  PlusIcon, 
  EditIcon, 
  TrashIcon,
  UploadIcon,
  DownloadIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  GraduationCapIcon,
  CalendarIcon,
  Users2Icon,
  ExternalLinkIcon
} from 'lucide-react';
import { format, isBefore, isAfter, parseISO } from 'date-fns';

const assignmentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description too long'),
  due_date: z.string().min(1, 'Due date is required'),
  file_url: z.string().url('Invalid URL').optional().or(z.literal('')),
});

const submissionSchema = z.object({
  content: z.string().optional(),
  file_url: z.string().url('Invalid URL').optional().or(z.literal('')),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;
type SubmissionFormValues = z.infer<typeof submissionSchema>;

interface ClassAssignmentsProps {
  classData: Class;
  assignments: Assignment[];
  onAssignmentsUpdate: (assignments: Assignment[]) => void;
  isOwner: boolean;
}

interface ExtendedAssignment extends Assignment {
  submissions?: ExtendedSubmission[];
  submissionCount?: number;
  userSubmission?: Submission;
}

interface ExtendedSubmission extends Submission {
  profiles?: {
    user_id: string;
    full_name: string;
    email: string;
  };
}

export default function ClassAssignments({ 
  classData, 
  assignments, 
  onAssignmentsUpdate, 
  isOwner 
}: ClassAssignmentsProps) {
  const { user, profile } = useAuth();
  const [extendedAssignments, setExtendedAssignments] = useState<ExtendedAssignment[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<ExtendedAssignment | null>(null);
  const [isSubmissionDialogOpen, setIsSubmissionDialogOpen] = useState(false);
  const [isSubmissionsViewOpen, setIsSubmissionsViewOpen] = useState(false);
  const [selectedAssignmentForView, setSelectedAssignmentForView] = useState<ExtendedAssignment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assignmentForm = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: '',
      description: '',
      due_date: '',
      file_url: '',
    },
  });

  const submissionForm = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      content: '',
      file_url: '',
    },
  });

  useEffect(() => {
    fetchSubmissionsData();
  }, [assignments, user]);

  useEffect(() => {
    if (editingAssignment) {
      const dueDate = format(parseISO(editingAssignment.due_date), "yyyy-MM-dd'T'HH:mm");
      assignmentForm.reset({
        title: editingAssignment.title,
        description: editingAssignment.description || '',
        due_date: dueDate,
        file_url: editingAssignment.file_url || '',
      });
    }
  }, [editingAssignment, assignmentForm]);

  const fetchSubmissionsData = async () => {
    if (!user) return;

    const extendedAssignmentsData: ExtendedAssignment[] = await Promise.all(
      assignments.map(async (assignment) => {
        if (isOwner) {
          // For tutors, get all submissions for this assignment
          const { data: submissions, error } = await supabase
            .from('submissions')
            .select('*')
            .eq('assignment_id', assignment.id);

          if (error) {
            console.error('Error fetching submissions:', error);
          }

          // For now, we'll fetch student info separately since the join is complex
          let submissionsWithStudents = submissions || [];
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
                  profiles: studentProfile || null,
                };
              })
            );
          }

          return {
            ...assignment,
            submissions: submissionsWithStudents || [],
            submissionCount: submissionsWithStudents?.length || 0,
          };
        } else {
          // For students, get their own submission
          const { data: userSubmission } = await supabase
            .from('submissions')
            .select('*')
            .eq('assignment_id', assignment.id)
            .eq('student_id', user.id)
            .single();

          return {
            ...assignment,
            userSubmission: userSubmission || undefined,
          };
        }
      })
    );

    setExtendedAssignments(extendedAssignmentsData);
  };

  const createAssignment = async (values: AssignmentFormValues) => {
    if (!user || !isOwner) return;

    const assignmentData = {
      class_id: classData.id,
      title: values.title,
      description: values.description,
      due_date: new Date(values.due_date).toISOString(),
      file_url: values.file_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (editingAssignment) {
      // Update existing assignment
      const { data, error } = await supabase
        .from('assignments')
        .update(assignmentData)
        .eq('id', editingAssignment.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating assignment:', error);
        toast.error('Failed to update assignment: ' + error.message);
        return;
      }

      const updatedAssignments = assignments.map(a => a.id === editingAssignment.id ? data : a);
      onAssignmentsUpdate(updatedAssignments);
      toast.success('Assignment updated successfully!');
    } else {
      // Create new assignment
      const { data, error } = await supabase
        .from('assignments')
        .insert(assignmentData)
        .select()
        .single();

      if (error) {
        console.error('Error creating assignment:', error);
        toast.error('Failed to create assignment: ' + error.message);
        return;
      }

      onAssignmentsUpdate([...assignments, data]);
      toast.success('Assignment created successfully!');
    }

    setIsCreateDialogOpen(false);
    setEditingAssignment(null);
    assignmentForm.reset();
  };

  const deleteAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment: ' + error.message);
      return;
    }

    const updatedAssignments = assignments.filter(a => a.id !== assignmentId);
    onAssignmentsUpdate(updatedAssignments);
    toast.success('Assignment deleted successfully');
  };

  const submitAssignment = async (assignment: ExtendedAssignment, values: SubmissionFormValues) => {
    if (!user || isOwner) return;

    const submissionData = {
      assignment_id: assignment.id,
      student_id: user.id,
      content: values.content || null,
      file_url: values.file_url || null,
      submitted_at: new Date().toISOString(),
      status: 'submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (assignment.userSubmission) {
      // Update existing submission
      const { error } = await supabase
        .from('submissions')
        .update({
          ...submissionData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignment.userSubmission.id);

      if (error) {
        console.error('Error updating submission:', error);
        toast.error('Failed to update submission: ' + error.message);
        return;
      }

      toast.success('Submission updated successfully!');
    } else {
      // Create new submission
      const { error } = await supabase
        .from('submissions')
        .insert(submissionData);

      if (error) {
        console.error('Error creating submission:', error);
        toast.error('Failed to submit assignment: ' + error.message);
        return;
      }

      toast.success('Assignment submitted successfully!');
    }

    setIsSubmissionDialogOpen(false);
    submissionForm.reset();
    fetchSubmissionsData(); // Refresh data
  };

  const gradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
    if (!isOwner) return;

    const { error } = await supabase
      .from('submissions')
      .update({
        grade,
        feedback,
        graded_at: new Date().toISOString(),
        graded_by: user?.id,
        status: 'graded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (error) {
      console.error('Error grading submission:', error);
      toast.error('Failed to grade submission: ' + error.message);
      return;
    }

    toast.success('Submission graded successfully!');
    fetchSubmissionsData(); // Refresh data
  };

  const onAssignmentSubmit = async (values: AssignmentFormValues) => {
    setIsSubmitting(true);
    try {
      await createAssignment(values);
    } catch (error) {
      console.error('Exception creating/updating assignment:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmissionSubmit = async (values: SubmissionFormValues) => {
    if (!selectedAssignment) return;
    
    setIsSubmitting(true);
    try {
      await submitAssignment(selectedAssignment, values);
    } catch (error) {
      console.error('Exception submitting assignment:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setIsCreateDialogOpen(true);
  };

  const openSubmissionDialog = (assignment: ExtendedAssignment) => {
    setSelectedAssignment(assignment);
    if (assignment.userSubmission) {
      submissionForm.reset({
        content: assignment.userSubmission.content || '',
        file_url: assignment.userSubmission.file_url || '',
      });
    }
    setIsSubmissionDialogOpen(true);
  };

  const openSubmissionsView = (assignment: ExtendedAssignment) => {
    setSelectedAssignmentForView(assignment);
    setIsSubmissionsViewOpen(true);
  };

  const closeDialogs = () => {
    setIsCreateDialogOpen(false);
    setIsSubmissionDialogOpen(false);
    setIsSubmissionsViewOpen(false);
    setEditingAssignment(null);
    setSelectedAssignment(null);
    setSelectedAssignmentForView(null);
    assignmentForm.reset();
    submissionForm.reset();
  };

  const getAssignmentStatus = (assignment: ExtendedAssignment) => {
    const now = new Date();
    const dueDate = parseISO(assignment.due_date);
    
    if (assignment.userSubmission) {
      if (assignment.userSubmission.grade !== null && assignment.userSubmission.grade !== undefined) {
        return { status: 'graded', label: 'Graded', color: 'bg-green-100 text-green-800' };
      }
      return { status: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-800' };
    }
    
    if (isBefore(now, dueDate)) {
      return { status: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
    }
    
    return { status: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' };
  };

  const sortedAssignments = [...extendedAssignments].sort((a, b) => 
    new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileTextIcon className="h-5 w-5" />
              Class Assignments
            </CardTitle>
            <CardDescription>
              {isOwner 
                ? 'Create and manage assignments for your students'
                : 'View and submit assignments for this class'
              }
            </CardDescription>
          </div>
          
          {isOwner && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingAssignment(null)}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingAssignment 
                      ? 'Update the assignment details'
                      : 'Create a new assignment for your students'
                    }
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...assignmentForm}>
                  <form onSubmit={assignmentForm.handleSubmit(onAssignmentSubmit)} className="space-y-4">
                    <FormField
                      control={assignmentForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assignment Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Chapter 5 Homework" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={assignmentForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the assignment requirements, instructions, and expectations..."
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={assignmentForm.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date & Time</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={assignmentForm.control}
                      name="file_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assignment File (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/assignment-file.pdf" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Link to assignment materials, worksheets, or additional resources
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeDialogs}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting 
                          ? (editingAssignment ? 'Updating...' : 'Creating...') 
                          : (editingAssignment ? 'Update Assignment' : 'Create Assignment')
                        }
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {sortedAssignments.length > 0 ? (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {sortedAssignments.map((assignment) => {
                const dueDate = parseISO(assignment.due_date);
                const isOverdue = isBefore(dueDate, new Date());
                const isDueSoon = isBefore(dueDate, new Date(Date.now() + 24 * 60 * 60 * 1000));
                const status = !isOwner ? getAssignmentStatus(assignment) : null;
                
                return (
                  <Card key={assignment.id} className="border border-muted">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{assignment.title}</h4>
                            {!isOwner && status && (
                              <Badge className={status.color}>{status.label}</Badge>
                            )}
                            {isOwner && assignment.submissionCount !== undefined && (
                              <Badge variant="secondary">
                                {assignment.submissionCount} submission{assignment.submissionCount !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {assignment.description}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              <span className={isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : ''}>
                                Due: {format(dueDate, 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                            
                            {assignment.file_url && (
                              <a 
                                href={assignment.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                              >
                                <DownloadIcon className="h-4 w-4" />
                                <span>Download Materials</span>
                              </a>
                            )}
                          </div>
                          
                          {!isOwner && (
                            <div className="space-y-2">
                              {/* Submission Status */}
                              {assignment.userSubmission ? (
                                <div className="flex items-center gap-2">
                                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-700 font-medium">
                                    Submitted on {format(new Date(assignment.userSubmission.submitted_at), 'MMM d, yyyy h:mm a')}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {assignment.userSubmission.status}
                                  </Badge>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <AlertCircleIcon className="h-4 w-4 text-orange-500" />
                                  <span className="text-sm text-orange-700 font-medium">
                                    Not submitted
                                  </span>
                                </div>
                              )}
                              
                              {/* Grade Display */}
                              {assignment.userSubmission && assignment.userSubmission.grade !== null && (
                                <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                                  <GraduationCapIcon className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-800">
                                    Grade: {assignment.userSubmission.grade}%
                                  </span>
                                  {assignment.userSubmission.feedback && (
                                    <span className="text-sm text-green-700">
                                      - {assignment.userSubmission.feedback}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          {isOwner ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openSubmissionsView(assignment)}
                              >
                                <Users2Icon className="h-4 w-4 mr-2" />
                                View Submissions ({assignment.submissionCount || 0})
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(assignment)}
                              >
                                <EditIcon className="h-4 w-4" />
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <TrashIcon className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this assignment? 
                                      This will also delete all student submissions. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteAssignment(assignment.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete Assignment
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          ) : (
                            <Button
                              variant={assignment.userSubmission ? "outline" : "default"}
                              size="sm"
                              onClick={() => openSubmissionDialog(assignment)}
                              disabled={isOverdue && !assignment.userSubmission}
                            >
                              <UploadIcon className="h-4 w-4 mr-2" />
                              {assignment.userSubmission ? 'Update Submission' : 'Submit Assignment'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <FileTextIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Assignments</h3>
            <p className="text-muted-foreground mb-4">
              {isOwner 
                ? "Create assignments to give your students work to complete."
                : "The instructor hasn't created any assignments yet."
              }
            </p>
            {isOwner && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create First Assignment
              </Button>
            )}
          </div>
        )}

        {/* Submission Dialog */}
        <Dialog open={isSubmissionDialogOpen} onOpenChange={setIsSubmissionDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedAssignment?.userSubmission ? 'Update Submission' : 'Submit Assignment'}
              </DialogTitle>
              <DialogDescription>
                Submit your work for: {selectedAssignment?.title}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...submissionForm}>
              <form onSubmit={submissionForm.handleSubmit(onSubmissionSubmit)} className="space-y-4">
                <FormField
                  control={submissionForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Written Response (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Type your response or notes here..."
                          className="min-h-[150px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={submissionForm.control}
                  name="file_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File Submission (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/your-submission.pdf" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Upload your file to a cloud service and paste the link here
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialogs}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Submissions View Dialog for Tutors */}
        <Dialog open={isSubmissionsViewOpen} onOpenChange={setIsSubmissionsViewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Student Submissions</DialogTitle>
              <DialogDescription>
                Submissions for: {selectedAssignmentForView?.title}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="h-[60vh]">
              {selectedAssignmentForView?.submissions && selectedAssignmentForView.submissions.length > 0 ? (
                <div className="space-y-4">
                  {selectedAssignmentForView.submissions.map((submission) => (
                    <Card key={submission.id} className="border border-muted">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {(submission.profiles?.full_name || 'Student').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {submission.profiles?.full_name || 'Unknown Student'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {submission.profiles?.email}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Submitted {format(new Date(submission.submitted_at), 'PPP p')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant={submission.grade !== null ? "default" : "secondary"}>
                              {submission.grade !== null ? `${submission.grade}%` : 'Not Graded'}
                            </Badge>
                            <Badge variant="outline">{submission.status}</Badge>
                          </div>
                        </div>
                        
                        {submission.content && (
                          <div className="mb-3">
                            <h4 className="text-sm font-medium mb-2">Written Response:</h4>
                            <div className="p-3 bg-muted/50 rounded-md">
                              <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
                            </div>
                          </div>
                        )}
                        
                        {submission.file_url && (
                          <div className="mb-3">
                            <h4 className="text-sm font-medium mb-2">File Submission:</h4>
                            <a 
                              href={submission.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLinkIcon className="h-4 w-4" />
                              <span>Open Submission</span>
                            </a>
                          </div>
                        )}
                        
                        {submission.feedback && (
                          <div className="mb-3">
                            <h4 className="text-sm font-medium mb-2">Feedback:</h4>
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                              <p className="text-sm">{submission.feedback}</p>
                            </div>
                          </div>
                        )}
                        
                        {isOwner && (
                          <div className="flex gap-2 pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // TODO: Implement inline grading
                                const grade = prompt('Enter grade (0-100):');
                                const feedback = prompt('Enter feedback (optional):');
                                if (grade) {
                                  gradeSubmission(submission.id, parseInt(grade), feedback || '');
                                }
                              }}
                            >
                              <GraduationCapIcon className="h-4 w-4 mr-2" />
                              {submission.grade !== null ? 'Update Grade' : 'Grade'}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileTextIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Submissions</h3>
                  <p className="text-muted-foreground">
                    No students have submitted this assignment yet.
                  </p>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}