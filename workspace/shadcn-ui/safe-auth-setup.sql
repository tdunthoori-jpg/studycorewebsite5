-- Safe Authentication Setup for Supabase
-- Run this script in the Supabase SQL Editor

-- Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('student', 'tutor')) NOT NULL DEFAULT 'student',
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id),
    UNIQUE(email)
);

-- Enable Row Level Security on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles (safe to run multiple times)
DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check and create "Users can view own profile" policy
    SELECT EXISTS(
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "Users can view own profile" ON public.profiles
            FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE 'Created "Users can view own profile" policy';
    ELSE
        RAISE NOTICE '"Users can view own profile" policy already exists';
    END IF;
    
    -- Check and create "Users can update own profile" policy
    SELECT EXISTS(
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "Users can update own profile" ON public.profiles
            FOR UPDATE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created "Users can update own profile" policy';
    ELSE
        RAISE NOTICE '"Users can update own profile" policy already exists';
    END IF;
    
    -- Check and create "Users can insert own profile" policy
    SELECT EXISTS(
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "Users can insert own profile" ON public.profiles
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE 'Created "Users can insert own profile" policy';
    ELSE
        RAISE NOTICE '"Users can insert own profile" policy already exists';
    END IF;
END $$;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- If there's an error (like user already exists), just return NEW
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (safe to run multiple times)
DO $$
DECLARE
    trigger_exists BOOLEAN;
BEGIN
    -- Check if trigger already exists
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
    ) INTO trigger_exists;

    IF NOT trigger_exists THEN
        -- Create new trigger
        BEGIN
            CREATE TRIGGER on_auth_user_created
                AFTER INSERT ON auth.users
                FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
            RAISE NOTICE 'Created on_auth_user_created trigger successfully';
        EXCEPTION
            WHEN insufficient_privilege THEN
                -- If we can't create the trigger on auth.users, that's okay
                -- Profiles can still be created manually
                RAISE NOTICE 'Could not create trigger on auth.users - profiles will need to be created manually';
            WHEN OTHERS THEN
                RAISE NOTICE 'Error creating trigger: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'on_auth_user_created trigger already exists';
    END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create new one
DO $$
BEGIN
    DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
    CREATE TRIGGER handle_profiles_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
END $$;

-- Create indexes for better performance (safe to run multiple times)
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Sync profiles for any users that don't have one
DO $$
DECLARE
    missing_users INTEGER;
    user_count INTEGER;
BEGIN
    -- Count total users
    SELECT COUNT(*) INTO user_count FROM auth.users;
    
    -- Count users without profiles
    SELECT COUNT(*) INTO missing_users
    FROM auth.users u
    WHERE NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
    );
    
    -- Insert profiles for users that don't have one
    INSERT INTO public.profiles (user_id, email, role)
    SELECT id, email, COALESCE((raw_user_meta_data->>'role')::TEXT, 'student')
    FROM auth.users u
    WHERE NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
    );
    
    -- Log results
    RAISE NOTICE '% users were missing profiles. They have been created.', missing_users;
    RAISE NOTICE 'Total users in system: %', user_count;
    RAISE NOTICE 'Authentication setup completed successfully!';
    RAISE NOTICE 'You can now test user registration and login.';
END $$;

-- Check for common authentication issues
DO $$
DECLARE
    service_role_key_exists BOOLEAN;
    anon_key_exists BOOLEAN;
    email_auth_enabled BOOLEAN;
BEGIN
    -- Check if service role key exists
    SELECT EXISTS(
        SELECT 1 FROM pg_roles WHERE rolname = 'service_role'
    ) INTO service_role_key_exists;
    
    -- Check if anon key exists
    SELECT EXISTS(
        SELECT 1 FROM pg_roles WHERE rolname = 'anon'
    ) INTO anon_key_exists;
    
    -- These checks will help diagnose common issues
    RAISE NOTICE 'Authentication Health Check:';
    RAISE NOTICE '- Service role exists: %', service_role_key_exists;
    RAISE NOTICE '- Anon role exists: %', anon_key_exists;
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Make sure to verify these settings in your Supabase dashboard:';
    RAISE NOTICE '1. Email authentication is enabled in Authentication > Providers';
    RAISE NOTICE '2. Proper redirect URLs are set in Authentication > URL Configuration';
    RAISE NOTICE '3. Your frontend application has the correct API keys';
END $$;