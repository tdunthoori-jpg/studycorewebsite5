import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { testSupabaseConnection } from '@/lib/supabaseTests';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const DebugPage = () => {
  const [connectionStatus, setConnectionStatus] = useState<{ 
    isLoading: boolean; 
    success?: boolean; 
    error?: any;
    data?: any;
  }>({ isLoading: false });

  const runConnectionTest = async () => {
    setConnectionStatus({ isLoading: true });
    try {
      const result = await testSupabaseConnection();
      setConnectionStatus({ 
        isLoading: false, 
        success: result.success,
        error: result.error,
        data: result.data
      });
    } catch (error) {
      setConnectionStatus({ 
        isLoading: false, 
        success: false,
        error 
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Database Connection Test</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Database Connection</CardTitle>
            <CardDescription>
              Verify connectivity to your database
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectionStatus.success !== undefined && (
              <Alert>
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
                    : "Could not connect to the database"}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={runConnectionTest} 
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
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>
              Contact support if you're experiencing issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              If you're having trouble connecting to the database or using the application,
              please contact our support team for assistance.
            </p>
          </CardContent>
          <CardFooter>
            <Button>
              Contact Support
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default DebugPage;