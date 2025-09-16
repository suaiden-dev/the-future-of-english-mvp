-- Script para limpar documentos duplicados na tabela documents_to_be_verified
-- Mantém apenas o documento mais recente para cada combinação user_id + filename

-- 1. Identificar duplicatas
WITH duplicate_docs AS (
  SELECT 
    user_id,
    filename,
    COUNT(*) as duplicate_count,
    MAX(created_at) as latest_created_at
  FROM documents_to_be_verified
  GROUP BY user_id, filename
  HAVING COUNT(*) > 1
),
-- 2. Identificar IDs dos documentos duplicados (exceto o mais recente)
duplicates_to_remove AS (
  SELECT dtbv.id
  FROM documents_to_be_verified dtbv
  INNER JOIN duplicate_docs dd ON dtbv.user_id = dd.user_id 
    AND dtbv.filename = dd.filename
  WHERE dtbv.created_at < dd.latest_created_at
)
-- 3. Mostrar quais documentos serão removidos (apenas para visualização)
SELECT 
  'Documentos duplicados que serão removidos:' as info,
  dtbv.id,
  dtbv.filename,
  dtbv.user_id,
  dtbv.created_at,
  dtbv.status
FROM documents_to_be_verified dtbv
INNER JOIN duplicates_to_remove dtr ON dtbv.id = dtr.id
ORDER BY dtbv.user_id, dtbv.filename, dtbv.created_at;

-- 4. Para executar a remoção, descomente as linhas abaixo:
-- DELETE FROM documents_to_be_verified 
-- WHERE id IN (SELECT id FROM duplicates_to_remove);

-- 5. Verificar se ainda há duplicatas após a limpeza
-- SELECT 
--   user_id,
--   filename,
--   COUNT(*) as count
-- FROM documents_to_be_verified
-- GROUP BY user_id, filename
-- HAVING COUNT(*) > 1;
