import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Copy, CheckCircle, DollarSign, Mail, Phone, AlertCircle, Clock, ArrowLeft, Upload, X } from 'lucide-react';
import { useDocumentCleanup } from '../hooks/useDocumentCleanup';
import { supabase } from '../lib/supabase';
import { getN8nProxyUrl } from '../utils/storageProxy';

export function ZelleCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Extract URL parameters FIRST
  const documentId = searchParams.get('document_id');
  const amount = searchParams.get('amount');
  const filename = searchParams.get('filename');
  const pages = searchParams.get('pages');
  
  const [step, setStep] = useState<'instructions' | 'confirmation' | 'completed'>('instructions');
  const [copied, setCopied] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState<any>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Hook para limpeza de documentos
  const { cleanupDocument, navigateWithCleanup } = useDocumentCleanup({
    documentId: documentId || undefined,
    isPaymentCompleted: paymentCompleted,
    shouldCleanup: !paymentCompleted && !!documentId,
    onCleanupComplete: () => {
      console.log('✅ Limpeza de documento concluída');
    }
  });

  // Zelle company data
  const ZELLE_INFO = {
    email: 'info@thefutureofenglish.com',
    businessName: 'The Future of English'
  };


  useEffect(() => {
    if (!documentId || !amount) {
      navigate('/dashboard');
      return;
    }
    
    const fetchDocumentData = async () => {
      try {
        // Verificar se documentId contém múltiplos IDs (separados por vírgula)
        const documentIds = documentId ? documentId.split(',').map(id => id.trim()) : [];
        
        if (documentIds.length === 0) {
          setError('No document ID provided');
          setLoading(false);
          return;
        }

        // Se houver múltiplos documentos, buscar todos
        if (documentIds.length > 1) {
          const { data: documents, error } = await supabase
            .from('documents')
            .select('*')
            .in('id', documentIds);

          if (error) throw error;
          
          // Para múltiplos documentos, usar o primeiro para exibição
          // (o ZelleCheckout pode precisar ser atualizado para mostrar múltiplos documentos)
          if (documents && documents.length > 0) {
            setDocumentData(documents[0]);
            console.log(`✅ Found ${documents.length} documents for Zelle payment`);
            console.log(`📄 Using first document for display: ${documents[0].id}`);
            
            // Arquivo já deve estar no Storage se chegou até aqui
            if (documents[0].file_url) {
              console.log('✅ Document already has file_url:', documents[0].file_url);
            } else {
              console.warn('⚠️ Document has no file_url - this should not happen in the new flow');
            }
          } else {
            throw new Error('No documents found');
          }
        } else {
          // Documento único
          const { data: document, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentIds[0])
            .single();

          if (error) throw error;
          setDocumentData(document);

          // Arquivo já deve estar no Storage se chegou até aqui
          if (document.file_url) {
            console.log('✅ Document already has file_url:', document.file_url);
          } else {
            console.warn('⚠️ Document has no file_url - this should not happen in the new flow');
          }
        }
      } catch (err) {
        console.error('Error fetching document:', err);
        setError('Failed to load document information');
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentData();
  }, [documentId, amount, navigate, filename]);


  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleReceiptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, or WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setPaymentReceipt(file);
    setError(null);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setPaymentReceipt(null);
    setReceiptPreview(null);
  };

  // Função para voltar um step ou limpar se for para sair
  const handleBackStep = async () => {
    if (step === 'instructions') {
      // Se está na primeira etapa e clica back, vai sair - fazer limpeza
      await navigateWithCleanup('/dashboard');
    } else {
      // Apenas voltando um step, não precisa limpar
      setStep('instructions');
    }
  };

  const uploadReceiptToSupabase = async (file: File): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}/${documentId}/receipt_${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('payment-receipts')
      .upload(fileName, file);

    if (error) {
      console.error('Error uploading receipt:', error);
      throw new Error('Failed to upload receipt');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('payment-receipts')
      .getPublicUrl(fileName);
      
    return publicUrl;
  };

  const sendWebhook = async (receiptUrl: string, userId: string): Promise<string> => {
    try {
      // Separar documentId em array se houver múltiplos
      const documentIds = documentId ? documentId.split(',').map(id => id.trim()) : [];
      
      // Enviar como array se houver múltiplos, senão como string única
      const webhookPayload: any = {
        user_id: userId,
        image_url: getN8nProxyUrl(receiptUrl),
        value: amount,
        currency: "USD",
        fee_type: "traducao_doc",
        timestamp: new Date().toISOString()
      };
      
      // Se houver múltiplos documentos, enviar como array, senão como string
      if (documentIds.length > 1) {
        webhookPayload.document_ids = documentIds;
        webhookPayload.document_id = documentIds[0]; // Manter document_id para retrocompatibilidade
      } else {
        webhookPayload.document_id = documentId;
      }
      
      console.log('DEBUG: Webhook payload:', JSON.stringify(webhookPayload, null, 2));
      
      const response = await fetch('https://nwh.thefutureofenglish.com/webhook/zelle-global-tfoe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('Webhook response:', responseText);
      return responseText;
    } catch (error) {
      console.error('Error sending webhook:', error);
      throw error; // Now we throw the error since we need to handle it
    }
  };

  const isValidPaymentResponse = (responseText: string): boolean => {
    try {
      // Tentar parsear como JSON primeiro
      const responseObj = JSON.parse(responseText);
      
      // Verificar se tem a propriedade response com valor válido
      if (responseObj && responseObj.response) {
        const validResponses = [
          "The proof of payment is valid.",
          "The proof of payment is valid",
          "Valid payment",
          "Payment is valid"
        ];
        
        const response = responseObj.response.trim().toLowerCase();
        return validResponses.some(valid => response.includes(valid.toLowerCase()));
      }
      
      // Fallback para string simples
      const validResponse = "The proof of payment is valid.";
      return responseText.trim().toLowerCase().includes(validResponse.toLowerCase());
      
    } catch (error) {
      // Se não conseguir parsear JSON, tratar como string simples
      const validResponse = "The proof of payment is valid.";
      return responseText.trim().toLowerCase().includes(validResponse.toLowerCase());
    }
  };

  const sendNotificationToAdmin = async (userProfile: any, paymentId: string, userId: string, needsManualReview: boolean = false) => {
    try {
      console.log('DEBUG: Enviando notificação Zelle via payment-notifications function');
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      // Separar documentId em array se houver múltiplos
      const documentIds = documentId ? documentId.split(',').map(id => id.trim()) : [];
      
      // Se houver múltiplos documentos, enviar cada um individualmente
      if (documentIds.length > 1) {
        console.log(`DEBUG: Enviando notificações para ${documentIds.length} documentos`);
        
        // Buscar todos os documentos para obter os filenames
        const { data: allDocuments } = await supabase
          .from('documents')
          .select('id, filename')
          .in('id', documentIds);
        
        // Enviar notificação para cada documento
        for (const doc of allDocuments || []) {
          const notificationPayload = {
            payment_id: paymentId || 'pending', // Será criado pelo n8n
            user_id: userId,
            document_id: doc.id,
            payment_method: 'zelle',
            amount: parseFloat(amount || '0'),
            filename: doc.filename || filename || 'Unknown Document',
            notification_type: 'payment_received',
            status: needsManualReview ? 'comprovante requer revisão manual' : 'aguardando aprovação de pagamento'
          };
          
          console.log(`DEBUG: Payload para payment-notifications (doc ${doc.id}):`, JSON.stringify(notificationPayload, null, 2));
          
          const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/payment-notifications`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`
            },
            body: JSON.stringify(notificationPayload)
          });
          
          if (notificationResponse.ok) {
            const result = await notificationResponse.json();
            console.log(`SUCCESS: Notificação Zelle enviada para documento ${doc.id}:`, result.message);
          } else {
            const errorText = await notificationResponse.text();
            console.error(`WARNING: Falha ao enviar notificação Zelle para documento ${doc.id}:`, notificationResponse.status, errorText);
          }
        }
        
        return; // Retornar após processar todos os documentos
      }
      
      // Documento único - fluxo original
      const notificationPayload = {
        payment_id: paymentId || 'pending', // Será criado pelo n8n
        user_id: userId,
        document_id: documentId,
        payment_method: 'zelle',
        amount: parseFloat(amount || '0'),
        filename: filename || 'Unknown Document',
        notification_type: 'payment_received',
        status: needsManualReview ? 'comprovante requer revisão manual' : 'aguardando aprovação de pagamento'
      };
      
      console.log('DEBUG: Payload para payment-notifications:', JSON.stringify(notificationPayload, null, 2));
      console.log('DEBUG: Session token disponível:', !!session?.access_token);
      console.log('DEBUG: Supabase URL:', supabaseUrl);
      console.log('DEBUG: needsManualReview:', needsManualReview);
      
      const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/payment-notifications`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify(notificationPayload)
      });
      
      console.log('DEBUG: Response status:', notificationResponse.status);
      console.log('DEBUG: Response headers:', Object.fromEntries(notificationResponse.headers.entries()));
      
      if (notificationResponse.ok) {
        const result = await notificationResponse.json();
        console.log('SUCCESS: Notificações Zelle enviadas:', result.message);
      } else {
        const errorText = await notificationResponse.text();
        console.error('WARNING: Falha ao enviar notificações Zelle:', notificationResponse.status, errorText);
      }
    } catch (error) {
      console.error('Error sending admin notification:', error);
      // Non-critical error, so we don't throw
    }
  };

  const sendDocumentForTranslation = async (documentData: any, userProfile: any) => {
    try {
      console.log('🚀 Enviando documento para processo de tradução:', documentData.filename);
      
      // Gerar a URL pública do documento
      let publicUrl: string;
      
      if (documentData.file_url) {
        // Se o documento tem file_url (URL direta do arquivo)
        publicUrl = documentData.file_url;
        console.log('📄 URL do documento (do file_url):', publicUrl);
      } else {
        // Fallback para estrutura de Storage (assumindo estrutura padrão)
        const { data: { publicUrl: fallbackUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(`${documentData.user_id}/${documentData.filename}`);
        publicUrl = fallbackUrl;
        console.log('📄 URL do documento (fallback):', publicUrl);
      }

      // Preparar payload para o webhook de tradução
      const translationPayload = {
        filename: documentData.filename,
        url: publicUrl,
        mimetype: 'application/pdf',
        size: documentData.file_size || 0,
        user_id: documentData.user_id,
        pages: documentData.pages || 1,
        document_type: documentData.tipo_trad || 'Certificado',
        total_cost: amount || '0',
        source_language: documentData.idioma_raiz || 'Portuguese',
        target_language: documentData.idioma_destino || 'English',
        is_bank_statement: documentData.is_bank_statement || false,
        client_name: documentData.client_name || userProfile?.name,
        source_currency: documentData.source_currency || null,
        target_currency: documentData.target_currency || null,
        document_id: documentId,
        // Campos padronizados para compatibilidade com n8n
        isPdf: true,
        fileExtension: 'pdf',
        tableName: 'profiles',
        schema: 'public'
      };

      console.log('📨 Payload para tradução:', JSON.stringify(translationPayload, null, 2));

      // Enviar para a edge function send-translation-webhook
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${supabaseUrl}/functions/v1/send-translation-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify(translationPayload)
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Documento enviado para tradução com sucesso:', result);
      } else {
        console.error('❌ Erro ao enviar documento para tradução:', result);
        throw new Error(result.error || 'Failed to send document for translation');
      }

    } catch (error) {
      console.error('Error sending document for translation:', error);
      throw error;
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentReceipt) {
      setError('Please attach your payment receipt');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const userId = session.user.id;

      // Buscar dados do usuário para notificação
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', userId)
        .single();

      setUploadingReceipt(true);
      const receiptUrl = await uploadReceiptToSupabase(paymentReceipt);
      setUploadingReceipt(false);

      // Documento já deve ter file_url neste ponto
      console.log('📄 Using document with existing file_url:', documentData?.file_url);

      // Enviar webhook primeiro para validação
      console.log('🔄 Enviando comprovante para validação...');
      let isValid = false;

      try {
        const webhookResponse = await sendWebhook(receiptUrl, session.user.id);
        isValid = isValidPaymentResponse(webhookResponse);
        
        console.log('✅ Resposta do webhook:', webhookResponse);
        console.log('🎯 Comprovante válido:', isValid);
        
      } catch (webhookError) {
        console.error('❌ Erro no webhook de validação:', webhookError);
        // Em caso de erro no webhook, considerar como inválido
        isValid = false;
      }

      // Inserir registro de pagamento Zelle imediatamente
      console.log('DEBUG: Criando registro de pagamento Zelle no banco de dados...');
      
      // Extrair o primeiro ID se houver múltiplos (separados por vírgula)
      const firstId = documentId ? documentId.split(',')[0].trim() : null;
      // Validar se é um UUID válido para não quebrar o banco
      const isValidUuid = firstId ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstId) : false;

      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          document_id: isValidUuid ? firstId : null,
          amount: parseFloat(amount || '0'),
          currency: 'USD',
          payment_method: 'zelle',
          status: isValid ? 'pending_verification' : 'comprovante requer revisão manual',
          receipt_url: receiptUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (paymentError) {
        console.error('❌ Erro ao criar registro de pagamento:', paymentError);
        // Não vamos travar o fluxo se apenas o registro de pagamento falhar, 
        // mas é um problema crítico para o admin
      } else {
        console.log('✅ Registro de pagamento criado com ID:', paymentRecord?.id);
      }

      // Processar baseado na validação
      // Separar documentId em array se houver múltiplos
      const documentIds = documentId ? documentId.split(',').map(id => id.trim()) : [];
      
      if (isValid) {
        // Comprovante válido - fluxo normal
        // Atualizar todos os documentos
        if (documentIds.length > 1) {
          await supabase.from('documents').update({ 
            status: 'processing',  // Mudando para processing pois vai iniciar tradução
            payment_method: 'zelle'
          }).in('id', documentIds);
        } else {
          await supabase.from('documents').update({ 
            status: 'processing',  // Mudando para processing pois vai iniciar tradução
            payment_method: 'zelle'
          }).eq('id', documentIds[0] || documentId);
        }

        // Enviar documentos automaticamente para tradução
        try {
          // Se houver múltiplos documentos, enviar cada um
          if (documentIds.length > 1) {
            // Buscar todos os documentos
            const { data: allDocuments } = await supabase
              .from('documents')
              .select('*')
              .in('id', documentIds);
            
            if (allDocuments) {
              for (const doc of allDocuments) {
                await sendDocumentForTranslation(doc, userProfile);
                console.log(`✅ Documento ${doc.id} enviado para tradução automaticamente`);
              }
            }
          } else {
            await sendDocumentForTranslation(documentData, userProfile);
            console.log('✅ Documento enviado para tradução automaticamente');
          }
        } catch (translationError) {
          console.error('❌ Erro ao enviar documento para tradução:', translationError);
          // Não falhar o pagamento se a tradução falhar - pode ser reenviad manualmente
        }

        // Enviar notificação normal para admin informando pagamento válido
        await sendNotificationToAdmin(userProfile, paymentRecord?.id || null, userId, false);
        
        console.log('✅ Comprovante validado automaticamente');
      } else {
        // Comprovante inválido - precisa revisão manual
        // Atualizar todos os documentos
        if (documentIds.length > 1) {
          await supabase.from('documents').update({ 
            status: 'pending_manual_review',
            payment_method: 'zelle'
          }).in('id', documentIds);
        } else {
          await supabase.from('documents').update({ 
            status: 'pending_manual_review',
            payment_method: 'zelle'
          }).eq('id', documentIds[0] || documentId);
        }

        // Enviar notificação para revisão manual
        console.log('DEBUG: Tentando enviar notificação para revisão manual');
        console.log('DEBUG: UserProfile disponível:', !!userProfile);
        
        console.log('DEBUG: Chamando sendNotificationToAdmin com needsManualReview=true');
        await sendNotificationToAdmin(userProfile, paymentRecord?.id || null, userId, true);
        
        console.log('⚠️ Comprovante precisa de revisão manual');
      }
      
      // Marcar pagamento como completado para evitar limpeza desnecessária
      setPaymentCompleted(true);
      setStep('completed');
    } catch (err: any) {
      console.error('Error confirming Zelle payment:', err);
      setError(err.message || 'Failed to confirm payment. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadingReceipt(false);
    }
  };  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateWithCleanup('/dashboard')}
              className="flex items-center space-x-2 text-slate-700 hover:text-slate-900 transition-colors px-3 py-2 rounded-xl hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </button>
            <div className="flex items-center space-x-3 px-4 py-2 bg-slate-800 rounded-xl">
              <DollarSign className="w-5 h-5 text-white" />
              <h1 className="text-lg font-semibold text-white">Zelle Payment</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-200">
            {step === 'instructions' && (
              <>
                <div className="bg-slate-800 text-white p-6 rounded-t-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-slate-700 rounded-2xl"><DollarSign className="w-8 h-8 text-white" /></div>
                    <div><h2 className="text-2xl font-bold">Pay with Zelle</h2><p className="text-slate-300">Secure bank-to-bank transfer</p></div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-center">
                    <div className="flex items-center"><div className="w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold">1</div><span className="ml-3 font-semibold text-slate-800">Send Payment</span></div>
                    <div className="w-20 h-0.5 bg-gray-300 mx-6"></div>
                    <div className="flex items-center"><div className="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold">2</div><span className="ml-3 text-gray-600">Confirm</span></div>
                  </div>
                  <div className="text-center"><h3 className="text-xl font-bold text-gray-900 mb-2">Step 1: Send Payment via Zelle</h3><p className="text-gray-600">Use your banking app to send the payment</p></div>
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-4"><Phone className="w-5 h-5 text-slate-700" /><p className="font-semibold text-slate-800">Send money via Zelle to:</p></div>
                    <div className="mb-6">
                      <div className="bg-white rounded-2xl p-4 border border-gray-200 max-w-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center"><Mail className="w-5 h-5 text-white" /></div>
                            <div><p className="font-medium text-gray-600">Email Address</p><p className="font-mono text-sm font-bold text-gray-900">{ZELLE_INFO.email}</p></div>
                          </div>
                          <button onClick={() => copyToClipboard(ZELLE_INFO.email, 'email')} className={`flex items-center space-x-2 px-3 py-2 rounded-2xl font-medium transition-colors text-sm ${copied === 'email' ? 'bg-green-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}>{copied === 'email' ? <><CheckCircle className="w-4 h-4" /><span>Copied!</span></> : <><Copy className="w-4 h-4" /><span>Copy</span></>}</button>
                        </div>
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <div className="flex items-start space-x-3"><AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" /><div><h4 className="font-semibold text-amber-800 mb-2">Important Instructions:</h4><ul className="space-y-1 text-sm text-amber-700"><li>• Send exactly <span className="font-bold">${amount}.00</span></li><li>• Include your full name in the memo/message</li><li>• Keep your confirmation code and receipt</li></ul></div></div>
                    </div>
                  </div>
                  <button onClick={() => setStep('confirmation')} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 px-6 rounded-2xl font-semibold transition-colors">I've Sent the Payment</button>
                  <p className="text-center text-gray-500 text-sm">Make sure to complete your Zelle transfer before clicking above.</p>
                </div>
              </>
            )}
            {step === 'confirmation' && (
              <>
                <div className="bg-slate-800 text-white p-6 rounded-t-2xl">
                  <div className="flex items-center space-x-4"><div className="p-3 bg-slate-700 rounded-2xl"><CheckCircle className="w-8 h-8 text-white" /></div><div><h2 className="text-2xl font-bold">Confirm Your Payment</h2><p className="text-slate-300">Almost done! Just need your confirmation details</p></div></div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-center">
                    <div className="flex items-center"><div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center"><CheckCircle className="w-6 h-6" /></div><span className="ml-3 font-semibold text-green-600">Payment Sent</span></div>
                    <div className="w-20 h-0.5 bg-green-600 mx-6"></div>
                    <div className="flex items-center"><div className="w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold">2</div><span className="ml-3 font-semibold text-slate-800">Confirm</span></div>
                  </div>
                  <div className="text-center"><h3 className="text-xl font-bold text-gray-900 mb-2">Great! Now please confirm your payment</h3><p className="text-gray-600">Upload your payment receipt to complete the verification</p></div>
                  
                  {/* Payment Receipt Requirements */}
                  <div className="bg-blue-50 rounded-xl p-5 mb-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Your payment confirmation must include:</h4>
                    
                    <div className="space-y-3 text-sm mb-4">
                      <div className="flex items-start space-x-3">
                        <span className="w-5 h-5 bg-blue-600 text-white rounded text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                        <div>
                          <span className="font-medium text-gray-900">Confirmation Code</span>
                          <span className="text-gray-600 ml-1">- The unique transaction code from Zelle</span>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <span className="w-5 h-5 bg-blue-600 text-white rounded text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                        <div>
                          <span className="font-medium text-gray-900">Payment Date</span>
                          <span className="text-gray-600 ml-1">- When the transfer was completed</span>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <span className="w-5 h-5 bg-blue-600 text-white rounded text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                        <div>
                          <span className="font-medium text-gray-900">Payment Amount</span>
                          <span className="text-gray-600 ml-1">- The exact amount <strong className="text-green-600">(${amount} USD)</strong></span>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <span className="w-5 h-5 bg-blue-600 text-white rounded text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                        <div>
                          <span className="font-medium text-gray-900">Recipient Information</span>
                          <span className="text-gray-600 ml-1">- Who received the payment</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-green-700 bg-green-100 rounded-lg p-3">
                      <strong>💡 Tip:</strong> Complete screenshots are verified automatically within minutes. Incomplete receipts need manual review (up to 24 hours).
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <label className="block font-semibold text-gray-800 mb-2">Payment Receipt *</label>
                    {!paymentReceipt ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-slate-400 transition-colors">
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleReceiptUpload} className="hidden" id="receipt-upload" />
                        <label htmlFor="receipt-upload" className="cursor-pointer">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 font-medium">Click to upload receipt</p>
                          <p className="text-sm text-gray-500 mt-1">JPG, PNG or WEBP (max 5MB)</p>
                        </label>
                      </div>
                    ) : (
                      <div className="relative bg-white rounded-2xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 overflow-hidden"><img src={receiptPreview || ''} alt="Preview" className="w-12 h-12 object-cover rounded-xl border border-gray-200 flex-shrink-0" /><div className="overflow-hidden"><p className="font-medium text-gray-900 truncate">{paymentReceipt.name}</p><p className="text-sm text-gray-600">{Math.round(paymentReceipt.size / 1024)} KB</p></div></div>
                          <button onClick={removeReceipt} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 ml-2"><X className="w-4 h-4 text-gray-500" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                  {error && (<div className="flex items-center space-x-3 text-red-700 bg-red-50 p-4 rounded-2xl border border-red-200"><AlertCircle className="w-5 h-5 flex-shrink-0" /><span>{error}</span></div>)}
                  <div className="flex space-x-4">
                    <button onClick={handleBackStep} className="flex items-center justify-center space-x-2 flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-2xl font-semibold transition-colors"><ArrowLeft className="w-4 h-4" /><span>Back</span></button>
                    <button onClick={handleConfirmPayment} disabled={!paymentReceipt || isSubmitting} className="flex items-center justify-center space-x-2 flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 px-4 rounded-2xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>
                            {uploadingReceipt ? 'Uploading Receipt...' : 'Confirming...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Confirm Payment</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
            {step === 'completed' && (
              <>
                <div className="bg-slate-800 text-white p-6 rounded-t-2xl text-center">
                  <div className="inline-flex items-center justify-center p-4 bg-green-600 rounded-3xl mb-4"><CheckCircle className="w-12 h-12 text-white" /></div>
                  <h2 className="text-2xl font-bold mb-2">Payment Submitted!</h2>
                  <p className="text-slate-300">Your payment has been recorded and is now being processed.</p>
                </div>
                <div className="p-6 text-center">
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-center space-x-2"><Clock className="w-5 h-5 text-slate-700" /><span>What happens next?</span></h3>
                    <div className="space-y-4 text-left max-w-2xl mx-auto">
                      <div className="flex items-start space-x-4 p-4 bg-white rounded-2xl border border-gray-200"><div className="p-2 bg-slate-100 rounded-2xl flex-shrink-0"><Clock className="w-5 h-5 text-slate-700" /></div><div><p className="font-semibold text-gray-900 mb-1">Payment Verification</p><p className="text-gray-600 text-sm">We'll verify your payment within 1-2 business days.</p></div></div>
                      <div className="flex items-start space-x-4 p-4 bg-white rounded-2xl border border-gray-200"><div className="p-2 bg-slate-100 rounded-2xl flex-shrink-0"><CheckCircle className="w-5 h-5 text-slate-700" /></div><div><p className="font-semibold text-gray-900 mb-1">Document Processing</p><p className="text-gray-600 text-sm">Once verified, we'll start your translation.</p></div></div>
                      <div className="flex items-start space-x-4 p-4 bg-white rounded-2xl border border-gray-200"><div className="p-2 bg-slate-100 rounded-2xl flex-shrink-0"><Mail className="w-5 h-5 text-slate-700" /></div><div><p className="font-semibold text-gray-900 mb-1">Email Updates</p><p className="text-gray-600 text-sm">You'll receive email notifications on your document status.</p></div></div>
                    </div>
                  </div>
                  <button onClick={() => navigate('/dashboard')} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 px-6 rounded-2xl font-semibold transition-colors">Go to Dashboard</button>
                </div>
              </>
            )}
          </div>
          
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 sticky top-8">
              <div className="bg-gray-50 p-4 border-b border-gray-200 rounded-t-2xl"><h3 className="text-lg font-bold text-gray-900">Payment Summary</h3></div>
              <div className="p-4 space-y-6">
                <div className="text-center">
                  <p className="text-gray-600 font-medium mb-2">Total Amount</p>
                  <p className="text-4xl font-bold text-slate-800 mb-4">${amount}.00</p>
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                    <p className="font-bold text-gray-800 truncate">{filename || 'Document'}</p>
                    <p className="text-gray-600 text-sm">{pages} page{parseInt(pages || '1') !== 1 ? 's' : ''}</p>
                    <p className="text-slate-700 font-semibold text-sm">Translation Service</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Payment Method</h4>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="p-2 bg-slate-800 rounded-2xl"><DollarSign className="w-5 h-5 text-white" /></div>
                    <div><p className="font-semibold text-gray-900">Zelle Transfer</p><p className="text-gray-600 text-sm">Bank-to-bank transfer</p></div>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-2xl border border-blue-200">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div><h5 className="font-semibold text-blue-900 mb-1">Secure Process</h5><p className="text-blue-700 text-sm">Your payment is processed via your bank's Zelle service. We will manually verify your receipt.</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}