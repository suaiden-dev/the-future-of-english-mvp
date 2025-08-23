# Configuração de Variáveis de Ambiente

## 🔐 Segurança

Este projeto foi refatorado para usar variáveis de ambiente em vez de valores hardcoded. Isso é **ESSENCIAL** para a segurança da aplicação.

## 📁 Arquivos de Configuração

### 1. `.env` (Principal)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://ywpogqwhwscbdhnoqsmv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cG9ncXdod3NjYmRobm9xc212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTYxMzksImV4cCI6MjA2ODE3MjEzOX0.CsbI1OiT2i3EL31kvexrstIsaC48MD4fEHg6BSE6LZ4

# Supabase Service Role (para Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cG9ncXdod3NjYmRobm9xc212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjU5NjEzOSwiZXhwIjoyMDY4MTcyMTM5fQ.R8WEMueMNajrK7_cVGLRIokJljWYXMUiZ2PHHQeMBG4

# Stripe Configuration (se aplicável)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. `.env.local` (Desenvolvimento Local)
```bash
# Sobrescrever configurações para desenvolvimento local
VITE_SUPABASE_URL=https://seu-projeto-dev.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-dev
```

### 3. `.env.production` (Produção)
```bash
# Configurações específicas para produção
VITE_SUPABASE_URL=https://seu-projeto-prod.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-prod
```

## 🚀 Como Usar

### Frontend (React)
```typescript
import { config, getEdgeFunctionAuthHeader } from '../lib/config';

// Usar URLs das Edge Functions
const response = await fetch(config.edgeFunctions.createCheckoutSession, {
  method: 'POST',
  headers: getEdgeFunctionAuthHeader(),
  body: JSON.stringify(data)
});
```

### Testes JavaScript
```javascript
const { config, getAuthHeaders } = require('./test-config');

const response = await fetch(config.edgeFunctions.updateDocument, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify(data)
});
```

### Edge Functions
```typescript
const supabaseUrl = Deno.env.get('PROJECT_URL');
const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY');
```

## ⚠️ Importante

1. **NUNCA** commite o arquivo `.env` no repositório
2. **SEMPRE** use variáveis de ambiente para valores sensíveis
3. **VALIDE** se as variáveis estão configuradas antes de usar
4. **ROTACIONE** as chaves regularmente por segurança

## 🔧 Validação

O sistema valida automaticamente se as variáveis obrigatórias estão configuradas:

```typescript
// src/lib/config.ts
export const validateConfig = () => {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return true;
};
```

## 📋 Checklist de Segurança

- [ ] Todas as URLs hardcoded foram removidas
- [ ] Todos os Bearer Tokens foram movidos para variáveis de ambiente
- [ ] Arquivo `.env` está no `.gitignore`
- [ ] Validação de configuração está implementada
- [ ] Testes foram refatorados para usar configuração segura
- [ ] Documentação foi atualizada
