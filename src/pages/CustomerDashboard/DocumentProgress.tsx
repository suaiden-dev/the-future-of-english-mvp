import { useState, useEffect } from 'react';
import { FileText, Download, Eye, Loader2, Grid, List, X, ZoomIn, ZoomOut, RotateCw, XCircle, Plus } from 'lucide-react';
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

  const getStatusText = (doc: any) => {
    const status = doc.status?.toLowerCase();
    switch (status) {
      case 'completed':
      case 'finished':
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
  };

  const handleZoomIn = () => setImageZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setImageZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setImageRotation(prev => (prev + 90) % 360);


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C71B2D]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#163353]/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-2 tracking-tight">
            MY TRANSLATIONS
          </h1>
          <p className="text-gray-600 font-medium opacity-80 uppercase tracking-[0.2em] text-xs">
            Track and manage your document ecosystem
          </p>
        </div>

        {loadingTranslated ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-xl rounded-[30px] border border-gray-200 shadow-xl">
            <Loader2 className="w-12 h-12 text-[#C71B2D] animate-spin mb-4" />
            <span className="text-gray-600 font-bold uppercase tracking-widest text-sm">Synchronizing Data...</span>
          </div>
        ) : translatedDocs && translatedDocs.length > 0 ? (
          <>
            {/* View Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
              <div className="flex items-center gap-1 bg-white/80 backdrop-blur-md rounded-2xl p-1.5 shadow-sm border border-gray-200 w-fit">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid'
                      ? 'bg-[#163353] text-white shadow-lg shadow-[#163353]/20'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                  title="Grid view"
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-xl transition-all ${viewMode === 'list'
                      ? 'bg-[#163353] text-white shadow-lg shadow-[#163353]/20'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                  title="List view"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
              <div className="px-4 py-2 bg-[#163353]/5 border border-[#163353]/10 rounded-full">
                <span className="text-xs font-black text-[#163353] uppercase tracking-widest">
                  {translatedDocs.length} Documents Cataloged
                </span>
              </div>
            </div>

            {/* Documents Display */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {translatedDocs.map(doc => (
                  <div key={doc.id} className="relative group bg-white/80 backdrop-blur-xl rounded-[30px] p-8 border border-gray-200 hover:border-[#C71B2D]/40 transition-all hover:shadow-2xl hover:-translate-y-1">
                    <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-5">
                      <FileText className="w-20 h-20" />
                    </div>
                    
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#163353]/10 rounded-[20px] flex items-center justify-center text-[#163353] group-hover:bg-[#C71B2D]/10 group-hover:text-[#C71B2D] transition-colors">
                          <FileText className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="font-black text-gray-900 truncate max-w-[120px] tracking-tight group-hover:text-[#C71B2D] transition-colors" title={doc.original_filename || doc.filename}>
                            {doc.original_filename || doc.filename}
                          </h3>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-US') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        doc.status === 'completed' ? 'bg-green-100 text-green-700' :
                        doc.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {getStatusText(doc)}
                      </span>
                    </div>

                    <div className="space-y-4 mb-8 bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black text-gray-400 uppercase tracking-widest">Language</span>
                        <span className="font-bold text-gray-900">{doc.source_language || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black text-gray-400 uppercase tracking-widest">Pages</span>
                        <span className="font-bold text-gray-900">{doc.pages || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black text-gray-400 uppercase tracking-widest">Price</span>
                        <span className="font-black text-[#163353] text-lg">${doc.total_cost || 'N/A'}</span>
                      </div>
                    </div>

                    {doc.translated_file_url ? (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleDownload(doc.translated_file_url, doc.filename || 'translated_document')}
                          className="relative flex items-center justify-center gap-2 py-3 bg-[#163353] text-white rounded-[15px] font-black text-[10px] uppercase tracking-widest hover:bg-[#0A1A2F] transition-all overflow-hidden group/btn"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700" />
                          <Download className="w-3" />
                          Download
                        </button>
                        <button
                          onClick={() => handleViewFile(doc.translated_file_url, doc.filename || 'document')}
                          className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-900 rounded-[15px] font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all hover:border-[#163353]/30"
                        >
                          <Eye className="w-3" />
                          Preview
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3 py-4 bg-gray-50 rounded-[15px] border border-dashed border-gray-200">
                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">In Processing</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {translatedDocs.map(doc => (
                  <div key={doc.id} className="bg-white/80 backdrop-blur-xl rounded-[24px] p-6 border border-gray-200 hover:border-[#C71B2D]/40 transition-all flex flex-col md:flex-row items-center gap-6 group">
                    <div className="w-12 h-12 bg-[#163353]/10 rounded-2xl flex items-center justify-center text-[#163353] group-hover:bg-[#C71B2D]/10 group-hover:text-[#C71B2D] transition-colors shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 text-lg tracking-tight truncate group-hover:text-[#C71B2D] transition-colors mb-1">
                        {doc.original_filename || doc.filename}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <span>L: {doc.source_language || 'N/A'}</span>
                        <span>P: {doc.pages || 'N/A'}</span>
                        <span>T: {doc.tipo_traducao || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end shrink-0">
                      <span className="text-xl font-black text-[#163353] mb-2">${doc.total_cost || 'N/A'}</span>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        doc.status === 'completed' ? 'bg-green-100 text-green-700' :
                        doc.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {getStatusText(doc)}
                      </span>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {doc.translated_file_url ? (
                        <>
                          <button
                            onClick={() => handleDownload(doc.translated_file_url, doc.filename || 'translated_document')}
                            className="p-3 bg-[#163353] text-white rounded-xl hover:bg-[#0A1A2F] transition-all"
                            title="Download"
                          >
                            <Download className="w-5" />
                          </button>
                          <button
                            onClick={() => handleViewFile(doc.translated_file_url, doc.filename || 'document')}
                            className="p-3 bg-white border border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 transition-all"
                            title="Preview"
                          >
                            <Eye className="w-5" />
                          </button>
                        </>
                      ) : (
                        <div className="p-3 bg-gray-50 text-gray-400 rounded-xl border border-gray-200">
                          <Loader2 className="w-5 animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white/80 backdrop-blur-xl rounded-[30px] p-20 text-center border border-gray-200 shadow-xl overflow-hidden relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#163353]/5 rounded-full blur-[150px] pointer-events-none" />
            <FileText className="w-20 h-20 text-[#163353]/20 mx-auto mb-8 animate-pulse" />
            <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight uppercase">No Documents Found</h3>
            <p className="text-gray-500 mb-10 max-w-md mx-auto font-medium leading-relaxed">
              Elevate your document ecosystem. Start your first translation journey today.
            </p>
            <button
              onClick={() => window.location.href = '/dashboard/upload'}
              className="group relative inline-flex items-center gap-4 px-10 py-5 bg-[#C71B2D] text-white rounded-[20px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 hover:shadow-2xl hover:shadow-[#C71B2D]/30 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] duration-1000" />
              <Plus className="w-6 h-6" />
              New Translation
            </button>
          </div>
        )}

        <DocumentDetailsModal document={selectedDoc} onClose={() => setSelectedDoc(null)} />
      </div>

      {/* Modern High-Performance Viewer */}
      {showViewer && (
        <div className="fixed inset-0 bg-[#0A1A2F]/95 backdrop-blur-2xl flex items-center justify-center z-[60] p-4 sm:p-10 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white rounded-[40px] w-full h-full max-w-7xl flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10">
            {/* Viewer Header */}
            <div className="flex items-center justify-between px-8 py-6 bg-[#163353] text-white border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black tracking-tight truncate max-w-[200px] sm:max-w-md uppercase text-sm">
                    {viewingFilename || 'Document Archive'}
                  </h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black text-white/50 bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest">
                      {viewerType}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {viewerType === 'image' && viewerUrl && (
                  <div className="hidden sm:flex items-center gap-2 bg-white/10 p-2 rounded-2xl backdrop-blur-md">
                    <button onClick={handleZoomOut} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ZoomOut className="w-5 h-5" /></button>
                    <span className="text-xs font-black min-w-[50px] text-center">{Math.round(imageZoom * 100)}%</span>
                    <button onClick={handleZoomIn} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ZoomIn className="w-5 h-5" /></button>
                    <div className="w-px h-6 bg-white/10 mx-1" />
                    <button onClick={handleRotate} className="p-2 hover:bg-white/10 rounded-xl transition-all"><RotateCw className="w-5 h-5" /></button>
                  </div>
                )}
                <button
                  onClick={closeViewer}
                  className="p-4 bg-[#C71B2D] hover:bg-[#A01624] text-white rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#C71B2D]/20"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-[#F8FAFC] flex items-center justify-center p-8">
              {loadingViewer && (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#C71B2D]/20 blur-3xl rounded-full animate-pulse" />
                    <Loader2 className="w-16 h-16 text-[#C71B2D] animate-spin relative" />
                  </div>
                  <p className="text-[#163353] font-black uppercase tracking-[0.3em] text-xs">Decrypting Document...</p>
                </div>
              )}

              {viewerError && (
                <div className="text-center bg-white p-12 rounded-[40px] border border-gray-200 shadow-2xl max-w-md">
                  <XCircle className="w-20 h-20 text-[#C71B2D] mx-auto mb-6" />
                  <h5 className="text-2xl font-black text-gray-900 mb-4 uppercase">Access Denied</h5>
                  <p className="text-gray-500 font-medium mb-8 leading-relaxed">{viewerError}</p>
                  <button onClick={closeViewer} className="w-full py-4 bg-[#163353] text-white rounded-2xl font-black uppercase tracking-widest">Acknowledge</button>
                </div>
              )}

              {!loadingViewer && !viewerError && viewerUrl && viewerType === 'pdf' && (
                <iframe src={viewerUrl} className="w-full h-full rounded-2xl border border-gray-200 shadow-2xl" title="PDF Archive" />
              )}

              {!loadingViewer && !viewerError && viewerUrl && viewerType === 'image' && (
                <div className="w-full h-full overflow-auto flex items-center justify-center">
                  <img
                    src={viewerUrl}
                    alt="Archive"
                    className="max-w-none transition-transform duration-300 shadow-2xl rounded-sm"
                    style={{ transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`, transformOrigin: 'center center' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}