import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Copy } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';

export default function ConfigPage() {
  const [envVars, setEnvVars] = useState({
    url: '',
    key: ''
  });

  useEffect(() => {
    // Get current environment variables
    setEnvVars({
      url: import.meta.env.VITE_SUPABASE_URL || '',
      key: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    });
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const envFileContent = `# Supabase Configuration
VITE_SUPABASE_URL=${envVars.url || 'your_supabase_project_url_here'}
VITE_SUPABASE_ANON_KEY=${envVars.key || 'your_supabase_anon_key_here'}`;

  const isUrlValid = envVars.url && envVars.url !== 'your_supabase_project_url_here' && envVars.url.includes('supabase.co');
  const isKeyValid = envVars.key && envVars.key !== 'your_supabase_anon_key_here' && envVars.key.length > 50;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Supabase Configuration</h1>
          <p className="text-gray-600">Set up your Supabase credentials to enable authentication</p>
        </div>

        <div className="grid gap-6">
          {/* Configuration Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isSupabaseConfigured ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Configuration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {isUrlValid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">Supabase URL: {isUrlValid ? 'Valid' : 'Invalid or Missing'}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {isKeyValid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">Anon Key: {isKeyValid ? 'Valid' : 'Invalid or Missing'}</span>
                </div>
              </div>

              {isSupabaseConfigured ? (
                <Alert className="mt-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Configuration Complete!</AlertTitle>
                  <AlertDescription>
                    Your Supabase is properly configured. Authentication should work.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Configuration Required</AlertTitle>
                  <AlertDescription>
                    Please update your .env.local file with valid Supabase credentials.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Current Environment Variables */}
          <Card>
            <CardHeader>
              <CardTitle>Current Environment Variables</CardTitle>
              <CardDescription>These are the values currently loaded from your .env.local file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="url">VITE_SUPABASE_URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    id="url"
                    value={envVars.url} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(envVars.url)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="key">VITE_SUPABASE_ANON_KEY</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    id="key"
                    value={envVars.key ? `${envVars.key.substring(0, 20)}...` : ''} 
                    readOnly 
                    className="font-mono text-sm"
                    placeholder="Key not loaded"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(envVars.key)}
                    disabled={!envVars.key}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
              <CardDescription>How to get your Supabase credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Go to <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">app.supabase.com</a></li>
                    <li>Sign in and select your project (or create a new one)</li>
                    <li>Go to <strong>Settings → API</strong> in the sidebar</li>
                    <li>Copy the <strong>Project URL</strong> and <strong>anon public</strong> key</li>
                    <li>Update your <code>.env.local</code> file in the project root</li>
                    <li>Restart your development server</li>
                  </ol>
                </div>

                <div className="mt-6">
                  <Label>Sample .env.local file content:</Label>
                  <div className="mt-2 relative">
                    <pre className="bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
                      {envFileContent}
                    </pre>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(envFileContent)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Connection */}
          <Card>
            <CardHeader>
              <CardTitle>Test Connection</CardTitle>
              <CardDescription>Try to connect to your Supabase instance</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => window.location.reload()} 
                disabled={!isSupabaseConfigured}
              >
                Test Configuration & Reload
              </Button>
              {!isSupabaseConfigured && (
                <p className="text-sm text-gray-500 mt-2">
                  Configure your environment variables first
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}