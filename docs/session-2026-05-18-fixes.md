# Session Report — 2026-05-18

**Investigado e corrigido por:** Claude Code  
**Escopo:** Sistema de Verification Code + bugs no Admin Dashboard + Authenticator Dashboard

---

## 1. Análise Completa do Sistema de Verification Code

### Problema reportado
"O código vem de dois lugares" — comportamento bugado na exibição e validação do código de verificação.

### Descoberta: 3 fontes diferentes gerando códigos distintos

| Tabela | Formato | Origem |
|--------|---------|--------|
| `documents.verification_code` | `TFE` + 6 chars (ex: `TFE73MVC4`) | Trigger `set_verification_code()` no INSERT |
| `documents_to_be_verified.verification_code` | UUID (ex: `9327a88c-4629-...`) | n8n gera e salva |
| `translated_documents.verification_code` | 9 chars alfanumérico (ex: `0DDOOX1VA`) | Autenticador / `insert-correction` |

Os três são **sempre diferentes** para o mesmo documento — confirmado via SQL.

### Cadeia de lookup correta (`getVerificationCode`)
```
documents.id (D1)
  → dtbv onde original_document_id = D1  →  dtbv.id (V1)
  → translated_documents onde original_document_id = V1
  → retorna verification_code (o código válido para a página pública)
```

### Bug crítico identificado: 108 registros com `original_document_id = NULL` em `dtbv`

**Query Q2 resultado:**
```
total: 373 | com_original_document_id: 265 | com_verification_code: 373
```

**Causa raiz:** O n8n não enviava `original_document_id` ao criar registros em `documents_to_be_verified` antes de ~maio/2026. 108 registros históricos ficaram sem o link, quebrando `getVerificationCode` → cliente não via o código mesmo após autenticação.

---

## 2. Fix de Dados — Backfill dos 100 registros recuperáveis

**Query de validação (retornou 100 matches):**
```sql
SELECT COUNT(DISTINCT dtbv.id)
FROM documents_to_be_verified dtbv
JOIN documents d ON d.user_id = dtbv.user_id AND d.filename = dtbv.filename
WHERE dtbv.original_document_id IS NULL;
```

**UPDATE executado:**
```sql
UPDATE documents_to_be_verified dtbv
SET original_document_id = (
  SELECT d.id 
  FROM documents d
  WHERE d.user_id = dtbv.user_id 
    AND d.filename = dtbv.filename
  ORDER BY ABS(EXTRACT(EPOCH FROM (d.created_at - dtbv.created_at)))
  LIMIT 1
)
WHERE dtbv.original_document_id IS NULL
  AND EXISTS (
    SELECT 1 FROM documents d 
    WHERE d.user_id = dtbv.user_id AND d.filename = dtbv.filename
  );
```

**Resultado confirmado:** `total: 373 | com_link: 365` (100 links corrigidos, 8 sem match permanente — docs sem entrada na tabela `documents`).

---

## 3. Fix de Código — `AuthenticatorDashboard.tsx`

**Arquivo:** `src/pages/DocumentManager/AuthenticatorDashboard.tsx`

### 3a. `original_document_id` ausente na criação manual de dtbv

**Problema:** Quando o autenticador aprovava um documento sem `verification_id` (não vindo do n8n), o código criava um novo registro em `documents_to_be_verified` **sem setar `original_document_id`**, gerando novos NULLs futuros.

**Fix (linha ~341):**
```typescript
// ANTES
{
  user_id: document.user_id,
  filename: document.filename,
  ...
}

// DEPOIS
{
  user_id: document.user_id,
  filename: document.filename,
  original_document_id: document.id,  // ← adicionado
  ...
}
```

### 3b. Download de arquivo traduzido salvando com extensão errada (.jpg → .pdf)

**Problema:** Dois handlers de download usavam `getViewFilename(doc, urlToDownload)` que extraía a extensão da URL. Quando a URL terminava em `.jpg`, o arquivo baixava como `.jpg` mesmo sendo PDF.

