-- Migration: Fix affiliate commission logic for recurring payments
-- 1. Remove unique constraint on referred_user_id to allow multiple commissions per user
-- 2. Add payment_id to affiliate_referrals to track which payment generated the commission
-- 3. Create trigger on payments to automatically generate commissions

-- 1. Remove unique constraint
ALTER TABLE affiliate_referrals 
DROP CONSTRAINT IF EXISTS affiliate_referrals_referred_user_id_key;

-- 2. Add payment_id column
ALTER TABLE affiliate_referrals 
ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES payments(id) ON DELETE SET NULL;

-- Add unique constraint on payment_id to prevent duplicate commissions for the same payment
ALTER TABLE affiliate_referrals 
ADD CONSTRAINT affiliate_referrals_payment_id_key UNIQUE (payment_id);

-- 3. Create function to process affiliate commission
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
    -- We look for the MOST RECENT referral record for this user to find the affiliate
    SELECT affiliate_id INTO v_affiliate_id
    FROM affiliate_referrals
    WHERE referred_user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If user has an affiliate, create a new commission record
    IF v_affiliate_id IS NOT NULL THEN
      v_commission_amount := NEW.amount * v_commission_rate;
      
      -- Insert new referral/commission record
      INSERT INTO affiliate_referrals (
        affiliate_id,
        referred_user_id,
        referral_code, -- We might not have the code here, but we can get it from the affiliate or leave null if not strictly required by DB (it is likely required)
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

-- 4. Create trigger
DROP TRIGGER IF EXISTS trigger_process_affiliate_commission ON payments;
CREATE TRIGGER trigger_process_affiliate_commission
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION process_affiliate_commission();
