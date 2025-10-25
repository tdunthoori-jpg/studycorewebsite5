import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { Pencil, Award, DollarSign, TrendingUp } from 'lucide-react';
import { getTutorLevelInfo, formatCurrency, formatHours, TUTOR_LEVELS } from '@/lib/tutor-levels';

interface TutorProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  tutor_level: number;
  hourly_rate: number;
  completed_classes: number;
  total_hours_taught: number;
  created_at: string;
}

export function TutorManagement() {
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTutor, setEditingTutor] = useState<TutorProfile | null>(null);
  const [editLevel, setEditLevel] = useState<number>(1);
  const [editRate, setEditRate] = useState<string>('18.00');
  const [editCompletedClasses, setEditCompletedClasses] = useState<string>('0');
  const [editTotalHours, setEditTotalHours] = useState<string>('0.0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTutors();
  }, []);

  const loadTutors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'tutor')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTutors(data || []);
    } catch (error) {
      console.error('Error loading tutors:', error);
      toast.error('Failed to load tutor data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (tutor: TutorProfile) => {
    setEditingTutor(tutor);
    setEditLevel(tutor.tutor_level || 1);
    setEditRate(tutor.hourly_rate?.toFixed(2) || '18.00');
    setEditCompletedClasses((tutor.completed_classes || 0).toString());
    setEditTotalHours((tutor.total_hours_taught || 0).toFixed(1));
  };

  const handleSaveChanges = async () => {
    if (!editingTutor) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          tutor_level: editLevel,
          hourly_rate: parseFloat(editRate),
          completed_classes: parseInt(editCompletedClasses),
          total_hours_taught: parseFloat(editTotalHours),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTutor.id);

      if (error) throw error;

      toast.success('Tutor information updated successfully!');
      setEditingTutor(null);
      loadTutors();
    } catch (error) {
      console.error('Error updating tutor:', error);
      toast.error('Failed to update tutor information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tutor Level Management</CardTitle>
        <CardDescription>
          View and manage tutor levels and pay rates
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tutors.length === 0 ? (
          <div className="text-center py-8">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Tutors Found</h3>
            <p className="text-muted-foreground">No tutors are registered yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tutors.map((tutor) => {
              const levelInfo = getTutorLevelInfo(tutor.tutor_level || 1);

              return (
                <div key={tutor.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-lg">{tutor.full_name}</h4>
                        <Badge
                          className={`bg-gradient-to-r ${levelInfo.color} text-white border-0`}
                        >
                          <span className="mr-1">{levelInfo.icon}</span>
                          Level {tutor.tutor_level || 1}: {levelInfo.name}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">{tutor.email}</p>

                      <div className="grid grid-cols-3 gap-4 pt-2">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Hourly Rate</p>
                            <p className="text-sm font-semibold">
                              {formatCurrency(tutor.hourly_rate || 18.00)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Completed Classes</p>
                            <p className="text-sm font-semibold">
                              {tutor.completed_classes || 0}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Total Hours</p>
                            <p className="text-sm font-semibold">
                              {formatHours(tutor.total_hours_taught || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(tutor)}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Tutor Information</DialogTitle>
                          <DialogDescription>
                            Adjust {tutor.full_name}'s level, pay, and statistics
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="level">Tutor Level</Label>
                            <Select
                              value={editLevel.toString()}
                              onValueChange={(value) => {
                                const level = parseInt(value);
                                setEditLevel(level);
                                // Optionally auto-set the default rate for this level
                                const levelInfo = getTutorLevelInfo(level);
                                setEditRate(levelInfo.defaultHourlyRate.toFixed(2));
                              }}
                            >
                              <SelectTrigger id="level">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TUTOR_LEVELS.map((level) => (
                                  <SelectItem
                                    key={level.level}
                                    value={level.level.toString()}
                                  >
                                    <span className="flex items-center gap-2">
                                      <span>{level.icon}</span>
                                      <span>Level {level.level}: {level.name}</span>
                                      <span className="text-muted-foreground text-xs">
                                        ({formatCurrency(level.defaultHourlyRate)} default)
                                      </span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="rate">Hourly Rate ($)</Label>
                            <Input
                              id="rate"
                              type="number"
                              step="0.50"
                              min="0"
                              value={editRate}
                              onChange={(e) => setEditRate(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Default for Level {editLevel}: {formatCurrency(getTutorLevelInfo(editLevel).defaultHourlyRate)}
                            </p>
                          </div>

                          <div className="pt-2 border-t space-y-4">
                            <p className="text-sm font-semibold text-muted-foreground">
                              Teaching Statistics
                            </p>

                            <div className="space-y-2">
                              <Label htmlFor="completed_classes">Completed Classes</Label>
                              <Input
                                id="completed_classes"
                                type="number"
                                min="0"
                                step="1"
                                value={editCompletedClasses}
                                onChange={(e) => setEditCompletedClasses(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">
                                Number of classes this tutor has completed
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="total_hours">Total Hours Taught</Label>
                              <Input
                                id="total_hours"
                                type="number"
                                min="0"
                                step="0.5"
                                value={editTotalHours}
                                onChange={(e) => setEditTotalHours(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">
                                Total hours of instruction delivered
                              </p>
                            </div>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setEditingTutor(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveChanges}
                            disabled={saving}
                          >
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
