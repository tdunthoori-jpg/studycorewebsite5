import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase, ClassResource, Class } from '@/lib/supabase';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/sonner';
import { 
  FolderIcon, 
  PlusIcon, 
  EditIcon, 
  TrashIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  ImageIcon,
  VideoIcon,
  MusicIcon,
  ArchiveIcon,
  FileIcon,
  LinkIcon,
  CalendarIcon
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const resourceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional().or(z.literal('')),
  resource_type: z.enum(['pdf', 'video', 'link', 'other']),
  resource_url: z.string().url('Invalid URL').min(1, 'URL is required'),
});

type ResourceFormValues = z.infer<typeof resourceSchema>;

interface ClassResourcesProps {
  classData: Class;
  resources: ClassResource[];
  onResourcesUpdate: (resources: ClassResource[]) => void;
  isOwner: boolean;
}

const resourceTypeIcons = {
  pdf: FileTextIcon,
  video: VideoIcon,
  link: LinkIcon,
  other: ArchiveIcon,
};

const resourceTypeColors = {
  pdf: 'bg-green-100 text-green-800',
  video: 'bg-red-100 text-red-800',
  link: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function ClassResources({ 
  classData, 
  resources, 
  onResourcesUpdate, 
  isOwner 
}: ClassResourcesProps) {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ClassResource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const resourceForm = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: '',
      description: '',
      resource_type: 'pdf',
      resource_url: '',
    },
  });

  useEffect(() => {
    if (editingResource) {
      resourceForm.reset({
        title: editingResource.title,
        description: editingResource.description || '',
        resource_type: editingResource.resource_type as any,
        resource_url: editingResource.resource_url,
      });
    }
  }, [editingResource, resourceForm]);

  const createResource = async (values: ResourceFormValues) => {
    if (!user || !isOwner) return;

    const resourceData = {
      class_id: classData.id,
      title: values.title,
      description: values.description || null,
      resource_type: values.resource_type,
      resource_url: values.resource_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (editingResource) {
      // Update existing resource
      const { data, error } = await supabase
        .from('resources')
        .update(resourceData)
        .eq('id', editingResource.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating resource:', error);
        toast.error('Failed to update resource: ' + error.message);
        return;
      }

      const updatedResources = resources.map(r => r.id === editingResource.id ? data : r);
      onResourcesUpdate(updatedResources);
      toast.success('Resource updated successfully!');
    } else {
      // Create new resource
      const { data, error } = await supabase
        .from('resources')
        .insert(resourceData)
        .select()
        .single();

      if (error) {
        console.error('Error creating resource:', error);
        toast.error('Failed to create resource: ' + error.message);
        return;
      }

      onResourcesUpdate([...resources, data]);
      toast.success('Resource created successfully!');
    }

    setIsCreateDialogOpen(false);
    setEditingResource(null);
    resourceForm.reset();
  };

  const deleteResource = async (resourceId: string) => {
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId);

    if (error) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource: ' + error.message);
      return;
    }

    const updatedResources = resources.filter(r => r.id !== resourceId);
    onResourcesUpdate(updatedResources);
    toast.success('Resource deleted successfully');
  };

  const onResourceSubmit = async (values: ResourceFormValues) => {
    setIsSubmitting(true);
    try {
      await createResource(values);
    } catch (error) {
      console.error('Exception creating/updating resource:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (resource: ClassResource) => {
    setEditingResource(resource);
    setIsCreateDialogOpen(true);
  };

  const closeDialogs = () => {
    setIsCreateDialogOpen(false);
    setEditingResource(null);
    resourceForm.reset();
  };

  const openResource = (resource: ClassResource) => {
    window.open(resource.resource_url, '_blank', 'noopener,noreferrer');
  };

  // Get unique categories for filtering - Remove since not supported
  const categories = ['all'];

  // Filter resources by category - Simplified since no category field
  const filteredResources = resources;

  // Sort resources by creation date (newest first)
  const sortedResources = [...filteredResources].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderIcon className="h-5 w-5" />
              Class Resources
            </CardTitle>
            <CardDescription>
              {isOwner 
                ? 'Share files, links, and materials with your students'
                : 'Access class materials and resources shared by your instructor'
              }
            </CardDescription>
          </div>
          
          {isOwner && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingResource(null)}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingResource ? 'Edit Resource' : 'Add New Resource'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingResource 
                      ? 'Update the resource details'
                      : 'Share a file, link, or material with your students'
                    }
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...resourceForm}>
                  <form onSubmit={resourceForm.handleSubmit(onResourceSubmit)} className="space-y-4">
                    <FormField
                      control={resourceForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resource Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Chapter 5 Worksheet" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={resourceForm.control}
                        name="resource_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Resource Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pdf">PDF Document</SelectItem>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="link">Website Link</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={resourceForm.control}
                      name="resource_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resource URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/resource.pdf" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Link to the file or resource (Google Drive, Dropbox, website, etc.)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={resourceForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe what this resource contains or how to use it..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeDialogs}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting 
                          ? (editingResource ? 'Updating...' : 'Adding...') 
                          : (editingResource ? 'Update Resource' : 'Add Resource')
                        }
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredResources.length > 0 ? (
          <ScrollArea className="h-[600px]">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedResources.map((resource) => {
                const IconComponent = resourceTypeIcons[resource.resource_type as keyof typeof resourceTypeIcons] || FileIcon;
                const typeColor = resourceTypeColors[resource.resource_type as keyof typeof resourceTypeColors] || resourceTypeColors.other;
                const createdDate = parseISO(resource.created_at);
                
                return (
                  <Card key={resource.id} className="border border-muted hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-5 w-5 text-muted-foreground" />
                            <Badge className={typeColor}>
                              {resource.resource_type}
                            </Badge>
                          </div>
                          
                          {isOwner && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(resource)}
                                className="h-8 w-8 p-0"
                              >
                                <EditIcon className="h-4 w-4" />
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Resource</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{resource.title}"? 
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteResource(resource.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete Resource
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-1 line-clamp-2">
                            {resource.title}
                          </h4>
                          {resource.description && (
                            <p className="text-xs text-muted-foreground line-clamp-3">
                              {resource.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{format(createdDate, 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResource(resource)}
                          className="w-full"
                        >
                          <ExternalLinkIcon className="h-4 w-4 mr-2" />
                          Open Resource
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <FolderIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Resources</h3>
            <p className="text-muted-foreground mb-4">
              {isOwner 
                ? "Add resources to share files, links, and materials with your students."
                : "The instructor hasn't shared any resources yet."
              }
            </p>
            {isOwner && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add First Resource
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}