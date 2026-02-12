import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { FileText, Check, Clock, ShieldCheck, Download, CheckCircle, XCircle, Eye, Upload as UploadIcon, Phone } from 'lucide-react';
import { getValidFileUrl } from '../../utils/fileUtils';
import { notifyTranslationCompleted } from '../../utils/webhookNotifications';
import { sendTranslationCompletionNotification } from '../../lib/emails';
import { Logger } from '../../lib/loggingHelpers';
import { ActionTypes } from '../../types/actionTypes';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';

interface Document {
  id: string;
  filename: string;
  original_filename?: string | null; // Nome original para exibição
  user_id: string;
  pages?: number | null;
  status?: string;
  translated_file_url?: string | null;
  file_url?: string | null;
  created_at?: string | null;
  translation_status?: string;
  total_cost?: number | null;
  source_language?: string;
  target_language?: string;
  is_bank_statement?: boolean;
  verification_code?: string;
  // ID da tabela documents_to_be_verified se existir
  verification_id?: string | null;
  // Campos de auditoria
  authenticated_by?: string | null;
  authenticated_by_name?: string | null;
  authenticated_by_email?: string | null;
  authentication_date?: string | null;
  // Dados do usuário
  user_name?: string | null;
  user_email?: string | null;
  client_name?: string | null;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

export default function AuthenticatorDashboard() {
  const { user: currentUser } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função helper para obter o nome de exibição do arquivo
  const getDisplayFilename = (doc: Document): string => {
    return doc.original_filename || doc.filename;
  };
  const [uploadStates, setUploadStates] = useState<{ [docId: string]: { file: File | null, uploading: boolean, success: boolean, error: string | null } }>({});
  const [rejectedRows, setRejectedRows] = useState<{ [docId: string]: boolean }>({});
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [showDocViewer, setShowDocViewer] = useState(false);
  const [docToView, setDocToView] = useState<{ url: string; filename: string } | null>(null);
  const [actionDoc, setActionDoc] = useState<Document | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);

  // Estados para modais de confirmação
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [modalDocumentId, setModalDocumentId] = useState('');
  const [modalDocumentName, setModalDocumentName] = useState('');

  // Debug do estado do modal
  /* 
  useEffect(() => {
    console.log('[AuthenticatorDashboard] Estado showApprovalModal:', showApprovalModal);
    console.log('[AuthenticatorDashboard] Estado showCorrectionModal:', showCorrectionModal);
  }, [showApprovalModal, showCorrectionModal]);
  */