**Fix — ambos os handlers (linhas ~990 e ~1473):**
```typescript
// ANTES
link.download = getViewFilename(doc, urlToDownload);

// DEPOIS
// n8n always outputs PDF — force .pdf extension for translated files
const dlBase = getDisplayFilename(doc).replace(/\.[^.]+$/, '');
link.download = doc.translated_file_url ? `${dlBase}.pdf` : getViewFilename(doc, urlToDownload);
```

---

## 4. Fixes no `AdminDashboard/DocumentDetailsModal.tsx`

**Arquivo:** `src/pages/AdminDashboard/DocumentDetailsModal.tsx`

### 4a. Formatação incorreta de Total Cost

**Problema:** `$140.79.00` — o `.00` estava hardcoded enquanto o valor já vinha com decimais do banco.

```typescript
// ANTES
<p>${(document as any).total_cost}.00</p>

// DEPOIS
<p>${Number((document as any).total_cost).toFixed(2)}</p>
```

### 4b. Verification Code exibindo código errado (`TFExxxxxxx`)

**Problema:** O campo exibia `document.verification_code` (código da tabela `documents`, formato TFE, nunca válido na página pública) ao invés do código real de `translated_documents`.

```typescript
// ANTES
{document.verification_code}

// DEPOIS
{translatedDoc?.is_authenticated && translatedDoc?.verification_code 
  ? translatedDoc.verification_code 
  : '—'}
```

**Regras aplicadas:**
- Só exibe o código quando `is_authenticated = true`
- Sem fallback para o código da tabela `documents` (seria código inválido para verificação pública)
- Documento não autenticado → exibe `—`

### 4c. Seção "Translated Document" sempre mostrava verde "✓ Available"

**Problema:** O bloco do documento traduzido sempre exibia fundo verde e badge "✓ Available" independente de `is_authenticated`, enganando o admin sobre o status real.

**Fix — lógica do Lush America aplicada:**

| Estado | Visual |
|--------|--------|
| `is_authenticated = true` | Verde + "✓ Authenticated" + botões verdes |
| `is_authenticated = false` | Amarelo + "Pending authenticator" + botões amarelos |
| Sem arquivo traduzido | Amarelo "Translated document not yet available" |

```typescript
// ANTES — sempre verde
<div className="bg-green-50 border-green-200">
  <span>✓ Available</span>
  ...
</div>

// DEPOIS — dinâmico por is_authenticated
const isAuthenticated = translatedDoc?.is_authenticated === true;
<div className={`... ${isAuthenticated ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
  {isAuthenticated 
    ? <span>✓ Authenticated</span> 
    : <span>Pending authenticator</span>}
  ...
</div>
```

### 4d. Download de arquivo traduzido salvando com extensão errada (.jpg → .pdf)

**Problema:** Mesmo bug do authenticator dashboard — `filename` com `.jpg` do banco sendo usado no download.

```typescript
// ANTES
filename = translatedDoc.filename || 'translated_document.pdf';

// DEPOIS
// n8n always outputs PDF but stores the file using the original filename (e.g. .jpg)
const base = (translatedDoc.filename || 'translated_document').replace(/\.[^.]+$/, '');
filename = `${base}.pdf`;
```

---

## 5. Limpeza de Dados de Teste

**Queries fornecidas para deletar 5 documentos de teste** (sufixos: DS5DVU, FH0OFV, Y11GUF, UWQWDP, BVF7BI) nas tabelas em ordem de FK:

1. `translated_documents`
2. `documents_to_be_verified`
3. `payments`
4. `documents`

---

## Resumo de Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/DocumentManager/AuthenticatorDashboard.tsx` | `original_document_id` no insert dtbv; download força `.pdf` (2 handlers) |
| `src/pages/AdminDashboard/DocumentDetailsModal.tsx` | Total cost formatting; verification code source correto; translated doc status dinâmico; download força `.pdf` |

## Resumo de Operações no Banco

| Operação | Resultado |
|----------|-----------|
| Backfill `documents_to_be_verified.original_document_id` | 100 registros corrigidos de 108 |
| 8 registros sem match | Irreversível — docs sem entrada na tabela `documents` |
