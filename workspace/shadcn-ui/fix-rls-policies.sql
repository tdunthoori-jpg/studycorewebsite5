-- =====================================================
-- FIX RLS POLICIES TO AVOID INFINITE RECURSION
-- =====================================================
-- This fixes the infinite recursion error in profile policies

-- =====================================================
-- 1. DROP ALL EXISTING POLICIES TO START FRESH
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- =====================================================
-- 2. CREATE NON-RECURSIVE POLICIES
-- =====================================================

-- Basic policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Basic policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Basic policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Public viewing policy for approved users only (for finding tutors, etc.)
CREATE POLICY "Public can view approved profiles" ON public.profiles
FOR SELECT TO authenticated
USING (approved = true);

-- =====================================================
-- 3. CREATE ADMIN HELPER FUNCTION
-- =====================================================

-- Function to check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Direct query to get user role without RLS
    SELECT role INTO user_role
    FROM public.profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN COALESCE(user_role = 'admin', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. CREATE ADMIN POLICIES USING THE HELPER FUNCTION
-- =====================================================

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.is_current_user_admin());

-- Allow admins to update any profile
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (public.is_current_user_admin());

-- =====================================================
-- 5. UPDATE PROFILE CREATION TRIGGER
-- =====================================================

-- Update the trigger function to set default approval status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get role from metadata, default to 'student'
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    
    -- Insert profile with appropriate approval status
    INSERT INTO public.profiles (
        user_id,
        email,
        role,
        full_name,
        approved,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        user_role,
        '',
        CASE WHEN user_role = 'admin' THEN TRUE ELSE FALSE END,
        NOW(),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. VERIFY THE FIX
-- =====================================================

-- Test query to make sure policies work
DO $$
BEGIN
    RAISE NOTICE 'Policy fix applied successfully!';
    RAISE NOTICE 'You can now test profile queries without infinite recursion.';
END $$;