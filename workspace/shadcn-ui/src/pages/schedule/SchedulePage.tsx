import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase, Class, Schedule } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { ExternalLinkIcon, CalendarIcon, ClockIcon, PlusIcon, PencilIcon, BookOpenIcon } from 'lucide-react';
import { format, addDays, isSameDay, isToday } from 'date-fns';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animations';

export default function SchedulePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    class_id: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    google_meet_link: '',
    recurring: true,
  });
  
  useEffect(() => {
    if (!user || !profile) {
      navigate('/login');
      return;
    }
    
    const fetchScheduleData = async () => {
      setLoading(true);
      try {
        console.log('Fetching schedule data for user:', user?.id, 'with role:', profile?.role);
        
        // Initialize data arrays
        let classesData: Class[] = [];
        let schedulesData: Schedule[] = [];
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
        
        // Fetch schedules for the identified classes (if any)
        if (classIds.length > 0) {
          const { data: scheduleData, error: scheduleError } = await supabase
            .from('schedules')
            .select('*')
            .in('class_id', classIds)
            .order('start_time', { ascending: true });
            
          if (scheduleError) {
            console.error('Error fetching schedules:', scheduleError);
          } else if (scheduleData) {
            schedulesData = scheduleData;
            console.log(`Loaded ${scheduleData.length} scheduled sessions`);
          }
        }
        
        // Update state with fetched data (even if empty)
        setClasses(classesData);
        setSchedules(schedulesData);
        
      } catch (error) {
        console.error('Error fetching schedule data:', error);
        toast.error('Failed to load schedule data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchScheduleData();
  }, [user, profile, navigate]);

  const handleCreateSchedule = async () => {
    try {
      if (!scheduleForm.class_id || !scheduleForm.day_of_week || !scheduleForm.start_time || !scheduleForm.end_time) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Format times as HH:MM:SS for PostgreSQL time type
      const startTimeFormatted = scheduleForm.start_time.includes(':') 
        ? `${scheduleForm.start_time}:00` 
        : scheduleForm.start_time;
      const endTimeFormatted = scheduleForm.end_time.includes(':') 
        ? `${scheduleForm.end_time}:00` 
        : scheduleForm.end_time;

      const { data, error } = await supabase
        .from('schedules')
        .insert({
          class_id: scheduleForm.class_id,
          day_of_week: parseInt(scheduleForm.day_of_week),
          start_time: startTimeFormatted,
          end_time: endTimeFormatted,
          google_meet_link: scheduleForm.google_meet_link || null,
          recurring: scheduleForm.recurring,
        })
        .select()
        .single();

      if (error) throw error;

      setSchedules([...schedules, data]);
      setIsCreateDialogOpen(false);
      setScheduleForm({
        class_id: '',
        day_of_week: '',
        start_time: '',
        end_time: '',
        google_meet_link: '',
        recurring: true,
      });
      toast.success('Schedule created successfully!');
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error('Failed to create schedule');
    }
  };

  const handleEditSchedule = async () => {
    try {
      if (!editingSchedule || !scheduleForm.class_id || !scheduleForm.day_of_week || !scheduleForm.start_time || !scheduleForm.end_time) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Format times as HH:MM:SS for PostgreSQL time type
      const startTimeFormatted = scheduleForm.start_time.includes(':') 
        ? `${scheduleForm.start_time}:00` 
        : scheduleForm.start_time;
      const endTimeFormatted = scheduleForm.end_time.includes(':') 
        ? `${scheduleForm.end_time}:00` 
        : scheduleForm.end_time;

      const { data, error } = await supabase
        .from('schedules')
        .update({
          class_id: scheduleForm.class_id,
          day_of_week: parseInt(scheduleForm.day_of_week),
          start_time: startTimeFormatted,
          end_time: endTimeFormatted,
          google_meet_link: scheduleForm.google_meet_link || null,
          recurring: scheduleForm.recurring,
        })
        .eq('id', editingSchedule.id)
        .select()
        .single();

      if (error) throw error;

      setSchedules(schedules.map(s => s.id === editingSchedule.id ? data : s));
      setIsEditDialogOpen(false);
      setEditingSchedule(null);
      setScheduleForm({
        class_id: '',
        day_of_week: '',
        start_time: '',
        end_time: '',
        google_meet_link: '',
        recurring: true,
      });
      toast.success('Schedule updated successfully!');
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule');
    }
  };
  
  // Get upcoming sessions (next 7 days)
  const getUpcomingSessions = () => {
    const now = new Date();
    const sevenDaysFromNow = addDays(now, 7);
    
    return schedules
      .map(schedule => {
        // Handle different time formats
        let scheduleDateTime: Date;
        
        if (schedule.start_time.includes('T')) {
          // Full timestamp format
          scheduleDateTime = new Date(schedule.start_time);
        } else {
          // Time-only format (HH:MM:SS) - need to calculate actual dates
          const today = new Date();
          const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
          
          // Calculate how many days until the next occurrence of this day
          let daysUntilNext = schedule.day_of_week - currentDay;
          if (daysUntilNext <= 0) {
            daysUntilNext += 7; // Next week if the day has passed or is today
          }
          
          const nextDate = addDays(today, daysUntilNext);
          
          const [hours, minutes] = schedule.start_time.split(':').map(Number);
          scheduleDateTime = new Date(nextDate);
          scheduleDateTime.setHours(hours, minutes, 0, 0);
        }
        
        return {
          ...schedule,
          calculated_date: scheduleDateTime
        };
      })
      .filter(schedule => {
        return schedule.calculated_date >= now && schedule.calculated_date <= sevenDaysFromNow;
      })
      .sort((a, b) => a.calculated_date.getTime() - b.calculated_date.getTime());
  };
  
  // Filter schedules for the selected date
  const filteredSchedules = selectedDate 
    ? schedules.filter(schedule => {
        // For calendar view, check if the selected date falls on the day_of_week for this schedule
        return selectedDate.getDay() === schedule.day_of_week;
      })
    : [];
    
  // Get dates with schedules for the calendar
  const scheduleDates = schedules.map(schedule => new Date(schedule.start_time));
  
  const upcomingSessions = getUpcomingSessions();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <motion.div 
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Schedule</h1>
          <p className="text-sky-100/70">
            {profile?.role === 'tutor' 
              ? 'Manage your class sessions and appointments'
              : 'View your scheduled classes and sessions'
            }
          </p>
        </div>
        
        {profile?.role === 'tutor' && (
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setScheduleForm({
                class_id: '',
                day_of_week: '',
                start_time: '',
                end_time: '',
                google_meet_link: '',
                recurring: true,
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-blue-900 border-blue-700/60">
              <DialogHeader>
                <DialogTitle className="text-white">Create Schedule</DialogTitle>
                <DialogDescription className="text-sky-100/70">
                  Add a new session to your schedule
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="class" className="text-white">Class</Label>
                  <Select value={scheduleForm.class_id} onValueChange={(value) => setScheduleForm(prev => ({ ...prev, class_id: value }))}>
                    <SelectTrigger className="bg-blue-900/40 border-blue-700/60 text-white">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent className="bg-blue-900 border-blue-700/60">
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id} className="text-white hover:bg-sky-500/20">
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="day" className="text-white">Day of Week</Label>
                  <Select value={scheduleForm.day_of_week} onValueChange={(value) => setScheduleForm(prev => ({ ...prev, day_of_week: value }))}>
                    <SelectTrigger className="bg-blue-900/40 border-blue-700/60 text-white">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent className="bg-blue-900 border-blue-700/60">
                      <SelectItem value="0" className="text-white hover:bg-sky-500/20">Sunday</SelectItem>
                      <SelectItem value="1" className="text-white hover:bg-sky-500/20">Monday</SelectItem>
                      <SelectItem value="2" className="text-white hover:bg-sky-500/20">Tuesday</SelectItem>
                      <SelectItem value="3" className="text-white hover:bg-sky-500/20">Wednesday</SelectItem>
                      <SelectItem value="4" className="text-white hover:bg-sky-500/20">Thursday</SelectItem>
                      <SelectItem value="5" className="text-white hover:bg-sky-500/20">Friday</SelectItem>
                      <SelectItem value="6" className="text-white hover:bg-sky-500/20">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start_time" className="text-white">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={scheduleForm.start_time}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, start_time: e.target.value }))}
                      className="bg-blue-900/40 border-blue-700/60 text-white"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end_time" className="text-white">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={scheduleForm.end_time}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, end_time: e.target.value }))}
                      className="bg-blue-900/40 border-blue-700/60 text-white"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="google_meet_link" className="text-white">Google Meet Link (Optional)</Label>
                  <Input
                    id="google_meet_link"
                    value={scheduleForm.google_meet_link}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, google_meet_link: e.target.value }))}
                    placeholder="https://meet.google.com/..."
                    className="bg-blue-900/40 border-blue-700/60 text-white"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateSchedule}
                  className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400"
                >
                  Create Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>
      
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-blue-900/60 border-blue-700/60">
          <TabsTrigger 
            value="upcoming"
            className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300"
          >
            Upcoming Sessions
          </TabsTrigger>
          <TabsTrigger 
            value="calendar"
            className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300"
          >
            Calendar View
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-4">
          <motion.div variants={fadeUp}>
          <Card className="bg-blue-900/60 border-blue-700/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <ClockIcon className="h-5 w-5 text-sky-300" />
                Next 7 Days
              </CardTitle>
              <CardDescription className="text-sky-100/70">
                Your upcoming sessions and classes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingSessions.length > 0 ? (
                <div className="space-y-4">
                  {upcomingSessions.map((schedule) => {
                    const classInfo = classes.find(c => c.id === schedule.class_id);
                    const startTime = schedule.calculated_date;
                    const endTime = new Date(startTime);
                    const [endHours, endMinutes] = schedule.end_time.split(':').map(Number);
                    endTime.setHours(endHours, endMinutes, 0, 0);
                    const isToday = isSameDay(startTime, new Date());
                    
                    return (
                      <Card key={schedule.id} className={`bg-blue-900/60 border-blue-700/60 hover:border-sky-500/50 transition-colors ${isToday ? "border-sky-500" : ""}`}>
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <BookOpenIcon className="h-4 w-4 text-sky-300" />
                                <h3 className="font-semibold text-white">{classInfo?.name || 'Class Session'}</h3>
                                {isToday && <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/50">Today</Badge>}
                                <Badge variant={schedule.recurring ? "outline" : "secondary"} className="border-blue-700/60">
                                  {schedule.recurring ? 'Weekly' : 'One-time'}
                                </Badge>
                              </div>
                              <p className="text-sm text-sky-100/70 mb-2">
                                {classInfo?.description}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-sky-100">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-4 w-4 text-sky-300" />
                                  <span>{format(startTime, 'EEEE, MMM d')}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ClockIcon className="h-4 w-4 text-sky-300" />
                                  <span>
                                    {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              {schedule.google_meet_link && (
                                <Button 
                                  size="sm" 
                                  asChild
                                  className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400"
                                >
                                  <a href={schedule.google_meet_link} target="_blank" rel="noreferrer">
                                    <ExternalLinkIcon className="h-4 w-4 mr-2" />
                                    Join
                                  </a>
                                </Button>
                              )}
                              
                              {profile?.role === 'tutor' && (
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingSchedule(schedule);
                                    setScheduleForm({
                                      class_id: schedule.class_id,
                                      day_of_week: schedule.day_of_week.toString(),
                                      start_time: schedule.start_time.substring(0, 5),
                                      end_time: schedule.end_time.substring(0, 5),
                                      google_meet_link: schedule.google_meet_link || '',
                                      recurring: schedule.recurring,
                                    });
                                    setIsEditDialogOpen(true);
                                  }}
                                  className="rounded-2xl border-blue-700/60 hover:bg-sky-500/10 hover:border-sky-500/50"
                                >
                                  <PencilIcon className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 mx-auto text-sky-300 mb-4" />
                  <h3 className="text-lg font-medium mb-2 text-white">No upcoming sessions</h3>
                  <p className="text-sky-100/70 mb-4">
                    {profile?.role === 'tutor' 
                      ? 'You don\'t have any sessions scheduled for the next 7 days.'
                      : 'You don\'t have any classes scheduled for the next 7 days.'
                    }
                  </p>
                  {profile?.role === 'tutor' && (
                    <Button 
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Schedule a Session
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>
        
        <TabsContent value="calendar" className="space-y-4">
          <motion.div variants={fadeUp}>
          <Card className="bg-blue-900/60 border-blue-700/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CalendarIcon className="h-5 w-5 text-sky-300" />
                Schedule Calendar
              </CardTitle>
              <CardDescription className="text-sky-100/70">
                View your class schedule on a calendar. Highlighted days show when you have classes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendar Section */}
                <div className="space-y-4">
                  <div className="bg-blue-900/40 border-2 border-blue-700/60 rounded-lg p-6 flex items-center justify-center">
                    <div className="w-full flex justify-center">
                      <style>
                        {`
                          /* HARD RESET - Override everything */
                          .schedule-calendar * {
                            box-sizing: border-box !important;
                          }
                          
                          /* Calendar container - proper spacing */
                          .schedule-calendar {
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 auto !important;
                            display: block !important;
                          }
                          
                          /* Root calendar wrapper */
                          .schedule-calendar > div {
                            max-width: 100% !important;
                          }
                          
                          /* Calendar table layout */
                          .schedule-calendar table {
                            width: 100% !important;
                            border-collapse: separate !important;
                            border-spacing: 6px !important;
                            margin: 0 auto !important;
                          }
                          
                          .schedule-calendar thead {
                            display: table-header-group !important;
                          }
                          
                          .schedule-calendar tbody {
                            display: table-row-group !important;
                          }
                          
                          .schedule-calendar tr {
                            display: table-row !important;
                          }
                          
                          /* Weekday headers - SHOW THEM with proper spacing */
                          .schedule-calendar th,
                          .schedule-calendar .rdp-weekday {
                            display: table-cell !important;
                            color: rgb(186, 230, 253) !important;
                            font-weight: 700 !important;
                            font-size: 0.875rem !important;
                            text-align: center !important;
                            padding: 12px 8px !important;
                            width: 52px !important;
                          }
                          
                          /* Day cells - proper spacing */
                          .schedule-calendar td,
                          .schedule-calendar .rdp-day {
                            display: table-cell !important;
                            vertical-align: middle !important;
                            text-align: center !important;
                            padding: 4px !important;
                            width: 52px !important;
                            height: 52px !important;
                          }
                          
                          /* ALL DAY BUTTONS - Maximum specificity with better sizing */
                          .schedule-calendar .rdp-day button,
                          .schedule-calendar button[name="day"],
                          .schedule-calendar [role="gridcell"] button {
                            width: 48px !important;
                            height: 48px !important;
                            min-width: 48px !important;
                            min-height: 48px !important;
                            max-width: 48px !important;
                            max-height: 48px !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            border-radius: 10px !important;
                            font-size: 1rem !important;
                            font-weight: 500 !important;
                            color: rgb(186, 230, 253) !important;
                            background-color: rgba(30, 58, 138, 0.4) !important;
                            border: 2px solid rgba(59, 130, 246, 0.3) !important;
                            transition: all 0.2s ease !important;
                            cursor: pointer !important;
                            margin: 0 auto !important;
                            padding: 0 !important;
                          }
                          
                          .schedule-calendar .rdp-day button:hover:not(:disabled),
                          .schedule-calendar button[name="day"]:hover:not(:disabled) {
                            background-color: rgba(30, 58, 138, 0.7) !important;
                            border-color: rgba(59, 130, 246, 0.6) !important;
                            transform: scale(1.05) !important;
                          }
                          
                          /* DAYS WITH CLASSES - Bright Blue */
                          .schedule-calendar .day_has-class button,
                          .schedule-calendar .day_has-class button[name="day"] {
                            background-color: rgba(14, 165, 233, 0.5) !important;
                            color: rgb(224, 242, 254) !important;
                            font-weight: 800 !important;
                            border: 3px solid rgb(14, 165, 233) !important;
                          }
                          
                          .schedule-calendar .day_has-class button:hover,
                          .schedule-calendar .day_has-class button[name="day"]:hover {
                            background-color: rgba(14, 165, 233, 0.8) !important;
                            border-color: rgb(56, 189, 248) !important;
                          }
                          
                          /* SELECTED DATE - Solid Blue - HARDCODED */
                          .schedule-calendar .day_is-selected button,
                          .schedule-calendar .day_is-selected button[name="day"] {
                            background-color: rgb(14, 165, 233) !important;
                            color: white !important;
                            font-weight: 800 !important;
                            border: 3px solid rgb(56, 189, 248) !important;
                          }
                          
                          .schedule-calendar .day_is-selected button:hover,
                          .schedule-calendar .day_is-selected button[name="day"]:hover {
                            background-color: rgb(56, 189, 248) !important;
                          }
                          
                          /* TODAY - Cyan Border - HARDCODED */
                          .schedule-calendar .day_is-today:not(.day_is-selected) button,
                          .schedule-calendar .day_is-today:not(.day_is-selected) button[name="day"] {
                            background-color: rgba(34, 211, 238, 0.25) !important;
                            color: rgb(165, 243, 252) !important;
                            border: 3px solid rgb(34, 211, 238) !important;
                            font-weight: 700 !important;
                          }
                          
                          /* FALLBACK - Keep original rdp classes as backup */
                          .schedule-calendar .rdp-day_selected button,
                          .schedule-calendar .rdp-day_selected button[name="day"],
                          .schedule-calendar button[aria-selected="true"],
                          .schedule-calendar button[name="day"][aria-selected="true"] {
                            background-color: rgb(14, 165, 233) !important;
                            color: white !important;
                            font-weight: 800 !important;
                            border: 3px solid rgb(56, 189, 248) !important;
                          }
                          
                          .schedule-calendar .rdp-day_selected button:hover,
                          .schedule-calendar button[aria-selected="true"]:hover {
                            background-color: rgb(56, 189, 248) !important;
                          }
                          
                          /* FALLBACK - TODAY */
                          .schedule-calendar .rdp-day_today:not(.rdp-day_selected) button,
                          .schedule-calendar .rdp-day_today:not(.rdp-day_selected) button[name="day"] {
                            background-color: rgba(34, 211, 238, 0.25) !important;
                            color: rgb(165, 243, 252) !important;
                            border: 3px solid rgb(34, 211, 238) !important;
                            font-weight: 700 !important;
                          }
                          
                          /* OUTSIDE DAYS */
                          .schedule-calendar .rdp-day_outside button,
                          .schedule-calendar .rdp-day_outside button[name="day"] {
                            opacity: 0.2 !important;
                            color: rgb(148, 163, 184) !important;
                          }
                          
                          /* DISABLED DAYS */
                          .schedule-calendar button:disabled,
                          .schedule-calendar button[name="day"]:disabled {
                            opacity: 0.3 !important;
                            cursor: not-allowed !important;
                            background-color: rgba(15, 23, 42, 0.3) !important;
                          }
                          
                          /* Month/Year Caption - better spacing */
                          .schedule-calendar .rdp-caption {
                            display: flex !important;
                            justify-content: space-between !important;
                            align-items: center !important;
                            padding: 0 8px 20px 8px !important;
                            margin-bottom: 12px !important;
                          }
                          
                          .schedule-calendar .rdp-caption_label {
                            color: rgb(186, 230, 253) !important;
                            font-size: 1.25rem !important;
                            font-weight: 700 !important;
                            flex: 1 !important;
                            text-align: center !important;
                          }
                          
                          /* Navigation Buttons - proper positioning */
                          .schedule-calendar .rdp-nav {
                            display: flex !important;
                            gap: 8px !important;
                          }
                          
                          .schedule-calendar button[name="previous-month"],
                          .schedule-calendar button[name="next-month"] {
                            width: 36px !important;
                            height: 36px !important;
                            min-width: 36px !important;
                            min-height: 36px !important;
                            color: rgb(186, 230, 253) !important;
                            background-color: rgba(30, 58, 138, 0.3) !important;
                            border: 2px solid rgba(59, 130, 246, 0.3) !important;
                            border-radius: 8px !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                          }
                          
                          .schedule-calendar button[name="previous-month"]:hover,
                          .schedule-calendar button[name="next-month"]:hover {
                            background-color: rgba(14, 165, 233, 0.4) !important;
                            border-color: rgb(14, 165, 233) !important;
                          }
                          
                          /* Month grid - proper spacing */
                          .schedule-calendar .rdp-month {
                            width: 100% !important;
                          }
                        `}
                      </style>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="schedule-calendar"
                        modifiers={{
                          hasClass: (date) => {
                            const dayOfWeek = date.getDay();
                            return schedules.some(schedule => schedule.day_of_week === dayOfWeek);
                          },
                          isToday: (date) => {
                            const today = new Date();
                            return date.getDate() === today.getDate() &&
                                   date.getMonth() === today.getMonth() &&
                                   date.getFullYear() === today.getFullYear();
                          },
                          isSelected: (date) => {
                            if (!selectedDate) return false;
                            return date.getDate() === selectedDate.getDate() &&
                                   date.getMonth() === selectedDate.getMonth() &&
                                   date.getFullYear() === selectedDate.getFullYear();
                          }
                        }}
                        modifiersClassNames={{
                          hasClass: 'day_has-class',
                          isToday: 'day_is-today',
                          isSelected: 'day_is-selected'
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="bg-blue-900/40 border border-blue-700/60 rounded-lg p-4">
                    <h4 className="font-medium mb-3 text-sm text-white">Legend</h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-lg border-2 border-sky-500 bg-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.3)]"></div>
                        <span className="text-sm text-sky-100">Days with scheduled classes</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-lg bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]"></div>
                        <span className="text-sm text-sky-100">Selected date</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-lg border-2 border-cyan-400 bg-cyan-400/20"></div>
                        <span className="text-sm text-sky-100">Today</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-lg border-2 border-blue-500/20 bg-blue-900/30"></div>
                        <span className="text-sm text-sky-100">Regular day</span>
                      </div>
                    </div>
                  </div>

                  {schedules.length > 0 && (
                    <div className="bg-blue-900/40 border border-blue-700/60 rounded-lg p-4">
                      <h4 className="font-medium mb-3 text-sm text-white">Your Class Days</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from(new Set(schedules.map(s => s.day_of_week)))
                          .sort()
                          .map(dayOfWeek => {
                            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
                            const classesOnDay = schedules.filter(s => s.day_of_week === dayOfWeek);
                            return (
                              <div key={dayOfWeek} className="px-2 py-1 bg-sky-900/50 border border-sky-700/60 rounded text-center">
                                <div className="font-medium text-sky-300 text-xs">{dayName}</div>
                                <div className="text-xs text-sky-100">
                                  {classesOnDay.length} class{classesOnDay.length > 1 ? 'es' : ''}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Date Info */}
                <div className="space-y-4">
                  <div className="bg-blue-900/40 border border-blue-700/60 rounded-lg p-4">
                    <h4 className="font-medium mb-2 text-white">
                      {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a Date'}
                    </h4>
                    {selectedDate ? (
                      (() => {
                        const selectedDayOfWeek = selectedDate.getDay();
                        const classesOnSelectedDay = schedules.filter(s => s.day_of_week === selectedDayOfWeek);
                        
                        if (classesOnSelectedDay.length > 0) {
                          return (
                            <div className="space-y-3">
                              <p className="text-sm text-sky-100/70">
                                {classesOnSelectedDay.length} class{classesOnSelectedDay.length > 1 ? 'es' : ''} scheduled:
                              </p>
                              {classesOnSelectedDay.map((schedule) => {
                                const classData = classes.find(c => c.id === schedule.class_id);
                                const [startHours, startMinutes] = schedule.start_time.split(':').map(Number);
                                const [endHours, endMinutes] = schedule.end_time.split(':').map(Number);
                                
                                const startTime = new Date(selectedDate);
                                startTime.setHours(startHours, startMinutes, 0, 0);
                                const endTime = new Date(selectedDate);
                                endTime.setHours(endHours, endMinutes, 0, 0);
                                
                                return (
                                  <div key={schedule.id} className="bg-blue-900/60 border border-blue-700/60 hover:border-sky-500/50 transition-colors rounded p-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm text-white">
                                          {classData?.name || 'Unknown Class'}
                                        </div>
                                        <div className="text-xs text-sky-100 flex items-center gap-1 mt-1">
                                          <ClockIcon className="h-3 w-3 text-sky-300" />
                                          {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                                        </div>
                                      </div>
                                      {schedule.google_meet_link && (
                                        <div className="px-2 py-1 bg-sky-500 text-white rounded text-xs">
                                          <a href={schedule.google_meet_link} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                                            <ExternalLinkIcon className="h-3 w-3" />
                                            Join
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        } else {
                          return (
                            <p className="text-sm text-sky-100/70">
                              No classes scheduled on this day.
                            </p>
                          );
                        }
                      })()
                    ) : (
                      <p className="text-sm text-sky-100/70">
                        Click on a date to see your scheduled classes.
                      </p>
                    )}
                  </div>

                  {selectedDate && profile?.role === 'tutor' && (
                    <div className="bg-blue-900/40 border border-blue-700/60 rounded-lg p-4">
                      <h4 className="font-medium mb-2 text-sm text-white">Quick Actions</h4>
                      <div className="space-y-2">
                        <div className="px-2 py-1 bg-blue-900/60 border border-blue-700/60 hover:border-sky-500/50 transition-colors rounded text-xs cursor-pointer text-sky-100"
                             onClick={() => setSelectedDate(new Date())}>
                          📅 Go to Today
                        </div>
                        <div className="px-2 py-1 bg-blue-900/60 border border-blue-700/60 hover:border-sky-500/50 transition-colors rounded text-xs cursor-pointer text-sky-100"
                             onClick={() => setIsCreateDialogOpen(true)}>
                          ➕ Add Class on {format(selectedDate, 'EEEE')}s
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditingSchedule(null);
          setScheduleForm({
            class_id: '',
            day_of_week: '',
            start_time: '',
            end_time: '',
            google_meet_link: '',
            recurring: true,
          });
        }
      }}>
        <DialogContent className="max-w-2xl bg-blue-900 border-blue-700/60">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Schedule</DialogTitle>
            <DialogDescription className="text-sky-100/70">
              Update the session details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-class" className="text-white">Class</Label>
              <Select value={scheduleForm.class_id} onValueChange={(value) => setScheduleForm(prev => ({ ...prev, class_id: value }))}>
                <SelectTrigger className="bg-blue-900/40 border-blue-700/60 text-white">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="bg-blue-900 border-blue-700/60">
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id} className="text-white hover:bg-sky-500/20">
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-day" className="text-white">Day of Week</Label>
              <Select value={scheduleForm.day_of_week} onValueChange={(value) => setScheduleForm(prev => ({ ...prev, day_of_week: value }))}>
                <SelectTrigger className="bg-blue-900/40 border-blue-700/60 text-white">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent className="bg-blue-900 border-blue-700/60">
                  <SelectItem value="0" className="text-white hover:bg-sky-500/20">Sunday</SelectItem>
                  <SelectItem value="1" className="text-white hover:bg-sky-500/20">Monday</SelectItem>
                  <SelectItem value="2" className="text-white hover:bg-sky-500/20">Tuesday</SelectItem>
                  <SelectItem value="3" className="text-white hover:bg-sky-500/20">Wednesday</SelectItem>
                  <SelectItem value="4" className="text-white hover:bg-sky-500/20">Thursday</SelectItem>
                  <SelectItem value="5" className="text-white hover:bg-sky-500/20">Friday</SelectItem>
                  <SelectItem value="6" className="text-white hover:bg-sky-500/20">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-start_time" className="text-white">Start Time</Label>
                <Input
                  id="edit-start_time"
                  type="time"
                  value={scheduleForm.start_time}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, start_time: e.target.value }))}
                  className="bg-blue-900/40 border-blue-700/60 text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-end_time" className="text-white">End Time</Label>
                <Input
                  id="edit-end_time"
                  type="time"
                  value={scheduleForm.end_time}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, end_time: e.target.value }))}
                  className="bg-blue-900/40 border-blue-700/60 text-white"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-google_meet_link" className="text-white">Google Meet Link (Optional)</Label>
              <Input
                id="edit-google_meet_link"
                value={scheduleForm.google_meet_link}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, google_meet_link: e.target.value }))}
                placeholder="https://meet.google.com/..."
                className="bg-blue-900/40 border-blue-700/60 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleEditSchedule}
              className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400"
            >
              Update Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}