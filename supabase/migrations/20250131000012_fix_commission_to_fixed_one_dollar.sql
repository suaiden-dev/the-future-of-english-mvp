-- Migration: Fix commission to be a fixed $1.00 instead of 20% of payment
-- Each payment generates exactly $1.00 commission for the affiliate

CREATE OR REPLACE FUNCTION process_affiliate_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_id uuid;
  v_commission_amount numeric := 1.00; -- Fixed $1.00 commission per payment
  v_referral_code text;
BEGIN
  -- Process if status is completed
  -- On INSERT: OLD.status IS NULL, so we check if NEW.status = 'completed'
  -- On UPDATE: we check if status changed from non-completed to completed
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    
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
          v_commission_amount, -- Fixed $1.00
          now() + INTERVAL '30 days',
          NEW.id,
          now()
        )
        ON CONFLICT (payment_id) DO NOTHING; -- Idempotency: if payment_id already exists, don't insert
        
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the payment insertion
        -- The trigger should not prevent payment insertion if commission creation fails
        RAISE WARNING 'Error creating commission for payment %: %', NEW.id, SQLERRM;
      END;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

