-- Adicionar status 'stripe_pending' à constraint de check da tabela documents
-- Este status é usado para documentos que estão aguardando pagamento via Stripe

-- Primeiro, vamos verificar a constraint atual
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'documents'::regclass 
AND conname = 'documents_status_check';

-- Remover a constraint atual
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;

-- Adicionar a nova constraint com o status stripe_pending
ALTER TABLE documents ADD CONSTRAINT documents_status_check 
CHECK (status IN ('pending', 'stripe_pending', 'processing', 'completed', 'cancelled'));

-- Verificar se a constraint foi aplicada corretamente
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'documents'::regclass 
AND conname = 'documents_status_check';
