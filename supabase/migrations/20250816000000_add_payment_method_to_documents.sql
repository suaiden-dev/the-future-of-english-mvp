-- Migration: Add payment_method field to documents table
-- This migration adds the payment_method field to track how clients paid for translation services

-- Add payment_method column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'card';

-- Update existing records to have default payment method
UPDATE documents 
SET payment_method = COALESCE(payment_method, 'card')
WHERE payment_method IS NULL;

-- Create index for better performance on payment_method field
CREATE INDEX IF NOT EXISTS idx_documents_payment_method ON documents(payment_method);

-- Add comment to document the new field
COMMENT ON COLUMN documents.payment_method IS 'Payment method used by the client (card, cash, transfer, zelle, stripe, other)';

-- Create a check constraint to ensure valid payment methods
ALTER TABLE documents 
ADD CONSTRAINT check_payment_method 
CHECK (payment_method IN ('card', 'cash', 'transfer', 'zelle', 'stripe', 'other'));
