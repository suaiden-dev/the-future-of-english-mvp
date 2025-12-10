-- Migration: Update all statistics functions to filter out internal use documents
-- This ensures that authenticator personal use documents (is_internal_use = true) are excluded from all statistics

-- 1. Update get_translation_stats_filtered (from 20250122000003)
CREATE OR REPLACE FUNCTION get_translation_stats_filtered(
    start_date TIMESTAMP DEFAULT NULL,
    end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
    total_documents BIGINT,
    completed_documents BIGINT,
    pending_documents BIGINT,
    total_revenue NUMERIC,
    avg_revenue_per_doc NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_documents,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_documents,
        COALESCE(SUM(total_cost), 0) as total_revenue,
        COALESCE(AVG(total_cost), 0) as avg_revenue_per_doc
    FROM documents
    WHERE (start_date IS NULL OR created_at >= start_date)
      AND (end_date IS NULL OR created_at <= end_date)
      AND (is_internal_use IS NULL OR is_internal_use = false);  -- NEW FILTER
END;
$$ LANGUAGE plpgsql;

-- 2. Update get_translation_stats (from 20250814000000)
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
  -- Check if user is lush-admin or has finance role
  IF NOT (is_lush_admin() OR has_finance_role()) THEN
    RAISE EXCEPTION 'Access denied. Only admin or finance users can access this function.';
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
    -- Note: documents_to_be_verified doesn't have is_internal_use, only documents table has it
END;
$$;

-- 3. Update get_enhanced_translation_stats (from 20250815000000)
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
  
  -- Authenticator uploads (excluding internal use)
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
  -- Check if user is lush-admin or has finance role
  IF NOT (is_lush_admin() OR has_finance_role()) THEN
    RAISE EXCEPTION 'Access denied. Only admin or finance users can access this function.';
  END IF;
  
  RETURN QUERY
  WITH user_stats AS (
    -- Statistics for regular user uploads (excluding internal use)
    SELECT 
      COUNT(*)::bigint as total,
      COUNT(*) FILTER (WHERE d.status = 'completed')::bigint as completed,
      COUNT(*) FILTER (WHERE d.status = 'pending')::bigint as pending,
      COALESCE(SUM(d.total_cost), 0) as revenue
    FROM documents d
    JOIN profiles p ON d.user_id = p.id
    WHERE p.role = 'user'
      AND (d.is_internal_use IS NULL OR d.is_internal_use = false)  -- NEW FILTER
      AND (start_date IS NULL OR d.created_at >= start_date::timestamptz)
      AND (end_date IS NULL OR d.created_at <= end_date::timestamptz)
  ),
  authenticator_stats AS (
    -- Statistics for authenticator uploads (excluding internal use)
    SELECT 
      COUNT(*)::bigint as total,
      COUNT(*) FILTER (WHERE d.status = 'completed')::bigint as completed,
      COUNT(*) FILTER (WHERE d.status = 'pending')::bigint as pending,
      COALESCE(SUM(d.total_cost), 0) as revenue
    FROM documents d
    JOIN profiles p ON d.user_id = p.id
    WHERE p.role = 'authenticator'
      AND (d.is_internal_use IS NULL OR d.is_internal_use = false)  -- NEW FILTER
      AND (start_date IS NULL OR d.created_at >= start_date::timestamptz)
      AND (end_date IS NULL OR d.created_at <= end_date::timestamptz)
  ),
  overall_stats AS (
    -- Overall statistics (excluding internal use)
    SELECT 
      COUNT(*)::bigint as total,
      COUNT(*) FILTER (WHERE d.status = 'completed')::bigint as completed,
      COUNT(*) FILTER (WHERE d.status = 'pending')::bigint as pending,
      COUNT(*) FILTER (WHERE d.status = 'processing')::bigint as processing,
      COALESCE(SUM(d.total_cost), 0) as revenue
    FROM documents d
    WHERE (d.is_internal_use IS NULL OR d.is_internal_use = false)  -- NEW FILTER
      AND (start_date IS NULL OR d.created_at >= start_date::timestamptz)
      AND (end_date IS NULL OR d.created_at <= end_date::timestamptz)
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

-- 4. Update get_user_type_breakdown (from 20250815000000)
CREATE OR REPLACE FUNCTION get_user_type_breakdown(start_date text DEFAULT NULL, end_date text DEFAULT NULL)
RETURNS TABLE(
  user_type text,
  total_documents bigint,
  completed_documents bigint,
  pending_documents bigint,
  processing_documents bigint,
  rejected_documents bigint,
  total_revenue numeric,
  avg_revenue_per_doc numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is lush-admin or has finance role
  IF NOT (is_lush_admin() OR has_finance_role()) THEN
    RAISE EXCEPTION 'Access denied. Only admin or finance users can access this function.';
  END IF;
  
  RETURN QUERY
  SELECT 
    'Regular Users'::text as user_type,
    COUNT(*)::bigint as total_documents,
    COUNT(*) FILTER (WHERE d.status = 'completed')::bigint as completed_documents,
    COUNT(*) FILTER (WHERE d.status = 'pending')::bigint as pending_documents,
    COUNT(*) FILTER (WHERE d.status = 'processing')::bigint as processing_documents,
    COUNT(*) FILTER (WHERE d.status = 'rejected')::bigint as rejected_documents,
    COALESCE(SUM(d.total_cost), 0) as total_revenue,
    CASE 
      WHEN COUNT(*) > 0 THEN COALESCE(SUM(d.total_cost), 0) / COUNT(*)::numeric
      ELSE 0 
    END as avg_revenue_per_doc
  FROM documents d
  JOIN profiles p ON d.user_id = p.id
  WHERE p.role = 'user'
    AND (d.is_internal_use IS NULL OR d.is_internal_use = false)  -- NEW FILTER
    AND (start_date IS NULL OR d.created_at >= start_date::timestamptz)
    AND (end_date IS NULL OR d.created_at <= end_date::timestamptz)
  
  UNION ALL
  
  SELECT 
    'Authenticators'::text as user_type,
    COUNT(*)::bigint as total_documents,
    COUNT(*) FILTER (WHERE d.status = 'completed')::bigint as completed_documents,
    COUNT(*) FILTER (WHERE d.status = 'pending')::bigint as pending_documents,
    COUNT(*) FILTER (WHERE d.status = 'processing')::bigint as processing_documents,
    COUNT(*) FILTER (WHERE d.status = 'rejected')::bigint as rejected_documents,
    COALESCE(SUM(d.total_cost), 0) as total_revenue,
    CASE 
      WHEN COUNT(*) > 0 THEN COALESCE(SUM(d.total_cost), 0) / COUNT(*)::numeric
      ELSE 0 
    END as avg_revenue_per_doc
  FROM documents d
  JOIN profiles p ON d.user_id = p.id
  WHERE p.role = 'authenticator'
    AND (d.is_internal_use IS NULL OR d.is_internal_use = false)  -- NEW FILTER
    AND (start_date IS NULL OR d.created_at >= start_date::timestamptz)
    AND (end_date IS NULL OR d.created_at <= end_date::timestamptz);
END;
$$;

-- 5. Update get_enhanced_translation_stats_filtered (from 20250122000003)
CREATE OR REPLACE FUNCTION get_enhanced_translation_stats_filtered(
    start_date TIMESTAMP DEFAULT NULL,
    end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
    total_documents BIGINT,
    total_revenue NUMERIC,
    user_uploads_total BIGINT,
    user_uploads_revenue NUMERIC,
    authenticator_uploads_total BIGINT,
    authenticator_uploads_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_documents,
        COALESCE(SUM(total_cost), 0) as total_revenue,
        COUNT(*) FILTER (WHERE uploaded_by IS NULL OR uploaded_by = 'user') as user_uploads_total,
        COALESCE(SUM(total_cost) FILTER (WHERE uploaded_by IS NULL OR uploaded_by = 'user'), 0) as user_uploads_revenue,
        COUNT(*) FILTER (WHERE uploaded_by = 'authenticator') as authenticator_uploads_total,
        COALESCE(SUM(total_cost) FILTER (WHERE uploaded_by = 'authenticator'), 0) as authenticator_uploads_revenue
    FROM documents
    WHERE (start_date IS NULL OR created_at >= start_date)
      AND (end_date IS NULL OR created_at <= end_date)
      AND (is_internal_use IS NULL OR is_internal_use = false);  -- NEW FILTER
END;
$$ LANGUAGE plpgsql;

-- 6. Update get_user_type_breakdown_filtered (from 20250122000003)
CREATE OR REPLACE FUNCTION get_user_type_breakdown_filtered(
    start_date TIMESTAMP DEFAULT NULL,
    end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
    user_type TEXT,
    total_documents BIGINT,
    completed_documents BIGINT,
    pending_documents BIGINT,
    rejected_documents BIGINT,
    total_revenue NUMERIC,
    avg_revenue_per_doc NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN d.uploaded_by = 'authenticator' THEN 'Authenticators'
            ELSE 'Regular Users'
        END as user_type,
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE d.status = 'completed') as completed_documents,
        COUNT(*) FILTER (WHERE d.status = 'pending') as pending_documents,
        COUNT(*) FILTER (WHERE d.status = 'rejected') as rejected_documents,
        COALESCE(SUM(d.total_cost), 0) as total_revenue,
        COALESCE(AVG(d.total_cost), 0) as avg_revenue_per_doc
    FROM documents d
    WHERE (start_date IS NULL OR d.created_at >= start_date)
      AND (end_date IS NULL OR d.created_at <= end_date)
      AND (d.is_internal_use IS NULL OR d.is_internal_use = false)  -- NEW FILTER
    GROUP BY 
        CASE 
            WHEN d.uploaded_by = 'authenticator' THEN 'Authenticators'
            ELSE 'Regular Users'
        END
    ORDER BY user_type;
END;
$$ LANGUAGE plpgsql;

-- Add helper function to check finance role
CREATE OR REPLACE FUNCTION has_finance_role(user_id_param uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If no user_id provided, use current user
  IF user_id_param IS NULL THEN
    user_id_param := auth.uid();
  END IF;
  
  -- Check if user exists and has finance role
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = user_id_param 
    AND profiles.role = 'finance'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION has_finance_role(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION has_finance_role(uuid) IS 'Check if user has finance role';

-- Add comments to updated functions
COMMENT ON FUNCTION get_translation_stats_filtered(TIMESTAMP, TIMESTAMP) IS 'Get translation statistics with date filter, excluding internal use documents';
COMMENT ON FUNCTION get_translation_stats(text, text) IS 'Get translation statistics for Admin Dashboard, excluding internal use documents';
COMMENT ON FUNCTION get_enhanced_translation_stats(text, text) IS 'Get enhanced translation statistics with user type separation, excluding internal use documents';
COMMENT ON FUNCTION get_user_type_breakdown(text, text) IS 'Get detailed breakdown of documents by user type, excluding internal use documents';
COMMENT ON FUNCTION get_enhanced_translation_stats_filtered(TIMESTAMP, TIMESTAMP) IS 'Get enhanced translation statistics with date filter, excluding internal use documents';
COMMENT ON FUNCTION get_user_type_breakdown_filtered(TIMESTAMP, TIMESTAMP) IS 'Get user type breakdown with date filter, excluding internal use documents';

