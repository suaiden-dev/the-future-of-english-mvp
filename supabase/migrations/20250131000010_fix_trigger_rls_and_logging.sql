-- Migration: Fix trigger to ensure it works with RLS and add better error handling
-- The trigger function uses SECURITY DEFINER, so it should bypass RLS, but we need to ensure it works

CREATE OR REPLACE FUNCTION process_affiliate_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_id uuid;
  v_commission_rate numeric := 0.20; -- 20% commission rate
  v_commission_amount numeric;
  v_referral_code text;
BEGIN
  -- Only process if status is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Check if user was referred by an affiliate
    -- Look for the initial referral record (without payment_id)
    SELECT affiliate_id INTO v_affiliate_id
    FROM affiliate_referrals
    WHERE referred_user_id = NEW.user_id
      AND payment_id IS NULL  -- Only get the initial referral record (not commission records)
    ORDER BY created_at ASC  -- Get the FIRST (oldest) referral record
    LIMIT 1;
    
    -- If user has an affiliate, create a new commission record
    IF v_affiliate_id IS NOT NULL THEN
      -- Get referral code from affiliate
      SELECT referral_code INTO v_referral_code
      FROM affiliates
      WHERE id = v_affiliate_id;
      
      v_commission_amount := NEW.amount * v_commission_rate;
      
      -- Insert new referral/commission record
      -- Using SECURITY DEFINER, this should bypass RLS
      BEGIN
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
        ON CONFLICT (payment_id) DO NOTHING; -- Idempotency
        
        -- Log success (if logging is enabled)
        -- RAISE NOTICE 'Commission created: affiliate_id=%, payment_id=%, amount=%', v_affiliate_id, NEW.id, v_commission_amount;
        
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the payment insertion
        -- RAISE WARNING 'Error creating commission: %', SQLERRM;
        -- Re-raise to see the error
        RAISE;
      END;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

