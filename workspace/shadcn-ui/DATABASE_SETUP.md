# Supabase Database Setup Guide

This guide will help you properly set up your Supabase database for use with this application.

## Quick Setup (Recommended)

If you have an existing database and just need to add the functional class tabs features:

1. **Run the migration script**: Copy and paste the contents of `essential-tables.sql` into your Supabase SQL editor and run it. This will add the necessary tables for schedules, assignments, submissions, and resources.

2. **For a complete setup**: Use `database-migration.sql` which includes all tables, indexes, RLS policies, and triggers.

## Manual Setup (Alternative)

If you prefer to create tables manually or need to understand the database structure:

## Available Migration Files

1. **`essential-tables.sql`** - Quick setup with basic RLS policies (recommended for development)
2. **`database-migration.sql`** - Complete setup with proper RLS policies, indexes, and triggers (recommended for production)

## File Descriptions

- Use `essential-tables.sql` if you want to get up and running quickly
- Use `database-migration.sql` if you want a production-ready setup with proper security

## 1. Required Tables

The application requires the following tables to be created in your Supabase project:

### Profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'tutor')),
  email TEXT NOT NULL,
  bio TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Classes
```sql
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  tutor_id UUID REFERENCES profiles(user_id) NOT NULL,
  max_students INTEGER DEFAULT 10,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  subject TEXT,
  level TEXT,
  price_per_hour DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Enrollments
```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) NOT NULL,
  student_id UUID REFERENCES profiles(user_id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'dropped')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Schedules
```sql
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
```

### Assignments
```sql
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
```

### Assignment Submissions
```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) NOT NULL,
  student_id UUID REFERENCES profiles(user_id) NOT NULL,
  content TEXT,
  file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  grade INTEGER,
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES profiles(user_id),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Resources
```sql
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
```

### Messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles(user_id) NOT NULL,
  recipient_id UUID REFERENCES profiles(user_id) NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 2. Row Level Security (RLS)

After creating the tables, you should set up Row Level Security policies to secure your data. You can use the following SQL to create basic policies:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Profiles: users can read all profiles, but only update their own
CREATE POLICY "Users can view all profiles" 
  ON profiles FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- More policy examples are in the complete SQL setup file
```

## 3. Database Functions

Some parts of the application rely on database functions for connectivity checking or other utilities. Run the SQL in `db-functions-setup.sql` to create these functions.

## 4. Test Data

The application includes a test data generator that can create sample data for new users. You don't need to set this up manually, but you can review the implementation in `src/lib/test-data.ts` if you're curious about what data is created.

## 5. Environment Variables

Make sure your `.env.local` file includes the following variables:

```
VITE_SUPABASE_URL=https://your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 6. Troubleshooting

### Common Issues After Migration

1. **"Table not found" errors**: Make sure you ran the migration script successfully and refresh your browser.

2. **Permission denied errors**: Check that RLS policies are correctly applied. You can temporarily disable RLS for testing:
   ```sql
   ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
   ```

3. **Class tabs showing "Page not found"**: This usually means:
   - The database tables don't exist (run the migration script)
   - There's a network connectivity issue
   - The Supabase URL/keys are incorrect

4. **Data not loading**: Check the browser console for specific error messages. Common causes:
   - Missing foreign key relationships
   - Incorrect column names
   - RLS policies too restrictive

### Testing the Database Setup

After running the migration, you can test with these queries:

```sql
-- Check if all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('schedules', 'assignments', 'submissions', 'resources');

-- Test inserting sample data (replace 'your-class-id' with an actual class ID)
INSERT INTO schedules (class_id, start_time, end_time, day_of_week) 
VALUES ('your-class-id', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '1 hour', 1);
```

If you see errors related to missing functions or tables:

1. Check the browser console for specific error messages
2. Run the relevant SQL statements to create the missing objects
3. Make sure your environment variables are correctly set
4. Verify that your Supabase project is active and accessible

For more detailed setup instructions, see the complete setup file: `safe-auth-setup.sql`