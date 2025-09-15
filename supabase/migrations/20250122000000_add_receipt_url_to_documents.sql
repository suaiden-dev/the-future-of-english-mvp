-- Add receipt_url column to documents table
ALTER TABLE documents ADD COLUMN receipt_url text;

-- Add receipt_url column to documents_to_be_verified table
ALTER TABLE documents_to_be_verified ADD COLUMN receipt_url text;

-- Add receipt_url column to translated_documents table
ALTER TABLE translated_documents ADD COLUMN receipt_url text;

-- Add comment for documentation
COMMENT ON COLUMN documents.receipt_url IS 'URL for the payment receipt file';
COMMENT ON COLUMN documents_to_be_verified.receipt_url IS 'URL for the payment receipt file';
COMMENT ON COLUMN translated_documents.receipt_url IS 'URL for the payment receipt file';
