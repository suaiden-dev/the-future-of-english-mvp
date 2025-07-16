import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Clock } from 'lucide-react';

interface Document {
  id: string;
  filename: string;
  user_id: string;
  tipo_trad?: string;
  valor?: number;
  idioma_raiz?: string;
  pages?: number;
  status?: string;
  translated_file_url?: string;
  file_url?: string;
  created_at?: string;
}

interface Props {
  user: { id: string; role: string };
}

export default function DocumentsToAuthenticate({ user }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setDocuments(data || []);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="flex items-center gap-3 mb-8 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
          <Clock className="w-10 h-10 text-yellow-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documents to Authenticate</h1>
            <p className="text-gray-600 mt-1">All documents pending your review, ordered by arrival.</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {loading && <p className="text-blue-700">Loading documents...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
          {!loading && documents.length === 0 && (
            <p className="text-gray-500">No pending documents for authentication.</p>
          )}
          {documents.length > 0 && (
            <table className="min-w-full bg-white border rounded-lg shadow">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-4 py-2">Original File</th>
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Value</th>
                  <th className="px-4 py-2">Language</th>
                  <th className="px-4 py-2">Pages</th>
                  <th className="px-4 py-2">Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id} className="border-t hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-2">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-medium">{doc.filename}</a>
                    </td>
                    <td className="px-4 py-2">{doc.user_id}</td>
                    <td className="px-4 py-2">{doc.tipo_trad}</td>
                    <td className="px-4 py-2">{doc.valor ? `$${doc.valor}` : '-'}</td>
                    <td className="px-4 py-2">{doc.idioma_raiz}</td>
                    <td className="px-4 py-2">{doc.pages}</td>
                    <td className="px-4 py-2">{doc.created_at ? new Date(doc.created_at).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
} 