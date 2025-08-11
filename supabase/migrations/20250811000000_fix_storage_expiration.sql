-- Fix Storage Expiration Issues
-- This migration configures the documents bucket to prevent file expiration

-- Create the documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true, -- Make bucket public
  '50MB',
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = '50MB',
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Create storage policy to allow public read access to documents
CREATE POLICY "Public read access to documents"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'documents');

-- Create storage policy to allow authenticated users to upload
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

-- Create storage policy to allow users to manage their own files
CREATE POLICY "Users can manage own documents"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create storage policy to allow admins to manage all files
CREATE POLICY "Admins can manage all documents"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to generate permanent public URLs (no expiration)
CREATE OR REPLACE FUNCTION generate_permanent_public_url(file_path text)
RETURNS text AS $$
BEGIN
  -- Return the permanent public URL format
  RETURN 'https://ywpogqwhwscbdhnoqsmv.supabase.co/storage/v1/object/public/documents/' || file_path;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a file exists and is accessible
CREATE OR REPLACE FUNCTION check_file_accessibility(file_path text)
RETURNS boolean AS $$
BEGIN
  -- Check if file exists in storage
  RETURN EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'documents'
    AND name = file_path
  );
END;
$$ LANGUAGE plpgsql;

-- Create index for better performance on storage queries
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_name
  ON storage.objects(bucket_id, name);

-- Create index for user folder access
CREATE INDEX IF NOT EXISTS idx_storage_objects_user_folder
  ON storage.objects(bucket_id, (storage.foldername(name))[1]);
