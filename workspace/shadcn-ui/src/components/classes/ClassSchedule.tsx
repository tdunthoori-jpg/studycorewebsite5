import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase, Schedule, Class } from '@/lib/supabase';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/sonner';
import { 
  CalendarIcon, 
  ClockIcon, 
  PlusIcon, 
  EditIcon, 
  TrashIcon,
  VideoIcon,
  RepeatIcon,
  MapPinIcon
} from 'lucide-react';
import { format, parse, addDays, isBefore } from 'date-fns';

const scheduleSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  google_meet_link: z.string().url('Invalid URL').optional().or(z.literal('')),
  recurring: z.boolean().default(true),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface ClassScheduleProps {
  classData: Class;
  schedules: Schedule[];
  onSchedulesUpdate: (schedules: Schedule[]) => void;
  isOwner: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function ClassSchedule({ 
  classData, 
  schedules, 
  onSchedulesUpdate, 
  isOwner 
}: ClassScheduleProps) {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      day_of_week: 1,
      start_time: '10:00',
      end_time: '11:00',
      google_meet_link: '',
      recurring: true,
    },
  });

  useEffect(() => {
    if (editingSchedule) {
      // Times are now stored as "HH:MM:SS" strings, extract HH:MM portion
      const startTime = editingSchedule.start_time.substring(0, 5); // Get "HH:MM" from "HH:MM:SS"
      const endTime = editingSchedule.end_time.substring(0, 5); // Get "HH:MM" from "HH:MM:SS"
      
      form.reset({
        day_of_week: editingSchedule.day_of_week,
        start_time: startTime,
        end_time: endTime,
        google_meet_link: editingSchedule.google_meet_link || '',
        recurring: editingSchedule.recurring,
      });
    }
  }, [editingSchedule, form]);

  const createScheduleEntry = async (values: ScheduleFormValues) => {
    if (!user) return;

    // For time columns, we need to send just the time portion (HH:MM:SS format)
    const [startHour, startMinute] = values.start_time.split(':').map(Number);
    const [endHour, endMinute] = values.end_time.split(':').map(Number);
    
    // Validate time logic
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    
    if (startTimeMinutes >= endTimeMinutes) {
      toast.error('Start time must be before end time');
      return;
    }

    // Format times as HH:MM:SS for PostgreSQL time type
    const startTimeString = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}:00`;
    const endTimeString = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;

    const scheduleData = {
      class_id: classData.id,
      day_of_week: values.day_of_week,
      start_time: startTimeString,
      end_time: endTimeString,
      google_meet_link: values.google_meet_link || null,
      recurring: values.recurring,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (editingSchedule) {
      // Update existing schedule
      const { data, error } = await supabase
        .from('schedules')
        .update(scheduleData)
        .eq('id', editingSchedule.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating schedule:', error);
        toast.error('Failed to update schedule: ' + error.message);
        return;
      }

      const updatedSchedules = schedules.map(s => s.id === editingSchedule.id ? data : s);
      onSchedulesUpdate(updatedSchedules);
      toast.success('Schedule updated successfully!');
    } else {
      // Create new schedule
      const { data, error } = await supabase
        .from('schedules')
        .insert(scheduleData)
        .select()
        .single();

      if (error) {
        console.error('Error creating schedule:', error);
        toast.error('Failed to create schedule: ' + error.message);
        return;
      }

      onSchedulesUpdate([...schedules, data]);
      toast.success('Schedule created successfully!');
    }

    setIsCreateDialogOpen(false);
    setEditingSchedule(null);
    form.reset();
  };

  const deleteSchedule = async (scheduleId: string) => {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule: ' + error.message);
      return;
    }

    const updatedSchedules = schedules.filter(s => s.id !== scheduleId);
    onSchedulesUpdate(updatedSchedules);
    toast.success('Schedule deleted successfully');
  };

  const onSubmit = async (values: ScheduleFormValues) => {
    setIsSubmitting(true);
    try {
      await createScheduleEntry(values);
    } catch (error) {
      console.error('Exception creating/updating schedule:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setIsCreateDialogOpen(true);
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingSchedule(null);
    form.reset();
  };

  const sortedSchedules = [...schedules].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week;
    }
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Class Schedule
            </CardTitle>
            <CardDescription>
              {isOwner 
                ? 'Manage your class schedule and meeting times'
                : 'View scheduled class sessions and meeting links'
              }
            </CardDescription>
          </div>
          
          {isOwner && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingSchedule(null)}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSchedule 
                      ? 'Update the schedule details'
                      : 'Create a new recurring class session'
                    }
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="day_of_week"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day of Week</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            value={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select day" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DAYS_OF_WEEK.map((day) => (
                                <SelectItem key={day.value} value={day.value.toString()}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="start_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="end_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="google_meet_link"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meeting Link (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://meet.google.com/..." 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Google Meet, Zoom, or other video conference link
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeDialog}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting 
                          ? (editingSchedule ? 'Updating...' : 'Creating...') 
                          : (editingSchedule ? 'Update Schedule' : 'Create Schedule')
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
        {sortedSchedules.length > 0 ? (
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {sortedSchedules.map((schedule) => {
                const dayName = DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week)?.label;
                // Times are now stored as "HH:MM:SS" strings, parse and format them
                const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
                const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
                
                const startTime = new Date();
                startTime.setHours(startHour, startMinute, 0, 0);
                const endTime = new Date();
                endTime.setHours(endHour, endMinute, 0, 0);
                
                const formattedStartTime = format(startTime, 'h:mm a');
                const formattedEndTime = format(endTime, 'h:mm a');
                
                return (
                  <Card key={schedule.id} className="border border-muted">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{dayName}</Badge>
                            {schedule.recurring && (
                              <Badge variant="secondary" className="text-xs">
                                <RepeatIcon className="h-3 w-3 mr-1" />
                                Recurring
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <ClockIcon className="h-4 w-4 text-muted-foreground" />
                            <span>{formattedStartTime} - {formattedEndTime}</span>
                          </div>
                          
                          {schedule.google_meet_link && (
                            <div className="flex items-center gap-2">
                              <VideoIcon className="h-4 w-4 text-blue-600" />
                              <a 
                                href={schedule.google_meet_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm underline"
                              >
                                Join Meeting
                              </a>
                            </div>
                          )}
                        </div>
                        
                        {isOwner && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(schedule)}
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
                                  <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this schedule entry? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteSchedule(schedule.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Schedule Set</h3>
            <p className="text-muted-foreground mb-4">
              {isOwner 
                ? "Set up your class schedule to let students know when sessions occur."
                : "The instructor hasn't set up a schedule yet."
              }
            </p>
            {isOwner && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add First Schedule
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}