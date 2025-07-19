-- Create documents_to_be_verified table
CREATE TABLE IF NOT EXISTS documents_to_be_verified (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  pages integer DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  total_cost decimal(10,2) NOT NULL DEFAULT 0.00,
  is_bank_statement boolean DEFAULT false,
  source_language text DEFAULT 'portuguese',
  target_language text DEFAULT 'english',
  translation_status text DEFAULT 'pending',
  file_id text,
  verification_code text UNIQUE,
  authenticated_by uuid REFERENCES profiles(id),
  authenticated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE documents_to_be_verified ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents_to_be_verified
CREATE POLICY "Users can read own documents to be verified"
  ON documents_to_be_verified
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own documents to be verified"
  ON documents_to_be_verified
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own documents to be verified"
  ON documents_to_be_verified
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Admin policies for documents_to_be_verified
CREATE POLICY "Admins can read all documents to be verified"
  ON documents_to_be_verified
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all documents to be verified"
  ON documents_to_be_verified
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Authenticator policies for documents_to_be_verified
CREATE POLICY "Authenticators can read all documents to be verified"
  ON documents_to_be_verified
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'authenticator'
    )
  );

CREATE POLICY "Authenticators can update all documents to be verified"
  ON documents_to_be_verified
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'authenticator'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_to_be_verified_user_id ON documents_to_be_verified(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_to_be_verified_status ON documents_to_be_verified(status);
CREATE INDEX IF NOT EXISTS idx_documents_to_be_verified_verification_code ON documents_to_be_verified(verification_code); 