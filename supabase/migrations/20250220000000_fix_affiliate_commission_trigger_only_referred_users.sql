-- Migration: Fix affiliate commission trigger to only create commissions for users who were actually referred
-- The trigger should only create commissions when there's an initial referral record (payment_id IS NULL)
-- This prevents commissions from being created for users who didn't register with an affiliate code

-- 1. Fix the trigger function to only look for initial referral records
CREATE OR REPLACE FUNCTION process_affiliate_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_id uuid;
  v_referral_code text;
  v_commission_amount numeric := 1.00; -- Fixed $1.00 commission per payment
BEGIN
  -- Only process if status is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Check if user was referred by an affiliate
    -- IMPORTANT: Only look for the INITIAL referral record (where payment_id IS NULL)
    -- This is the record created when the user registers with an affiliate code
    SELECT affiliate_id, referral_code 
    INTO v_affiliate_id, v_referral_code
    FROM affiliate_referrals
    WHERE referred_user_id = NEW.user_id
      AND payment_id IS NULL  -- Only get the initial referral record (not commission records)
    ORDER BY created_at ASC  -- Get the FIRST (oldest) referral record
    LIMIT 1;
    
    -- Only create commission if user was actually referred (has initial referral record)
    IF v_affiliate_id IS NOT NULL THEN
      -- Insert new commission record
      INSERT INTO affiliate_referrals (
        affiliate_id,
        referred_user_id,
        referral_code,
        status,
        commission_amount,
        available_for_withdrawal_at,
        payment_id,
        created_at
      )
      VALUES (
        v_affiliate_id,
        NEW.user_id,
        v_referral_code,
        'confirmed',
        v_commission_amount,
        now() + INTERVAL '30 days',
        NEW.id,
        now()
      )
      ON CONFLICT (payment_id) DO NOTHING; -- Idempotency: prevent duplicate commissions for same payment
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing function if it exists (to allow changing return type)
DROP FUNCTION IF EXISTS register_affiliate_referral(uuid, text);

-- 3. Create or replace the function to register affiliate referrals
-- This function is called when a user registers with an affiliate code
CREATE OR REPLACE FUNCTION register_affiliate_referral(
  p_referred_user_id uuid,
  p_referral_code text
)
RETURNS TABLE (
  id uuid,
  affiliate_id uuid,
  referral_code text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affiliate_id uuid;
  v_referral_record affiliate_referrals%ROWTYPE;
BEGIN
  -- Find the affiliate by referral code
  SELECT id INTO v_affiliate_id
  FROM affiliates
  WHERE referral_code = p_referral_code
    AND status = 'approved'
  LIMIT 1;
  
  -- If affiliate not found, raise exception
  IF v_affiliate_id IS NULL THEN
    RAISE EXCEPTION 'Invalid referral code: %', p_referral_code;
  END IF;
  
  -- Check if referral already exists (prevent duplicates)
  SELECT * INTO v_referral_record
  FROM affiliate_referrals
  WHERE referred_user_id = p_referred_user_id
    AND affiliate_id = v_affiliate_id
    AND payment_id IS NULL  -- Only check initial referral records
  LIMIT 1;
  
  -- If referral already exists, return it
  IF v_referral_record.id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      v_referral_record.id,
      v_referral_record.affiliate_id,
      v_referral_record.referral_code,
      v_referral_record.status;
    RETURN;
  END IF;
  
  -- Create new referral record (initial record, without payment_id)
  RETURN QUERY
  INSERT INTO affiliate_referrals (
    affiliate_id,
    referred_user_id,
    referral_code,
    status,
    commission_amount,
    created_at
  )
  VALUES (
    v_affiliate_id,
    p_referred_user_id,
    p_referral_code,
    'pending',  -- Initial status when user registers
    0,  -- No commission yet, will be created when payment is completed
    now()
  )
  RETURNING 
    affiliate_referrals.id,
    affiliate_referrals.affiliate_id,
    affiliate_referrals.referral_code,
    affiliate_referrals.status;
END;
$$;

-- Add comments
COMMENT ON FUNCTION process_affiliate_commission() IS 'Trigger function that creates affiliate commissions only for users who were actually referred (have initial referral record with payment_id IS NULL)';
COMMENT ON FUNCTION register_affiliate_referral(uuid, text) IS 'Registers a user referral when they sign up with an affiliate code. Creates the initial referral record (payment_id IS NULL)';

