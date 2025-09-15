-- Cria um novo tipo enum com o valor 'draft' adicionado
CREATE TYPE document_status_new AS ENUM ('pending', 'processing', 'completed', 'failed', 'draft');

-- Atualiza a coluna para usar o novo tipo enum
ALTER TABLE documents ALTER COLUMN status TYPE document_status_new USING status::text::document_status_new;

-- Remove o tipo enum antigo e renomeia o novo
DROP TYPE document_status;
ALTER TYPE document_status_new RENAME TO document_status;
