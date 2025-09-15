-- Fix: Add DEFAULT value for source_language in translated_documents table
-- This prevents NOT NULL constraint violations when inserting documents
ALTER TABLE translated_documents 
ALTER COLUMN source_language SET DEFAULT 'portuguese';

-- Also ensure target_language has a default
ALTER TABLE translated_documents 
ALTER COLUMN target_language SET DEFAULT 'english';

-- Add helpful comment
COMMENT ON COLUMN translated_documents.source_language IS 'Original language of the document, defaults to portuguese';
COMMENT ON COLUMN translated_documents.target_language IS 'Target language for translation, defaults to english';
