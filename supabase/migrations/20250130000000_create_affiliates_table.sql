-- Migration: Create affiliates table
-- This table stores information about affiliate program registrations

-- Create affiliates table
CREATE TABLE IF NOT EXISTS affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  website text,
  social_media text,
  how_did_you_hear text,
  referral_code text UNIQUE,
  status text DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to update updated_at timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code = 'AFF' || UPPER(SUBSTRING(MD5(RANDOM()::text || NEW.id::text) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS affiliates_referral_code_trigger ON affiliates;
DROP TRIGGER IF EXISTS affiliates_updated_at_trigger ON affiliates;

-- Create trigger to auto-generate referral code
CREATE TRIGGER affiliates_referral_code_trigger
  BEFORE INSERT ON affiliates
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- Create trigger to update updated_at timestamp
CREATE TRIGGER affiliates_updated_at_trigger
  BEFORE UPDATE ON affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_affiliates_email ON affiliates(email);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliates_created_at ON affiliates(created_at);

-- Enable Row Level Security
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anyone can register as affiliate" ON affiliates;
DROP POLICY IF EXISTS "Users can read own affiliate registration" ON affiliates;
DROP POLICY IF EXISTS "Admins can read all affiliates" ON affiliates;
DROP POLICY IF EXISTS "Only admins can manage affiliates" ON affiliates;

-- Create RLS policies for affiliates
-- Anyone can insert (register as affiliate)
CREATE POLICY "Anyone can register as affiliate"
  ON affiliates
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can read their own affiliate registration
CREATE POLICY "Users can read own affiliate registration"
  ON affiliates
  FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Admins can read all affiliates
CREATE POLICY "Admins can read all affiliates"
  ON affiliates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'finance')
    )
  );

-- Only admins can update/delete
CREATE POLICY "Only admins can manage affiliates"
  ON affiliates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'finance')
    )
  );

-- Add comments to document the table
COMMENT ON TABLE affiliates IS 'Stores information about affiliate program registrations';
COMMENT ON COLUMN affiliates.referral_code IS 'Unique referral code for the affiliate';
COMMENT ON COLUMN affiliates.status IS 'Affiliate status (pending, approved, rejected)';
COMMENT ON COLUMN affiliates.how_did_you_hear IS 'How the affiliate heard about the program';

