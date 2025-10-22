-- =====================================================
-- COMPLETE TUTORING PLATFORM DATABASE SETUP
-- =====================================================
-- This file contains ALL database setup needed for the tutoring platform
-- Run this in your Supabase SQL editor to set up everything

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
-- Store user profile information
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'tutor')),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- =====================================================
-- CLASSES TABLE
-- =====================================================
-- Store class/course information
CREATE TABLE IF NOT EXISTS classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    tutor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    max_students INTEGER DEFAULT 20,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    subject TEXT,
    level TEXT,
    price_per_hour DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS classes_tutor_id_idx ON classes(tutor_id);
CREATE INDEX IF NOT EXISTS classes_status_idx ON classes(status);

-- =====================================================
-- ENROLLMENTS TABLE
-- =====================================================
-- Track student enrollments in classes
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    grade TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS enrollments_class_id_idx ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS enrollments_student_id_idx ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS enrollments_status_idx ON enrollments(status);

-- =====================================================
-- SCHEDULES TABLE
-- =====================================================
-- Store class schedule information
CREATE TABLE IF NOT EXISTS schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    recurring BOOLEAN DEFAULT true,
    google_meet_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS schedules_class_id_idx ON schedules(class_id);
CREATE INDEX IF NOT EXISTS schedules_day_of_week_idx ON schedules(day_of_week);

-- =====================================================
-- ASSIGNMENTS TABLE
-- =====================================================
-- Store assignment information
CREATE TABLE IF NOT EXISTS assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    max_points INTEGER DEFAULT 100,
    file_url TEXT,
    instructions TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS assignments_class_id_idx ON assignments(class_id);
CREATE INDEX IF NOT EXISTS assignments_due_date_idx ON assignments(due_date);

-- =====================================================
-- SUBMISSIONS TABLE
-- =====================================================
-- Store student assignment submissions
CREATE TABLE IF NOT EXISTS submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    file_url TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    grade INTEGER,
    feedback TEXT,
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS submissions_assignment_id_idx ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS submissions_student_id_idx ON submissions(student_id);

-- =====================================================
-- RESOURCES TABLE
-- =====================================================
-- Store class resources and materials
CREATE TABLE IF NOT EXISTS resources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('pdf', 'video', 'link', 'other')),
    resource_url TEXT NOT NULL,
    file_size BIGINT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS resources_class_id_idx ON resources(class_id);
CREATE INDEX IF NOT EXISTS resources_type_idx ON resources(resource_type);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
-- Store messages between users
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    reply_to UUID REFERENCES messages(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_recipient_id_idx ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS messages_read_idx ON messages(read);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
-- Store system notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('assignment_due', 'new_assignment', 'grade_posted', 'class_reminder', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    related_id UUID, -- Can reference assignment, class, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================
-- Users can view all profiles (for finding tutors/students)
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- CLASSES POLICIES
-- =====================================================
-- Anyone can view active classes
CREATE POLICY "classes_select_policy" ON classes
    FOR SELECT USING (status = 'active' OR tutor_id = auth.uid());

-- Only tutors can create classes
CREATE POLICY "classes_insert_policy" ON classes
    FOR INSERT WITH CHECK (
        auth.uid() = tutor_id AND 
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'tutor')
    );

-- Only tutors can update their own classes
CREATE POLICY "classes_update_policy" ON classes
    FOR UPDATE USING (auth.uid() = tutor_id);

-- Only tutors can delete their own classes
CREATE POLICY "classes_delete_policy" ON classes
    FOR DELETE USING (auth.uid() = tutor_id);

-- =====================================================
-- ENROLLMENTS POLICIES
-- =====================================================
-- Students can view their own enrollments, tutors can view enrollments for their classes
CREATE POLICY "enrollments_select_policy" ON enrollments
    FOR SELECT USING (
        auth.uid() = student_id OR 
        EXISTS (SELECT 1 FROM classes WHERE id = enrollments.class_id AND tutor_id = auth.uid())
    );

-- Students can enroll themselves
CREATE POLICY "enrollments_insert_policy" ON enrollments
    FOR INSERT WITH CHECK (
        auth.uid() = student_id AND 
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'student')
    );

-- Students can update their own enrollments (status changes)
CREATE POLICY "enrollments_update_policy" ON enrollments
    FOR UPDATE USING (
        auth.uid() = student_id OR 
        EXISTS (SELECT 1 FROM classes WHERE id = enrollments.class_id AND tutor_id = auth.uid())
    );

