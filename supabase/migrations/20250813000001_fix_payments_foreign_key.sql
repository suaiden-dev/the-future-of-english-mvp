-- Migration: Fix payments table foreign key reference
-- The payments table is currently referencing documents_to_be_verified instead of documents

-- Drop the existing foreign key constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_document_id_fkey;

-- Add the correct foreign key constraint to reference the documents table
ALTER TABLE payments 
ADD CONSTRAINT payments_document_id_fkey 
FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

-- Verify the constraint was created correctly
-- This will show the current foreign key relationships
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
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='payments';
