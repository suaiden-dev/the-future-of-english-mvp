-- Atualizar Cron Job para 30 minutos
-- Executar este script no Supabase SQL Editor

-- 1. Remover o cron job atual (2 minutos)
SELECT cron.unschedule('cleanup-stripe-simple');

-- 2. Criar novo cron job com 30 minutos
SELECT cron.schedule(
    'cleanup-payments-production',
    '*/30 * * * *', -- A cada 30 minutos
    'SELECT cleanup_stripe_pending_simple();'
);

-- 3. Verificar se o cron job foi criado corretamente
SELECT * FROM cron.job WHERE active = true;

-- 4. Verificar o histórico de execuções (opcional)
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-payments-production')
ORDER BY start_time DESC 
LIMIT 5;
