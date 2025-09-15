-- Migration to change lush-admin role to finance role
-- This migration updates the user_role enum and migrates existing data

-- Step 1: Add 'finance' as a new enum value to the existing enum
ALTER TYPE user_role ADD VALUE 'finance';

-- Step 2: Update existing users with lush-admin role to finance role
UPDATE profiles 
SET role = 'finance' 
WHERE role = 'lush-admin';

-- Step 3: Create a new enum without 'lush-admin' and replace the old one
CREATE TYPE user_role_new AS ENUM ('user', 'admin', 'authenticator', 'finance');

-- Step 4: Update the profiles table to use the new enum
ALTER TABLE profiles 
ALTER COLUMN role TYPE user_role_new USING role::text::user_role_new;

-- Step 5: Drop the old enum and rename the new one
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- Create a new function for finance role checking (replacing is_lush_admin)
CREATE OR REPLACE FUNCTION is_finance(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = COALESCE(user_id, auth.uid()) 
    AND role = 'finance'
  );
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_finance(UUID) TO authenticated;

-- Update any RLS policies that referenced lush-admin role (if any exist)
-- Note: Based on the codebase analysis, there don't appear to be specific RLS policies for lush-admin
-- but this serves as a placeholder for any future policies that might need updating

-- Add comment for documentation
COMMENT ON FUNCTION is_finance(UUID) IS 'Check if a user has the finance role. Replaces the old is_lush_admin function.';

-- Drop the old is_lush_admin function if it exists
DROP FUNCTION IF EXISTS is_lush_admin(UUID);
