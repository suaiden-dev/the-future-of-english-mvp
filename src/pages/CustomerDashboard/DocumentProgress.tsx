import { useState, useEffect } from 'react';
import { FileText, Download, Eye, Clock, CheckCircle, AlertCircle, Loader2, Grid, List, X, ZoomIn, ZoomOut, RotateCw, XCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUserTranslatedDocuments } from '../../hooks/useDocuments';
import { DocumentDetailsModal } from './DocumentDetailsModal';
import { getValidFileUrl } from '../../utils/fileUtils';

export default function DocumentProgress() {
  const { user } = useAuth();
  const { documents: translatedDocs, loading: loadingTranslated } = useUserTranslatedDocuments(user?.id);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Estados para o visualizador inline
  const [showViewer, setShowViewer] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<'pdf' | 'image' | 'unknown'>('unknown');
  const [loadingViewer, setLoadingViewer] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [viewingFilename, setViewingFilename] = useState<string>('');

  // Cleanup do viewer URL ao desmontar
  useEffect(() => {
    return () => {
      if (viewerUrl && viewerUrl.startsWith('blob:')) {
        URL.revokeObjectURL(viewerUrl);
      }
    };
  }, [viewerUrl]);

  // Função para download automático (incluindo PDFs)
  const handleDownload = async (url: string, filename: string) => {
    try {
      // Obter uma URL válida
      const validUrl = await getValidFileUrl(url);

      // Fazer o download
      const response = await fetch(validUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      // Limpar o URL do blob
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      // Fallback para download direto
      const link = window.document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  };

  // Função para visualizar no modal
  const handleViewFile = async (url: string, filename: string) => {
    setLoadingViewer(true);
    setViewerError(null);
    setShowViewer(true);
    setImageZoom(1);
    setImageRotation(0);
    setViewingFilename(filename);

    try {
      const validUrl = await getValidFileUrl(url);
      console.log('🔒 URL segura para visualização:', validUrl);

      const response = await fetch(validUrl);
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
    setViewingFilename('');
  };

  const handleZoomIn = () => setImageZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setImageZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setImageRotation(prev => (prev + 90) % 360);

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'finished':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-tfe-blue-500 animate-spin" />;
      case 'pending':
      case 'waiting':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'error':
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-tfe-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (doc: any) => {
    const status = doc.status?.toLowerCase();

    switch (status) {
      case 'completed':
      case 'finished':
        return 'bg-green-100 text-green-800';
      case 'processing':
      case 'in_progress':
        return 'bg-tfe-blue-100 text-tfe-blue-800';
      case 'pending':
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
      case 'failed':
        return 'bg-tfe-red-100 text-tfe-red-800';
      case 'rejected':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (doc: any) => {
    if (doc.source === 'translated_documents') {
      switch (doc.status?.toLowerCase()) {
        case 'completed':
        case 'finished':
          return 'Completed';
        case 'rejected':
          return 'Rejected';
        case 'processing':
        case 'in_progress':
          return 'Processing';
        case 'pending':
        case 'waiting':
          return 'Pending';
        case 'error':
        case 'failed':
          return 'Error';
        default:
          return 'Pending';
      }
    }

    if (doc.source === 'documents_to_be_verified') {
      switch (doc.status?.toLowerCase()) {
        case 'completed':
          return 'Completed';
        case 'processing':
        case 'in_progress':
          return 'Processing';
        case 'pending':
        case 'waiting':
          return 'Pending';
        case 'rejected':
          return 'Rejected';
        case 'error':
        case 'failed':
          return 'Error';
        default:
          return 'Pending';
      }
    }

    if (doc.source === 'documents') {
      switch (doc.status?.toLowerCase()) {
        case 'completed':
        case 'finished':
          return 'Completed';
        case 'processing':
        case 'in_progress':
          return 'Processing';
        case 'pending':
        case 'waiting':
          return 'Pending';
        case 'error':
        case 'failed':
          return 'Error';
        default:
          return 'Pending';
      }
    }

    switch (doc.status?.toLowerCase()) {
      case 'completed':
      case 'finished':
        return 'Completed';
      case 'processing':
      case 'in_progress':
        return 'Processing';
      case 'pending':
      case 'waiting':
        return 'Pending';
      case 'error':
      case 'failed':
        return 'Error';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  };

  const DocumentCard = ({ doc }: { doc: any }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-tfe-blue-500" />
          <div>
            <h3 className="font-semibold text-gray-900 truncate max-w-32 sm:max-w-48 text-sm sm:text-base" title={doc.original_filename || doc.filename}>
              {doc.original_filename || doc.filename}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-US') : 'Date not available'}
            </p>
          </div>
        </div>
        {getStatusIcon(doc.status || 'pending')}
      </div>

      <div className="mb-3 sm:mb-4">
        <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(doc)}`}>
          {getStatusText(doc)}
        </span>
      </div>

      <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4 text-xs sm:text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Language:</span>
          <span className="font-medium truncate ml-2">{doc.source_language || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span>Pages:</span>
          <span className="font-medium">{doc.pages || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span>Price:</span>
          <span className="font-medium">${doc.total_cost || 'N/A'}</span>
        </div>
      </div>

      {doc.translated_file_url && (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-tfe-blue-600 text-white rounded-lg font-medium hover:bg-tfe-blue-700 transition-colors text-xs sm:text-sm"
            onClick={async (e) => {
              e.preventDefault();
              await handleDownload(doc.translated_file_url, doc.filename || 'translated_document');
            }}
            title="Download file"
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            onClick={() => handleViewFile(doc.translated_file_url, doc.filename || 'document')}
            className="inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-xs sm:text-sm"
            title="View file"
          >
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">View</span>
          </button>
        </div>
      )}

      {!doc.translated_file_url && (
        <div className="text-center py-3 sm:py-4">
          <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-1 sm:mb-2" />
          <p className="text-xs sm:text-sm text-gray-500">Document in processing</p>
        </div>
      )}
    </div>
  );

  const DocumentRow = ({ doc }: { doc: any }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-tfe-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base" title={doc.original_filename || doc.filename}>
              {doc.original_filename || doc.filename}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-US') : 'Date not available'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex justify-center sm:justify-start">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc)}`}>
              {getStatusText(doc)}
            </span>
          </div>

          <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-right">
            <div className="grid grid-cols-3 gap-2 sm:block sm:space-y-1">
              <div className="truncate" title={doc.source_language || 'N/A'}>
                <span className="sm:hidden text-gray-400">Lang:</span> {doc.source_language || 'N/A'}
              </div>
              <div className="truncate">
                <span className="sm:hidden text-gray-400">Pages:</span> {doc.pages || 'N/A'}
              </div>
              <div className="truncate font-medium">
                <span className="sm:hidden text-gray-400">Price:</span> ${doc.total_cost || 'N/A'}
              </div>
            </div>
          </div>

          {doc.translated_file_url && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                className="inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 bg-tfe-blue-600 text-white rounded-lg font-medium hover:bg-tfe-blue-700 transition-colors text-xs"
                onClick={async (e) => {
                  e.preventDefault();
                  await handleDownload(doc.translated_file_url, doc.filename || 'translated_document');
                }}
                title="Download file"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
              <button
                onClick={() => handleViewFile(doc.translated_file_url, doc.filename || 'document')}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-xs"
                title="View file"
              >
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">View</span>
              </button>
            </div>
          )}

          {!doc.translated_file_url && (
            <div className="text-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Processing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-6 sm:py-10 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">My Translations</h1>
            <p className="text-sm sm:text-base text-gray-600">Track the status of your document translations</p>
          </div>

          {loadingTranslated ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-tfe-blue-500 animate-spin mr-2 sm:mr-3" />
              <span className="text-sm sm:text-base text-gray-600">Loading documents...</span>
            </div>
          ) : translatedDocs && translatedDocs.length > 0 ? (
            <>
              {/* View Mode Toggle */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200 w-fit">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'grid'
                        ? 'bg-tfe-blue-100 text-tfe-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                      }`}
                    title="Grid view"
                  >
                    <Grid className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'list'
                        ? 'bg-tfe-blue-100 text-tfe-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                      }`}
                    title="List view"
                  >
                    <List className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  {translatedDocs.length} document{translatedDocs.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Documents Display */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {translatedDocs.map(doc => (
                    <DocumentCard key={doc.id} doc={doc} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {translatedDocs.map(doc => (
                    <DocumentRow key={doc.id} doc={doc} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">No documents found</h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">You don't have any translated documents yet. Make your first upload in the Translations page.</p>
              <button
                onClick={() => window.location.href = '/dashboard/upload'}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-tfe-blue-600 text-white rounded-lg font-medium hover:bg-tfe-blue-700 transition-colors text-sm sm:text-base"
              >
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                Go to Translations
              </button>
            </div>
          )}

          <DocumentDetailsModal document={selectedDoc} onClose={() => setSelectedDoc(null)} />
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
                  {viewingFilename || 'Document'}
                </span>
                {viewerType === 'pdf' && (
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">PDF</span>
                )}
                {viewerType === 'image' && (
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Image</span>
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
                  <p className="text-white text-lg">Loading document...</p>
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
                    Close
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
                  <p className="text-white text-lg">File format not supported for inline viewing.</p>
                  <p className="text-gray-400">Use the download button to download the file.</p>
                  <button
                    onClick={closeViewer}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}