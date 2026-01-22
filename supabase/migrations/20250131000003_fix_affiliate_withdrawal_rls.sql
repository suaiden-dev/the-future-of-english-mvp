-- Migration: Fix RLS policies for affiliate_withdrawal_requests
-- Remove access to auth.users table which is not allowed in RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Affiliates can view own withdrawal requests" ON affiliate_withdrawal_requests;
DROP POLICY IF EXISTS "Affiliates can create withdrawal requests" ON affiliate_withdrawal_requests;

-- Recreate policies without accessing auth.users
-- Affiliates can view their own withdrawal requests
CREATE POLICY "Affiliates can view own withdrawal requests"
  ON affiliate_withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.id = affiliate_withdrawal_requests.affiliate_id
      AND a.user_id = auth.uid()
    )
  );

-- Affiliates can create withdrawal requests
CREATE POLICY "Affiliates can create withdrawal requests"
  ON affiliate_withdrawal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.id = affiliate_withdrawal_requests.affiliate_id
      AND a.user_id = auth.uid()
    )
  );

