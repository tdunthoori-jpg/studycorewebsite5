import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, RefreshCw, Database, Code, Activity, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from '@/components/ui/separator';
import { checkDatabaseConnection, logDatabaseDebugInfo } from '@/lib/db-checker';
import { checkRequiredTables, verifyDatabaseSetup } from '@/lib/db-setup-checker';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';

// SQL Setup script content from database_setup.md (abridged for brevity)
const setupSQL = `
-- Create tables for your application

-- Profiles table for storing user information
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'tutor')),
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes table for courses
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  tutor_id UUID REFERENCES profiles(user_id) NOT NULL,
  max_students INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments table for student enrollments in classes
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) NOT NULL,
  student_id UUID REFERENCES profiles(user_id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'dropped')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedules table for class schedules
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  google_meet_link TEXT,
  recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignments table for class assignments
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignment submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) NOT NULL,
  student_id UUID REFERENCES profiles(user_id) NOT NULL,
  submission_url TEXT,
  grade INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resources table for class resources
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('pdf', 'video', 'link', 'other')),
  resource_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table for communication
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles(user_id) NOT NULL,
  recipient_id UUID REFERENCES profiles(user_id) NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic examples)
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view all classes" ON classes FOR SELECT USING (true);

-- Create function for database connection checking
CREATE OR REPLACE FUNCTION public.version()
RETURNS text AS $$
BEGIN
  RETURN current_setting('server_version');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the version function
GRANT EXECUTE ON FUNCTION public.version() TO anon;
GRANT EXECUTE ON FUNCTION public.version() TO authenticated;
GRANT EXECUTE ON FUNCTION public.version() TO service_role;

-- See the full setup in db-functions-setup.sql
`;

