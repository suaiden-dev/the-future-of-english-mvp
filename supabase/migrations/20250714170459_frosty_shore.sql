/*
  # Initial Schema Setup for TheFutureOfEnglish

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text)
      - `email` (text, unique)
      - `role` (enum: user, admin)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `folders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `parent_id` (uuid, references folders, nullable)
      - `color` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `folder_id` (uuid, references folders, nullable)
      - `filename` (text)
      - `pages` (integer)
      - `status` (enum: pending, processing, completed)
      - `total_cost` (integer)
      - `verification_code` (text, unique)
      - `is_authenticated` (boolean)
      - `upload_date` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add admin policies for document management

  3. Functions
    - Auto-generate verification codes
    - Auto-update timestamps
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE document_status AS ENUM ('pending', 'processing', 'completed');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role user_role DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  color text DEFAULT 'bg-blue-100 text-blue-800',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  folder_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  filename text NOT NULL,
  pages integer DEFAULT 1,
  status document_status DEFAULT 'pending',
  total_cost integer DEFAULT 0,
  verification_code text UNIQUE,
  is_authenticated boolean DEFAULT true,
  upload_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to generate verification codes
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS text AS $$
BEGIN
  RETURN 'TFE' || upper(substring(gen_random_uuid()::text from 1 for 6));
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate verification codes
CREATE OR REPLACE FUNCTION set_verification_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.verification_code IS NULL THEN
    NEW.verification_code := generate_verification_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_verification_code_trigger
  BEFORE INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION set_verification_code();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER profiles_updated_at_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER folders_updated_at_trigger
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER documents_updated_at_trigger
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

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

-- Folders policies
CREATE POLICY "Users can read own folders"
  ON folders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own folders"
  ON folders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own folders"
  ON folders
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own folders"
  ON folders
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Documents policies
CREATE POLICY "Users can read own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admin policies for documents (admins can read and update all documents)
CREATE POLICY "Admins can read all documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_verification_code ON documents(verification_code);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);