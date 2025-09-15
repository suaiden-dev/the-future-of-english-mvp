-- Migration: Create payments table if it doesn't exist
-- This table stores information about completed payments

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_session_id text,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending',
  payment_method text,
  payment_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_document_id ON payments(document_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session_id ON payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payments
-- Users can read their own payments
CREATE POLICY "Users can read own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all payments
CREATE POLICY "Admins can read all payments"
  ON payments
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
CREATE POLICY "Only admins can manage payments"
  ON payments
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
COMMENT ON TABLE payments IS 'Stores information about completed payments';
COMMENT ON COLUMN payments.document_id IS 'Reference to the document being paid for';
COMMENT ON COLUMN payments.user_id IS 'Reference to the user making the payment';
COMMENT ON COLUMN payments.stripe_session_id IS 'Stripe session ID for the payment';
COMMENT ON COLUMN payments.amount IS 'Payment amount';
COMMENT ON COLUMN payments.currency IS 'Payment currency (default: USD)';
COMMENT ON COLUMN payments.status IS 'Payment status (pending, completed, failed)';
COMMENT ON COLUMN payments.payment_method IS 'Method used for payment';
COMMENT ON COLUMN payments.payment_date IS 'Date when payment was completed';
