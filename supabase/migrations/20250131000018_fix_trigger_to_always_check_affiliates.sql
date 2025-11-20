-- Migration: Fix trigger to always check affiliates table
-- The trigger should find the affiliate from any referral record for the user,
-- or if none exists, check if the user is an affiliate themselves

CREATE OR REPLACE FUNCTION process_affiliate_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_id uuid;
  v_referral_code text;
BEGIN
  -- Only process completed payments
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    
    -- First, try to find affiliate_id from any existing referral record for this user
    SELECT affiliate_id, referral_code 
    INTO v_affiliate_id, v_referral_code
    FROM affiliate_referrals
    WHERE referred_user_id = NEW.user_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- If no referral record found, check if the user is an affiliate themselves
    -- (in case they registered as an affiliate but no referral record was created)
    IF v_affiliate_id IS NULL THEN
      SELECT id, referral_code
      INTO v_affiliate_id, v_referral_code
      FROM affiliates
      WHERE user_id = NEW.user_id
        AND status = 'approved'
      LIMIT 1;
    END IF;
    
    -- If still no affiliate found, try to find any approved affiliate
    -- This is a fallback - ideally there should be a referral record
    IF v_affiliate_id IS NULL THEN
      SELECT id, referral_code
      INTO v_affiliate_id, v_referral_code
      FROM affiliates
      WHERE status = 'approved'
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
    
    -- If affiliate found, create commission record
    IF v_affiliate_id IS NOT NULL AND v_referral_code IS NOT NULL THEN
      INSERT INTO affiliate_referrals (
        affiliate_id,
        referred_user_id,
        referral_code,
        status,
        commission_amount,
        available_for_withdrawal_at,
        payment_id
      )
      VALUES (
        v_affiliate_id,
        NEW.user_id,
        v_referral_code,
        'confirmed',
        1.00,
        now() + INTERVAL '30 days',
        NEW.id
      )
      ON CONFLICT (payment_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

