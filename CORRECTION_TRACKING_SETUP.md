# Correction Tracking Setup - Sistema de Rastreamento de Correções

## 🚨 **Problema Resolvido Temporariamente**

### **Erro 400 (Bad Request):**
- ❌ Campos `parent_document_id`, `is_correction`, etc. não existiam na tabela
- ❌ Sistema tentava inserir campos inexistentes
- ✅ **SOLUÇÃO TEMPORÁRIA:** Removidos campos que causavam erro

## 🔧 **Solução Completa (2 Passos)**

### **PASSO 1: Aplicar Migração (OBRIGATÓRIO)**

Execute a migração SQL para adicionar os campos necessários:

```bash
# Opção 1: Via Supabase Dashboard
# - Vá para SQL Editor
# - Execute o arquivo: supabase/migrations/20250113000000_add_correction_tracking_fields.sql

# Opção 2: Via Supabase CLI
supabase db push
```

### **PASSO 2: Ativar Campos de Rastreamento (APÓS MIGRAÇÃO)**

Após aplicar a migração, descomente os campos na função `handleCorrectionUpload`:

```typescript
// ✅ Descomente estes campos após a migração
const { error: insertError } = await supabase
  .from('documents_to_be_verified')
  .insert({
    user_id: doc.user_id,
    filename: state.file.name,
    translated_file_url: publicUrl,
    source_language: doc.source_language,
    target_language: doc.target_language,
    pages: doc.pages,
    status: 'pending',
    total_cost: doc.total_cost,
    verification_code: originalDoc.verification_code,
    client_name: doc.client_name,
    is_bank_statement: doc.is_bank_statement,
    
    // ✅ DESCOMENTAR APÓS MIGRAÇÃO:
    parent_document_id: doc.id,
    is_correction: true,
    original_document_id: doc.id,
    correction_reason: 'Document rejected by authenticator'
  });
```

## 📋 **Campos Adicionados pela Migração**

### **1. `parent_document_id`**
- **Tipo:** UUID
- **Referência:** `documents_to_be_verified(id)`
- **Propósito:** Documento pai que foi rejeitado

### **2. `is_correction`**
- **Tipo:** BOOLEAN
- **Padrão:** FALSE
- **Propósito:** Flag para identificar correções

### **3. `original_document_id`**
- **Tipo:** UUID
- **Propósito:** Referência ao documento original rejeitado

### **4. `correction_reason`**
- **Tipo:** TEXT
- **Propósito:** Motivo da correção (ex: "Document rejected by authenticator")

## 🚀 **Como Aplicar a Migração**

### **Via Supabase Dashboard:**
1. Acesse [supabase.com](https://supabase.com)
2. Vá para seu projeto
3. **SQL Editor** → **New Query**
4. Cole o conteúdo do arquivo de migração
5. **Run** para executar

### **Via Supabase CLI:**
```bash
# Instalar Supabase CLI (se não tiver)
npm install -g supabase

# Fazer login
supabase login

# Aplicar migração
supabase db push
```

## ✅ **Resultado Esperado**

### **Antes da Migração:**
- ✅ Sistema funciona (sem campos de rastreamento)
- ✅ Correções são inseridas como documentos normais
- ✅ Contabilidade básica funciona

### **Após a Migração:**
- ✅ Campos de rastreamento disponíveis
- ✅ Correções são identificadas corretamente
- ✅ Contabilidade diferenciada (documentos vs correções)
- ✅ Dashboard mostra métricas separadas

## 🔍 **Verificação da Migração**

Após aplicar a migração, verifique se os campos foram criados:

```sql
-- Verificar se os campos existem
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents_to_be_verified' 
AND column_name IN ('parent_document_id', 'is_correction', 'original_document_id', 'correction_reason');
```

## ⚠️ **Importante**

- **NÃO execute a migração em produção** sem backup
- **Teste primeiro** em ambiente de desenvolvimento
- **Verifique permissões** da tabela antes da migração
- **Execute em horário de baixo tráfego** se for produção

## 🎯 **Próximos Passos**

1. ✅ **Aplicar migração** (obrigatório)
2. ✅ **Ativar campos** no código (após migração)
3. ✅ **Testar fluxo** completo de rejeição → correção
4. ✅ **Verificar métricas** no dashboard
5. ✅ **Monitorar logs** para confirmar funcionamento

**Após aplicar a migração, o sistema funcionará perfeitamente com rastreamento completo de correções!** 🚀
