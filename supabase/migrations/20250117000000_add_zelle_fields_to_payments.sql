-- Migration: Add Zelle-specific fields to payments table
-- This migration adds fields needed for Zelle payment verification and tracking

-- Add Zelle-specific columns to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS receipt_url text,
ADD COLUMN IF NOT EXISTS zelle_confirmation_code text,
ADD COLUMN IF NOT EXISTS zelle_verified_at timestamptz,
ADD COLUMN IF NOT EXISTS zelle_verified_by uuid REFERENCES profiles(id);

-- Create indexes for better performance on Zelle fields
CREATE INDEX IF NOT EXISTS idx_payments_zelle_confirmation_code ON payments(zelle_confirmation_code);
CREATE INDEX IF NOT EXISTS idx_payments_zelle_verified_at ON payments(zelle_verified_at);
CREATE INDEX IF NOT EXISTS idx_payments_zelle_verified_by ON payments(zelle_verified_by);

-- Add comments to document the new fields
COMMENT ON COLUMN payments.receipt_url IS 'URL of the Zelle payment receipt image';
COMMENT ON COLUMN payments.zelle_confirmation_code IS 'Confirmation code provided by the user for Zelle payment verification';
COMMENT ON COLUMN payments.zelle_verified_at IS 'Timestamp when the Zelle payment was verified by an admin';
COMMENT ON COLUMN payments.zelle_verified_by IS 'ID of the admin who verified the Zelle payment';

-- Update the payment_method check constraint to include more Zelle-related statuses
ALTER TABLE payments DROP CONSTRAINT IF EXISTS check_payment_method;

-- Add new constraint with expanded payment methods
ALTER TABLE payments 
ADD CONSTRAINT check_payment_method 
CHECK (payment_method IN ('card', 'cash', 'transfer', 'zelle', 'stripe', 'other'));

-- Add constraint for payment status to include Zelle-specific statuses
ALTER TABLE payments 
ADD CONSTRAINT check_payment_status 
CHECK (status IN ('pending', 'completed', 'failed', 'pending_verification', 'verified', 'rejected'));

-- Create a function to verify Zelle payments
CREATE OR REPLACE FUNCTION verify_zelle_payment(
  payment_id_param uuid,
  verifier_id_param uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to verify payments (admin or finance role)
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = verifier_id_param 
    AND role IN ('admin', 'finance')
  ) THEN
    RAISE EXCEPTION 'Access denied. Only admin or finance users can verify payments.';
  END IF;

  -- Update the payment record
  UPDATE payments 
  SET 
    status = 'verified',
    zelle_verified_at = now(),
    zelle_verified_by = verifier_id_param,
    updated_at = now()
  WHERE id = payment_id_param;

  -- Return true if update was successful
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION verify_zelle_payment(uuid, uuid) TO authenticated;

-- Create a function to reject Zelle payments
CREATE OR REPLACE FUNCTION reject_zelle_payment(
  payment_id_param uuid,
  rejection_reason_param text DEFAULT NULL,
  verifier_id_param uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to reject payments (admin or finance role)
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = verifier_id_param 
    AND role IN ('admin', 'finance')
  ) THEN
    RAISE EXCEPTION 'Access denied. Only admin or finance users can reject payments.';
  END IF;

  -- Update the payment record
  UPDATE payments 
  SET 
    status = 'rejected',
    zelle_verified_at = now(),
    zelle_verified_by = verifier_id_param,
    updated_at = now()
  WHERE id = payment_id_param;

  -- Return true if update was successful
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reject_zelle_payment(uuid, text, uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION verify_zelle_payment(uuid, uuid) IS 'Verify a Zelle payment and mark it as verified';
COMMENT ON FUNCTION reject_zelle_payment(uuid, text, uuid) IS 'Reject a Zelle payment with optional reason';




