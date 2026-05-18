# Bugs — Translated Files (Admin & Authenticator Dashboards)

**Data:** 2026-05-18  
**Investigado por:** Claude Code  

---

## 1. Admin Dashboard — Documento traduzido errado exibido

**Componente:** `src/pages/AdminDashboard/DocumentDetailsModal.tsx`  
**Severidade:** Crítica

### Sintoma
Ao abrir os detalhes de um pedido no dashboard admin, o documento traduzido exibido pertencia a outro cliente (ex: pedido de Paulo Victor exibia tradução de Matheus Gomes).

### Causa raiz
A função `fetchTranslatedDocument` tinha 3 níveis de fallback para buscar o documento traduzido na tabela `translated_documents`:

- **Level 1** — busca por `original_document_id` ✅ correto
- **Level 2** — busca por `user_id + filename (ilike)` ✅ aceitável
- **Level 3** — busca **qualquer** documento traduzido do usuário ordenado por `created_at DESC`, retornava `byUser[0]` ❌ **bug crítico**

O Level 3 era atingido porque o n8n salva o documento traduzido na tabela `documents_to_be_verified` (não em `translated_documents`), então Level 1 e Level 2 sempre falhavam. O fallback retornava o documento mais recente do usuário — que podia ser de outro cliente se o `user_id` estivesse errado, ou simplesmente o documento errado.

### Fix
Removido o Level 3 completamente. Se Level 1 e Level 2 falham → exibe "Translated document not yet available".

Adicionada busca nas duas tabelas:
1. `translated_documents` por `original_document_id` (já autenticado)
2. `documents_to_be_verified` por `original_document_id` (aguardando autenticação)
3. `translated_documents` por `filename` (fallback)
4. `documents_to_be_verified` por `filename` (fallback)

---

## 2. Admin Dashboard — Fluxo de tabelas mal compreendido

**Componente:** `src/pages/AdminDashboard/DocumentDetailsModal.tsx`  
**Severidade:** Alta

### Sintoma
Após o fix do Level 3, o admin via "Translated document not yet available" mesmo com o documento já traduzido pelo n8n.

### Causa raiz
O fluxo correto é:

```
n8n traduz → salva em documents_to_be_verified (status: pending)
→ admin/autenticador autentica → move para translated_documents (status: completed)
→ cliente vê no dashboard
```

O `DocumentDetailsModal` buscava apenas em `translated_documents`, ignorando `documents_to_be_verified` onde o n8n salva os documentos pendentes de autenticação.

### Fix
`fetchTranslatedDocument` atualizado para buscar em ambas as tabelas (ver fix anterior).

---

## 3. Authenticator Dashboard — Loading infinito ao visualizar documento

**Componente:** `src/components/DocumentViewerModal.tsx`  
**Severidade:** Alta

### Sintoma
Ao clicar em "View" em documentos do tipo imagem (JPG) no dashboard do autenticador, o modal ficava carregando infinitamente com "Loading document...".

### Causa raiz (parte 1) — sem `onError` handler
O componente usava `<img src={url} onLoad={handleImageLoad}>` mas não tinha `onError`. Se a imagem falhasse ao carregar, o evento `onLoad` nunca disparava e o estado `loading` ficava `true` para sempre.

### Causa raiz (parte 2) — extensão errada
O n8n sempre gera o arquivo traduzido como **PDF**, mas salva na tabela `documents_to_be_verified` o campo `filename` com o nome do arquivo **original** (ex: `amanda_historico...jpg`).

O `DocumentViewerModal` usa a extensão do `filename` para decidir como renderizar:
```typescript
const fileType = filename.split('.').pop()?.toLowerCase(); // "jpg"
const isImage  = ['jpg', ...].includes(fileType);          // true ← errado
```

Resultado: tentava renderizar um PDF como `<img>` → falha silenciosa → loading infinito.

### Fix
1. Adicionado `onError` em `<img>` e `<iframe>` para parar o loading em caso de falha.
2. Criada função `getViewFilename(doc, urlToView)` em `AuthenticatorDashboard.tsx` que extrai a extensão real da URL (`.pdf`) e substitui a extensão do filename original. O viewer e o download passam a usar o tipo correto.

---

## 4. Authenticator Dashboard — Download salva arquivo com extensão errada

**Componente:** `src/pages/DocumentManager/AuthenticatorDashboard.tsx`  
**Severidade:** Média

