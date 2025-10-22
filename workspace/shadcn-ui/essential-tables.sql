-- Essential Database Tables for Functional Class Tabs
-- Run this script in your Supabase SQL editor for minimal setup

-- 1. Add essential columns to classes table
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS level TEXT,
ADD COLUMN IF NOT EXISTS price_per_hour DECIMAL(10,2);

-- 2. Create schedules table
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

-- 3. Create assignments table
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

-- 4. Create submissions table
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
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create resources table (if it doesn't exist)
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

-- 6. Enable RLS (if not already enabled)
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- 7. Basic RLS policies - Allow authenticated users to access data
-- (You can make these more restrictive later)

-- Schedules
DROP POLICY IF EXISTS "Allow authenticated users full access to schedules" ON schedules;
CREATE POLICY "Allow authenticated users full access to schedules"
  ON schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Assignments  
DROP POLICY IF EXISTS "Allow authenticated users full access to assignments" ON assignments;
CREATE POLICY "Allow authenticated users full access to assignments"
  ON assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Submissions
DROP POLICY IF EXISTS "Allow authenticated users full access to submissions" ON submissions;
CREATE POLICY "Allow authenticated users full access to submissions"
  ON submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Resources
DROP POLICY IF EXISTS "Allow authenticated users full access to resources" ON resources;
CREATE POLICY "Allow authenticated users full access to resources"
  ON resources FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Verification query
SELECT 'Essential tables created successfully!' as message;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('schedules', 'assignments', 'submissions', 'resources');