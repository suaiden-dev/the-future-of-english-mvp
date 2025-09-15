-- Migration: Add authentication fields to documents_to_be_verified table
-- This migration adds the missing authentication fields that are used in the application

-- Add authentication fields to documents_to_be_verified table
ALTER TABLE documents_to_be_verified 
ADD COLUMN IF NOT EXISTS authenticated_by_name text,
ADD COLUMN IF NOT EXISTS authenticated_by_email text,
ADD COLUMN IF NOT EXISTS authentication_date timestamptz;

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_documents_to_be_verified_authenticated_by_name ON documents_to_be_verified(authenticated_by_name);
CREATE INDEX IF NOT EXISTS idx_documents_to_be_verified_authentication_date ON documents_to_be_verified(authentication_date);

-- Add comments to document the new fields
COMMENT ON COLUMN documents_to_be_verified.authenticated_by_name IS 'Name of the authenticator who approved the document';
COMMENT ON COLUMN documents_to_be_verified.authenticated_by_email IS 'Email of the authenticator who approved the document';
COMMENT ON COLUMN documents_to_be_verified.authentication_date IS 'Date and time when the document was authenticated';
