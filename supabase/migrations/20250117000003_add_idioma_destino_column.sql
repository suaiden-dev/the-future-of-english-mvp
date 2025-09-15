-- Migration: Add idioma_destino column to documents table
-- This migration adds the missing idioma_destino column that is used in the application

-- Add idioma_destino column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS idioma_destino text DEFAULT 'English';

-- Update existing records to have default value
UPDATE documents 
SET idioma_destino = COALESCE(idioma_destino, 'English')
WHERE idioma_destino IS NULL;

-- Add comment to document the new field
COMMENT ON COLUMN documents.idioma_destino IS 'Target language for translation';
