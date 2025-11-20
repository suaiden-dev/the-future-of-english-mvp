-- Migration: Fix affiliate commission trigger logic
-- The trigger should find the affiliate_id from the initial referral record (status = 'pending')
-- and create a new commission record with status = 'confirmed' when payment is completed

CREATE OR REPLACE FUNCTION process_affiliate_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_id uuid;
  v_commission_rate numeric := 0.20; -- 20% commission rate
  v_commission_amount numeric;
BEGIN
  -- Only process if status is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Check if user was referred by an affiliate
    -- Look for ANY referral record for this user (pending, converted, or confirmed)
    -- We need to find the affiliate_id from the initial referral registration
    SELECT affiliate_id INTO v_affiliate_id
    FROM affiliate_referrals
    WHERE referred_user_id = NEW.user_id
      AND payment_id IS NULL  -- Only get the initial referral record (not commission records)
    ORDER BY created_at ASC  -- Get the FIRST (oldest) referral record
    LIMIT 1;
    
    -- If user has an affiliate, create a new commission record
    IF v_affiliate_id IS NOT NULL THEN
      v_commission_amount := NEW.amount * v_commission_rate;
      
      -- Insert new referral/commission record
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
      SELECT 
        v_affiliate_id,
        NEW.user_id,
        a.referral_code,
        'confirmed',
        v_commission_amount,
        now() + INTERVAL '30 days',
        NEW.id,
        now()
      FROM affiliates a
      WHERE a.id = v_affiliate_id
      ON CONFLICT (payment_id) DO NOTHING; -- Idempotency
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