const DatabaseDebugPage = () => {
  const [connectionStatus, setConnectionStatus] = useState<{ 
    isLoading: boolean; 
    success?: boolean; 
    error?: any;
  }>({ isLoading: false });
  
  const [tablesStatus, setTablesStatus] = useState<{ 
    isLoading: boolean; 
    success?: boolean; 
    error?: any;
    missingTables?: string[];
  }>({ isLoading: false });
  
  const [debugLog, setDebugLog] = useState<string>('');
  const [showDebugOutput, setShowDebugOutput] = useState(false);
  
  // Check for Supabase configuration
  const supabaseConfigStatus = {
    configured: isSupabaseConfigured,
    url: import.meta.env.VITE_SUPABASE_URL || 'Not set',
    keyAvailable: !!import.meta.env.VITE_SUPABASE_ANON_KEY
  };
  
  // Function to test database connection
  const testDatabaseConnection = async () => {
    setConnectionStatus({ isLoading: true });
    try {
      const isConnected = await checkDatabaseConnection();
      setConnectionStatus({ 
        isLoading: false, 
        success: isConnected
      });
    } catch (error) {
      setConnectionStatus({ 
        isLoading: false, 
        success: false,
        error 
      });
    }
  };

  // Function to check required tables
  const testRequiredTables = async () => {
    setTablesStatus({ isLoading: true });
    try {
      const tablesExist = await checkRequiredTables();
      setTablesStatus({ 
        isLoading: false, 
        success: tablesExist
      });
    } catch (error) {
      setTablesStatus({ 
        isLoading: false, 
        success: false,
        error 
      });
    }
  };
  
  // Function to collect debug information
  const runDebugLogging = async () => {
    setDebugLog('Loading debug information...');
    setShowDebugOutput(true);
    
    try {
      // Override console.log temporarily to capture output
      const originalLog = console.log;
      const originalError = console.error;
      let capturedLog = '';
      
      console.log = (...args) => {
        originalLog(...args);
        capturedLog += args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
        ).join(' ') + '\n';
      };
      
      console.error = (...args) => {
        originalError(...args);
        capturedLog += '❌ ERROR: ' + args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
        ).join(' ') + '\n';
      };
      
      // Run debug function
      await logDatabaseDebugInfo();
      
      // Check auth status
      const { data: authData } = await supabase.auth.getSession();
      console.log('Auth Session:', authData.session ? 'Available' : 'Not available');
      
      // Check Supabase config
      console.log('Supabase Config:', {
        configured: isSupabaseConfigured,
        urlAvailable: !!import.meta.env.VITE_SUPABASE_URL,
        keyAvailable: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      });
      
      // Restore original console functions
      console.log = originalLog;
      console.error = originalError;
      
      setDebugLog(capturedLog);
    } catch (error) {
      console.error('Error running debug:', error);
      setDebugLog(`Error running debug: ${error}`);
    }
  };
  
  // Function to attempt running database version check
  const testVersionFunction = async () => {
    try {
      const { data, error } = await supabase.rpc('version');
      
      if (error) {
        toast.error(`Database version function error: ${error.message}`);
        console.error('Database version function error:', error);
      } else {
        toast.success(`Database version: ${data}`);
        console.log('Database version:', data);
      }
    } catch (error) {
      toast.error(`Exception testing version function: ${error}`);
      console.error('Exception testing version function:', error);
    }
  };
  
  // Run database validation on page load
  useEffect(() => {
    verifyDatabaseSetup().catch(err => 
      console.error('Database verification failed on page load:', err)
    );
  }, []);

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Database Connection Debugging</h1>
      <p className="text-muted-foreground mb-6">
        Use these tools to troubleshoot database connection issues
      </p>
      
      {!supabaseConfigStatus.configured && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertTitle>Supabase Configuration Missing</AlertTitle>
          <AlertDescription>
            Your Supabase configuration appears to be incomplete. Please check your environment variables.
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="tests">
        <TabsList className="mb-6 grid grid-cols-3 w-full">
          <TabsTrigger value="tests">Connection Tests</TabsTrigger>
          <TabsTrigger value="setup">Database Setup</TabsTrigger>
          <TabsTrigger value="debug">Debug Tools</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tests" className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Database Connection</CardTitle>
              <CardDescription>
                Verifies basic connectivity to your Supabase database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectionStatus.success !== undefined && (
                <Alert variant={connectionStatus.success ? "default" : "destructive"} className="mb-4">
                  <div className="flex items-center">
                    {connectionStatus.success ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2" />
                    )}
                    <AlertTitle>
                      {connectionStatus.success ? "Connection Successful" : "Connection Failed"}
                    </AlertTitle>
                  </div>
                  <AlertDescription>
                    {connectionStatus.success 
                      ? "Successfully connected to the database" 
                      : connectionStatus.error 
                        ? `Error: ${JSON.stringify(connectionStatus.error)}` 
                        : "Could not connect to the database"}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Environment Configuration:</h3>
                <div className="bg-muted p-3 rounded text-sm">
                  <p><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL || 'Not set'}</p>
                  <p><strong>Supabase Key:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? '[Set]' : 'Not set'}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={testDatabaseConnection} 
                disabled={connectionStatus.isLoading}
              >
                {connectionStatus.isLoading && (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                )}
                Test Connection
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Check Required Tables</CardTitle>
              <CardDescription>
                Checks if all required database tables are properly set up
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tablesStatus.success !== undefined && (
                <Alert variant={tablesStatus.success ? "default" : "destructive"} className="mb-4">
                  <div className="flex items-center">
                    {tablesStatus.success ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2" />
                    )}
                    <AlertTitle>
                      {tablesStatus.success ? "All Required Tables Found" : "Missing Required Tables"}
                    </AlertTitle>
                  </div>
                  <AlertDescription>
                    {tablesStatus.success 
                      ? "All required database tables are properly set up" 
                      : tablesStatus.error 
                        ? `Error: ${JSON.stringify(tablesStatus.error)}`
                        : "Some required tables are missing. Please run the database setup SQL."}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Required Tables:</h3>
                <div className="bg-muted p-3 rounded text-sm">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>profiles</li>
                    <li>classes</li>
                    <li>enrollments</li>
                    <li>schedules</li>
                    <li>assignments</li>
                    <li>submissions</li>
                    <li>resources</li>
                    <li>messages</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={testRequiredTables} 
                disabled={tablesStatus.isLoading}
              >
                {tablesStatus.isLoading && (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                )}
                Check Required Tables
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Test Database Version Function</CardTitle>
              <CardDescription>
                Tests if the version function is properly set up in your Supabase project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>This tests if the <code>version()</code> function from <code>db-functions-setup.sql</code> is properly installed.</p>
              <div className="mt-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Function Information</AlertTitle>
                  <AlertDescription>
                    If you see "function version() does not exist" errors, you need to run the function setup SQL in your Supabase project.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={testVersionFunction}>
                Test Version Function
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle>Database Setup SQL</CardTitle>
              <CardDescription>
                Run this SQL in your Supabase project SQL Editor to create all required tables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  <p className="font-medium">Instructions:</p>
                </div>
                <ol className="list-decimal ml-6 space-y-2">
                  <li>Go to the <a href="https://app.supabase.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Supabase dashboard</a></li>
                  <li>Select your project</li>
                  <li>Navigate to "SQL Editor" in the left sidebar</li>
                  <li>Click "New Query"</li>
                  <li>Paste the SQL code below</li>
                  <li>Click "Run" to execute the SQL commands</li>
                </ol>
                
                <Separator />
                
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Required Files:</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    There are two SQL setup files included in your project:
                  </p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><code>safe-auth-setup.sql</code> - Complete database setup</li>
                    <li><code>db-functions-setup.sql</code> - Required database functions</li>
                  </ul>
                </div>
                
                <div className="bg-muted rounded-md overflow-hidden mt-4">
                  <div className="flex items-center justify-between bg-muted/50 p-2 border-b">
                    <span className="font-mono text-sm">setup.sql (partial)</span>
                    <Button variant="outline" size="sm" onClick={() => {
                      navigator.clipboard.writeText(setupSQL);
                      toast.success('SQL copied to clipboard!');
                    }}>
                      Copy SQL
                    </Button>
                  </div>
                  <pre className="p-4 overflow-auto max-h-[400px] text-xs">
                    {setupSQL}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="debug">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Debugging Tools</CardTitle>
              <CardDescription>
                Detailed debugging information to help troubleshoot database issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Database Debug Output</h3>
                <p className="text-muted-foreground mb-4">
                  Get detailed debug information about your database connection and configuration
                </p>
                <Button 
                  variant="outline" 
                  onClick={runDebugLogging}
                >
                  <Code className="h-4 w-4 mr-2" />
                  Run Diagnostic Log
                </Button>
                
                {showDebugOutput && (
                  <div className="mt-4">
                    <div className="bg-muted rounded-md overflow-hidden">
                      <div className="bg-muted/50 p-2 border-b flex justify-between">
                        <span className="font-mono text-sm">Debug Output</span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowDebugOutput(false)}
                        >
                          Hide
                        </Button>
                      </div>
                      <pre className="p-4 overflow-auto max-h-[400px] text-xs whitespace-pre-wrap">
                        {debugLog || 'No debug information available yet.'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Environment Variables</h3>
                <p className="text-muted-foreground mb-4">
                  Check your Supabase configuration:
                </p>
                <div className="bg-muted p-4 rounded-md">
                  <p><strong>URL:</strong> {import.meta.env.VITE_SUPABASE_URL || 'Not set'}</p>
                  <p><strong>Anonymous Key:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? '[Key is set]' : 'Not set'}</p>
                  <p><strong>Configuration Status:</strong> {isSupabaseConfigured ? '✅ Valid' : '❌ Invalid or incomplete'}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Documentation</h3>
                <p className="text-muted-foreground mb-4">
                  Refer to these files for additional setup guidance:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><code>DATABASE_SETUP.md</code> - Complete database setup instructions</li>
                  <li><code>TEST_DATA_DOCS.md</code> - Documentation for test data generation</li>
                  <li><code>safe-auth-setup.sql</code> - Complete database SQL setup</li>
                  <li><code>db-functions-setup.sql</code> - Required database functions</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseDebugPage;