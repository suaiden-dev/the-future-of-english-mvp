# Documentação do Sistema de Storage Proxy e Acesso a Buckets Privados

Este documento detalha o funcionamento técnico da arquitetura de acesso a arquivos armazenados em Buckets Privados no Supabase, garantindo segurança e evitando erros common como **404 (Not Found)** ou **403 (Forbidden)**.

## 🚀 O Problema: Buckets Privados e RLS

No Supabase, buckets privados são protegidos por **Row Level Security (RLS)**. Isso significa que uma URL pública padrão não funcionará para esses arquivos, a menos que o usuário tenha permissões explícitas na tabela de storage. Mesmo com permissões, o acesso direto via URL pode falhar em modais ou integrações externas se não houver um tratamento adequado da sessão.

## 🛠️ A Solução: Arquitetura de Multi-Nível

Implementamos uma estratégia de fallback em cascata (Hierarquia de Tentativas) no arquivo `src/lib/storage.ts` através da função `getSecureUrl`.

### 1. Fluxo de Acesso Seguro (`getSecureUrl`)

A função `getSecureUrl` tenta obter o arquivo seguindo esta ordem de prioridade:

1.  **Download Direto (Blob URL):** O sistema tenta baixar o arquivo usando o SDK do Supabase (`supabase.storage.download`). Se o usuário logado tiver permissão RLS, o arquivo é baixado para a memória e uma URL temporária do tipo `blob:` é gerada via `URL.createObjectURL(blob)`.
    *   *Vantagem:* Mais rápido e respeita as regras de segurança do usuário.
2.  **Signed URL (URL Assinada):** Se o download direto falhar (por exemplo, permissões complexas), o sistema tenta gerar uma URL assinada temporária que expira em 1 hora.
    *   *Vantagem:* Nativo do Supabase e resolve a maioria dos bloqueios de acesso.
3.  **Document Proxy (Edge Function):** Se ambos falharem, o sistema recorre à Edge Function `document-proxy`.
    *   *Vantagem:* Bypassa o RLS usando a `SERVICE_ROLE` do servidor, mas valida internamente se o usuário está autenticado no sistema.

---

## 🔗 Document Proxy (Edge Function)

Localização: `supabase/functions/document-proxy/index.ts`

Esta função atua como um intermediário seguro entre o cliente e o Storage.

### Como Funciona:
- Recebe o `bucket` e o `path` do arquivo via query params.
- Verifica o header `Authorization` (Token JWT do usuário).
- Valida se o usuário possui uma Role permitida (`admin`, `user`, `authenticator`, `finance`).
- Se validado, faz o download do arquivo no Storage usando a chave de Admin.
- Retorna o arquivo com os headers de cache e o `Content-Type` correto (image/png, application/pdf, etc.).

---

## 🤖 Integração Avançada: Fluxo de Tradução com N8N

Para o processamento automatizado de traduções, o sistema utiliza o N8N. Como o N8N é um serviço externo, ele não tem acesso direto aos buckets privados do Supabase. Resolvemos isso com um fluxo de webhook inteligente.

### 1. O Gatilho (`send-translation-webhook`)
Quando um documento é enviado ou pago, a Edge Function `send-translation-webhook` é acionada.
- Ela coleta os metadados do documento.
- Antes de enviar para o N8N, ela intercepta a URL do arquivo.
- Ela converte a URL original em uma **N8n Proxy URL**.

### 2. Conversão da URL
A conversão transforma uma URL inacessível em uma URL autenticada para o proxy:
- **Original:** `https://.../storage/v1/object/public/documents/user_id/doc.pdf`
- **Proxy:** `https://.../functions/v1/n8n-storage-access?bucket=documents&path=user_id/doc.pdf&token=N8N_STORAGE_SECRET`

### 3. A Edge Function `n8n-storage-access`
Esta função é o "segurança" que permite a entrada do N8N:
1. **Validação do Token:** Ela verifica se o parâmetro `token` na URL coincide EXATAMENTE com a secret `N8N_STORAGE_SECRET` configurada no Supabase.
2. **Escalonamento de Privilégio:** Se o token for válido, a função usa a `SERVICE_ROLE_KEY` (chave mestra) para baixar o arquivo do bucket privado.
3. **Entrega Segura:** O arquivo é enviado via stream para o N8N com o `Content-Type` correto, permitindo que o N8N processe o PDF ou imagem imediatamente.

