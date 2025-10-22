-- =====================================================
-- SIMPLIFIED ADMIN APPROVAL SETUP
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- This avoids direct auth.users manipulation

-- =====================================================
-- 1. UPDATE PROFILES TABLE TO SUPPORT ADMIN APPROVAL
-- =====================================================

-- Add approval fields to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Update the role check constraint to include admin
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('student', 'tutor', 'admin'));

-- Create indexes for better performance on approval queries
CREATE INDEX IF NOT EXISTS profiles_approved_idx ON public.profiles(approved);
CREATE INDEX IF NOT EXISTS profiles_approved_by_idx ON public.profiles(approved_by);

-- =====================================================
-- 2. UPDATE EXISTING USERS TO REQUIRE APPROVAL
-- =====================================================

-- Set all existing non-admin users to require approval
UPDATE public.profiles 
SET approved = FALSE 
WHERE role IN ('student', 'tutor') 
AND (approved IS NULL OR approved IS NOT DISTINCT FROM FALSE);

-- =====================================================
-- 3. UPDATE RLS POLICIES FOR ADMIN ACCESS
-- =====================================================

-- Allow admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles admin_profile 
        WHERE admin_profile.user_id = auth.uid() 
        AND admin_profile.role = 'admin'
    )
);

-- Allow admins to update all profiles (for approval)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles admin_profile 
        WHERE admin_profile.user_id = auth.uid() 
        AND admin_profile.role = 'admin'
    )
);

-- =====================================================
-- 4. CREATE FUNCTIONS FOR ADMIN OPERATIONS
-- =====================================================

-- Function to approve a user
CREATE OR REPLACE FUNCTION public.approve_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    admin_id UUID;
    is_admin BOOLEAN;
BEGIN
    -- Get the current user ID
    admin_id := auth.uid();
    
    -- Check if current user is admin
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE user_id = admin_id AND role = 'admin'
    ) INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only admins can approve users';
    END IF;
    
    -- Approve the user
    UPDATE public.profiles 
    SET 
        approved = TRUE,
        approved_at = NOW(),
        approved_by = admin_id,
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject/unapprove a user
CREATE OR REPLACE FUNCTION public.reject_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    admin_id UUID;
    is_admin BOOLEAN;
BEGIN
    -- Get the current user ID
    admin_id := auth.uid();
    
    -- Check if current user is admin
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE user_id = admin_id AND role = 'admin'
    ) INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only admins can reject users';
    END IF;
    
    -- Reject the user
    UPDATE public.profiles 
    SET 
        approved = FALSE,
        approved_at = NULL,
        approved_by = NULL,
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CREATE VIEWS FOR ADMIN DASHBOARD
-- =====================================================

-- View for pending approvals
CREATE OR REPLACE VIEW public.pending_approvals AS
SELECT 
    p.id,
    p.user_id,
    p.email,
    p.full_name,
    p.role,
    p.bio,
    p.created_at,
    au.email_confirmed_at,
    au.last_sign_in_at
FROM public.profiles p
JOIN auth.users au ON p.user_id = au.id
WHERE p.approved = FALSE AND p.role IN ('student', 'tutor')
ORDER BY p.created_at ASC;

-- View for recently approved users
CREATE OR REPLACE VIEW public.recent_approvals AS
SELECT 
    p.id,
    p.user_id,
    p.email,
    p.full_name,
    p.role,
    p.approved_at,
    admin_p.full_name as approved_by_name
FROM public.profiles p
LEFT JOIN public.profiles admin_p ON p.approved_by = admin_p.user_id
WHERE p.approved = TRUE 
AND p.approved_at > NOW() - INTERVAL '30 days'
ORDER BY p.approved_at DESC;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for admin functions
GRANT EXECUTE ON FUNCTION public.approve_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_user TO authenticated;

-- Grant permissions for admin views
GRANT SELECT ON public.pending_approvals TO authenticated;
GRANT SELECT ON public.recent_approvals TO authenticated;

-- =====================================================
-- 7. VERIFICATION AND SUMMARY
-- =====================================================

-- Show current setup status
DO $$
DECLARE
    unapproved_count INTEGER;
    total_users INTEGER;
BEGIN
    -- Count unapproved users
    SELECT COUNT(*) INTO unapproved_count 
    FROM public.profiles 
    WHERE approved = FALSE AND role IN ('student', 'tutor');
    
    -- Count total users
    SELECT COUNT(*) INTO total_users 
    FROM public.profiles;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== ADMIN APPROVAL SYSTEM SETUP COMPLETE ===';
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Users pending approval: %', unapproved_count;
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: You need to manually create the admin user:';
    RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
    RAISE NOTICE '2. Click "Add user"';
    RAISE NOTICE '3. Email: admin@system.local';
    RAISE NOTICE '4. Password: cCAqGmGLHof4ypEa';
    RAISE NOTICE '5. After creating, run the admin profile creation script';
    RAISE NOTICE '';
    RAISE NOTICE 'Or use the JavaScript method in your frontend to create the admin user';
END $$;