### Sintoma
Ao clicar em "Download", o arquivo era salvo com extensão `.jpg` mas o conteúdo era um PDF. O arquivo não abria corretamente.

### Causa raiz
O código de download usava `getDisplayFilename(doc)` (que retorna o filename original com `.jpg`) como nome do arquivo a ser salvo, enquanto a URL apontava para um PDF.

```typescript
link.download = getDisplayFilename(doc); // "amanda_historico...jpg" ← errado
```

### Fix
Substituído por `getViewFilename(doc, urlToDownload)` que deriva a extensão correta da URL real.

---

## 5. Storage — URL de acesso a bucket privado sem auth headers

**Componente:** `src/lib/storage.ts` → `getSecureUrl()`  
**Severidade:** Média

### Sintoma
Em alguns casos, `getSecureUrl` retornava a URL do proxy (`/functions/v1/document-proxy?...`) diretamente, sem fazer fetch. Quando essa URL era passada para `<img src>` ou `<iframe src>`, o browser não enviava o header `Authorization` e o proxy retornava 403.

### Causa raiz
O fallback Level 3 de `getSecureUrl` apenas construía e retornava a URL do proxy, sem efetuar o fetch com autenticação. O browser, ao tentar carregar a URL como recurso estático, não inclui headers customizados.

### Fix
Level 3 agora faz `fetch` com `Authorization: Bearer {session.access_token}` antes de retornar, converte a resposta em Blob URL e retorna a blob URL — mesmo padrão dos níveis 1 e 2.

```typescript
const proxyResponse = await fetch(proxyUrl, {
    headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}
});
const blob = await proxyResponse.blob();
return URL.createObjectURL(blob);
```

---

## 6. Admin Dashboard — Spam de requests 406 na tabela action_logs

**Componente:** `src/pages/AdminDashboard/ActionLogs.tsx`  
**Severidade:** Baixa (ruído / performance)

### Sintoma
No carregamento do dashboard admin, dezenas de erros 406 apareciam no console:
```
/rest/v1/action_logs?...affected_user_id.eq.{userId}... → 406
```

### Causa raiz
Para cada um dos 96 usuários, o componente disparava 3 requests em paralelo via `Promise.all`. Um deles usava `.single()` para buscar o último log do usuário. Se o usuário não tinha nenhum log, `.single()` retornava 406 (PostgREST não aceita `.single()` com 0 resultados).

Total: **96 × 3 = 288 requests** no carregamento da página.

### Fix
`.single()` trocado por `.maybeSingle()` — retorna `null` em vez de erro quando não há resultado.

---

## 7. Hook useActionLogs — Erro 416 na paginação

**Componente:** `src/hooks/useActionLogs.ts`  
**Severidade:** Baixa

### Sintoma
```
/rest/v1/action_logs?...offset=20&limit=20 → 416 "Requested range not satisfiable"
```

### Causa raiz
O hook solicitava `offset=20` quando o usuário tinha menos de 20 registros de logs. O Supabase/PostgREST retorna 416 quando o range está além do total de registros.

### Fix
Erro com código `PGRST103` (ou mensagem contendo "range") é tratado como resultado vazio — reseta para página 1 silenciosamente em vez de propagar o erro.

---

## Tabela resumo

| # | Componente | Bug | Impacto | Status |
|---|-----------|-----|---------|--------|
| 1 | `AdminDashboard/DocumentDetailsModal.tsx` | Fallback Level 3 retornava documento de outro cliente | Crítico | ✅ Corrigido |
| 2 | `AdminDashboard/DocumentDetailsModal.tsx` | Não buscava em `documents_to_be_verified` | Alto | ✅ Corrigido |
| 3 | `components/DocumentViewerModal.tsx` | Loading infinito — sem `onError` + extensão errada | Alto | ✅ Corrigido |
| 4 | `DocumentManager/AuthenticatorDashboard.tsx` | Download com extensão `.jpg` para arquivo PDF | Médio | ✅ Corrigido |
| 5 | `lib/storage.ts` | Proxy URL sem auth headers em `<img>`/`<iframe>` | Médio | ✅ Corrigido |
| 6 | `AdminDashboard/ActionLogs.tsx` | 288 requests + erros 406 no carregamento | Baixo | ✅ Corrigido |
| 7 | `hooks/useActionLogs.ts` | Erro 416 na paginação além do total | Baixo | ✅ Corrigido |
