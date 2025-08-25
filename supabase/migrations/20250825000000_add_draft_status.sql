-- Adiciona o valor 'draft' ao enum document_status
DO $$ BEGIN
    -- Verifica se o tipo enum já existe
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
        -- Adiciona o valor 'draft' se ele ainda não existir
        ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'draft';
    ELSE
        -- Cria o enum se ele não existir
        CREATE TYPE document_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'draft');
    END IF;
END $$;
