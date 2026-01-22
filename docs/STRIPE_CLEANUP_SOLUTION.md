# Solução de Limpeza para Documentos Stripe Não Pagos

## 🚨 **Problema Identificado**

Quando o usuário faz upload de um documento e é redirecionado para o Stripe Checkout, se ele:
- Fechar a aba do navegador
- Navegar para outro site
- Fechar o navegador completamente

O documento permanece salvo no banco de dados com status `pending`, mesmo sem pagamento.

## ✅ **Solução Implementada**

### **1. Sistema de Status Stripe Pending**

#### **Marcação de Documentos:**
- Quando o usuário é redirecionado para o Stripe, o documento é marcado como `stripe_pending`
- Isso diferencia documentos que estão aguardando pagamento Stripe de outros documentos pendentes

#### **Arquivo:** `supabase/functions/create-checkout-session/index.ts`
```typescript
// Marcar documento como aguardando pagamento Stripe
if (documentId) {
  const { error: docError } = await supabaseClient
    .from('documents')
    .update({ 
      status: 'stripe_pending',
      updated_at: new Date().toISOString()
    })
    .eq('id', documentId);
}
```

### **2. Limpeza Automática por Timeout**

#### **Edge Function de Limpeza:**
- Nova função: `cleanup-stripe-pending`
- Remove documentos que estão há mais de 30 minutos em `stripe_pending`
- Verifica se já existe pagamento antes de remover

#### **Arquivo:** `supabase/functions/cleanup-stripe-pending/index.ts`
```typescript
// Buscar documentos que estão há mais de 30 minutos em stripe_pending
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

const { data: pendingDocs } = await supabase
  .from('documents')
  .select('id, user_id, filename, file_url, created_at')
  .eq('status', 'stripe_pending')
  .lt('updated_at', thirtyMinutesAgo);
```

### **3. Agendador Automático**

#### **Limpeza Periódica:**
- Executa limpeza a cada 30 minutos
- Configurado no `App.tsx` quando usuário está logado
- Remove automaticamente documentos não pagos

#### **Arquivo:** `src/utils/stripeCleanupScheduler.ts`
```typescript
export function setupStripeCleanupScheduler() {
  const interval = setInterval(cleanupStripePendingDocuments, 30 * 60 * 1000);
  return () => clearInterval(interval);
}
```

### **4. Confirmação de Pagamento**

#### **Webhook do Stripe:**
- Quando pagamento é confirmado, documento é marcado como `processing`
- Sessão Stripe é atualizada para `completed`
- Documento sai do status `stripe_pending`

#### **Arquivo:** `supabase/functions/stripe-webhook/index.ts`
```typescript
// Atualizar documento para processing
await supabase
  .from('documents')
  .update({
    status: 'processing',
    updated_at: new Date().toISOString()
  })
  .eq('id', documentId);

// Atualizar sessão Stripe para completed
await supabase
  .from('stripe_sessions')
  .update({
    payment_status: 'completed',
    updated_at: new Date().toISOString()
  })
  .eq('session_id', session.id);
```

## 🔄 **Fluxo Completo**

### **Antes (Problema):**
```
1. Upload documento → Status: pending
2. Redirecionamento Stripe → Status: pending (❌)
3. Usuário fecha aba → Documento fica no banco (❌)
```

### **Depois (Solução):**
```
1. Upload documento → Status: pending
2. Redirecionamento Stripe → Status: stripe_pending ✅
3. Usuário fecha aba → Timeout de 30min inicia ✅
4. Após 30min → Documento é removido automaticamente ✅
5. Se pagamento confirmado → Status: processing ✅
```

## 🛠️ **Implementação Técnica**

### **1. Novos Status de Documento:**
- `pending`: Documento criado, aguardando pagamento
- `stripe_pending`: Documento aguardando pagamento Stripe
- `processing`: Pagamento confirmado, em processamento
- `completed`: Tradução concluída

### **2. Tabela stripe_sessions:**
- Armazena sessões do Stripe
- Status: `pending` → `completed`
- Permite rastreamento de pagamentos

### **3. Edge Functions:**
- `cleanup-stripe-pending`: Remove documentos não pagos
- `stripe-webhook`: Processa confirmações de pagamento
- `create-checkout-session`: Marca documentos como stripe_pending

## 📊 **Monitoramento**

### **Logs Importantes:**
```bash
# Documento marcado como Stripe pending
✅ Documento marcado como Stripe pending: [document_id]

# Limpeza automática
🧹 Iniciando limpeza de documentos Stripe pendentes
📊 Encontrados X documentos Stripe pendentes para limpeza
✅ Limpeza concluída: X documentos removidos

# Pagamento confirmado
✅ Sessão Stripe marcada como completed: [session_id]
```

### **Verificação Manual:**
```sql
-- Ver documentos Stripe pendentes
SELECT id, filename, status, created_at, updated_at 
FROM documents 
WHERE status = 'stripe_pending';

-- Ver sessões Stripe
SELECT session_id, document_id, payment_status, created_at 
FROM stripe_sessions 
WHERE payment_status = 'pending';
```

## 🧪 **Como Testar**

### **1. Teste de Abandono:**
1. Faça upload de um documento
2. Vá para o Stripe Checkout
3. Feche a aba sem pagar
4. Aguarde 30 minutos
5. Verifique se documento foi removido

### **2. Teste de Pagamento:**
1. Faça upload de um documento
2. Complete o pagamento no Stripe
3. Verifique se documento mudou para `processing`
4. Verifique se sessão Stripe mudou para `completed`

## 🎯 **Resultado Esperado**

- ✅ **Documentos não pagos são removidos automaticamente**
- ✅ **Timeout de 30 minutos para limpeza**
- ✅ **Pagamentos confirmados são processados normalmente**
- ✅ **Sistema funciona mesmo se usuário fechar navegador**
- ✅ **Logs detalhados para monitoramento**
- ✅ **Sem documentos "órfãos" no banco de dados**

## 📝 **Notas Importantes**

### **1. Timeout Configurável:**
- Atualmente: 30 minutos
- Pode ser ajustado na Edge Function `cleanup-stripe-pending`
- Recomendado: 15-60 minutos

### **2. Limpeza Periódica:**
- Executa a cada 30 minutos
- Pode ser ajustado no `stripeCleanupScheduler.ts`
- Recomendado: 15-30 minutos

### **3. Segurança:**
- Verifica sempre se já existe pagamento antes de remover
- Usa service role key apenas nas Edge Functions
- Logs detalhados para auditoria
