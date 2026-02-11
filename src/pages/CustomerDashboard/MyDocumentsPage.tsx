import React, { useState, useRef, useEffect } from 'react';
import { Folder as FolderIcon, FileText, Plus, MoreVertical, ArrowLeft, Grid, List, Download, Eye, Edit2, Trash2, X, ZoomIn, ZoomOut, RotateCw, XCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useFolders } from '../../hooks/useFolders';
import { useTranslatedDocuments } from '../../hooks/useDocuments';
import { supabase } from '../../lib/supabase';
import { convertPublicToSecure } from '../../lib/storage';

export default function MyDocumentsPage() {
  const { user } = useAuth();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState<boolean>(false);
  const openFolderTimeout = useRef<NodeJS.Timeout | null>(null);
  const [dragOverBreadcrumb, setDragOverBreadcrumb] = useState<string | null>(null);
  const [movingFileId, setMovingFileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<any | null>(null);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Estados para o visualizador inline
  const [showViewer, setShowViewer] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<'pdf' | 'image' | 'unknown'>('unknown');
  const [loadingViewer, setLoadingViewer] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [viewingFilename, setViewingFilename] = useState<string>('');

  const { folders, createFolder, updateFolder, deleteFolder, loading: foldersLoading } = useFolders(user?.id);
  const { documents, loading: docsLoading, refetch } = useTranslatedDocuments(user?.id);

  // DEBUG: Logs para identificar problemas (reduzidos para evitar spam)
  useEffect(() => {
    console.log('[MyDocumentsPage] DEBUG - Dados carregados:', {
      userId: user?.id,
      foldersCount: folders?.length || 0,
      documentsCount: documents?.length || 0,
      currentFolderId,
      foldersLoading,
      docsLoading,
      draggedFileId
    });
  }, [user?.id, folders?.length, documents?.length, currentFolderId, foldersLoading, docsLoading, draggedFileId]);

  // Cleanup touch drag on unmount
  useEffect(() => {
    return () => {
      // Cleanup viewer URL
      if (viewerUrl && viewerUrl.startsWith('blob:')) {
        URL.revokeObjectURL(viewerUrl);
      }
    };
  }, [viewerUrl]);

  // Função para visualizar arquivo no modal
  const handleViewFile = async (url: string, filename: string) => {
    setLoadingViewer(true);
    setViewerError(null);
    setShowViewer(true);
    setImageZoom(1);
    setImageRotation(0);
    setViewingFilename(filename);

    try {
      const secureUrl = await convertPublicToSecure(url);
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
    setViewingFilename('');
  };

  const handleZoomIn = () => setImageZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setImageZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setImageRotation(prev => (prev + 90) % 360);

  // Close dropdown when clicking outside or changing folder
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest('.dropdown-container')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  // Close dropdown when changing folder
  useEffect(() => {
    setOpenDropdownId(null);
  }, [currentFolderId]);

  // Filtrar pastas e arquivos da pasta atual
  const currentFolders = folders.filter(f => f.parent_id === currentFolderId);
  const currentDocuments = documents.filter(d => d.folder_id === currentFolderId && d.status === 'completed');
  const currentFolder = folders.find(f => f.id === currentFolderId);

  // Navegar para pasta anterior
  const handleGoBack = () => {
    if (!currentFolderId) return;
    const parent = folders.find(f => f.id === currentFolderId)?.parent_id || null;
    setCurrentFolderId(parent);
  };

  // Criar nova pasta
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createFolder({ name: newFolderName, parent_id: currentFolderId });
    setNewFolderName('');
    setShowNewFolder(false);
  };

  // Função para mover arquivo para pasta
  const handleMoveFileToFolder = async (fileId: string, folderId: string | null) => {
    setMovingFileId(fileId);
    try {
      // Primeiro, verificar se o arquivo existe
      const { data: existingFile, error: checkError } = await supabase
        .from('translated_documents')
        .select('id, folder_id, filename')
        .eq('id', fileId)
        .single();

      if (checkError) {
        throw checkError;
      }

      // Atualizar folder_id do arquivo
      const { data, error } = await supabase
        .from('translated_documents')
        .update({ folder_id: folderId })
        .eq('id', fileId)
        .select();

      if (error) throw error;
      await refetch();
      setTimeout(() => setMovingFileId(null), 800); // animação mais suave
    } catch (err) {
      console.error('[DRAG-DROP] Erro ao mover arquivo:', err);
      alert('Erro ao mover arquivo: ' + (err as any).message);
      setMovingFileId(null);
    }
  };

  // Função para mover pasta para outra pasta
  const handleMoveFolderToFolder = async (folderId: string, newParentId: string | null) => {
    try {
      await updateFolder(folderId, { parent_id: newParentId });
      await refetch();
    } catch (err) {
      alert('Erro ao mover pasta: ' + (err as any).message);
    }
  };

  // Função para obter todas as pastas disponíveis para mover (excluindo a pasta atual e suas subpastas)
  const getAvailableFoldersForMove = () => {
    return folders.filter(f => f.id !== currentFolderId);
  };

  // Funções para touch drag and drop
  const handleTouchStart = (e: React.TouchEvent, item: any, type: 'file' | 'folder') => {
    // Removed touch drag logic
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Removed touch drag logic
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Removed touch drag logic
  };

  const handleTouchCancel = () => {
    // Removed touch drag logic
  };

  // Função para montar o caminho (breadcrumb) até a pasta atual
  function getBreadcrumbPath() {
    const path: { id: string | null, name: string }[] = [];
    let folder = folders.find(f => f.id === currentFolderId) || null;
    while (folder) {
      path.unshift({ id: folder.id, name: folder.name });
      const parentFolder = folders.find(f => f.id === folder?.parent_id) || null;
      folder = parentFolder;
    }
    path.unshift({ id: null, name: 'My Documents' });
    return path;
  }
  const breadcrumbPath = getBreadcrumbPath();

  // Função para colapsar breadcrumb se for muito longo
  function getCollapsedBreadcrumb(path: { id: string | null, name: string }[]) {
    if (path.length <= 4) return path.map((c, i) => ({ ...c, isEllipsis: false }));
    // Exibe: primeiro, ellipsis, penúltimo-2, penúltimo-1, último
    return [
      { ...path[0], isEllipsis: false },
      { id: 'ellipsis', name: '...', isEllipsis: true, tooltip: path.slice(1, -3).map(p => p.name).join(' / ') },
      ...path.slice(-3).map(c => ({ ...c, isEllipsis: false }))
    ];
  }
  const collapsedBreadcrumb = getCollapsedBreadcrumb(breadcrumbPath);

  // Função para formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para renomear arquivo
  const handleRenameFile = async () => {
    if (!newFileName.trim() || newFileName.trim() === selectedFile?.filename) {
      setIsRenaming(false);
      setNewFileName('');
      return;
    }

    try {
      const { error } = await supabase
        .from('translated_documents')
        .update({ filename: newFileName.trim() })
        .eq('id', selectedFile?.id);

      if (error) throw error;

      // Atualizar o arquivo selecionado localmente
      if (selectedFile) {
        setSelectedFile({ ...selectedFile, filename: newFileName.trim() });
      }

      // Recarregar a lista de documentos
      await refetch();

      setIsRenaming(false);
      setNewFileName('');
    } catch (err) {
      alert('Error renaming file: ' + (err as any).message);
    }
  };

  // Função para cancelar rename
  const handleCancelRename = () => {
    setIsRenaming(false);
    setNewFileName('');
  };

  // Função para deletar arquivo (delete visual)
  const handleDeleteFile = async () => {
    if (!selectedFile) return;

    try {
      const { error } = await supabase
        .from('translated_documents')
        .update({ is_deleted: true })
        .eq('id', selectedFile.id);

      if (error) throw error;

      // Fechar modal e recarregar lista
      setSelectedFile(null);
      await refetch();
    } catch (err) {
      alert('Error deleting file: ' + (err as any).message);
    }
  };

  // Função para abrir modal de renomear pasta
  const handleOpenRenameFolder = (folder: any) => {
    setSelectedFolder(folder);
    setEditingFolderName(folder.name);
    setShowRenameFolderModal(true);
  };

  // Função para renomear pasta
  const handleRenameFolder = async () => {
    if (!selectedFolder || !editingFolderName.trim() || editingFolderName.trim() === selectedFolder.name) {
      setShowRenameFolderModal(false);
      setSelectedFolder(null);
      setEditingFolderName('');
      return;
    }

    try {
      await updateFolder(selectedFolder.id, { name: editingFolderName.trim() });

      // Fechar modal e limpar estados
      setShowRenameFolderModal(false);
      setSelectedFolder(null);
      setEditingFolderName('');
    } catch (err) {
      alert('Error renaming folder: ' + (err as any).message);
    }
  };

  // Função para abrir modal de deletar pasta
  const handleOpenDeleteFolder = (folder: any) => {
    setSelectedFolder(folder);
    setShowDeleteFolderModal(true);
  };

  // Função para deletar pasta
  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;

    try {
      await deleteFolder(selectedFolder.id);

      // Fechar modal e limpar estados
      setShowDeleteFolderModal(false);
      setSelectedFolder(null);
    } catch (err) {
      alert('Error deleting folder: ' + (err as any).message);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C71B2D]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#163353]/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 relative z-10">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-2 tracking-tight">
            MY DOCUMENTS
          </h1>
          <p className="text-gray-600 font-medium opacity-80 uppercase tracking-[0.2em] text-xs">
            Organize and manage your translated files
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[30px] shadow-lg p-6 sm:p-8 border border-gray-200 min-h-[70vh]">
          {/* Breadcrumb Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-2 min-w-0">
              {currentFolderId && (
                <button onClick={handleGoBack} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title="Go back">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <nav className="flex items-center gap-1 text-base sm:text-lg font-medium min-w-0 overflow-x-auto whitespace-nowrap">
                {collapsedBreadcrumb.map((crumb, idx) => (
                  <React.Fragment key={crumb.id ?? `crumb-${idx}`}>
                    {crumb.isEllipsis ? (
                      <div
                        className="px-1 sm:px-2 py-1 rounded text-gray-500 cursor-default"
                        title={crumb.tooltip}
                        style={{ display: 'inline-block', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        ...
                      </div>
                    ) : (
                      <div
                        className={`px-2 sm:px-3 py-1.5 rounded-xl transition-all duration-150 ${dragOverBreadcrumb === (crumb.id ?? 'root') ? 'bg-[#C71B2D]/10 text-[#C71B2D] ring-2 ring-[#C71B2D]/30' : 'text-gray-700'} ${idx === collapsedBreadcrumb.length - 1 ? 'font-bold bg-gray-100' : 'cursor-pointer hover:bg-gray-100'}`}
                        style={{ display: 'inline-block', maxWidth: collapsedBreadcrumb.length > 4 ? 100 : 'none', overflow: collapsedBreadcrumb.length > 4 ? 'hidden' : 'visible', textOverflow: collapsedBreadcrumb.length > 4 ? 'ellipsis' : 'clip' }}
                        onClick={() => {
                          if (crumb.id !== currentFolderId) setCurrentFolderId(crumb.id);
                        }}
                        onDragOver={e => {
                          if (draggedFileId) {
                            e.preventDefault();
                            setDragOverBreadcrumb(crumb.id ?? 'root');
                          }
                        }}
                        onDragLeave={e => {
                          if (draggedFileId) setDragOverBreadcrumb(null);
                        }}
                        onDrop={e => {
                          if (draggedFileId) {
                            e.preventDefault();
                            setDragOverBreadcrumb(null);
                            handleMoveFileToFolder(draggedFileId, crumb.id);
                            setDraggedFileId(null);
                          }
                        }}
                        title={dragOverBreadcrumb === (crumb.id ?? 'root') && draggedFileId ? 'Move here' : crumb.name}
                      >
                        {crumb.name}
                      </div>
                    )}
                    {idx < collapsedBreadcrumb.length - 1 && <span className="mx-1 text-gray-400" aria-label="separator">&gt;</span>}
                  </React.Fragment>
                ))}
              </nav>
            </div>
            <div className="flex gap-2">
              <button
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-[#C71B2D] hover:bg-[#A01624] text-white rounded-2xl transition-all hover:scale-105 hover:shadow-lg font-bold text-sm sm:text-base"
                onClick={() => setShowNewFolder(true)}
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">New Folder</span>
                <span className="sm:hidden">Folder</span>
              </button>
            </div>
          </div>

          {/* Instructions and Features */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-2xl p-4 sm:p-5 mb-6">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-blue-900 mb-3 flex items-center gap-2">
              <FolderIcon className="w-4 h-4" />
              My Documents - Features & Instructions
            </h3>
            <div className="text-xs sm:text-sm text-blue-800 space-y-2">
              <p><strong>• Organize:</strong> Create folders to organize your translated documents</p>
              <p><strong>• Drag & Drop:</strong> Drag files between folders or to the root level</p>
              <p><strong>• Manage:</strong> Hover over folders to see options (rename/delete)</p>
              <p><strong>• View:</strong> Click on documents to view details and download</p>
              <p><strong>• Navigate:</strong> Use breadcrumbs to move between folders</p>
              <p><strong>• Search:</strong> Use the search bar to find specific documents</p>
            </div>
          </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-gray-100 rounded-2xl p-1.5 shadow-sm">
          <button
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${viewMode === 'grid'
              ? 'bg-white text-[#C71B2D] shadow-md'
              : 'text-gray-600 hover:text-gray-900'
              }`}
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${viewMode === 'list'
              ? 'bg-white text-[#C71B2D] shadow-md'
              : 'text-gray-600 hover:text-gray-900'
              }`}
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {showNewFolder && (
        <form onSubmit={handleCreateFolder} className="mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-4 rounded-2xl border-2 border-gray-200">
          <input
            type="text"
            className="border-2 border-gray-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-[#C71B2D]/20 focus:border-[#C71B2D] flex-1 font-medium transition-all"
            placeholder="Enter folder name..."
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 w-full sm:w-auto">
            <button type="submit" className="flex-1 sm:flex-none bg-[#C71B2D] hover:bg-[#A01624] text-white px-5 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-md text-sm">Create</button>
            <button type="button" className="flex-1 sm:flex-none text-gray-600 hover:text-gray-900 px-4 py-3 text-sm font-medium hover:bg-gray-200 rounded-xl transition-all" onClick={() => setShowNewFolder(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8"
          onDragOver={e => {
            e.preventDefault();
            if (!dragOverFolderId && draggedFileId) {
              if (!dragOverRoot) setDragOverRoot(true);
            }
          }}
          onDragLeave={e => {
            if (!dragOverFolderId && draggedFileId) {
              setDragOverRoot(false);
            }
          }}
          onDrop={e => {
            e.preventDefault();
            if (!dragOverFolderId && draggedFileId) {
              setDragOverRoot(false);
              handleMoveFileToFolder(draggedFileId, null);
              setDraggedFileId(null);
            }
          }}
          style={{ minHeight: 120, background: dragOverRoot && draggedFileId ? 'rgba(199,27,45,0.05)' : 'transparent', transition: 'background 0.3s ease', borderRadius: '24px' }}
        >
          {foldersLoading && (
            <div className="col-span-full flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-[#C71B2D]/30" />
            </div>
          )}
          
          {/* Folders */}
          {currentFolders.map((item) => (
            <div
              key={item.id}
              className={`group relative bg-white rounded-[24px] p-6 flex flex-col items-center justify-center shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-[#FACC15]/50 hover:scale-[1.05] active:scale-[0.98] ${dragOverFolderId === item.id ? 'ring-4 ring-[#FACC15]/30 border-[#FACC15]' : ''}`}
              onClick={() => setCurrentFolderId(item.id)}
              title={`Open folder ${item.name}`}
              onDragOver={e => {
                e.preventDefault();
                setDragOverFolderId(item.id);
              }}
              onDragLeave={() => {
                setDragOverFolderId(null);
                if (openFolderTimeout.current) clearTimeout(openFolderTimeout.current);
              }}
              onDrop={e => {
                e.preventDefault();
                setDragOverFolderId(null);
                if (openFolderTimeout.current) clearTimeout(openFolderTimeout.current);
                if (draggedFileId) {
                  handleMoveFileToFolder(draggedFileId, item.id);
                  setDraggedFileId(null);
                }
              }}
            >
              <div className="w-16 h-16 bg-[#FACC15]/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#FACC15]/20 group-hover:scale-110 transition-all duration-300 shadow-inner">
                <FolderIcon className="w-8 h-8 text-[#EAB308]" />
              </div>
              <span className="text-gray-900 font-bold text-center truncate w-full text-sm sm:text-base tracking-tight">{item.name}</span>
              <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mt-1">Folder</p>
              
              <div className="absolute top-3 right-3">
                <div className="relative dropdown-container">
                  <button
                    className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    aria-label="More options"
                    title="More options"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openDropdownId === item.id && (
                    <div className="absolute right-0 top-8 bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl py-2 z-20 min-w-[140px] animate-in fade-in zoom-in duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          handleOpenRenameFolder(item);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#C71B2D] flex items-center space-x-3 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Rename</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          handleOpenDeleteFolder(item);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-bold text-[#C71B2D] hover:bg-red-50 flex items-center space-x-3 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Skeletons for Loading Documents */}
          {docsLoading && (
            <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-[24px] p-8 flex flex-col items-center justify-center min-h-[160px] animate-pulse border border-gray-100">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl mb-4" />
                  <div className="h-4 w-24 bg-gray-50 rounded mb-2" />
                  <div className="h-3 w-12 bg-gray-50 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Documents */}
          {currentDocuments.map((item) => (
            <div
              key={item.id}
              className={`group relative bg-white rounded-[24px] p-6 flex flex-col items-center justify-center shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer border border-gray-100 hover:border-[#163353]/30 hover:scale-[1.05] active:scale-[0.98] ${
                movingFileId === item.id
                  ? 'bg-green-50 border-green-200 shadow-2xl scale-110 !border-green-400 rotate-1 ring-4 ring-green-100 z-10'
                  : ''
              }`}
              onClick={() => setSelectedFile(item)}
              title={`Open file ${item.filename}`}
              draggable={true}
              onDragStart={() => setDraggedFileId(item.id)}
              onDragEnd={() => setDraggedFileId(null)}
              style={{
                opacity: movingFileId === item.id ? 1 : 1,
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 shadow-inner ${
                movingFileId === item.id
                  ? 'bg-green-100 text-green-600'
                  : 'bg-[#163353]/5 text-[#163353] group-hover:bg-[#163353]/10 group-hover:scale-110'
              }`}>
                <FileText className="w-8 h-8" />
              </div>
              <span className={`font-bold text-center truncate w-full text-sm transition-colors duration-500 tracking-tight ${
                movingFileId === item.id ? 'text-green-700' : 'text-gray-900'
              }`}>
                {item.original_filename || item.filename}
              </span>
              <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mt-1">Document</p>

              {/* Status Indicator inside card */}
              <div className="mt-3 flex gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full opacity-30" />
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full opacity-10" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3"
          onDragOver={e => {
            e.preventDefault();
            if (!dragOverFolderId && draggedFileId) {
              if (!dragOverRoot) setDragOverRoot(true);
            }
          }}
          onDragLeave={e => {
            if (!dragOverFolderId && draggedFileId) {
              setDragOverRoot(false);
            }
          }}
          onDrop={e => {
            e.preventDefault();
            if (!dragOverFolderId && draggedFileId) {
              setDragOverRoot(false);
              handleMoveFileToFolder(draggedFileId, null);
              setDraggedFileId(null);
            }
          }}
          style={{ background: dragOverRoot && draggedFileId ? 'rgba(199,27,45,0.05)' : 'transparent', transition: 'background 0.3s ease', borderRadius: '24px', padding: dragOverRoot && draggedFileId ? '16px' : '0' }}
        >
          {/* Folders */}
          {currentFolders.map((item) => (
            <div
              key={item.id}
              className={`group relative bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-100 hover:border-[#FACC15]/30 hover:translate-x-1 ${dragOverFolderId === item.id ? 'ring-4 ring-[#FACC15]/20 border-[#FACC15]' : ''}`}
              onClick={() => setCurrentFolderId(item.id)}
              title={`Open folder ${item.name}`}
              onDragOver={e => {
                e.preventDefault();
                setDragOverFolderId(item.id);
                if (openFolderTimeout.current) clearTimeout(openFolderTimeout.current);
                openFolderTimeout.current = setTimeout(() => {
                  setCurrentFolderId(item.id);
                }, 600);
              }}
              onDragLeave={() => {
                setDragOverFolderId(null);
                if (openFolderTimeout.current) clearTimeout(openFolderTimeout.current);
              }}
              onDrop={e => {
                e.preventDefault();
                setDragOverFolderId(null);
                if (openFolderTimeout.current) clearTimeout(openFolderTimeout.current);
                if (draggedFileId) {
                  handleMoveFileToFolder(draggedFileId, item.id);
                  setDraggedFileId(null);
                }
              }}
            >
              <div className="w-12 h-12 bg-[#FACC15]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <FolderIcon className="w-6 h-6 text-[#EAB308]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-gray-900 font-bold truncate block text-sm sm:text-base tracking-tight">{item.name}</span>
                <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Folder</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative dropdown-container">
                  <button
                    className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="More options"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openDropdownId === item.id && (
                    <div className="absolute right-0 top-10 bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl py-2 z-20 min-w-[140px] animate-in fade-in zoom-in duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          handleOpenRenameFolder(item);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#C71B2D] flex items-center space-x-3 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Rename</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          handleOpenDeleteFolder(item);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-bold text-[#C71B2D] hover:bg-red-50 flex items-center space-x-3 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Documents */}
          {currentDocuments.map((item) => (
            <div
              key={item.id}
              className={`group relative bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-100 hover:border-[#163353]/20 hover:translate-x-1 ${movingFileId === item.id
                ? 'bg-green-50 border-green-200 shadow-lg'
                : ''
                }`}
              onClick={() => setSelectedFile(item)}
              title={`Open file ${item.filename}`}
              draggable={true}
              onDragStart={() => setDraggedFileId(item.id)}
              onDragEnd={() => setDraggedFileId(null)}
              style={{
                opacity: movingFileId === item.id ? 0.9 : 1,
              }}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                movingFileId === item.id
                  ? 'bg-green-100 text-green-600'
                  : 'bg-[#163353]/5 text-[#163353] group-hover:scale-110'
              }`}>
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`font-bold truncate block text-sm sm:text-base tracking-tight transition-colors duration-300 ${
                  movingFileId === item.id ? 'text-green-700' : 'text-gray-900'
                }`}>
                  {item.original_filename || item.filename}
                </span>
                <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Document'}
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  className="p-2 text-gray-400 hover:text-[#163353] hover:bg-gray-50 rounded-xl transition-all"
                  title="View document"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewFile(item.translated_file_url, item.filename || 'document');
                  }}
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-gray-50 rounded-xl transition-all"
                  title="Download document"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const secureUrl = await convertPublicToSecure(item.translated_file_url);
                      const response = await fetch(secureUrl);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = item.filename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Error downloading file:', error);
                      alert('Error downloading file. Please try again.');
                    }
                  }}
                >
                  <Download className="w-5 h-5" />
                </button>
                <div className="relative dropdown-container">
                  <button
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="More options"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openDropdownId === item.id && (
                    <div className="absolute right-0 top-10 bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl py-2 z-20 min-w-[140px] animate-in fade-in zoom-in duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          setIsRenaming(true);
                          setNewFileName(item.filename);
                          setSelectedFile(item); // Set selectedFile for the modal
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#C71B2D] flex items-center space-x-3 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Rename</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          setShowDeleteConfirm(true);
                          setSelectedFile(item); // Set selectedFile for the modal
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-bold text-[#C71B2D] hover:bg-red-50 flex items-center space-x-3 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading state for list view */}
          {docsLoading && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-3 sm:p-4 flex items-center gap-3 sm:gap-4 animate-pulse">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!foldersLoading && !docsLoading && currentFolders.length === 0 && currentDocuments.length === 0 && (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-base sm:text-lg font-medium">No documents or folders</p>
              <p className="text-xs sm:text-sm">Your translated documents will appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  </div>

      {/* File Details Modal */}
      {selectedFile && !showViewer && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4" onClick={() => setSelectedFile(null)}>
          <div 
            className="bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] p-8 w-full max-w-md relative animate-in fade-in zoom-in duration-300"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
              onClick={() => setSelectedFile(null)}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-[#163353]/5 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                <FileText className="w-10 h-10 text-[#163353]" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight">
                {isRenaming ? 'Rename Document' : 'Document Details'}
              </h3>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C71B2D] mb-6">
                Manage your file
              </p>
              
              <div className="w-full space-y-4 mb-8">
                {isRenaming ? (
                  <div className="text-left">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">NEW FILENAME</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-[#163353]/10 focus:border-[#163353] focus:bg-white transition-all font-bold text-gray-900"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">FILENAME</span>
                    </div>
                    <p className="font-bold text-gray-900 break-all">{selectedFile.filename}</p>
                    <div className="mt-4 pt-4 border-t border-gray-200/50">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <span>CREATED AT</span>
                      </div>
                      <p className="font-bold text-gray-700">{selectedFile.created_at ? new Date(selectedFile.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full grid grid-cols-2 gap-4">
                {isRenaming ? (
                  <>
                    <button
                      className="px-6 py-4 bg-[#163353] hover:bg-[#0F233A] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:scale-[1.02] shadow-lg shadow-[#163353]/20"
                      onClick={handleRenameFile}
                    >
                      Save Change
                    </button>
                    <button
                      className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                      onClick={() => setIsRenaming(false)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="px-6 py-4 bg-[#C71B2D] hover:bg-[#A01624] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:scale-[1.02] shadow-lg shadow-[#C71B2D]/20 flex items-center justify-center gap-2"
                      onClick={async () => {
                        try {
                          const secureUrl = await convertPublicToSecure(selectedFile.translated_file_url);
                          const response = await fetch(secureUrl);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = selectedFile.filename;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error('Error downloading file:', error);
                        }
                      }}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      className="px-6 py-4 bg-[#163353] hover:bg-[#0F233A] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:scale-[1.02] shadow-lg shadow-[#163353]/20 flex items-center justify-center gap-2"
                      onClick={() => handleViewFile(selectedFile.translated_file_url, selectedFile.filename)}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </>
                )}
              </div>
              
              {!isRenaming && (
                <div className="w-full mt-4 flex gap-4">
                  <button
                    className="flex-1 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                    onClick={() => {
                      setIsRenaming(true);
                      setNewFileName(selectedFile.filename);
                    }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Rename
                  </button>
                  <button
                    className="flex-1 px-4 py-3 bg-red-50 hover:bg-red-100 text-[#C71B2D] rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedFile && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[60] p-4">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-2xl p-8 w-full max-w-md relative animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner mx-auto">
              <Trash2 className="w-8 h-8 text-[#C71B2D]" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight text-center">Are you sure?</h3>
            <p className="text-gray-500 mb-8 text-center font-medium">
              You're about to delete <span className="text-gray-900 font-bold">"{selectedFile.filename}"</span>. 
              This will remove it from your document list.
            </p>
            <div className="flex gap-4">
              <button
                className="flex-1 px-8 py-5 bg-[#C71B2D] hover:bg-[#A01624] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:scale-[1.02] shadow-lg shadow-[#C71B2D]/20"
                onClick={() => {
                  handleDeleteFile();
                  setShowDeleteConfirm(false);
                }}
              >
                Yes, Delete
              </button>
              <button
                className="flex-1 px-8 py-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                onClick={() => setShowDeleteConfirm(false)}
              >
                No, Keep
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {showRenameFolderModal && selectedFolder && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-2xl p-8 w-full max-w-md relative animate-in fade-in zoom-in duration-300">
            <button
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
              onClick={() => {
                setShowRenameFolderModal(false);
                setSelectedFolder(null);
                setEditingFolderName('');
              }}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-[#FACC15]/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner mx-auto">
              <FolderIcon className="w-8 h-8 text-[#EAB308]" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight text-center">Rename Folder</h3>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#EAB308] mb-6 text-center">Change folder name</p>
            
            <div className="mb-8">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">FOLDER NAME</label>
              <input
                type="text"
                value={editingFolderName}
                onChange={(e) => setEditingFolderName(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-[#FACC15]/10 focus:border-[#EAB308] transition-all font-bold text-gray-900"
                placeholder="Enter new folder name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameFolder();
                  if (e.key === 'Escape') {
                    setShowRenameFolderModal(false);
                    setSelectedFolder(null);
                    setEditingFolderName('');
                  }
                }}
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleRenameFolder}
                className="flex-1 px-8 py-5 bg-[#EAB308] hover:bg-[#CA8A04] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:scale-[1.02] shadow-lg shadow-[#EAB308]/20"
              >
                Rename
              </button>
              <button
                onClick={() => {
                  setShowRenameFolderModal(false);
                  setSelectedFolder(null);
                  setEditingFolderName('');
                }}
                className="flex-1 px-8 py-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Modal */}
      {showDeleteFolderModal && selectedFolder && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[60] p-4">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-2xl p-8 w-full max-w-md relative animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner mx-auto">
              <Trash2 className="w-8 h-8 text-[#C71B2D]" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight text-center">Delete Folder?</h3>
            <p className="text-gray-500 mb-8 text-center font-medium">
              You're deleting <span className="text-gray-900 font-bold">"{selectedFolder.name}"</span>. 
              This will remove the folder and <span className="text-[#C71B2D] font-bold">all documents inside it</span>.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  handleDeleteFolder();
                  setShowDeleteFolderModal(false);
                  setSelectedFolder(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Modal - Removed for desktop focus */}

      {/* Touch Drag Indicator */}
      {/* Removed touch drag indicator */}

      {/* Modal de Visualização de Documento */}
      {showViewer && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-[32px] w-full h-full max-w-6xl flex flex-col overflow-hidden shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-500">
            {/* Header do Viewer */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 bg-[#163353]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-[#163353]" />
                </div>
                <div className="min-w-0">
                  <span className="font-black text-gray-900 truncate block text-sm tracking-tight">
                    {viewingFilename || 'Document Viewer'}
                  </span>
                  <div className="flex gap-2">
                    {viewerType === 'pdf' && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-500">PDF Document</span>
                    )}
                    {viewerType === 'image' && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-green-500">Image Document</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {viewerType === 'image' && viewerUrl && (
                  <div className="hidden sm:flex items-center bg-gray-50 rounded-2xl p-1 gap-1 border border-gray-100 mr-2">
                    <button
                      onClick={handleZoomOut}
                      className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="text-[10px] font-black text-gray-400 min-w-[40px] text-center">{Math.round(imageZoom * 100)}%</span>
                    <button
                      onClick={handleZoomIn}
                      className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1" />
                    <button
                      onClick={handleRotate}
                      className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                      title="Rotate"
                    >
                      <RotateCw className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                )}
                <button
                  onClick={closeViewer}
                  className="p-3 bg-red-50 hover:bg-red-100 text-[#C71B2D] rounded-2xl transition-all flex items-center justify-center"
                  title="Close Viewer"
                >
                  <X className="w-5 h-5 font-black" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Viewer */}
            <div className="flex-1 overflow-auto bg-gray-900/5 flex items-center justify-center p-4 sm:p-8 relative">
              {loadingViewer && (
                <div className="flex flex-col items-center gap-6 animate-pulse">
                  <div className="w-16 h-16 border-4 border-[#C71B2D]/20 border-t-[#C71B2D] rounded-full animate-spin" />
                  <p className="text-[#163353] font-black uppercase tracking-widest text-[10px]">Preparing Document...</p>
                </div>
              )}

              {viewerError && (
                <div className="flex flex-col items-center gap-6 text-center max-w-sm">
                  <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center shadow-inner">
                    <XCircle className="w-10 h-10 text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-900 mb-2">Oops! Something went wrong</h4>
                    <p className="text-gray-500 text-sm font-medium">{viewerError}</p>
                  </div>
                  <button
                    onClick={closeViewer}
                    className="w-full px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all"
                  >
                    Close Viewer
                  </button>
                </div>
              )}

              {!loadingViewer && !viewerError && viewerUrl && viewerType === 'pdf' && (
                <iframe
                  src={viewerUrl}
                  className="w-full h-full border-0 rounded-2xl shadow-2xl bg-white"
                  title="PDF Viewer"
                />
              )}

              {!loadingViewer && !viewerError && viewerUrl && viewerType === 'image' && (
                <div className="w-full h-full overflow-auto flex items-center justify-center bg-gray-100 rounded-2xl shadow-inner border border-gray-200">
                  <img
                    src={viewerUrl}
                    alt="Document"
                    className="max-w-none transition-transform duration-300 ease-out shadow-2xl rounded-sm"
                    style={{
                      transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                      transformOrigin: 'center center'
                    }}
                  />
                </div>
              )}

              {!loadingViewer && !viewerError && viewerUrl && viewerType === 'unknown' && (
                <div className="flex flex-col items-center gap-6 text-center max-w-sm">
                  <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center shadow-inner">
                    <FileText className="w-10 h-10 text-gray-300" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-900 mb-2">Unsupported Format</h4>
                    <p className="text-gray-500 text-sm font-medium mb-1">We can't preview this file type inline yet.</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Please download it to view</p>
                  </div>
                  <button
                    onClick={closeViewer}
                    className="w-full px-8 py-4 bg-[#163353] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#0F233A] transition-all"
                  >
                    Go Back
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}