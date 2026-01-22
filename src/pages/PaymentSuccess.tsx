import { useEffect, useState, useRef } from 'react';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fileStorage } from '../utils/fileStorage';
import { generateUniqueFileName } from '../utils/fileUtils';
import { isUploadErrorSimulationActive } from '../utils/uploadSimulation';

/**
 * Marca documento como tendo upload falhado
 */
async function markDocumentUploadFailed(documentId: string, userId: string): Promise<void> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      console.error('Sessão não encontrada para marcar upload como falhado');
      return;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/update-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        documentId,
        userId,
        markUploadFailed: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao marcar upload como falhado:', errorText);
    } else {
      console.log(`✅ Documento ${documentId} marcado como upload falhado`);
    }
  } catch (error) {
    console.error('Erro ao marcar upload como falhado:', error);
  }
}

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const processedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setError('Session ID not found');
      return;
    }

    // Se já processamos esta sessão, ignorar
    if (processedSessionRef.current === sessionId) {
      console.log('⏭️ Sessão já foi processada, ignorando');
      return;
    }

    // Marcar como processando
    processedSessionRef.current = sessionId;
    console.log('✅ Processando sessão:', sessionId);

    handlePaymentSuccess(sessionId);
  }, [searchParams]);

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      setIsUploading(true);
      
      // Buscar informações da sessão do Stripe
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/get-session-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro ao buscar informações da sessão:', response.status, errorText);
        setError('Failed to retrieve session information. Please contact support.');
        return;
      }

      const sessionData = await response.json();
      const metadata = sessionData.metadata || {};
      const userId = metadata.userId;
      
      if (!userId) {
        setError('User ID not found in session metadata. Please contact support.');
        return;
      }

      // Detectar quantidade de documentos
      const documentCount = parseInt(metadata.documentCount || '1', 10);
      
      console.log('📄 ========================================');
      console.log('📄 QUANTIDADE DE DOCUMENTOS:', documentCount);
      console.log('📄 METADADOS COMPLETOS:', JSON.stringify(metadata, null, 2));
      console.log('📄 ========================================');

      // Coletar IDs dos documentos
      let documentIds: string[] = [];
      
      // Primeiro, tentar documentIds (string separada por vírgula)
        const documentIdsStr = metadata.documentIds || '';
      if (documentIdsStr) {
        documentIds = documentIdsStr.split(',').filter((id: string) => id.trim());
        console.log('📄 IDs encontrados em documentIds:', documentIds);
      }
        
      // Se não encontrou, tentar doc0_documentId, doc1_documentId, etc.
        if (documentIds.length === 0) {
          for (let i = 0; i < documentCount; i++) {
            const docId = metadata[`doc${i}_documentId`];
            if (docId) {
              documentIds.push(docId);
            }
          }
        console.log('📄 IDs encontrados em docX_documentId:', documentIds);
      }
      
      // Se ainda não encontrou, tentar documentId (documento único)
      if (documentIds.length === 0 && metadata.documentId) {
        documentIds = [metadata.documentId];
        console.log('📄 ID encontrado em documentId:', documentIds);
      }

      console.log('📄 IDs DOS DOCUMENTOS FINAIS:', documentIds);
      console.log('📄 TOTAL A PROCESSAR:', documentIds.length);

        if (documentIds.length === 0) {
          setError('No document IDs found. Please contact support.');
          return;
        }

      // Verificar se simulação de erro está ativa (apenas desenvolvimento)
      const shouldSimulate = isUploadErrorSimulationActive();
      if (shouldSimulate && documentIds.length > 0) {
        console.log('🔧 DEBUG: Simulação de erro de upload ativada');
        const firstDocId = documentIds[0].trim();
        await markDocumentUploadFailed(firstDocId, userId);
        setError('Upload failed: Simulated error for testing');
        navigate(`/dashboard/retry-upload?documentId=${firstDocId}&from=payment`);
        return;
      }

      // Processar cada documento EXATAMENTE UMA VEZ
        for (let i = 0; i < documentIds.length; i++) {
        const docId = documentIds[i].trim();
        console.log(`🔄 Processando documento ${i + 1}/${documentIds.length}: ${docId}`);

          // Buscar dados do documento
          const { data: docData, error: docError } = await supabase
            .from('documents')
            .select('*')
          .eq('id', docId)
            .single();

          if (docError || !docData) {
          console.error(`Erro ao buscar documento ${docId}:`, docError);
          continue;
        }

        // VERIFICAÇÃO: Se já tem file_url, pular (já foi processado)
        if (docData.file_url) {
          console.log(`⏭️ Documento ${docId} já tem file_url (${docData.file_url}), pulando`);
            continue;
          }

        // Atualizar status para processing (apenas se file_url for null)
        // Permite reprocessar documentos em processing que ainda não têm file_url
        // Isso garante que apenas uma execução consiga atualizar (atualização atômica)
        const { data: updateData, error: updateError } = await supabase
            .from('documents')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', docId)
          .is('file_url', null)
          .select();

        // Se não atualizou, outra execução já processou ou documento já tem file_url
        if (!updateData || updateData.length === 0) {
          console.log(`⏭️ Documento ${docId} não foi atualizado (já está sendo processado por outra execução ou já tem file_url), pulando`);
            continue;
        }

        if (updateError) {
          console.error(`❌ Erro ao atualizar documento ${docId}:`, updateError);
          continue;
        }

        console.log(`✅ Documento ${docId} atualizado para processing - continuando processamento`);

        // Obter URL do arquivo
          let publicUrl = docData.file_url;
        
          if (!publicUrl) {
          // Tentar obter do file_id
          if (docData.file_id) {
            const { data: { publicUrl: generatedUrl } } = supabase.storage
              .from('documents')
              .getPublicUrl(docData.file_id);
            publicUrl = generatedUrl;
          } else {
            // Buscar arquivo do IndexedDB ou Storage via metadados
            const docIndex = i;
            const metadataFileId = metadata[`doc${docIndex}_fileId`] || metadata[`doc${docIndex}_filePath`] || metadata.fileId;
            
            if (metadataFileId && metadataFileId.startsWith('file_')) {
              // IndexedDB
                const storedFileData = await fileStorage.getFile(metadataFileId);
              if (storedFileData?.file) {
                const filePath = generateUniqueFileName(
                  docData.filename || metadata[`doc${docIndex}_filename`] || 'document.pdf',
                  userId
                );
                
                const { error: uploadError } = await supabase.storage
                  .from('documents')
                  .upload(filePath, storedFileData.file, { upsert: false });

                if (uploadError) {
                  // Verificar se é erro de arquivo já existente
                  const errorMessage = uploadError.message || '';
                  const errorString = JSON.stringify(uploadError);
                  const errorObj = uploadError as any;
                  
                  if (errorObj.statusCode === '409' || errorString.includes('409') || 
                      errorMessage.includes('already exists') || errorMessage.includes('Duplicate')) {
                    // Arquivo já existe, usar existente
                    const { data: { publicUrl: existingUrl } } = supabase.storage
                      .from('documents')
                      .getPublicUrl(filePath);
                    publicUrl = existingUrl;
                    
                    // Atualizar apenas file_id (file_url será atualizado antes do webhook de forma atômica)
                    await supabase
                      .from('documents')
                      .update({ file_id: filePath })
                      .eq('id', docId);
                  } else {
                    // Erro real no upload - marcar como falhado
                    console.error(`❌ Erro no upload do arquivo para ${docId}:`, uploadError);
                    await markDocumentUploadFailed(docId, userId);
                    // Redirecionar para página de reupload
                    navigate(`/dashboard/retry-upload?documentId=${docId}&from=payment`);
                    continue; // Pular este documento
                  }
                } else {
                  // Upload bem-sucedido
                  const { data: { publicUrl: newUrl } } = supabase.storage
                    .from('documents')
                    .getPublicUrl(filePath);
                  publicUrl = newUrl;
                  
                  // Atualizar apenas file_id (file_url será atualizado antes do webhook de forma atômica)
                    await supabase
                      .from('documents')
                    .update({ file_id: filePath })
                    .eq('id', docId);
                }
              }
            } else if (metadataFileId && metadataFileId.includes('/')) {
              // Storage path
              const { data: { publicUrl: storageUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(metadataFileId);
              publicUrl = storageUrl;
              
              // Atualizar apenas file_id se necessário (file_url será atualizado antes do webhook de forma atômica)
              if (!docData.file_id || docData.file_id !== metadataFileId) {
                await supabase
                  .from('documents')
                  .update({ file_id: metadataFileId })
                  .eq('id', docId);
              }
            }
          }
          }
          
          if (!publicUrl) {
          console.error(`❌ Não foi possível obter URL do arquivo para ${docId}`);
            // Marcar como upload falhado
            await markDocumentUploadFailed(docId, userId);
            // Redirecionar para página de reupload
            navigate(`/dashboard/retry-upload?documentId=${docId}&from=payment`);
            continue;
          }
          
          // Buscar dados do cliente
          const { data: clientData } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', userId)
            .single();

        // VERIFICAÇÃO CRÍTICA ANTES DO WEBHOOK: Atualização atômica que marca o documento
        // Se esta atualização falhar, significa que outra execução já enviou para o webhook
        const { data: webhookLockData, error: webhookLockError } = await supabase
          .from('documents')
          .update({ 
            file_url: publicUrl, // Marcar file_url ANTES de enviar webhook
            updated_at: new Date().toISOString() 
          })
          .eq('id', docId)
          .eq('status', 'processing') // Só atualiza se ainda estiver em processing
          .is('file_url', null) // E se file_url ainda for null
          .select();

        // Se não atualizou, outra execução já processou e enviou para o webhook
        if (!webhookLockData || webhookLockData.length === 0) {
          console.log(`⏭️ Documento ${docId} já foi marcado com file_url por outra execução, pulando webhook`);
          continue;
        }

        if (webhookLockError) {
          console.error(`❌ Erro ao marcar documento ${docId} antes do webhook:`, webhookLockError);
          continue;
        }

        console.log(`🔒 Documento ${docId} bloqueado para envio ao webhook - continuando`);

        // Preparar payload do webhook
        const docIndex = i;
          const docFilename = metadata[`doc${docIndex}_filename`] || docData.filename;
          const docPages = parseInt(metadata[`doc${docIndex}_pages`] || docData.pages || '1', 10);
          const docIsNotarized = metadata[`doc${docIndex}_isNotarized`] === 'true';
          const docIsBankStatement = metadata[`doc${docIndex}_isBankStatement`] === 'true';
          const docOriginalLanguage = metadata[`doc${docIndex}_originalLanguage`] || docData.original_language || 'Portuguese';
          const docTargetLanguage = metadata[`doc${docIndex}_targetLanguage`] || docData.target_language || 'English';
          const docDocumentType = metadata[`doc${docIndex}_documentType`] || docData.document_type || 'Certified';
          const docPrice = docPages * (docIsNotarized ? 20 : 15) + (docIsBankStatement ? 10 : 0);

          const webhookPayload = {
            filename: docFilename,
            original_filename: metadata[`doc${docIndex}_originalFilename`] || docFilename,
          original_document_id: docId,
            url: publicUrl,
            mimetype: 'application/pdf',
            size: docData.file_size || 0,
            user_id: userId,
            pages: docPages,
            paginas: docPages,
            document_type: docDocumentType,
            tipo_trad: docIsNotarized ? 'Notarized' : 'Certified',
            total_cost: docPrice.toString(),
            valor: docPrice.toString(),
            source_language: docOriginalLanguage,
            target_language: docTargetLanguage,
            idioma_raiz: docOriginalLanguage,
            idioma_destino: docTargetLanguage,
            is_bank_statement: docIsBankStatement,
            client_name: clientData?.name || metadata.clientName || 'Unknown Client',
          source_currency: metadata[`doc${docIndex}_sourceCurrency`] || null,
          target_currency: metadata[`doc${docIndex}_targetCurrency`] || null
        };

        // Enviar para tradução
        try {
          const translationResponse = await fetch(`${supabaseUrl}/functions/v1/send-translation-webhook`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || ''}`
              },
              body: JSON.stringify(webhookPayload)
            });

          if (translationResponse.ok) {
            console.log(`✅ Documento ${i + 1}/${documentIds.length} enviado para tradução`);
          } else {
            const errorText = await translationResponse.text();
            console.error(`⚠️ Falha ao enviar documento ${i + 1}/${documentIds.length}:`, errorText);
          }
        } catch (translationError) {
          console.error(`⚠️ Erro ao enviar documento ${i + 1}/${documentIds.length}:`, translationError);
        }
      }

      setSuccess(true);
      setUploadProgress(100);
      
      // Log payment completion for each document
      try {
        const { Logger } = await import('../lib/loggingHelpers');
        const { ActionTypes } = await import('../types/actionTypes');
        for (const docId of documentIds) {
          await Logger.logPayment(
            ActionTypes.PAYMENT.STRIPE_COMPLETED,
            docId,
            'Stripe payment completed successfully',
            {
              session_id: sessionId,
              document_id: docId,
              user_id: userId,
              timestamp: new Date().toISOString()
            }
          );
        }
      } catch (logError) {
        // Non-blocking
      }

    } catch (err: any) {
      console.error('Erro no processamento:', err);
      setError(err.message || 'Erro ao processar pagamento');
    } finally {
      setIsUploading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-tfe-red-500 mx-auto mb-4" />
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">Processing Error</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-tfe-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-tfe-blue-700 transition-colors"
        >
          Back to Dashboard
        </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Confirmed!</h1>
        <p className="text-gray-600 mb-6">
          Your document has been successfully sent and is being processed.
        </p>
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-green-700 mb-4">
              Your document has been successfully processed and sent for translation.
            </p>
            <div className="bg-tfe-blue-50 border border-tfe-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-tfe-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-medium text-tfe-blue-800 mb-1">
                    ✅ Successfully Completed
                  </p>
                  <p className="text-xs text-tfe-blue-700">
                    Your document is now being processed. You can safely navigate away from this page.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-tfe-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-tfe-blue-700 transition-colors w-full"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Confirmed!</h1>
        <p className="text-gray-600 mb-6">
          Processing your document...
        </p>
        
        {isUploading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader className="w-5 h-5 text-tfe-blue-500 animate-spin" />
              <span className="text-sm text-gray-600">Uploading file...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-tfe-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">{uploadProgress}% completed</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-medium text-amber-800 mb-1">
                    ⚠️ Important
                  </p>
                  <p className="text-xs text-amber-700">
                    Please do not close this page or refresh the browser while the upload is in progress. 
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
