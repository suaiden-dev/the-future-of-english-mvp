import React, { useState, useEffect } from 'react';
import { XCircle, FileText, User, Calendar, DollarSign, Hash, Eye, Download, Phone } from 'lucide-react';
import { getStatusColor, getStatusIcon } from '../../utils/documentUtils';
import { Document } from '../../App';
import { supabase } from '../../lib/supabase';

// A interface para as propriedades do componente permanece a mesma.

type TranslatedDocument = {
  id: string;
  filename: string;
  user_id: string;
  pages: number;
  status: string;
  total_cost: number;
  source_language: string;
  target_language: string;
  translated_file_url: string;
  created_at: string;
  is_authenticated: boolean;
  verification_code: string;
  original_document_id?: string;
};

type DocumentDetailsModalProps = {
  document: Document | TranslatedDocument | null;
  onClose: () => void;
};

// A definição do componente funcional é adicionada aqui.
// Toda a lógica do componente deve estar dentro desta função.
export const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({ document, onClose }) => {
  
  // Hooks de estado 
  const [userProfile, setUserProfile] = useState<{ name: string; email: string; phone: string | null } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [translatedDoc, setTranslatedDoc] = useState<TranslatedDocument | null>(null);
  const [loadingTranslated, setLoadingTranslated] = useState(false);

  // Hook useEffect para buscar dados quando o documento muda
  useEffect(() => {
    if (document) {
      fetchUserProfile();
      // Se o documento não tem translated_file_url, busca o documento traduzido pelo user_id
      if (!(document as any).translated_file_url) {
        fetchTranslatedDocument();
      }
    }
  }, [document]);

  const fetchTranslatedDocument = async () => {
    if (!document) return;
    console.log('🔍 Buscando documento traduzido para user_id:', document.user_id);
    setLoadingTranslated(true);
    try {
      const { data, error } = await supabase
        .from('translated_documents')
        .select('*')
        .eq('user_id', document.user_id)
        .single();
      
      console.log('✅ Resultado da busca - data:', data);
      console.log('❌ Resultado da busca - error:', error);
      
      if (!error && data) {
        console.log('🎯 Documento traduzido encontrado:', data);
        console.log('🔗 URL do arquivo traduzido:', data.translated_file_url);
        setTranslatedDoc(data);
      } else {
        console.log('❌ Nenhum documento traduzido encontrado para este user_id');
        setTranslatedDoc(null);
      }
    } catch (err) {
      console.log('💥 Erro na busca:', err);
      setTranslatedDoc(null);
    } finally {
      setLoadingTranslated(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!document) return;
    
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, phone')
        .eq('id', document.user_id)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
      } else {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };
  
  const handleDownload = async () => {
    // Prioriza translated_file_url se encontrou documento traduzido, senão usa file_url
    const url = translatedDoc?.translated_file_url || (document as any)?.translated_file_url || (document as any)?.file_url;
    const filename = translatedDoc?.filename || (document as any)?.filename || 'document.pdf';
    if (url && filename) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const objUrl = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = objUrl;
        link.download = filename || 'document.pdf';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        window.URL.revokeObjectURL(objUrl);
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
    
    // Prioriza translated_file_url se encontrou documento traduzido, senão usa file_url
    const url = translatedDoc?.translated_file_url || (document as any)?.translated_file_url || (document as any)?.file_url;
    
    console.log('🔗 URL do arquivo:', url);
    
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.log('❌ Nenhuma URL encontrada para abrir');
    }
  };

  // Verificação para renderização nula, se não houver documento.
  if (!document) return null;

  // A declaração de retorno (JSX) permanece no final.
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
              <FileText className="w-6 h-6 text-blue-600" />
              <h4 className="text-lg font-semibold text-gray-900">File Information</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Filename</label>
                <p className="text-gray-900 break-all">{(document as any).filename}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Pages</label>
                <p className="text-gray-900">{(document as any).pages}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Total Cost</label>
                <p className="text-gray-900 font-semibold">${(document as any).total_cost}.00</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document)}`}>
                    {getStatusIcon(document)}
                    <span className="ml-1 capitalize">
                      {(document as any).translated_file_url ? 'Completed' : (document as any).status}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <User className="w-6 h-6 text-green-600" />
              <h4 className="text-lg font-semibold text-gray-900">User Information</h4>
            </div>
            {loadingProfile ? (
              <div className="text-gray-500">Loading user information...</div>
            ) : userProfile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-gray-900">{userProfile.name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900 break-all">{userProfile.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </label>
                  <p className="text-gray-900">{userProfile.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">User ID</label>
                  <p className="text-gray-900 font-mono text-sm break-all">{document.user_id}</p>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">User information not available</div>
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
                <p className="text-gray-900">{'tipo_trad' in (document || {}) ? (document as any).tipo_trad : 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Source Language</label>
                <p className="text-gray-900">{(document as any).source_language || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Bank Statement</label>
                <p className="text-gray-900">{(document as any).is_bank_statement ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Authenticated</label>
                <p className="text-gray-900">{(document as any).is_authenticated ? 'Yes' : 'No'}</p>
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
                <p className="text-gray-900">{(document as any).created_at ? new Date((document as any).created_at).toLocaleString() : 'Not available'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Last Updated</label>
                <p className="text-gray-900">{(document as any).updated_at ? new Date((document as any).updated_at).toLocaleString() : 'Not available'}</p>
              </div>
            </div>
          </div>
          
          {/* Verification */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Hash className="w-6 h-6 text-red-600" />
              <h4 className="text-lg font-semibold text-gray-900">Verification</h4>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Verification Code</label>
              <p className="text-gray-900 font-mono text-sm break-all">{document.verification_code}</p>
            </div>
          </div>

          {/* Actions */}
          {((document as any).translated_file_url || (document as any).file_url) && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-blue-900 mb-3">File Actions</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleViewFile}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  {(document as any).translated_file_url ? 'View Translated' : 'View File'}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {(document as any).translated_file_url ? 'Download Translated' : 'Download'}
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
};

// Adicionado export default para consistência.
export default DocumentDetailsModal;