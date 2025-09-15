-- Migration: Create stripe_sessions table if it doesn't exist
-- This table stores information about Stripe checkout sessions

-- Create stripe_sessions table
CREATE TABLE IF NOT EXISTS stripe_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  metadata jsonb,
  payment_status text DEFAULT 'pending',
  amount numeric(10,2),
  currency text DEFAULT 'USD',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_session_id ON stripe_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_document_id ON stripe_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_user_id ON stripe_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_payment_status ON stripe_sessions(payment_status);

-- Enable Row Level Security
ALTER TABLE stripe_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for stripe_sessions
-- Users can read their own sessions
CREATE POLICY "Users can read own stripe sessions"
  ON stripe_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all sessions
CREATE POLICY "Admins can read all stripe sessions"
  ON stripe_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'lush-admin')
    )
  );

-- Only admins can insert/update/delete
CREATE POLICY "Only admins can manage stripe sessions"
  ON stripe_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'lush-admin')
    )
  );

-- Add comments to document the table
COMMENT ON TABLE stripe_sessions IS 'Stores information about Stripe checkout sessions';
COMMENT ON COLUMN stripe_sessions.session_id IS 'Unique Stripe session ID';
COMMENT ON COLUMN stripe_sessions.document_id IS 'Reference to the document being paid for';
COMMENT ON COLUMN stripe_sessions.user_id IS 'Reference to the user making the payment';
COMMENT ON COLUMN stripe_sessions.metadata IS 'Additional metadata from Stripe session';
COMMENT ON COLUMN stripe_sessions.payment_status IS 'Current payment status (pending, completed, failed)';
COMMENT ON COLUMN stripe_sessions.amount IS 'Payment amount in cents';
COMMENT ON COLUMN stripe_sessions.currency IS 'Payment currency (default: USD)';
