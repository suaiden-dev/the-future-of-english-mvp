import React, { useState, useEffect } from 'react';
import { XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useDocumentCleanup } from '../hooks/useDocumentCleanup';

export function PaymentCancelled() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanupComplete, setCleanupComplete] = useState(false);

  // Hook para limpeza de documentos
  const { cleanupAllPendingDocuments } = useDocumentCleanup({
    isPaymentCompleted: false,
    shouldCleanup: true,
    onCleanupComplete: () => {
      console.log('✅ Limpeza de documentos concluída');
      setCleanupComplete(true);
    }
  });

  useEffect(() => {
    // Chamar a função de limpeza assim que a página carregar
    if (!cleanupComplete) {
      cleanupDraftDocuments();
    }
  }, [cleanupComplete]);

  // Função para chamar a limpeza usando o hook
  const cleanupDraftDocuments = async () => {
    if (isLoading) {
      console.log('DEBUG: cleanupDraftDocuments já está executando, ignorando');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCleanupComplete(false);

    try {
      await cleanupAllPendingDocuments();
    } catch (err: any) {
      console.error('ERROR: Erro na limpeza de documentos:', err);
      setError(err.message || 'Erro ao limpar documentos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusMessage = () => {
    if (isLoading) {
      return "Cleaning up your temporary document...";
    }
    if (error) {
      return "An error occurred while cleaning up your document.";
    }
    if (cleanupComplete) {
      return "The payment was cancelled and your document has been removed.";
    }
    return "The payment was cancelled.";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
        {/* Icone e TÃ­tulo */}
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          Payment Cancelled
        </h1>
        <p className="text-gray-500 mt-2">
          {getStatusMessage()}
        </p>
        {error && !isLoading && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">{error}</p>
        )}

        {/* O que aconteceu */}
        <div className="bg-gray-50/70 rounded-lg p-4 my-6 text-left">
          <h2 className="font-semibold text-gray-800 mb-3">What happened?</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>You cancelled the payment process.</li>
            <li className="flex items-start"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>Your document was not sent for translation.</li>
            <li className="flex items-start"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>No charge was made to your account.</li>
          </ul>
        </div>

        {/* BotÃ£o de AÃ§Ã£o */}
        <div className="mb-6">
          <button
            onClick={async () => {
              await cleanupDraftDocuments();
              navigate('/customer-dashboard');
            }}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <ArrowLeft className="w-5 h-5 mr-2" />
            )}
            <span>
              {isLoading ? 'Cleaning...' : 'Back to Dashboard'}
            </span>
          </button>
        </div>

        {/* InformaÃ§Ãµes de Contato */}
        <div className="pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Need help? Contact us at <a href="mailto:support@thefutureofenglish.com" className="font-medium text-blue-600 hover:underline">support@thefutureofenglish.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
