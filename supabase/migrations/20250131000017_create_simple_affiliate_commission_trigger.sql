-- Migration: Create simple affiliate commission trigger from scratch
-- When a payment is completed, create a commission record for the affiliate

CREATE OR REPLACE FUNCTION process_affiliate_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_id uuid;
  v_referral_code text;
BEGIN
  -- Only process completed payments
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    
    -- Find the affiliate_id from the initial referral record (where payment_id IS NULL)
    SELECT affiliate_id, referral_code 
    INTO v_affiliate_id, v_referral_code
    FROM affiliate_referrals
    WHERE referred_user_id = NEW.user_id
      AND payment_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- If affiliate found, create commission record
    IF v_affiliate_id IS NOT NULL THEN
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

-- Create trigger
CREATE TRIGGER trigger_process_affiliate_commission
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION process_affiliate_commission();

