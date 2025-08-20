-- Migration: Create translated_documents table
CREATE TABLE IF NOT EXISTS translated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_document_id uuid REFERENCES documentos_a_serem_verificados(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  folder_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  filename text NOT NULL,
  translated_file_url text NOT NULL,
  source_language text NOT NULL,
  target_language text NOT NULL,
  pages integer DEFAULT 1,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed')),
  total_cost decimal(10,2) NOT NULL DEFAULT 0.00,
  verification_code text UNIQUE NOT NULL,
  is_authenticated boolean DEFAULT true,
  upload_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
); 