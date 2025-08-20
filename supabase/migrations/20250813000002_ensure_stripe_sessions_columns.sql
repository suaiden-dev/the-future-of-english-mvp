-- Migration: Ensure all required columns exist in stripe_sessions table
-- This migration adds any missing columns that might not have been created properly

-- Add payment_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_sessions' 
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE stripe_sessions ADD COLUMN payment_status text DEFAULT 'pending';
    END IF;
END $$;

-- Add amount column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_sessions' 
        AND column_name = 'amount'
    ) THEN
        ALTER TABLE stripe_sessions ADD COLUMN amount numeric(10,2);
    END IF;
END $$;

-- Add currency column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_sessions' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE stripe_sessions ADD COLUMN currency text DEFAULT 'USD';
    END IF;
END $$;

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_sessions' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE stripe_sessions ADD COLUMN user_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_payment_status ON stripe_sessions(payment_status);
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_amount ON stripe_sessions(amount);
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_currency ON stripe_sessions(currency);

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'stripe_sessions' 
ORDER BY ordinal_position;
