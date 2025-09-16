import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { FileText, Check, Clock, ShieldCheck, Download, CheckCircle, XCircle, Eye, Upload as UploadIcon, Phone } from 'lucide-react';
import { getValidFileUrl } from '../../utils/fileUtils';
import { notifyTranslationCompleted } from '../../utils/webhookNotifications';

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
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  
  // Estados para modais de confirmação
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [modalDocumentId, setModalDocumentId] = useState('');
  const [modalDocumentName, setModalDocumentName] = useState('');
  
  // Debug do estado do modal
  useEffect(() => {
    console.log('[AuthenticatorDashboard] Estado showApprovalModal:', showApprovalModal);
    console.log('[AuthenticatorDashboard] Estado showCorrectionModal:', showCorrectionModal);
  }, [showApprovalModal, showCorrectionModal]);
  
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

        // Mapear documentos principais e verificar se existem na tabela de verificação
        const mainDocuments = (allMainDocs as any[] || []).map(doc => {
          // Buscar documento correspondente na tabela de verificação usando user_id + filename + client_name
          const matchingVerifiedDocs = allVerifiedDocs?.filter(v => 
            v.user_id === doc.user_id && 
            v.filename === doc.filename &&
            (v.client_name === doc.client_name || (v.client_name === null && doc.client_name === null))
          );
          
          // Se há duplicatas, pegar o mais recente
          const verifiedDoc = matchingVerifiedDocs?.length > 0 
            ? matchingVerifiedDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
            : null;
          
          console.log(`[AuthenticatorDashboard] Processando documento: ${doc.filename} - Client: ${doc.client_name}`);
          console.log(`[AuthenticatorDashboard] - Documentos verificados encontrados:`, matchingVerifiedDocs?.length || 0);
          
          if (matchingVerifiedDocs && matchingVerifiedDocs.length > 1) {
            console.warn(`🚨 DUPLICATAS DETECTADAS para ${doc.filename}: ${matchingVerifiedDocs.length} documentos`);
          }
          
          // Determinar status: se existe na verificação, usar o status de lá; senão, não incluir (já foi processado)
          let authStatus;
          if (verifiedDoc) {
            authStatus = verifiedDoc.status;
            console.log(`[AuthenticatorDashboard] - Usando status da tabela verificada: ${authStatus}`);
          } else {
            // Se não existe na verificação, significa que já foi processado e não deve aparecer no dashboard
            authStatus = 'processed';
            console.log(`[AuthenticatorDashboard] - Documento já processado, não incluindo no dashboard`);
          }
          
          const finalDoc = {
            ...doc,
            user_name: doc.profiles?.name || null,
            user_email: doc.profiles?.email || null,
            // Status para autenticação
            status: authStatus,
            // Manter ID da tabela de verificação se existir para operações
            verification_id: verifiedDoc ? verifiedDoc.id : null,
            // Dados da verificação se existir (priorizar tradução da tabela de verificação)
            // Se status for 'processing', não mostrar tradução ainda (forçar View Original)
            translated_file_url: (authStatus === 'processing') ? null : (verifiedDoc?.translated_file_url || doc.translated_file_url),
            authenticated_by: verifiedDoc?.authenticated_by,
            authenticated_by_name: verifiedDoc?.authenticated_by_name,
            authenticated_by_email: verifiedDoc?.authenticated_by_email,
            authentication_date: verifiedDoc?.authentication_date,
            // Usar idiomas da tabela de verificação se existir, senão usar da tabela principal
            source_language: verifiedDoc?.source_language || doc.idioma_raiz,
            target_language: verifiedDoc?.target_language || doc.idioma_destino,
            // Client name sempre da tabela principal (fonte de verdade)
            client_name: doc.client_name
          } as Document;
          
          console.log(`[AuthenticatorDashboard] - Documento final: ${doc.filename} - Status: ${authStatus} - Client: ${doc.client_name}`);
          return finalDoc;
        });

        // Buscar documentos que existem APENAS na tabela documents_to_be_verified
        const verifiedOnlyDocs = (allVerifiedDocs as any[] || []).filter(verifiedDoc => {
          // Verificar se este documento NÃO existe na tabela documents
          const existsInMain = allMainDocs?.some(mainDoc => 
            mainDoc.user_id === verifiedDoc.user_id && 
            mainDoc.filename === verifiedDoc.filename &&
            (mainDoc.client_name === verifiedDoc.client_name || (mainDoc.client_name === null && verifiedDoc.client_name === null))
          );
          
          return !existsInMain;
        });

        // Buscar perfis dos usuários para documentos que só existem na verificação
        const userIds = [...new Set(verifiedOnlyDocs.map(doc => doc.user_id))];
        let userProfiles = {};
        
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
          // Buscar dados do usuário para documentos que só existem na verificação
          const userProfile = userProfiles[verifiedDoc.user_id];
          
          const finalDoc = {
            id: verifiedDoc.id, // Usar ID da tabela de verificação
            filename: verifiedDoc.filename,
            original_filename: verifiedDoc.original_filename, // Nome original para exibição
            user_id: verifiedDoc.user_id,
            pages: verifiedDoc.pages,
            status: verifiedDoc.status,
            // Se status for 'processing', não mostrar tradução ainda (forçar View Original)
            translated_file_url: (verifiedDoc.status === 'processing') ? null : verifiedDoc.translated_file_url,
            file_url: verifiedDoc.file_url,
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
          
          console.log(`[AuthenticatorDashboard] - Documento apenas na verificação: ${verifiedDoc.filename} - Status: ${verifiedDoc.status} - Client: ${verifiedDoc.client_name}`);
          return finalDoc;
        });

        // Combinar todos os documentos (da tabela principal + apenas da verificação)
        const allDocuments = [...mainDocuments, ...verifiedOnlyDocsMapped];
        
        // Filtrar documentos pendentes e em processamento para a lista (excluir documentos já processados)
        const pendingDocs = allDocuments.filter(doc => doc.status === 'pending' || doc.status === 'processing');
        
        // Calcular estatísticas usando apenas documentos relevantes (excluir processados)
        const relevantDocs = allDocuments.filter(doc => doc.status !== 'processed');
        const pendingCount = relevantDocs.filter(doc => doc.status === 'pending' || doc.status === 'processing').length;
        const approvedCount = relevantDocs.filter(doc => doc.status === 'completed').length;
        
        console.log('[AuthenticatorDashboard] Estatísticas calculadas:', { pendingCount, approvedCount });
        console.log('[AuthenticatorDashboard] Documentos pendentes e em processamento para exibir:', pendingDocs.length);
        
        setStats({
          pending: pendingCount,
          approved: approvedCount
        });
        
        setDocuments(pendingDocs);
        console.log('[AuthenticatorDashboard] Documentos carregados para exibição:', pendingDocs.length);
        
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
    
    console.log('[AuthenticatorDashboard] Abrindo modal de confirmação para:', document.filename);
    console.log('[AuthenticatorDashboard] Estado atual showApprovalModal ANTES:', showApprovalModal);
    
    setModalDocumentId(id);
    setModalDocumentName(document.filename);
    
    console.log('[AuthenticatorDashboard] Definindo showApprovalModal como true');
    setShowApprovalModal(true);
    
    // Verificar estado depois de um pequeno delay
    setTimeout(() => {
      console.log('[AuthenticatorDashboard] Estado showApprovalModal APÓS timeout:', showApprovalModal);
    }, 100);
    
    // Forçar re-render (teste)
    console.log('[AuthenticatorDashboard] Forçando re-render...');
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

    // Notificar que a tradução foi completada
    try {
      await notifyTranslationCompleted(doc.user_id, doc.filename, doc.id);
    } catch (error) {
      console.error('[AuthenticatorDashboard] Erro ao enviar notificação de tradução completada:', error);
      // Não interrompemos o processo mesmo se a notificação falhar
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 sm:gap-6">
            <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Authenticator Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">Approve or reject translated documents submitted for verification. Only authenticators have access to this panel.</p>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-10">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-900" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.pending}</div>
              <div className="text-sm sm:text-base text-gray-600 font-medium">Pending</div>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Check className="w-6 h-6 sm:w-7 sm:h-7 text-green-900" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.approved}</div>
              <div className="text-sm sm:text-base text-gray-600 font-medium">Approved</div>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-tfe-blue-700" /> Documents to Authenticate
          </h2>
          
          {/* Instructions for Authenticators */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Authentication Instructions
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-fit">• View Original:</span>
                <span>Document is being translated. Wait 1-2 minutes and refresh the page to view the translated document.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-fit">• View Original (persistent):</span>
                <span>If the "View Original" button persists for a long time, the automatic AI translation failed and only the original document will be shown.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-fit">• View PDF:</span>
                <span>Translation was successful. Please verify the document for any errors before approval.</span>
              </div>
            </div>
          </div>
          
          {loading && <p className="text-tfe-blue-700 text-base sm:text-lg">Loading documents...</p>}
          {error && <p className="text-tfe-red-500 text-base sm:text-lg">Error: {error}</p>}
          
          {/* Mobile Cards View */}
          <div className="block sm:hidden space-y-4">
            {currentDocuments.map(doc => (
              <div key={doc.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="space-y-3">
                  {/* Document Name */}
                  <div>
                    <a href={doc.file_url || ''} target="_blank" rel="noopener noreferrer" className="text-tfe-blue-700 underline font-medium hover:text-tfe-blue-950 transition-colors text-sm">
                      {getDisplayFilename(doc)}
                    </a>
                    
                    {/* View and Download Buttons */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={async () => {
                          try {
                            // Preferir documento traduzido se existir, senão mostrar o original
                            const urlToView = doc.translated_file_url || doc.file_url;
                            if (!urlToView) {
                              alert('No document available to view.');
                              return;
                            }
                            
                            // Tentar obter uma URL válida
                            const validUrl = await getValidFileUrl(urlToView);
                            window.open(validUrl, '_blank', 'noopener,noreferrer');
                          } catch (error) {
                            console.error('Error opening document:', error);
                            alert((error as Error).message || 'Failed to open document. The file may be corrupted or inaccessible.');
                          }
                        }}
                        className="flex items-center gap-1 bg-tfe-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-tfe-blue-700 transition-colors font-medium"
                        title={doc.translated_file_url ? "View Translated PDF" : "View Original Document"}
                      >
                        <FileText className="w-3 h-3" /> View {doc.translated_file_url ? "PDF" : "Original"}
                      </button>
                      
                      <button
                        className="flex items-center gap-1 bg-emerald-600 text-white px-2 py-1 rounded text-xs hover:bg-emerald-700 transition-colors font-medium"
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
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-600">Value:</span>
                      <span className="ml-1">{typeof doc.total_cost === 'number' ? `$${doc.total_cost.toFixed(2)}` : '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Pages:</span>
                      <span className="ml-1">{doc.pages}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Language:</span>
                      <span className="ml-1">{doc.source_language && doc.target_language ? `${doc.source_language} → ${doc.target_language}` : (doc.source_language || '-')}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Bank:</span>
                      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${doc.is_bank_statement ? 'bg-tfe-red-100 text-tfe-red-800' : 'bg-green-100 text-green-800'}`}>
                        {doc.is_bank_statement ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>

                  {/* Client Name */}
                  {doc.client_name && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs">
                        <span className="font-medium text-gray-600">Client:</span>
                        <span className="ml-1 text-gray-800 font-medium">{doc.client_name}</span>
                      </div>
                    </div>
                  )}

                  {/* User Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 truncate max-w-32" title={doc.user_name || doc.user_id}>
                        {doc.user_name || `${doc.user_id.slice(0, 8)}...`}
                      </span>
                      <button
                        className="text-tfe-blue-600 hover:text-tfe-blue-950 p-1 rounded hover:bg-tfe-blue-50 transition-colors"
                        title="View user information"
                        onClick={() => handleViewUser(doc.user_id)}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-xs text-gray-500">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-gray-200">
                    {rejectedRows[doc.id] ? (
                      <div className="space-y-3">
                        {/* File Upload Area */}
                        <div className="relative">
                          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <UploadIcon className="w-6 h-6 mb-2 text-gray-400 group-hover:text-tfe-blue-500 transition-colors" />
                              <p className="mb-1 text-sm text-gray-600">
                                <span className="font-medium text-tfe-blue-600 hover:text-tfe-blue-500">Click to select</span> or drag file
                              </p>
                              <p className="text-xs text-gray-500">PDF only</p>
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
                            <div className="mt-2 p-2 bg-tfe-blue-50 border border-tfe-blue-200 rounded-md">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-tfe-blue-600" />
                                <span className="text-xs text-tfe-blue-800 font-medium truncate">
                                  {uploadStates[doc.id]?.file?.name}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Send Button */}
                        <button
                          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg px-4 py-3 font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                          disabled={!uploadStates[doc.id]?.file || uploadStates[doc.id]?.uploading}
                          onClick={() => showSendCorrectionConfirmation(doc)}
                        >
                          {uploadStates[doc.id]?.uploading ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Sending correction...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <UploadIcon className="w-4 h-4" />
                              Send Correction
                            </div>
                          )}
                        </button>

                        {/* Status Messages */}
                        {uploadStates[doc.id]?.success && (
                          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-700 text-xs font-medium">Correction sent successfully!</span>
                          </div>
                        )}
                        {uploadStates[doc.id]?.error && (
                          <div className="flex items-center gap-2 p-2 bg-tfe-red-50 border border-tfe-red-200 rounded-md">
                            <XCircle className="w-4 h-4 text-tfe-red-600" />
                            <span className="text-tfe-red-700 text-xs">{uploadStates[doc.id]?.error}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => {
                          console.log('Botão Approve clicado para documento:', doc.id);
                          showApprovalConfirmation(doc.id);
                        }} className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 transition-colors font-medium">
                          <CheckCircle className="w-3 h-3" />Approve
                        </button>
                        <button onClick={() => setRejectedRows(prev => ({ ...prev, [doc.id]: true }))} className="flex-1 flex items-center justify-center gap-1 bg-tfe-red-600 text-white px-3 py-2 rounded text-xs hover:bg-tfe-red-700 transition-colors font-medium">
                          <XCircle className="w-3 h-3" />Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full bg-white border rounded-lg shadow">
            <thead className="bg-tfe-blue-50">
              <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Document</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Client</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">User</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Value</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Language</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Details</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody>
                {currentDocuments.map(doc => {
                return (
                  <tr key={doc.id} className="border-t hover:bg-tfe-blue-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <div>
                            <a href={doc.file_url || ''} target="_blank" rel="noopener noreferrer" className="text-tfe-blue-700 underline font-medium hover:text-tfe-blue-950 transition-colors text-sm">
                              {getDisplayFilename(doc)}
                            </a>
                          </div>
                          <div className="flex gap-2">
                            {/* Botão View - sempre disponível */}
                            <button
                              onClick={async () => {
                                try {
                                  // Preferir documento traduzido se existir, senão mostrar o original
                                  const urlToView = doc.translated_file_url || doc.file_url;
                                  if (!urlToView) {
                                    alert('No document available to view.');
                                    return;
                                  }
                                  
                                  // Tentar obter uma URL válida
                                  const validUrl = await getValidFileUrl(urlToView);
                                  window.open(validUrl, '_blank', 'noopener,noreferrer');
                                } catch (error) {
                                  console.error('Error opening document:', error);
                                  alert((error as Error).message || 'Failed to open document. The file may be corrupted or inaccessible.');
                                }
                              }}
                              className="flex items-center gap-1 bg-tfe-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-tfe-blue-700 transition-colors font-medium"
                              title={doc.translated_file_url ? "View Translated PDF" : "View Original Document"}
                            >
                              <FileText className="w-3 h-3" /> View {doc.translated_file_url ? "PDF" : "Original"}
                            </button>
                            
                            {/* Botão Download - sempre disponível */}
                            <button
                              className="flex items-center gap-1 bg-emerald-600 text-white px-2 py-1 rounded text-xs hover:bg-emerald-700 transition-colors font-medium"
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
                    </td>
                      <td className="px-4 py-3">
                      {rejectedRows[doc.id] ? (
                          <div className="flex flex-col gap-3 w-64">
                            {/* File Upload Area */}
                            <div className="relative">
                              <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                                <div className="flex items-center justify-center">
                                  <UploadIcon className="w-4 h-4 mr-2 text-gray-400 group-hover:text-tfe-blue-500 transition-colors" />
                                  <span className="text-sm text-gray-600 group-hover:text-tfe-blue-600">
                                    Select PDF
                                  </span>
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
                                <div className="mt-2 p-2 bg-tfe-blue-50 border border-tfe-blue-200 rounded-md">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-3 h-3 text-tfe-blue-600" />
                                    <span className="text-xs text-tfe-blue-800 font-medium truncate">
                                      {uploadStates[doc.id]?.file?.name}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Send Button */}
                            <button
                              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg px-3 py-2 font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md"
                              disabled={!uploadStates[doc.id]?.file || uploadStates[doc.id]?.uploading}
                              onClick={() => {
                                console.log('Botão Send Correction (versão 2) clicado para documento:', doc.id);
                                showSendCorrectionConfirmation(doc);
                              }}
                            >
                              {uploadStates[doc.id]?.uploading ? (
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Sending...
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  <UploadIcon className="w-3 h-3" />
                                  Send Correction
                                </div>
                              )}
                            </button>

                            {/* Status Messages */}
                            {uploadStates[doc.id]?.success && (
                              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                <span className="text-green-700 text-xs font-medium">Sent!</span>
                              </div>
                            )}
                            {uploadStates[doc.id]?.error && (
                              <div className="flex items-center gap-2 p-2 bg-tfe-red-50 border border-tfe-red-200 rounded-md">
                                <XCircle className="w-3 h-3 text-tfe-red-600" />
                                <span className="text-tfe-red-700 text-xs">{uploadStates[doc.id]?.error}</span>
                              </div>
                            )}
                          </div>
                      ) : (
                          <div className="flex gap-2">
                            <button onClick={() => {
                              console.log('Botão Approve (versão 1) clicado para documento:', doc.id);
                              showApprovalConfirmation(doc.id);
                            }} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors font-medium">
                              <CheckCircle className="w-3 h-3" />Approve
                            </button>
                            <button onClick={() => setRejectedRows(prev => ({ ...prev, [doc.id]: true }))} className="flex items-center gap-1 bg-tfe-red-600 text-white px-3 py-1 rounded text-xs hover:bg-tfe-red-700 transition-colors font-medium">
                              <XCircle className="w-3 h-3" />Reject
                            </button>
                          </div>
                      )}
                    </td>
                      {/* Client Name */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-800 font-medium">
                          {doc.client_name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 truncate max-w-32" title={doc.user_name || doc.user_id}>
                            {doc.user_name || `${doc.user_id.slice(0, 8)}...`}
                          </span>
                          <button
                            className="text-tfe-blue-600 hover:text-tfe-blue-950 p-1 rounded hover:bg-tfe-blue-50 transition-colors"
                            title="View user information"
                            onClick={() => handleViewUser(doc.user_id)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-sm">
                        {typeof doc.total_cost === 'number' ? `$${doc.total_cost.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {doc.source_language && doc.target_language ? `${doc.source_language} → ${doc.target_language}` : (doc.source_language || '-')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Pages:</span>
                            <span>{doc.pages}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Type:</span>
                            <span>{doc.translation_status || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Bank:</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${doc.is_bank_statement ? 'bg-tfe-red-100 text-tfe-red-800' : 'bg-green-100 text-green-800'}`}>
                              {doc.is_bank_statement ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                      </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {documents.length === 0 && !loading && <p className="mt-8 text-gray-500 text-center text-base sm:text-lg">No pending documents for authentication.</p>}
          
          {/* Controles de Paginação */}
          {documents.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-gray-700 text-center sm:text-left">
                Showing {startIndex + 1} to {Math.min(endIndex, documents.length)} of {documents.length} documents
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        currentPage === page
                          ? 'bg-tfe-blue-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação de aprovação */}
      {showApprovalModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              margin: '0 auto 1rem',
              width: '48px',
              height: '48px',
              backgroundColor: '#dcfce7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle style={{ width: '24px', height: '24px', color: '#16a34a' }} />
            </div>
            
            <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#111827', marginBottom: '8px' }}>
              Confirm Approval
            </h3>
            
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              Are you sure you want to approve the document "{modalDocumentName}"? This action cannot be undone.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  console.log('[AuthenticatorDashboard] Cancelando aprovação');
                  setShowApprovalModal(false);
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={() => {
                  console.log('[AuthenticatorDashboard] Confirmando aprovação');
                  setShowApprovalModal(false);
                  handleApprove(modalDocumentId);
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: '#16a34a',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de envio de correção */}
      {showCorrectionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              margin: '0 auto 1rem',
              width: '48px',
              height: '48px',
              backgroundColor: '#dbeafe',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UploadIcon style={{ width: '24px', height: '24px', color: '#2563eb' }} />
            </div>
            
            <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#111827', marginBottom: '8px' }}>
              Confirm Send Correction
            </h3>
            
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              Are you sure you want to send the correction for the document "{modalDocumentName}"? This action cannot be undone.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  console.log('[AuthenticatorDashboard] Cancelando envio de correção');
                  setShowCorrectionModal(false);
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
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
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Send Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de informações do usuário */}
      {userModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 w-full max-w-md sm:min-w-[400px] relative animate-fade-in">
            <button
              className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setUserModalOpen(false)}
              aria-label="Close modal"
            >
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <h3 className="text-xl font-bold mb-6 text-gray-900">User Information</h3>
            {userLoading && <p className="text-tfe-blue-700 text-lg">Loading...</p>}
            {userError && <p className="text-tfe-red-500 text-lg">{userError}</p>}
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="text-gray-900">{selectedUser.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="text-gray-900">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone:
                  </span>
                  <span className="text-gray-900">{selectedUser.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Role:</span>
                  <span className="text-gray-900">{selectedUser.role}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-gray-700">ID:</span>
                  <span className="text-gray-900 font-mono text-sm">{selectedUser.id}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 