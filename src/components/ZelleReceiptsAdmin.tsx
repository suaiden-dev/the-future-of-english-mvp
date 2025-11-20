import { useState, useEffect } from 'react';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  FileText, 
  DollarSign,
  Calendar,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import PostgreSQLService from '../lib/postgresql-edge';
import { notifyAuthenticatorsPendingDocuments } from '../utils/webhookNotifications';

interface ZellePayment {
  id: string;
  user_id: string;
  document_id: string;
  amount: number;
  payment_method: string;
  status: string;
  receipt_url: string;
  zelle_confirmation_code: string | null;
  zelle_verified_at: string | null;
  zelle_verified_by: string | null;
  created_at: string;
  updated_at: string;
  // Dados relacionados
  profiles: {
    name: string;
    email: string;
  };
  documents: {
    filename: string;
    status: string;
    client_name: string;
  };
  verifier?: {
    name: string;
    email: string;
  };
}

export function ZelleReceiptsAdmin() {
  const [payments, setPayments] = useState<ZellePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<ZellePayment | null>(null);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
  const [sendingToTranslation, setSendingToTranslation] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending_verification' | 'pending_manual_review' | 'completed' | 'failed'>('pending_verification');
  
  // Estados para modal de rejeição
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    payment: ZellePayment | null;
  }>({ isOpen: false, payment: null });
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [sendingRejection, setSendingRejection] = useState(false);

  // Estados para modal de código de confirmação Zelle
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    payment: ZellePayment | null;
  }>({ isOpen: false, payment: null });
  const [confirmationCode, setConfirmationCode] = useState<string>('');
  const [savingConfirmationCode, setSavingConfirmationCode] = useState(false);

  useEffect(() => {
    loadPayments();
    initializePostgreSQL();
  }, [filter]);

  const initializePostgreSQL = async () => {
    try {
      // Testar conexão
      const connectionOk = await PostgreSQLService.testConnection();
      if (connectionOk) {
        // Criar tabela se não existir
        await PostgreSQLService.createTableIfNotExists();
      }
    } catch (error) {
      console.error('⚠️ PostgreSQL initialization failed (non-critical):', error);
      // Não bloqueia o funcionamento da aplicação
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('payments')
        .select(`
          *,
          profiles:user_id (name, email),
          documents:document_id (filename, status, client_name)
        `)
        .eq('payment_method', 'zelle')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Buscar dados dos verificadores
      const paymentsWithVerifiers = await Promise.all(
        data.map(async (payment) => {
          if (payment.zelle_verified_by) {
            const { data: verifier } = await supabase
              .from('profiles')
              .select('name, email')
              .eq('id', payment.zelle_verified_by)
              .single();
            
            return { ...payment, verifier };
          }
          return payment;
        })
      );

      setPayments(paymentsWithVerifiers);
    } catch (err: any) {
      console.error('Error loading Zelle payments:', err);
      setError(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const openRejectionModal = (payment: ZellePayment) => {
    setRejectionModal({ isOpen: true, payment });
    setRejectionReason('');
    setCustomReason('');
  };

  const closeRejectionModal = () => {
    setRejectionModal({ isOpen: false, payment: null });
    setRejectionReason('');
    setCustomReason('');
  };

  const openConfirmationModal = (payment: ZellePayment) => {
    setConfirmationModal({ isOpen: true, payment });
    setConfirmationCode('');
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({ isOpen: false, payment: null });
    setConfirmationCode('');
  };

  const handleSaveConfirmationCode = async () => {
    if (!confirmationModal.payment || !confirmationCode.trim()) {
      setError('Please enter a valid confirmation code');
      return;
    }

    setSavingConfirmationCode(true);
    setError(null);

    try {
      // Atualizar o código de confirmação no pagamento Supabase
      const { error } = await supabase
        .from('payments')
        .update({ 
          zelle_confirmation_code: confirmationCode.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmationModal.payment.id);

      if (error) throw error;

      // Inserir no histórico PostgreSQL
      try {
        await PostgreSQLService.insertZellePaymentHistory({
          payment_id: confirmationModal.payment.id,
          user_id: confirmationModal.payment.user_id,
          zelle_confirmation_code: confirmationCode.trim(),
          amount: confirmationModal.payment.amount,
          user_name: confirmationModal.payment.profiles?.name || 'Unknown',
          user_email: confirmationModal.payment.profiles?.email || 'Unknown',
          document_filename: confirmationModal.payment.documents?.filename
        });
        console.log('✅ Zelle confirmation code saved to PostgreSQL history');
      } catch (pgError) {
        console.error('⚠️ Failed to save to PostgreSQL (non-critical):', pgError);
        // Não falha o processo principal se PostgreSQL falhar
      }

      // Fechar modal primeiro
      closeConfirmationModal();
      
      // Processar aprovação diretamente (sem chamar verifyPayment)
      setProcessingPaymentId(confirmationModal.payment.id);
      
      // Usar a função RPC para aprovar o pagamento
      const { error: verifyError } = await supabase.rpc('verify_payment', { 
        payment_id: confirmationModal.payment.id 
      });

      if (verifyError) throw verifyError;

      // Após aprovar o pagamento, enviar documento para processo de tradução
      setSendingToTranslation(confirmationModal.payment.id);
      try {
        await sendDocumentForTranslation(confirmationModal.payment);
        console.log('✅ Document successfully sent for translation');
      } catch (translationError) {
        console.error('❌ Failed to send document for translation:', translationError);
        // Note: We don't fail the payment approval if translation fails
        // The payment is already approved, translation can be retried later
      } finally {
        setSendingToTranslation(null);
      }

      // Enviar notificação para o usuário sobre a aprovação
      await sendApprovalNotification(confirmationModal.payment);

      // Notificar autenticadores sobre documentos pendentes
      const clientName = confirmationModal.payment.profiles?.name || 'Cliente';
      const documentFilename = confirmationModal.payment.documents?.filename || 'Documento';
      const documentId = confirmationModal.payment.id; // Usar o ID do pagamento como referência
      
      await notifyAuthenticatorsPendingDocuments(confirmationModal.payment.user_id, {
        filename: documentFilename,
        document_id: documentId,
        client_name: clientName
      });

      // Recarregar os pagamentos para mostrar as mudanças
      await loadPayments();
      setSelectedReceipt(null);
      
    } catch (err: any) {
      console.error('Error saving confirmation code:', err);
      setError(err.message || 'Failed to save confirmation code');
    } finally {
      setSavingConfirmationCode(false);
      setProcessingPaymentId(null);
    }
  };

  const sendRejectionNotification = async (payment: ZellePayment, reason: string) => {
    try {
      console.log('DEBUG: Enviando notificação de rejeição via payment-notifications function');
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      const notificationPayload = {
        payment_id: payment.id,
        user_id: payment.user_id,
        document_id: payment.document_id,
        payment_method: 'zelle',
        amount: payment.amount,
        filename: payment.documents?.filename || 'Unknown Document',
        notification_type: 'payment_rejected',
        status: `pagamento rejeitado - ${reason}`
      };
      
      console.log('DEBUG: Payload para payment-notifications (rejection):', JSON.stringify(notificationPayload, null, 2));
      
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
        console.log('SUCCESS: Notificação de rejeição enviada:', result.message);
      } else {
        const errorText = await notificationResponse.text();
        console.error('WARNING: Falha ao enviar notificação de rejeição:', notificationResponse.status, errorText);
      }
    } catch (error) {
      console.error('Error sending rejection notification:', error);
      // Non-critical error, so we don't throw
    }
  };

  const sendApprovalNotification = async (payment: ZellePayment) => {
    try {
      console.log('DEBUG: Enviando notificação de aprovação via payment-notifications function');
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      const notificationPayload = {
        payment_id: payment.id,
        user_id: payment.user_id,
        document_id: payment.document_id,
        payment_method: 'zelle',
        amount: payment.amount,
        filename: payment.documents?.filename || 'Unknown Document',
        notification_type: 'payment_approved'
      };
      
      console.log('DEBUG: Payload para payment-notifications (approval):', JSON.stringify(notificationPayload, null, 2));
      
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
        console.log('SUCCESS: Notificação de aprovação enviada:', result.message);
      } else {
        const errorText = await notificationResponse.text();
        console.error('WARNING: Falha ao enviar notificação de aprovação:', notificationResponse.status, errorText);
      }
    } catch (error) {
      console.error('Error sending approval notification:', error);
      // Non-critical error, so we don't throw
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectionModal.payment) return;

    const finalReason = rejectionReason === 'custom' 
      ? customReason.trim() 
      : rejectionReason;

    if (!finalReason) {
      setError('Please select or enter a rejection reason');
      return;
    }

    setSendingRejection(true);
    setError(null);

    try {
      // Atualizar status do pagamento
      await supabase
        .from('payments')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', rejectionModal.payment.id);

      // Enviar notificação de rejeição para o usuário
      await sendRejectionNotification(rejectionModal.payment, finalReason);

      await loadPayments();
      closeRejectionModal();
      setSelectedReceipt(null);
      
    } catch (err: any) {
      console.error('Error rejecting payment:', err);
      setError(err.message || 'Failed to reject payment');
    } finally {
      setSendingRejection(false);
    }
  };

  const verifyPayment = async (paymentId: string, approve: boolean) => {
    if (!approve) {
      // Se for rejeição, abrir modal para selecionar motivo
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        openRejectionModal(payment);
      }
      return;
    }

    // Validar se existe código de confirmação Zelle
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) {
      setError('Payment not found');
      return;
    }

    // Se não há código de confirmação, abrir modal para entrada
    if (!payment.zelle_confirmation_code || payment.zelle_confirmation_code.trim() === '') {
      openConfirmationModal(payment);
      return;
    }

    try {
      setProcessingPaymentId(paymentId);
      
      // Se aprovado, usar a função RPC
      const { error } = await supabase.rpc('verify_payment', { 
        payment_id: paymentId 
      });

      if (error) throw error;

      // Após aprovar o pagamento, enviar documento para processo de tradução
      if (payment) {
        setSendingToTranslation(paymentId);
        try {
          await sendDocumentForTranslation(payment);
          console.log('✅ Document successfully sent for translation');
        } catch (translationError) {
          console.error('❌ Failed to send document for translation:', translationError);
          // Note: We don't fail the payment approval if translation fails
          // The payment is already approved, translation can be retried later
        } finally {
          setSendingToTranslation(null);
        }
      }

      // Enviar notificação para o usuário sobre a aprovação
      if (payment) {
        await sendApprovalNotification(payment);
        
        // Notificar autenticadores sobre documentos pendentes
        const clientName = payment.profiles?.name || 'Cliente';
        const documentFilename = payment.documents?.filename || 'Documento';
        const documentId = payment.id;
        
        await notifyAuthenticatorsPendingDocuments(payment.user_id, {
          filename: documentFilename,
          document_id: documentId,
          client_name: clientName
        });
      }

      await loadPayments();
      setSelectedReceipt(null);
      
    } catch (err: any) {
      console.error('Error verifying payment:', err);
      setError(err.message || 'Failed to verify payment');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const sendDocumentForTranslation = async (payment: ZellePayment) => {
    try {
      console.log('🚀 Enviando documento(s) para processo de tradução');
      console.log('🚀 Payment ID:', payment.id);
      console.log('🚀 Payment document_id:', payment.document_id);
      
      // Buscar dados do usuário (comum para todos os documentos)
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', payment.user_id)
        .single();

      if (userError || !userData) {
        console.error('Erro ao buscar dados do usuário:', userError);
        throw new Error('User not found');
      }

      // Buscar TODOS os documentos relacionados ao pagamento
      // Documentos criados no mesmo período (5 minutos antes/depois) com mesmo user_id e payment_method zelle
      const paymentCreatedAt = new Date(payment.created_at);
      const timeWindowStart = new Date(paymentCreatedAt.getTime() - 5 * 60 * 1000); // 5 minutos antes
      const timeWindowEnd = new Date(paymentCreatedAt.getTime() + 5 * 60 * 1000); // 5 minutos depois

      console.log('🔍 Buscando documentos relacionados ao pagamento...');
      console.log('🔍 Time window:', timeWindowStart.toISOString(), 'to', timeWindowEnd.toISOString());
      
      const { data: relatedDocuments, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', payment.user_id)
        .eq('payment_method', 'zelle')
        .gte('created_at', timeWindowStart.toISOString())
        .lte('created_at', timeWindowEnd.toISOString())
        .in('status', ['pending_manual_review', 'processing', 'zelle_pending']);

      if (docsError) {
        console.error('Erro ao buscar documentos relacionados:', docsError);
        // Fallback: usar apenas o documento do pagamento
        const { data: documentData, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', payment.document_id)
          .single();

        if (docError || !documentData) {
          console.error('Erro ao buscar dados do documento:', docError);
          throw new Error('Document not found');
        }

        await sendSingleDocumentForTranslation(documentData, payment, userData);
        return;
      }

      if (!relatedDocuments || relatedDocuments.length === 0) {
        console.warn('⚠️ Nenhum documento relacionado encontrado, usando documento do pagamento');
        // Fallback: usar apenas o documento do pagamento
        const { data: documentData, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', payment.document_id)
          .single();

        if (docError || !documentData) {
          console.error('Erro ao buscar dados do documento:', docError);
          throw new Error('Document not found');
        }

        await sendSingleDocumentForTranslation(documentData, payment, userData);
        return;
      }

      console.log(`✅ Encontrados ${relatedDocuments.length} documentos relacionados ao pagamento`);
      
      // Enviar cada documento para tradução
      for (const documentData of relatedDocuments) {
        await sendSingleDocumentForTranslation(documentData, payment, userData);
      }

      console.log(`✅ Todos os ${relatedDocuments.length} documentos enviados para tradução`);

    } catch (error) {
      console.error('Error sending document for translation:', error);
      throw error; // Re-throw to be handled by verifyPayment
    }
  };

  const sendSingleDocumentForTranslation = async (documentData: any, payment: ZellePayment, userData: any) => {
    try {
      console.log(`📄 Enviando documento ${documentData.id} para tradução:`, documentData.filename);

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
          .getPublicUrl(`${payment.user_id}/${documentData.filename}`);
        publicUrl = fallbackUrl;
        console.log('📄 URL do documento (fallback):', publicUrl);
      }

      // Calcular preço individual do documento
      const docPrice = (documentData.pages || 1) * (documentData.tipo_trad === 'Notorizado' ? 20 : 15) + 
                       (documentData.is_bank_statement ? 10 : 0);

      // Preparar payload para o webhook de tradução
      const translationPayload = {
        filename: documentData.filename,
        original_filename: documentData.original_filename || documentData.filename,
        original_document_id: documentData.id,
        url: publicUrl,
        mimetype: 'application/pdf',
        size: documentData.file_size || 0,
        user_id: payment.user_id,
        pages: documentData.pages || 1,
        paginas: documentData.pages || 1,
        document_type: documentData.document_type || documentData.tipo_trad || 'Certificado',
        tipo_trad: documentData.tipo_trad === 'Notorizado' ? 'Notarized' : 'Certified',
        total_cost: docPrice.toString(),
        valor: docPrice.toString(),
        source_language: documentData.source_language || documentData.idioma_raiz || 'Portuguese',
        target_language: documentData.target_language || documentData.idioma_destino || 'English',
        idioma_raiz: documentData.idioma_raiz || documentData.source_language || 'Portuguese',
        idioma_destino: documentData.idioma_destino || documentData.target_language || 'English',
        is_bank_statement: documentData.is_bank_statement || false,
        client_name: documentData.client_name || userData.name,
        source_currency: documentData.source_currency || null,
        target_currency: documentData.target_currency || null,
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
        console.log(`✅ Documento ${documentData.id} enviado para tradução com sucesso:`, result);
      } else {
        console.error(`❌ Erro ao enviar documento ${documentData.id} para tradução:`, result);
        throw new Error(result.error || 'Failed to send document for translation');
      }

    } catch (error) {
      console.error(`Error sending document ${documentData.id} for translation:`, error);
      throw error;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_verification: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: Clock,
        text: 'Pending Verification'
      },
      pending_manual_review: { 
        color: 'bg-orange-100 text-orange-800 border-orange-200', 
        icon: AlertCircle,
        text: 'Manual Review Required'
      },
      completed: { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        icon: CheckCircle,
        text: 'Verified'
      },
      failed: { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: XCircle,
        text: 'Rejected'
      },
      pending: { 
        color: 'bg-gray-100 text-gray-800 border-gray-200', 
        icon: Clock,
        text: 'Pending'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        <IconComponent className="w-4 h-4 mr-1" />
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Zelle Payment Verification</h1>
        <p className="text-gray-600">Review and verify Zelle payment receipts</p>
      </div>

      {/* Filter */}
      <div className="mb-6 flex space-x-2">
        {[
          { key: 'pending_verification', label: 'Pending Verification', count: payments.filter(p => p.status === 'pending_verification').length },
          { key: 'pending_manual_review', label: 'Manual Review', count: payments.filter(p => p.status === 'pending_manual_review').length },
          { key: 'completed', label: 'Verified', count: payments.filter(p => p.status === 'completed').length },
          { key: 'failed', label: 'Rejected', count: payments.filter(p => p.status === 'failed').length },
          { key: 'all', label: 'All', count: payments.length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Payments List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p>No Zelle payments found for the selected filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {payments.map((payment) => (
              <div key={payment.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Main Info */}
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-2">
                        <User className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {payment.profiles?.name || 'Unknown User'}
                        </span>
                        <span className="text-gray-500">({payment.profiles?.email})</span>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>

                    {/* Document & Payment Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {payment.documents?.filename || 'Unknown File'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          ${payment.amount.toFixed(2)} USD
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Verification Info */}
                    {payment.zelle_verified_at && (
                      <div className="text-sm text-gray-500 mb-4">
                        Verified by {payment.verifier?.name || 'Unknown'} on{' '}
                        {new Date(payment.zelle_verified_at).toLocaleString()}
                      </div>
                    )}

                    {/* Confirmation Code */}
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        Zelle Confirmation Code:
                      </div>
                      {payment.zelle_confirmation_code ? (
                        <div className="bg-gray-50 rounded-lg px-3 py-2 border">
                          <span className="font-mono text-sm text-gray-900">
                            {payment.zelle_confirmation_code}
                          </span>
                          <span className="ml-2 text-xs text-green-600">✓</span>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 rounded-lg px-3 py-2 border border-yellow-200">
                          <span className="text-sm text-yellow-700">
                            ⚠️ Confirmation code required for approval
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedReceipt(payment)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Receipt
                    </button>
                    
                    {(payment.status === 'pending_verification' || payment.status === 'pending_manual_review') && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => verifyPayment(payment.id, true)}
                          disabled={processingPaymentId === payment.id || sendingToTranslation === payment.id}
                          className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {sendingToTranslation === payment.id ? 'Sending to Translation...' : 
                           processingPaymentId === payment.id ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => openRejectionModal(payment)}
                          disabled={processingPaymentId === payment.id || sendingToTranslation === payment.id}
                          className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Payment Receipt</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedReceipt.profiles?.name} • ${selectedReceipt.amount.toFixed(2)} USD
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={selectedReceipt.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open in New Tab
                </a>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[70vh] overflow-auto">
              <div className="text-center">
                <img
                  src={selectedReceipt.receipt_url}
                  alt="Payment Receipt"
                  className="max-w-full max-h-full mx-auto rounded-lg shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="flex flex-col items-center justify-center p-8 text-gray-500">
                          <FileText class="w-12 h-12 mb-4" />
                          <p>Unable to display receipt image</p>
                          <a href="${selectedReceipt.receipt_url}" target="_blank" class="text-blue-600 hover:underline mt-2">
                            View Original File
                          </a>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
            </div>

            {/* Modal Actions */}
            {selectedReceipt.status === 'pending_verification' && (
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => openRejectionModal(selectedReceipt)}
                  disabled={processingPaymentId === selectedReceipt.id || sendingToTranslation === selectedReceipt.id}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Payment
                </button>
                <button
                  onClick={() => verifyPayment(selectedReceipt.id, true)}
                  disabled={processingPaymentId === selectedReceipt.id || sendingToTranslation === selectedReceipt.id}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {sendingToTranslation === selectedReceipt.id ? 'Sending to Translation...' : 
                   processingPaymentId === selectedReceipt.id ? 'Approving...' : 'Approve Payment'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeRejectionModal}></div>
            <div className="relative bg-white rounded-lg max-w-md w-full">
              <div className="px-6 pt-6">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Reject Payment
                  </h3>
                  <button
                    onClick={closeRejectionModal}
                    className="ml-3 flex h-7 w-7 items-center justify-center rounded-full bg-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-4">
                    Please select a reason for rejecting this payment:
                  </p>
                  
                  <div className="space-y-2">
                    {[
                      'Incorrect amount',
                      'Invalid payment method',
                      'Duplicate payment',
                      'Suspicious activity',
                      'Incomplete information',
                      'Document quality issues'
                    ].map((reason) => (
                      <label key={reason} className="flex items-center">
                        <input
                          type="radio"
                          name="rejectionReason"
                          value={reason}
                          checked={rejectionReason === reason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{reason}</span>
                      </label>
                    ))}
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="rejectionReason"
                        value="custom"
                        checked={rejectionReason === 'custom'}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Other (specify below)</span>
                    </label>
                  </div>

                  {rejectionReason === 'custom' && (
                    <div className="mt-3">
                      <textarea
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="Please specify the reason for rejection..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
                <button
                  onClick={closeRejectionModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectPayment}
                  disabled={sendingRejection || !rejectionReason || (rejectionReason === 'custom' && !customReason.trim())}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingRejection ? 'Rejecting...' : 'Reject Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Code Modal */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeConfirmationModal}></div>
            <div className="relative bg-white rounded-lg max-w-md w-full">
              <div className="px-6 pt-6">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Zelle Confirmation Code
                  </h3>
                  <button
                    onClick={closeConfirmationModal}
                    className="ml-3 flex h-7 w-7 items-center justify-center rounded-full bg-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">
                    This Zelle payment requires a confirmation code before it can be approved. 
                    Please enter the confirmation code provided by the user.
                  </p>
                  
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          <strong>User:</strong> {confirmationModal.payment?.profiles?.name}<br/>
                          <strong>Email:</strong> {confirmationModal.payment?.profiles?.email}<br/>
                          <strong>Amount:</strong> ${confirmationModal.payment?.amount}
                        </p>
                      </div>
                    </div>
                  </div>

                  <label htmlFor="confirmation-code" className="block text-sm font-medium text-gray-700 mb-2">
                    Zelle Confirmation Code
                  </label>
                  <input
                    type="text"
                    id="confirmation-code"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    placeholder="Enter confirmation code..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </div>

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm">
                    {error}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
                <button
                  onClick={closeConfirmationModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfirmationCode}
                  disabled={savingConfirmationCode || !confirmationCode.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingConfirmationCode ? 'Saving...' : 'Save and Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