-- =====================================================
-- SCHEDULES POLICIES
-- =====================================================
-- Anyone can view schedules for classes they have access to
CREATE POLICY "schedules_select_policy" ON schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classes 
            WHERE id = schedules.class_id 
            AND (
                status = 'active' OR 
                tutor_id = auth.uid() OR 
                EXISTS (SELECT 1 FROM enrollments WHERE class_id = classes.id AND student_id = auth.uid() AND status = 'active')
            )
        )
    );

-- Only tutors can manage schedules for their classes
CREATE POLICY "schedules_insert_policy" ON schedules
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM classes WHERE id = schedules.class_id AND tutor_id = auth.uid())
    );

CREATE POLICY "schedules_update_policy" ON schedules
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM classes WHERE id = schedules.class_id AND tutor_id = auth.uid())
    );

CREATE POLICY "schedules_delete_policy" ON schedules
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM classes WHERE id = schedules.class_id AND tutor_id = auth.uid())
    );

-- =====================================================
-- ASSIGNMENTS POLICIES
-- =====================================================
-- Students can view assignments for their enrolled classes
CREATE POLICY "assignments_select_policy" ON assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classes 
            WHERE id = assignments.class_id 
            AND (
                tutor_id = auth.uid() OR 
                EXISTS (SELECT 1 FROM enrollments WHERE class_id = classes.id AND student_id = auth.uid() AND status = 'active')
            )
        )
    );

-- Only tutors can create assignments for their classes
CREATE POLICY "assignments_insert_policy" ON assignments
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM classes WHERE id = assignments.class_id AND tutor_id = auth.uid())
    );

CREATE POLICY "assignments_update_policy" ON assignments
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM classes WHERE id = assignments.class_id AND tutor_id = auth.uid())
    );

CREATE POLICY "assignments_delete_policy" ON assignments
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM classes WHERE id = assignments.class_id AND tutor_id = auth.uid())
    );

-- =====================================================
-- SUBMISSIONS POLICIES
-- =====================================================
-- Students can view their own submissions, tutors can view submissions for their assignments
CREATE POLICY "submissions_select_policy" ON submissions
    FOR SELECT USING (
        auth.uid() = student_id OR 
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN classes c ON a.class_id = c.id
            WHERE a.id = submissions.assignment_id AND c.tutor_id = auth.uid()
        )
    );

-- Students can create their own submissions
CREATE POLICY "submissions_insert_policy" ON submissions
    FOR INSERT WITH CHECK (
        auth.uid() = student_id AND 
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN classes c ON a.class_id = c.id
            JOIN enrollments e ON c.id = e.class_id
            WHERE a.id = submissions.assignment_id AND e.student_id = auth.uid() AND e.status = 'active'
        )
    );

-- Students can update their own submissions, tutors can grade them
CREATE POLICY "submissions_update_policy" ON submissions
    FOR UPDATE USING (
        auth.uid() = student_id OR 
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN classes c ON a.class_id = c.id
            WHERE a.id = submissions.assignment_id AND c.tutor_id = auth.uid()
        )
    );

-- =====================================================
-- RESOURCES POLICIES
-- =====================================================
-- Students can view resources for their enrolled classes
CREATE POLICY "resources_select_policy" ON resources
    FOR SELECT USING (
        is_public = true OR
        EXISTS (
            SELECT 1 FROM classes 
            WHERE id = resources.class_id 
            AND (
                tutor_id = auth.uid() OR 
                EXISTS (SELECT 1 FROM enrollments WHERE class_id = classes.id AND student_id = auth.uid() AND status = 'active')
            )
        )
    );

-- Only tutors can manage resources for their classes
CREATE POLICY "resources_insert_policy" ON resources
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM classes WHERE id = resources.class_id AND tutor_id = auth.uid())
    );

CREATE POLICY "resources_update_policy" ON resources
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM classes WHERE id = resources.class_id AND tutor_id = auth.uid())
    );

CREATE POLICY "resources_delete_policy" ON resources
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM classes WHERE id = resources.class_id AND tutor_id = auth.uid())
    );

-- =====================================================
-- MESSAGES POLICIES
-- =====================================================
-- Users can view messages they sent or received
CREATE POLICY "messages_select_policy" ON messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send messages
CREATE POLICY "messages_insert_policy" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they received (mark as read)
CREATE POLICY "messages_update_policy" ON messages
    FOR UPDATE USING (auth.uid() = recipient_id);

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================
-- Users can only see their own notifications
CREATE POLICY "notifications_select_policy" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "notifications_insert_policy" ON notifications
    FOR INSERT WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_policy" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the update_updated_at trigger to all relevant tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
    BEFORE UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at
    BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
    BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create notification when assignment is created
