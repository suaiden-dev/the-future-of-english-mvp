-- Função para estatísticas de pagamentos com filtro de data
CREATE OR REPLACE FUNCTION get_payment_stats_filtered(
    start_date TIMESTAMP DEFAULT NULL,
    end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
    total_payments BIGINT,
    total_amount NUMERIC,
    avg_payment NUMERIC,
    successful_payments BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as avg_payment,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_payments
    FROM payments
    WHERE (start_date IS NULL OR created_at >= start_date)
      AND (end_date IS NULL OR created_at <= end_date);
END;
$$ LANGUAGE plpgsql;

-- Função para estatísticas de traduções com filtro de data
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
      AND (end_date IS NULL OR created_at <= end_date);
END;
$$ LANGUAGE plpgsql;

-- Função para estatísticas aprimoradas com filtro de data
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
      AND (end_date IS NULL OR created_at <= end_date);
END;
$$ LANGUAGE plpgsql;

-- Função para breakdown por tipo de usuário com filtro de data
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
    GROUP BY 
        CASE 
            WHEN d.uploaded_by = 'authenticator' THEN 'Authenticators'
            ELSE 'Regular Users'
        END
    ORDER BY user_type;
END;
$$ LANGUAGE plpgsql;

-- Conceder permissões para as novas funções
GRANT EXECUTE ON FUNCTION get_payment_stats_filtered TO authenticated;
GRANT EXECUTE ON FUNCTION get_translation_stats_filtered TO authenticated;
GRANT EXECUTE ON FUNCTION get_enhanced_translation_stats_filtered TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_type_breakdown_filtered TO authenticated;
