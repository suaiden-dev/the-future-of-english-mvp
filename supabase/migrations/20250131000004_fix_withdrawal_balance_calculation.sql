-- Migration: Fix withdrawal balance calculation to account for pending requests
-- This ensures that pending withdrawal requests block the available balance

-- Update function to get affiliate available balance
-- This function returns the net available balance (commissions minus pending withdrawals)
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
      AND status = 'confirmed'
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
      AND status = 'confirmed'
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

-- Update create_withdrawal_request to check for pending requests and validate balance
CREATE OR REPLACE FUNCTION create_withdrawal_request(
  p_affiliate_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_payment_details jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available_balance numeric;
  v_request_id uuid;
  v_user_id uuid;
  v_pending_withdrawals numeric;
BEGIN
  -- Get user_id from affiliate
  SELECT user_id INTO v_user_id
  FROM affiliates
  WHERE id = p_affiliate_id;
  
  -- Check if affiliate exists
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Affiliate not found';
  END IF;
  
  -- Check if user is authenticated and matches affiliate
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You can only create withdrawal requests for your own affiliate account';
  END IF;
  
  -- Calculate total amount in pending withdrawal requests
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_withdrawals
  FROM affiliate_withdrawal_requests
  WHERE affiliate_id = p_affiliate_id
    AND status = 'pending';
  
  -- Get available balance (this already excludes pending withdrawals)
  SELECT available_balance INTO v_available_balance
  FROM get_affiliate_available_balance(p_affiliate_id);
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;
  
  -- Check if amount exceeds available balance (which already excludes pending withdrawals)
  IF p_amount > v_available_balance THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %', v_available_balance;
  END IF;
  
  -- Validate payment method
  IF p_payment_method NOT IN ('zelle', 'bank_transfer', 'stripe', 'other') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;
  
  -- Create withdrawal request
  INSERT INTO affiliate_withdrawal_requests (
    affiliate_id,
    amount,
    payment_method,
    payment_details,
    status
  )
  VALUES (
    p_affiliate_id,
    p_amount,
    p_payment_method,
    p_payment_details,
    'pending'
  )
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;

