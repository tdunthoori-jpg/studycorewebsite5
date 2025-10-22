# Setting Up Authentication Policies in Supabase

This document explains how to run the SQL script to set up proper authentication and profile creation policies in your Supabase project.

## Step 1: Access the Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query" to create a new SQL script

## Step 2: Run the SQL Script

1. Open the file `sql/setup-auth-policies.sql` in this project
2. Copy the entire contents of that file
3. Paste the SQL into the Supabase SQL Editor
4. Click "Run" to execute the script

## Step 3: Verify the Setup

After running the script, verify that the following has been created:

1. A function called `create_basic_profile`
2. A function called `handle_new_user`
3. A trigger called `on_auth_user_created` on the `auth.users` table
4. Row Level Security (RLS) policies on the `profiles` table

## What This Script Does

1. **Creates Functions**:
   - `create_basic_profile`: A secure function that can create user profiles with proper permissions
   - `handle_new_user`: A trigger function that creates profiles automatically when users sign up
   - `update_timestamp`: Updates the `updated_at` field whenever a profile is modified

2. **Sets Up Triggers**:
   - Automatically creates profiles when new users sign up

3. **Configures RLS Policies**:
   - Users can view their own profile
   - Users can update their own profile
   - Users can insert their own profile
   - Authenticated users can view other profiles (for displaying tutor information)

4. **Sets Up Schema**:
   - Ensures required fields are not null
   - Sets default values for timestamps

## Troubleshooting

If you encounter errors running the script:

1. Make sure the `profiles` table exists with the correct schema
2. Check for existing policies that might conflict with the new ones
3. Verify that you have admin privileges in your Supabase project
4. If specific errors occur, check the Supabase logs for details

## Manual Testing

After setting up, you can test if the trigger is working:

1. Create a new user through the Supabase Authentication UI
2. Check if a profile is automatically created in the `profiles` table