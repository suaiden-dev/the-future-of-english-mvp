-- Script para debugar documentos no dashboard do autenticador
-- Verificar documentos na tabela documents_to_be_verified com status pending

-- 1. Verificar quantos documentos existem na tabela documents_to_be_verified
SELECT 
  'documents_to_be_verified' as tabela,
  status,
  COUNT(*) as total
FROM documents_to_be_verified 
GROUP BY status
ORDER BY status;

-- 2. Verificar documentos pendentes na tabela documents_to_be_verified
SELECT 
  id,
  user_id,
  filename,
  status,
  created_at,
  client_name
FROM documents_to_be_verified 
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar documentos na tabela documents (fonte principal)
SELECT 
  'documents' as tabela,
  status,
  COUNT(*) as total
FROM documents 
GROUP BY status
ORDER BY status;

-- 4. Verificar se há documentos na tabela documents que não estão na documents_to_be_verified
SELECT 
  d.id,
  d.user_id,
  d.filename,
  d.status as doc_status,
  d.client_name,
  CASE 
    WHEN dtv.id IS NOT NULL THEN 'EXISTS_IN_VERIFICATION'
    ELSE 'NOT_IN_VERIFICATION'
  END as verification_status,
  dtv.status as verification_status_value
FROM documents d
LEFT JOIN documents_to_be_verified dtv ON (
  d.user_id = dtv.user_id AND 
  d.filename = dtv.filename AND 
  d.client_name = dtv.client_name
)
WHERE d.status != 'completed' -- Documentos que não estão completos
ORDER BY d.created_at DESC
LIMIT 20;

-- 5. Verificar se há documentos na documents_to_be_verified que não estão na documents
SELECT 
  dtv.id,
  dtv.user_id,
  dtv.filename,
  dtv.status as verification_status,
  dtv.client_name,
  CASE 
    WHEN d.id IS NOT NULL THEN 'EXISTS_IN_MAIN'
    ELSE 'NOT_IN_MAIN'
  END as main_status,
  d.status as main_status_value
FROM documents_to_be_verified dtv
LEFT JOIN documents d ON (
  dtv.user_id = d.user_id AND 
  dtv.filename = d.filename AND 
  dtv.client_name = d.client_name
)
WHERE dtv.status = 'pending'
ORDER BY dtv.created_at DESC
LIMIT 20;

-- 6. Verificar políticas RLS para documents_to_be_verified
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'documents_to_be_verified';

-- 7. Verificar se o usuário atual tem permissão para ver os documentos
-- (Este query precisa ser executado com o contexto do usuário autenticado)
SELECT 
  auth.uid() as current_user_id,
  p.role as user_role
FROM profiles p 
WHERE p.id = auth.uid();
