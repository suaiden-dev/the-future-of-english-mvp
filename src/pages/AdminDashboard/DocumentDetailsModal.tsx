import { useState, useEffect } from 'react';
import { XCircle, FileText, User, Calendar, Hash, Eye, Download, Phone, X, Loader2, ZoomIn, ZoomOut, RotateCw, FileCheck } from 'lucide-react';
import { getStatusColor, getStatusIcon } from '../../utils/documentUtils';
import { Document } from '../../App';
import { supabase } from '../../lib/supabase';
import { convertPublicToSecure } from '../../lib/storage';

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

export const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({ document, onClose }) => {

  // Hooks de estado 
  const [userProfile, setUserProfile] = useState<{ name: string; email: string; phone: string | null } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [translatedDoc, setTranslatedDoc] = useState<TranslatedDocument | null>(null);
  const [loadingTranslated, setLoadingTranslated] = useState(false);

  // Estados para o visualizador inline
  const [showViewer, setShowViewer] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<'pdf' | 'image' | 'unknown'>('unknown');
  const [loadingViewer, setLoadingViewer] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [viewingFileType, setViewingFileType] = useState<'original' | 'translated'>('original');

  // Hook useEffect para buscar dados quando o documento muda
  useEffect(() => {
    if (document) {
      fetchUserProfile();
      fetchTranslatedDocument();
    }
  }, [document]);

  // Cleanup do viewer URL ao desmontar
  useEffect(() => {
    return () => {
      if (viewerUrl && viewerUrl.startsWith('blob:')) {
        URL.revokeObjectURL(viewerUrl);
      }
    };
  }, [viewerUrl]);

  const fetchTranslatedDocument = async () => {
    if (!document) return;

    const userId = document.user_id;
    const filename = (document as any).filename;
    const documentId = (document as any).id;

    console.log('🔍 Buscando documento traduzido para:', { userId, filename, documentId });
    setLoadingTranslated(true);

    try {
      // Primeiro, tentar buscar por original_document_id (mais preciso)
      if (documentId) {
        const { data: byDocId, error: docIdError } = await supabase
          .from('translated_documents')
          .select('*')
          .eq('original_document_id', documentId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!docIdError && byDocId && byDocId.length > 0) {
          console.log('✅ Documento traduzido encontrado por original_document_id:', byDocId[0]);
          setTranslatedDoc(byDocId[0]);
          setLoadingTranslated(false);
          return;
        }
      }

      // Fallback: buscar por user_id e filename
      if (userId && filename) {
        const { data: byFilename, error: filenameError } = await supabase
          .from('translated_documents')
          .select('*')
          .eq('user_id', userId)
          .ilike('filename', `%${filename.split('.')[0]}%`) // Busca parcial pelo nome
          .order('created_at', { ascending: false })
          .limit(1);

        if (!filenameError && byFilename && byFilename.length > 0) {
          console.log('✅ Documento traduzido encontrado por user_id + filename:', byFilename[0]);
          setTranslatedDoc(byFilename[0]);
          setLoadingTranslated(false);
          return;
        }
      }

      // Último fallback: buscar qualquer documento traduzido do usuário mais recente
      if (userId) {
        const { data: byUser, error: userError } = await supabase
          .from('translated_documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5); // Pegar os 5 mais recentes para debug

        console.log('📋 Todos os documentos traduzidos do usuário:', byUser);

        if (!userError && byUser && byUser.length > 0) {
          // Se temos o filename, tentar encontrar uma correspondência
          if (filename) {
            const matchingDoc = byUser.find(doc =>
              doc.filename?.toLowerCase().includes(filename.toLowerCase().split('.')[0]) ||
              filename.toLowerCase().includes(doc.filename?.toLowerCase().split('.')[0] || '')
            );
            if (matchingDoc) {
              console.log('✅ Documento traduzido encontrado por correspondência de nome:', matchingDoc);
              setTranslatedDoc(matchingDoc);
              setLoadingTranslated(false);
              return;
            }
          }

          // Se não encontrou correspondência, pegar o mais recente
          console.log('⚠️ Nenhuma correspondência exata, usando o mais recente:', byUser[0]);
          setTranslatedDoc(byUser[0]);
          setLoadingTranslated(false);
          return;
        }
      }

      console.log('❌ Nenhum documento traduzido encontrado');
      setTranslatedDoc(null);
    } catch (err) {
      console.error('💥 Erro na busca:', err);
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

  const handleDownload = async (type: 'original' | 'translated') => {
    let rawUrl: string | null = null;
    let filename: string = '';

    if (type === 'translated' && translatedDoc?.translated_file_url) {
      rawUrl = translatedDoc.translated_file_url;
      filename = translatedDoc.filename || 'translated_document.pdf';
    } else {
      rawUrl = (document as any)?.file_url;
      filename = (document as any)?.filename || 'document.pdf';
    }

    if (rawUrl && filename) {
      try {
        const url = await convertPublicToSecure(rawUrl);
        console.log('[Download] URL convertida:', url);
        const response = await fetch(url);
        const blob = await response.blob();
        const objUrl = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = objUrl;
        link.download = filename;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        window.URL.revokeObjectURL(objUrl);
      } catch (error) {
        console.error('Error downloading file:', error);
        alert('Erro ao fazer download do arquivo');
      }
    } else {
      alert('Arquivo não disponível para download');
    }
  };

  const handleViewFile = async (type: 'original' | 'translated') => {
    console.log('👁️ handleViewFile chamado - tipo:', type);
    setLoadingViewer(true);
    setViewerError(null);
    setShowViewer(true);
    setImageZoom(1);
    setImageRotation(0);
    setViewingFileType(type);

    let rawUrl: string | null = null;
    let filename: string = '';

    if (type === 'translated' && translatedDoc?.translated_file_url) {
      rawUrl = translatedDoc.translated_file_url;
      filename = translatedDoc.filename || 'translated_document.pdf';
    } else {
      rawUrl = (document as any)?.file_url;
      filename = (document as any)?.filename || 'document.pdf';
    }

    console.log('🔗 URL a ser visualizada:', rawUrl);

    if (!rawUrl) {
      setViewerError('Arquivo não disponível');
      setLoadingViewer(false);
      return;
    }

    try {
      const secureUrl = await convertPublicToSecure(rawUrl);
      console.log('🔒 URL segura para visualização:', secureUrl);

      const response = await fetch(secureUrl);
      if (!response.ok) {
        throw new Error(`Erro ao carregar arquivo: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const extension = filename.split('.').pop()?.toLowerCase() || '';
      const contentType = blob.type || '';

      if (contentType.includes('pdf') || extension === 'pdf') {
        setViewerType('pdf');
      } else if (contentType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
        setViewerType('image');
      } else {
        setViewerType('unknown');
      }

      setViewerUrl(blobUrl);
      setLoadingViewer(false);
    } catch (error) {
      console.error('❌ Erro ao carregar arquivo:', error);
      setViewerError('Erro ao carregar o arquivo. Tente novamente.');
      setLoadingViewer(false);
    }
  };

  const closeViewer = () => {
    if (viewerUrl && viewerUrl.startsWith('blob:')) {
      URL.revokeObjectURL(viewerUrl);
    }
    setShowViewer(false);
    setViewerUrl(null);
    setViewerType('unknown');
    setViewerError(null);
  };

  const handleZoomIn = () => setImageZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setImageZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setImageRotation(prev => (prev + 90) % 360);

  if (!document) return null;

  // Verificar se tem documento traduzido disponível
  const hasTranslatedDoc = !!(translatedDoc?.translated_file_url || (document as any)?.translated_file_url);
  const hasOriginalDoc = !!(document as any)?.file_url;

  return (
    <>
      {/* Modal de Detalhes */}
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
                        {(document as any).translated_file_url || hasTranslatedDoc ? 'Completed' : (document as any).status}
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
                  <p className="text-gray-900">{
                    (document as any).source_language ||
                    (document as any).idioma_raiz ||
                    'Not specified'
                  }</p>
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

            {/* File Actions - Separado por tipo */}
            <div className="space-y-4">
              {/* Original Document */}
              {hasOriginalDoc && (
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <h4 className="text-md font-semibold text-gray-800">Original Document</h4>
                    <span className="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-1 rounded">
                      Uploaded by User
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleViewFile('original')}
                      disabled={loadingViewer}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      {loadingViewer && viewingFileType === 'original' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                      View Original
                    </button>
                    <button
                      onClick={() => handleDownload('original')}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Original
                    </button>
                  </div>
                </div>
              )}

              {/* Translated Document */}
              {loadingTranslated ? (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-blue-700">Searching for translated document...</span>
                  </div>
                </div>
              ) : hasTranslatedDoc ? (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-3 mb-3">
                    <FileCheck className="w-5 h-5 text-green-600" />
                    <h4 className="text-md font-semibold text-green-800">Translated Document</h4>
                    <span className="bg-green-200 text-green-800 text-xs font-medium px-2 py-1 rounded">
                      ✓ Available
                    </span>
                  </div>
                  {translatedDoc && (
                    <p className="text-sm text-green-700 mb-3">
                      Translated file: <span className="font-mono">{translatedDoc.filename}</span>
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleViewFile('translated')}
                      disabled={loadingViewer}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {loadingViewer && viewingFileType === 'translated' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                      View Translated
                    </button>
                    <button
                      onClick={() => handleDownload('translated')}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Translated
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-yellow-600" />
                    <span className="text-yellow-800 font-medium">Translated document not yet available</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-2">
                    The translation is still in progress or has not been uploaded yet.
                  </p>
                </div>
              )}
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

      {/* Modal de Visualização do Documento */}
      {showViewer && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl w-[95vw] h-[95vh] max-w-6xl flex flex-col overflow-hidden shadow-2xl">
            {/* Header do Viewer */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900 truncate max-w-[300px]">
                  {viewingFileType === 'translated' ? translatedDoc?.filename : (document as any)?.filename || 'Document'}
                </span>
                {viewingFileType === 'translated' ? (
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Translated</span>
                ) : (
                  <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">Original</span>
                )}
                {viewerType === 'pdf' && (
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">PDF</span>
                )}
                {viewerType === 'image' && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Image</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {viewerType === 'image' && viewerUrl && (
                  <>
                    <button
                      onClick={handleZoomOut}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-5 h-5 text-gray-600" />
                    </button>
                    <span className="text-sm text-gray-600 min-w-[50px] text-center">{Math.round(imageZoom * 100)}%</span>
                    <button
                      onClick={handleZoomIn}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={handleRotate}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Rotate"
                    >
                      <RotateCw className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-2" />
                  </>
                )}
                <button
                  onClick={closeViewer}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5 text-gray-600 hover:text-red-600" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Viewer */}
            <div className="flex-1 overflow-auto bg-gray-800 flex items-center justify-center">
              {loadingViewer && (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                  <p className="text-white text-lg">Carregando documento...</p>
                </div>
              )}

              {viewerError && (
                <div className="flex flex-col items-center gap-4 text-center p-8">
                  <XCircle className="w-16 h-16 text-red-400" />
                  <p className="text-white text-lg">{viewerError}</p>
                  <button
                    onClick={closeViewer}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {!loadingViewer && !viewerError && viewerUrl && viewerType === 'pdf' && (
                <iframe
                  src={viewerUrl}
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                />
              )}

              {!loadingViewer && !viewerError && viewerUrl && viewerType === 'image' && (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                  <img
                    src={viewerUrl}
                    alt="Document"
                    className="max-w-none transition-transform duration-200"
                    style={{
                      transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                      transformOrigin: 'center center'
                    }}
                  />
                </div>
              )}

              {!loadingViewer && !viewerError && viewerUrl && viewerType === 'unknown' && (
                <div className="flex flex-col items-center gap-4 text-center p-8">
                  <FileText className="w-16 h-16 text-gray-400" />
                  <p className="text-white text-lg">Formato de arquivo não suportado para visualização inline.</p>
                  <p className="text-gray-400">Use o botão de download para baixar o arquivo.</p>
                  <button
                    onClick={closeViewer}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentDetailsModal;
