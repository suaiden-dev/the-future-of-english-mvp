-- Migration: Add currency columns to documents table
-- This migration adds the missing currency columns that are used for bank statements

-- Add currency columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS source_currency text,
ADD COLUMN IF NOT EXISTS target_currency text;

-- Add comments to document the new fields
COMMENT ON COLUMN documents.source_currency IS 'Source currency for bank statement documents';
COMMENT ON COLUMN documents.target_currency IS 'Target currency for bank statement documents';
