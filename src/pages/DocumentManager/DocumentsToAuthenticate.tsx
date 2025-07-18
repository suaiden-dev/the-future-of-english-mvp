import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Document {
  id: string;
  filename: string;
  user_id: string;
  tipo_trad?: string;
  valor?: number;
  idioma_raiz?: string;
  pages?: number | null;
  status?: string;
  translated_file_url?: string;
  file_url?: string;
  created_at?: string | null;
}

interface Props {
  user: { id: string; role: string };
}

export default function DocumentsToAuthenticate({ user }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingDoc, setProcessingDoc] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPendingDocuments() {
      setLoading(true);
      setError(null);
      try {
        console.log('[DocumentsToAuthenticate] Buscando documentos pendentes...');
        const { data, error } = await supabase
          .from('documents_to_be_verified')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('[DocumentsToAuthenticate] Erro ao buscar:', error);
          setError(error.message);
        } else {
          setDocuments(data as Document[] || []);
          console.log('[DocumentsToAuthenticate] Documentos carregados:', data);
        }
      } catch (err) {
        console.error('[DocumentsToAuthenticate] Erro inesperado:', err);
        setError('Erro inesperado ao buscar documentos.');
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
      
      // Atualizar status para approved
      const { error } = await supabase
        .from('documents_to_be_verified')
        .update({ status: 'approved' })
        .eq('id', docId);
      
      if (error) {
        console.error('[DocumentsToAuthenticate] Erro ao aprovar:', error);
        alert('Erro ao aprovar documento. Tente novamente.');
        return;
      }

      // Remover documento da lista
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      console.log('[DocumentsToAuthenticate] Documento aprovado com sucesso');
      
    } catch (err) {
      console.error('[DocumentsToAuthenticate] Erro inesperado ao aprovar:', err);
      alert('Erro inesperado ao aprovar documento.');
    } finally {
      setProcessingDoc(null);
    }
  };

  const handleReject = async (docId: string) => {
    setProcessingDoc(docId);
    try {
      console.log('[DocumentsToAuthenticate] Rejeitando documento:', docId);
      
      // Atualizar status para rejected
      const { error } = await supabase
        .from('documents_to_be_verified')
        .update({ status: 'rejected' })
        .eq('id', docId);
      
      if (error) {
        console.error('[DocumentsToAuthenticate] Erro ao rejeitar:', error);
        alert('Erro ao rejeitar documento. Tente novamente.');
        return;
      }

      // Remover documento da lista
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      console.log('[DocumentsToAuthenticate] Documento rejeitado com sucesso');
      
    } catch (err) {
      console.error('[DocumentsToAuthenticate] Erro inesperado ao rejeitar:', err);
      alert('Erro inesperado ao rejeitar documento.');
    } finally {
      setProcessingDoc(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-4 sm:py-10 px-3 sm:px-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3 mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
          <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Documents to Authenticate</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">All documents pending your review, ordered by arrival.</p>
          </div>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          {loading && <p className="text-blue-700 text-base sm:text-lg">Loading documents...</p>}
          {error && <p className="text-red-500 text-base sm:text-lg">Error: {error}</p>}
          {!loading && documents.length === 0 && (
            <p className="text-gray-500 text-base sm:text-lg text-center py-8">No pending documents for authentication.</p>
          )}
          
          {/* Mobile Cards View */}
          <div className="block sm:hidden space-y-4">
            {documents.map(doc => (
              <div key={doc.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="space-y-3">
                  {/* Document Name */}
                  <div>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-medium text-sm">{doc.filename}</a>
                  </div>

                  {/* Document Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-600">Type:</span>
                      <span className="ml-1">{doc.tipo_trad || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Value:</span>
                      <span className="ml-1">{doc.valor ? `$${doc.valor}` : '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Language:</span>
                      <span className="ml-1">{doc.idioma_raiz || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Pages:</span>
                      <span className="ml-1">{doc.pages || '-'}</span>
                    </div>
                  </div>

                  {/* User and Date */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-600 truncate max-w-20" title={doc.user_id}>
                        {doc.user_id.slice(0, 8)}...
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => handleApprove(doc.id)}
                      disabled={processingDoc === doc.id}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {processingDoc === doc.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(doc.id)}
                      disabled={processingDoc === doc.id}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      {processingDoc === doc.id ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full bg-white border rounded-lg shadow">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Original File</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">User</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Type</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Value</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Language</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Pages</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Submitted At</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id} className="border-t hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-2">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-medium text-sm">{doc.filename}</a>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className="font-mono text-gray-600 truncate max-w-24" title={doc.user_id}>
                        {doc.user_id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{doc.tipo_trad || '-'}</td>
                    <td className="px-4 py-2 text-sm">{doc.valor ? `$${doc.valor}` : '-'}</td>
                    <td className="px-4 py-2 text-sm">{doc.idioma_raiz || '-'}</td>
                    <td className="px-4 py-2 text-sm">{doc.pages || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(doc.id)}
                          disabled={processingDoc === doc.id}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                          {processingDoc === doc.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(doc.id)}
                          disabled={processingDoc === doc.id}
                          className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                          {processingDoc === doc.id ? 'Processing...' : 'Reject'}
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
    </div>
  );
} 