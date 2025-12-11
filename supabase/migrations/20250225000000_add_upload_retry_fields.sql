-- Migration: Add upload retry fields to documents table
-- This migration adds fields to track failed uploads and retry attempts

-- Add upload_failed_at column to track when upload failed
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS upload_failed_at TIMESTAMPTZ;

-- Add upload_retry_count column to track retry attempts
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS upload_retry_count INTEGER DEFAULT 0;

-- Create index for efficient search of documents with failed uploads
CREATE INDEX IF NOT EXISTS idx_documents_upload_failed 
ON documents(upload_failed_at) 
WHERE upload_failed_at IS NOT NULL;

-- Create composite index for efficient search of documents with missing files
CREATE INDEX IF NOT EXISTS idx_documents_missing_file 
ON documents(user_id, status, upload_failed_at) 
WHERE (file_url IS NULL OR file_url = '') 
AND upload_failed_at IS NOT NULL;

-- Add comments to document the new columns
COMMENT ON COLUMN documents.upload_failed_at IS 'Timestamp when the upload failed after payment confirmation';
COMMENT ON COLUMN documents.upload_retry_count IS 'Number of times the user has attempted to re-upload the document';

-- Create function to get documents with missing files
-- This function detects documents that have completed payments but no file_url
CREATE OR REPLACE FUNCTION get_documents_with_missing_files(
  user_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
  document_id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  payment_id UUID,
  payment_status TEXT,
  payment_amount DECIMAL,
  payment_gross_amount DECIMAL,
  payment_fee_amount DECIMAL,
  payment_date TIMESTAMPTZ,
  filename TEXT,
  original_filename TEXT,
  status TEXT,
  total_cost DECIMAL,
  verification_code TEXT,
  created_at TIMESTAMPTZ,
  upload_failed_at TIMESTAMPTZ,
  upload_retry_count INTEGER,
  pages INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id AS document_id,
    d.user_id,
    p.name AS user_name,
    p.email AS user_email,
    pay.id AS payment_id,
    pay.status::TEXT AS payment_status,
    pay.amount AS payment_amount,
    pay.gross_amount AS payment_gross_amount,
    pay.fee_amount AS payment_fee_amount,
    pay.payment_date,
    d.filename,
    d.original_filename,
    d.status::TEXT,
    d.total_cost,
    d.verification_code,
    d.created_at,
    d.upload_failed_at,
    d.upload_retry_count,
    d.pages
  FROM documents d
  INNER JOIN payments pay ON pay.document_id = d.id
  INNER JOIN profiles p ON p.id = d.user_id
  WHERE 
    pay.status = 'completed'
    AND (d.file_url IS NULL OR d.file_url = '')
    AND d.status IN ('pending', 'draft', 'processing')
    AND (user_id_param IS NULL OR d.user_id = user_id_param)
  ORDER BY d.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_documents_with_missing_files(UUID) TO authenticated;

-- Add comment to document the function
COMMENT ON FUNCTION get_documents_with_missing_files(UUID) IS 'Returns documents that have completed payments but no file_url, optionally filtered by user_id';

