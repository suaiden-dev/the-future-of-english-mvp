-- Migration: Remove prevent_duplicate_documents trigger and function
-- This removes the specific trigger that's causing "Duplicate document detected" errors in n8n

-- 1. Drop the trigger that prevents duplicate documents
DROP TRIGGER IF EXISTS prevent_duplicate_documents ON documents_to_be_verified;

-- 2. Drop the function that validates duplicate documents
-- First, get the exact function name by checking what function the trigger was using
DO $$
DECLARE
    func_name TEXT;
BEGIN
    -- Find the function name used by the trigger
    SELECT p.proname INTO func_name
    FROM pg_proc p
    WHERE p.prosrc LIKE '%Duplicate document detected: Document with same name uploaded by same user within 5 minutes%';
    
    -- Drop the function if it exists
    IF func_name IS NOT NULL THEN
        EXECUTE format('DROP FUNCTION IF EXISTS %I() CASCADE', func_name);
        RAISE NOTICE 'Dropped function: %', func_name;
    ELSE
        RAISE NOTICE 'No duplicate validation function found to drop';
    END IF;
END
$$;

-- 3. Alternative: Drop common function names that might be used
DROP FUNCTION IF EXISTS check_duplicate_documents() CASCADE;
DROP FUNCTION IF EXISTS prevent_duplicate_documents() CASCADE;
DROP FUNCTION IF EXISTS validate_document_duplicates() CASCADE;

-- 4. Verify the trigger has been removed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'prevent_duplicate_documents' 
        AND event_object_table = 'documents_to_be_verified'
    ) THEN
        RAISE NOTICE '✅ SUCCESS: prevent_duplicate_documents trigger has been removed';
    ELSE
        RAISE NOTICE '❌ WARNING: prevent_duplicate_documents trigger still exists';
    END IF;
END
$$;

-- 5. Log the completion
SELECT 'Duplicate document validation trigger removed successfully - n8n should now work without duplicate errors' as migration_result;
