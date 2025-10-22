import { supabase, isSupabaseConfigured } from './supabase';
import { toast } from '@/components/ui/sonner';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addHours } from 'date-fns';
import { handleError, validateId } from './error-handler';
import { DEBUG } from './debug';

/**
 * Creates test data for a user if none exists
 * This is helpful for testing the UI when the database is empty
 * 
 * Can be enabled/disabled through the DEBUG.ENABLE_TEST_DATA flag
 */
export async function createTestDataIfNeeded(userId: string, userRole: 'student' | 'tutor'): Promise<boolean> {
  // This function is disabled and only returns false
  return false;

  // The entire test data implementation is disabled to prevent any issues
  try {
    // Check if Supabase is properly configured
    if (!isSupabaseConfigured) {
      console.warn('Supabase is not properly configured. Cannot create test data.');
      return false;
    }
    
    // Validate user ID
    try {
      userId = validateId(userId, 'user');
    } catch (error) {
      console.error('Invalid user ID for test data:', error);
      return false;
    }
    
    console.log(`Checking if test data is needed for ${userRole} with ID:`, userId);
    
    if (userRole === 'tutor') {
      // Check if the tutor already has classes
      const { data: existingClasses, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('tutor_id', userId);
        
      if (classError) {
        console.error('Error checking for existing classes:', classError);
        return false;
      }
      
      if (existingClasses && existingClasses.length > 0) {
        console.log('Tutor already has classes, no need for test data');
        return false; // Already has data
      }
      
      // Create test classes for the tutor
      const classIds = await createClassesForTutor(userId);
      if (classIds.length === 0) {
        return false;
      }
      
      // Create schedules for these classes
      await createSchedulesForClasses(classIds);
      
      // Create assignments for these classes
      await createAssignmentsForClasses(classIds);
      
      // Create resources for these classes
      await createResourcesForClasses(classIds);
      
      toast.success('Created test classes with schedules and assignments');
      return true;
    } 
    else if (userRole === 'student') {
      // Check if the student is already enrolled in classes
      const { data: existingEnrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', userId);
        
      if (enrollmentError) {
        console.error('Error checking for existing enrollments:', enrollmentError);
        return false;
      }
      
      if (existingEnrollments && existingEnrollments.length > 0) {
        console.log('Student already has enrollments, no need for test data');
        return false; // Already has data
      }
      
      // First check if there are any classes to enroll in
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id');
        
      if (classError) {
        console.error('Error checking for classes:', classError);
        return false;
      }
      
      if (!classes || classes.length === 0) {
        console.log('No classes found to enroll in, creating test classes');
        // Create a test tutor profile first
        const testTutorId = uuidv4();
        
        // Create a test auth user for the tutor
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: `testtutor-${testTutorId.substring(0, 8)}@example.com`,
          password: 'password123',
          email_confirm: true,
          user_metadata: { role: 'tutor' }
        });
        
        if (authError) {
          console.error('Error creating test tutor account:', authError);
          // Try to proceed with just the UUID we generated
        }
        
        const tutorId = authData?.user?.id || testTutorId;
        
        // Create a profile for this tutor
        await supabase
          .from('profiles')
          .insert({
            user_id: tutorId,
            email: `testtutor-${testTutorId.substring(0, 8)}@example.com`,
            full_name: 'Test Tutor',
            role: 'tutor'
          });
          
        // Create classes for this tutor
        const classIds = await createClassesForTutor(tutorId);
        
        // Create schedules, assignments, resources
        await createSchedulesForClasses(classIds);
        await createAssignmentsForClasses(classIds);
        await createResourcesForClasses(classIds);
        
        // Now enroll the student in these classes
        await enrollStudentInClasses(userId, classIds);
        
        toast.success('Created test enrollments with classes and assignments');
        return true;
      }
      
      // Enroll the student in some existing classes
      await enrollStudentInClasses(userId, classes.map(c => c.id));
      
      toast.success('Enrolled in test classes');
      return true;
    }
    
    return false;
  } catch (error) {
    handleError(error, 'Failed to create test data');
    return false;
  }
}

// Helper functions

async function createClassesForTutor(tutorId: string): Promise<string[]> {
  const classNames = [
    'Mathematics 101',
    'Introduction to Computer Science',
    'Physics for Beginners',
    'English Literature'
  ];
  
  const classIds: string[] = [];
  
  for (const name of classNames) {
    const { data, error } = await supabase
      .from('classes')
      .insert({
        name,
        description: `A comprehensive course on ${name}`,
        tutor_id: tutorId,
        max_students: 10
      })
      .select();
      
    if (error) {
      console.error(`Error creating class ${name}:`, error);
      continue;
    }
    
    if (data && data[0]) {
      classIds.push(data[0].id);
    }
  }
  
  return classIds;
}

async function createSchedulesForClasses(classIds: string[]): Promise<void> {
  const days = [0, 1, 2, 3, 4]; // Sunday to Thursday
  const startHours = [9, 11, 14, 16]; // 9 AM, 11 AM, 2 PM, 4 PM
  
  for (const classId of classIds) {
    // Create 2 schedules per class
    for (let i = 0; i < 2; i++) {
      const day = days[Math.floor(Math.random() * days.length)];
      const hour = startHours[Math.floor(Math.random() * startHours.length)];
      
      const now = new Date();
      const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((7 + day - now.getDay()) % 7), hour);
      const endTime = addHours(startTime, 2);
      
      await supabase
        .from('schedules')
        .insert({
          class_id: classId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          day_of_week: day,
          recurring: true,
          google_meet_link: `https://meet.google.com/test-${Math.random().toString(36).substring(2, 8)}`
        });
    }
  }
}

async function createAssignmentsForClasses(classIds: string[]): Promise<void> {
  const assignments = [
    'Homework Assignment 1',
    'Midterm Project',
    'Final Exam',
    'Research Paper'
  ];
  
  for (const classId of classIds) {
    // Create 2-3 assignments per class
    for (let i = 0; i < Math.floor(Math.random() * 2) + 2; i++) {
      const title = assignments[i % assignments.length];
      const dueDate = addDays(new Date(), 7 + i * 3); // Due in 1-4 weeks
      
      await supabase
        .from('assignments')
        .insert({
          class_id: classId,
          title,
          description: `Complete the ${title.toLowerCase()} for this class`,
          due_date: dueDate.toISOString(),
          file_url: i % 2 === 0 ? `https://example.com/assignments/test-${i}` : null
        });
    }
  }
}

async function createResourcesForClasses(classIds: string[]): Promise<void> {
  const resources = [
    { title: 'Course Syllabus', type: 'pdf' },
    { title: 'Lecture Notes', type: 'pdf' },
    { title: 'Tutorial Video', type: 'video' },
    { title: 'Additional Reading', type: 'link' }
  ];
  
  for (const classId of classIds) {
    // Create 2-3 resources per class
    for (let i = 0; i < Math.floor(Math.random() * 2) + 2; i++) {
      const resource = resources[i % resources.length];
      
      await supabase
        .from('resources')
        .insert({
          class_id: classId,
          title: resource.title,
          description: `${resource.title} for this course`,
          resource_type: resource.type,
          resource_url: `https://example.com/resources/${resource.type}-${i}`
        });
    }
  }
}

async function enrollStudentInClasses(studentId: string, classIds: string[]): Promise<void> {
  // Enroll in up to 3 classes
  const classesToEnrollIn = classIds.slice(0, Math.min(3, classIds.length));
  
  for (const classId of classesToEnrollIn) {
    await supabase
      .from('enrollments')
      .insert({
        student_id: studentId,
        class_id: classId,
        status: 'active'
      });
  }
}