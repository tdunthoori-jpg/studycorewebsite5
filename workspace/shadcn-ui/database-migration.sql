-- Database Migration Script for Functional Class Tabs
-- Run this script in your Supabase SQL editor to update the database schema

-- 1. Add missing columns to existing tables
-- Add columns to classes table
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS level TEXT,
ADD COLUMN IF NOT EXISTS price_per_hour DECIMAL(10,2);

-- Add bio column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Create schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  google_meet_link TEXT,
  recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  grade INTEGER CHECK (grade >= 0 AND grade <= 100),
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES profiles(user_id),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- 5. Create resources table if it doesn't exist (or verify it has correct columns)
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('pdf', 'video', 'link', 'other')),
  resource_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day_of_week ON schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_resources_class_id ON resources(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);

-- 7. Enable Row Level Security on new tables
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for schedules
-- Users can view schedules for classes they're enrolled in or own
CREATE POLICY IF NOT EXISTS "Users can view schedules for their classes"
  ON schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = schedules.class_id 
      AND (
        classes.tutor_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM enrollments 
          WHERE enrollments.class_id = classes.id 
          AND enrollments.student_id = auth.uid() 
          AND enrollments.status = 'active'
        )
      )
    )
  );

-- Tutors can insert/update/delete schedules for their classes
CREATE POLICY IF NOT EXISTS "Tutors can manage schedules for their classes"
  ON schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = schedules.class_id 
      AND classes.tutor_id = auth.uid()
    )
  );

-- 9. Create RLS policies for assignments
-- Users can view assignments for classes they're enrolled in or own
CREATE POLICY IF NOT EXISTS "Users can view assignments for their classes"
  ON assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = assignments.class_id 
      AND (
        classes.tutor_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM enrollments 
          WHERE enrollments.class_id = classes.id 
          AND enrollments.student_id = auth.uid() 
          AND enrollments.status = 'active'
        )
      )
    )
  );

-- Tutors can manage assignments for their classes
CREATE POLICY IF NOT EXISTS "Tutors can manage assignments for their classes"
  ON assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = assignments.class_id 
      AND classes.tutor_id = auth.uid()
    )
  );

-- 10. Create RLS policies for submissions
-- Students can view their own submissions, tutors can view all submissions for their classes
CREATE POLICY IF NOT EXISTS "Students can view their own submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING (
    submissions.student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON a.class_id = c.id
      WHERE a.id = submissions.assignment_id
      AND c.tutor_id = auth.uid()
    )
  );

-- Students can insert/update their own submissions
CREATE POLICY IF NOT EXISTS "Students can manage their own submissions"
  ON submissions FOR INSERT
  TO authenticated
  WITH CHECK (submissions.student_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Students can update their own submissions"
  ON submissions FOR UPDATE
  TO authenticated
  USING (submissions.student_id = auth.uid());

-- Tutors can update submissions (for grading)
CREATE POLICY IF NOT EXISTS "Tutors can grade submissions"
  ON submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON a.class_id = c.id
      WHERE a.id = submissions.assignment_id
      AND c.tutor_id = auth.uid()
    )
  );

-- 11. Create RLS policies for resources
-- Users can view resources for classes they're enrolled in or own
CREATE POLICY IF NOT EXISTS "Users can view resources for their classes"
  ON resources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = resources.class_id 
      AND (
        classes.tutor_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM enrollments 
          WHERE enrollments.class_id = classes.id 
          AND enrollments.student_id = auth.uid() 
          AND enrollments.status = 'active'
        )
      )
    )
  );

-- Tutors can manage resources for their classes
CREATE POLICY IF NOT EXISTS "Tutors can manage resources for their classes"
  ON resources FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = resources.class_id 
      AND classes.tutor_id = auth.uid()
    )
  );

-- 12. Create functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 13. Create triggers for updated_at columns
CREATE TRIGGER IF NOT EXISTS update_schedules_updated_at 
  BEFORE UPDATE ON schedules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_assignments_updated_at 
  BEFORE UPDATE ON assignments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_submissions_updated_at 
  BEFORE UPDATE ON submissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_resources_updated_at 
  BEFORE UPDATE ON resources 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. Insert some sample data for testing (optional)
-- You can uncomment these if you want test data

/*
-- Sample schedule data
INSERT INTO schedules (class_id, start_time, end_time, day_of_week, recurring) 
SELECT 
  c.id, 
  NOW() + INTERVAL '1 day', 
  NOW() + INTERVAL '1 day' + INTERVAL '1 hour', 
  1, 
  true
FROM classes c 
WHERE c.tutor_id = auth.uid()
LIMIT 1
ON CONFLICT DO NOTHING;

-- Sample assignment data
INSERT INTO assignments (class_id, title, description, due_date)
SELECT 
  c.id,
  'Sample Assignment',
  'This is a sample assignment for testing',
  NOW() + INTERVAL '1 week'
FROM classes c 
WHERE c.tutor_id = auth.uid()
LIMIT 1
ON CONFLICT DO NOTHING;

-- Sample resource data
INSERT INTO resources (class_id, title, description, resource_type, resource_url)
SELECT 
  c.id,
  'Sample Resource',
  'This is a sample resource for testing',
  'link',
  'https://example.com'
FROM classes c 
WHERE c.tutor_id = auth.uid()
LIMIT 1
ON CONFLICT DO NOTHING;
*/

-- 15. Verify the migration was successful
SELECT 'Migration completed successfully. The following tables are now available:' as status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('schedules', 'assignments', 'submissions', 'resources', 'classes', 'profiles', 'enrollments')
ORDER BY table_name;