import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fileStorage } from '../utils/fileStorage';

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Detecta se é mobile (iOS/Android)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setError('Session ID não encontrado');
      return;
    }

    handlePaymentSuccess(sessionId);
  }, [searchParams]);

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      console.log('DEBUG: Processando sucesso do pagamento para session:', sessionId);
      
      // Buscar informações da sessão do Stripe
      const response = await fetch('https://ywpogqwhwscbdhnoqsmv.supabase.co/functions/v1/get-session-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cG9ncXdod3NjYmRobm9xc212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTYxMzksImV4cCI6MjA2ODE3MjEzOX0.CsbI1OiT2i3EL31kvexrstIsaC48MD4fEHg6BSE6LZ4'
        },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar informações da sessão');
      }

      const sessionData = await response.json();
      console.log('DEBUG: Dados da sessão:', sessionData);

      const { fileId, userId, filename, documentId } = sessionData.metadata;

      let storedFile = null;
      let filePath = null;
      let publicUrl = null;

      if (isMobile) {
        // Mobile: Verificar se arquivo está no IndexedDB ou no Storage
        console.log('DEBUG: Mobile detectado, verificando localização do arquivo');
        console.log('DEBUG: fileId recebido:', fileId);
        console.log('DEBUG: userId recebido:', userId);
        
        // Tentar recuperar do IndexedDB primeiro
        try {
          console.log('DEBUG: Tentando recuperar do IndexedDB:', fileId);
          storedFile = await fileStorage.getFile(fileId);
          
          if (storedFile) {
            console.log('DEBUG: Arquivo encontrado no IndexedDB');
            console.log('DEBUG: Nome do arquivo:', storedFile.file.name);
            console.log('DEBUG: Tamanho do arquivo:', storedFile.file.size);
            console.log('DEBUG: Tipo do arquivo:', storedFile.file.type);
            
            // Fazer upload do arquivo para o Supabase Storage
            setIsUploading(true);
            setUploadProgress(0);

            const fileExt = storedFile.file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            filePath = `${userId}/${fileName}`;

            console.log('DEBUG: Fazendo upload para:', filePath);
            console.log('DEBUG: Configuração do Supabase verificada');
            console.log('DEBUG: Nome do arquivo original:', storedFile.file.name);
            console.log('DEBUG: Tamanho do arquivo:', storedFile.file.size);
            console.log('DEBUG: Tipo do arquivo:', storedFile.file.type);

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

            console.log('DEBUG: Iniciando upload para Supabase Storage...');
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('documents')
              .upload(filePath, storedFile.file, {
                cacheControl: '3600',
                upsert: false
              });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (uploadError) {
              console.error('ERROR: Erro no upload:', uploadError);
              console.error('ERROR: Detalhes do erro:', JSON.stringify(uploadError, null, 2));
              throw new Error(`Error uploading file: ${uploadError.message}`);
            }

            console.log('DEBUG: Upload completed:', uploadData);

            // Obter URL pública do arquivo
            const { data: { publicUrl: desktopPublicUrl } } = supabase.storage
              .from('documents')
              .getPublicUrl(filePath);

            publicUrl = desktopPublicUrl;
            console.log('DEBUG: URL pública gerada:', publicUrl);
            
            // Verificar se o upload foi bem-sucedido
            if (uploadData) {
              console.log('DEBUG: Upload bem-sucedido:', uploadData);
            }
          } else {
            console.log('DEBUG: Arquivo NÃO encontrado no IndexedDB');
          }
        } catch (indexedDBError) {
          console.log('DEBUG: Arquivo não encontrado no IndexedDB, verificando se está no Storage');
          
          // Verificar se fileId é na verdade um filePath no Storage
          try {
            const { data: { publicUrl: storagePublicUrl } } = supabase.storage
              .from('documents')
              .getPublicUrl(fileId);
            
            publicUrl = storagePublicUrl;
            console.log('DEBUG: Arquivo encontrado no Storage:', publicUrl);
            
            // Criar objeto simulado para compatibilidade
            storedFile = {
              file: { name: filename, type: 'application/pdf', size: 0 },
              metadata: {
                pageCount: parseInt(sessionData.metadata.pages),
                documentType: sessionData.metadata.isCertified === 'true' ? 'Certificado' : 'Notorizado'
              }
            };
          } catch (storageError) {
            console.error('ERROR: Arquivo não encontrado nem no IndexedDB nem no Storage');
            throw new Error('Arquivo não encontrado');
          }
        }
      } else {
        // Desktop: recuperar arquivo do IndexedDB
        console.log('DEBUG: Desktop detectado, recuperando arquivo do IndexedDB:', fileId);
        console.log('DEBUG: userId recebido:', userId);
        
        storedFile = await fileStorage.getFile(fileId);

        if (!storedFile) {
          console.error('ERROR: Arquivo não encontrado no IndexedDB para desktop');
          throw new Error('Arquivo não encontrado no IndexedDB');
        }

        console.log('DEBUG: Arquivo recuperado:', storedFile.file.name);
        console.log('DEBUG: Tamanho do arquivo:', storedFile.file.size);
        console.log('DEBUG: Tipo do arquivo:', storedFile.file.type);

        // Fazer upload do arquivo para o Supabase Storage
        setIsUploading(true);
        setUploadProgress(0);

        const fileExt = storedFile.file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        filePath = `${userId}/${fileName}`;

        console.log('DEBUG: Fazendo upload para:', filePath);
        console.log('DEBUG: Iniciando upload para Supabase Storage (desktop)...');
        console.log('DEBUG: Nome do arquivo original:', storedFile.file.name);
        console.log('DEBUG: Tamanho do arquivo:', storedFile.file.size);
        console.log('DEBUG: Tipo do arquivo:', storedFile.file.type);

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
          .upload(filePath, storedFile.file, {
            cacheControl: '3600',
            upsert: false
          });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (uploadError) {
          console.error('ERROR: Erro no upload (desktop):', uploadError);
          console.error('ERROR: Detalhes do erro (desktop):', JSON.stringify(uploadError, null, 2));
          throw new Error(`Error uploading file: ${uploadError.message}`);
        }

        console.log('DEBUG: Upload completed:', uploadData);

        // Obter URL pública do arquivo
        const { data: { publicUrl: desktopPublicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        publicUrl = desktopPublicUrl;
        console.log('DEBUG: URL pública gerada:', publicUrl);
        
        // Verificar se o upload foi bem-sucedido
        if (uploadData) {
          console.log('DEBUG: Upload bem-sucedido:', uploadData);
        }
      }

      // Verificar se documentId existe nos metadados da sessão
      let finalDocumentId = documentId;
      
      if (!finalDocumentId) {
        if (isMobile) {
          // Mobile: Criar documento no banco após upload
          console.log('DEBUG: Mobile - criando documento no banco após upload');
          
          const { data: newDocument, error: createError } = await supabase
            .from('documents')
            .insert({
              user_id: userId,
              filename: filename,
              file_url: publicUrl,
              pages: parseInt(sessionData.metadata.pages),
              total_cost: parseFloat(sessionData.metadata.totalPrice),
              status: 'pending',
              idioma_raiz: sessionData.metadata.originalLanguage || 'Unknown',
              is_bank_statement: sessionData.metadata.isBankStatement === 'true',
              tipo_trad: sessionData.metadata.isCertified === 'true' ? 'Certificado' : 'Notorizado',
              verification_code: Math.random().toString(36).substr(2, 9),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (createError) {
            console.error('ERROR: Erro ao criar documento no banco:', createError);
            throw new Error('Erro ao criar documento no banco de dados');
          }
          
          finalDocumentId = newDocument.id;
          console.log('DEBUG: Documento criado no banco:', finalDocumentId);
        } else {
          // Desktop: Buscar documento existente
          console.log('DEBUG: documentId não encontrado nos metadados, buscando por file_id');
          
          // Aguardar um pouco para o webhook processar
          console.log('DEBUG: Aguardando webhook processar...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Tentar buscar o documento várias vezes
          let documentData = null;
          let attempts = 0;
          const maxAttempts = 5;
          
          while (!documentData && attempts < maxAttempts) {
            attempts++;
            console.log(`DEBUG: Tentativa ${attempts} de buscar documento por file_id`);
            
            const { data, error } = await supabase
              .from('documents')
              .select('id')
              .eq('file_id', fileId)
              .eq('user_id', userId)
              .single();

            if (!error && data) {
              documentData = data;
              console.log('DEBUG: Documento encontrado por file_id:', documentData);
              break;
            } else {
              console.log(`DEBUG: Tentativa ${attempts} falhou, aguardando...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          if (!documentData) {
            console.error('ERROR: Documento não encontrado após todas as tentativas');
            throw new Error('ID do documento não encontrado');
          }

          finalDocumentId = documentData.id;
        }
      }

      console.log('DEBUG: Usando documentId:', finalDocumentId);

      // Verificar se o documento realmente existe antes de tentar atualizar
      const { data: existingDoc, error: checkError } = await supabase
        .from('documents')
        .select('id, status')
        .eq('id', finalDocumentId)
        .single();

      if (checkError) {
        console.error('ERROR: Documento não encontrado no banco:', checkError);
        throw new Error('Documento não encontrado no banco de dados');
      }

      console.log('DEBUG: Documento confirmado no banco:', existingDoc);

      // Usar Edge Function para atualizar documento com service role
      console.log('DEBUG: Chamando Edge Function para atualizar documento');
      
      const updateResponse = await fetch('https://ywpogqwhwscbdhnoqsmv.supabase.co/functions/v1/update-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cG9ncXdod3NjYmRobm9xc212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTYxMzksImV4cCI6MjA2ODE3MjEzOX0.CsbI1OiT2i3EL31kvexrstIsaC48MD4fEHg6BSE6LZ4'
        },
        body: JSON.stringify({
          documentId: finalDocumentId,
          fileUrl: publicUrl,
          userId: userId
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('ERROR: Falha ao atualizar documento via Edge Function:', updateResponse.status, errorText);
        throw new Error('Erro ao atualizar documento no banco');
      }

      const updateResult = await updateResponse.json();
      console.log('DEBUG: Documento atualizado via Edge Function:', updateResult);

      // Chamar send-translation-webhook para enviar para n8n
      console.log('DEBUG: Chamando send-translation-webhook para enviar para n8n');
      
      // Garantir que a URL seja válida
      let finalUrl = publicUrl;
      if (publicUrl && !publicUrl.startsWith('http')) {
        console.error('ERROR: URL inválida gerada:', publicUrl);
        throw new Error('URL do arquivo inválida');
      }
      
      console.log('DEBUG: URL final para n8n:', finalUrl);
      
      const webhookPayload = {
        filename: storedFile?.file.name || filename,
        url: finalUrl,
        mimetype: storedFile?.file.type || 'application/pdf',
        size: storedFile?.file.size || 0,
        user_id: userId,
        paginas: storedFile?.metadata?.pageCount || parseInt(sessionData.metadata.pages),
        tipo_trad: storedFile?.metadata?.documentType || (sessionData.metadata.isCertified === 'true' ? 'Certificado' : 'Notorizado'),
        valor: sessionData.metadata.totalPrice,
        idioma_raiz: 'Portuguese', // Assumindo português
        is_bank_statement: sessionData.metadata.isBankStatement === 'true',
        document_id: updateResult.document.id
      };

      console.log('DEBUG: Payload para send-translation-webhook:', webhookPayload);

      const webhookResponse = await fetch('https://ywpogqwhwscbdhnoqsmv.supabase.co/functions/v1/send-translation-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cG9ncXdod3NjYmRobm9xc212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTYxMzksImV4cCI6MjA2ODE3MjEzOX0.CsbI1OiT2i3EL31kvexrstIsaC48MD4fEHg6BSE6LZ4'
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('ERROR: Falha ao chamar send-translation-webhook:', webhookResponse.status, errorText);
        // Não falhar se isso der erro, apenas log
      } else {
        const webhookResult = await webhookResponse.json();
        console.log('DEBUG: Resposta do send-translation-webhook:', webhookResult);
        console.log('SUCCESS: Documento enviado para n8n via send-translation-webhook');
      }

      // Remover arquivo do IndexedDB (apenas desktop usa IndexedDB)
      if (!isMobile) {
        await fileStorage.deleteFile(fileId);
        console.log('DEBUG: Arquivo removido do IndexedDB');
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
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">Processing Error</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
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
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full"
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
              <Loader className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="text-sm text-gray-600">Uploading file...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">{uploadProgress}% completed</p>
          </div>
        )}
        
      </div>
    </div>
  );
} 