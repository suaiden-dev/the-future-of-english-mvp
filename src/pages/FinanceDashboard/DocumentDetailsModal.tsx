import React, { useState, useEffect } from 'react';
import { XCircle, FileText, User, Calendar, Hash, Eye, Download, AlertCircle } from 'lucide-react';
import { getStatusColor, getStatusIcon } from '../../utils/documentUtils';
import { Document } from '../../App';
import { supabase } from '../../lib/supabase';

interface DocumentDetailsModalProps {
  document: Document | null;
  onClose: () => void;
}

export function DocumentDetailsModal({ document, onClose }: DocumentDetailsModalProps) {
  // Remover estados relacionados ao perfil do usuário para evitar erros
  const [showAdvancedUserInfo, setShowAdvancedUserInfo] = useState(false);
  const [translatedDoc, setTranslatedDoc] = useState<any>(null);
  const [loadingTranslated, setLoadingTranslated] = useState(false);

  // Buscar documento traduzido quando o documento mudar
  useEffect(() => {
    if (document) {
      fetchTranslatedDocument();
    }
  }, [document]);

  const fetchTranslatedDocument = async () => {
    if (!document) return;
    
    setLoadingTranslated(true);
    try {
      console.log('🔍 Buscando documento traduzido para user_id:', document.user_id);
      
      const { data: translatedDocs, error } = await supabase
        .from('translated_documents')
        .select('translated_file_url, filename')
        .eq('user_id', document.user_id);

      console.log('🎯 Documentos traduzidos encontrados:', translatedDocs);
      
      // Procurar o documento traduzido que corresponde ao filename atual
      const matchingTranslatedDoc = translatedDocs?.find(td => td.filename === document.filename);
      console.log('🎯 Documento traduzido correspondente:', matchingTranslatedDoc);
      
      if (matchingTranslatedDoc && !error) {
        setTranslatedDoc(matchingTranslatedDoc);
      }
    } catch (error) {
      console.error('Erro ao buscar documento traduzido:', error);
    } finally {
      setLoadingTranslated(false);
    }
  };

  if (!document) return null;

  const handleDownload = async () => {
    // Prioriza translated_file_url se encontrou documento traduzido, senão usa file_url original
    const fileUrl = translatedDoc?.translated_file_url || document.file_url;
    
    if (fileUrl) {
      try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.filename;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading file:', error);
        alert('Error downloading file');
      }
    }
  };

  const handleViewFile = () => {
    console.log('👁️ handleViewFile chamado');
    console.log('📄 document:', document);
    console.log('📑 translatedDoc:', translatedDoc);
    
    // Prioriza translated_file_url se encontrou documento traduzido, senão usa file_url original
    const url = translatedDoc?.translated_file_url || document.file_url;
    
    console.log('🔗 URL do arquivo:', url);
    
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.log('❌ Nenhuma URL encontrada para abrir');
      alert('No file available to view');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Document Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close modal"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-6 h-6 text-tfe-blue-600" />
              <h4 className="text-lg font-semibold text-gray-900">File Information</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Filename</label>
                <p className="text-gray-900 break-all">{document.filename}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Pages</label>
                <p className="text-gray-900">{document.pages || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Total Cost</label>
                <p className="text-gray-900 font-semibold">${document.total_cost || 0}.00</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document)}`}>
                    {getStatusIcon(document)}
                    <span className="ml-1 capitalize">{document.file_url ? 'Completed' : document.status || 'Unknown'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User Info - Simplificado para não quebrar */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <User className="w-6 h-6 text-green-600" />
              <h4 className="text-lg font-semibold text-gray-900">User Information</h4>
            </div>
            
            {!document.user_id ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>No user ID associated with this document</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Sempre mostrar o User ID */}
                <div>
                  <label className="text-sm font-medium text-gray-700">User ID</label>
                  <p className="text-gray-900 font-mono text-sm break-all bg-gray-100 p-2 rounded">
                    {document.user_id}
                  </p>
                </div>
                
                {/* Botão para tentar buscar informações avançadas (opcional) */}
                <button
                  onClick={() => setShowAdvancedUserInfo(!showAdvancedUserInfo)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  {showAdvancedUserInfo ? 'Hide' : 'Try to Load'} Advanced User Info
                </button>
                
                {/* Informações avançadas (se solicitado) */}
                {showAdvancedUserInfo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Advanced user information (name, email, phone) is not available due to database access restrictions.
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      This is likely due to RLS (Row Level Security) policies or permission issues.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Document Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Hash className="w-6 h-6 text-purple-600" />
              <h4 className="text-lg font-semibold text-gray-900">Document Details</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Translation Type</label>
                <p className="text-gray-900">{document.tipo_trad || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Source Language</label>
                <p className="text-gray-900">{document.idioma_raiz || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Bank Statement</label>
                <p className="text-gray-900">{document.is_bank_statement ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Authenticated</label>
                <p className="text-gray-900">{document.is_authenticated ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
          
          {/* Dates */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-6 h-6 text-orange-600" />
              <h4 className="text-lg font-semibold text-gray-900">Timeline</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Created</label>
                <p className="text-gray-900">{document.created_at ? new Date(document.created_at).toLocaleString() : 'Not available'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Last Updated</label>
                <p className="text-gray-900">{document.updated_at ? new Date(document.updated_at).toLocaleString() : 'Not available'}</p>
              </div>
            </div>
          </div>
          
          {/* Verification */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Hash className="w-6 h-6 text-tfe-red-600" />
              <h4 className="text-lg font-semibold text-gray-900">Verification</h4>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Verification Code</label>
              <p className="text-gray-900 font-mono text-sm break-all">{document.verification_code || 'Not available'}</p>
            </div>
          </div>

          {/* Actions */}
          {(document.file_url || translatedDoc?.translated_file_url) && (
            <div className="bg-tfe-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Eye className="w-6 h-6 text-tfe-blue-600" />
                <h4 className="text-lg font-semibold text-tfe-blue-950">File Actions</h4>
                {loadingTranslated && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-tfe-blue-600"></div>
                )}
                {translatedDoc?.translated_file_url && (
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                    Translated Available
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleViewFile}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-tfe-blue-600 text-white rounded-lg hover:bg-tfe-blue-700 transition-colors"
                  disabled={loadingTranslated}
                >
                  <Eye className="w-4 h-4" />
                  {translatedDoc?.translated_file_url ? 'View Translated File' : 'View File'}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  disabled={loadingTranslated}
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
