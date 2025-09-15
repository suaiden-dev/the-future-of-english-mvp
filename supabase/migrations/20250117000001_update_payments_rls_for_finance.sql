-- Migration: Update payments table RLS policies to include finance role
-- This migration updates the existing RLS policies to include the finance role

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can read all payments" ON payments;
DROP POLICY IF EXISTS "Only admins can manage payments" ON payments;

-- Create updated policies that include both admin and finance roles
CREATE POLICY "Admins and finance can read all payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'finance')
    )
  );

-- Create policy for users to read their own payments
CREATE POLICY "Users can read own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create policy for admins and finance to manage payments
CREATE POLICY "Admins and finance can manage payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'finance')
    )
  );

-- Add comment for documentation
COMMENT ON POLICY "Admins and finance can read all payments" ON payments IS 'Allows admin and finance users to read all payment records';
COMMENT ON POLICY "Users can read own payments" ON payments IS 'Allows users to read their own payment records';
COMMENT ON POLICY "Admins and finance can manage payments" ON payments IS 'Allows admin and finance users to insert, update, and delete payment records';




