import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, AlertCircle, ArrowLeft, Loader } from 'lucide-react';
import { useDocumentsWithMissingFiles } from '../../hooks/useDocumentsWithMissingFiles';
import { RetryUploadModal } from '../../components/DocumentUploadRetry/RetryUploadModal';
import { useAuth } from '../../hooks/useAuth';

export function DocumentRetryUpload() {
  const { documentId } = useParams<{ documentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { documents, loading, error } = useDocumentsWithMissingFiles(user?.id);
  
  // Também pode vir via query param
  const queryDocumentId = searchParams.get('documentId');
  const from = searchParams.get('from');
  
  const targetDocumentId = documentId || queryDocumentId;
  const document = documents.find(d => d.document_id === targetDocumentId);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Se documento foi encontrado e veio do payment, abrir modal automaticamente
    if (document && from === 'payment') {
      setShowModal(true);
    }
  }, [document, from]);

  const handleSuccess = () => {
    setShowModal(false);
    // Redirecionar após sucesso
    setTimeout(() => {
      navigate('/dashboard/retry-upload');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tfe-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando documento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erro ao Carregar</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-tfe-blue-600 text-white rounded-lg hover:bg-tfe-blue-700 transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!targetDocumentId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Documento Não Encontrado</h2>
          <p className="text-gray-600 mb-4">ID do documento não fornecido na URL.</p>
          <button
            onClick={() => navigate('/dashboard/retry-upload')}
            className="px-4 py-2 bg-tfe-blue-600 text-white rounded-lg hover:bg-tfe-blue-700 transition-colors"
          >
            Ver Todos os Documentos Pendentes
          </button>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Documento Não Encontrado</h2>
          <p className="text-gray-600 mb-4">
            Este documento não precisa de reupload ou não foi encontrado na lista de documentos pendentes.
          </p>
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => navigate('/dashboard/retry-upload')}
              className="px-4 py-2 bg-tfe-blue-600 text-white rounded-lg hover:bg-tfe-blue-700 transition-colors"
            >
              Ver Todos os Documentos Pendentes
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard/retry-upload')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar para Lista</span>
          </button>
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-tfe-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reenviar Documento</h1>
              <p className="text-gray-600 mt-1">
                {document.original_filename || document.filename}
              </p>
            </div>
          </div>
        </div>

        {/* Document Details Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Informações do Documento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">Nome do Arquivo:</span>
              <p className="font-medium text-gray-900">{document.original_filename || document.filename}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Número de Páginas:</span>
              <p className="font-medium text-gray-900">{document.pages}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Valor Pago:</span>
              <p className="font-medium text-green-600">
                {formatCurrency(document.payment_gross_amount || document.payment_amount)}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Data do Pagamento:</span>
              <p className="font-medium text-gray-900">{formatDate(document.payment_date)}</p>
            </div>
            {document.upload_retry_count > 0 && (
              <div>
                <span className="text-sm text-gray-600">Tentativas Anteriores:</span>
                <p className="font-medium text-gray-900">
                  {document.upload_retry_count} {document.upload_retry_count === 1 ? 'tentativa' : 'tentativas'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Importante</h3>
              <p className="text-sm text-blue-800">
                Por favor, selecione o mesmo arquivo PDF que você tentou enviar anteriormente. 
                O arquivo deve ter exatamente {document.pages} {document.pages === 1 ? 'página' : 'páginas'}.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-tfe-blue-600 text-white rounded-lg hover:bg-tfe-blue-700 transition-colors font-semibold text-lg"
          >
            Reenviar Arquivo
          </button>
        </div>
      </div>

      {/* Retry Upload Modal */}
      {document && (
        <RetryUploadModal
          document={document}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

