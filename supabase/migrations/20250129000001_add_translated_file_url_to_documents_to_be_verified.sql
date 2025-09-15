-- Migration: Add translated_file_url field to documents_to_be_verified table
-- This migration adds the translated_file_url field that is used in the application

-- Add translated_file_url column to documents_to_be_verified table
ALTER TABLE documents_to_be_verified 
ADD COLUMN IF NOT EXISTS translated_file_url text;

-- Create index for better performance on new field
CREATE INDEX IF NOT EXISTS idx_documents_to_be_verified_translated_file_url ON documents_to_be_verified(translated_file_url);

-- Add comment to document the new field
COMMENT ON COLUMN documents_to_be_verified.translated_file_url IS 'URL of the translated document file';
