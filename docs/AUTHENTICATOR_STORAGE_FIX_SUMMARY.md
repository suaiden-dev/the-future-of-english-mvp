# ✅ Correção do Erro 400 - Upload de Correção do Autenticador

## 🚨 Problema Identificado

O autenticador estava recebendo erro 400 ao tentar fazer upload de arquivos de correção:

```
ywpogqwhwscbdhnoqsmv.supabase.co/storage/v1/object/documents/corrections/d88dcd02-0660-410a-a4bb-ea1f31bd961c_1755883380062_MODELO%20DE%20PROCURA%C3%87%C3%83O%20DE%20PESSOA%20FISICA.pdf:1   Failed to load resource: the server responded with a status of 400 ()
```

## 🔍 Causas Identificadas

1. **Política de Storage Restritiva**: A política de storage só permitia uploads em pastas com o ID do usuário
2. **Caracteres Especiais no Nome do Arquivo**: Nomes com acentos e caracteres especiais causavam problemas
3. **Falta de Normalização**: Não havia tratamento robusto para nomes de arquivos

## ✅ Soluções Implementadas

### 1. **Nova Política de Storage para Autenticadores**

Criada migração que permite autenticadores fazerem upload em qualquer pasta:

```sql
CREATE POLICY "Authenticators can upload anywhere in documents bucket" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (
    -- Usuários normais só podem fazer upload em suas próprias pastas
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Autenticadores podem fazer upload em qualquer pasta
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'authenticator'
    )
  )
);
```

### 2. **Funções de Normalização Robustas**

Adicionadas ao `src/utils/fileUtils.ts`:

```typescript
/**
 * ✅ Normaliza nomes de arquivos para aceitar qualquer caractere especial
 * Remove apenas caracteres que podem causar problemas em sistemas de arquivos
 */
export function normalizeFileName(filename: string): string {
  // Remove apenas caracteres problemáticos, mantém acentos e espaços
  // Exemplo: "MODELO DE PROCURAÇÃO DE PESSOA FÍSICA.pdf" 
  // Vira: "MODELO DE PROCURAÇÃO DE PESSOA FÍSICA.pdf" (seguro)
}

/**
 * ✅ Gera nome único para arquivo de correção
 */
export function generateCorrectionFileName(originalFilename: string, documentId: string): string {
  // Formato: corrections/{docId}_{timestamp}_{filename_normalizado}
}

/**
 * ✅ Gera nome único para upload de documento
 */
export function generateUploadFileName(originalFilename: string, userId: string): string {
  // Formato: {userId}/{timestamp}_{filename_normalizado}
}
```

### 3. **Atualização do AuthenticatorDashboard**

Modificado `src/pages/DocumentManager/AuthenticatorDashboard.tsx`:

```typescript
// ✅ Usar função de normalização robusta para aceitar qualquer caractere especial
const normalizedFileName = normalizeFileName(state.file.name);
const uploadPath = generateCorrectionFileName(state.file.name, doc.id);

// ✅ Upload melhorado com tratamento de erro
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('documents')
  .upload(uploadPath, state.file, { 
    upsert: true,
    cacheControl: '3600'
  });

if (uploadError) {
  console.error('❌ [AuthenticatorDashboard] Erro no upload para storage:', uploadError);
  console.error('❌ [AuthenticatorDashboard] Mensagem do erro:', uploadError.message);
  throw new Error(`Erro no upload: ${uploadError.message}`);
}
```

### 4. **Aplicação Global da Normalização**

Atualizados todos os componentes de upload:
- ✅ `AuthenticatorUpload.tsx`
- ✅ `PaymentSuccess.tsx`
- ✅ `UploadDocument.tsx`

## 🎯 Características da Normalização

### ✅ O que a normalização MANTÉM:
- ✅ Acentos e caracteres especiais (ç, ã, é, etc.)
- ✅ Espaços no nome do arquivo
- ✅ Extensão original
- ✅ Estrutura legível do nome

### ❌ O que a normalização REMOVE:
- ❌ Apenas caracteres que causam problemas: `<>:"/\|?*`
- ❌ Caracteres de controle
- ❌ Pontos no início/fim do nome
- ❌ Nomes muito longos (>200 caracteres)

## 🧪 Teste

Para testar a correção:

1. **Faça login como autenticador** (`luizeduardomcsantos@gmail.com`)
2. **Rejeite um documento** no Authenticator Dashboard
3. **Faça upload de um arquivo com caracteres especiais** (acentos, espaços, etc.)
4. **Verifique** se não há mais erro 400

## 📊 Status das Correções

| Item | Status | Descrição |
|------|--------|-----------|
| 🔐 Política de Storage | ✅ Corrigido | Autenticadores podem fazer upload em `corrections/` |
| 🔧 Normalização de Nomes | ✅ Implementado | Função robusta que aceita caracteres especiais |
| 📱 AuthenticatorDashboard | ✅ Atualizado | Usa nova normalização e melhor tratamento de erro |
| 🌐 Outros Uploads | ✅ Atualizados | Todos componentes usam normalização |
| 🧪 Testes | ⏳ Pendente | Testar upload de correção com nomes especiais |

## 🎉 Resultado Esperado

Agora o autenticador deve conseguir fazer upload de arquivos de correção **sem erro 400**, mesmo com nomes contendo:
- ✅ Acentos: `PROCURAÇÃO`
- ✅ Espaços: `MODELO DE DOCUMENTO`
- ✅ Caracteres especiais: `FÍSICA`
- ✅ Qualquer combinação dos acima

O sistema mantém a legibilidade dos nomes enquanto garante compatibilidade com sistemas de arquivos.
