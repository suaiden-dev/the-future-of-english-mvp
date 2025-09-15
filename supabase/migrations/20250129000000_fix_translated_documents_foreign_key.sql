-- Migration: Fix translated_documents foreign key reference
-- The translated_documents table is currently referencing documentos_a_serem_verificados instead of documents_to_be_verified

-- Drop the existing foreign key constraint if it exists
ALTER TABLE translated_documents DROP CONSTRAINT IF EXISTS translated_documents_original_document_id_fkey;

-- Add the correct foreign key constraint to reference documents_to_be_verified table
ALTER TABLE translated_documents 
ADD CONSTRAINT translated_documents_original_document_id_fkey 
FOREIGN KEY (original_document_id) REFERENCES documents_to_be_verified(id) ON DELETE CASCADE;

-- Verify the constraint was created correctly
-- This will show the current foreign key relationships for translated_documents
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND tc.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='translated_documents'
    AND kcu.column_name='original_document_id';
