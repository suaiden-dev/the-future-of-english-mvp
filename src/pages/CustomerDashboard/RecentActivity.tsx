import React from 'react';
import { Clock, FileText, Image as ImageIcon, Download } from 'lucide-react';
import { Document } from '../../App';
import { db } from '../../lib/supabase';

interface RecentActivityProps {
  documents: Document[];
  onViewDocument: (document: Document) => void;
}

export function RecentActivity({ documents, onViewDocument }: RecentActivityProps) {
  // Sort documents by upload date (most recent first) and take the last 5
  const recentDocuments = documents
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  // Função para download automático (incluindo PDFs)
  const handleDownload = async (url: string, filename: string) => {
    try {
      // Tentar baixar com URL atual
      const response = await fetch(url);
      
      // Se der erro de acesso negado, tentar regenerar URL
      if (!response.ok && response.status === 403) {
        console.log('URL expirado, regenerando URL...');
        
        // Extrair o caminho do arquivo da URL
        const urlParts = url.split('/');
        const filePath = urlParts.slice(-2).join('/'); // Pega os últimos 2 segmentos
        
        // Tentar URL público primeiro (não expira)
        const publicUrl = await db.generatePublicUrl(filePath);
        if (publicUrl) {
          try {
            const publicResponse = await fetch(publicUrl);
            if (publicResponse.ok) {
              const blob = await publicResponse.blob();
              const downloadUrl = window.URL.createObjectURL(blob);
              
              const link = window.document.createElement('a');
              link.href = downloadUrl;
              link.download = filename;
              window.document.body.appendChild(link);
              link.click();
              window.document.body.removeChild(link);
              
              window.URL.revokeObjectURL(downloadUrl);
              return;
            }
          } catch (error) {
            console.log('URL público falhou, tentando URL pré-assinado...');
          }
        }
        
        // Se URL público falhou, tentar URL pré-assinado de 30 dias
        const signedUrl = await db.generateSignedUrl(filePath);
        if (signedUrl) {
          try {
            const signedResponse = await fetch(signedUrl);
            if (signedResponse.ok) {
              const blob = await signedResponse.blob();
              const downloadUrl = window.URL.createObjectURL(blob);
              
              const link = window.document.createElement('a');
              link.href = downloadUrl;
              link.download = filename;
              window.document.body.appendChild(link);
              link.click();
              window.document.body.removeChild(link);
              
              window.URL.revokeObjectURL(downloadUrl);
              return;
            }
          } catch (error) {
            console.error('Erro ao baixar com URL pré-assinada:', error);
          }
        }
        
        throw new Error('Não foi possível baixar o arquivo. Tente novamente mais tarde.');
      }
      
      // Se a URL original funcionou, fazer download
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        
        const link = window.document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        throw new Error(`Erro ao baixar arquivo: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erro no download:', error);
      alert(`Erro ao baixar arquivo: ${error.message}`);
    }
  };

  const getStatusBadge = (doc: Document) => {
    // Se tem file_url, significa que foi traduzido e está disponível para download/view
    if (doc.file_url) {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Completed</span>;
    }
    
    // Caso contrário, usar o status original
    let color = '';
    let text = '';
    switch (doc.status) {
      case 'pending':
        color = 'bg-yellow-100 text-yellow-800';
        text = 'Pending';
        break;
      case 'processing':
        color = 'bg-tfe-blue-100 text-tfe-blue-800';
        text = 'In Progress';
        break;
      case 'completed':
        color = 'bg-green-100 text-green-800';
        text = 'Completed';
        break;
      default:
        color = 'bg-gray-100 text-gray-600';
        text = doc.status;
    }
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>{text}</span>;
  };

  if (recentDocuments.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">No Recent Activity</h3>
        <p className="text-gray-600 text-lg">
          Your recent document activity will appear here once you start uploading documents.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-4">Recent Activity</h3>
      <div className="grid grid-cols-1 gap-4">
        {recentDocuments.map((doc) => (
          <div key={doc.id} className="bg-tfe-blue-50 border border-tfe-blue-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-2 shadow-sm">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="w-6 h-6 text-tfe-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-tfe-blue-950 truncate" title={doc.filename}>{doc.filename}</div>
                <div className="text-xs text-tfe-blue-800 flex gap-2 items-center mt-0.5">
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
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-tfe-blue-600 text-white rounded-lg font-medium hover:bg-tfe-blue-700 transition-colors text-xs"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button
                    onClick={() => {
                      const fileExtension = doc.filename?.split('.').pop()?.toLowerCase();
                      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
                      if (imageExtensions.includes(fileExtension || '')) {
                        // Para imagens, abrir modal de detalhes
                        onViewDocument(doc);
                      } else {
                        // Para PDFs e outros arquivos, abrir em nova aba
                        window.open(doc.file_url!, '_blank');
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-tfe-blue-200 text-tfe-blue-700 rounded-lg font-medium hover:bg-tfe-blue-50 transition-colors text-xs"
                  >
                    View
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}