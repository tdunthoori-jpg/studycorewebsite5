import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase, Class, Profile } from '@/lib/supabase';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  UsersIcon,
  DollarSignIcon,
  BookOpenIcon,
  AlertTriangleIcon,
  InfoIcon
} from 'lucide-react';

interface StudentEnrollmentProps {
  classData: Class;
  tutorProfile: Profile | null;
  isEnrolled: boolean;
  onEnrollmentChange: (enrolled: boolean) => void;
}

interface EnrollmentInfo {
  currentStudents: number;
  maxStudents: number;
  remainingSpots: number;
  isWaitlistAvailable: boolean;
}

export default function StudentEnrollment({
  classData,
  tutorProfile,
  isEnrolled,
  onEnrollmentChange,
}: StudentEnrollmentProps) {
  const { user, profile } = useAuth();
  const [enrollmentInfo, setEnrollmentInfo] = useState<EnrollmentInfo>({
    currentStudents: 0,
    maxStudents: classData.max_students,
    remainingSpots: classData.max_students,
    isWaitlistAvailable: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);

  useEffect(() => {
    fetchEnrollmentInfo();
  }, [classData.id]);

  const fetchEnrollmentInfo = async () => {
    try {
      // Get current enrollment count
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('class_id', classData.id)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching enrollment info:', error);
        return;
      }

      const currentStudents = enrollments?.length || 0;
      const remainingSpots = Math.max(0, classData.max_students - currentStudents);

      setEnrollmentInfo({
        currentStudents,
        maxStudents: classData.max_students,
        remainingSpots,
        isWaitlistAvailable: remainingSpots === 0,
      });
    } catch (error) {
      console.error('Exception fetching enrollment info:', error);
    }
  };

  const handleEnroll = async () => {
    if (!user || !profile || profile.role !== 'student') {
      toast.error('Only students can enroll in classes');
      return;
    }

    setIsLoading(true);
    try {
      // Double-check enrollment status
      const { data: existingEnrollment, error: checkError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('class_id', classData.id)
        .eq('student_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking enrollment:', checkError);
        toast.error('Failed to check enrollment status');
        return;
      }

      if (existingEnrollment) {
        if (existingEnrollment.status === 'active') {
          toast.info('You are already enrolled in this class');
          onEnrollmentChange(true);
          return;
        } else if (existingEnrollment.status === 'dropped') {
          // Re-enroll by updating status
          const { error: updateError } = await supabase
            .from('enrollments')
            .update({ 
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingEnrollment.id);

          if (updateError) {
            console.error('Error re-enrolling:', updateError);
            toast.error('Failed to re-enroll in class');
            return;
          }

          onEnrollmentChange(true);
          toast.success('Successfully re-enrolled in class!');
          await fetchEnrollmentInfo();
          setShowEnrollDialog(false);
          return;
        }
      }

      // Check if class is full
      if (enrollmentInfo.remainingSpots <= 0) {
        toast.error('Class is currently full. Please try again later or contact the tutor.');
        return;
      }

      // Create new enrollment
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          class_id: classData.id,
          student_id: user.id,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (enrollError) {
        console.error('Error enrolling in class:', enrollError);
        toast.error('Failed to enroll in class: ' + enrollError.message);
        return;
      }

      onEnrollmentChange(true);
      toast.success('Successfully enrolled in class!');
      await fetchEnrollmentInfo();
      setShowEnrollDialog(false);

    } catch (error) {
      console.error('Exception enrolling in class:', error);
      toast.error('An unexpected error occurred while enrolling');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnenroll = async () => {
    if (!user || !profile || profile.role !== 'student') return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ 
          status: 'dropped',
          updated_at: new Date().toISOString()
        })
        .eq('class_id', classData.id)
        .eq('student_id', user.id);

      if (error) {
        console.error('Error unenrolling from class:', error);
        toast.error('Failed to unenroll from class');
        return;
      }

      onEnrollmentChange(false);
      toast.success('Successfully unenrolled from class');
      await fetchEnrollmentInfo();

    } catch (error) {
      console.error('Exception unenrolling from class:', error);
      toast.error('An unexpected error occurred while unenrolling');
    } finally {
      setIsLoading(false);
    }
  };

  const canEnroll = () => {
    return (
      user &&
      profile?.role === 'student' &&
      !isEnrolled &&
      classData.status === 'active' &&
      enrollmentInfo.remainingSpots > 0
    );
  };

  const getEnrollmentStatusMessage = () => {
    if (!user || !profile) return 'Please sign in to enroll';
    if (profile.role !== 'student') return 'Only students can enroll in classes';
    if (isEnrolled) return 'You are enrolled in this class';
    if (classData.status !== 'active') return 'This class is not currently accepting enrollments';
    if (enrollmentInfo.remainingSpots <= 0) return 'Class is currently full';
    return 'Ready to enroll';
  };

  return (
    <Card className="bg-blue-900/60 border-blue-700/60">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              {isEnrolled ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              ) : (
                <BookOpenIcon className="h-5 w-5 text-sky-300" />
              )}
              Enrollment Status
            </CardTitle>
            <CardDescription className="text-sky-100/70">
              {getEnrollmentStatusMessage()}
            </CardDescription>
          </div>
          <Badge 
            variant={isEnrolled ? "default" : enrollmentInfo.remainingSpots > 0 ? "secondary" : "destructive"}
            className={isEnrolled ? "bg-green-500/20 text-green-300 border-green-500/50" : enrollmentInfo.remainingSpots > 0 ? "bg-sky-500/20 text-sky-300 border-sky-500/50" : ""}
          >
            {isEnrolled ? 'Enrolled' : enrollmentInfo.remainingSpots > 0 ? 'Available' : 'Full'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Class Capacity Info */}
        <div className="flex items-center justify-between p-3 bg-blue-900/40 border border-blue-700/60 rounded-lg">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-sky-300" />
            <span className="text-sm text-sky-100">Class Capacity</span>
          </div>
          <span className="font-medium text-white">
            {enrollmentInfo.currentStudents} / {enrollmentInfo.maxStudents} students
          </span>
        </div>

        {/* Price Info */}
        {classData.price_per_hour !== undefined && classData.price_per_hour > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-900/40 border border-blue-700/60 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSignIcon className="h-4 w-4 text-sky-300" />
              <span className="text-sm text-sky-100">Price per Hour</span>
            </div>
            <span className="font-medium text-white">${classData.price_per_hour.toFixed(2)}</span>
          </div>
        )}

        {/* Tutor Info */}
        {tutorProfile && (
          <div className="p-3 bg-blue-900/40 border border-blue-700/60 rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 border-2 border-sky-500/30">
                <AvatarImage src={tutorProfile.avatar_url || undefined} />
                <AvatarFallback className="bg-blue-900 text-sky-300">
                  {tutorProfile.full_name?.split(' ').map(n => n[0]).join('') || 'T'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-white">Instructor</p>
                <p className="text-sm text-sky-100/70">{tutorProfile.full_name}</p>
              </div>
            </div>
          </div>
        )}

        <Separator className="bg-blue-700/30" />

        {/* Enrollment Actions */}
        <div className="space-y-3">
          {isEnrolled ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-500/50 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
                <span className="text-sm text-green-300">
                  You are successfully enrolled in this class!
                </span>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full rounded-2xl border-blue-700/60 hover:bg-red-500/10 hover:border-red-500/50 text-white" 
                    disabled={isLoading}
                  >
                    <XCircleIcon className="h-4 w-4 mr-2" />
                    Unenroll from Class
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-blue-900 border-blue-700/60">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Unenroll from Class</AlertDialogTitle>
                    <AlertDialogDescription className="text-sky-100/70">
                      Are you sure you want to unenroll from "{classData.name}"? 
                      You may lose your spot and need to re-enroll if the class becomes full.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-blue-900/60 border-blue-700/60 text-white hover:bg-sky-500/10">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleUnenroll}
                      className="bg-red-500 text-white hover:bg-red-600"
                    >
                      Unenroll
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Warning if class is almost full */}
              {enrollmentInfo.remainingSpots <= 3 && enrollmentInfo.remainingSpots > 0 && (
                <div className="flex items-center gap-2 p-3 bg-orange-900/20 border border-orange-500/50 rounded-lg">
                  <AlertTriangleIcon className="h-5 w-5 text-orange-400" />
                  <span className="text-sm text-orange-300">
                    Only {enrollmentInfo.remainingSpots} spot{enrollmentInfo.remainingSpots !== 1 ? 's' : ''} remaining!
                  </span>
                </div>
              )}

              {/* Full class warning */}
              {enrollmentInfo.remainingSpots <= 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <XCircleIcon className="h-5 w-5 text-red-400" />
                  <span className="text-sm text-red-300">
                    This class is currently full. Contact the instructor for waitlist options.
                  </span>
                </div>
              )}

              {/* Enrollment Button/Dialog */}
              {canEnroll() ? (
                <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400" 
                      disabled={isLoading}
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Enroll in Class
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-blue-900 border-blue-700/60">
                    <DialogHeader>
                      <DialogTitle className="text-white">Enroll in {classData.name}</DialogTitle>
                      <DialogDescription className="text-sky-100/70">
                        Confirm your enrollment in this class. You will gain access to all class materials, 
                        assignments, and can participate in scheduled sessions.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-900/40 border border-blue-700/60 rounded-lg">
                        <h4 className="font-medium mb-2 text-white">What you'll get:</h4>
                        <ul className="text-sm space-y-1 list-disc list-inside text-sky-100/70">
                          <li>Access to all class materials and resources</li>
                          <li>Participation in live sessions and discussions</li>
                          <li>Assignment submission and feedback</li>
                          <li>Direct communication with the instructor</li>
                          <li>Progress tracking and certificates</li>
                        </ul>
                      </div>

                      {classData.price_per_hour && classData.price_per_hour > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                          <InfoIcon className="h-5 w-5 text-blue-400" />
                          <span className="text-sm text-blue-200">
                            This class charges ${classData.price_per_hour}/hour. Payment details will be provided after enrollment.
                          </span>
                        </div>
                      )}
                    </div>

                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowEnrollDialog(false)}
                        className="bg-blue-900/60 border-blue-700/60 text-white hover:bg-sky-500/10"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleEnroll} 
                        disabled={isLoading}
                        className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400"
                      >
                        {isLoading ? 'Enrolling...' : 'Confirm Enrollment'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button 
                  className="w-full rounded-2xl" 
                  disabled
                >
                  {enrollmentInfo.remainingSpots <= 0 ? 'Class Full' : 'Cannot Enroll'}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}