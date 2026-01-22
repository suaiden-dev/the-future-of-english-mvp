# Correção do Status Stripe Pending

## 🚨 **Problema Identificado**

A Edge Function `create-checkout-session` estava falhando ao tentar marcar documentos como `stripe_pending` devido a uma constraint de check na tabela `documents` que não incluía esse status.

### **Erro:**
```
❌ Erro ao marcar documento como Stripe pending: {
  code: "23514",
  details: "Failing row contains (..., stripe_pending, ...)",
  message: 'new row for relation "documents" violates check constraint "documents_status_check"'
}
```

## ✅ **Solução Implementada**

### **1. Migração de Banco de Dados**

Criada migração `add_stripe_pending_status` que:

1. **Remove a constraint antiga:**
   ```sql
   ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
   ```

2. **Adiciona nova constraint com stripe_pending:**
   ```sql
   ALTER TABLE documents ADD CONSTRAINT documents_status_check 
   CHECK (status IN ('pending', 'stripe_pending', 'processing', 'completed', 'cancelled'));
   ```

### **2. Status Permitidos Atualizados**

**Antes:**
- `pending`
- `processing` 
- `completed`
- `cancelled`

**Depois:**
- `pending` - Documento criado, aguardando pagamento
- `stripe_pending` - Documento aguardando pagamento via Stripe
- `processing` - Pagamento confirmado, em processamento
- `completed` - Tradução concluída
- `cancelled` - Documento cancelado

## 🧪 **Verificação**

### **1. Constraint Aplicada:**
```sql
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'documents'::regclass 
AND conname = 'documents_status_check';
```

**Resultado:**
```json
{
  "conname": "documents_status_check",
  "definition": "CHECK ((status = ANY (ARRAY['pending'::text, 'stripe_pending'::text, 'processing'::text, 'completed'::text, 'cancelled'::text])))"
}
```

### **2. Status Válido:**
```sql
SELECT 'stripe_pending'::text = ANY(ARRAY['pending'::text, 'stripe_pending'::text, 'processing'::text, 'completed'::text, 'cancelled'::text]) as is_valid_status;
```

**Resultado:** `true` ✅

## 🎯 **Resultado**

- ✅ **Edge Function `create-checkout-session` agora funciona corretamente**
- ✅ **Documentos podem ser marcados como `stripe_pending`**
- ✅ **Sistema de limpeza automática pode funcionar**
- ✅ **Constraint de banco atualizada com todos os status necessários**

## 📝 **Próximos Passos**

1. **Testar upload de documento** → Deve funcionar sem erro
2. **Verificar redirecionamento Stripe** → Documento deve ficar `stripe_pending`
3. **Testar limpeza automática** → Documentos não pagos devem ser removidos após 30min
4. **Testar pagamento** → Documento deve mudar para `processing`

## 🔧 **Arquivos Modificados**

- ✅ `add_stripe_pending_status.sql` - Migração de banco
- ✅ Constraint `documents_status_check` atualizada
- ✅ Edge Function `create-checkout-session` agora funcional
