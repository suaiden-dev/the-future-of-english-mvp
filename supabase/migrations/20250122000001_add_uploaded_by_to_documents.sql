-- Add uploaded_by column to documents table
ALTER TABLE documents ADD COLUMN uploaded_by uuid REFERENCES auth.users(id);

-- Add comment for documentation
COMMENT ON COLUMN documents.uploaded_by IS 'The user who uploaded the document';

-- Create index for better query performance
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);

-- Create RLS policy to allow access to finance role
CREATE POLICY "Allow finance to view all documents"
ON documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'finance'
  )
);

-- Update existing documents to set uploaded_by as user_id (temporary fix)
UPDATE documents
SET uploaded_by = user_id
WHERE uploaded_by IS NULL;
