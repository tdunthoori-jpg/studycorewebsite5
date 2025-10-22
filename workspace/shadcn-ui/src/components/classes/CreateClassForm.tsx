import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase } from '@/lib/supabase';
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { ArrowLeftIcon, BookOpenIcon, UsersIcon, TagIcon, DollarSignIcon } from 'lucide-react';

const createClassSchema = z.object({
  name: z.string().min(3, 'Class name must be at least 3 characters').max(100, 'Class name must be less than 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be less than 1000 characters'),
  subject: z.string().min(2, 'Subject is required').max(50, 'Subject must be less than 50 characters'),
  level: z.string().min(1, 'Level is required'),
  max_students: z.number().min(1, 'Must allow at least 1 student').max(100, 'Cannot exceed 100 students'),
  price_per_hour: z.number().min(0, 'Price cannot be negative').max(1000, 'Price cannot exceed $1000/hour'),
  status: z.enum(['active', 'inactive']).default('active'),
});

type CreateClassFormValues = z.infer<typeof createClassSchema>;

const SUBJECTS = [
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
  'Elementary',
  'Middle School',
  'High School',
  'College/University',
  'Graduate',
  'Professional',
  'Beginner',
  'Intermediate',
  'Advanced',
  'All Levels'
];

interface CreateClassFormProps {
  onSuccess?: (classId: string) => void;
  onCancel?: () => void;
}

export default function CreateClassForm({ onSuccess, onCancel }: CreateClassFormProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateClassFormValues>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      name: '',
      description: '',
      subject: '',
      level: '',
      max_students: 20,
      price_per_hour: 0,
      status: 'active',
    },
  });

  const onSubmit = async (values: CreateClassFormValues) => {
    if (!user || !profile || profile.role !== 'tutor') {
      toast.error('Only tutors can create classes');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Creating new class with data:', values);

      // Create the class in the database
      const { data: newClass, error: createError } = await supabase
        .from('classes')
        .insert({
          name: values.name,
          description: values.description,
          tutor_id: user.id,
          max_students: values.max_students,
          status: values.status,
          subject: values.subject,
          level: values.level,
          price_per_hour: values.price_per_hour,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating class:', createError);
        toast.error('Failed to create class: ' + createError.message);
        return;
      }

      if (!newClass) {
        console.error('No class data returned after creation');
        toast.error('Failed to create class: No data returned');
        return;
      }

      console.log('Class created successfully:', newClass);
      toast.success('Class created successfully!');

      // Call success callback or navigate
      if (onSuccess) {
        onSuccess(newClass.id);
      } else {
        navigate(`/classes/${newClass.id}`);
      }

    } catch (error) {
      console.error('Exception creating class:', error);
      toast.error('An unexpected error occurred while creating the class');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/classes');
    }
  };

  // Check if user is authorized
  if (!user || !profile || profile.role !== 'tutor') {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            Only tutors can create classes. Please contact support if you believe this is an error.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Class</h1>
          <p className="text-muted-foreground">
            Set up a new class for your students
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenIcon className="h-5 w-5" />
            Class Details
          </CardTitle>
          <CardDescription>
            Provide the basic information about your class
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Class Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Advanced Mathematics for High School"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what students will learn, teaching methods, and any prerequisites..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Help students understand what to expect from your class
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subject and Level Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <TagIcon className="h-4 w-4" />
                        Subject *
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SUBJECTS.map((subject) => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Max Students and Price Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_students"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4" />
                        Maximum Students *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        How many students can enroll in this class?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price_per_hour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSignIcon className="h-4 w-4" />
                        Price per Hour (USD)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="1000"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Set to 0 for free classes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active - Students can enroll</SelectItem>
                        <SelectItem value="inactive">Inactive - Not accepting enrollments</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      You can change this later from the class management page
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Creating...' : 'Create Class'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}