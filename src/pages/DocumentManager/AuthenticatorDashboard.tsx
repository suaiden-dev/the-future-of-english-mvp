import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, FileText, Download, XCircle, CheckCircle } from 'lucide-react';

console.log('[AuthenticatorDashboard] Renderizando dashboard do autenticador');

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

export default function AuthenticatorDashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Logs detalhados ao renderizar
  useEffect(() => {
    // Log do localStorage
    if (typeof window !== 'undefined') {
      console.log('[AuthenticatorDashboard] localStorage:', window.localStorage);
    }
    // Se futuramente receber user por props, logar aqui
    // Exemplo: if (user) { console.log('[AuthenticatorDashboard] Usuário:', user); }
  }, []);

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('documents_to_be_verified')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('[AuthenticatorDashboard] Erro ao buscar documentos:', error);
          // Tratar erro de permissão
          if (error.code === '42501' || error.code === 'PGRST301') {
            setError('Você não tem permissão para acessar esta área.');
          } else {
            setError(error.message);
          }
        } else {
          setDocuments(data || []);
        }
      } catch (err) {
        console.error('[AuthenticatorDashboard] Erro inesperado:', err);
        setError('Erro inesperado ao buscar documentos.');
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, []);

  async function handleApprove(id: string) {
    await supabase.from('documents_to_be_verified').update({ status: 'completed' }).eq('id', id);
    setDocuments(docs => docs.filter(doc => doc.id !== id));
  }

  async function handleReject(id: string) {
    await supabase.from('documents_to_be_verified').update({ status: 'rejected' }).eq('id', id);
    setDocuments(docs => docs.filter(doc => doc.id !== id));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 p-0">
      <div className="max-w-6xl mx-auto py-10 px-4">
        {/* Cabeçalho destacado */}
        <div className="flex items-center gap-4 mb-8 p-6 bg-white rounded-xl shadow-lg border-l-8 border-green-500">
          <ShieldCheck className="w-12 h-12 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Painel do Autenticador</h1>
            <p className="text-blue-700 mt-1">Aprove ou rejeite documentos traduzidos enviados para verificação. Apenas autenticadores têm acesso a este painel.</p>
          </div>
        </div>
        {/* Tabela de documentos */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-700" /> Documentos para autenticação
          </h2>
          {loading && <p className="text-blue-700">Carregando documentos...</p>}
          {error && <p className="text-red-500">Erro: {error}</p>}
          <table className="min-w-full bg-white border rounded-lg shadow">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-2">Arquivo Original</th>
                <th className="px-4 py-2">Arquivo Traduzido</th>
                <th className="px-4 py-2">Usuário</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2">Idioma</th>
                <th className="px-4 py-2">Páginas</th>
                <th className="px-4 py-2">Enviado em</th>
                <th className="px-4 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id} className="border-t hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-2">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-medium">{doc.filename}</a>
                  </td>
                  <td className="px-4 py-2">
                    {doc.translated_file_url ? (
                      <>
                        <a href={doc.translated_file_url} target="_blank" rel="noopener noreferrer" className="text-green-700 underline font-medium mr-2">Abrir</a>
                        <a href={doc.translated_file_url} download className="text-green-700 underline font-medium"><Download className="inline w-4 h-4 mb-1" /> Download</a>
                      </>
                    ) : (
                      <span className="text-gray-400">Não disponível</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{doc.user_id}</td>
                  <td className="px-4 py-2">{doc.tipo_trad}</td>
                  <td className="px-4 py-2">{doc.valor ? `$${doc.valor}` : '-'}</td>
                  <td className="px-4 py-2">{doc.idioma_raiz}</td>
                  <td className="px-4 py-2">{doc.pages}</td>
                  <td className="px-4 py-2">{doc.created_at ? new Date(doc.created_at).toLocaleString() : '-'}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <button onClick={() => handleApprove(doc.id)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"><CheckCircle className="w-4 h-4" />Aprovar</button>
                    <button onClick={() => handleReject(doc.id)} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"><XCircle className="w-4 h-4" />Rejeitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {documents.length === 0 && !loading && <p className="mt-6 text-gray-500">Nenhum documento pendente para autenticação.</p>}
        </div>
      </div>
    </div>
  );
} 