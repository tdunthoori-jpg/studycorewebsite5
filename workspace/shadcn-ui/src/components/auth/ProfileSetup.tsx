import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimpleAuthContext';
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

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name is required and must be at least 2 characters'),
  bio: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileSetup() {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize form hook BEFORE any conditional returns
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      bio: profile?.bio || '',
    },
  });

  useEffect(() => {
    // Check authentication status using simplified approach
    const checkAuthAndProfile = async () => {
      try {
        // Import our checkAuth function
        const { checkAuth } = await import('@/lib/simple-auth');
        const auth = await checkAuth();
        
        // If not authenticated, redirect to login
        if (!auth.isAuthenticated) {
          console.log('No active session, redirecting to login');
          toast.error('Please sign in to continue');
          navigate('/login');
          return;
        }

        // Check if email is verified
        if (!auth.user?.email_confirmed_at) {
          console.log('Email not verified, redirecting to verification page');
          toast.error('Please verify your email first');
          navigate('/verify-email');
          return;
        }
        
        // Get the user's profile directly
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', auth.user.id)
          .single();
        
        // If the profile exists and is complete, redirect to dashboard
        if (!error && profileData?.full_name) {
          console.log('Found complete profile, redirecting to dashboard');
          navigate('/dashboard');
          return;
        }
        
        // If we're here, user is authenticated but profile is missing or incomplete
        setLoading(false);
      } catch (error) {
        console.error('Error checking auth status:', error);
        toast.error('Could not verify your authentication status');
        setLoading(false);
      }
    };
    
    checkAuthAndProfile();
  }, [navigate]);

  // Update form values when profile data becomes available
  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
      });
    }
  }, [profile, form]);

  // Watch for profile completion and reset submitting state
  useEffect(() => {
    if (profile?.full_name && isSubmitting) {
      console.log('Profile is now complete');
      setIsSubmitting(false);
      // AuthContext will handle navigation
    }
  }, [profile?.full_name, isSubmitting]);

  // Show loading state while checking authentication
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
  
  // If no user after loading completes, we should redirect (handled in useEffect)
  if (!user) {
    return null;
  }

  const onSubmit = async (values: ProfileFormValues) => {
    // Don't do anything if already submitting
    if (isSubmitting) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log('Submitting profile update:', values);
      
      // First check if we have a valid user session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) {
        toast.error('Your session has expired. Please sign in again.');
        navigate('/login');
        return;
      }
      
      // Import our simple auth function
      const { simpleUpdateProfile } = await import('@/lib/simple-auth');
      
      // Use the simple update profile function
      const userId = sessionData.session.user.id;
      const result = await simpleUpdateProfile(userId, {
        full_name: values.full_name,
        bio: values.bio || null,
        updated_at: new Date().toISOString(),
      });
      
      if (!result.success) {
        setIsSubmitting(false);
        return;
      }
      
      // simpleUpdateProfile already handles navigation if setting full_name
      // Just reset submitting state after a delay if we're still here
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
      
    } catch (error) {
      console.error('Exception in profile update:', error);
      toast.error('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-muted/50">
      <div className="w-full max-w-md p-4">
        <Card>
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
                        <Input placeholder="John Doe" {...field} />
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
                        <Input placeholder="Tell us a bit about yourself..." {...field} />
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
                  {isSubmitting ? 'Saving...' : 'Complete Profile'}
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