# Configuração de Tempos para Teste

## ⚠️ **Configuração de Teste Ativa**

Os tempos foram reduzidos para facilitar os testes do sistema de limpeza de documentos Stripe.

### **Tempos Configurados para Teste:**

| Componente | Tempo Original | Tempo de Teste | Arquivo |
|------------|----------------|----------------|---------|
| **Edge Function Cleanup** | 30 minutos | **2 minutos** | `cleanup-stripe-pending/index.ts` |
| **Agendador Automático** | 30 minutos | **2 minutos** | `stripeCleanupScheduler.ts` |
| **Hook Timeout** | 30 minutos | **2 minutos** | `useStripeCleanup.ts` |

## 🧪 **Como Testar**

### **1. Teste de Upload e Abandono:**
1. Faça upload de um documento
2. Vá para o Stripe Checkout
3. **Aguarde 2 minutos** (em vez de 30)
4. Verifique se o documento foi removido automaticamente

### **2. Teste do Agendador:**
1. Faça upload de um documento
2. Vá para o Stripe Checkout
3. O agendador executará limpeza **a cada 2 minutos**
4. Documentos não pagos serão removidos automaticamente

### **3. Verificação Manual:**
```sql
-- Ver documentos Stripe pendentes
SELECT id, filename, status, created_at, updated_at 
FROM documents 
WHERE status = 'stripe_pending'
ORDER BY updated_at DESC;

-- Ver sessões Stripe
SELECT session_id, document_id, payment_status, created_at 
FROM stripe_sessions 
WHERE payment_status = 'pending'
ORDER BY created_at DESC;
```

## 🔄 **Restaurar Tempos de Produção**

Quando terminar os testes, altere os tempos de volta para produção:

### **1. Edge Function (`cleanup-stripe-pending/index.ts`):**
```typescript
// De:
const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

// Para:
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
```

### **2. Agendador (`stripeCleanupScheduler.ts`):**
```typescript
// De:
const interval = setInterval(cleanupStripePendingDocuments, 2 * 60 * 1000);

// Para:
const interval = setInterval(cleanupStripePendingDocuments, 30 * 60 * 1000);
```

### **3. Hook (`useStripeCleanup.ts`):**
```typescript
// De:
}, 2 * 60 * 1000); // 2 minutos para teste

// Para:
}, 30 * 60 * 1000); // 30 minutos
```

## 📊 **Logs de Teste**

Procure por estes logs para confirmar que está funcionando:

```
⏰ Agendador de limpeza Stripe configurado (2 minutos - TESTE)
🧹 Iniciando limpeza de documentos Stripe pendentes
📊 Encontrados X documentos Stripe pendentes para limpeza
✅ Limpeza concluída: X documentos removidos
```

## ⚠️ **Importante**

- **NÃO esqueça de restaurar os tempos para produção**
- **2 minutos é muito pouco para produção** - usuários podem perder documentos
- **Use apenas para testes** do sistema de limpeza
