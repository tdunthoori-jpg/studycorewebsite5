import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertCircle, Trash } from 'lucide-react';
import { DEBUG } from '@/lib/debug';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/lib/supabase';

/**
 * A component for managing test data settings
 */
export default function TestDataManager() {
  const [isEnabled, setIsEnabled] = useState(DEBUG.ENABLE_TEST_DATA);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Toggle test data creation setting
  const handleToggleTestData = (enabled: boolean) => {
    if (enabled) {
      DEBUG.enable('ENABLE_TEST_DATA');
    } else {
      DEBUG.disable('ENABLE_TEST_DATA');
    }
    setIsEnabled(enabled);
    toast.success(`Test data creation is now ${enabled ? 'enabled' : 'disabled'}`);
  };
  
  // Delete all test data
  const handleDeleteTestData = async () => {
    if (isDeleting) return;
    
    const confirmDelete = window.confirm(
      'Are you sure you want to delete ALL test data? This will remove ALL classes, enrollments, schedules, assignments, and resources!'
    );
    
    if (!confirmDelete) return;
    
    setIsDeleting(true);
    
    try {
      toast.info('Deleting test data...');
      
      // Delete all records from each table in the correct order
      // to respect foreign key constraints
      
      // First delete submissions
      await supabase.from('submissions').delete().neq('id', 'none');
      console.log('Deleted assignment submissions');
      
      // Delete resources
      await supabase.from('resources').delete().neq('id', 'none');
      console.log('Deleted resources');
      
      // Delete assignments
      await supabase.from('assignments').delete().neq('id', 'none');
      console.log('Deleted assignments');
      
      // Delete schedules
      await supabase.from('schedules').delete().neq('id', 'none');
      console.log('Deleted schedules');
      
      // Delete messages
      await supabase.from('messages').delete().neq('id', 'none');
      console.log('Deleted messages');
      
      // Delete enrollments
      await supabase.from('enrollments').delete().neq('id', 'none');
      console.log('Deleted enrollments');
      
      // Delete classes
      await supabase.from('classes').delete().neq('id', 'none');
      console.log('Deleted classes');
      
      toast.success('Successfully deleted all test data');
    } catch (error) {
      console.error('Error deleting test data:', error);
      toast.error('Failed to delete test data');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Data Management</CardTitle>
        <CardDescription>
          Manage automatic test data creation and clear existing test data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>About Test Data</AlertTitle>
          <AlertDescription>
            Test data is automatically created for new users to help demonstrate the application.
            You can disable this feature if you prefer to use only real data.
          </AlertDescription>
        </Alert>
        
        <div className="flex items-center justify-between space-x-2">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="test-data-toggle" className="font-medium">
              Automatic Test Data Creation
            </Label>
            <span className="text-sm text-muted-foreground">
              When enabled, test data will be created for new users
            </span>
          </div>
          <Switch
            id="test-data-toggle"
            checked={isEnabled}
            onCheckedChange={handleToggleTestData}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="destructive" 
          onClick={handleDeleteTestData} 
          disabled={isDeleting}
          className="flex items-center gap-2"
        >
          <Trash className="h-4 w-4" />
          {isDeleting ? 'Deleting...' : 'Delete All Test Data'}
        </Button>
      </CardFooter>
    </Card>
  );
}