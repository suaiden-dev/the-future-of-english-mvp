import React, { useState, useEffect, useMemo } from 'react';
import { Clock, FileText, Download } from 'lucide-react';
import { Document } from '../../App';
import { db } from '../../lib/supabase'; // Supondo que 'db' seja um wrapper com helpers
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../contexts/I18nContext';

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
  const [loading, setLoading] = useState(true);

  // 1. Otimizar o cálculo dos documentos recentes com useMemo
  // Isso garante que a ordenação e o corte só aconteçam quando a lista 'documents' mudar.
  const recentDocuments = useMemo(() => {
    return documents
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [documents]);

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

  // Função para download automático (lógica mantida, pois estava correta)
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok && response.status === 403) {
        console.log('URL expirado, regenerando URL...');
        const urlParts = url.split('/');
        const filePath = urlParts.slice(-2).join('/');
        
        // Tentar URL público primeiro
        const publicUrl = await db.generatePublicUrl(filePath);
        if (publicUrl) {
          try {
            const publicResponse = await fetch(publicUrl);
            if (publicResponse.ok) {
              const blob = await publicResponse.blob();
              const downloadUrl = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = downloadUrl;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(downloadUrl);
              return;
            }
          } catch (error) {
            console.log('URL público falhou, tentando URL pré-assinado...');
          }
        }
        
        // Tentar URL pré-assinado
        const signedUrl = await db.generateSignedUrl(filePath);
        if (signedUrl) {
          try {
            const signedResponse = await fetch(signedUrl);
            if (signedResponse.ok) {
              const blob = await signedResponse.blob();
              const downloadUrl = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = downloadUrl;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(downloadUrl);
              return;
            }
          } catch (error) {
            console.error('Erro ao baixar com URL pré-assinada:', error);
          }
        }
        
        throw new Error('Não foi possível baixar o arquivo. Tente novamente mais tarde.');
      }
      
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

  // Função para buscar documento traduzido quando status for completed
  const handleViewDocument = async (doc: Document) => {
    const currentStatus = documentStatuses[doc.id] || doc.status;
    
    console.log(`🎯 View clicked - Doc: ${doc.filename}, Status: ${currentStatus}`);
    console.log(`🔍 Documento completo:`, doc);
    console.log(`🔍 User ID que vamos buscar:`, doc.user_id);
    
    // Se o documento está completed, buscar o documento traduzido
    if (currentStatus === 'completed') {
      try {
        console.log(`🔍 Fazendo busca na translated_documents com user_id: ${doc.user_id}`);
        
        // Primeiro, vamos ver TODOS os documentos traduzidos para este usuário
        const { data: allTranslatedDocs, error: allError } = await supabase
          .from('translated_documents')
          .select('*')
          .eq('user_id', doc.user_id);

        console.log('🎯 TODOS documentos traduzidos para este user_id:', allTranslatedDocs);
        console.log('🎯 Error da busca geral:', allError);

        // Agora a busca específica - remover .single() pois pode haver múltiplos documentos
        const { data: translatedDocs, error } = await supabase
          .from('translated_documents')
          .select('translated_file_url, filename')
          .eq('user_id', doc.user_id);

        console.log('🎯 Documentos traduzidos encontrados:', translatedDocs);
        console.log('🎯 Error:', error);

        // Procurar o documento traduzido que corresponde ao filename atual
        const translatedDoc = translatedDocs?.find(td => td.filename === doc.filename && td.user_id === doc.user_id);
        console.log('🎯 Documento traduzido correspondente:', translatedDoc);

        if (translatedDoc && translatedDoc.translated_file_url && !error) {
          // Mostrar documento traduzido
          const fileExtension = doc.filename?.split('.').pop()?.toLowerCase();
          const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
          
          if (imageExtensions.includes(fileExtension || '')) {
            // Para imagens, criar um documento temporário com a URL traduzida
            const translatedDocForViewing = {
              ...doc,
              file_url: translatedDoc.translated_file_url
            };
            onViewDocument(translatedDocForViewing);
          } else {
            // Para PDFs, abrir a URL traduzida diretamente
            window.open(translatedDoc.translated_file_url, '_blank');
          }
          return;
        }
      } catch (error) {
        console.error('Erro ao buscar documento traduzido:', error);
      }
    }
    
    // Fallback: mostrar documento original
    const fileExtension = doc.filename?.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    if (imageExtensions.includes(fileExtension || '')) {
      onViewDocument(doc);
    } else {
      window.open(doc.file_url!, '_blank');
    }
  };

  // O restante do componente (getStatusBadge e JSX) permanece o mesmo.
  const getStatusBadge = (doc: Document) => {
    const currentStatus = documentStatuses[doc.id] || doc.status;
    let color = '';
    let text = '';
    switch (currentStatus) {
      case 'pending':
        color = 'bg-yellow-100 text-yellow-800';
        text = t('dashboard.recentActivity.status.pending');
        break;
      case 'processing':
        color = 'bg-blue-100 text-blue-800';
        text = t('dashboard.recentActivity.status.processing');
        break;
      case 'completed':
      case 'approved':
        color = 'bg-green-100 text-green-800';
        text = t('dashboard.recentActivity.status.completed');
        break;
      case 'rejected':
        color = 'bg-red-100 text-red-800';
        text = t('dashboard.recentActivity.status.rejected');
        break;
      default:
        color = 'bg-gray-100 text-gray-600';
        text = currentStatus || t('dashboard.recentActivity.status.unknown');
    }
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>{text}</span>;
  };

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('dashboard.recentActivity.noActivity.title')}</h3>
        <p className="text-gray-600 text-lg">
          {t('dashboard.recentActivity.noActivity.description')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('dashboard.recentActivity.title')}</h3>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">{t('dashboard.recentActivity.loading')}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {recentDocuments.map((doc) => (
            <div key={doc.id} className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-2 shadow-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="w-6 h-6 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-blue-900 truncate" title={doc.filename}>{doc.filename}</div>
                  <div className="text-xs text-blue-800 flex gap-2 items-center mt-0.5">
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
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-xs"
                    >
                      <Download className="w-4 h-4" /> {t('dashboard.recentActivity.actions.download')}
                    </button>
                    <button
                      onClick={() => handleViewDocument(doc)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors text-xs"
                    >
                      {t('dashboard.recentActivity.actions.view')}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}