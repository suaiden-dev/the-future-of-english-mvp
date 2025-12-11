# Sistema de Limpeza Completo - Stripe e Zelle

## ✅ **Solução Implementada**

Agora o sistema limpa automaticamente documentos não pagos para **ambos os métodos de pagamento**:

### **1. Stripe:**
- **Status:** `stripe_pending`
- **Limpeza:** Banco + Sessões Stripe + Storage
- **Tempo:** 2 minutos (teste) / 30 minutos (produção)

### **2. Zelle:**
- **Status:** `pending` + `payment_method = 'zelle'` (usuário escolheu Zelle mas não confirmou)
- **Limpeza:** Banco (sem storage, pois Zelle não usa Stripe)
- **Tempo:** 2 minutos (teste) / 30 minutos (produção)

## 🔄 **Como Funciona**

### **Cron Job Executa a Cada 2 Minutos:**

```sql
-- 1. Limpa documentos Stripe não pagos
SELECT id, user_id, filename, file_url
FROM documents 
WHERE status = 'stripe_pending' 
AND updated_at < NOW() - INTERVAL '2 minutes'

-- 2. Limpa documentos Zelle não pagos (usuário escolheu Zelle mas não confirmou)
SELECT id, user_id, filename, file_url
FROM documents 
WHERE status = 'pending' 
AND payment_method = 'zelle'
AND updated_at < NOW() - INTERVAL '2 minutes'
```

### **Verificações de Segurança:**
- ✅ **Verifica se já existe pagamento** antes de remover
- ✅ **Remove sessões Stripe** associadas
- ✅ **Remove documentos** do banco
- ✅ **Logs detalhados** para monitoramento

## 📊 **Status dos Documentos**

| Método | Status Inicial | Status Após Upload | Status Após Pagamento |
|--------|----------------|-------------------|----------------------|
| **Stripe** | `pending` | `stripe_pending` | `processing` |
| **Zelle** | `pending` | `pending` | `pending_payment_verification` |

## 🧪 **Como Testar**

### **Teste Stripe:**
1. Upload documento → Escolher Stripe
2. Fechar navegador sem pagar
3. Aguardar 2 minutos
4. Verificar se documento foi removido

### **Teste Zelle:**
1. Upload documento → Escolher Zelle
2. Fechar navegador sem pagar
3. Aguardar 2 minutos
4. Verificar se documento foi removido

## 📈 **Monitoramento**

### **Verificar Documentos Pendentes:**
```sql
-- Stripe pendentes
SELECT COUNT(*) FROM documents WHERE status = 'stripe_pending';

-- Zelle pendentes
SELECT COUNT(*) FROM documents 
WHERE status = 'pending' AND payment_method = 'zelle';
```

### **Verificar Cron Job:**
```sql
-- Status do cron job
SELECT * FROM cron.job WHERE active = true;

-- Histórico de execuções
SELECT * FROM cron.job_run_details 
WHERE jobid = 2 
ORDER BY start_time DESC 
LIMIT 5;
```

## ⚙️ **Configuração para Produção**

Quando terminar os testes, altere para 30 minutos:

```sql
-- Remover cron job atual
SELECT cron.unschedule('cleanup-stripe-simple');

-- Criar novo com 30 minutos
SELECT cron.schedule(
    'cleanup-payments-production',
    '*/30 * * * *', -- A cada 30 minutos
    'SELECT cleanup_stripe_pending_simple();'
);
```

## 🎯 **Resultado Final**

**✅ Sistema de limpeza automática 24/7 para ambos os métodos de pagamento!**

- **Stripe:** Limpeza completa (banco + storage + sessões)
- **Zelle:** Limpeza do banco (sem storage)
- **Tempo:** 2 minutos para teste, 30 minutos para produção
- **Confiável:** Usa cron job nativo do Supabase
- **Seguro:** Verifica pagamentos antes de remover
