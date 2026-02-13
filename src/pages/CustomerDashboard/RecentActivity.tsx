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


export function RecentActivity({ documents, onViewDocument }: RecentActivityProps) {
  const { t } = useI18n();
  // Estados para dados de tradução e verificação
  const [verificationData, setVerificationData] = useState<any[]>([]);
  const [translatedDocs, setTranslatedDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documents.length) {
      setLoading(false);
      return;
    }
    
    const userId = documents[0].user_id;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Buscar registros de verificação (o elo entre documents e translated_documents)
        const { data: vData } = await supabase
          .from('documents_to_be_verified')
          .select('id, original_document_id, filename, status, translated_file_url, user_id')
          .eq('user_id', userId);

        // 2. Buscar documentos traduzidos
        const { data: tData } = await supabase
          .from('translated_documents')
          .select('*')
          .eq('user_id', userId);

        setVerificationData(vData || []);
        setTranslatedDocs(tData || []);
      } catch (err) {
        console.error('[RecentActivity] Erro ao buscar dados de tradução:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [documents]);

  // Mesclar documentos originais com seus status e URLs de tradução
  const recentDocuments = useMemo(() => {
    if (!documents.length) return [];

    const merged = documents.map(doc => {
      // Tentar encontrar o registro de verificação correspondente
      const verification = verificationData.find(v => 
        v.original_document_id === doc.id || 
        (v.filename === doc.filename && v.user_id === doc.user_id)
      );

      // Tentar encontrar a tradução correspondente (pode vir da verificação ou de translated_documents)
      let translationUrl = verification?.translated_file_url;
      
      if (!translationUrl && verification) {
        const td = translatedDocs.find(t => t.original_document_id === verification.id);
        if (td) translationUrl = td.translated_file_url;
      }

      // Se ainda não achou, fallback para busca por filename (como era antes, mas como último recurso)
      if (!translationUrl) {
        const td = translatedDocs.find(t => 
          (t.filename || '').toLowerCase().includes((doc.filename || '').toLowerCase().split('_')[0])
        );
        if (td) translationUrl = td.translated_file_url;
      }

      const finalStatus = verification?.status || doc.status;

      return {
        ...doc,
        status: (finalStatus as any),
        file_url: translationUrl || doc.file_url,
        is_translated: !!translationUrl
      } as Document & { is_translated: boolean };
    });

    return merged
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [documents, verificationData, translatedDocs]);

  // Simplificado: Agora o status e a URL já estão mesclados em recentDocuments
  // Removemos o fetchDocumentStatuses separado pois já é feito no useEffect inicial

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
  const getStatusBadge = (doc: any) => {
    const currentStatus = doc.status;
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
    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${color}`}>
          {text}
        </span>
        {doc.is_translated && (
          <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#C71B2D] text-white animate-pulse">
            {t('dashboard.recentActivity.status.translated') || 'CERTIFIED'}
          </span>
        )}
      </div>
    );
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
