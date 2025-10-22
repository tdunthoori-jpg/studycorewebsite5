-- Test classes for development
-- Run this in your Supabase SQL editor to add some demo classes

-- First, let's see if we have any classes already
SELECT COUNT(*) as class_count FROM classes;

-- Insert some demo classes (replace tutor_id with an actual UUID from your profiles table)
-- You can find tutor UUIDs by running: SELECT user_id, full_name, role FROM profiles WHERE role = 'tutor';

-- Example demo classes - UPDATE the tutor_id values with actual UUIDs from your database
INSERT INTO classes (name, description, tutor_id, max_students, status, subject, level, price_per_hour) VALUES
('Introduction to Mathematics', 'Basic mathematics covering algebra, geometry, and basic calculus concepts. Perfect for high school students preparing for college.', 'REPLACE_WITH_ACTUAL_TUTOR_UUID', 20, 'active', 'Mathematics', 'High School', 25.00),
('Python Programming for Beginners', 'Learn the fundamentals of Python programming from scratch. No prior experience required!', 'REPLACE_WITH_ACTUAL_TUTOR_UUID', 15, 'active', 'Computer Science', 'Beginner', 35.00),
('Advanced Chemistry', 'Deep dive into organic and inorganic chemistry for college-level students.', 'REPLACE_WITH_ACTUAL_TUTOR_UUID', 12, 'active', 'Chemistry', 'College/University', 45.00),
('English Literature Analysis', 'Explore classic and modern literature with critical analysis techniques.', 'REPLACE_WITH_ACTUAL_TUTOR_UUID', 18, 'active', 'English', 'High School', 30.00),
('Free Math Tutoring', 'Community math tutoring sessions for elementary students.', 'REPLACE_WITH_ACTUAL_TUTOR_UUID', 25, 'active', 'Mathematics', 'Elementary', 0.00);

-- Check what we inserted
SELECT * FROM classes ORDER BY created_at DESC;