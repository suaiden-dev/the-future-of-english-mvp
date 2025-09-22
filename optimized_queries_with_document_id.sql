-- Consultas otimizadas após implementar document_id

-- 1. Buscar documentos para verificação com filtros por data e excluindo user específico
SELECT 
    d.id,
    d.user_id,
    d.original_filename,
    d.filename,
    d.status,
    d.created_at,
    dtbv.status as verification_status
FROM documents d
LEFT JOIN documents_to_be_verified dtbv ON d.id = dtbv.document_id
WHERE d.created_at >= CURRENT_DATE - INTERVAL '30 days'
AND d.user_id != 'dce85ff8-bdde-4f52-b0ed-be4b48bb9ad1' -- ID específico a excluir
ORDER BY d.created_at DESC;

-- 2. Estatísticas de documentos para verificação por período
SELECT 
    DATE(d.created_at) as date,
    COUNT(DISTINCT d.id) as total_documents,
    COUNT(DISTINCT dtbv.id) as documents_to_verify,
    COUNT(DISTINCT CASE WHEN dtbv.status = 'pending' THEN dtbv.id END) as pending_verification,
    COUNT(DISTINCT CASE WHEN dtbv.status = 'approved' THEN dtbv.id END) as approved,
    COUNT(DISTINCT CASE WHEN dtbv.status = 'rejected' THEN dtbv.id END) as rejected
FROM documents d
LEFT JOIN documents_to_be_verified dtbv ON d.id = dtbv.document_id
WHERE d.created_at >= CURRENT_DATE - INTERVAL '7 days'
AND d.user_id != 'dce85ff8-bdde-4f52-b0ed-be4b48bb9ad1'
GROUP BY DATE(d.created_at)
ORDER BY date DESC;

-- 3. Buscar documentos específicos de um usuário para verificação
SELECT 
    d.id,
    d.original_filename,
    d.status as document_status,
    dtbv.status as verification_status,
    dtbv.created_at as verification_requested_at
FROM documents d
INNER JOIN documents_to_be_verified dtbv ON d.id = dtbv.document_id
WHERE d.user_id = $1  -- Parâmetro do usuário
ORDER BY dtbv.created_at DESC;

-- 4. Performance: verificar documentos pendentes sem ambiguidade
SELECT 
    d.id,
    d.user_id,
    d.original_filename,
    d.filename,
    dtbv.created_at as requested_at
FROM documents d
INNER JOIN documents_to_be_verified dtbv ON d.id = dtbv.document_id
WHERE dtbv.status = 'pending'
AND d.user_id != 'dce85ff8-bdde-4f52-b0ed-be4b48bb9ad1'
ORDER BY dtbv.created_at ASC;

-- 5. Estatísticas de usuários únicos por período (sem duplicação)
SELECT 
    COUNT(DISTINCT d.user_id) as unique_users,
    COUNT(DISTINCT d.id) as total_documents,
    COUNT(DISTINCT dtbv.id) as verification_requests
FROM documents d
LEFT JOIN documents_to_be_verified dtbv ON d.id = dtbv.document_id
WHERE d.created_at >= CURRENT_DATE - INTERVAL '30 days'
AND d.user_id != 'dce85ff8-bdde-4f52-b0ed-be4b48bb9ad1';
