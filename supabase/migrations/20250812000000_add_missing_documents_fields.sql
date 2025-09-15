-- Migration: Add missing fields to documents table
-- This migration adds the missing fields that are used in the application

-- Add missing columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_id text,
ADD COLUMN IF NOT EXISTS idioma_raiz text,
ADD COLUMN IF NOT EXISTS tipo_trad text,
ADD COLUMN IF NOT EXISTS valor numeric(10,2),
ADD COLUMN IF NOT EXISTS is_bank_statement boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS client_name text;

-- Update existing records to have default values
UPDATE documents 
SET 
  idioma_raiz = COALESCE(idioma_raiz, 'Portuguese'),
  tipo_trad = COALESCE(tipo_trad, 'Notorizado'),
  valor = COALESCE(valor, total_cost),
  is_bank_statement = COALESCE(is_bank_statement, false)
WHERE idioma_raiz IS NULL OR tipo_trad IS NULL OR valor IS NULL OR is_bank_statement IS NULL;

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_documents_file_id ON documents(file_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_name ON documents(client_name);
CREATE INDEX IF NOT EXISTS idx_documents_is_bank_statement ON documents(is_bank_statement);

-- Add comments to document the new fields
COMMENT ON COLUMN documents.file_id IS 'File identifier for storage reference';
COMMENT ON COLUMN documents.idioma_raiz IS 'Source language of the document';
COMMENT ON COLUMN documents.tipo_trad IS 'Type of translation (Certificado/Notorizado)';
COMMENT ON COLUMN documents.valor IS 'Document value/cost';
COMMENT ON COLUMN documents.is_bank_statement IS 'Whether this is a bank statement document';
COMMENT ON COLUMN documents.client_name IS 'Name of the client for this document';