---

## 🔐 Segurança e Privacidade (Secrets)

A privacidade dos documentos é mantida através de dois pilares:

### 1. Buckets Privados
Todos os documentos sensíveis são armazenados em buckets com RLS (Row Level Security) habilitado. Ninguém, nem mesmo com o link direto, consegue baixar o arquivo sem uma sessão válida ou uma URL assinada.

### 2. A Secret `N8N_STORAGE_SECRET`
Esta é a chave de ouro que une o Supabase ao N8N.
- **No Supabase:** Deve estar configurada nas Edge Functions como uma variável de ambiente.
- **No Frontend:** É referenciada via `VITE_N8N_STORAGE_TOKEN` (em ambiente de desenvolvimento).
- **No N8N:** O N8N não precisa armazenar a chave, ele a recebe dinamicamente na URL do webhook enviada pelo Supabase.

**Por que isso é seguro?**
O N8N só recebe o link para o arquivo no momento exato em que precisa processá-lo. O link contém o token, mas esse link é enviado via HTTPS diretamente para o endpoint do webhook do N8N, nunca sendo exposto publicamente.

---

## 🛠️ Como configurar uma nova Secret no Supabase

Se precisar trocar o token de segurança por motivos de rotação ou expiração, siga estes passos:

1. **Acesse o Dashboard do Supabase.**
2. Vá em **Edge Functions** -> **Manage Secrets**.
3. Adicione ou edite a secret:
   ```env
   N8N_STORAGE_SECRET=seu_novo_token_ultra_secreto
   ```
4. No arquivo `.env` do frontend (Vite), atualize:
   ```env
   VITE_N8N_STORAGE_TOKEN=seu_novo_token_ultra_secreto
   ```

---

## 🖼️ Exibição em Modais (Visualizador Inline)

No frontend, especialmente no `DocumentDetailsModal.tsx`, o processo para evitar erros 404 é:

1.  O componente recebe a URL pública (ou o caminho do arquivo).
2.  Chama-se `convertPublicToSecure(rawUrl)`, que internamente usa o `getSecureUrl`.
3.  O resultado é uma **Blob URL** (`blob:http://...`).
4.  **Por que usar Blobs?**
    - **PDFs:** Podem ser exibidos diretamente em um `<iframe>` sem que o navegador tente baixá-los ou bloqueie por falta de credenciais (os cookies de sessão nem sempre são enviados em iframes de cross-domain).
    - **Imagens:** Permite manipulações como Zoom e Rotação sem recarregar do servidor.
    - **Estabilidade:** Uma vez que o Blob está na memória, ele não expira enquanto a aba estiver aberta (ao contrário de URLs assinadas).

### Exemplo de Uso no Modal:

```typescript
// No DocumentDetailsModal.tsx
const handleViewFile = async (type) => {
  const secureUrl = await convertPublicToSecure(rawUrl);
  const response = await fetch(secureUrl);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob); // Cria a URL Blob estável
  setViewerUrl(blobUrl);
};
```

---

## 🧹 Boas Práticas (Memory Leak Prevention)

Sempre que uma `blob:` URL é criada, ela consome memória do navegador. Por isso, implementamos o cleanup:

```typescript
useEffect(() => {
  return () => {
    if (viewerUrl && viewerUrl.startsWith('blob:')) {
      URL.revokeObjectURL(viewerUrl); // Libera a memória ao fechar o modal
    }
  };
}, [viewerUrl]);
```

## 📝 Resumo de Comandos Úteis

| Recurso | Função | Bucket Alvo |
| :--- | :--- | :--- |
| **Acesso Geral** | `getSecureUrl(bucket, path)` | Todos |
| **Conversão** | `convertPublicToSecure(url)` | Qualquer URL Supabase |
| **Proxy Admin** | `getDocumentProxyUrl(bucket, path)` | Privados / Restritos |
| **Integração Externa** | `getN8nProxyUrl(url)` | Buckets de Tradução |

---
**Nota:** Nunca exponha o `N8N_STORAGE_TOKEN` em logs de produção ou em áreas públicas do frontend que não exijam autenticação.
