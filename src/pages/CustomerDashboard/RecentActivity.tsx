import { useState, useEffect, useMemo } from 'react';
import { Clock, FileText, Download } from 'lucide-react';
import { Document } from '../../App';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../contexts/I18nContext';
import { convertPublicToSecure } from '../../lib/storage';

interface RecentActivityProps {
  documents: Document[];
  onViewDocument: (document: Document) => void;
}

interface DocumentStatus {
  [documentId: string]: string;
}

export function RecentActivity({ documents, onViewDocument }: RecentActivityProps) {
  const { t } = useI18n();
  const [documentStatuses, setDocumentStatuses] = useState<DocumentStatus>({});
  const [translatedDocs, setTranslatedDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Otimizar o cálculo dos documentos recentes com useMemo
  // Isso garante que a ordenação e o corte só aconteçam quando a lista 'documents' mudar.
  // Buscar documentos traduzidos do usuário
  useEffect(() => {
    if (!documents.length) return;
    const userId = documents[0].user_id;
    supabase
      .from('translated_documents')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => {
        setTranslatedDocs(data || []);
        console.log('[DEBUG] translatedDocs do Supabase:', data);
      });
  }, [documents]);

  // Mesclar documentos originais e traduzidos, priorizando o traduzido se existir
  const recentDocuments = useMemo(() => {
    if (!documents.length) return [];
    console.log('[DEBUG] documents recebidos:', documents);
    console.log('[DEBUG] translatedDocs para merge:', translatedDocs);
    // Para cada documento, se houver translated com mesmo filename, substitui info
    const merged = documents.map(doc => {
      // Se houver original_filename, priorizar para exibição
      const displayFilename = doc.original_filename || doc.filename;
      // Busca apenas por user_id e filename semelhante
      const docFilename = (doc.filename || '').toLowerCase().trim();
      const translated = translatedDocs.find(td => {
        const tdFilename = (td.filename || '').toLowerCase();
        const match = td.user_id === doc.user_id && tdFilename.includes(docFilename.split('_')[0]);
        if (match) {
          console.log('[DEBUG] MATCH por user_id e filename:', { doc, td });
        }
        return match;
      });
      if (translated) {
        console.log('[DEBUG] Documento MESCLADO como traduzido (por user_id/filename):', { doc, translated });
        return {
          ...doc,
          status: 'completed' as 'completed',
          file_url: translated.translated_file_url,
          translated: true,
          translated_id: translated.id,
        };
      }
      return doc;
    });
    console.log('[DEBUG] merged recentDocuments:', merged);
    return merged
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [documents, translatedDocs]);

  // 2. Unificar a lógica em um único useEffect
  // Este efeito será executado sempre que 'recentDocuments' mudar.
  useEffect(() => {
    // Função para buscar os status é definida e chamada dentro do mesmo efeito.
    const fetchDocumentStatuses = async () => {
      if (recentDocuments.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);

      console.log('🔍 Documentos na RecentActivity:', recentDocuments.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        user_id: doc.user_id
      })));

      // Buscar por user_id em vez de document_id (que não existe)
      const { data, error } = await supabase
        .from('documents_to_be_verified')
        .select('id, filename, status, user_id')
        .eq('user_id', recentDocuments[0]?.user_id); // Todos os docs são do mesmo usuário

      console.log('🔍 Query para documents_to_be_verified - user_id:', recentDocuments[0]?.user_id);

      if (error) {
        console.error('Error fetching document statuses:', error);
        setLoading(false);
        return;
      }

      console.log('🔍 Dados encontrados na documents_to_be_verified:', data);

      // Mapear por filename em vez de document_id
      const statusMap: DocumentStatus = {};
      data?.forEach(item => {
        // Usar filename como chave para relacionar com documents
        const matchingDoc = recentDocuments.find(doc => doc.filename === item.filename && doc.user_id === item.user_id);
        if (matchingDoc) {
          statusMap[matchingDoc.id] = item.status;
        }
      });

      console.log('🔍 Mapa de status criado:', statusMap);

      setDocumentStatuses(statusMap);
      setLoading(false);
    };

    fetchDocumentStatuses();
  }, [recentDocuments]); // A dependência agora é estável graças ao useMemo

  // Função para download automático - agora usando URLs seguras
  const handleDownload = async (url: string, filename: string) => {
    try {
      // Converter URL pública para URL segura
      const secureUrl = await convertPublicToSecure(url);
      console.log('[handleDownload] URL segura:', secureUrl);

      const response = await fetch(secureUrl);

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        throw new Error(`Erro ao baixar arquivo: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erro no download:', error);
      alert(`Erro ao baixar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Simplificado: Visualização delegada para o componente pai (que abre o modal)
  const handleViewDocument = (doc: Document) => {
    onViewDocument(doc);
  };

  // O restante do componente (getStatusBadge e JSX) permanece o mesmo.
  const getStatusBadge = (doc: Document) => {
    // Se for documento traduzido, sempre completed
    const currentStatus = (doc as any).translated ? 'completed' : (documentStatuses[doc.id] || doc.status);
    let color = '';
    let text = '';
    switch (currentStatus) {
      case 'pending':
        color = 'bg-amber-500/20 text-amber-400';
        text = t('dashboard.recentActivity.status.pending');
        break;
      case 'processing':
        color = 'bg-[#163353]/30 text-blue-300';
        text = t('dashboard.recentActivity.status.processing');
        break;
      case 'completed':
      case 'approved':
        color = 'bg-emerald-500/20 text-emerald-400';
        text = t('dashboard.recentActivity.status.completed');
        break;
      case 'rejected':
        color = 'bg-red-500/20 text-red-400';
        text = t('dashboard.recentActivity.status.rejected');
        break;
      default:
        color = 'bg-slate-700/30 text-slate-400';
        text = currentStatus || t('dashboard.recentActivity.status.unknown');
    }
    return <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${color}`}>{text}</span>;
  };


  if (documents.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-[30px] shadow-sm border border-gray-200 shadow-lg p-8 text-center">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-2xl font-black text-gray-900 mb-2">{t('dashboard.recentActivity.noActivity.title')}</h3>
        <p className="text-gray-600 text-lg">
          {t('dashboard.recentActivity.noActivity.description')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[30px] shadow-sm border border-gray-200 shadow-lg p-6">
      <h3 className="text-2xl font-black text-gray-900 mb-4">{t('dashboard.recentActivity.title')}</h3>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C71B2D]"></div>
          <span className="ml-2 text-gray-600">{t('dashboard.recentActivity.loading')}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {recentDocuments.map((doc) => {
            const displayFilename = doc.original_filename || doc.filename;
            return (
              <div key={doc.id} className="bg-gray-50/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-2 hover:border-[#C71B2D]/40 hover:shadow-md transition-all group">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="bg-[#163353]/10 p-2 rounded-lg border border-[#163353]/20 group-hover:bg-[#163353]/15 transition-colors flex-shrink-0">
                    <FileText className="w-6 h-6 text-[#C71B2D]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 truncate group-hover:text-gray-700" title={displayFilename}>{displayFilename}</div>
                    <div className="text-xs text-gray-600 flex gap-2 items-center mt-0.5">
                      {getStatusBadge(doc)}
                      <span className="text-gray-500">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                  {doc.file_url && (
                    <>
                      <button
                        onClick={() => handleDownload(doc.file_url!, doc.filename)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#C71B2D] text-white rounded-lg font-bold hover:bg-[#A01624] transition-colors text-xs uppercase tracking-wider hover:shadow-[0_4px_20px_rgba(199,27,45,0.3)]"
                      >
                        <Download className="w-4 h-4" /> {t('dashboard.recentActivity.actions.download')}
                      </button>
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 backdrop-blur-sm border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors text-xs uppercase tracking-wider"
                      >
                        {t('dashboard.recentActivity.actions.view')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
