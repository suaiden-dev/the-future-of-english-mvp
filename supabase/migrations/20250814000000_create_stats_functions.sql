-- Migration: Create statistics functions for Lush Admin Dashboard
-- This migration creates the RPC functions needed for payment and translation statistics

-- Function to check if user is lush-admin
CREATE OR REPLACE FUNCTION is_lush_admin(user_id_param uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If no user_id provided, use current user
  IF user_id_param IS NULL THEN
    user_id_param := auth.uid();
  END IF;
  
  -- Check if user exists and has lush-admin role
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = user_id_param 
    AND profiles.role = 'lush-admin'
  );
END;
$$;

-- Function to get payment statistics
CREATE OR REPLACE FUNCTION get_payment_stats(start_date text DEFAULT NULL, end_date text DEFAULT NULL)
RETURNS TABLE(
  total_payments bigint,
  total_amount numeric,
  completed_payments bigint,
  pending_payments bigint,
  failed_payments bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is lush-admin
  IF NOT is_lush_admin() THEN
    RAISE EXCEPTION 'Access denied. Only lush-admin users can access this function.';
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_payments,
    COALESCE(SUM(amount), 0) as total_amount,
    COUNT(*) FILTER (WHERE status = 'completed')::bigint as completed_payments,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_payments,
    COUNT(*) FILTER (WHERE status = 'failed')::bigint as failed_payments
  FROM payments
  WHERE 
    (start_date IS NULL OR created_at >= start_date::timestamptz)
    AND (end_date IS NULL OR created_at <= end_date::timestamptz);
END;
$$;

-- Function to get translation statistics
CREATE OR REPLACE FUNCTION get_translation_stats(start_date text DEFAULT NULL, end_date text DEFAULT NULL)
RETURNS TABLE(
  total_documents bigint,
  completed_translations bigint,
  pending_translations bigint,
  total_revenue numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is lush-admin
  IF NOT is_lush_admin() THEN
    RAISE EXCEPTION 'Access denied. Only lush-admin users can access this function.';
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_documents,
    COUNT(*) FILTER (WHERE status = 'completed')::bigint as completed_translations,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_translations,
    COALESCE(SUM(total_cost), 0) as total_revenue
  FROM documents_to_be_verified
  WHERE 
    (start_date IS NULL OR created_at >= start_date::timestamptz)
    AND (end_date IS NULL OR created_at <= end_date::timestamptz);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION is_lush_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_stats(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_translation_stats(text, text) TO authenticated;

-- Add comments
COMMENT ON FUNCTION is_lush_admin(uuid) IS 'Check if user has lush-admin role';
COMMENT ON FUNCTION get_payment_stats(text, text) IS 'Get payment statistics for Lush Admin Dashboard';
COMMENT ON FUNCTION get_translation_stats(text, text) IS 'Get translation statistics for Lush Admin Dashboard';
