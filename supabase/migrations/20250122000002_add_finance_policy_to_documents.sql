-- Add finance role policies for documents_to_be_verified
CREATE POLICY "Finance can read all documents to be verified"
  ON documents_to_be_verified
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'finance'
    )
  );

-- Add finance role policies for translated_documents
CREATE POLICY "Finance can read all translated documents"
  ON translated_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'finance'
    )
  );
