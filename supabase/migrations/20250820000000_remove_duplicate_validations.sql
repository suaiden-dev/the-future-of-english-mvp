-- Migration: Remove all duplicate document validations
-- This migration removes any constraints, triggers, or functions that validate duplicate documents

-- Drop any duplicate validation functions if they exist
DROP FUNCTION IF EXISTS check_document_exists() CASCADE;
DROP FUNCTION IF EXISTS check_verification_document_exists() CASCADE;
DROP FUNCTION IF EXISTS check_duplicate_documents() CASCADE;
DROP FUNCTION IF EXISTS validate_document_uniqueness() CASCADE;
DROP FUNCTION IF EXISTS prevent_document_duplicates() CASCADE;

-- Drop any triggers related to duplicate validation
DROP TRIGGER IF EXISTS prevent_document_duplicates ON documents;
DROP TRIGGER IF EXISTS prevent_verification_duplicates ON documents_to_be_verified;
DROP TRIGGER IF EXISTS check_duplicate_documents_trigger ON documents;
DROP TRIGGER IF EXISTS check_duplicate_verification_trigger ON documents_to_be_verified;
DROP TRIGGER IF EXISTS validate_document_uniqueness_trigger ON documents;
DROP TRIGGER IF EXISTS validate_verification_uniqueness_trigger ON documents_to_be_verified;

-- Drop any unique constraints that might be causing duplicates (except verification_code which should remain unique)
ALTER TABLE documents DROP CONSTRAINT IF EXISTS unique_user_filename_status;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS unique_user_filename_created_at;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS unique_user_document_name;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_user_filename_unique;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_duplicate_check;

ALTER TABLE documents_to_be_verified DROP CONSTRAINT IF EXISTS unique_user_filename_status_verified;
ALTER TABLE documents_to_be_verified DROP CONSTRAINT IF EXISTS unique_user_filename_created_at_verified;
ALTER TABLE documents_to_be_verified DROP CONSTRAINT IF EXISTS unique_user_document_name_verified;
ALTER TABLE documents_to_be_verified DROP CONSTRAINT IF EXISTS documents_to_be_verified_user_filename_unique;
ALTER TABLE documents_to_be_verified DROP CONSTRAINT IF EXISTS documents_to_be_verified_duplicate_check;

-- Create a function to allow duplicate documents without validation
CREATE OR REPLACE FUNCTION allow_duplicate_documents()
RETURNS TRIGGER AS $$
BEGIN
  -- Simply return NEW without any validation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add a comment to document the change
COMMENT ON FUNCTION allow_duplicate_documents() IS 'Function that allows duplicate documents without validation - created to resolve n8n duplicate document errors';

-- Log the migration completion
SELECT 'Duplicate validation removal completed successfully' as migration_status;
