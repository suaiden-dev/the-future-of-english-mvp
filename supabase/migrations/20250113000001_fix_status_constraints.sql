-- Fix status constraints to allow 'rejected' status
-- This migration fixes the issue where documents could not be marked as rejected

-- 1. Fix documents_to_be_verified status constraint
ALTER TABLE documents_to_be_verified 
DROP CONSTRAINT IF EXISTS documentos_a_serem_verificados_status_check;

ALTER TABLE documents_to_be_verified 
ADD CONSTRAINT documents_to_be_verified_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'rejected'));

-- 2. Fix notifications type constraint to allow 'translation_rejected'
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('document_upload', 'document_approved', 'document_rejected', 'translation_ready', 'translation_rejected', 'translation_status', 'system'));

-- Add comments for documentation
COMMENT ON CONSTRAINT documents_to_be_verified_status_check ON documents_to_be_verified IS 'Allows documents to have rejected status for correction tracking';
COMMENT ON CONSTRAINT notifications_type_check ON notifications IS 'Allows translation_rejected notification type for rejected documents';
