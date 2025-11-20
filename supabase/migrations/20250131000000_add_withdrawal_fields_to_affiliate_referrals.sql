-- Migration: Add withdrawal fields to affiliate_referrals
-- This adds fields needed for the withdrawal system: available_for_withdrawal_at, withdrawn_amount, and updates status enum

-- Add available_for_withdrawal_at column (30 days after commission creation)
ALTER TABLE affiliate_referrals 
ADD COLUMN IF NOT EXISTS available_for_withdrawal_at timestamptz;

-- Add withdrawn_amount column (tracks how much has been withdrawn from this commission)
ALTER TABLE affiliate_referrals 
ADD COLUMN IF NOT EXISTS withdrawn_amount numeric(10,2) DEFAULT 0;

-- Update existing records: set available_for_withdrawal_at = created_at + 30 days for confirmed commissions
UPDATE affiliate_referrals 
SET available_for_withdrawal_at = created_at + INTERVAL '30 days'
WHERE status = 'converted' AND available_for_withdrawal_at IS NULL;

-- Update status constraint to include 'confirmed' and 'withdrawn'
ALTER TABLE affiliate_referrals 
DROP CONSTRAINT IF EXISTS affiliate_referrals_status_check;

ALTER TABLE affiliate_referrals 
ADD CONSTRAINT affiliate_referrals_status_check 
CHECK (status IN ('pending', 'converted', 'paid', 'confirmed', 'withdrawn'));

-- Create index for better performance on withdrawal queries
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_available_for_withdrawal 
ON affiliate_referrals(available_for_withdrawal_at) 
WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_withdrawal_status 
ON affiliate_referrals(affiliate_id, status, available_for_withdrawal_at);

-- Add comments
COMMENT ON COLUMN affiliate_referrals.available_for_withdrawal_at IS 'Date when this commission becomes available for withdrawal (30 days after creation)';
COMMENT ON COLUMN affiliate_referrals.withdrawn_amount IS 'Amount already withdrawn from this commission (allows partial withdrawals)';
COMMENT ON COLUMN affiliate_referrals.status IS 'Status: pending (registered), converted (made purchase), paid (commission paid), confirmed (commission confirmed), withdrawn (fully withdrawn)';

