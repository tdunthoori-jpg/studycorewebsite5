import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/SimpleAuthContext';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name is required and must be at least 2 characters'),
  bio: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function SimpleProfileSetup() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      bio: '',
    },
  });

  // Update form values when profile data becomes available
  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
      });
    }
  }, [profile, form]);

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!loading) {
      // If no user after loading completes, redirect to login
      if (!user) {
        toast.error('Please sign in to continue');
        navigate('/login');
      }
      // If user has a complete profile, redirect to dashboard
      else if (profile?.full_name) {
        navigate('/dashboard');
      }
      // If user email is not verified
      else if (user && !user.email_confirmed_at) {
        toast.error('Please verify your email first');
        navigate('/verify-email');
      }
    }
  }, [user, profile, loading, navigate]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (isSubmitting || !user) return;
    
    setIsSubmitting(true);
    
    try {
      // Check if a profile exists with user_id matching user.id
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, user_id')
        .eq('user_id', user.id)
        .single();

      console.log('Existing profile check:', existingProfile);
      
      let error;
      
      if (existingProfile) {
        // Update existing profile
        const result = await supabase
          .from('profiles')
          .update({
            full_name: values.full_name,
            bio: values.bio || null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
          
        error = result.error;
      } else {
        // If no profile exists, create one
        const result = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email || '',
            full_name: values.full_name,
            bio: values.bio || null,
            role: user.user_metadata?.role || 'student',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          
        error = result.error;
      }
      
      if (error) throw error;
      
      toast.success('Profile updated successfully!');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after loading completes, we return null (redirect handled in useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-muted/50">
      <div className="w-full max-w-md p-4">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
            <CardDescription>
              Please provide your information to complete your account setup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Tell us about yourself..." {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                      Saving...
                    </>
                  ) : "Complete Profile"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              You can update your profile information anytime from your account settings.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}