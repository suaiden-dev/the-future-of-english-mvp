-- Migration: Fix converted status and pending balance calculation
-- 1. Update get_affiliate_available_balance to also consider 'converted' status
-- 2. Update existing 'converted' records to have available_for_withdrawal_at set
-- 3. Ensure the trigger properly creates 'confirmed' records

-- First, update existing 'converted' records that don't have available_for_withdrawal_at
UPDATE affiliate_referrals
SET available_for_withdrawal_at = created_at + INTERVAL '30 days'
WHERE status = 'converted' 
  AND available_for_withdrawal_at IS NULL
  AND payment_id IS NULL;

-- Update function to get affiliate available balance to also consider 'converted' status
CREATE OR REPLACE FUNCTION get_affiliate_available_balance(p_affiliate_id uuid)
RETURNS TABLE (
  available_balance numeric,
  pending_balance numeric,
  next_withdrawal_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending_withdrawals numeric;
BEGIN
  -- Calculate total amount in pending withdrawal requests
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_withdrawals
  FROM affiliate_withdrawal_requests
  WHERE affiliate_id = p_affiliate_id
    AND status = 'pending';

  RETURN QUERY
  WITH available_commissions AS (
    SELECT 
      COALESCE(SUM(commission_amount - COALESCE(withdrawn_amount, 0)), 0) as available
    FROM affiliate_referrals
    WHERE affiliate_id = p_affiliate_id
      AND status IN ('confirmed', 'converted')  -- Include both confirmed and converted
      AND available_for_withdrawal_at IS NOT NULL
      AND available_for_withdrawal_at <= now()
      AND (commission_amount - COALESCE(withdrawn_amount, 0)) > 0
  ),
  pending_commissions AS (
    SELECT 
      COALESCE(SUM(commission_amount - COALESCE(withdrawn_amount, 0)), 0) as pending,
      MIN(available_for_withdrawal_at) as next_date
    FROM affiliate_referrals
    WHERE affiliate_id = p_affiliate_id
      AND status IN ('confirmed', 'converted')  -- Include both confirmed and converted
      AND available_for_withdrawal_at IS NOT NULL
      AND available_for_withdrawal_at > now()
      AND (commission_amount - COALESCE(withdrawn_amount, 0)) > 0
  )
  SELECT 
    GREATEST(0, COALESCE(ac.available, 0)::numeric - COALESCE(v_pending_withdrawals, 0))::numeric as available_balance,
    COALESCE(pc.pending, 0)::numeric as pending_balance,
    pc.next_date as next_withdrawal_date
  FROM available_commissions ac
  CROSS JOIN pending_commissions pc;
END;
$$;

