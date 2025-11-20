-- Migration: Fix process_withdrawal_approval function
-- Fix ambiguous column reference error

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
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'finance')
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
      SET withdrawn_amount = v_commission_record.current_withdrawn + v_withdraw_from_commission,
          status = CASE 
            WHEN (commission_amount - (v_commission_record.current_withdrawn + v_withdraw_from_commission)) <= 0 
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