  // Estatísticas separadas
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0
  });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const documentsPerPage = 10;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[AuthenticatorDashboard] localStorage:', window.localStorage);
    }
  }, []);

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      setError(null);
      try {
        console.log('[AuthenticatorDashboard] Buscando documentos...');

        // 🔧 LÓGICA INVERSA: Primeiro buscar da tabela documents (fonte principal)
        const { data: allMainDocs, error: mainError } = await supabase
          .from('documents')
          .select(`
            *,
            profiles:user_id (
              name,
              email
            )
          `)
          .order('created_at', { ascending: false });

        if (mainError) {
          console.error('[AuthenticatorDashboard] Error fetching main documents:', mainError);
          if (mainError.code === '42501' || mainError.code === 'PGRST301') {
            setError('You do not have permission to access this area.');
          } else {
            setError(mainError.message);
          }
          return;
        }

        console.log('[AuthenticatorDashboard] Todos os documentos da tabela documents:', allMainDocs?.length || 0);

        // Buscar documentos da tabela documents_to_be_verified para verificar status
        const { data: allVerifiedDocs, error: verifiedError } = await supabase
          .from('documents_to_be_verified')
          .select('*')
          .order('created_at', { ascending: false });

        if (verifiedError) {
          console.error('[AuthenticatorDashboard] Error fetching verified documents:', verifiedError);
          setError(verifiedError.message);
          return;
        }

        console.log('[AuthenticatorDashboard] Todos os documentos da tabela documents_to_be_verified:', allVerifiedDocs?.length || 0);

        // 🔧 NOVA LÓGICA DE MERGE: Usar as tabelas cruzadas de forma robusta
        const processedVerifiedIds = new Set();

        // 1. Começar pelos documentos principais e anexar dados de verificação
        const mainDocumentsWithVerifiedData = (allMainDocs as any[] || []).map(mainDoc => {
          // Tentar encontrar o documento de verificação:
          // 1. Prioridade absoluta: Match por ID exato
          // 2. Fallback: Match por nome APENAS se o registro de verificação não tiver ID original vinculado
          const verifiedDoc = allVerifiedDocs?.filter(v =>
            v.original_document_id === mainDoc.id ||
            (v.original_document_id === null && v.user_id === mainDoc.user_id && v.filename === mainDoc.filename)
          ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

          if (verifiedDoc) {
            processedVerifiedIds.add(verifiedDoc.id);
          }

          const authStatus = verifiedDoc ? verifiedDoc.status : 'processed';

          return {
            ...mainDoc,
            user_name: mainDoc.profiles?.name || null,
            user_email: mainDoc.profiles?.email || null,
            status: authStatus,
            verification_id: verifiedDoc ? verifiedDoc.id : null,
            // PRIORIDADE: translated_file_url da verificação, se não houver, file_url do mainDoc
            translated_file_url: (verifiedDoc?.translated_file_url || mainDoc.translated_file_url),
            file_url: mainDoc.file_url,
            authenticated_by: verifiedDoc?.authenticated_by,
            authenticated_by_name: verifiedDoc?.authenticated_by_name,
            authenticated_by_email: verifiedDoc?.authenticated_by_email,
            authentication_date: verifiedDoc?.authentication_date,
            source_language: verifiedDoc?.source_language || mainDoc.idioma_raiz,
            target_language: verifiedDoc?.target_language || mainDoc.idioma_destino,
            client_name: mainDoc.client_name || verifiedDoc?.client_name
          } as Document;
        });

        // 2. Buscar perfis dos usuários para documentos que só existem na verificação
        const verifiedOnlyDocs = (allVerifiedDocs as any[] || []).filter(v => !processedVerifiedIds.has(v.id));
        const userIds = [...new Set(verifiedOnlyDocs.map(doc => doc.user_id))];
        let userProfiles: Record<string, { name: string, email: string }> = {};

        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', userIds);

          if (profilesError) {
            console.error('[AuthenticatorDashboard] Error fetching user profiles:', profilesError);
          } else {
            userProfiles = profiles?.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {}) || {};
          }
        }

        const verifiedOnlyDocsMapped = verifiedOnlyDocs.map(verifiedDoc => {
          const userProfile = userProfiles[verifiedDoc.user_id];
          return {
            id: verifiedDoc.id,
            filename: verifiedDoc.filename,
            original_filename: verifiedDoc.original_filename,
            user_id: verifiedDoc.user_id,
            pages: verifiedDoc.pages,
            status: verifiedDoc.status,
            translated_file_url: verifiedDoc.translated_file_url,
            file_url: null, // Se não está na main table, não temos file_url original separado
            created_at: verifiedDoc.created_at,
            translation_status: verifiedDoc.translation_status,
            total_cost: verifiedDoc.total_cost,
            source_language: verifiedDoc.source_language,
            target_language: verifiedDoc.target_language,
            is_bank_statement: verifiedDoc.is_bank_statement,
            verification_code: verifiedDoc.verification_code,
            verification_id: verifiedDoc.id,
            authenticated_by: verifiedDoc.authenticated_by,
            authenticated_by_name: verifiedDoc.authenticated_by_name,
            authenticated_by_email: verifiedDoc.authenticated_by_email,
            authentication_date: verifiedDoc.authentication_date,
            user_name: userProfile?.name || null,
            user_email: userProfile?.email || null,
            client_name: verifiedDoc.client_name
          } as Document;
        });

        const allDocuments = [...mainDocumentsWithVerifiedData, ...verifiedOnlyDocsMapped];

        // Calcular estatísticas usando apenas documentos relevantes (excluir processados)
        const relevantDocs = allDocuments.filter(doc => doc.status !== 'processed');

        // Filtrar documentos pendentes e em processamento para a lista (excluir documentos já processados)
        // MOSTRAR TODOS OS DOCUMENTOS (Pendentes primeiro)
        const displayDocs = relevantDocs.sort((a, b) => {
          // Define a ordem dos status
          const statusOrder: Record<string, number> = {
            'pending': 1,
            'processing': 2, 
            'completed': 3,
            'rejected': 4
          };

          const orderA = statusOrder[a.status] || 99;
          const orderB = statusOrder[b.status] || 99;

          if (orderA !== orderB) {
            return orderA - orderB;
          }
           // Desempate por data (mais recente primeiro)
           return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        // Calcular estatísticas usando apenas documentos relevantes (excluir processados)
        const pendingCount = relevantDocs.filter(doc => doc.status === 'pending' || doc.status === 'processing').length;
        const approvedCount = relevantDocs.filter(doc => doc.status === 'completed').length;

        console.log('[AuthenticatorDashboard] Estatísticas calculadas:', { pendingCount, approvedCount });
        console.log('[AuthenticatorDashboard] Documentos carregados para exibição:', displayDocs.length);

        setStats({
          pending: pendingCount,
          approved: approvedCount
        });

        setDocuments(displayDocs);
        console.log('[AuthenticatorDashboard] Documentos carregados para exibição:', displayDocs.length);

      } catch (err) {
        console.error('[AuthenticatorDashboard] Unexpected error:', err);
        setError('Unexpected error while fetching documents.');
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, []);

  // Função para abrir modal de confirmação de aprovação
  function showApprovalConfirmation(id: string) {
    const document = documents.find(doc => doc.id === id);
    if (!document) {
      console.log('[AuthenticatorDashboard] Documento não encontrado:', id);
      return;
    }

    setModalDocumentId(id);
    setModalDocumentName(document.filename);
    setShowApprovalModal(true);
  }

  // Função para abrir modal de confirmação de envio de correção
  function showSendCorrectionConfirmation(doc: Document) {
    console.log('[AuthenticatorDashboard] Abrindo modal de correção para:', doc.filename);

    setModalDocumentId(doc.id);
    setModalDocumentName(getDisplayFilename(doc));
    setShowCorrectionModal(true);
  }

  async function handleApprove(id: string) {
    if (!currentUser) return;

    console.log('[AuthenticatorDashboard] Aprovando documento:', id);

    // Encontrar o documento na lista atual
    const document = documents.find(doc => doc.id === id);
    if (!document) {
      console.error('[AuthenticatorDashboard] Documento não encontrado na lista');
      return;
    }

    // Se tem verification_id, usar ele; senão, primeiro inserir na tabela de verificação
    let verificationId = document.verification_id;

    if (!verificationId) {
      // Documento ainda não está na tabela de verificação, vamos inserir
      const { data: newVerificationDoc, error: insertError } = await supabase
        .from('documents_to_be_verified')
        .insert({
          user_id: document.user_id,
          filename: document.filename,
          file_url: document.file_url,
          translated_file_url: document.translated_file_url || document.file_url, // Usar arquivo original se não há tradução
          source_language: document.source_language || (document as any).idioma_raiz || 'Portuguese',
          target_language: document.target_language || (document as any).idioma_destino || 'English',
          pages: document.pages,
          total_cost: document.total_cost || (document as any).valor || 0,
          status: 'pending',
          is_bank_statement: document.is_bank_statement,
          verification_code: document.verification_code,
          translation_status: document.translation_status || 'completed'
        })
        .select()
        .single();

      if (insertError) {
        console.error('[AuthenticatorDashboard] Erro ao inserir documento na tabela de verificação:', insertError);
        alert('Erro ao processar documento. Tente novamente.');
        return;
      }

      verificationId = newVerificationDoc.id;
      console.log('[AuthenticatorDashboard] Documento inserido na tabela de verificação:', verificationId);
    }

    // Buscar o documento de verificação
    const { data: doc, error: fetchError } = await supabase
      .from('documents_to_be_verified')
      .select('*')
      .eq('id', verificationId)
      .single();

    if (fetchError || !doc) {
      console.error('[AuthenticatorDashboard] Erro ao buscar documento:', fetchError);
      return;
    }

    // Dados do autenticador
    const authData = {
      authenticated_by: currentUser.id,
      authenticated_by_name: currentUser.user_metadata?.name || currentUser.email,
      authenticated_by_email: currentUser.email,
      authentication_date: new Date().toISOString()
    };

    // Atualizar status para 'completed' com dados do autenticador
    const { error: updateError } = await supabase
      .from('documents_to_be_verified')
      .update({
        status: 'completed',
        ...authData
      })
      .eq('id', verificationId);

    if (updateError) {
      console.error('[AuthenticatorDashboard] Erro ao atualizar documento:', updateError);
      alert('Erro ao aprovar documento. Tente novamente.');
      return;
    }

    // Inserir em translated_documents com dados do autenticador
    const { error: insertError } = await supabase.from('translated_documents').insert({
      original_document_id: doc.id,
      user_id: doc.user_id,
      filename: doc.filename,
      translated_file_url: doc.translated_file_url || doc.file_url || '', // ✅ Fix: usar arquivo original se não há tradução
      source_language: doc.source_language || 'portuguese', // ✅ Fix: garantir valor não-nulo
      target_language: doc.target_language || 'english', // ✅ Fix: garantir valor não-nulo
      pages: doc.pages,
      status: 'completed',
      total_cost: doc.total_cost,
      is_authenticated: true,
      verification_code: doc.verification_code,
      ...authData
    } as any);

    if (insertError) {
      console.error('[AuthenticatorDashboard] Erro ao inserir em translated_documents:', insertError);
    }

    // Notificar que a tradução foi completada via SMTP Direto
    try {
      if (document.user_email) {
        await sendTranslationCompletionNotification(document.user_email, {
          userName: document.user_name || 'Cliente',
          filename: document.filename
        });
        console.log('[AuthenticatorDashboard] Notificação de tradução enviada via SMTP');
      } else {
        console.warn('[AuthenticatorDashboard] Email do usuário não encontrado, tentando webhook fallback');
        await notifyTranslationCompleted(doc.user_id, doc.filename, doc.id);
      }
    } catch (error) {
      console.error('[AuthenticatorDashboard] Erro ao enviar notificação de tradução completada:', error);
    }

    // Atualizar estatísticas
    setStats(prev => ({
      ...prev,
      pending: prev.pending - 1,
      approved: prev.approved + 1
    }));

    // Remover documento da lista
    setDocuments(docs => docs.filter(d => d.id !== id));

    console.log('[AuthenticatorDashboard] Documento aprovado com sucesso');

    // Log document approval
    try {
      await Logger.log(
        ActionTypes.DOCUMENT.APPROVED,
        `Document approved by authenticator: ${doc.filename}`,
        {
          entityType: 'document',
          entityId: verificationId,
          metadata: {
            document_id: verificationId,
            original_document_id: document.id,
            filename: doc.filename,
            verification_code: doc.verification_code,
            user_id: doc.user_id,
            pages: doc.pages,
            total_cost: doc.total_cost,
            authenticated_by: authData.authenticated_by,
            authenticated_by_name: authData.authenticated_by_name,
            authentication_date: authData.authentication_date,
            timestamp: new Date().toISOString()
          },
          affectedUserId: doc.user_id,
          performerType: 'authenticator'
        }
      );
    } catch (logError) {
      // Non-blocking
    }
  }


  async function handleCorrectionUpload(doc: Document) {
    const state = uploadStates[doc.id];
    if (!state || !state.file) return;

    setUploadStates(prev => ({ ...prev, [doc.id]: { ...state, uploading: true, error: null, success: false } }));
    try {
      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`corrections/${doc.id}_${Date.now()}_${state.file.name}`, state.file, { upsert: true });
      if (uploadError) throw uploadError;
      const filePath = uploadData?.path;
      const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      // Se tem verification_id, usar ele; senão, usar o id principal do documento
      const verificationId = doc.verification_id || doc.id;

      // Buscar verification_code do documento original
      let originalDoc;
      let fetchError;
      let finalVerificationId = verificationId;

      if (doc.verification_id) {
        // Documento já está na tabela documents_to_be_verified
        const { data, error } = await supabase
          .from('documents_to_be_verified')
          .select('verification_code')
          .eq('id', verificationId)
          .single();
        originalDoc = data;
        fetchError = error;
      } else {
        // Documento existe apenas na tabela documents - precisa criar entrada em documents_to_be_verified
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', doc.id)
          .single();

        if (docError || !docData) {
          console.error('[AuthenticatorDashboard] Erro ao buscar documento original:', docError);
          throw new Error('Não foi possível obter dados do documento original.');
        }

        // Validar campos obrigatórios
        if (!docData.user_id) {
          throw new Error('user_id é obrigatório para criar entrada na tabela de verificação.');
        }
        if (!docData.filename) {
          throw new Error('filename é obrigatório para criar entrada na tabela de verificação.');
        }
        if (!docData.verification_code) {
          throw new Error('verification_code é obrigatório para criar entrada na tabela de verificação.');
        }

        // Criar entrada na tabela documents_to_be_verified
        const insertData = {
          user_id: docData.user_id,
          filename: docData.filename,
          pages: parseInt(docData.pages) || 1,
          total_cost: parseFloat(docData.total_cost || docData.valor || 0),
          status: 'pending',
          verification_code: docData.verification_code,
          source_language: docData.idioma_raiz || 'Portuguese',
          target_language: docData.idioma_destino || 'English',
          is_bank_statement: Boolean(docData.is_bank_statement),
          client_name: docData.client_name || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('[AuthenticatorDashboard] Dados para inserção na tabela documents_to_be_verified:', insertData);
        console.log('[AuthenticatorDashboard] docData completo:', docData);

        const { data: newVerifiedDoc, error: createError } = await supabase
          .from('documents_to_be_verified')
          .insert(insertData)
          .select('id, verification_code')
          .single();

        if (createError) {
          console.error('[AuthenticatorDashboard] Erro detalhado ao inserir na tabela documents_to_be_verified:', createError);
          throw new Error(`Não foi possível criar entrada na tabela de verificação: ${createError.message}`);
        }

        if (!newVerifiedDoc) {
          throw new Error('Não foi possível criar entrada na tabela de verificação: resposta vazia do servidor.');
        }

        finalVerificationId = newVerifiedDoc.id;
        originalDoc = newVerifiedDoc;
        fetchError = null;
      }

      if (fetchError || !originalDoc) {
        throw new Error('Não foi possível obter o verification_code do documento original.');
      }

      // Dados do autenticador
      const authData = {
        authenticated_by: currentUser?.id,
        authenticated_by_name: currentUser?.user_metadata?.name || currentUser?.email,
        authenticated_by_email: currentUser?.email,
        authentication_date: new Date().toISOString()
      };

      // Debug: verificar os valores dos idiomas antes da inserção
      console.log('DEBUG: Idiomas antes da inserção em translated_documents:');
      console.log('doc.source_language:', doc.source_language);
      console.log('doc.target_language:', doc.target_language);
      console.log('Valores finais que serão inseridos:');
      console.log('source_language:', doc.source_language || 'Portuguese');
      console.log('target_language:', doc.target_language || 'English');

      // Inserir na tabela translated_documents com dados do autenticador
      const { error: insertError } = await supabase.from('translated_documents').insert({
        original_document_id: finalVerificationId, // Usar o ID da tabela documents_to_be_verified
        user_id: doc.user_id,
        filename: state.file.name,
        translated_file_url: publicUrl,
        source_language: doc.source_language || 'Portuguese',
        target_language: doc.target_language || 'English',
        pages: doc.pages,
        status: 'completed',
        total_cost: doc.total_cost,
        is_authenticated: true,
        verification_code: originalDoc.verification_code,
        ...authData
      } as any);
      if (insertError) throw insertError;

      // Atualizar status do documento original para 'completed' com dados do autenticador
      if (doc.verification_id) {
        // Documento estava na tabela documents_to_be_verified
        await supabase
          .from('documents_to_be_verified')
          .update({
            status: 'completed',
            ...authData
          })
          .eq('id', doc.verification_id);
      } else {
        // Documento foi criado em documents_to_be_verified, atualizar ambas as tabelas
        await supabase
          .from('documents_to_be_verified')
          .update({
            status: 'completed',
            ...authData
          })
          .eq('id', finalVerificationId);

        await supabase
          .from('documents')
          .update({
            status: 'completed',
            ...authData
          })
          .eq('id', doc.id);
      }

      // Remover o documento da lista após sucesso
      setDocuments(docs => docs.filter(d => d.id !== doc.id));
      setUploadStates(prev => ({ ...prev, [doc.id]: { file: null, uploading: false, success: false, error: null } }));
      setRejectedRows(prev => ({ ...prev, [doc.id]: false }));
    } catch (err: any) {
      setUploadStates(prev => ({ ...prev, [doc.id]: { ...state, uploading: false, success: false, error: err.message || 'Upload failed' } }));
    }
  }

  async function handleViewUser(userId: string) {
    setUserLoading(true);
    setUserError(null);
    setSelectedUser(null);
    setUserModalOpen(true);
    try {
      const { data: user, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone, role')
        .eq('id', userId)
        .single();
      if (error || !user) {
        setUserError('Erro ao buscar informações do usuário.');
      } else {
        setSelectedUser(user);
      }
    } catch (err) {
      setUserError('Erro inesperado ao buscar usuário.');
    } finally {
      setUserLoading(false);
    }
  }

  // Paginação
  const totalPages = Math.ceil(documents.length / documentsPerPage);
  const startIndex = (currentPage - 1) * documentsPerPage;
  const endIndex = startIndex + documentsPerPage;
  const currentDocuments = documents.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return {
        pages: Array.from({ length: totalPages }, (_, i) => i + 1),
        showLeftEllipsis: false,
        showRightEllipsis: false
      };
    }

    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      start = 2;
      end = 4;
    } else if (currentPage >= totalPages - 2) {
      start = totalPages - 3;
      end = totalPages - 1;
    }

    const pages = [] as number[];
    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    return {
      pages,
      showLeftEllipsis: start > 2,
      showRightEllipsis: end < totalPages - 1
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C71B2D]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#163353]/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-2 tracking-tight uppercase">Authenticator Dashboard</h1>
          <p className="text-gray-600 font-medium opacity-80 uppercase tracking-[0.2em] text-xs">Approve or reject translated documents submitted for verification</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
          <div className="relative group bg-white/80 backdrop-blur-xl rounded-[24px] p-6 border border-gray-200 hover:border-yellow-500/40 transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Pending</p>
                <p className="text-3xl sm:text-4xl font-black text-yellow-900">{stats.pending}</p>
              </div>
              <div className="w-14 h-14 bg-yellow-100 backdrop-blur-sm rounded-[20px] flex items-center justify-center border border-yellow-200 group-hover:bg-yellow-200 transition-colors">
                <Clock className="w-7 h-7 text-yellow-900" />
              </div>
            </div>
          </div>
          <div className="relative group bg-white/80 backdrop-blur-xl rounded-[24px] p-6 border border-gray-200 hover:border-green-500/40 transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Approved</p>
                <p className="text-3xl sm:text-4xl font-black text-green-900">{stats.approved}</p>
              </div>
              <div className="w-14 h-14 bg-green-100 backdrop-blur-sm rounded-[20px] flex items-center justify-center border border-green-200 group-hover:bg-green-200 transition-colors">
                <Check className="w-7 h-7 text-green-900" />
              </div>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="relative bg-white/80 backdrop-blur-xl rounded-[30px] shadow-lg border border-gray-200 p-6 sm:p-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#163353]/5 rounded-full blur-[100px] pointer-events-none" />

          <h2 className="relative text-2xl sm:text-3xl font-black text-gray-900 mb-6 flex items-center gap-3 uppercase tracking-tight">
            <FileText className="w-7 h-7 text-[#163353]" /> Documents to Authenticate
          </h2>

          
          {loading && (
            <div className="relative flex flex-col items-center justify-center py-12">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-[#163353]/20 blur-2xl rounded-full animate-pulse" />
                <div className="relative w-12 h-12 border-4 border-[#163353] border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-[#163353] font-black uppercase tracking-[0.3em] text-xs">Loading Documents...</p>
            </div>
          )}
          {error && (
            <div className="relative text-center py-12 bg-[#C71B2D]/5 rounded-[24px] border border-[#C71B2D]/20">
              <p className="text-[#C71B2D] font-bold text-lg">Error: {error}</p>
            </div>
          )}

          {/* Mobile Cards View */}
          <div className="relative block sm:hidden space-y-4">
            {currentDocuments.map(doc => (
              <div key={doc.id} className="relative group bg-white/60 backdrop-blur-sm rounded-[24px] p-5 border border-gray-200 hover:border-[#163353]/40 hover:shadow-lg transition-all">
                <div className="space-y-3">
                  {/* Document Name */}
                  <div>
                    <button
                      onClick={async () => {
                        try {
                          const urlToView = doc.translated_file_url || doc.file_url;
                          if (!urlToView) {
                            alert('No document available to view.');
                            return;
                          }
                          const validUrl = await getValidFileUrl(urlToView);
                          setDocToView({ url: validUrl, filename: getDisplayFilename(doc) });
                          setShowDocViewer(true);
                        } catch (error) {
                          console.error('Error opening document:', error);
                          alert((error as Error).message || 'Failed to open document.');
                        }
                      }}
                      className="text-[#163353] underline font-black hover:text-[#C71B2D] transition-colors text-sm text-left"
                    >
                      {getDisplayFilename(doc)}
                    </button>

                    {/* View and Download Buttons */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={async () => {
                          try {
                            const urlToView = doc.translated_file_url || doc.file_url;
                            if (!urlToView) {
                              alert('No document available to view.');
                              return;
                            }
                            const validUrl = await getValidFileUrl(urlToView);
                            setDocToView({ url: validUrl, filename: getDisplayFilename(doc) });
                            setShowDocViewer(true);
                          } catch (error) {
                            console.error('Error opening document:', error);
                            alert((error as Error).message || 'Failed to open document.');
                          }
                        }}
                        className="flex items-center gap-1.5 bg-[#163353] text-white px-3 py-2 rounded-[12px] text-xs hover:bg-[#0F2438] transition-all font-black uppercase tracking-wider hover:scale-105"
                        title={doc.translated_file_url ? "View Translated PDF" : "View Original Document"}
                      >
                        <FileText className="w-3.5 h-3.5" /> View {doc.translated_file_url ? "PDF" : "Original"}
                      </button>

                      <button
                        className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-[12px] text-xs hover:bg-green-700 transition-all font-black uppercase tracking-wider hover:scale-105"
                        onClick={async e => {
                          e.preventDefault();
                          try {
                            // Preferir documento traduzido se existir, senão baixar o original
                            const urlToDownload = doc.translated_file_url || doc.file_url;
                            if (!urlToDownload) {
                              alert('No document available to download.');
                              return;
                            }

                            const validUrl = await getValidFileUrl(urlToDownload);
                            const response = await fetch(validUrl);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = (getDisplayFilename(doc) ? String(getDisplayFilename(doc)) : 'document.pdf');
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                          } catch (err) {
                            console.error('Error downloading file:', err);
                            alert((err as Error).message || 'Failed to download file.');
                          }
                        }}
                        title={doc.translated_file_url ? "Download Translated PDF" : "Download Original Document"}
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                  </div>



                  {/* Document Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50/50 rounded-[16px] p-4 border border-gray-100">
                    <div>
                      <span className="font-black text-gray-400 uppercase tracking-widest block mb-1">Value</span>
                      <span className="font-bold text-[#C71B2D]">{typeof doc.total_cost === 'number' ? `$${doc.total_cost.toFixed(2)}` : '-'}</span>
                    </div>
                    <div>
                      <span className="font-black text-gray-400 uppercase tracking-widest block mb-1">Pages</span>
                      <span className="font-bold text-gray-900">{doc.pages}</span>
                    </div>
                    <div>
                      <span className="font-black text-gray-400 uppercase tracking-widest block mb-1">Language</span>
                      <span className="font-bold text-gray-900">{doc.source_language && doc.target_language ? `${doc.source_language} → ${doc.target_language}` : (doc.source_language || '-')}</span>
                    </div>
                    <div>
                      <span className="font-black text-gray-400 uppercase tracking-widest block mb-1">Bank</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-black uppercase ${doc.is_bank_statement ? 'bg-[#C71B2D]/10 text-[#C71B2D]' : 'bg-green-100 text-green-800'}`}>
                        {doc.is_bank_statement ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>

                  {/* Client Name */}
                  {doc.client_name && (
                    <div className="mt-2 pt-3 border-t border-gray-200 bg-gray-50/30 rounded-[12px] p-3">
                      <div className="text-xs">
                        <span className="font-black text-gray-400 uppercase tracking-widest">Client:</span>
                        <span className="ml-2 text-gray-900 font-bold">{doc.client_name}</span>
                      </div>
                    </div>
                  )}

                  {/* User Info */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 truncate max-w-32" title={doc.user_name || doc.user_id}>
                        {doc.user_name || `${doc.user_id.slice(0, 8)}...`}
                      </span>
                      <button
                        className="text-[#163353] hover:text-[#C71B2D] p-1.5 rounded-[8px] hover:bg-[#163353]/5 transition-all"
                        title="View user information"
                        onClick={() => handleViewUser(doc.user_id)}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-gray-200">
                    {rejectedRows[doc.id] ? (
                      <div className="space-y-3">
                        {/* File Upload Area */}
                        <div className="relative">
                          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-[#163353]/30 rounded-[16px] cursor-pointer bg-[#163353]/5 hover:bg-[#163353]/10 transition-all group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <UploadIcon className="w-6 h-6 mb-2 text-[#163353]/60 group-hover:text-[#163353] transition-colors" />
                              <p className="mb-1 text-sm text-gray-700">
                                <span className="font-black text-[#163353] hover:text-[#C71B2D]">Click to select</span> or drag file
                              </p>
                              <p className="text-xs text-gray-500 font-medium">PDF only</p>
                            </div>
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0] || null;
                                setUploadStates(prev => ({ ...prev, [doc.id]: { file, uploading: false, success: false, error: null } }));
                              }}
                            />
                          </label>

                          {/* Selected File Display */}
                          {uploadStates[doc.id]?.file && (
                            <div className="mt-2 p-3 bg-[#163353]/10 border border-[#163353]/20 rounded-[12px]">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#163353]" />
                                <span className="text-xs text-[#163353] font-bold truncate">
                                  {uploadStates[doc.id]?.file?.name}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Send Button */}
                        <button
                          className="relative w-full bg-gradient-to-r from-[#163353] to-[#0F2438] text-white rounded-[16px] px-4 py-3 font-black hover:from-[#0F2438] hover:to-[#163353] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] overflow-hidden group uppercase tracking-wider"
                          disabled={!uploadStates[doc.id]?.file || uploadStates[doc.id]?.uploading}
                          onClick={() => showSendCorrectionConfirmation(doc)}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                          {uploadStates[doc.id]?.uploading ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="relative w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin z-10"></div>
                              <span className="relative z-10">Sending correction...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <UploadIcon className="relative w-4 h-4 z-10" />
                              <span className="relative z-10">Send Correction</span>
                            </div>
                          )}
                        </button>

                        {/* Status Messages */}
                        {uploadStates[doc.id]?.success && (
                          <div className="flex items-center gap-2 p-3 bg-green-50/80 backdrop-blur-sm border border-green-200 rounded-[12px]">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-700 text-xs font-bold">Correction sent successfully!</span>
                          </div>
                        )}
                        {uploadStates[doc.id]?.error && (
                          <div className="flex items-center gap-2 p-3 bg-[#C71B2D]/5 border border-[#C71B2D]/20 rounded-[12px]">
                            <XCircle className="w-4 h-4 text-[#C71B2D]" />
                            <span className="text-[#C71B2D] text-xs font-bold">{uploadStates[doc.id]?.error}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => {
                          console.log('Botão Approve clicado para documento:', doc.id);
                          showApprovalConfirmation(doc.id);
                        }} className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white px-4 py-3 rounded-[16px] text-xs hover:bg-green-700 transition-all font-black uppercase tracking-wider hover:scale-105">
                          <CheckCircle className="w-3.5 h-3.5" />Approve
                        </button>
                        <button onClick={() => setRejectedRows(prev => ({ ...prev, [doc.id]: true }))} className="flex-1 flex items-center justify-center gap-1.5 bg-[#C71B2D] text-white px-4 py-3 rounded-[16px] text-xs hover:bg-[#A01624] transition-all font-black uppercase tracking-wider hover:scale-105">
                          <XCircle className="w-3.5 h-3.5" />Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>


          {/* Desktop Table View */}
          <div className="relative hidden sm:block overflow-x-auto scrollbar-standard">
            <table className="w-full bg-white/50 backdrop-blur-sm border border-gray-200 rounded-[20px] shadow-sm overflow-hidden">
              <thead className="bg-[#163353]/10 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Document</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Client</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">User</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Value</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Language</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Date</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentDocuments.map(doc => {
                  return (
                    <tr key={doc.id} className="border-t border-gray-200 hover:bg-[#163353]/5 transition-all group">
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <div>
                            <span className="text-[#163353] font-black text-sm">
                              {getDisplayFilename(doc)}
                            </span>
                          </div>
                        </div>
                      </td>
                      {/* Client Name */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-gray-900">
                          {doc.client_name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 truncate max-w-32" title={doc.user_name || doc.user_id}>
                            {doc.user_name || `${doc.user_id.slice(0, 8)}...`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-black text-sm text-[#C71B2D]">
                        {typeof doc.total_cost === 'number' ? `$${doc.total_cost.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        {doc.source_language && doc.target_language ? `${doc.source_language} → ${doc.target_language}` : (doc.source_language || '-')}
                      </td>
                      <td className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setActionDoc(doc);
                            setActionModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-[12px] text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-all hover:scale-105"
                          title="Open details"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {documents.length === 0 && !loading && (
            <div className="relative text-center py-16">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full" />
                <CheckCircle className="relative w-16 h-16 text-green-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">All Clear!</h3>
              <p className="text-gray-500 font-medium">No pending documents for authentication.</p>
            </div>
          )}

          {/* Controles de Paginação */}
          {documents.length > 0 && (
            <div className="relative px-6 py-4 border-t border-gray-200 bg-gray-50/50 rounded-b-[30px] mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-sm font-bold text-gray-700 text-center sm:text-left">
                  Showing {startIndex + 1} to {Math.min(endIndex, documents.length)} of {documents.length} documents
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-black uppercase tracking-wider text-gray-700 bg-white border border-gray-300 rounded-[12px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 disabled:hover:scale-100"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1 flex-wrap">
                    {(() => {
                      const { pages, showLeftEllipsis, showRightEllipsis } = getPageNumbers();

                      return (
                        <>
                          <button
                            onClick={() => handlePageChange(1)}
                            className={`px-3 py-2 text-sm font-black rounded-[12px] transition-all hover:scale-105 ${currentPage === 1
                              ? 'bg-[#163353] text-white shadow-md'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                          >
                            1
                          </button>

                          {showLeftEllipsis && (
                            <span className="px-2 text-gray-400 text-sm font-black">...</span>
                          )}

                          {pages.map(page => (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-2 text-sm font-black rounded-[12px] transition-all hover:scale-105 ${currentPage === page
                                ? 'bg-[#163353] text-white shadow-md'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                              {page}
                            </button>
                          ))}

                          {showRightEllipsis && (
                            <span className="px-2 text-gray-400 text-sm font-black">...</span>
                          )}

                          <button
                            onClick={() => handlePageChange(totalPages)}
                            className={`px-3 py-2 text-sm font-black rounded-[12px] transition-all hover:scale-105 ${currentPage === totalPages
                              ? 'bg-[#163353] text-white shadow-md'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                          >
                            {totalPages}
                          </button>
                        </>
                      );
                    })()}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-black uppercase tracking-wider text-gray-700 bg-white border border-gray-300 rounded-[12px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 disabled:hover:scale-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação de aprovação */}
      {actionModalOpen && actionDoc && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-md z-50 p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative bg-white/95 backdrop-blur-xl rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] p-8 w-full max-w-lg border border-white/20">
            <button
              className="absolute top-4 right-4 p-3 bg-[#C71B2D] hover:bg-[#A01624] text-white rounded-[16px] transition-all hover:scale-105 active:scale-95 shadow-lg"
              onClick={() => {
                setActionModalOpen(false);
                setActionDoc(null);
              }}
              aria-label="Close modal"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-[#163353]/10 backdrop-blur-sm rounded-[20px] flex items-center justify-center border border-[#163353]/20">
                <FileText className="w-7 h-7 text-[#163353]" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Document Details</h3>
                <p
                  className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em] truncate max-w-[360px]"
                  title={getDisplayFilename(actionDoc)}
                >
                  {getDisplayFilename(actionDoc)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Client</div>
                <div className="font-bold text-gray-900">{actionDoc.client_name || '-'}</div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">User</div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 truncate max-w-[150px]" title={actionDoc.user_name || actionDoc.user_id}>
                    {actionDoc.user_name || `${actionDoc.user_id.slice(0, 8)}...`}
                  </span>
                  <button
                    className="text-[#163353] hover:text-[#C71B2D] p-1 rounded hover:bg-[#163353]/5 transition-colors"
                    title="View user information"
                    onClick={() => handleViewUser(actionDoc.user_id)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Value</div>
                <div className="font-black text-[#C71B2D]">{typeof actionDoc.total_cost === 'number' ? `$${actionDoc.total_cost.toFixed(2)}` : '-'}</div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Language</div>
                <div className="font-bold text-gray-900">
                  {actionDoc.source_language && actionDoc.target_language ? `${actionDoc.source_language} → ${actionDoc.target_language}` : (actionDoc.source_language || '-')}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Pages</div>
                <div className="font-bold text-gray-900">{actionDoc.pages}</div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Type</div>
                <div className="font-bold text-gray-900 uppercase">{actionDoc.translation_status || '-'}</div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Bank Statement</div>
                <div className={`inline-flex px-2 py-0.5 rounded-full text-xs font-black uppercase ${actionDoc.is_bank_statement ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {actionDoc.is_bank_statement ? 'Yes' : 'No'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Created At</div>
                <div className="font-bold text-gray-900">
                  {actionDoc.created_at ? new Date(actionDoc.created_at).toLocaleDateString() : '-'}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      const urlToView = actionDoc.translated_file_url || actionDoc.file_url;
                      if (!urlToView) {
                        alert('No document available to view.');
                        return;
                      }

                      const validUrl = await getValidFileUrl(urlToView);
                      setDocToView({ url: validUrl, filename: getDisplayFilename(actionDoc) });
                      setShowDocViewer(true);
                    } catch (error) {
                      console.error('Error opening document:', error);
                      alert((error as Error).message || 'Failed to open document.');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#163353] text-white rounded-[14px] text-xs font-black uppercase tracking-wider hover:bg-[#0F2438] transition-all"
                  title="View PDF"
                >
                  <FileText className="w-4 h-4" /> View
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-[14px] text-xs font-black uppercase tracking-wider hover:bg-green-700 transition-all"
                  onClick={async e => {
                    e.preventDefault();
                    try {
                      const urlToDownload = actionDoc.translated_file_url || actionDoc.file_url;
                      if (!urlToDownload) {
                        alert('No document available to download.');
                        return;
                      }

                      const validUrl = await getValidFileUrl(urlToDownload);
                      const response = await fetch(validUrl);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = (getDisplayFilename(actionDoc) ? String(getDisplayFilename(actionDoc)) : 'document.pdf');
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error('Error downloading file:', err);
                      alert((err as Error).message || 'Failed to download file.');
                    }
                  }}
                  title="Download"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>

              {!rejectedRows[actionDoc.id] ? (
                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button 
                    onClick={() => {
                      setActionModalOpen(false);
                      showApprovalConfirmation(actionDoc.id);
                    }} 
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-600/10 text-green-700 border border-green-600/20 px-4 py-3 rounded-[14px] text-xs hover:bg-green-600 hover:text-white transition-all font-black uppercase tracking-wider"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />Approve
                  </button>
                  <button 
                    onClick={() => setRejectedRows(prev => ({ ...prev, [actionDoc.id]: true }))} 
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#C71B2D]/10 text-[#C71B2D] border border-[#C71B2D]/20 px-4 py-3 rounded-[14px] text-xs hover:bg-[#C71B2D] hover:text-white transition-all font-black uppercase tracking-wider"
                  >
                    <XCircle className="w-3.5 h-3.5" />Reject
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-gray-100 animate-in slide-in-from-top-2">
                   <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Upload Correction</span>
                        <button 
                          onClick={() => setRejectedRows(prev => ({ ...prev, [actionDoc.id]: false }))}
                          className="text-xs text-gray-400 hover:text-gray-600 font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                      
                      {/* File Upload Area */}
                      <div className="relative">
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[#163353]/30 rounded-[16px] cursor-pointer bg-[#163353]/5 hover:bg-[#163353]/10 transition-all group">
                          <div className="flex flex-col items-center justify-center">
                            <UploadIcon className="w-5 h-5 mb-2 text-[#163353]/60 group-hover:text-[#163353] transition-colors" />
                            <span className="text-xs text-gray-700 font-medium group-hover:font-bold group-hover:text-[#163353]">
                              Click to select PDF
                            </span>
                          </div>
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0] || null;
                              setUploadStates(prev => ({ ...prev, [actionDoc.id]: { file, uploading: false, success: false, error: null } }));
                            }}
                          />
                        </label>

                        {/* Selected File Display */}
                        {uploadStates[actionDoc.id]?.file && (
                          <div className="mt-2 p-3 bg-[#163353]/10 border border-[#163353]/20 rounded-[12px]">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-[#163353]" />
                              <span className="text-xs text-[#163353] font-bold truncate">
                                {uploadStates[actionDoc.id]?.file?.name}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Send Button */}
                      <button
                        className="relative w-full bg-gradient-to-r from-[#163353] to-[#0F2438] text-white rounded-[16px] px-3 py-3 font-black hover:from-[#0F2438] hover:to-[#163353] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs shadow-lg hover:shadow-xl overflow-hidden group uppercase tracking-wider"
                        disabled={!uploadStates[actionDoc.id]?.file || uploadStates[actionDoc.id]?.uploading}
                        onClick={() => {
                          console.log('Botão Send Correction clicado para documento:', actionDoc.id);
                          // Fechar modal de detalhes ao enviar confirmacao? 
                          // Melhor esperar confirmacao
                          setActionModalOpen(false); 
                          showSendCorrectionConfirmation(actionDoc);
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                        {uploadStates[actionDoc.id]?.uploading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="relative w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin z-10"></div>
                            <span className="relative z-10">Sending...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <UploadIcon className="relative w-3.5 h-3.5 z-10" />
                            <span className="relative z-10">Send Correction</span>
                          </div>
                        )}
                      </button>

                      {/* Status Messages */}
                      {uploadStates[actionDoc.id]?.error && (
                        <div className="flex items-center gap-2 p-2 bg-[#C71B2D]/5 border border-[#C71B2D]/20 rounded-[12px]">
                          <XCircle className="w-3.5 h-3.5 text-[#C71B2D]" />
                          <span className="text-[#C71B2D] text-xs font-bold">{uploadStates[actionDoc.id]?.error}</span>
                        </div>
                      )}
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de aprovação */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-[#0A1A2F]/95 backdrop-blur-2xl flex items-center justify-center z-[9999] p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative bg-white/95 backdrop-blur-xl rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] p-8 max-w-md w-full text-center border border-white/20">
            <div className="mx-auto mb-6 w-16 h-16 bg-green-100/80 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-green-200">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            <h3 className="text-2xl font-black text-gray-900 mb-3 uppercase tracking-tight">
              Confirm Approval
            </h3>

            <p className="text-sm text-gray-600 font-medium mb-8">
              Are you sure you want to approve the document "<span className="font-black text-gray-900">{modalDocumentName}</span>"? This action cannot be undone.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                }}
                className="px-6 py-3 text-sm font-black text-gray-700 bg-white border border-gray-300 rounded-[16px] hover:bg-gray-50 transition-all uppercase tracking-wider hover:scale-105 active:scale-95"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  handleApprove(modalDocumentId);
                }}
                className="relative px-6 py-3 text-sm font-black text-white bg-green-600 rounded-[16px] hover:bg-green-700 transition-all uppercase tracking-wider hover:scale-105 active:scale-95 overflow-hidden group shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                <span className="relative z-10">Approve</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de envio de correção */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-[#0A1A2F]/95 backdrop-blur-2xl flex items-center justify-center z-[9999] p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative bg-white/95 backdrop-blur-xl rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] p-8 max-w-md w-full text-center border border-white/20">
            <div className="mx-auto mb-6 w-16 h-16 bg-[#163353]/10 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-[#163353]/20">
              <UploadIcon className="w-8 h-8 text-[#163353]" />
            </div>

            <h3 className="text-2xl font-black text-gray-900 mb-3 uppercase tracking-tight">
              Confirm Send Correction
            </h3>

            <p className="text-sm text-gray-600 font-medium mb-8">
              Are you sure you want to send the correction for the document "<span className="font-black text-gray-900">{modalDocumentName}</span>"? This action cannot be undone.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  console.log('[AuthenticatorDashboard] Cancelando envio de correção');
                  setShowCorrectionModal(false);
                }}
                className="px-6 py-3 text-sm font-black text-gray-700 bg-white border border-gray-300 rounded-[16px] hover:bg-gray-50 transition-all uppercase tracking-wider hover:scale-105 active:scale-95"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  console.log('[AuthenticatorDashboard] Confirmando envio de correção');
                  setShowCorrectionModal(false);
                  const doc = documents.find(d => d.id === modalDocumentId);
                  if (doc) {
                    handleCorrectionUpload(doc);
                  }
                }}
                className="relative px-6 py-3 text-sm font-black text-white bg-[#163353] rounded-[16px] hover:bg-[#0F2438] transition-all uppercase tracking-wider hover:scale-105 active:scale-95 overflow-hidden group shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                <span className="relative z-10">Send Correction</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de informações do usuário */}
      {userModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#0A1A2F]/95 backdrop-blur-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative bg-white/95 backdrop-blur-xl rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] p-8 w-full max-w-md border border-white/20">
            <button
              className="absolute top-4 right-4 p-3 bg-[#C71B2D] hover:bg-[#A01624] text-white rounded-[16px] transition-all hover:scale-105 active:scale-95 shadow-lg"
              onClick={() => setUserModalOpen(false)}
              aria-label="Close modal"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-[#163353]/10 backdrop-blur-sm rounded-[20px] flex items-center justify-center border border-[#163353]/20">
                <User className="w-7 h-7 text-[#163353]" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">User Information</h3>
            </div>

            {userLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-[#163353] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            {userError && (
              <div className="bg-[#C71B2D]/5 border border-[#C71B2D]/20 rounded-[16px] p-4">
                <p className="text-[#C71B2D] font-bold text-lg">{userError}</p>
              </div>
            )}
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Name</span>
                  <span className="font-bold text-gray-900">{selectedUser.name}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Email</span>
                  <span className="font-bold text-gray-900 break-all">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-black text-gray-400 uppercase tracking-widest text-xs flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Phone
                  </span>
                  <span className="font-bold text-gray-900">{selectedUser.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Role</span>
                  <span className="font-bold text-gray-900 uppercase">{selectedUser.role}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="font-black text-gray-400 uppercase tracking-widest text-xs">ID</span>
                  <span className="text-gray-900 font-mono text-xs font-bold break-all">{selectedUser.id}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Document Viewer Modal */}
      {showDocViewer && docToView && (
        <DocumentViewerModal
          url={docToView.url}
          filename={docToView.filename}
          onClose={() => {
            setShowDocViewer(false);
            setDocToView(null);
          }}
        />
      )}
    </div>
  );
} 