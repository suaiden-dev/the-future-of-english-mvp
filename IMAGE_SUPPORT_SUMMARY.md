# ✅ Suporte para PNG/JPG no AuthenticatorUpload

## 🎯 Objetivo
Permitir que o autenticador faça upload de imagens (PNG/JPG) além de PDFs, seguindo o mesmo padrão do upload do cliente.

## 🔍 Análise Realizada

### ✅ **Upload do Cliente (Referência)**
No `DocumentUploadModal.tsx`:
- ✅ Aceita: `accept=".pdf,.jpg,.jpeg,.png"`
- ✅ Validação: PDF = contagem de páginas, Imagens = 1 página
- ✅ Preview: Mostra thumbnail para imagens
- ✅ Texto: "PDF, JPG, PNG up to 10MB"

### ✅ **Upload do Autenticador (Implementado)**
No `AuthenticatorUpload.tsx`:
- ✅ Aceita: `accept=".pdf,.jpg,.jpeg,.png"` (já estava configurado)
- ✅ Validação: PDF = contagem de páginas, Imagens = 1 página
- ✅ Preview: Mostra thumbnail para imagens (já estava implementado)
- ✅ Texto: "PDF, JPG, PNG up to 10MB" (já estava correto)

## 🔧 Mudanças Implementadas

### 1. **Validação de Tipo de Arquivo**
```typescript
// ✅ ANTES (só PDF):
if (!file.type.includes('pdf')) {
  setError('Please select a PDF file.');
  return;
}

// ✅ DEPOIS (PDF + Imagens):
if (!file.type.includes('pdf') && !file.type.startsWith('image/')) {
  setError('Please select a PDF file or image (PNG, JPG).');
  return;
}
```

### 2. **Processamento de Arquivos**
```typescript
// ✅ ANTES (só PDF):
const arrayBuffer = await file.arrayBuffer();
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
const pageCount = pdf.numPages;
setPages(pageCount);

// ✅ DEPOIS (PDF + Imagens):
if (file.type.includes('pdf')) {
  // Processar PDF com PDF.js
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;
  setPages(pageCount);
  console.log('DEBUG: PDF loaded, pages:', pageCount);
} else if (file.type.startsWith('image/')) {
  // Imagem = 1 página (igual ao upload do cliente)
  setPages(1);
  console.log('DEBUG: Image file, setting pages to 1');
}
```

### 3. **Tratamento de Erros**
```typescript
// ✅ Mensagens específicas por tipo:
if (file.type.includes('pdf')) {
  setError('Error processing PDF file. Please try again.');
} else {
  setError('Error processing image file. Please try again.');
}
```

### 4. **Limpeza de Imports**
- ✅ Removidos imports não utilizados (`Clock`, `DollarSign`, `fileStorage`, `generateUniqueFileName`)

## 🎉 Resultado Final

Agora o **AuthenticatorUpload** funciona **exatamente igual** ao upload do cliente:

### ✅ **Tipos de Arquivo Aceitos:**
- ✅ **PDF**: Conta páginas automaticamente com PDF.js
- ✅ **PNG**: 1 página automaticamente
- ✅ **JPG/JPEG**: 1 página automaticamente

### ✅ **Funcionalidades:**
- ✅ **Drag & Drop**: Funciona com todos os tipos
- ✅ **Preview**: Mostra thumbnail para imagens
- ✅ **Validação**: Tamanho máximo 10MB
- ✅ **Contagem de Páginas**: Automática (PDF) ou 1 (imagens)
- ✅ **Normalização**: Nomes com caracteres especiais funcionam

### ✅ **Interface Consistente:**
- ✅ Mesmo `accept` que o upload do cliente
- ✅ Mesma mensagem: "PDF, JPG, PNG up to 10MB"
- ✅ Mesmo comportamento de preview
- ✅ Mesma lógica de contagem de páginas

## 🧪 Como Testar

1. **Acesse** o AuthenticatorUpload como autenticador
2. **Teste com PDF**: Deve contar páginas automaticamente
3. **Teste com PNG**: Deve definir 1 página e mostrar preview
4. **Teste com JPG**: Deve definir 1 página e mostrar preview
5. **Teste nomes especiais**: "IMAGEM ÇÃO.png" deve funcionar
6. **Teste drag & drop**: Todos os tipos devem funcionar

O autenticador agora tem **paridade completa** com o upload do cliente! 🎉
