import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase, Class, Profile } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { 
  Users2Icon, 
  SettingsIcon, 
  EditIcon, 
  TrashIcon,
  MessageSquareIcon,
  UserCheckIcon,
  UserXIcon,
  PlusIcon,
  CalendarIcon,
  BookOpenIcon
} from 'lucide-react';

interface TutorClassManagementProps {
  classData: Class;
  enrolledStudents: Profile[];
  onClassUpdate: (updatedClass: Class) => void;
  onStudentsUpdate: (students: Profile[]) => void;
}

export default function TutorClassManagement({
  classData,
  enrolledStudents,
  onClassUpdate,
  onStudentsUpdate,
}: TutorClassManagementProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: classData.name,
    description: classData.description || '',
    max_students: classData.max_students,
    status: classData.status || 'active',
    subject: classData.subject || '',
    level: classData.level || '',
    price_per_hour: classData.price_per_hour || 0,
  });

  const handleUpdateClass = async () => {
    if (!user) return;

    setIsUpdating(true);
    try {
      const { data: updatedClass, error } = await supabase
        .from('classes')
        .update({
          name: editForm.name,
          description: editForm.description,
          max_students: editForm.max_students,
          status: editForm.status,
          subject: editForm.subject,
          level: editForm.level,
          price_per_hour: editForm.price_per_hour,
          updated_at: new Date().toISOString(),
        })
        .eq('id', classData.id)
        .eq('tutor_id', user.id) // Ensure only the tutor can update
        .select()
        .single();

      if (error) {
        console.error('Error updating class:', error);
        toast.error('Failed to update class: ' + error.message);
        return;
      }

      onClassUpdate(updatedClass);
      setIsEditDialogOpen(false);
      toast.success('Class updated successfully!');
    } catch (error) {
      console.error('Exception updating class:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!user) return;

    try {
      // Check if there are any enrolled students
      if (enrolledStudents.length > 0) {
        toast.error('Cannot delete class with enrolled students. Please remove all students first.');
        return;
      }

      // Delete the class
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classData.id)
        .eq('tutor_id', user.id); // Ensure only the tutor can delete

      if (error) {
        console.error('Error deleting class:', error);
        toast.error('Failed to delete class: ' + error.message);
        return;
      }

      toast.success('Class deleted successfully');
      navigate('/classes');
    } catch (error) {
      console.error('Exception deleting class:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ 
          status: 'dropped',
          updated_at: new Date().toISOString()
        })
        .eq('class_id', classData.id)
        .eq('student_id', studentId);

      if (error) {
        console.error('Error removing student:', error);
        toast.error('Failed to remove student: ' + error.message);
        return;
      }

      // Update the students list locally
      const updatedStudents = enrolledStudents.filter(s => s.user_id !== studentId);
      onStudentsUpdate(updatedStudents);
      
      toast.success('Student removed from class');
    } catch (error) {
      console.error('Exception removing student:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const getCurrentEnrollmentCount = () => enrolledStudents.length;
  const getRemainingCapacity = () => classData.max_students - getCurrentEnrollmentCount();
  const isClassFull = () => getRemainingCapacity() <= 0;

  return (
    <div className="space-y-6">
      {/* Class Management Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Class Management
              </CardTitle>
              <CardDescription>
                Manage your class settings and enrolled students
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <EditIcon className="h-4 w-4 mr-2" />
                    Edit Class
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit Class Details</DialogTitle>
                    <DialogDescription>
                      Update your class information and settings
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="description" className="text-right">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        className="col-span-3"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="max_students" className="text-right">
                        Max Students
                      </Label>
                      <Input
                        id="max_students"
                        type="number"
                        min="1"
                        max="100"
                        value={editForm.max_students}
                        onChange={(e) => setEditForm(prev => ({ ...prev, max_students: parseInt(e.target.value) || 1 }))}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="status" className="text-right">
                        Status
                      </Label>
                      <Select
                        value={editForm.status}
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="price" className="text-right">
                        Price/Hour ($)
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.price_per_hour}
                        onChange={(e) => setEditForm(prev => ({ ...prev, price_per_hour: parseFloat(e.target.value) || 0 }))}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateClass} disabled={isUpdating}>
                      {isUpdating ? 'Updating...' : 'Update Class'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete Class
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the class
                      and remove all associated data.
                      {enrolledStudents.length > 0 && (
                        <span className="block mt-2 text-red-600 font-medium">
                          Warning: This class has {enrolledStudents.length} enrolled student(s). 
                          Please remove all students before deleting.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteClass}
                      disabled={enrolledStudents.length > 0}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Class
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Users2Icon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{getCurrentEnrollmentCount()}</div>
              <div className="text-sm text-muted-foreground">Enrolled Students</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <UserCheckIcon className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{getRemainingCapacity()}</div>
              <div className="text-sm text-muted-foreground">Available Spots</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <BookOpenIcon className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{classData.max_students}</div>
              <div className="text-sm text-muted-foreground">Max Capacity</div>
            </div>
          </div>

          {isClassFull() && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-orange-800 text-sm font-medium">
                ⚠️ Class is at full capacity. Students can still request to join and will be added to a waitlist.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrolled Students Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2Icon className="h-5 w-5" />
            Enrolled Students ({enrolledStudents.length})
          </CardTitle>
          <CardDescription>
            Manage students currently enrolled in your class
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enrolledStudents.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {enrolledStudents.map((student) => (
                  <Card key={student.id} className="border border-muted">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={student.avatar_url || undefined} />
                            <AvatarFallback>
                              {student.full_name?.split(' ').map(n => n[0]).join('') || 'ST'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{student.full_name}</h4>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                            {student.bio && (
                              <p className="text-sm text-muted-foreground mt-1">{student.bio}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/messages?to=${student.user_id}`)}
                          >
                            <MessageSquareIcon className="h-4 w-4 mr-1" />
                            Message
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <UserXIcon className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Student</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {student.full_name} from this class?
                                  This action will unenroll them and they will need to re-enroll to rejoin.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveStudent(student.user_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove Student
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <Users2Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Students Enrolled</h3>
              <p className="text-muted-foreground">
                Once students enroll in your class, you'll be able to manage them here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}