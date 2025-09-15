-- Migration: Enhanced translation statistics with user type separation
-- This migration creates an improved RPC function that separates statistics by user type

-- Enhanced function to get translation statistics with user type separation
CREATE OR REPLACE FUNCTION get_enhanced_translation_stats(start_date text DEFAULT NULL, end_date text DEFAULT NULL)
RETURNS TABLE(
  -- Overall totals
  total_documents bigint,
  total_revenue numeric,
  
  -- User uploads (regular customers)
  user_uploads_total bigint,
  user_uploads_completed bigint,
  user_uploads_pending bigint,
  user_uploads_revenue numeric,
  
  -- Authenticator uploads
  authenticator_uploads_total bigint,
  authenticator_uploads_completed bigint,
  authenticator_uploads_pending bigint,
  authenticator_uploads_revenue numeric,
  
  -- Processing status breakdown
  total_completed bigint,
  total_pending bigint,
  total_processing bigint
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
  WITH user_stats AS (
    -- Statistics for regular user uploads
    SELECT 
      COUNT(*)::bigint as total,
      COUNT(*) FILTER (WHERE status = 'completed')::bigint as completed,
      COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending,
      COALESCE(SUM(total_cost), 0) as revenue
    FROM documents_to_be_verified dtv
    JOIN profiles p ON dtv.user_id = p.id
    WHERE p.role = 'user'
      AND (start_date IS NULL OR dtv.created_at >= start_date::timestamptz)
      AND (end_date IS NULL OR dtv.created_at <= end_date::timestamptz)
  ),
  authenticator_stats AS (
    -- Statistics for authenticator uploads
    SELECT 
      COUNT(*)::bigint as total,
      COUNT(*) FILTER (WHERE status = 'completed')::bigint as completed,
      COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending,
      COALESCE(SUM(total_cost), 0) as revenue
    FROM documents_to_be_verified dtv
    JOIN profiles p ON dtv.user_id = p.id
    WHERE p.role = 'authenticator'
      AND (start_date IS NULL OR dtv.created_at >= start_date::timestamptz)
      AND (end_date IS NULL OR dtv.created_at <= end_date::timestamptz)
  ),
  overall_stats AS (
    -- Overall statistics
    SELECT 
      COUNT(*)::bigint as total,
      COUNT(*) FILTER (WHERE status = 'completed')::bigint as completed,
      COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending,
      COUNT(*) FILTER (WHERE status = 'processing')::bigint as processing,
      COALESCE(SUM(total_cost), 0) as revenue
    FROM documents_to_be_verified dtv
    WHERE (start_date IS NULL OR dtv.created_at >= start_date::timestamptz)
      AND (end_date IS NULL OR dtv.created_at <= end_date::timestamptz)
  )
  SELECT 
    -- Overall totals
    os.total as total_documents,
    os.revenue as total_revenue,
    
    -- User uploads
    us.total as user_uploads_total,
    us.completed as user_uploads_completed,
    us.pending as user_uploads_pending,
    us.revenue as user_uploads_revenue,
    
    -- Authenticator uploads
    auths.total as authenticator_uploads_total,
    auths.completed as authenticator_uploads_completed,
    auths.pending as authenticator_uploads_pending,
    auths.revenue as authenticator_uploads_revenue,
    
    -- Processing status
    os.completed as total_completed,
    os.pending as total_pending,
    os.processing as total_processing
  FROM overall_stats os
  CROSS JOIN user_stats us
  CROSS JOIN authenticator_stats auths;
END;
$$;

-- Function to get user type breakdown for specific date ranges
CREATE OR REPLACE FUNCTION get_user_type_breakdown(start_date text DEFAULT NULL, end_date text DEFAULT NULL)
RETURNS TABLE(
  user_type text,
  total_documents bigint,
  completed_documents bigint,
  pending_documents bigint,
  processing_documents bigint,
  total_revenue numeric,
  avg_revenue_per_doc numeric
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
    'Regular Users'::text as user_type,
    COUNT(*)::bigint as total_documents,
    COUNT(*) FILTER (WHERE status = 'completed')::bigint as completed_documents,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_documents,
    COUNT(*) FILTER (WHERE status = 'processing')::bigint as processing_documents,
    COALESCE(SUM(total_cost), 0) as total_revenue,
    CASE 
      WHEN COUNT(*) > 0 THEN COALESCE(SUM(total_cost), 0) / COUNT(*)::numeric
      ELSE 0 
    END as avg_revenue_per_doc
  FROM documents_to_be_verified dtv
  JOIN profiles p ON dtv.user_id = p.id
  WHERE p.role = 'user'
    AND (start_date IS NULL OR dtv.created_at >= start_date::timestamptz)
    AND (end_date IS NULL OR dtv.created_at <= end_date::timestamptz)
  
  UNION ALL
  
  SELECT 
    'Authenticators'::text as user_type,
    COUNT(*)::bigint as total_documents,
    COUNT(*) FILTER (WHERE status = 'completed')::bigint as completed_documents,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_documents,
    COUNT(*) FILTER (WHERE status = 'processing')::bigint as processing_documents,
    COALESCE(SUM(total_cost), 0) as total_revenue,
    CASE 
      WHEN COUNT(*) > 0 THEN COALESCE(SUM(total_cost), 0) / COUNT(*)::numeric
      ELSE 0 
    END as avg_revenue_per_doc
  FROM documents_to_be_verified dtv
  JOIN profiles p ON dtv.user_id = p.id
  WHERE p.role = 'authenticator'
    AND (start_date IS NULL OR dtv.created_at >= start_date::timestamptz)
    AND (end_date IS NULL OR dtv.created_at <= end_date::timestamptz);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_enhanced_translation_stats(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_type_breakdown(text, text) TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_enhanced_translation_stats(text, text) IS 'Get enhanced translation statistics with user type separation for Lush Admin Dashboard';
COMMENT ON FUNCTION get_user_type_breakdown(text, text) IS 'Get detailed breakdown of documents by user type (regular users vs authenticators)';
