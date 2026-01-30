-- ============================================================================
-- Migration: Enable RLS on Critical Tables
-- Projeto: The Future of English
-- Data: 2026-01-30
-- 
-- Ativar Row Level Security nas tabelas que contêm dados sensíveis
-- ============================================================================

-- 1. ATIVAR RLS NAS TABELAS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_to_be_verified ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS PARA PROFILES
-- Qualquer autenticado pode ver todos os perfis (necessário para exibir nomes)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
CREATE POLICY "Authenticated users can view profiles" 
ON profiles FOR SELECT TO authenticated USING (true);

-- Usuário pode atualizar apenas seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Service role tem acesso total
DROP POLICY IF EXISTS "Service role full access profiles" ON profiles;
CREATE POLICY "Service role full access profiles"
ON profiles FOR ALL TO service_role USING (true);

-- 3. POLÍTICAS PARA DOCUMENTS
-- Qualquer autenticado pode ver todos os documentos
DROP POLICY IF EXISTS "Authenticated users can view documents" ON documents;
CREATE POLICY "Authenticated users can view documents" 
ON documents FOR SELECT TO authenticated USING (true);

-- Usuário pode inserir apenas com seu próprio user_id
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
CREATE POLICY "Users can insert own documents" 
ON documents FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Admins e autenticadores podem atualizar qualquer documento
DROP POLICY IF EXISTS "Admins and authenticators can update documents" ON documents;
CREATE POLICY "Admins and authenticators can update documents" 
ON documents FOR UPDATE TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'authenticator'))
);

-- Service role tem acesso total
DROP POLICY IF EXISTS "Service role full access documents" ON documents;
CREATE POLICY "Service role full access documents"
ON documents FOR ALL TO service_role USING (true);

-- 4. POLÍTICAS PARA DOCUMENTS_TO_BE_VERIFIED
DROP POLICY IF EXISTS "Authenticated users can view docs_to_verify" ON documents_to_be_verified;
CREATE POLICY "Authenticated users can view docs_to_verify" 
ON documents_to_be_verified FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert docs_to_verify" ON documents_to_be_verified;
CREATE POLICY "Users can insert docs_to_verify" 
ON documents_to_be_verified FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins and authenticators can update docs_to_verify" ON documents_to_be_verified;
CREATE POLICY "Admins and authenticators can update docs_to_verify" 
ON documents_to_be_verified FOR UPDATE TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'authenticator'))
);

DROP POLICY IF EXISTS "Service role full access docs_to_verify" ON documents_to_be_verified;
CREATE POLICY "Service role full access docs_to_verify"
ON documents_to_be_verified FOR ALL TO service_role USING (true);

-- 5. POLÍTICAS PARA FOLDERS
DROP POLICY IF EXISTS "Authenticated users can view folders" ON folders;
CREATE POLICY "Authenticated users can view folders" 
ON folders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage own folders" ON folders;
CREATE POLICY "Users can manage own folders" 
ON folders FOR ALL TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access folders" ON folders;
CREATE POLICY "Service role full access folders"
ON folders FOR ALL TO service_role USING (true);

-- ============================================================================
-- VERIFICAÇÃO:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('profiles', 'documents');
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public';
-- ============================================================================
