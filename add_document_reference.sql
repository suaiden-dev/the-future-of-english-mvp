-- Migração para adicionar referência direta entre documents e documents_to_be_verified
-- Filename: add_document_reference.sql

-- 1. Adicionar coluna document_id na tabela documents_to_be_verified
ALTER TABLE documents_to_be_verified 
ADD COLUMN document_id UUID REFERENCES documents(id) ON DELETE CASCADE;

-- 2. Criar índice para performance
CREATE INDEX idx_documents_to_be_verified_document_id 
ON documents_to_be_verified(document_id);

-- 3. Atualizar registros existentes baseando-se em user_id + filename
-- (Este UPDATE assume que user_id + filename é único na tabela documents)
UPDATE documents_to_be_verified 
SET document_id = (
    SELECT d.id 
    FROM documents d 
    WHERE d.user_id = documents_to_be_verified.user_id 
    AND (d.original_filename = documents_to_be_verified.filename 
         OR d.filename = documents_to_be_verified.filename)
    LIMIT 1
);

-- 4. Opcional: Tornar document_id obrigatório após migração
-- (Descomente se quiser tornar obrigatório)
-- ALTER TABLE documents_to_be_verified 
-- ALTER COLUMN document_id SET NOT NULL;

-- 5. Criar view para facilitar consultas
CREATE OR REPLACE VIEW documents_verification_view AS
SELECT 
    d.id as document_id,
    d.user_id,
    d.filename,
    d.original_filename,
    d.file_path,
    d.status as document_status,
    d.created_at as document_created_at,
    dtbv.id as verification_id,
    dtbv.status as verification_status,
    dtbv.created_at as verification_created_at,
    dtbv.updated_at as verification_updated_at
FROM documents d
LEFT JOIN documents_to_be_verified dtbv ON d.id = dtbv.document_id;

-- 6. Opcional: Remover filename da tabela documents_to_be_verified
-- (Descomente se não precisar mais do filename duplicado)
-- ALTER TABLE documents_to_be_verified DROP COLUMN filename;
