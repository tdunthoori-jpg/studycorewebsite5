import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase, Profile } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users2Icon, SearchIcon, MessageSquareIcon, BookOpenIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animations';
import { toast } from '@/components/ui/sonner';

export default function StudentsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user || !profile) {
      navigate('/login');
      return;
    }
    
    fetchStudents();
  }, [user, profile]);

  const fetchStudents = async () => {
    if (!user || !profile) return;
    
    setLoading(true);
    try {
      if (profile.role === 'tutor') {
        // For tutors, get students from their classes
        const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select('id')
          .eq('tutor_id', user.id);
        
        if (classesError) throw classesError;
        
        if (classes && classes.length > 0) {
          const classIds = classes.map((c: any) => c.id);
          
          const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('student_id')
            .in('class_id', classIds)
            .eq('status', 'active');
          
          if (enrollmentsError) throw enrollmentsError;
          
          if (enrollments && enrollments.length > 0) {
            const studentIds = [...new Set(enrollments.map((e: any) => e.student_id))];
            
            const { data: studentsData, error: studentsError } = await supabase
              .from('profiles')
              .select('*')
              .in('user_id', studentIds)
              .eq('role', 'student');
            
            if (studentsError) throw studentsError;
            setStudents((studentsData as Profile[]) || []);
          }
        }
      } else {
        // For students, show other students in their classes
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('class_id')
          .eq('student_id', user.id)
          .eq('status', 'active');
        
        if (enrollmentsError) throw enrollmentsError;
        
        if (enrollments && enrollments.length > 0) {
          const classIds = enrollments.map((e: any) => e.class_id);
          
          const { data: allEnrollments, error: allEnrollmentsError } = await supabase
            .from('enrollments')
            .select('student_id')
            .in('class_id', classIds)
            .eq('status', 'active')
            .neq('student_id', user.id);
          
          if (allEnrollmentsError) throw allEnrollmentsError;
          
          if (allEnrollments && allEnrollments.length > 0) {
            const studentIds = [...new Set(allEnrollments.map((e: any) => e.student_id))];
            
            const { data: studentsData, error: studentsError } = await supabase
              .from('profiles')
              .select('*')
              .in('user_id', studentIds);
            
            if (studentsError) throw studentsError;
            setStudents((studentsData as Profile[]) || []);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"></div>
        <p className="ml-3 text-sky-100">Loading students...</p>
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
      <motion.div variants={fadeUp}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Students</h1>
            <p className="text-sky-100/70">
              {profile?.role === 'tutor'
                ? 'Students enrolled in your classes'
                : 'Students in your classes'}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="bg-blue-900/60 border-blue-700/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users2Icon className="h-5 w-5 text-sky-300" />
              All Students
            </CardTitle>
            <CardDescription className="text-sky-100/70">
              {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-sky-300" />
              <Input
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-blue-900/40 border-blue-700/60 text-white placeholder:text-sky-100/50"
              />
            </div>

            <ScrollArea className="h-[600px]">
              {filteredStudents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStudents.map((student) => (
                    <Card
                      key={student.user_id}
                      className="bg-blue-900/40 border-blue-700/60 hover:border-sky-500/50 transition-all"
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border-2 border-sky-500/30">
                            <AvatarImage src={student.avatar_url || undefined} />
                            <AvatarFallback className="bg-blue-900 text-sky-300">
                              {student.full_name?.split(' ').map(n => n[0]).join('') || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <CardTitle className="text-base text-white">{student.full_name || 'Unnamed Student'}</CardTitle>
                            <p className="text-sm text-sky-100/70">{student.email}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/messages?to=${student.user_id}`)}
                          className="flex-1 rounded-2xl border-blue-700/60 hover:bg-sky-500/10 hover:border-sky-500/50"
                        >
                          <MessageSquareIcon className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users2Icon className="h-12 w-12 mx-auto mb-4 text-sky-300" />
                  <h3 className="text-lg font-medium text-white mb-2">No Students Found</h3>
                  <p className="text-sky-100/70">
                    {searchTerm
                      ? 'No students match your search criteria.'
                      : profile?.role === 'tutor'
                      ? "You don't have any students enrolled in your classes yet."
                      : "There are no other students in your classes yet."}
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
