-- Migration: Simplify trigger to always check affiliates table first
-- Always look for an approved affiliate when a payment is completed

CREATE OR REPLACE FUNCTION process_affiliate_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_id uuid;
  v_referral_code text;
BEGIN
  -- Only process completed payments
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    
    -- Always check affiliates table first
    -- Try to find an affiliate that referred this user (check by user_id match or any approved affiliate)
    -- First, check if user is an affiliate themselves
    SELECT id, referral_code
    INTO v_affiliate_id, v_referral_code
    FROM affiliates
    WHERE user_id = NEW.user_id
      AND status = 'approved'
    LIMIT 1;
    
    -- If user is not an affiliate, get the first approved affiliate
    -- (This assumes all payments should generate commissions for the first affiliate)
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

