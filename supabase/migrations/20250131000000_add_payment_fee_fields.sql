-- Migration: Add payment fee fields to payments and stripe_sessions tables
-- This migration adds fields to store Stripe processing fees information

-- Add fee-related columns to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS base_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS gross_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS fee_amount numeric(10,2);

-- Add comments to document the new columns in payments
COMMENT ON COLUMN payments.base_amount IS 'Base amount (net amount desired) before processing fees';
COMMENT ON COLUMN payments.gross_amount IS 'Gross amount (total amount charged to customer) including processing fees';
COMMENT ON COLUMN payments.fee_amount IS 'Processing fee amount paid by the customer';

-- Create index for fee_amount to enable fee analysis queries
CREATE INDEX IF NOT EXISTS idx_payments_fee_amount ON payments(fee_amount);

-- Add fee-related columns to stripe_sessions table
ALTER TABLE stripe_sessions 
ADD COLUMN IF NOT EXISTS base_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS gross_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS fee_amount numeric(10,2);

-- Add comments to document the new columns in stripe_sessions
COMMENT ON COLUMN stripe_sessions.base_amount IS 'Base amount (net amount desired) before processing fees';
COMMENT ON COLUMN stripe_sessions.gross_amount IS 'Gross amount (total amount charged to customer) including processing fees';
COMMENT ON COLUMN stripe_sessions.fee_amount IS 'Processing fee amount paid by the customer';

-- Create indexes for fee analysis
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_fee_amount ON stripe_sessions(fee_amount);
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_base_amount ON stripe_sessions(base_amount);
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_gross_amount ON stripe_sessions(gross_amount);

