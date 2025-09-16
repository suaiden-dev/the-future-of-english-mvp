import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fileStorage } from '../utils/fileStorage';
import { generateUniqueFileName } from '../utils/fileUtils';

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setError('Session ID not found');
      return;
    }

    // Evitar processamento múltiplo (usando ref síncrono)
    if (hasProcessedRef.current) {
      console.log('DEBUG: Processamento já realizado, ignorando chamada duplicada');
      return;
    }

    console.log('DEBUG: Iniciando processamento do pagamento');
    hasProcessedRef.current = true;
    handlePaymentSuccess(sessionId);
  }, [searchParams]);

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      console.log('DEBUG: Processando sucesso do pagamento para session:', sessionId);
      
      // Buscar informações da sessão do Stripe usando Edge Function
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
        console.error('ERROR: Falha ao buscar informações da sessão:', response.status, errorText);
        setError('Failed to retrieve session information. Please contact support.');
        return;
      }

      const sessionData = await response.json();
      console.log('DEBUG: Dados da sessão:', sessionData);

      const { fileId, userId, filename, documentId, isMobile: sessionIsMobile } = sessionData.metadata;

      let storedFile = null;
      let filePath = null;
      let publicUrl = null;

      // Função consolidada para fazer upload do arquivo
      const uploadFileToStorage = async (file: File, userId: string) => {
            setIsUploading(true);
            setUploadProgress(0);

        const uploadPath = generateUniqueFileName(file.name, userId);

        console.log('DEBUG: Fazendo upload para:', uploadPath);
        console.log('DEBUG: Nome do arquivo:', file.name);
        console.log('DEBUG: Tamanho do arquivo:', file.size);
        console.log('DEBUG: Tipo do arquivo:', file.type);

            // Simular progresso do upload
            const progressInterval = setInterval(() => {
              setUploadProgress(prev => {
                if (prev >= 90) {
                  clearInterval(progressInterval);
                  return 90;
                }
                return prev + 10;
              });
            }, 200);

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('documents')
          .upload(uploadPath, file, {
                cacheControl: '31536000', // 1 ano de cache
                upsert: false
              });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (uploadError) {
              console.error('ERROR: Erro no upload:', uploadError);
              console.error('ERROR: Detalhes do erro:', JSON.stringify(uploadError, null, 2));
              setError(`Upload failed: ${uploadError.message}`);
              return;
            }

            console.log('DEBUG: Upload completed:', uploadData);

            // Obter URL pública do arquivo
        const { data: { publicUrl: generatedPublicUrl } } = supabase.storage
              .from('documents')
          .getPublicUrl(uploadPath);

        console.log('DEBUG: URL pública gerada:', generatedPublicUrl);
        
        return { uploadData, publicUrl: generatedPublicUrl, filePath: uploadPath };
      };

      // Lógica unificada para recuperar e fazer upload do arquivo
      if (sessionIsMobile === 'true') {
        // Mobile: Verificar se arquivo está no Storage ou fazer upload
        console.log('DEBUG: Mobile detectado via metadados da sessão');
        console.log('DEBUG: fileId recebido:', fileId);
        console.log('DEBUG: userId recebido:', userId);
        
        // Verificar se fileId é um filePath válido no Storage (upload direto do DocumentUploadModal)
        if (fileId && fileId.includes('/') && !fileId.startsWith('file_')) {
          // É um filePath válido do Storage
          console.log('DEBUG: ✅ fileId é um filePath válido do Storage:', fileId);
          
          // Obter URL pública do arquivo
          const { data: { publicUrl: storagePublicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(fileId);
          
          publicUrl = storagePublicUrl;
          filePath = fileId;
          
          console.log('DEBUG: ✅ Arquivo encontrado no Storage (upload direto):', publicUrl);
          
          // Obter informações do arquivo do Storage
          const { data: fileInfo } = await supabase.storage
            .from('documents')
            .list('', {
              search: fileId.split('/').pop() // Buscar pelo nome do arquivo
            });
          
          let fileSize = 0;
          if (fileInfo && fileInfo.length > 0) {
            fileSize = fileInfo[0].metadata?.size || 0;
            console.log('DEBUG: Tamanho do arquivo no Storage:', fileSize);
          }
          
          // Criar objeto simulado para compatibilidade
          storedFile = {
            file: { 
              name: filename, 
              type: 'application/pdf', 
              size: fileSize 
            },
            metadata: {
              pageCount: parseInt(sessionData.metadata.pages),
              documentType: sessionData.metadata.isCertified === 'true' ? 'Certificado' : 'Certified'
            }
          };
        
          console.log('DEBUG: ✅ USANDO ARQUIVO DO STORAGE - SEM UPLOAD DUPLICADO');
        } else {
          // Não é um filePath válido, tentar IndexedDB como fallback
          console.log('DEBUG: fileId não é um filePath válido do Storage, tentando IndexedDB');
          
          try {
            console.log('DEBUG: Tentando recuperar do IndexedDB:', fileId);
            storedFile = await fileStorage.getFile(fileId);
            
            if (storedFile) {
              console.log('DEBUG: Arquivo encontrado no IndexedDB');
              console.log('DEBUG: Nome do arquivo:', storedFile.file.name);
              console.log('DEBUG: Tamanho do arquivo:', storedFile.file.size);
              console.log('DEBUG: Tipo do arquivo:', storedFile.file.type);
              
              // Fazer upload do arquivo para o Supabase Storage
              const uploadResult = await uploadFileToStorage(storedFile.file, userId);
              if (!uploadResult) {
                setError('Upload failed. Please try again.');
                return;
              }
              publicUrl = uploadResult.publicUrl;
              filePath = uploadResult.filePath;
              
              console.log('DEBUG: Upload bem-sucedido:', uploadResult.uploadData);
            } else {
              // Tentar localStorage como último recurso (fallback do mobile)
              console.log('DEBUG: Arquivo não encontrado no IndexedDB, tentando localStorage');
              
              try {
                const localStorageFileInfo = localStorage.getItem(fileId);
                if (localStorageFileInfo && fileId.startsWith('mobile_fallback_')) {
                  console.log('DEBUG: Arquivo encontrado no localStorage (fallback mobile)');
                  
                  const fileInfo = JSON.parse(localStorageFileInfo);
                  console.log('DEBUG: Informações do arquivo no localStorage:', fileInfo);
                  
                  // Criar um arquivo simulado para compatibilidade
                  const fallbackFile = new File(
                    [new ArrayBuffer(fileInfo.size)], // Arquivo vazio, mas com tamanho correto
                    fileInfo.name,
                    { type: fileInfo.type, lastModified: fileInfo.lastModified }
                  );
                  
                  storedFile = {
                    file: fallbackFile,
                    metadata: {
                      pageCount: fileInfo.pageCount,
                      documentType: fileInfo.documentType
                    }
                  };
                  
                  // Fazer upload do arquivo para o Supabase Storage
                  const uploadResult = await uploadFileToStorage(fallbackFile, userId);
                  if (!uploadResult) {
                    setError('Upload failed. Please try again.');
                    return;
                  }
                  publicUrl = uploadResult.publicUrl;
                  filePath = uploadResult.filePath;
                  
                  console.log('DEBUG: Upload bem-sucedido do fallback mobile:', uploadResult.uploadData);
                  
                  // Limpar do localStorage após upload bem-sucedido
                  localStorage.removeItem(fileId);
                } else {
                  console.log('DEBUG: Arquivo NÃO encontrado nem no IndexedDB nem no localStorage');
                  setError('File not found in local storage. Please try uploading again.');
                  return;
                }
              } catch (localStorageError) {
                console.error('ERROR: Erro ao acessar localStorage:', localStorageError);
                setError('File not found in storage. Please try uploading again.');
                return;
              }
            }
          } catch (indexedDBError) {
            console.error('ERROR: Arquivo não encontrado nem no Storage nem no IndexedDB');
            setError('File not found in storage. Please try uploading again.');
            return;
          }
        }
      } else {
        // Desktop: recuperar arquivo do IndexedDB
        console.log('DEBUG: Desktop detectado, recuperando arquivo do IndexedDB:', fileId);
        console.log('DEBUG: userId recebido:', userId);
        
        let documentData = null;
        let checkError = null;

        // Tentar recuperar do IndexedDB primeiro
        try {
          console.log('DEBUG: Tentando recuperar do IndexedDB:', fileId);
          documentData = await fileStorage.getFile(fileId);
          if (documentData) {
            console.log('DEBUG: Arquivo encontrado no IndexedDB');
            console.log('DEBUG: Nome do arquivo:', documentData.file.name);
            console.log('DEBUG: Tamanho do arquivo:', documentData.file.size);
            console.log('DEBUG: Tipo do arquivo:', documentData.file.type);
            
            // Fazer upload do arquivo para o Supabase Storage
            const uploadResult = await uploadFileToStorage(documentData.file, userId);
            if (!uploadResult) {
              setError('Upload failed. Please try again.');
              return;
            }
            publicUrl = uploadResult.publicUrl;
            filePath = uploadResult.filePath;
            
            console.log('DEBUG: Upload bem-sucedido:', uploadResult.uploadData);
          } else {
            console.log('DEBUG: Arquivo NÃO encontrado no IndexedDB, tentando buscar no banco');
            // Se não encontrado no IndexedDB, tentar buscar no banco
            const { data: existingDoc, error: checkError } = await supabase
              .from('documents')
              .select('id, status')
              .eq('id', fileId)
              .single();

            if (checkError) {
              console.error('ERROR: Documento não encontrado no banco:', checkError);
              setError('Document not found in database. Please contact support.');
              return;
            }
            documentData = { file: { name: filename, type: 'application/pdf', size: 0 }, metadata: { pageCount: 0, documentType: 'Unknown' } }; // Placeholder for now
            console.log('DEBUG: Documento encontrado no banco (mas sem arquivo):', existingDoc);
          }
        } catch (indexedDBError) {
          console.error('ERROR: Arquivo não encontrado nem no Storage nem no IndexedDB');
          setError('File not found in storage. Please try uploading again.');
          return;
        }

        if (!documentData) {
          console.error('ERROR: Documento não encontrado após todas as tentativas');
          setError('Document not found after multiple attempts. Please contact support.');
          return;
        }
      }

      // Verificar se documentId existe nos metadados da sessão
      let finalDocumentId = documentId;
      
      if (!finalDocumentId) {
        console.error('ERROR: documentId não encontrado nos metadados da sessão');
        setError('Document ID not found in session metadata. Please contact support.');
        return;
      }

      console.log('DEBUG: Usando documentId dos metadados:', finalDocumentId);

      // Verificar se o documento realmente existe antes de tentar atualizar
      const { data: existingDoc, error: checkError } = await supabase
        .from('documents')
        .select('id, status')
        .eq('id', finalDocumentId)
        .single();

      if (checkError) {
        console.error('ERROR: Documento não encontrado no banco:', checkError);
        setError('Document not found in database. Please contact support.');
        return;
      }

      console.log('DEBUG: Documento confirmado no banco:', existingDoc);

      // Usar Edge Function para atualizar documento com service role
      console.log('DEBUG: Chamando Edge Function para atualizar documento');
      
      const updateResponse = await fetch(`${supabaseUrl}/functions/v1/update-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          documentId: finalDocumentId,
          fileUrl: publicUrl,
          userId: userId,
          filename: filename,
          pages: parseInt(sessionData.metadata.pages),
          totalCost: parseFloat(sessionData.metadata.totalPrice),
          documentType: sessionData.metadata.isCertified === 'true' ? 'Certificado' : 'Certified',
          isBankStatement: sessionData.metadata.isBankStatement === 'true',
          sourceLanguage: sessionData.metadata.originalLanguage || 'Portuguese',
          targetLanguage: sessionData.metadata.targetLanguage || 'English',
          clientName: sessionData.metadata.clientName || 'Cliente Padrão',
          sourceCurrency: sessionData.metadata.sourceCurrency || null,
          targetCurrency: sessionData.metadata.targetCurrency || null
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('ERROR: Falha ao atualizar documento via Edge Function:', updateResponse.status, errorText);
        setError('Failed to update document. Please contact support.');
        return;
      }

      const updateResult = await updateResponse.json();
      console.log('DEBUG: Documento atualizado via Edge Function:', updateResult);

      // Chamada manual para send-translation-webhook (Storage Trigger não existe)
      console.log('DEBUG: 🚀 INICIANDO ENVIO PARA N8N - CHAMADA MANUAL');
      console.log('DEBUG: Chamando send-translation-webhook para enviar para n8n');
      console.log('DEBUG: 📋 CONFIRMAÇÃO - APENAS UMA REQUISIÇÃO SERÁ ENVIADA PARA O N8N');
      console.log('DEBUG: Metadados da sessão disponíveis:', sessionData.metadata);
      console.log('DEBUG: Original Language:', sessionData.metadata.originalLanguage);
      console.log('DEBUG: Target Language:', sessionData.metadata.targetLanguage);
      console.log('DEBUG: Source Currency RAW:', sessionData.metadata.sourceCurrency);
      console.log('DEBUG: Target Currency RAW:', sessionData.metadata.targetCurrency);
      console.log('DEBUG: Document Type RAW:', sessionData.metadata.documentType);
      console.log('DEBUG: Is Notarized RAW:', sessionData.metadata.isNotarized);
      console.log('DEBUG: Is Bank Statement:', sessionData.metadata.isBankStatement);
      console.log('DEBUG: VERIFICAÇÃO CRÍTICA - CAMPOS DE MOEDA:');
      console.log('DEBUG: sessionData.metadata.sourceCurrency type:', typeof sessionData.metadata.sourceCurrency);
      console.log('DEBUG: sessionData.metadata.targetCurrency type:', typeof sessionData.metadata.targetCurrency);
      console.log('DEBUG: sessionData.metadata.documentType type:', typeof sessionData.metadata.documentType);
      console.log('DEBUG: sessionData.metadata.targetLanguage type:', typeof sessionData.metadata.targetLanguage);
      console.log('DEBUG: sourceCurrency value:', JSON.stringify(sessionData.metadata.sourceCurrency));
      console.log('DEBUG: targetCurrency value:', JSON.stringify(sessionData.metadata.targetCurrency));
      console.log('DEBUG: documentType value:', JSON.stringify(sessionData.metadata.documentType));
      console.log('DEBUG: targetLanguage value:', JSON.stringify(sessionData.metadata.targetLanguage));
      
      // Garantir que a URL seja válida
      let finalUrl = publicUrl;
      if (publicUrl && !publicUrl.startsWith('http')) {
        console.error('ERROR: URL inválida gerada:', publicUrl);
        setError('Invalid file URL generated. Please contact support.');
        return;
      }
      
      console.log('DEBUG: URL final para n8n:', finalUrl);
      
      const webhookPayload = {
        filename: filename, // Nome único gerado pelo generateUniqueFileName
        original_filename: sessionData.metadata.originalFilename || filename, // Nome original do arquivo
        original_document_id: finalDocumentId, // ID do documento original
        url: finalUrl,
        mimetype: 'application/pdf',
        size: storedFile?.file?.size || 0,
        user_id: userId,
        pages: parseInt(sessionData.metadata.pages),
        document_type: sessionData.metadata.documentType || (sessionData.metadata.isNotarized === 'true' ? 'Notorizado' : 'Certificado'),
        total_cost: sessionData.metadata.totalPrice,
        source_language: sessionData.metadata.originalLanguage || 'Portuguese',
        target_language: sessionData.metadata.targetLanguage || 'English',
        is_bank_statement: sessionData.metadata.isBankStatement === 'true',
        source_currency: sessionData.metadata.sourceCurrency || null,
        target_currency: sessionData.metadata.targetCurrency || null,
        document_id: finalDocumentId,
        // Campos padronizados para compatibilidade com n8n
        isPdf: true,
        fileExtension: 'pdf',
        tableName: 'profiles',
        schema: 'public'
      };

      console.log('DEBUG: Payload para send-translation-webhook:', webhookPayload);
      console.log('DEBUG: VERIFICAÇÃO FINAL - MOEDAS NO PAYLOAD:');
      console.log('DEBUG: source_currency no payload:', webhookPayload.source_currency);
      console.log('DEBUG: target_currency no payload:', webhookPayload.target_currency);
      console.log('DEBUG: Tipo source_currency:', typeof webhookPayload.source_currency);
      console.log('DEBUG: Tipo target_currency:', typeof webhookPayload.target_currency);

      const webhookResponse = await fetch(`${supabaseUrl}/functions/v1/send-translation-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('ERROR: Falha ao chamar send-translation-webhook:', webhookResponse.status, errorText);
        // Não falhar se isso der erro, apenas log
        console.log('WARNING: Webhook failed but continuing with process');
      } else {
        const webhookResult = await webhookResponse.json();
        console.log('DEBUG: Resposta do send-translation-webhook:', webhookResult);
        console.log('✅ SUCCESS: Documento enviado para n8n via send-translation-webhook');
        console.log('✅ CONFIRMAÇÃO: APENAS UMA REQUISIÇÃO FOI ENVIADA PARA O N8N');
      }

      // Remover arquivo do IndexedDB (apenas desktop usa IndexedDB)
      if (sessionIsMobile !== 'true' && fileId) {
        try {
          await fileStorage.deleteFile(fileId);
          console.log('DEBUG: Arquivo removido do IndexedDB');
        } catch (error) {
          console.log('WARNING: Could not remove file from IndexedDB:', error);
        }
      } else {
        console.log('DEBUG: Mobile - arquivo não estava no IndexedDB');
      }

      setSuccess(true);
      setUploadProgress(100);

      // Não redirecionar automaticamente - usuário clica quando quiser

    } catch (err: any) {
      console.error('ERROR: Erro no processamento:', err);
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
            
            {/* Aviso sobre não recarregar a página */}
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
            
            {/* Aviso importante para não fechar a página */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-medium text-amber-800 mb-1">
                    ⚠️ Important
                  </p>
                  <p className="text-xs text-amber-700">
                    Please do not close this page or refresh the browser while the upload is in progress. 
                    This could interrupt the process and cause delays.
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