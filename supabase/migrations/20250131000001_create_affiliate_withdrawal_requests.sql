-- Migration: Create affiliate_withdrawal_requests table
-- This table stores withdrawal requests from affiliates

CREATE TABLE IF NOT EXISTS affiliate_withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('zelle', 'bank_transfer', 'stripe', 'other')),
  payment_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_affiliate_id ON affiliate_withdrawal_requests(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON affiliate_withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_requested_at ON affiliate_withdrawal_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_processed_by ON affiliate_withdrawal_requests(processed_by);

-- Add trigger to update updated_at
DROP TRIGGER IF EXISTS withdrawal_requests_updated_at_trigger ON affiliate_withdrawal_requests;
CREATE TRIGGER withdrawal_requests_updated_at_trigger
  BEFORE UPDATE ON affiliate_withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE affiliate_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Affiliates can view their own withdrawal requests
DROP POLICY IF EXISTS "Affiliates can view own withdrawal requests" ON affiliate_withdrawal_requests;
CREATE POLICY "Affiliates can view own withdrawal requests"
  ON affiliate_withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.id = affiliate_withdrawal_requests.affiliate_id
      AND (a.user_id = auth.uid() OR a.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  );

-- Affiliates can create withdrawal requests
DROP POLICY IF EXISTS "Affiliates can create withdrawal requests" ON affiliate_withdrawal_requests;
CREATE POLICY "Affiliates can create withdrawal requests"
  ON affiliate_withdrawal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.id = affiliate_withdrawal_requests.affiliate_id
      AND (a.user_id = auth.uid() OR a.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  );

-- Admins can view all withdrawal requests
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON affiliate_withdrawal_requests;
CREATE POLICY "Admins can view all withdrawal requests"
  ON affiliate_withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'finance')
    )
  );

-- Admins can update withdrawal requests
DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON affiliate_withdrawal_requests;
CREATE POLICY "Admins can update withdrawal requests"
  ON affiliate_withdrawal_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'finance')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'finance')
    )
  );

-- Add comments
COMMENT ON TABLE affiliate_withdrawal_requests IS 'Stores withdrawal requests from affiliates';
COMMENT ON COLUMN affiliate_withdrawal_requests.affiliate_id IS 'Reference to the affiliate making the request';
COMMENT ON COLUMN affiliate_withdrawal_requests.amount IS 'Amount requested for withdrawal';
COMMENT ON COLUMN affiliate_withdrawal_requests.payment_method IS 'Payment method: zelle, bank_transfer, stripe, other';
COMMENT ON COLUMN affiliate_withdrawal_requests.payment_details IS 'JSONB object containing payment method specific details';
COMMENT ON COLUMN affiliate_withdrawal_requests.status IS 'Request status: pending, approved, rejected, completed';
COMMENT ON COLUMN affiliate_withdrawal_requests.processed_by IS 'Admin who processed the request';
COMMENT ON COLUMN affiliate_withdrawal_requests.admin_notes IS 'Notes from admin about the request';

