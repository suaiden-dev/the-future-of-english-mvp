-- Migration: Add correction tracking fields to documents_to_be_verified table
-- Date: 2025-01-13
-- Description: Add fields to track document corrections and their relationship to original documents

-- Verificar se a tabela existe antes de adicionar colunas
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents_to_be_verified') THEN
        RAISE EXCEPTION 'Table documents_to_be_verified does not exist';
    END IF;
END $$;

-- Add new columns for correction tracking (only if they don't exist)
DO $$
BEGIN
    -- Add parent_document_id column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents_to_be_verified' AND column_name = 'parent_document_id') THEN
        ALTER TABLE documents_to_be_verified ADD COLUMN parent_document_id UUID REFERENCES documents_to_be_verified(id);
        RAISE NOTICE 'Added parent_document_id column';
    ELSE
        RAISE NOTICE 'parent_document_id column already exists';
    END IF;
    
    -- Add is_correction column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents_to_be_verified' AND column_name = 'is_correction') THEN
        ALTER TABLE documents_to_be_verified ADD COLUMN is_correction BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_correction column';
    ELSE
        RAISE NOTICE 'is_correction column already exists';
    END IF;
    
    -- Add original_document_id column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents_to_be_verified' AND column_name = 'original_document_id') THEN
        ALTER TABLE documents_to_be_verified ADD COLUMN original_document_id UUID;
        RAISE NOTICE 'Added original_document_id column';
    ELSE
        RAISE NOTICE 'original_document_id column already exists';
    END IF;
    
    -- Add correction_reason column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents_to_be_verified' AND column_name = 'correction_reason') THEN
        ALTER TABLE documents_to_be_verified ADD COLUMN correction_reason TEXT;
        RAISE NOTICE 'Added correction_reason column';
    ELSE
        RAISE NOTICE 'correction_reason column already exists';
    END IF;
END $$;

-- Add indexes for better performance on correction queries (only if they don't exist)
DO $$
BEGIN
    -- Add is_correction index
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'documents_to_be_verified' AND indexname = 'idx_documents_to_be_verified_is_correction') THEN
        CREATE INDEX idx_documents_to_be_verified_is_correction ON documents_to_be_verified(is_correction);
        RAISE NOTICE 'Added is_correction index';
    ELSE
        RAISE NOTICE 'is_correction index already exists';
    END IF;
    
    -- Add parent_document_id index
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'documents_to_be_verified' AND indexname = 'idx_documents_to_be_verified_parent_document_id') THEN
        CREATE INDEX idx_documents_to_be_verified_parent_document_id ON documents_to_be_verified(parent_document_id);
        RAISE NOTICE 'Added parent_document_id index';
    ELSE
        RAISE NOTICE 'parent_document_id index already exists';
    END IF;
    
    -- Add original_document_id index
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'documents_to_be_verified' AND indexname = 'idx_documents_to_be_verified_original_document_id') THEN
        CREATE INDEX idx_documents_to_be_verified_original_document_id ON documents_to_be_verified(original_document_id);
        RAISE NOTICE 'Added original_document_id index';
    ELSE
        RAISE NOTICE 'original_document_id index already exists';
    END IF;
END $$;

-- Add comments to document the purpose of new columns
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents_to_be_verified' AND column_name = 'parent_document_id') THEN
        COMMENT ON COLUMN documents_to_be_verified.parent_document_id IS 'Reference to the parent document that was rejected and led to this correction';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents_to_be_verified' AND column_name = 'is_correction') THEN
        COMMENT ON COLUMN documents_to_be_verified.is_correction IS 'Flag indicating if this document is a correction of a previously rejected document';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents_to_be_verified' AND column_name = 'original_document_id') THEN
        COMMENT ON COLUMN documents_to_be_verified.original_document_id IS 'Reference to the original document that was rejected';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents_to_be_verified' AND column_name = 'correction_reason') THEN
        COMMENT ON COLUMN documents_to_be_verified.correction_reason IS 'Reason why the correction was needed (e.g., rejection reason)';
    END IF;
END $$;

-- Log final status
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully. Checking final table structure...';
    
    -- Show final table structure
    RAISE NOTICE 'Final columns in documents_to_be_verified:';
    FOR col IN 
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'documents_to_be_verified' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: % (%)', col.column_name, col.data_type, col.is_nullable;
    END LOOP;
END $$;
