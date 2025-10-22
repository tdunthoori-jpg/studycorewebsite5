-- =====================================================
-- ADMIN PROFILE CREATION
-- =====================================================
-- Run this AFTER you've manually created the admin user in Supabase Dashboard
-- Replace 'ADMIN_USER_ID_HERE' with the actual UUID of the admin user

-- =====================================================
-- CREATE ADMIN PROFILE
-- =====================================================
-- Replace the UUID below with the actual admin user ID from Supabase Dashboard
INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    role,
    approved,
    approved_at,
    created_at,
    updated_at
) VALUES (
    '50e506db-bab5-493b-998c-5d4dead1aad4', -- Replace this with actual admin user UUID
    'admin@system.local',
    'System Administrator',
    'admin',
    TRUE,
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    approved = TRUE,
    approved_at = NOW(),
    updated_at = NOW();

-- Verify admin profile was created
SELECT 
    user_id,
    email,
    full_name,
    role,
    approved
FROM public.profiles 
WHERE role = 'admin';

RAISE NOTICE 'Admin profile created successfully!';