-- Migration: Add missing file_url field to documents_to_be_verified table
-- This migration adds the file_url field that is used in the application but missing from the table

-- Add missing file_url column to documents_to_be_verified table
ALTER TABLE documents_to_be_verified 
ADD COLUMN IF NOT EXISTS file_url text;

-- Create index for better performance on new field
CREATE INDEX IF NOT EXISTS idx_documents_to_be_verified_file_url ON documents_to_be_verified(file_url);

-- Add comment to document the new field
COMMENT ON COLUMN documents_to_be_verified.file_url IS 'URL of the original document file';
