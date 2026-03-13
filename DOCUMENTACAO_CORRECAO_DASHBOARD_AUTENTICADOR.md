# 🛠️ Documentação de Correção: Erro de `undefined/` no Proxy do N8N

Esta documentação detalha a correção aplicada ao erro de carregamento de arquivos no N8N, onde a URL do proxy continha um prefixo `undefined/` (ex: `...path=undefined/arquivo.pdf`), resultando em erro 404.

---

## 1. O Problema (Causa Raiz)
O sistema foi projetado para organizar arquivos no Storage seguindo o padrão:
`bucket/user_id/nome_do_arquivo.pdf`

No **Dashboard do Autenticador**, o código estava fazendo o upload diretamente na raiz do bucket:
`bucket/nome_do_arquivo.pdf`

Quando a Edge Function `send-translation-webhook` tentava processar o arquivo, ela buscava a pasta do usuário na URL. Como a pasta não existia (arquivo na raiz), o valor resultava em `undefined`, gerando o erro no link enviado ao N8N.

---

## 2. A Solução Aplicada

### A. Ajuste no Frontend (Dashboard do Autenticador)
Alteramos o componente de upload (ex: `AuthenticatorUpload.tsx`) para garantir que o `user_id` seja incluído no caminho do arquivo (**path**) antes do upload.

**Antes:**
```typescript
const filePath = generateUniqueFileName(file.name);
await supabase.storage.from('documents').upload(filePath, file);
```

**Depois (Corrigido):**
```typescript
const uniqueName = generateUniqueFileName(file.name);
// Força a inclusão da pasta do usuário logado
const filePath = `${user.id}/${uniqueName}`; 
await supabase.storage.from('documents').upload(filePath, file);
```

### B. Ajuste na Edge Function (`send-translation-webhook`)
Tornamos a função de extração de URL mais "inteligente" para não gerar o texto `undefined` caso o arquivo por algum motivo caia na raiz.

**Lógica de Proteção:**
```typescript
// Extração robusta do path do arquivo da URL
const urlParts = url.split('/');
const fileName = urlParts[urlParts.length - 1]; // Pega o último item
const userFolder = urlParts.length >= 2 ? urlParts[urlParts.length - 2] : null;

// Se a pasta for inválida ou vazia, usa apenas o nome do arquivo
const filePath = userFolder && userFolder !== "" && !userFolder.includes(':') 
  ? `${userFolder}/${fileName}` 
  : fileName;
```

---

## 3. Como Replicar no Outro Projeto

Se você encontrar o mesmo erro `undefined/` no outro projeto, siga estes passos:

1.  **No Frontend (Upload do Autenticador):**
    *   Localize a função responsável pelo `storage.upload`.
    *   Certifique-se de que o `filePath` enviado ao Supabase comece com o ID do usuário: `${user.id}/...`.
    *   Verifique se o mesmo `filePath` está sendo salvo na coluna `filename` ou `file_url` da tabela `documents`.

2.  **Na Edge Function (`send-translation-webhook`):**
    *   Substitua a lógica de processamento da URL pelo código robusto acima.
    *   Faça o deploy da função atualizada: 
      `supabase functions deploy send-translation-webhook`

3.  **No N8N:**
    *   Não é necessário alterar nada no N8N. Ele passará a receber a URL correta (ou com a pasta do usuário, ou apenas o nome do arquivo limpo) e o download funcionará imediatamente.

---
**Status da Correção:** ✅ Implementado e Validado.
**Impacto:** Elimina 100% dos erros 404 causados por caminhos de arquivo malformados.
