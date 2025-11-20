-- Migration: Test trigger manually and check logs
-- This will help us understand why the trigger is not creating commissions

-- First, let's check if there are any referral records at all
DO $$
DECLARE
  v_referral_count integer;
  v_payment_count integer;
BEGIN
  SELECT COUNT(*) INTO v_referral_count FROM affiliate_referrals;
  SELECT COUNT(*) INTO v_payment_count FROM payments WHERE status = 'completed';
  
  RAISE NOTICE 'Total referral records: %', v_referral_count;
  RAISE NOTICE 'Total completed payments: %', v_payment_count;
  
  -- Check if there are any initial referral records (without payment_id)
  SELECT COUNT(*) INTO v_referral_count 
  FROM affiliate_referrals 
  WHERE payment_id IS NULL;
  
  RAISE NOTICE 'Initial referral records (without payment_id): %', v_referral_count;
END $$;

-- Enable logging for this session
SET client_min_messages TO NOTICE;

-- Test: Try to manually trigger the function for a recent payment
-- This will help us see the logs
DO $$
DECLARE
  v_test_payment_id uuid;
  v_test_user_id uuid;
  v_affiliate_id uuid;
BEGIN
  -- Get a recent payment that doesn't have a commission
  SELECT p.id, p.user_id INTO v_test_payment_id, v_test_user_id
  FROM payments p
  WHERE p.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM affiliate_referrals ar WHERE ar.payment_id = p.id
    )
  ORDER BY p.created_at DESC
  LIMIT 1;
  
  IF v_test_payment_id IS NULL THEN
    RAISE NOTICE 'No payment found to test';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing with payment_id: %, user_id: %', v_test_payment_id, v_test_user_id;
  
  -- Check if this user has a referral record
  SELECT affiliate_id INTO v_affiliate_id
  FROM affiliate_referrals
  WHERE referred_user_id = v_test_user_id
    AND payment_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_affiliate_id IS NULL THEN
    RAISE NOTICE 'User % does not have an initial referral record (payment_id IS NULL)', v_test_user_id;
    
    -- Try to find any referral record for this user
    SELECT affiliate_id INTO v_affiliate_id
    FROM affiliate_referrals
    WHERE referred_user_id = v_test_user_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_affiliate_id IS NULL THEN
      RAISE NOTICE 'User % does not have ANY referral record', v_test_user_id;
    ELSE
      RAISE NOTICE 'User % has a referral record but it already has a payment_id', v_test_user_id;
    END IF;
  ELSE
    RAISE NOTICE 'User % has an initial referral record with affiliate_id: %', v_test_user_id, v_affiliate_id;
  END IF;
END $$;

