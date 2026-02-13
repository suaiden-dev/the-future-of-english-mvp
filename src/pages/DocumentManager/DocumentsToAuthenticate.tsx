import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Clock, FileText, User, Calendar, FileImage, Phone, Eye, Upload } from 'lucide-react';
import { sendTranslationCompletionNotification } from '../../lib/emails';
import { notifyTranslationCompleted } from '../../utils/webhookNotifications';
import { Logger } from '../../lib/loggingHelpers';
import { ActionTypes } from '../../types/actionTypes';
import { generateUniqueFileName } from '../../utils/fileUtils';

interface Document {
  id: string;
  filename: string;
  user_id: string;
  client_name?: string | null;
  tipo_trad?: string;
  valor?: number;
  idioma_raiz?: string;
  pages?: number | null;
  status?: string;
  translated_file_url?: string | null;
  file_url?: string | null;
  created_at?: string | null;
  rejection_reason?: string | null;
  rejection_comment?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  source_language?: string;
  target_language?: string;
  verification_code?: string;
}

interface Props {
  user: { id: string; role: string; user_metadata?: { name?: string }; email?: string };
}



export default function DocumentsToAuthenticate({ user }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingDoc, setProcessingDoc] = useState<string | null>(null);
  
  // Estados do modal de correção manual
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedDocForRejection, setSelectedDocForRejection] = useState<Document | null>(null);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [rejectionLoading, setRejectionLoading] = useState(false);
  
  // Estados para informações do usuário
  const [userProfile, setUserProfile] = useState<{ name: string; email: string; phone: string | null } | null>(null);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);

  useEffect(() => {
    async function fetchPendingDocuments() {
      try {
        setLoading(true);
        console.log('[DocumentsToAuthenticate] Buscando documentos pendentes...');
        
        const { data, error } = await supabase
          .from('documents_to_be_verified')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('[DocumentsToAuthenticate] Erro ao buscar documentos:', error);
          setError('Erro ao carregar documentos');
          return;
        }
        
        console.log('[DocumentsToAuthenticate] Documentos encontrados:', data?.length || 0);
        setDocuments(data || []);
        setError(null);
      } catch (err) {
        console.error('[DocumentsToAuthenticate] Erro inesperado:', err);
        setError('Erro inesperado ao carregar documentos');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPendingDocuments();
  }, []);

  const handleApprove = async (docId: string) => {
    setProcessingDoc(docId);
    try {
      console.log('[DocumentsToAuthenticate] Aprovando documento:', docId);
      
      // Primeiro, buscar o documento para obter todos os dados necessários
      const { data: doc, error: fetchError } = await supabase
        .from('documents_to_be_verified')
        .select('*')
        .eq('id', docId)
        .single();
      
      if (fetchError || !doc) {
        console.error('[DocumentsToAuthenticate] Erro ao buscar documento:', fetchError);
        alert('Erro ao buscar documento. Tente novamente.');
        return;
      }

      // Atualizar status para 'completed' (seguindo o padrão do AuthenticatorDashboard)
      const { error: updateError } = await supabase
        .from('documents_to_be_verified')
        .update({ 
          status: 'completed',
          authenticated_by: user?.id,
          authenticated_by_name: user?.user_metadata?.name || user?.email,
          authenticated_by_email: user?.email,
          authentication_date: new Date().toISOString()
        })
        .eq('id', docId);
      
      if (updateError) {
        console.error('[DocumentsToAuthenticate] Erro ao aprovar:', updateError);
        alert('Erro ao aprovar documento. Tente novamente.');
        return;
      }

      // Inserir em translated_documents com dados do autenticador
      const authData = {
        authenticated_by: user?.id,
        authenticated_by_name: user?.user_metadata?.name || user?.email,
        authenticated_by_email: user?.email,
        authentication_date: new Date().toISOString()
      };

      const { error: insertError } = await supabase.from('translated_documents').insert({
        original_document_id: doc.id,
        user_id: doc.user_id,
        filename: doc.filename,
        translated_file_url: doc.translated_file_url || doc.file_url || '',
        source_language: doc.source_language || 'portuguese',
        target_language: doc.target_language || 'english',
        pages: doc.pages,
        status: 'completed',
        total_cost: doc.total_cost,
        is_authenticated: true,
        verification_code: doc.verification_code,
        ...authData
      } as any);
      
      if (insertError) {
        console.error('[DocumentsToAuthenticate] Erro ao inserir em translated_documents:', insertError);
        // Não interrompemos o processo, mas logamos o erro
      }

      // Notificar o usuário (SMTP Direto)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', doc.user_id)
          .single();
        
        if (profile?.email) {
          await sendTranslationCompletionNotification(profile.email, {
            userName: profile.name || 'Cliente',
            filename: doc.filename
          });
          console.log('[DocumentsToAuthenticate] Notificação enviada via SMTP');
        }
      } catch (notifyError) {
        console.error('[DocumentsToAuthenticate] Erro ao enviar notificação:', notifyError);
      }

      // Atualizar o documento original na tabela documents para completed
      // Isso garante que ele não apareça mais no dashboard do usuário como processing
      // Primeiro, vamos buscar o documento original na tabela documents usando o verification_code
      const { data: originalDoc, error: findOriginalError } = await supabase
        .from('documents')
        .select('id')
        .eq('verification_code', doc.verification_code)
        .single();
      
      if (findOriginalError) {
        console.error('[DocumentsToAuthenticate] Erro ao buscar documento original:', findOriginalError);
      } else if (originalDoc) {
        const { error: updateOriginalError } = await supabase
          .from('documents')
          .update({ status: 'completed' })
          .eq('id', originalDoc.id);
        
        if (updateOriginalError) {
          console.error('[DocumentsToAuthenticate] Erro ao atualizar documento original:', updateOriginalError);
        } else {
          console.log('[DocumentsToAuthenticate] Documento original atualizado para completed');
        }
      }

      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      console.log('[DocumentsToAuthenticate] Documento aprovado com sucesso');
      
      // Log document approval
      try {
        const { Logger } = await import('../../lib/loggingHelpers');
        const { ActionTypes } = await import('../../types/actionTypes');
        await Logger.log(
          ActionTypes.DOCUMENT.APPROVED,
          `Document approved by authenticator: ${doc.filename}`,
          {
            entityType: 'document',
            entityId: docId,
            metadata: {
              document_id: docId,
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
      
    } catch (err) {
      console.error('[DocumentsToAuthenticate] Erro inesperado ao aprovar:', err);
      alert('Erro inesperado ao aprovar documento.');
    } finally {
      setProcessingDoc(null);
    }
  };

  const handleRejectClick = (doc: Document) => {
    setSelectedDocForRejection(doc);
    setShowRejectModal(true);
    setManualFile(null);
  };

  const handleRejectConfirm = async () => {
    if (!selectedDocForRejection || !manualFile || !user) return;
    
    setRejectionLoading(true);
    try {
      console.log('[DocumentsToAuthenticate] Enviando correção manual:', selectedDocForRejection.id);
      
      const fileName = generateUniqueFileName(manualFile.name);
      const filePath = `corrections/${selectedDocForRejection.id}/${fileName}`;
      
      // 1. Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, manualFile);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const authData = {
        authenticated_by: user.id,
        authentication_date: new Date().toISOString(),
        authenticated_by_name: user.user_metadata?.name || user.email || 'Authenticator',
        authenticated_by_email: user.email
      };

      // 2. Inserir em translated_documents
      // Note: selectedDocForRejection.id já é o ID da tabela documents_to_be_verified
      const { error: translatedError } = await supabase
        .from('translated_documents')
        .insert({
          original_document_id: selectedDocForRejection.id,
          user_id: selectedDocForRejection.user_id,
          filename: selectedDocForRejection.filename,
          translated_file_url: publicUrl,
          status: 'completed',
          source_language: selectedDocForRejection.source_language || 'en',
          target_language: selectedDocForRejection.target_language || 'pt',
          verification_code: selectedDocForRejection.verification_code || `MANUAL-${Date.now()}`,
          ...authData
        });

      if (translatedError) throw translatedError;

      // 3. Atualizar documents_to_be_verified
      const { error: vError } = await supabase
        .from('documents_to_be_verified')
        .update({ 
          status: 'completed',
          translated_file_url: publicUrl,
          ...authData
        })
        .eq('id', selectedDocForRejection.id);
      
      if (vError) throw vError;

      // 4. Atualizar documento principal
      await supabase
        .from('documents')
        .update({ status: 'completed' })
        .eq('id', selectedDocForRejection.id);

      // Notificar usuário
      try {
        // Fetch profile if not already loaded
        let targetEmail = userProfile?.email;
        let targetName = userProfile?.name;
        
        if (!targetEmail) {
          const { data: p } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', selectedDocForRejection.user_id)
            .single();
          if (p) {
            targetEmail = p.email;
            targetName = p.name;
          }
        }

        if (targetEmail) {
          await sendTranslationCompletionNotification(
            targetEmail,
            {
              userName: targetName || 'Cliente',
              filename: selectedDocForRejection.filename
            }
          );
        }
        await notifyTranslationCompleted(
          selectedDocForRejection.user_id,
          selectedDocForRejection.filename,
          selectedDocForRejection.id
        );
      } catch (notifyErr) {
        console.warn('Erro ao enviar notificações:', notifyErr);
      }

      // Log action
      try {
        await Logger.log(
          ActionTypes.DOCUMENT.APPROVED,
          `Document manual correction uploaded: ${selectedDocForRejection.filename}`,
          {
            entityType: 'document',
            entityId: selectedDocForRejection.id,
            metadata: {
              filename: selectedDocForRejection.filename,
              correction_url: publicUrl,
              ...authData
            },
            affectedUserId: selectedDocForRejection.user_id,
            performerType: 'authenticator'
          }
        );
      } catch (logErr) {
        // Non-blocking
      }

      // Remover documento da lista
      setDocuments(prev => prev.filter(doc => doc.id !== selectedDocForRejection.id));
      setShowRejectModal(false);
      setSelectedDocForRejection(null);
      setManualFile(null);
      
    } catch (err: any) {
      console.error('[DocumentsToAuthenticate] Erro ao enviar correção:', err);
      alert('Erro ao enviar correção: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setRejectionLoading(false);
    }
  };

  const handleRejectCancel = () => {
    setShowRejectModal(false);
    setSelectedDocForRejection(null);
    setManualFile(null);
    setUserProfile(null);
    setShowUserInfo(false);
  };

  const fetchUserProfile = async (userId: string) => {
    setLoadingUserInfo(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, phone')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
      } else {
        setUserProfile(data);
        setShowUserInfo(true);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoadingUserInfo(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C71B2D]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#163353]/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-5xl mx-auto py-8 sm:py-10 px-4 sm:px-6 relative z-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-2 tracking-tight uppercase">
            Authenticate Documents
          </h1>
          <p className="text-gray-600 font-medium opacity-80 uppercase tracking-[0.2em] text-xs">
            Review and process pending authentication requests
          </p>
        </div>

        {/* Stats Card */}
        <div className="relative bg-white/80 backdrop-blur-xl rounded-[30px] p-6 mb-8 border border-gray-200 shadow-lg overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#C71B2D]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 bg-[#C71B2D]/10 backdrop-blur-sm rounded-[20px] flex items-center justify-center border border-[#C71B2D]/20">
              <Clock className="w-7 h-7 text-[#C71B2D]" />
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Pending Queue</p>
              <p className="text-2xl font-black text-gray-900">{documents.length} Documents Awaiting Review</p>
            </div>
          </div>
        </div>

        <div className="relative bg-white/80 backdrop-blur-xl rounded-[30px] shadow-lg border border-gray-200 p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#163353]/5 rounded-full blur-[100px] pointer-events-none" />

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
          {!loading && documents.length === 0 && (
            <div className="relative text-center py-16">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">All Clear!</h3>
              <p className="text-gray-500 font-medium">No pending documents for authentication.</p>
            </div>
          )}
          
          {/* Mobile Cards View */}
          <div className="relative block sm:hidden space-y-4">
            {documents.map(doc => (
              <div key={doc.id} className="relative group bg-white/60 backdrop-blur-sm rounded-[24px] p-5 border border-gray-200 hover:border-[#163353]/40 hover:shadow-lg transition-all">
                <div className="space-y-4">
                  {/* Document Name */}
                  <div>
                    <a href={doc.file_url || '#'} target="_blank" rel="noopener noreferrer" className="text-[#163353] underline font-black text-sm hover:text-[#C71B2D] transition-colors">{doc.filename}</a>
                  </div>

                  {/* Document Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50/50 rounded-[16px] p-3 border border-gray-100">
                    <div>
                      <span className="font-black text-gray-400 uppercase tracking-widest block mb-1">Type</span>
                      <span className="font-bold text-gray-900">{doc.tipo_trad || '-'}</span>
                    </div>
                    <div>
                      <span className="font-black text-gray-400 uppercase tracking-widest block mb-1">Value</span>
                      <span className="font-bold text-[#C71B2D]">{doc.valor ? `$${doc.valor}` : '-'}</span>
                    </div>
                    <div>
                      <span className="font-black text-gray-400 uppercase tracking-widest block mb-1">Language</span>
                      <span className="font-bold text-gray-900">{doc.idioma_raiz || '-'}</span>
                    </div>
                    <div>
                      <span className="font-black text-gray-400 uppercase tracking-widest block mb-1">Pages</span>
                      <span className="font-bold text-gray-900">{doc.pages || '-'}</span>
                    </div>
                  </div>

                  {/* Client/User and Date */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      {doc.client_name ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-gray-900">{doc.client_name}</span>
                          <span className="text-xs font-mono text-gray-500 truncate max-w-20" title={doc.user_id}>
                            {doc.user_id.slice(0, 8)}...
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-gray-500 truncate max-w-20" title={doc.user_id}>
                          {doc.user_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleApprove(doc.id)}
                      disabled={processingDoc === doc.id}
                      className="relative flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-[16px] font-black text-xs uppercase tracking-widest hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all overflow-hidden group/btn"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700" />
                      <CheckCircle className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">{processingDoc === doc.id ? 'Processing...' : 'Approve'}</span>
                    </button>
                    <button
                      onClick={() => handleRejectClick(doc)}
                      disabled={processingDoc === doc.id}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#C71B2D] text-white rounded-[16px] font-black text-xs uppercase tracking-widest hover:bg-[#A01624] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      Manual Upload
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </ div>

          {/* Desktop Table View */}
          <div className="relative hidden sm:block overflow-x-auto">
            <table className="w-full bg-white/50 backdrop-blur-sm border border-gray-200 rounded-[20px] shadow-sm overflow-hidden">
              <thead className="bg-[#163353]/10 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Original File</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Client / User</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Type</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Value</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Language</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Pages</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Submitted At</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id} className="border-t border-gray-200 hover:bg-[#163353]/5 transition-all group">
                    <td className="px-4 py-3">
                      <a href={doc.file_url || '#'} target="_blank" rel="noopener noreferrer" className="text-[#163353] underline font-black text-sm hover:text-[#C71B2D] transition-colors">{doc.filename}</a>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {doc.client_name ? (
                        <div className="flex flex-col">
                          <span className="font-black text-gray-900">{doc.client_name}</span>
                          <span className="text-xs text-gray-500 font-mono truncate max-w-24" title={doc.user_id}>
                            {doc.user_id.slice(0, 8)}...
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-gray-600 truncate max-w-24" title={doc.user_id}>
                          {doc.user_id.slice(0, 8)}...
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{doc.tipo_trad || '-'}</td>
                    <td className="px-4 py-3 text-sm font-black text-[#C71B2D]">{doc.valor ? `$${doc.valor}` : '-'}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{doc.idioma_raiz || '-'}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{doc.pages || '-'}</td>
                    <td className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(doc.id)}
                          disabled={processingDoc === doc.id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-[12px] text-xs font-black uppercase tracking-wider hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {processingDoc === doc.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRejectClick(doc)}
                          disabled={processingDoc === doc.id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#C71B2D] text-white rounded-[12px] text-xs font-black uppercase tracking-wider hover:bg-[#A01624] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Manual Upload
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

             {/* Modal de Correção Manual */}
       {showRejectModal && selectedDocForRejection && (
         <div className="fixed inset-0 bg-black/20 backdrop-blur-md overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95 duration-300">
           <div className="relative bg-white/95 backdrop-blur-xl rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
             {/* Header */}
             <div className="flex items-center justify-between p-8 border-b border-gray-200 bg-gradient-to-r from-[#163353]/5 to-transparent">
               <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-[#163353]/10 backdrop-blur-sm rounded-[20px] flex items-center justify-center border border-[#163353]/20">
                   <Upload className="w-7 h-7 text-[#163353]" />
                 </div>
                 <div>
                   <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Manual Correction</h3>
                   <p className="text-sm font-black text-gray-400 uppercase tracking-widest mt-1">Upload the correct translation</p>
                 </div>
               </div>
               <button
                 type="button"
                 onClick={handleRejectCancel}
                 className="p-3 bg-[#C71B2D] hover:bg-[#A01624] text-white rounded-[16px] transition-all hover:scale-105 active:scale-95 shadow-lg"
                 title="Close modal"
               >
                 <XCircle className="w-5 h-5" />
               </button>
             </div>

             {/* Document Info */}
             <div className="p-8 bg-gray-50/50 border-b border-gray-200">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-[#163353]/10 backdrop-blur-sm rounded-[14px] flex items-center justify-center border border-[#163353]/20">
                     <FileText className="w-5 h-5 text-[#163353]" />
                   </div>
                   <span className="font-black text-gray-900 text-lg">{selectedDocForRejection.filename}</span>
                 </div>
                 <button
                   onClick={() => fetchUserProfile(selectedDocForRejection.user_id)}
                   disabled={loadingUserInfo}
                   className="flex items-center gap-2 px-4 py-2 bg-[#163353]/10 text-[#163353] rounded-[14px] hover:bg-[#163353]/20 transition-all text-sm font-black uppercase tracking-wider border border-[#163353]/20"
                 >
                   <Eye className="w-4 h-4" />
                   {loadingUserInfo ? 'Loading...' : 'View User Info'}
                 </button>
               </div>

               {/* User Information Display */}
               {showUserInfo && userProfile && (
                 <div className="mb-4 p-5 bg-white/80 backdrop-blur-sm rounded-[20px] border border-[#163353]/20 shadow-sm">
                   <div className="flex items-center gap-2 mb-4">
                     <User className="w-5 h-5 text-[#163353]" />
                     <span className="font-black text-gray-900 uppercase tracking-wider">Client Information</span>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                     <div>
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Name</label>
                       <p className="text-gray-900 font-bold">{userProfile.name || 'Not provided'}</p>
                     </div>
                     <div>
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Email</label>
                       <p className="text-gray-900 font-bold break-all">{userProfile.email}</p>
                     </div>
                     <div>
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                         <Phone className="w-3 h-3" />
                         Phone Number
                       </label>
                       <p className="text-gray-900 font-bold">{userProfile.phone || 'Not provided'}</p>
                     </div>
                     <div>
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">User ID</label>
                       <p className="text-gray-900 font-mono text-xs break-all font-bold">{selectedDocForRejection.user_id}</p>
                     </div>
                   </div>
                 </div>
               )}

               <div className="grid grid-cols-2 gap-4 text-sm bg-white/60 backdrop-blur-sm rounded-[16px] p-4 border border-gray-200">
                 <div className="flex items-center gap-2">
                   <User className="w-4 h-4 text-gray-500" />
                   <span className="font-black text-gray-400 uppercase tracking-widest text-xs">ID:</span>
                   <span className="text-gray-900 font-bold">{selectedDocForRejection.user_id.slice(0, 8)}...</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <Calendar className="w-4 h-4 text-gray-500" />
                   <span className="text-gray-900 font-bold">
                     {selectedDocForRejection.created_at ? new Date(selectedDocForRejection.created_at).toLocaleDateString() : '-'}
                   </span>
                 </div>
                 {selectedDocForRejection.tipo_trad && (
                   <div className="flex items-center gap-2">
                     <FileImage className="w-4 h-4 text-gray-500" />
                     <span className="text-gray-900 font-bold">{selectedDocForRejection.tipo_trad}</span>
                   </div>
                 )}
                 {selectedDocForRejection.pages && (
                   <div className="flex items-center gap-2">
                     <FileText className="w-4 h-4 text-gray-500" />
                     <span className="text-gray-900 font-bold">{selectedDocForRejection.pages} pages</span>
                   </div>
                 )}
               </div>
             </div>

             {/* Form */}
             <div className="p-8 space-y-6">
                <div>
                  <label className="block mb-3 text-xs font-black text-gray-900 uppercase tracking-widest">
                    Manually Translated PDF <span className="text-[#C71B2D]">*</span>
                  </label>
                  
                  <div className="relative">
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#163353]/30 rounded-[24px] cursor-pointer bg-[#163353]/5 hover:bg-[#163353]/10 transition-all group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-4 text-[#163353]/60 group-hover:text-[#163353] transition-colors" />
                        <p className="mb-2 text-sm text-gray-700 font-bold group-hover:text-[#163353]">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 font-black uppercase tracking-widest">
                          PDF files only
                        </p>
                      </div>
                      <input 
                        type="file" 
                        accept="application/pdf"
                        className="hidden" 
                        onChange={(e) => setManualFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  {manualFile && (
                    <div className="mt-4 p-4 bg-green-50 rounded-[20px] border border-green-200 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{manualFile.name}</p>
                          <p className="text-xs text-green-600 font-black uppercase tracking-widest">Selected file</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setManualFile(null)}
                        className="p-2 hover:bg-green-100 rounded-full text-green-600 transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-yellow-50 rounded-[16px] border border-yellow-200">
                  <p className="text-xs font-bold text-yellow-800 uppercase tracking-wider leading-relaxed">
                    Note: Uploading a manual correction will mark this document as approved and complete the translation process immediately.
                  </p>
                </div>
             </div>

             {/* Actions */}
             <div className="flex items-center justify-end gap-3 p-8 border-t border-gray-200 bg-gray-50/50">
               <button
                 onClick={handleRejectCancel}
                 className="px-8 py-3 text-gray-700 bg-white border border-gray-300 rounded-[16px] hover:bg-gray-50 transition-all font-black uppercase tracking-wider"
               >
                 Cancel
               </button>
               <button
                 onClick={handleRejectConfirm}
                 disabled={rejectionLoading || !manualFile}
                 className="relative px-8 py-3 bg-[#163353] text-white rounded-[16px] hover:bg-[#0F2438] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-black uppercase tracking-wider flex items-center gap-2 hover:scale-105 disabled:hover:scale-100 overflow-hidden group"
               >
                 {!rejectionLoading && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />}
                 {rejectionLoading ? (
                   <>
                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10"></div>
                     <span className="relative z-10">Uploading...</span>
                   </>
                 ) : (
                   <>
                     <Upload className="w-4 h-4 relative z-10" />
                     <span className="relative z-10">Send Correction</span>
                   </>
                 )}
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
} 