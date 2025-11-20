-- Migration: Fix commission calculation to only count commissions from actual payments
-- The initial referral record (status = 'pending' or 'converted' without payment_id) should not be counted
-- Only commissions created by the trigger (with payment_id and status = 'confirmed') should be counted

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
      AND status = 'confirmed'  -- Only confirmed commissions from payments
      AND payment_id IS NOT NULL  -- Only commissions linked to actual payments
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
      AND status = 'confirmed'  -- Only confirmed commissions from payments
      AND payment_id IS NOT NULL  -- Only commissions linked to actual payments
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

