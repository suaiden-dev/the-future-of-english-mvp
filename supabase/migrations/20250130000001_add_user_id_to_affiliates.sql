-- Migration: Add user_id to affiliates table
-- This allows associating affiliate accounts with user accounts

-- Add user_id column to affiliates table
ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);

-- Update RLS policy to allow users to read their own affiliate registration by user_id
DROP POLICY IF EXISTS "Users can read own affiliate registration" ON affiliates;

CREATE POLICY "Users can read own affiliate registration"
  ON affiliates
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Add comment
COMMENT ON COLUMN affiliates.user_id IS 'Reference to the user account associated with this affiliate';

