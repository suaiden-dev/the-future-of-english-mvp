/*
  # Initial Schema Setup for TheFutureOfEnglish

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `name` (text)
      - `email` (text)
      - `role` (text, default 'user')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `folders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `parent_id` (uuid, references folders)
      - `color` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `folder_id` (uuid, references folders)
      - `filename` (text)
      - `pages` (integer)
      - `status` (text, default 'pending')
      - `total_cost` (decimal)
      - `verification_code` (text, unique)
      - `is_authenticated` (boolean, default true)
      - `upload_date` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add admin policies for document management
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  color text DEFAULT 'bg-blue-100 text-blue-800',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  filename text NOT NULL,
  pages integer NOT NULL DEFAULT 1 CHECK (pages > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
  total_cost decimal(10,2) NOT NULL DEFAULT 0.00,
  verification_code text UNIQUE NOT NULL,
  is_authenticated boolean DEFAULT true,
  upload_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admin can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Folders policies
CREATE POLICY "Users can manage own folders"
  ON folders
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Documents policies
CREATE POLICY "Users can manage own documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can manage all documents
CREATE POLICY "Admins can manage all documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Public policy for document verification (anyone can verify with code)
CREATE POLICY "Anyone can verify documents"
  ON documents
  FOR SELECT
  TO anon, authenticated
  USING (verification_code IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_verification_code ON documents(verification_code);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate verification codes
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS text AS $$
BEGIN
  RETURN 'TFE' || upper(substring(gen_random_uuid()::text from 1 for 6));
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate verification codes
CREATE OR REPLACE FUNCTION set_verification_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_code IS NULL OR NEW.verification_code = '' THEN
    NEW.verification_code = generate_verification_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_document_verification_code
  BEFORE INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION set_verification_code();