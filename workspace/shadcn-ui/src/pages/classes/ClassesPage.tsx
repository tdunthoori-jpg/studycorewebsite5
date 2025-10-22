import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase, Class } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { Users2Icon, SearchIcon, BookOpenIcon, FilterIcon, SortAscIcon } from 'lucide-react';

interface ExtendedClass extends Class {
  isEnrolled?: boolean;
  currentStudents?: number;
  tutorName?: string;
}

type SortOption = 'name' | 'created_at' | 'max_students' | 'price_per_hour';
type FilterStatus = 'all' | 'active' | 'inactive' | 'available' | 'full';

const SUBJECTS = [
  'All Subjects',
  'Mathematics',
  'Science', 
  'English',
  'History',
  'Computer Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
  'Psychology',
  'Art',
  'Music',
  'Foreign Languages',
  'Business',
  'Engineering',
  'Other'
];

const LEVELS = [
  'All Levels',
  'Elementary',
  'Middle School', 
  'High School',
  'College/University',
  'Graduate',
  'Professional',
  'Beginner',
  'Intermediate',
  'Advanced'
];

export default function ClassesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [classes, setClasses] = useState<ExtendedClass[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [selectedLevel, setSelectedLevel] = useState('All Levels');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user || !profile) {
      navigate('/login');
      return;
    }
    
    fetchClasses();
  }, [user, profile, navigate]);
  
  const fetchClasses = async () => {
    setLoading(true);
    try {
      console.log('Fetching classes data for user:', user?.id, 'with role:', profile?.role);
      
      let classesData: ExtendedClass[] = [];
      
      if (!user?.id || typeof user.id !== 'string' || user.id.length < 5) {
        console.error('Invalid user ID:', user?.id);
        toast.error('Invalid user ID format');
        return;
      }
      
      if (profile?.role === 'tutor') {
        // For tutors, fetch their classes with enrollment counts
        const { data: tutorClasses, error: tutorError } = await supabase
          .from('classes')
          .select('*')
          .eq('tutor_id', user.id);
            
        if (tutorError) {
          console.error('Error fetching tutor classes:', tutorError);
        } else if (tutorClasses) {
          // Get enrollment counts for each class
          const classesWithCounts = await Promise.all(
            tutorClasses.map(async (cls) => {
              const { data: enrollments } = await supabase
                .from('enrollments')
                .select('student_id')
                .eq('class_id', cls.id)
                .eq('status', 'active');
                
              return {
                ...cls,
                currentStudents: enrollments?.length || 0,
              };
            })
          );
          
          classesData = classesWithCounts;
        }
      } else {
        // For students, fetch all available classes with enrollment status
        console.log('Fetching all classes for student');
        const { data: allClasses, error: classesError } = await supabase
          .from('classes')
          .select('*');
            
        if (classesError) {
          console.error('Error fetching all classes:', classesError);
          toast.error('Failed to load classes: ' + classesError.message);
        } else if (allClasses) {
          console.log(`Found ${allClasses.length} total classes`);
          
          // Get student's enrollments
          const { data: enrollments, error: enrollmentError } = await supabase
            .from('enrollments')
            .select('class_id')
            .eq('student_id', user.id)
            .eq('status', 'active');
            
          if (enrollmentError) {
            console.error('Error fetching student enrollments:', enrollmentError);
          }
            
          const enrolledClassIds = enrollments?.map(e => e.class_id) || [];
          console.log(`Student is enrolled in ${enrolledClassIds.length} classes`);
          
          // Get enrollment counts and tutor info for all classes
          const classesWithInfo = await Promise.all(
            allClasses.map(async (cls) => {
              // Get enrollment count for this class
              const { data: classEnrollments } = await supabase
                .from('enrollments')
                .select('student_id')
                .eq('class_id', cls.id)
                .eq('status', 'active');
              
              // Get tutor info
              const { data: tutorProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', cls.tutor_id)
                .single();
                
              return {
                ...cls,
                isEnrolled: enrolledClassIds.includes(cls.id),
                currentStudents: classEnrollments?.length || 0,
                tutorName: tutorProfile?.full_name || 'Unknown',
              };
            })
          );
          
          classesData = classesWithInfo;
          console.log(`Processed ${classesData.length} classes with enrollment info`);
        }
      }
      
      setClasses(classesData);
      console.log(`Final classes data set:`, classesData);
      
    } catch (error) {
      console.error('Error fetching classes data:', error);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };
  
  // Enhanced filtering and sorting
  const filteredAndSortedClasses = classes
    .filter(cls => {
      // Text search
      const matchesSearch = searchTerm === '' || 
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.tutorName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Subject filter
      const matchesSubject = selectedSubject === 'All Subjects' || cls.subject === selectedSubject;
      
      // Level filter
      const matchesLevel = selectedLevel === 'All Levels' || cls.level === selectedLevel;
      
      // Status filter
      let matchesStatus = true;
      switch (statusFilter) {
        case 'active':
          matchesStatus = (cls.status === 'active' || cls.status === undefined || cls.status === null);
          break;
        case 'inactive':
          matchesStatus = cls.status === 'inactive';
          break;
        case 'available':
          matchesStatus = (cls.status === 'active' || cls.status === undefined || cls.status === null) && (cls.currentStudents || 0) < cls.max_students;
          break;
        case 'full':
          matchesStatus = (cls.currentStudents || 0) >= cls.max_students;
          break;
        default:
          matchesStatus = true;
      }
      
      return matchesSearch && matchesSubject && matchesLevel && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];
      
      // Handle undefined values
      if (aValue === undefined) aValue = '';
      if (bValue === undefined) bValue = '';
      
      // Convert to strings for comparison if needed
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Debug logging
  console.log(`Filtering ${classes.length} classes:`, {
    searchTerm,
    selectedSubject,
    selectedLevel,
    statusFilter,
    filteredCount: filteredAndSortedClasses.length
  });
  
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {profile?.role === 'tutor' ? 'Your Classes' : 'Available Classes'}
          </h1>
          <p className="text-muted-foreground">
            {profile?.role === 'tutor' 
              ? 'Manage and organize your class offerings'
              : 'Browse and enroll in available classes'
            }
          </p>
        </div>
        
        {profile?.role === 'tutor' && (
          <Button onClick={() => navigate('/classes/create')}>
            Create New Class
          </Button>
        )}
      </div>

      {/* Enhanced Search and Filter Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                type="text"
                placeholder="Search classes, subjects, or instructors..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Subject Filter */}
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Level Filter */}
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value: FilterStatus) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="available">Available Spots</SelectItem>
                <SelectItem value="full">Full Classes</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Sort Controls */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
            <span className="text-sm font-medium">Sort by:</span>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="max_students">Capacity</SelectItem>
                <SelectItem value="price_per_hour">Price</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSortOrder}
              className="flex items-center gap-2"
            >
              <SortAscIcon className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Found {filteredAndSortedClasses.length} class{filteredAndSortedClasses.length !== 1 ? 'es' : ''}
          {searchTerm && ` matching "${searchTerm}"`}
        </p>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <p>Loading classes...</p>
        </div>
      ) : filteredAndSortedClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedClasses.map((cls) => (
            <Card key={cls.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="line-clamp-2">{cls.name}</CardTitle>
                  <div className="flex flex-col gap-1">
                    {profile?.role === 'tutor' && cls.tutor_id === user?.id ? (
                      <Badge>Your Class</Badge>
                    ) : (
                      cls.isEnrolled && <Badge>Enrolled</Badge>
                    )}
                    {cls.status === 'active' && (cls.currentStudents || 0) >= cls.max_students && (
                      <Badge variant="destructive">Full</Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="line-clamp-3">{cls.description}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Users2Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{cls.currentStudents || 0}/{cls.max_students}</span>
                  </div>
                  {cls.price_per_hour && cls.price_per_hour > 0 && (
                    <span className="font-medium">${cls.price_per_hour}/hr</span>
                  )}
                </div>
                
                {cls.subject && (
                  <Badge variant="outline" className="text-xs">{cls.subject}</Badge>
                )}
                
                {cls.level && (
                  <Badge variant="outline" className="text-xs ml-2">{cls.level}</Badge>
                )}
                
                {profile?.role === 'student' && cls.tutorName && (
                  <p className="text-xs text-muted-foreground">
                    Instructor: {cls.tutorName}
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/classes/${cls.id}`)}
                >
                  <BookOpenIcon className="h-4 w-4 mr-2" />
                  {profile?.role === 'tutor' ? 'Manage' : 'View Details'}
                </Button>
                
                {profile?.role === 'tutor' && cls.tutor_id === user?.id && (
                  <Button 
                    variant="secondary" 
                    onClick={() => navigate(`/classes/${cls.id}/edit`)}
                  >
                    Edit
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="my-8">
          <CardHeader>
            <CardTitle>No Classes Found</CardTitle>
            <CardDescription>
              {searchTerm || selectedSubject !== 'All Subjects' || selectedLevel !== 'All Levels' || statusFilter !== 'all'
                ? 'No classes match your current filters. Try adjusting your search criteria.' 
                : profile?.role === 'tutor'
                  ? 'You haven\'t created any classes yet.'
                  : 'There are no available classes at the moment.'
              }
            </CardDescription>
          </CardHeader>
          <CardFooter>
            {(searchTerm || selectedSubject !== 'All Subjects' || selectedLevel !== 'All Levels' || statusFilter !== 'all') ? (
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSubject('All Subjects');
                  setSelectedLevel('All Levels');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </Button>
            ) : (
              profile?.role === 'tutor' && (
                <Button onClick={() => navigate('/classes/create')}>
                  Create Your First Class
                </Button>
              )
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}