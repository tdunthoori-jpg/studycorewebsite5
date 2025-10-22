-- Test User Creation Script for Supabase
-- This will create a test user with a known password for login testing
-- Only run this in development environments!

-- Create a test user with email/password authentication
-- WARNING: This creates a real user with a known password - for TESTING ONLY

-- First check if the user already exists
DO $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- Check if test user exists
    SELECT EXISTS(
        SELECT 1 FROM auth.users
        WHERE email = 'test@example.com'
    ) INTO user_exists;
    
    IF user_exists THEN
        RAISE NOTICE 'Test user already exists';
    ELSE
        -- Create the test user with a known password
        -- IMPORTANT: We're using a hard-coded password for testing only
        -- For real users, this should never be done
        BEGIN
            -- Insert directly into auth.users
            -- Password is 'password123' (this is insecure - test only!)
            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                recovery_sent_at,
                last_sign_in_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                gen_random_uuid(),
                'authenticated',
                'authenticated',
                'test@example.com',
                crypt('password123', gen_salt('bf')),
                now(),
                null,
                null,
                '{"provider":"email","providers":["email"]}',
                '{"role":"student"}',
                now(),
                now()
            );
            
            RAISE NOTICE 'Test user created successfully';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error creating test user: %', SQLERRM;
        END;
    END IF;
END $$;

-- Verify the test user exists and has a profile
DO $$
DECLARE
    test_user_id UUID;
    has_profile BOOLEAN;
BEGIN
    -- Get the user ID
    SELECT id INTO test_user_id
    FROM auth.users
    WHERE email = 'test@example.com';
    
    -- Check if profile exists
    SELECT EXISTS(
        SELECT 1 FROM public.profiles
        WHERE user_id = test_user_id
    ) INTO has_profile;
    
    -- Report results
    RAISE NOTICE 'Test user verification:';
    RAISE NOTICE '- User exists: %', test_user_id IS NOT NULL;
    RAISE NOTICE '- Has profile: %', has_profile;
    
    -- If no profile exists but user does, create one
    IF test_user_id IS NOT NULL AND NOT has_profile THEN
        INSERT INTO public.profiles (user_id, email, role)
        VALUES (test_user_id, 'test@example.com', 'student');
        
        RAISE NOTICE '- Profile created for test user';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'To test login:';
    RAISE NOTICE 'Email: test@example.com';
    RAISE NOTICE 'Password: password123';
END $$;