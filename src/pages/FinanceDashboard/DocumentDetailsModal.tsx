import React, { useState, useEffect } from 'react';
import { XCircle, FileText, User, Calendar, Hash, Eye, Download, Phone } from 'lucide-react';
import { getStatusColor, getStatusIcon } from '../../utils/documentUtils';
import { Document } from './PaymentsTable';
import { supabase } from '../../lib/supabase';

interface DocumentDetailsModalProps {
  document: Document | null;
  onClose: () => void;
}

// Definindo um tipo para o perfil do usuário para maior clareza
type UserProfile = {
  name: string;
  email: string;
  phone: string | null;
};

export function DocumentDetailsModal({ document, onClose }: DocumentDetailsModalProps) {
  // Estados para informações do usuário e do documento
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [translatedDoc, setTranslatedDoc] = useState<{ translated_file_url: string; filename: string; } | null>(null);
  const [loadingTranslated, setLoadingTranslated] = useState(false);
  const [actualDocumentStatus, setActualDocumentStatus] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Buscar documento traduzido, perfil do usuário e status atualizado quando o documento mudar
  useEffect(() => {
    if (document) {
      fetchUserProfile();
      fetchTranslatedDocument();
      fetchActualDocumentStatus();
    }
  }, [document]);

  const fetchUserProfile = async () => {
    if (!document?.user_id) return;
    
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, phone')
        .eq('id', document.user_id)
        .single();
      
      if (error) {
        console.error('❌ Erro ao buscar perfil do usuário:', error);
        setUserProfile(null);
      } else {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('💥 Erro na busca do perfil:', err);
      setUserProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchTranslatedDocument = async () => {
    if (!document?.user_id || !document.filename) return;
    
    setLoadingTranslated(true);
    try {
      const { data: translatedDocs, error } = await supabase
        .from('translated_documents')
        .select('translated_file_url, filename')
        .eq('user_id', document.user_id);

      if (error) {
        console.error('Erro ao buscar documentos traduzidos:', error);
        return;
      }
      
      const matchingTranslatedDoc = translatedDocs?.find(td => td.filename === document.filename);
      
      if (matchingTranslatedDoc) {
        setTranslatedDoc(matchingTranslatedDoc);
      }
    } catch (error) {
      console.error('Erro ao buscar documento traduzido:', error);
    } finally {
      setLoadingTranslated(false);
    }
  };

  const fetchActualDocumentStatus = async () => {
    if (!document?.filename) return;
    
    setLoadingStatus(true);
    try {
      const { data: verifiedDoc, error } = await supabase
        .from('documents_to_be_verified')
        .select('status')
        .eq('filename', document.filename)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('❌ Erro ao buscar status do documento:', error);
      }
      
      // Define o status do documento verificado se encontrado, senão mantém o status original
      setActualDocumentStatus(verifiedDoc ? verifiedDoc.status : document.status);

    } catch (err) {
      console.error('💥 Erro na busca do status:', err);
      setActualDocumentStatus(document.status); // Fallback para o status original em caso de erro
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleDownload = async () => {
    // A URL prioritária é a do documento traduzido, se não, a do original
    const fileUrl = document.translated_file_url || translatedDoc?.translated_file_url || document.file_path;
    
    if (fileUrl) {
      try {
        // Usar um link simples para download é mais direto e compatível
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = document.filename; // O nome que o arquivo terá ao ser baixado
        link.target = '_blank'; // Abrir em nova aba para iniciar o download
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading file:', error);
        alert('Error downloading file');
      }
    } else {
        alert('No file available to download');
    }
  };

  const handleViewFile = () => {
    const url = document.translated_file_url || translatedDoc?.translated_file_url || document.file_path;
    
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert('No file available to view');
    }
  };

  if (!document) return null;

  const currentStatus = actualDocumentStatus || document.status;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Document Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close modal">
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
                  {loadingStatus ? (
                    <span className="text-gray-500">Loading...</span>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor({ status: currentStatus } as Document)}`}>
                      {getStatusIcon({ status: currentStatus } as Document)}
                      <span className="ml-1 capitalize">{currentStatus || 'Unknown'}</span>
                    </span>
                  )}
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
              <p className="text-gray-500">Loading user data...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-gray-900">{userProfile?.name || document.user_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900 break-all">{userProfile?.email || document.user_email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </label>
                  <p className="text-gray-900">{userProfile?.phone || document.user_phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">User ID</label>
                  <p className="text-gray-900 font-mono text-sm break-all bg-gray-100 p-2 rounded">
                    {document.user_id || 'Not available'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Document Details, Dates, Verification sections... (sem alterações) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Hash className="w-6 h-6 text-purple-600" />
              <h4 className="text-lg font-semibold text-gray-900">Document Details</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Translation Type</label>
                <p className="text-gray-900">{document.translation_type || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Source Language</label>
                <p className="text-gray-900">{document.source_language || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Target Language</label>
                <p className="text-gray-900">{document.target_language || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Bank Statement</label>
                <p className="text-gray-900">{document.bank_statement ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Authenticated</label>
                <p className="text-gray-900">{document.authenticated ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
          
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
          <div className="bg-tfe-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Eye className="w-6 h-6 text-tfe-blue-600" />
              <h4 className="text-lg font-semibold text-tfe-blue-950">File Actions</h4>
              {loadingTranslated && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-tfe-blue-600"></div>
              )}
              {(document.translated_file_url || translatedDoc?.translated_file_url) && (
                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                  Translated Available
                </span>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleViewFile}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-tfe-blue-600 text-white rounded-lg hover:bg-tfe-blue-700 transition-colors disabled:opacity-50"
                disabled={loadingTranslated}
              >
                <Eye className="w-4 h-4" />
                {(document.translated_file_url || translatedDoc?.translated_file_url) ? 'View Translated File' : 'View Original File'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={loadingTranslated}
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
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