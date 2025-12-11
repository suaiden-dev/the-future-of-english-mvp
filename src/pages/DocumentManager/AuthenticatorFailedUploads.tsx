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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-tfe-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading failed documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchFailedDocuments}
            className="px-4 py-2 bg-tfe-blue-600 text-white rounded-lg hover:bg-tfe-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <FileText className="w-8 h-8 text-tfe-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Failed Uploads</h1>
          </div>
          <p className="text-gray-600">
            {failedDocuments.length === 0
              ? 'No documents with failed uploads'
              : `${failedDocuments.length} ${failedDocuments.length === 1 ? 'document' : 'documents'} with failed uploads`}
          </p>
        </div>

        {/* Documents List */}
        {failedDocuments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Failed Uploads</h2>
            <p className="text-gray-600">
              All documents have been uploaded successfully!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {failedDocuments.map((doc) => (
              <div
                key={doc.document_id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2 flex-1">
                    <FileText className="w-6 h-6 text-tfe-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">
                        {doc.original_filename || doc.filename}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  {doc.upload_retry_count > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex-shrink-0 ml-2">
                      {doc.upload_retry_count} {doc.upload_retry_count === 1 ? 'attempt' : 'attempts'}
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client:</span>
                    <span className="font-medium text-gray-900">
                      {doc.user_name || doc.user_email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pages:</span>
                    <span className="font-medium text-gray-900">{doc.pages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(doc.payment_gross_amount || doc.payment_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Date:</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(doc.payment_date)}
                    </span>
                  </div>
                  {doc.upload_failed_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Failed At:</span>
                      <span className="font-medium text-red-600">
                        {formatDate(doc.upload_failed_at)}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleOpenModal(doc)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-tfe-blue-600 text-white rounded-lg hover:bg-tfe-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload PDF File</span>
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

