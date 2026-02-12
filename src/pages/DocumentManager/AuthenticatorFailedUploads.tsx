import React, { useState, useEffect } from 'react';
import { FileText, Upload, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { RetryUploadModal } from '../../components/DocumentUploadRetry/RetryUploadModal';
import { DocumentWithMissingFile } from '../../hooks/useDocumentsWithMissingFiles';
import { Logger } from '../../lib/loggingHelpers';
import { ActionTypes } from '../../types/actionTypes';

export default function AuthenticatorFailedUploads() {
  const { user: currentUser } = useAuth();
  const [failedDocuments, setFailedDocuments] = useState<DocumentWithMissingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithMissingFile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchFailedDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Busca TODOS os documentos com falha (sem filtro de user_id)
      const { data, error: fetchError } = await supabase
        .rpc('get_documents_with_missing_files', {
          user_id_param: null // null = buscar TODOS os documentos, não apenas de um usuário
        });

      if (fetchError) {
        console.error('Error fetching failed documents:', fetchError);
        setError(fetchError.message);
        setFailedDocuments([]);
        return;
      }

      // Filter hidden documents (backup of SQL filter)
      const filteredData = (data || []).filter(doc => {
        // Hide specific document: RI-DIGITAL-MAT48812.pdf from client jrbmw118@icloud.com
        if (doc.user_email === 'jrbmw118@icloud.com' && 
            (doc.filename?.includes('RI-DIGITAL-MAT48812') || doc.original_filename?.includes('RI-DIGITAL-MAT48812'))) {
          return false;
        }
        return true;
      });

      setFailedDocuments(filteredData);
    } catch (err: any) {
      console.error('Error fetching failed documents:', err);
      setError(err.message || 'Unknown error');
      setFailedDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailedDocuments();

    // Configurar subscription para atualizações em tempo real
    const channel = supabase
      .channel('authenticator_failed_uploads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents'
        },
        () => {
          fetchFailedDocuments(); // Recarrega quando documentos mudam
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          fetchFailedDocuments(); // Recarrega quando pagamentos mudam
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenModal = (document: DocumentWithMissingFile) => {
    setSelectedDocument(document);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDocument(null);
  };

  const handleUploadSuccess = async (documentId: string) => {
    try {
      // Log de ação específico para authenticator
      if (selectedDocument) {
        await Logger.log(
          ActionTypes.DOCUMENT.MANUAL_UPLOAD_BY_AUTHENTICATOR,
          `Authenticator re-uploaded failed document: ${selectedDocument.filename}`,
          {
            entityType: 'document',
            entityId: documentId,
            affectedUserId: selectedDocument.user_id,
            performerType: 'authenticator',
            metadata: {
              filename: selectedDocument.filename,
              user_id: selectedDocument.user_id,
              user_name: selectedDocument.user_name,
              user_email: selectedDocument.user_email,
              authenticator_id: currentUser?.id,
              authenticator_name: currentUser?.user_metadata?.name || currentUser?.email,
              reason: 'Re-upload after payment confirmed but file upload failed',
              timestamp: new Date().toISOString()
            }
          }
        );
      }

      // Remover da lista após sucesso
      setFailedDocuments(prev => prev.filter(d => d.document_id !== documentId));
      handleCloseModal();
      
      // Recarregar após um delay para garantir atualização
      setTimeout(() => {
        fetchFailedDocuments();
      }, 1000);
    } catch (err) {
      console.error('Error logging upload:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden flex items-center justify-center">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C71B2D]/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#163353]/5 rounded-full blur-[120px]" />
        </div>
        <div className="text-center relative z-10">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-[#163353]/20 blur-2xl rounded-full animate-pulse" />
            <Loader className="relative w-12 h-12 animate-spin text-[#163353]" />
          </div>
          <p className="text-[#163353] font-black uppercase tracking-[0.3em] text-xs">Loading Failed Documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden flex items-center justify-center p-4">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C71B2D]/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#163353]/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative bg-white/80 backdrop-blur-xl rounded-[30px] shadow-lg p-8 max-w-md w-full text-center border border-gray-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C71B2D]/5 rounded-full blur-[60px] pointer-events-none" />
          <div className="relative">
            <AlertCircle className="w-12 h-12 text-[#C71B2D] mx-auto mb-4" />
            <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Error Loading</h2>
            <p className="text-gray-600 font-medium mb-6">{error}</p>
            <button
              onClick={fetchFailedDocuments}
              className="px-6 py-3 bg-[#163353] text-white rounded-[16px] hover:bg-[#0F2438] transition-all font-black uppercase tracking-wider hover:scale-105 active:scale-95"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden p-6">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C71B2D]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#163353]/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-2 tracking-tight uppercase">Failed Uploads</h1>
          <p className="text-gray-600 font-medium opacity-80 uppercase tracking-[0.2em] text-xs">
            {failedDocuments.length === 0
              ? 'No documents with failed uploads'
              : `${failedDocuments.length} ${failedDocuments.length === 1 ? 'document' : 'documents'} with failed uploads`}
          </p>
        </div>

        {/* Documents List */}
        {failedDocuments.length === 0 ? (
          <div className="relative bg-white/80 backdrop-blur-xl rounded-[30px] shadow-lg p-12 text-center border border-gray-200 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full" />
                <CheckCircle className="relative w-16 h-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">No Failed Uploads</h2>
              <p className="text-gray-600 font-medium">
                All documents have been uploaded successfully!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {failedDocuments.map((doc) => (
              <div
                key={doc.document_id}
                className="relative group bg-white/80 backdrop-blur-xl rounded-[24px] shadow-md hover:shadow-2xl transition-all p-6 border border-gray-200 hover:border-[#163353]/40 hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#163353]/5 rounded-full blur-[60px] pointer-events-none" />

                <div className="relative flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2 flex-1">
                    <FileText className="w-6 h-6 text-[#163353] flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-gray-900 line-clamp-2 text-sm">
                        {doc.original_filename || doc.filename}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  {doc.upload_retry_count > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-[8px] flex-shrink-0 ml-2 font-black uppercase tracking-wider">
                      {doc.upload_retry_count} {doc.upload_retry_count === 1 ? 'attempt' : 'attempts'}
                    </span>
                  )}
                </div>

                <div className="relative space-y-2 mb-4 text-sm bg-gray-50/50 rounded-[16px] p-4 border border-gray-100">
                  <div className="flex justify-between">
                    <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Client:</span>
                    <span className="font-bold text-gray-900">
                      {doc.user_name || doc.user_email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Pages:</span>
                    <span className="font-bold text-gray-900">{doc.pages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Amount Paid:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(doc.payment_gross_amount || doc.payment_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Payment Date:</span>
                    <span className="font-bold text-gray-900">
                      {formatDate(doc.payment_date)}
                    </span>
                  </div>
                  {doc.upload_failed_at && (
                    <div className="flex justify-between">
                      <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Failed At:</span>
                      <span className="font-bold text-[#C71B2D]">
                        {formatDate(doc.upload_failed_at)}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleOpenModal(doc)}
                  className="relative w-full flex items-center justify-center space-x-2 px-4 py-3 bg-[#163353] text-white rounded-[16px] hover:bg-[#0F2438] transition-all font-black uppercase tracking-wider hover:scale-105 active:scale-95 overflow-hidden group/btn"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700" />
                  <Upload className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Upload PDF File</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Retry Upload Modal */}
      {selectedDocument && (
        <RetryUploadModal
          document={selectedDocument}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={() => handleUploadSuccess(selectedDocument.document_id)}
        />
      )}
    </div>
  );
}

