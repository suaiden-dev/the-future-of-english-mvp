-- Migration: Remove all affiliate commission triggers and functions
-- Starting fresh from zero

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_process_affiliate_commission ON payments;

-- Drop the function
DROP FUNCTION IF EXISTS process_affiliate_commission();

