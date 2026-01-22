-- Migration: Remove affiliate commission trigger from translated_documents
-- The commission is already created when payment is completed, so we don't need this trigger

-- Drop the trigger
DROP TRIGGER IF EXISTS affiliate_commission_on_translation_trigger ON translated_documents;

-- Optionally drop the function if it's not used elsewhere
-- DROP FUNCTION IF EXISTS update_affiliate_commission_on_translation();

