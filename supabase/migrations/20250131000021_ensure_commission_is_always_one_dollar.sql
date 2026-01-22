-- Migration: Ensure commission_amount is always $1.00 and prevent updates
-- Add a check constraint to ensure commission_amount is always exactly 1.00

-- First, update any existing records that don't have 1.00
UPDATE affiliate_referrals
SET commission_amount = 1.00
WHERE payment_id IS NOT NULL
  AND commission_amount != 1.00;

-- Add check constraint to ensure commission_amount is always 1.00 for commission records
ALTER TABLE affiliate_referrals
DROP CONSTRAINT IF EXISTS check_commission_amount_one_dollar;

ALTER TABLE affiliate_referrals
ADD CONSTRAINT check_commission_amount_one_dollar
CHECK (
  (payment_id IS NULL) OR -- Initial referral records can have any amount (or 0)
  (payment_id IS NOT NULL AND commission_amount = 1.00) -- Commission records must be exactly $1.00
);

