-- ============================================================================
-- Migration: Secure Storage Buckets
-- Projeto: The Future of English
-- Data: 2026-01-30
-- 
-- ATENÇÃO: Esta migration deve ser executada APÓS:
-- 1. Deploy das Edge Functions (document-proxy, n8n-storage-access)
-- 2. Atualização do frontend para usar getSecureUrl
-- 3. Atualização dos webhooks n8n para usar URLs de proxy
-- ============================================================================

-- 1. PRIVATIZAR BUCKETS SENSÍVEIS
-- Após isso, URLs públicas antigas deixarão de funcionar
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('documents', 'payment-receipts', 'arquivosn8n', 'arquivosN8Nclientes');

-- 2. REMOVER POLÍTICA PERMISSIVA DE TESTE
DROP POLICY IF EXISTS "Teste de Upload Super Permissivo" ON storage.objects;

-- 3. POLÍTICA: QUALQUER USUÁRIO AUTENTICADO PODE VER DOCUMENTOS
-- Regra TFOE: user, admin, authenticator - todos podem visualizar
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
CREATE POLICY "Authenticated users can view documents" 
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('documents', 'payment-receipts', 'arquivosN8Nclientes'));

-- 4. POLÍTICA: UPLOAD RESTRITO À PASTA DO PRÓPRIO USUÁRIO
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
CREATE POLICY "Users can upload to own folder" 
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'authenticator')
  )
);

-- 5. POLÍTICA: USUÁRIOS PODEM FAZER UPLOAD DE RECIBOS NA SUA PASTA
DROP POLICY IF EXISTS "Users can upload own payment receipts" ON storage.objects;
CREATE POLICY "Users can upload own payment receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. POLÍTICA: SERVICE ROLE (N8N) TEM ACESSO TOTAL
DROP POLICY IF EXISTS "Service role full access" ON storage.objects;
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL TO service_role
USING (bucket_id IN ('documents', 'payment-receipts', 'arquivosn8n', 'arquivosN8Nclientes', 'ticketsn8n'))
WITH CHECK (bucket_id IN ('documents', 'payment-receipts', 'arquivosn8n', 'arquivosN8Nclientes', 'ticketsn8n'));

-- 7. MANTER LOGOS PÚBLICOS (não contém dados sensíveis)
-- Não alterar bucket 'logos'

-- ============================================================================
-- ROLLBACK (se necessário):
-- UPDATE storage.buckets SET public = true WHERE id IN ('documents', 'payment-receipts');
-- ============================================================================