CREATE OR REPLACE FUNCTION notify_assignment_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify all enrolled students about new assignment
    INSERT INTO notifications (user_id, type, title, message, related_id)
    SELECT 
        e.student_id,
        'new_assignment',
        'New Assignment: ' || NEW.title,
        'A new assignment has been posted for ' || c.name,
        NEW.id
    FROM enrollments e
    JOIN classes c ON e.class_id = c.id
    WHERE e.class_id = NEW.class_id AND e.status = 'active';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for assignment notifications
CREATE TRIGGER trigger_notify_assignment_created
    AFTER INSERT ON assignments
    FOR EACH ROW EXECUTE FUNCTION notify_assignment_created();

-- Function to create notification when submission is graded
CREATE OR REPLACE FUNCTION notify_submission_graded()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if grade was added (not on initial submission)
    IF OLD.grade IS NULL AND NEW.grade IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, related_id)
        SELECT 
            NEW.student_id,
            'grade_posted',
            'Assignment Graded: ' || a.title,
            'Your assignment has been graded. Grade: ' || NEW.grade || '/' || a.max_points,
            NEW.assignment_id
        FROM assignments a
        WHERE a.id = NEW.assignment_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for grade notifications
CREATE TRIGGER trigger_notify_submission_graded
    AFTER UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION notify_submission_graded();

-- =====================================================
-- USEFUL VIEWS
-- =====================================================

-- View for class enrollment counts
CREATE OR REPLACE VIEW class_enrollment_stats AS
SELECT 
    c.id,
    c.name,
    c.max_students,
    COUNT(e.id) FILTER (WHERE e.status = 'active') as current_enrollment,
    c.max_students - COUNT(e.id) FILTER (WHERE e.status = 'active') as available_spots
FROM classes c
LEFT JOIN enrollments e ON c.id = e.class_id
GROUP BY c.id, c.name, c.max_students;

-- View for assignment statistics
CREATE OR REPLACE VIEW assignment_stats AS
SELECT 
    a.id,
    a.title,
    a.class_id,
    COUNT(s.id) as total_submissions,
    COUNT(s.id) FILTER (WHERE s.status = 'graded') as graded_submissions,
    AVG(s.grade) FILTER (WHERE s.grade IS NOT NULL) as average_grade
FROM assignments a
LEFT JOIN submissions s ON a.id = s.assignment_id
GROUP BY a.id, a.title, a.class_id;

-- =====================================================
-- SAMPLE DATA (OPTIONAL)
-- =====================================================
-- Uncomment the following to insert sample data for testing

/*
-- Sample profiles (you'll need to replace with real user IDs from auth.users)
INSERT INTO profiles (user_id, full_name, email, role, bio) VALUES
('user-id-1', 'John Smith', 'john@example.com', 'tutor', 'Experienced math tutor with 10 years of teaching experience.'),
('user-id-2', 'Jane Doe', 'jane@example.com', 'student', 'High school student looking to improve in mathematics.'),
('user-id-3', 'Bob Wilson', 'bob@example.com', 'tutor', 'Professional software developer teaching programming.'),
('user-id-4', 'Alice Johnson', 'alice@example.com', 'student', 'College student studying computer science.');

-- Sample classes
INSERT INTO classes (name, description, tutor_id, subject, level, price_per_hour) VALUES
('Algebra Fundamentals', 'Basic algebra concepts for high school students', 'user-id-1', 'Mathematics', 'High School', 25.00),
('Python Programming', 'Learn Python programming from scratch', 'user-id-3', 'Computer Science', 'Beginner', 40.00),
('Advanced Calculus', 'Advanced calculus for college students', 'user-id-1', 'Mathematics', 'College', 35.00);
*/

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'DATABASE SETUP COMPLETE!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Tables created: profiles, classes, enrollments, schedules, assignments, submissions, resources, messages, notifications';
    RAISE NOTICE 'Security policies enabled with Row Level Security';
    RAISE NOTICE 'Triggers set up for automatic timestamps and notifications';
    RAISE NOTICE 'Views created for statistics and reporting';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update your .env.local with your Supabase credentials';
    RAISE NOTICE '2. Test the connection in your application';
    RAISE NOTICE '3. Create your first tutor profile';
    RAISE NOTICE '=================================================';
END $$;