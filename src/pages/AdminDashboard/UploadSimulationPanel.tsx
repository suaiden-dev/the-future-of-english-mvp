import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Loader, FileText, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface DocumentInfo {
  id: string;
  filename: string;
  original_filename: string | null;
  user_id: string;
  file_url: string | null;
  file_id: string | null;
  status: string;
  created_at: string;
  client_name: string | null;
  profiles: {
    name: string | null;
    email: string | null;
  } | null;
}

export function UploadSimulationPanel() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentDocuments();
  }, []);

  const fetchRecentDocuments = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('documents')
        .select(`
          id,
          filename,
          original_filename,
          user_id,
          file_url,
          file_id,
          status,
          created_at,
          client_name,
          profiles:user_id (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar documentos:', err);
      setError('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove arquivo do Storage tentando múltiplas variações do caminho
   */
  const removeFileFromStorage = async (
    fileUrl: string,
    userId: string,
    filename: string
  ): Promise<boolean> => {
    try {
      // Extrair caminho da URL
      const urlObj = new URL(fileUrl);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      
      // Tentar múltiplas variações do caminho
      const pathsToTry: string[] = [];
      
      // 1. Caminho completo extraído da URL
      if (pathParts.length > 2) {
        pathsToTry.push(pathParts.slice(2).join('/'));
      }
      
      // 2. Formato userId/filename
      pathsToTry.push(`${userId}/${filename}`);
      
      // 3. Últimos 2 segmentos
      if (pathParts.length >= 2) {
        pathsToTry.push(pathParts.slice(-2).join('/'));
      }
      
      // 4. Apenas o nome do arquivo
      const justFilename = pathParts[pathParts.length - 1];
      if (justFilename) {
        pathsToTry.push(justFilename);
      }

      // Tentar remover com cada variação
      for (const path of pathsToTry) {
        try {
          const { error: deleteError } = await supabase.storage
            .from('documents')
            .remove([path]);

          if (!deleteError) {
            console.log(`✅ Arquivo removido: ${path}`);
            return true;
          }
        } catch (err) {
          // Continuar tentando outras variações
          continue;
        }
      }

      console.warn('⚠️ Não foi possível remover arquivo do Storage (pode não existir)');
      return false;
    } catch (err) {
      console.error('Erro ao remover arquivo do Storage:', err);
      return false;
    }
  };

  /**
   * Limpa registros relacionados em outras tabelas
   * Remove de documents_to_be_verified usando original_document_id (chave principal)
   * e múltiplos critérios de fallback para garantir remoção completa
   */
  const cleanupRelatedRecords = async (
    documentId: string, 
    fileId: string | null,
    userId: string,
    filename: string,
    originalFilename: string | null,
    clientName: string | null
  ) => {
    try {
      console.log('[Simulação] 🧹 Limpando registros relacionados...', {
        documentId,
        fileId,
        userId,
        filename,
        originalFilename,
        clientName
      });

      // ============================================
      // 1. REMOVER DE documents_to_be_verified
      // ============================================
      // IMPORTANTE: documents_to_be_verified tem campo original_document_id que referencia documents.id
      
      // 1.1. Buscar por original_document_id (CHAVE PRINCIPAL)
      const { data: byOriginalDocId, error: searchByOriginalError } = await supabase
        .from('documents_to_be_verified')
        .select('id, original_document_id, file_id, user_id, filename, client_name, status')
        .eq('original_document_id', documentId);

      if (searchByOriginalError) {
        console.warn('[Simulação] ⚠️ Erro ao buscar por original_document_id:', searchByOriginalError);
      } else if (byOriginalDocId && byOriginalDocId.length > 0) {
        console.log(`[Simulação] 🔍 Encontrados ${byOriginalDocId.length} registro(s) por original_document_id`);
        
        const idsToRemove = byOriginalDocId.map(d => d.id);
        const { error: deleteByOriginalError } = await supabase
          .from('documents_to_be_verified')
          .delete()
          .in('id', idsToRemove);

        if (deleteByOriginalError) {
          console.error('[Simulação] ❌ Erro ao remover por original_document_id:', deleteByOriginalError);
        } else {
          console.log(`[Simulação] ✅ Removidos ${idsToRemove.length} registro(s) de documents_to_be_verified por original_document_id`);
        }
      }

      // 1.2. Buscar por file_id (se existir)
      if (fileId) {
        const { data: byFileId, error: searchByFileIdError } = await supabase
          .from('documents_to_be_verified')
          .select('id, file_id')
          .eq('file_id', fileId);

        if (!searchByFileIdError && byFileId && byFileId.length > 0) {
          console.log(`[Simulação] 🔍 Encontrados ${byFileId.length} registro(s) por file_id`);
          
          const idsToRemove = byFileId.map(d => d.id);
          const { error: deleteByFileIdError } = await supabase
            .from('documents_to_be_verified')
            .delete()
            .in('id', idsToRemove);

          if (!deleteByFileIdError) {
            console.log(`[Simulação] ✅ Removidos ${idsToRemove.length} registro(s) por file_id`);
          }
        }
      }

      // 1.3. Buscar por user_id + filename (FALLBACK - para casos onde original_document_id não foi preenchido)
      const { data: byUserAndFilename, error: searchByUserError } = await supabase
        .from('documents_to_be_verified')
        .select('id, user_id, filename, original_filename, client_name')
        .eq('user_id', userId)
        .or(`filename.eq.${filename},filename.eq.${originalFilename || ''},original_filename.eq.${filename},original_filename.eq.${originalFilename || ''}`);

      if (!searchByUserError && byUserAndFilename && byUserAndFilename.length > 0) {
        // Filtrar matches exatos (considerando client_name se ambos tiverem)
        const exactMatches = byUserAndFilename.filter(doc => {
          const filenameMatch = doc.filename === filename || 
                               doc.filename === originalFilename ||
                               doc.original_filename === filename ||
                               doc.original_filename === originalFilename;
          
          if (!filenameMatch) return false;

          // Se ambos têm client_name, deve ser igual
          if (clientName && doc.client_name) {
            return doc.client_name === clientName;
          }
          
          // Match válido se ambos não têm client_name ou se apenas um tem
          return true;
        });

        if (exactMatches.length > 0) {
          console.log(`[Simulação] 🔍 Encontrados ${exactMatches.length} registro(s) por user_id + filename`);
          
          const idsToRemove = exactMatches.map(d => d.id);
          const { error: deleteByUserError } = await supabase
            .from('documents_to_be_verified')
            .delete()
            .in('id', idsToRemove);

          if (!deleteByUserError) {
            console.log(`[Simulação] ✅ Removidos ${idsToRemove.length} registro(s) por user_id + filename`);
          }
        }
      }

      // 1.4. VERIFICAÇÃO EXTRA: Buscar TODAS as referências possíveis
      const { data: allReferences, error: allRefsError } = await supabase
        .from('documents_to_be_verified')
        .select('id, original_document_id, file_id, user_id, filename')
        .or(`original_document_id.eq.${documentId}${fileId ? `,file_id.eq.${fileId}` : ''}`);

      if (!allRefsError && allReferences && allReferences.length > 0) {
        console.warn(`[Simulação] ⚠️ Ainda existem ${allReferences.length} referência(s) após remoção inicial!`);
        
        // Remover novamente pelos IDs encontrados
        const remainingIds = allReferences.map(r => r.id);
        const { error: retryDeleteError } = await supabase
          .from('documents_to_be_verified')
          .delete()
          .in('id', remainingIds);

        if (!retryDeleteError) {
          console.log(`[Simulação] ✅ Remoção retry: ${remainingIds.length} registro(s) removidos`);
        }
      }

      // 1.5. VERIFICAÇÃO FINAL: Confirmar que não restou nada
      const { data: finalCheck, error: finalCheckError } = await supabase
        .from('documents_to_be_verified')
        .select('id')
        .eq('original_document_id', documentId);

      if (!finalCheckError) {
        if (finalCheck && finalCheck.length > 0) {
          console.error(`[Simulação] ❌ ERRO CRÍTICO: Ainda existem ${finalCheck.length} registro(s) em documents_to_be_verified após todas as tentativas!`);
        } else {
          console.log('[Simulação] ✅ Confirmado: Nenhum registro em documents_to_be_verified');
        }
      }

      // ============================================
      // 2. REMOVER DE translated_documents
      // ============================================
      // IMPORTANTE: translated_documents.original_document_id referencia documents_to_be_verified.id
      // Então precisamos buscar os IDs de documents_to_be_verified que correspondem ao documentId
      // e remover translated_documents que referenciam esses IDs
      
      // 2.1. Buscar IDs de documents_to_be_verified que correspondem ao documentId
      // (mesmo que já tenham sido removidos, precisamos dos IDs para remover translated_documents)
      const { data: verifiedDocsToCheck, error: verifiedCheckError } = await supabase
        .from('documents_to_be_verified')
        .select('id, original_document_id, file_id, user_id, filename')
        .or(`original_document_id.eq.${documentId}${fileId ? `,file_id.eq.${fileId}` : ''},and(user_id.eq.${userId},filename.eq.${filename})`);

      // Se não encontrou nada na busca acima, tentar buscar por user_id + filename
      let verifiedIds: string[] = [];
      if (!verifiedCheckError && verifiedDocsToCheck && verifiedDocsToCheck.length > 0) {
        verifiedIds = verifiedDocsToCheck.map(d => d.id);
        console.log(`[Simulação] 🔍 Encontrados ${verifiedIds.length} ID(s) de documents_to_be_verified para remover translated_documents`);
      } else {
        // Buscar por user_id + filename como fallback
        const { data: fallbackVerifiedDocs, error: fallbackError } = await supabase
          .from('documents_to_be_verified')
          .select('id, user_id, filename, original_filename')
          .eq('user_id', userId)
          .or(`filename.eq.${filename},filename.eq.${originalFilename || ''},original_filename.eq.${filename},original_filename.eq.${originalFilename || ''}`);

        if (!fallbackError && fallbackVerifiedDocs && fallbackVerifiedDocs.length > 0) {
          verifiedIds = fallbackVerifiedDocs.map(d => d.id);
          console.log(`[Simulação] 🔍 Fallback: Encontrados ${verifiedIds.length} ID(s) por user_id + filename`);
        }
      }

      // 2.2. Remover translated_documents que referenciam esses IDs
      if (verifiedIds.length > 0) {
        for (const verifiedId of verifiedIds) {
          const { error: deleteTranslatedError } = await supabase
            .from('translated_documents')
            .delete()
            .eq('original_document_id', verifiedId);

          if (!deleteTranslatedError) {
            console.log(`[Simulação] ✅ Removido translated_documents por original_document_id: ${verifiedId}`);
          } else {
            console.warn(`[Simulação] ⚠️ Erro ao remover translated_documents por original_document_id ${verifiedId}:`, deleteTranslatedError);
          }
        }
      } else {
        console.log('[Simulação] ℹ️ Nenhum ID de documents_to_be_verified encontrado para remover translated_documents');
      }

      // 2.3. Verificação final: buscar translated_documents por user_id + filename (fallback adicional)
      const { data: translatedByUser, error: translatedByUserError } = await supabase
        .from('translated_documents')
        .select('id, filename, user_id')
        .eq('user_id', userId)
        .or(`filename.ilike.%${filename}%,filename.ilike.%${originalFilename || ''}%`);

      if (!translatedByUserError && translatedByUser && translatedByUser.length > 0) {
        console.log(`[Simulação] 🔍 Encontrados ${translatedByUser.length} registro(s) em translated_documents por user_id + filename`);
        
        const translatedIds = translatedByUser.map(d => d.id);
        const { error: deleteTranslatedByFilenameError } = await supabase
          .from('translated_documents')
          .delete()
          .in('id', translatedIds);

        if (!deleteTranslatedByFilenameError) {
          console.log(`[Simulação] ✅ Removidos ${translatedIds.length} registro(s) de translated_documents por filename`);
        }
      }

      // ============================================
      // 3. REMOVER DE documents_to_verify (se existir)
      // ============================================
      try {
        const { error: verifyError } = await supabase
          .from('documents_to_verify')
          .delete()
          .eq('doc_id', documentId);

        if (verifyError) {
          // Tabela pode não existir, não é crítico
          console.log('[Simulação] ℹ️ documents_to_verify não existe ou erro não crítico:', verifyError.message);
        } else {
          console.log('[Simulação] ✅ Limpeza de documents_to_verify concluída');
        }
      } catch (err) {
        console.log('[Simulação] ℹ️ documents_to_verify não existe (não crítico)');
      }

      console.log('[Simulação] ✅ Limpeza de registros relacionados concluída');

    } catch (err) {
      console.error('[Simulação] ❌ Erro ao limpar registros relacionados:', err);
      throw err;
    }
  };

  const handleSimulateError = async (documentId: string) => {
    if (!confirm('Tem certeza que deseja simular falha de upload para este documento? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setProcessing(documentId);
      setError(null);
      setSuccess(null);

      // 1. Buscar documento com todos os campos necessários
      const { data: documentData, error: docError } = await supabase
        .from('documents')
        .select('id, file_url, user_id, filename, original_filename, file_id, client_name')
        .eq('id', documentId)
        .single();

      if (docError || !documentData) {
        throw new Error('Documento não encontrado');
      }

      // 2. Remover arquivo do Storage
      if (documentData.file_url) {
        await removeFileFromStorage(
          documentData.file_url,
          documentData.user_id,
          documentData.original_filename || documentData.filename
        );
      }

      // 3. Limpar registros relacionados (remover de todas as tabelas)
      await cleanupRelatedRecords(
        documentId,
        documentData.file_id,
        documentData.user_id,
        documentData.filename,
        documentData.original_filename,
        documentData.client_name || null
      );

      // 4. Limpar file_url no banco
      const { error: updateError } = await supabase
        .from('documents')
        .update({ file_url: null, file_id: null })
        .eq('id', documentId);

      if (updateError) {
        throw updateError;
      }

      // 5. Marcar como falhado via Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Sessão não encontrada');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/update-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          documentId,
          userId: documentData.user_id,
          markUploadFailed: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao marcar como falhado: ${errorText}`);
      }

      // 6. Verificação final
      const { data: verifyData } = await supabase
        .from('documents')
        .select('file_url, upload_failed_at')
        .eq('id', documentId)
        .single();

      if (verifyData?.file_url) {
        throw new Error('file_url ainda está preenchido após simulação');
      }

      if (!verifyData?.upload_failed_at) {
        throw new Error('upload_failed_at não foi preenchido');
      }

      // 7. Verificação final EXTRA: Confirmar remoção completa
      console.log('[Simulação] 🔍 Verificação final...');
      
      // Função auxiliar para remover registros encontrados
      const forceRemoveRecords = async (records: any[], reason: string) => {
        if (records && records.length > 0) {
          console.warn(`[Simulação] ⚠️ ${reason}: Encontrados ${records.length} registro(s)`);
          const ids = records.map(d => d.id);
          const { error: deleteError } = await supabase
            .from('documents_to_be_verified')
            .delete()
            .in('id', ids);
          
          if (deleteError) {
            console.error(`[Simulação] ❌ Erro ao remover por ${reason}:`, deleteError);
            return false;
          } else {
            console.log(`[Simulação] ✅ Removidos ${ids.length} registro(s) por ${reason}`);
            return true;
          }
        }
        return true;
      };

      // 7.1. Verificar por original_document_id (chave principal)
      const { data: finalCheckByOriginal, error: finalCheckError1 } = await supabase
        .from('documents_to_be_verified')
        .select('id, status, created_at')
        .eq('original_document_id', documentId);

      await forceRemoveRecords(finalCheckByOriginal || [], 'original_document_id');

      // 7.2. Verificar por file_id (se existir)
      if (documentData.file_id) {
        const { data: finalCheckByFileId, error: finalCheckError2 } = await supabase
          .from('documents_to_be_verified')
          .select('id')
          .eq('file_id', documentData.file_id);

        await forceRemoveRecords(finalCheckByFileId || [], 'file_id');
      }

      // 7.3. Verificar por user_id + filename (fallback)
      const { data: finalCheckByUser, error: finalCheckError3 } = await supabase
        .from('documents_to_be_verified')
        .select('id, filename, original_filename')
        .eq('user_id', documentData.user_id)
        .or(`filename.eq.${documentData.filename},filename.eq.${documentData.original_filename || ''},original_filename.eq.${documentData.filename},original_filename.eq.${documentData.original_filename || ''}`);

      await forceRemoveRecords(finalCheckByUser || [], 'user_id + filename');

      // 7.4. Verificação final absoluta: buscar TODAS as referências possíveis
      const { data: absoluteFinalCheck, error: absoluteFinalError } = await supabase
        .from('documents_to_be_verified')
        .select('id, original_document_id, file_id, user_id, filename, status, created_at')
        .or(`original_document_id.eq.${documentId}${documentData.file_id ? `,file_id.eq.${documentData.file_id}` : ''}`);

      if (!absoluteFinalError && absoluteFinalCheck && absoluteFinalCheck.length > 0) {
        console.error(`[Simulação] ❌ ERRO CRÍTICO: Verificação absoluta encontrou ${absoluteFinalCheck.length} registro(s) restante(s)!`);
        console.error('[Simulação] Registros restantes:', absoluteFinalCheck);
        
        const removed = await forceRemoveRecords(absoluteFinalCheck, 'verificação absoluta');
        
        if (!removed) {
          throw new Error(`Não foi possível remover todos os registros. ${absoluteFinalCheck.length} registro(s) ainda existem em documents_to_be_verified.`);
        }
      }

      // 7.5. AGUARDAR 1 SEGUNDO E VERIFICAR NOVAMENTE (para pegar registros criados assincronamente)
      console.log('[Simulação] ⏳ Aguardando 1 segundo e verificando novamente...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: delayedCheck, error: delayedCheckError } = await supabase
        .from('documents_to_be_verified')
        .select('id, original_document_id, file_id, user_id, filename, status, created_at')
        .or(`original_document_id.eq.${documentId}${documentData.file_id ? `,file_id.eq.${documentData.file_id}` : ''},and(user_id.eq.${documentData.user_id},filename.ilike.%${documentData.filename}%)`);

      if (!delayedCheckError && delayedCheck && delayedCheck.length > 0) {
        console.warn(`[Simulação] ⚠️ Após delay: Encontrados ${delayedCheck.length} registro(s) criados após a simulação!`);
        const removed = await forceRemoveRecords(delayedCheck, 'verificação após delay');
        
        if (!removed) {
          console.error('[Simulação] ❌ Não foi possível remover registros criados após delay');
        }
      } else {
        console.log('[Simulação] ✅ Verificação após delay: Nenhum registro encontrado');
      }

      // 7.6. Verificação final definitiva
      const { data: ultimateCheck, error: ultimateCheckError } = await supabase
        .from('documents_to_be_verified')
        .select('id')
        .eq('original_document_id', documentId);

      if (!ultimateCheckError) {
        if (ultimateCheck && ultimateCheck.length > 0) {
          console.error(`[Simulação] ❌ FALHA FINAL: Ainda existem ${ultimateCheck.length} registro(s) após todas as tentativas!`);
          throw new Error(`Falha crítica: ${ultimateCheck.length} registro(s) ainda existem em documents_to_be_verified após todas as tentativas de remoção.`);
        } else {
          console.log('[Simulação] ✅✅✅ VERIFICAÇÃO FINAL: Confirmado - Nenhum registro restante!');
        }
      }

      setSuccess(`Falha simulada com sucesso para documento ${documentData.filename}. Documento removido de todas as tabelas relacionadas.`);
      await fetchRecentDocuments();
    } catch (err: any) {
      console.error('Erro ao simular falha:', err);
      setError(err.message || 'Erro ao simular falha de upload');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin text-tfe-blue-600" />
        <span className="ml-2 text-gray-600">Carregando documentos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <h2 className="text-xl font-bold text-gray-900">Simulação de Falha de Upload</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Esta ferramenta permite simular falhas de upload para testar o sistema de reupload.
          <strong className="text-red-600"> Use com cuidado em produção!</strong>
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>⚠️ Atenção:</strong> Esta ação irá:
          </p>
          <ul className="list-disc list-inside text-sm text-amber-700 mt-2 space-y-1">
            <li>Remover o arquivo do Storage</li>
            <li>Limpar file_url e file_id do documento</li>
            <li>Limpar registros relacionados em outras tabelas</li>
            <li>Marcar o documento como tendo upload falhado</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-700">
            <XCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <p>{success}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Documentos Recentes (20 mais recentes)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arquivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {doc.original_filename || doc.filename}
                        </div>
                        <div className="text-xs text-gray-500">{doc.filename}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {doc.profiles?.name || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {doc.profiles?.email || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      doc.status === 'completed' ? 'bg-green-100 text-green-800' :
                      doc.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {doc.file_url ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-xs">Presente</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <XCircle className="w-4 h-4 mr-1" />
                        <span className="text-xs">Ausente</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {doc.file_url ? (
                      <button
                        onClick={() => handleSimulateError(doc.id)}
                        disabled={processing === doc.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                      >
                        {processing === doc.id ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>Processando...</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4" />
                            <span>Simular Falha</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">Já sem arquivo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

