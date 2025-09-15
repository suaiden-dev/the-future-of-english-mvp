-- Migration: Create zelle_payment_history table
-- This table stores detailed history of Zelle payment transactions and verifications

CREATE TABLE IF NOT EXISTS zelle_payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'created', 'verified', 'rejected', 'updated'
  performed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  performed_at timestamptz DEFAULT now(),
  details jsonb, -- Store additional details like rejection reason, verification notes, etc.
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_zelle_payment_history_payment_id ON zelle_payment_history(payment_id);
CREATE INDEX IF NOT EXISTS idx_zelle_payment_history_performed_by ON zelle_payment_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_zelle_payment_history_performed_at ON zelle_payment_history(performed_at);
CREATE INDEX IF NOT EXISTS idx_zelle_payment_history_action ON zelle_payment_history(action);

-- Enable Row Level Security
ALTER TABLE zelle_payment_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins and finance can read zelle payment history"
  ON zelle_payment_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'finance')
    )
  );

CREATE POLICY "Admins and finance can insert zelle payment history"
  ON zelle_payment_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'finance')
    )
  );

-- Add comments to document the table
COMMENT ON TABLE zelle_payment_history IS 'Stores detailed history of Zelle payment transactions and verifications';
COMMENT ON COLUMN zelle_payment_history.payment_id IS 'Reference to the payment record';
COMMENT ON COLUMN zelle_payment_history.action IS 'Action performed on the payment (created, verified, rejected, updated)';
COMMENT ON COLUMN zelle_payment_history.performed_by IS 'ID of the user who performed the action';
COMMENT ON COLUMN zelle_payment_history.performed_at IS 'Timestamp when the action was performed';
COMMENT ON COLUMN zelle_payment_history.details IS 'Additional details about the action (JSON format)';

-- Create a function to log Zelle payment actions
CREATE OR REPLACE FUNCTION log_zelle_payment_action(
  payment_id_param uuid,
  action_param text,
  details_param jsonb DEFAULT NULL,
  performed_by_param uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  history_id uuid;
BEGIN
  -- Insert the history record
  INSERT INTO zelle_payment_history (
    payment_id,
    action,
    performed_by,
    details
  ) VALUES (
    payment_id_param,
    action_param,
    performed_by_param,
    details_param
  ) RETURNING id INTO history_id;

  RETURN history_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_zelle_payment_action(uuid, text, jsonb, uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION log_zelle_payment_action(uuid, text, jsonb, uuid) IS 'Log an action performed on a Zelle payment';




