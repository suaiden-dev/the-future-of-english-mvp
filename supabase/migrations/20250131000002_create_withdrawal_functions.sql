-- Migration: Create RPC functions for withdrawal system

-- Function to get affiliate available balance
CREATE OR REPLACE FUNCTION get_affiliate_available_balance(p_affiliate_id uuid)
RETURNS TABLE (
  available_balance numeric,
  pending_balance numeric,
  next_withdrawal_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    COALESCE(ac.available, 0)::numeric as available_balance,
    COALESCE(pc.pending, 0)::numeric as pending_balance,
    pc.next_date as next_withdrawal_date
  FROM available_commissions ac
  CROSS JOIN pending_commissions pc;
END;
$$;

-- Function to create withdrawal request
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
  
  -- Get available balance
  SELECT available_balance INTO v_available_balance
  FROM get_affiliate_available_balance(p_affiliate_id);
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;
  
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

-- Function to get pending withdrawal requests (for admin)
CREATE OR REPLACE FUNCTION get_pending_withdrawal_requests()
RETURNS TABLE (
  id uuid,
  affiliate_id uuid,
  affiliate_name text,
  affiliate_email text,
  amount numeric,
  payment_method text,
  payment_details jsonb,
  status text,
  requested_at timestamptz,
  processed_at timestamptz,
  processed_by uuid,
  processed_by_name text,
  admin_notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'finance')
  ) THEN
    RAISE EXCEPTION 'Access denied. Only admins can view withdrawal requests.';
  END IF;
  
  RETURN QUERY
  SELECT 
    awr.id,
    awr.affiliate_id,
    a.name as affiliate_name,
    a.email as affiliate_email,
    awr.amount,
    awr.payment_method,
    awr.payment_details,
    awr.status,
    awr.requested_at,
    awr.processed_at,
    awr.processed_by,
    p.name as processed_by_name,
    awr.admin_notes
  FROM affiliate_withdrawal_requests awr
  JOIN affiliates a ON a.id = awr.affiliate_id
  LEFT JOIN profiles p ON p.id = awr.processed_by
  ORDER BY awr.requested_at DESC;
END;
$$;

-- Function to process withdrawal approval (mark commissions as withdrawn)
CREATE OR REPLACE FUNCTION process_withdrawal_approval(
  p_withdrawal_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affiliate_id uuid;
  v_amount numeric;
  v_remaining_amount numeric;
  v_commission_record RECORD;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'finance')
  ) THEN
    RAISE EXCEPTION 'Access denied. Only admins can process withdrawals.';
  END IF;
  
  -- Get withdrawal request details
  SELECT affiliate_id, amount INTO v_affiliate_id, v_amount
  FROM affiliate_withdrawal_requests
  WHERE id = p_withdrawal_id
    AND status = 'approved';
  
  IF v_affiliate_id IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found or not approved';
  END IF;
  
  v_remaining_amount := v_amount;
  
  -- Process commissions in FIFO order (oldest first)
  FOR v_commission_record IN
    SELECT 
      id,
      commission_amount,
      COALESCE(withdrawn_amount, 0) as current_withdrawn
    FROM affiliate_referrals
    WHERE affiliate_id = v_affiliate_id
      AND status = 'confirmed'
      AND available_for_withdrawal_at IS NOT NULL
      AND available_for_withdrawal_at <= now()
      AND (commission_amount - COALESCE(withdrawn_amount, 0)) > 0
    ORDER BY created_at ASC
  LOOP
    DECLARE
      v_available_in_commission numeric;
      v_withdraw_from_commission numeric;
    BEGIN
      -- Calculate available amount in this commission
      v_available_in_commission := v_commission_record.commission_amount - v_commission_record.current_withdrawn;
      
      -- Calculate how much to withdraw from this commission
      v_withdraw_from_commission := LEAST(v_remaining_amount, v_available_in_commission);
      
      -- Update withdrawn_amount
      UPDATE affiliate_referrals
      SET withdrawn_amount = current_withdrawn + v_withdraw_from_commission,
          status = CASE 
            WHEN (commission_amount - (current_withdrawn + v_withdraw_from_commission)) <= 0 
            THEN 'withdrawn' 
            ELSE 'confirmed' 
          END
      WHERE id = v_commission_record.id;
      
      -- Reduce remaining amount
      v_remaining_amount := v_remaining_amount - v_withdraw_from_commission;
      
      -- If we've withdrawn all we need, exit loop
      EXIT WHEN v_remaining_amount <= 0;
    END;
  END LOOP;
  
  -- If there's still remaining amount, something went wrong
  IF v_remaining_amount > 0 THEN
    RAISE EXCEPTION 'Insufficient available balance to process withdrawal';
  END IF;
END;
$$;

-- Add comments
COMMENT ON FUNCTION get_affiliate_available_balance(uuid) IS 'Calculates available and pending balance for an affiliate';
COMMENT ON FUNCTION create_withdrawal_request(uuid, numeric, text, jsonb) IS 'Creates a new withdrawal request for an affiliate';
COMMENT ON FUNCTION get_pending_withdrawal_requests() IS 'Gets all withdrawal requests (admin only)';
COMMENT ON FUNCTION process_withdrawal_approval(uuid) IS 'Processes withdrawal approval by marking commissions as withdrawn (FIFO)';

