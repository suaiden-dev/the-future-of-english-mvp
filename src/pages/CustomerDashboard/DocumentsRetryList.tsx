import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertCircle, CheckCircle, Upload, ArrowLeft } from 'lucide-react';
import { useDocumentsWithMissingFiles } from '../../hooks/useDocumentsWithMissingFiles';
import { RetryUploadModal } from '../../components/DocumentUploadRetry/RetryUploadModal';
import { useAuth } from '../../hooks/useAuth';

export function DocumentsRetryList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { documents, loading, error, count, refetch } = useDocumentsWithMissingFiles(user?.id);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
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

  const handleRetrySuccess = async () => {
    setSelectedDocument(null);
    // Forçar atualização após um pequeno delay para garantir que o banco foi atualizado
    setTimeout(async () => {
      // Tentar refetch primeiro para atualização rápida
      await refetch();
      // Aguardar um pouco mais e recarregar a página para garantir que tudo está atualizado
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tfe-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
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
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-tfe-blue-600 text-white rounded-lg hover:bg-tfe-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const selectedDoc = documents.find(d => d.document_id === selectedDocument);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-tfe-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pending Document Re-upload</h1>
              <p className="text-gray-600 mt-1">
                {count === 0
                  ? 'No pending documents'
                  : `${count} ${count === 1 ? 'pending document' : 'pending documents'}`}
              </p>
            </div>
          </div>
        </div>

        {/* Documents List */}
        {count === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Pending Documents</h2>
            <p className="text-gray-600 mb-6">
              All your documents have been uploaded successfully!
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-tfe-blue-600 text-white rounded-lg hover:bg-tfe-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div
                key={doc.document_id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-6 h-6 text-tfe-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900 line-clamp-2">
                        {doc.original_filename || doc.filename}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  {doc.upload_retry_count > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      {doc.upload_retry_count} {doc.upload_retry_count === 1 ? 'attempt' : 'attempts'}
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4 text-sm">
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
                </div>

                <button
                  onClick={() => setSelectedDocument(doc.document_id)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-tfe-blue-600 text-white rounded-lg hover:bg-tfe-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Re-upload File</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Retry Upload Modal */}
      {selectedDoc && (
        <RetryUploadModal
          document={selectedDoc}
          isOpen={!!selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onSuccess={handleRetrySuccess}
        />
      )}
    </div>
  );
}

