-- Migration: Fix get_pending_withdrawal_requests function
-- Fix ambiguous column reference error

CREATE OR REPLACE FUNCTION get_pending_withdrawal_requests()
RETURNS TABLE (
  id uuid,
  affiliate_id uuid,
  affiliate_name text,
  affiliate_email text,
  amount numeric,
  payment_method text,
  payment_details jsonb,
  status text,
  requested_at timestamptz,
  processed_at timestamptz,
  processed_by uuid,
  processed_by_name text,
  admin_notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'finance')
  ) THEN
    RAISE EXCEPTION 'Access denied. Only admins can view withdrawal requests.';
  END IF;
  
  RETURN QUERY
  SELECT 
    awr.id,
    awr.affiliate_id,
    a.name as affiliate_name,
    a.email as affiliate_email,
    awr.amount,
    awr.payment_method,
    awr.payment_details,
    awr.status,
    awr.requested_at,
    awr.processed_at,
    awr.processed_by,
    p.name as processed_by_name,
    awr.admin_notes
  FROM affiliate_withdrawal_requests awr
  JOIN affiliates a ON a.id = awr.affiliate_id
  LEFT JOIN profiles p ON p.id = awr.processed_by
  ORDER BY awr.requested_at DESC;
END;
$$;

