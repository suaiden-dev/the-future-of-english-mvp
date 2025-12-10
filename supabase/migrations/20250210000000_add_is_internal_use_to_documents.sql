-- Add is_internal_use column to documents table
-- This field indicates if a document is for authenticator personal use (true) or for a client (false)
-- Personal use documents should not be counted in financial/admin statistics

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_internal_use BOOLEAN DEFAULT FALSE;

-- Update existing records to have default value (false)
-- This ensures backward compatibility - all existing documents are treated as client documents
UPDATE documents 
SET is_internal_use = FALSE
WHERE is_internal_use IS NULL;

-- Create index for better performance on queries filtering by is_internal_use
CREATE INDEX IF NOT EXISTS idx_documents_is_internal_use 
ON documents(is_internal_use);

-- Add comment to document the new field
COMMENT ON COLUMN documents.is_internal_use IS 
'Indicates if document is for authenticator personal use (true) or for a client (false). Personal use documents should not be counted in financial/admin statistics.';

