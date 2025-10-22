import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/SimpleAuthContext';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

const registerSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword: z.string(),
  role: z.enum(['student', 'tutor']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Clear form on mount
  useEffect(() => {
    form.reset({
      email: '',
      password: '',
    });
    setIsSubmitting(false);
  }, [form]);

  // Simple timeout safety net
  useEffect(() => {
    if (!isSubmitting) return;
    
    const timeout = setTimeout(() => {
      console.log('Form submit timeout - resetting');
      setIsSubmitting(false);
    }, 6000);
    
    return () => clearTimeout(timeout);
  }, [isSubmitting]);

  const onSubmit = async (values: LoginFormValues) => {
    if (isSubmitting) {
      console.log('Already submitting - ignoring duplicate submit');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const email = values.email.trim().toLowerCase();
      console.log('Signing in with:', email);
      
      // Import our simple sign-in function
      const { simpleSignIn } = await import('@/lib/simple-signin');
      
      // Use simple sign-in - this handles everything including navigation
      await simpleSignIn(email, values.password);
      
      // If we're still here after a delay, reset the form state
      // (the page should have navigated away if login was successful)
      setTimeout(() => setIsSubmitting(false), 2000);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md" key="login-form">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your email and password to access your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="you@example.com" 
                      {...field} 
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="********" 
                      {...field} 
                      disabled={isSubmitting}
                    />
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
                  Processing...
                </>
              ) : "Sign In"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-center space-y-1">
          <div>
            <button 
              className="text-blue-500 hover:underline"
              onClick={() => navigate('/reset-password')}
            >
              Forgot your password?
            </button>
          </div>
          <div>
            <div className="flex space-x-4 justify-center">
              <button 
                className="text-gray-400 hover:underline text-xs"
                onClick={() => navigate('/clear-data')}
              >
                Clear browser data
              </button>
              <button 
                className="text-red-400 hover:underline text-xs"
                onClick={() => {
                  console.log('RESET AUTH STATE MANUALLY');
                  window.localStorage.setItem('auth_debug', 'true');
                  window.location.reload();
                }}
              >
                Reset Auth State
              </button>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      role: 'student',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      // Trim and normalize the email
      const email = values.email.trim().toLowerCase();
      console.log('Submitting registration with email:', email);
      
      // Import our simple auth function
      const { simpleSignup } = await import('@/lib/simple-auth');
      
      // Use simple signup - this handles everything including navigation
      await simpleSignup(email, values.password, values.role);
      
      // If we're still here after a delay, reset the form state
      // (the page should have navigated away if signup was successful)
      setTimeout(() => setIsSubmitting(false), 2000);
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Provide specific error messages
      if (error.message?.includes('User already registered')) {
        toast.error("An account with this email already exists. Try signing in instead.");
      } else if (error.message?.includes('Password')) {
        toast.error("Password is too weak. Please use at least 6 characters.");
      } else {
        toast.error(error.message || "Registration failed. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Sign up for a new account to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="you@example.com" 
                      {...field} 
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="********" 
                      {...field} 
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="********" 
                      {...field} 
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Account Type</FormLabel>
                  <FormControl>
                    <RadioGroup 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="student" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Student
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="tutor" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Tutor
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
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
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <div className="text-sm">
          Already have an account?{" "}
          <button 
            className="text-blue-500 hover:underline"
            onClick={() => navigate('/login')}
          >
            Sign in
          </button>
        </div>
      </CardFooter>
    </Card>
  );
}

export function AuthTabs() {
  return (
    <Tabs defaultValue="login" className="w-full max-w-md">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <LoginForm />
      </TabsContent>
      <TabsContent value="register">
        <RegisterForm />
      </TabsContent>
    </Tabs>
  );
}

export function ResetPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Import our simple auth function
      const { simpleResetPassword } = await import('@/lib/simple-auth');
      
      // Use simple reset password function
      await simpleResetPassword(email);
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Error sending reset email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>Enter your email to receive a password reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !email}
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <button 
          className="text-sm text-blue-500 hover:underline"
          onClick={() => navigate('/login')}
        >
          Back to login
        </button>
      </CardFooter>
    </Card>
  );
}