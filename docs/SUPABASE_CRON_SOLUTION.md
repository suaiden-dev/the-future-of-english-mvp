# Solução Simplificada com Supabase Cron

## ✅ **Solução Final - Apenas 1 Edge Function + 1 Cron Job**

### **O que temos agora:**

1. **1 Edge Function:** `cleanup-stripe-pending` (já existia)
2. **1 Função SQL:** `cleanup_stripe_pending_simple()` 
3. **1 Cron Job:** Executa a cada 2 minutos automaticamente

### **Como funciona:**

1. **Upload de documento** → Status: `stripe_pending`
2. **Usuário fecha navegador** → Documento fica no banco
3. **Cron job executa a cada 2 minutos** → Remove documentos não pagos
4. **Limpeza completa:** Banco + Sessões Stripe

### **Configuração atual:**

```sql
-- Cron job ativo
SELECT * FROM cron.job WHERE active = true;

-- Resultado:
-- jobid: 2
-- jobname: cleanup-stripe-simple  
-- schedule: */2 * * * * (a cada 2 minutos)
-- command: SELECT cleanup_stripe_pending_simple();
-- active: true
```

### **O que a função faz:**

1. **Busca documentos** `stripe_pending` há mais de 2 minutos
2. **Verifica se tem pagamento** - se tiver, pula
3. **Remove sessão Stripe** da tabela `stripe_sessions`
4. **Remove documento** da tabela `documents`
5. **Loga resultado** no console do Supabase

### **Monitoramento:**

- **Logs:** Supabase Dashboard > Logs
- **Cron jobs:** `SELECT * FROM cron.job;`
- **Documentos pendentes:** `SELECT COUNT(*) FROM documents WHERE status = 'stripe_pending';`

### **Vantagens:**

- ✅ **Simples:** Apenas 1 função SQL + 1 cron job
- ✅ **Automático:** Executa 24/7 no Supabase
- ✅ **Eficiente:** Limpeza direta no banco
- ✅ **Confiável:** Usa infraestrutura do Supabase
- ✅ **Sem dependências externas**

### **Para produção:**

Quando terminar os testes, altere o tempo para 30 minutos:

```sql
-- Remover cron job atual
SELECT cron.unschedule('cleanup-stripe-simple');

-- Criar novo com 30 minutos
SELECT cron.schedule(
    'cleanup-stripe-production',
    '*/30 * * * *', -- A cada 30 minutos
    'SELECT cleanup_stripe_pending_simple();'
);
```

## 🎯 **Resultado:**

**Sistema de limpeza automática funcionando 24/7 com apenas 1 função SQL + 1 cron job do Supabase!** 🚀
