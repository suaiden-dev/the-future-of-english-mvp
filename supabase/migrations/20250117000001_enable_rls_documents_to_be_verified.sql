-- Migration: Enable Row Level Security on documents_to_be_verified table
-- This migration fixes the authentication issue by enabling RLS which was disabled

-- Enable Row Level Security on documents_to_be_verified table
ALTER TABLE documents_to_be_verified ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled (this is just for documentation purposes)
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'documents_to_be_verified';
