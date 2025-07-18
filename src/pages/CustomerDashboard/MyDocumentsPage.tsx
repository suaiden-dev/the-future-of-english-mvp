import React, { useState, useRef, useEffect } from 'react';
import { Folder as FolderIcon, FileText, Plus, MoreVertical, ArrowLeft, Grid, List, Download, Eye, Edit2, Trash2, Move } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useFolders } from '../../hooks/useFolders';
import { useTranslatedDocuments } from '../../hooks/useDocuments';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function MyDocumentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  
  // Estados para funcionalidade mobile de mover
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [itemToMove, setItemToMove] = useState<{id: string, name: string, type: 'file' | 'folder'} | null>(null);
  const [isMobile] = useState(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  // Estados para touch drag and drop
  const [touchDraggedItem, setTouchDraggedItem] = useState<{id: string, type: 'file' | 'folder', element: HTMLElement} | null>(null);
  const [touchDragPosition, setTouchDragPosition] = useState({ x: 0, y: 0 });
  const [touchDragOverTarget, setTouchDragOverTarget] = useState<string | null>(null);
  const [touchDragStartPosition, setTouchDragStartPosition] = useState({ x: 0, y: 0 });

  const { folders, createFolder, updateFolder, deleteFolder, loading: foldersLoading } = useFolders(user?.id);
  const { documents, loading: docsLoading, refetch } = useTranslatedDocuments(user?.id);

  // Cleanup touch drag on unmount
  useEffect(() => {
    return () => {
      if (touchDraggedItem?.element) {
        touchDraggedItem.element.style.opacity = '';
        touchDraggedItem.element.style.transform = '';
        touchDraggedItem.element.style.zIndex = '';
      }
    };
  }, [touchDraggedItem]);

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
      // Atualizar folder_id do arquivo na tabela translated_documents
      const { data, error } = await supabase
        .from('translated_documents')
        .update({ folder_id: folderId })
        .eq('id', fileId)
        .select();
      if (error) throw error;
      await refetch();
      setTimeout(() => setMovingFileId(null), 300); // aguarda fade in
    } catch (err) {
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

  // Função para abrir modal de mover (mobile)
  const handleOpenMoveModal = (item: any, type: 'file' | 'folder') => {
    setItemToMove({
      id: item.id,
      name: type === 'file' ? item.filename : item.name,
      type
    });
    setShowMoveModal(true);
  };

  // Função para mover item via modal (mobile)
  const handleMoveItem = async (targetFolderId: string | null) => {
    if (!itemToMove) return;

    try {
      if (itemToMove.type === 'file') {
        await handleMoveFileToFolder(itemToMove.id, targetFolderId);
      } else {
        await handleMoveFolderToFolder(itemToMove.id, targetFolderId);
      }
      
      setShowMoveModal(false);
      setItemToMove(null);
    } catch (err) {
      console.error('Erro ao mover item:', err);
    }
  };

  // Função para obter todas as pastas disponíveis para mover (excluindo a pasta atual e suas subpastas)
  const getAvailableFoldersForMove = () => {
    if (!itemToMove) return [];
    
    const excludeIds = new Set<string>();
    
    // Se estiver movendo uma pasta, excluir ela mesma e todas as suas subpastas
    if (itemToMove.type === 'folder') {
      const addSubfolders = (folderId: string) => {
        excludeIds.add(folderId);
        folders.forEach(f => {
          if (f.parent_id === folderId) {
            addSubfolders(f.id);
          }
        });
      };
      addSubfolders(itemToMove.id);
    }
    
    return folders.filter(f => !excludeIds.has(f.id));
  };

  // Funções para touch drag and drop
  const handleTouchStart = (e: React.TouchEvent, item: any, type: 'file' | 'folder') => {
    if (!isMobile) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    
    setTouchDraggedItem({
      id: item.id,
      type,
      element: e.currentTarget as HTMLElement
    });
    setTouchDragStartPosition({ x: touch.clientX, y: touch.clientY });
    setTouchDragPosition({ x: touch.clientX, y: touch.clientY });
    
    // Adicionar classe de visualização
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '0.5';
    element.style.transform = 'scale(1.05)';
    element.style.zIndex = '1000';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !touchDraggedItem) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    setTouchDragPosition({ x: touch.clientX, y: touch.clientY });
    
    // Verificar se está sobre um alvo válido
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    if (elementBelow) {
      const targetId = elementBelow.getAttribute('data-folder-id') || 
                      (elementBelow.closest('[data-folder-id]') as HTMLElement)?.getAttribute('data-folder-id');
      
      if (targetId && targetId !== touchDraggedItem.id) {
        setTouchDragOverTarget(targetId);
      } else {
        setTouchDragOverTarget(null);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !touchDraggedItem) return;
    
    e.preventDefault();
    
    // Restaurar elemento original
    if (touchDraggedItem.element) {
      touchDraggedItem.element.style.opacity = '';
      touchDraggedItem.element.style.transform = '';
      touchDraggedItem.element.style.zIndex = '';
    }
    
    // Executar a ação de mover se houver um alvo válido
    if (touchDragOverTarget) {
      if (touchDraggedItem.type === 'file') {
        handleMoveFileToFolder(touchDraggedItem.id, touchDragOverTarget);
      } else {
        handleMoveFolderToFolder(touchDraggedItem.id, touchDragOverTarget);
      }
    }
    
    // Limpar estados
    setTouchDraggedItem(null);
    setTouchDragPosition({ x: 0, y: 0 });
    setTouchDragOverTarget(null);
    setTouchDragStartPosition({ x: 0, y: 0 });
  };

  const handleTouchCancel = () => {
    if (!isMobile || !touchDraggedItem) return;
    
    // Restaurar elemento original
    if (touchDraggedItem.element) {
      touchDraggedItem.element.style.opacity = '';
      touchDraggedItem.element.style.transform = '';
      touchDraggedItem.element.style.zIndex = '';
    }
    
    // Limpar estados
    setTouchDraggedItem(null);
    setTouchDragPosition({ x: 0, y: 0 });
    setTouchDragOverTarget(null);
    setTouchDragStartPosition({ x: 0, y: 0 });
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
    <div className="max-w-5xl mx-auto mt-4 sm:mt-10 bg-white rounded-xl shadow p-4 sm:p-8 min-h-[70vh]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          {currentFolderId && (
            <button onClick={handleGoBack} className="p-2 rounded hover:bg-gray-100" title="Go back">
              <ArrowLeft className="w-5 h-5" />
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
                    className={`px-1 sm:px-2 py-1 rounded transition-colors duration-150 ${dragOverBreadcrumb === (crumb.id ?? 'root') ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-400' : 'text-gray-900'} ${idx === collapsedBreadcrumb.length - 1 ? 'font-bold' : 'cursor-pointer hover:bg-gray-100'}`}
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
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm sm:text-base"
            onClick={() => setShowNewFolder(true)}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> 
            <span className="hidden sm:inline">New Folder</span>
            <span className="sm:hidden">Folder</span>
          </button>
        </div>
      </div>

      {/* Instructions and Features */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
        <h3 className="text-xs sm:text-sm font-semibold text-blue-900 mb-2">📁 My Documents - Features & Instructions</h3>
        <div className="text-xs sm:text-sm text-blue-800 space-y-1">
          <p><strong>• Organize:</strong> Create folders to organize your translated documents</p>
          <p><strong>• Drag & Drop:</strong> Drag files between folders or to the root level</p>
          <p><strong>• Manage:</strong> Hover over folders to see options (rename/delete)</p>
          <p><strong>• View:</strong> Click on documents to view details and download</p>
          <p><strong>• Navigate:</strong> Use breadcrumbs to move between folders</p>
          <p><strong>• Search:</strong> Use the search bar to find specific documents</p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              viewMode === 'grid' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              viewMode === 'list' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setViewMode('list')}
          >
            <List className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {showNewFolder && (
        <form onSubmit={handleCreateFolder} className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <input
            type="text"
            className="border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1"
            placeholder="Folder name"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 w-full sm:w-auto">
            <button type="submit" className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">Create</button>
            <button type="button" className="flex-1 sm:flex-none text-gray-500 px-3 py-2 text-sm" onClick={() => setShowNewFolder(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6"
        onDragOver={e => {
          // Só ativa se estiver arrastando e não sobre uma pasta
          if (!isMobile && !dragOverFolderId && draggedFileId) {
            e.preventDefault();
            if (!dragOverRoot) setDragOverRoot(true);
          }
        }}
        onDragLeave={e => {
          if (!isMobile && !dragOverFolderId && draggedFileId) {
            setDragOverRoot(false);
          }
        }}
        onDrop={e => {
          if (!isMobile && !dragOverFolderId && draggedFileId) {
            e.preventDefault();
            setDragOverRoot(false);
            handleMoveFileToFolder(draggedFileId, null);
            setDraggedFileId(null);
          }
        }}
        style={{ minHeight: 120, background: dragOverRoot && draggedFileId ? '#e0f2fe' : '#fff', transition: 'background 0.2s' }}
      >
        {foldersLoading && <span>Loading folders...</span>}
        {currentFolders.map((item) => (
          <div
            key={item.id}
            className={`group relative bg-gray-50 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center shadow hover:shadow-md transition cursor-pointer border border-gray-100 hover:border-blue-400 ${dragOverFolderId === item.id ? 'ring-2 ring-blue-400' : ''}`}
            onClick={() => setCurrentFolderId(item.id)}
            title={`Open folder ${item.name}`}
            onDragOver={e => {
              if (!isMobile) {
                e.preventDefault();
                setDragOverFolderId(item.id);
                // Inicia um timer para abrir a pasta após 400ms
                if (openFolderTimeout.current) clearTimeout(openFolderTimeout.current);
                openFolderTimeout.current = setTimeout(() => {
                  setCurrentFolderId(item.id);
                }, 400);
              }
            }}
            onDragLeave={() => {
              if (!isMobile) {
                setDragOverFolderId(null);
                if (openFolderTimeout.current) clearTimeout(openFolderTimeout.current);
              }
            }}
            onDrop={e => {
              if (!isMobile) {
                e.preventDefault();
                setDragOverFolderId(null);
                if (openFolderTimeout.current) clearTimeout(openFolderTimeout.current);
                if (draggedFileId) {
                  handleMoveFileToFolder(draggedFileId, item.id);
                  setDraggedFileId(null);
                }
              }
            }}
          >
            <FolderIcon className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-gray-800 font-medium text-center truncate w-full text-sm sm:text-base">{item.name}</span>
            <div className="absolute top-2 right-2">
              <div className="relative dropdown-container">
                <button 
                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-opacity opacity-0 group-hover:opacity-100"
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
                  <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                    {isMobile && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          handleOpenMoveModal(item, 'folder');
                        }}
                        className="w-full px-3 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Move className="w-3 h-3" />
                        <span>Move</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(null);
                        handleOpenRenameFolder(item);
                      }}
                      className="w-full px-3 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Rename</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(null);
                        handleOpenDeleteFolder(item);
                      }}
                      className="w-full px-3 py-1 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {docsLoading && (
          <div className="col-span-1 sm:col-span-2 md:col-span-4 flex gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl p-4 flex-1 min-h-[90px] animate-pulse" />
            ))}
          </div>
        )}
        {currentDocuments.map((item) => (
          movingFileId === item.id ? (
            <div
              key={item.id}
              className="group relative bg-gray-100 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center shadow animate-pulse border border-gray-100"
              style={{ minHeight: 90, minWidth: 90, opacity: 0.5 }}
            />
          ) : (
            <div
              key={item.id}
              className="group relative bg-gray-50 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center shadow hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-400"
              onClick={() => setSelectedFile(item)}
              title={`Open file ${item.filename}`}
              draggable={!isMobile}
              onDragStart={() => {
                if (!isMobile) setDraggedFileId(item.id);
              }}
              onDragEnd={() => {
                if (!isMobile) setDraggedFileId(null);
              }}
              style={{ opacity: movingFileId ? 0.5 : 1, transition: 'opacity 0.3s' }}
            >
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-gray-800 font-medium text-center truncate w-full text-sm sm:text-base">{item.filename}</span>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="relative">
                  <button 
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    aria-label="More options"
                    title="More options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px] opacity-0 group-hover:opacity-100">
                    {isMobile && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenMoveModal(item, 'file');
                        }}
                        className="w-full px-3 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Move className="w-3 h-3" />
                        <span>Move</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        ))}
      </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-2"
          onDragOver={e => {
            if (!dragOverFolderId && draggedFileId) {
              e.preventDefault();
              if (!dragOverRoot) setDragOverRoot(true);
            }
          }}
          onDragLeave={e => {
            if (!dragOverFolderId && draggedFileId) {
              setDragOverRoot(false);
            }
          }}
          onDrop={e => {
            if (!dragOverFolderId && draggedFileId) {
              e.preventDefault();
              setDragOverRoot(false);
              handleMoveFileToFolder(draggedFileId, null);
              setDraggedFileId(null);
            }
          }}
          style={{ background: dragOverRoot && draggedFileId ? '#e0f2fe' : 'transparent', transition: 'background 0.2s', borderRadius: '8px', padding: dragOverRoot && draggedFileId ? '16px' : '0' }}
        >
          {/* Folders */}
          {currentFolders.map((item) => (
            <div
              key={item.id}
              className={`group relative bg-gray-50 rounded-lg p-3 sm:p-4 flex items-center gap-3 sm:gap-4 shadow hover:shadow-md transition cursor-pointer border border-gray-100 hover:border-blue-400 ${dragOverFolderId === item.id ? 'ring-2 ring-blue-400' : ''} ${touchDragOverTarget === item.id ? 'ring-2 ring-green-400 bg-green-50' : ''}`}
              onClick={() => setCurrentFolderId(item.id)}
              title={`Open folder ${item.name}`}
              data-folder-id={item.id}
              onTouchStart={(e) => handleTouchStart(e, item, 'folder')}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
              onDragOver={e => {
                if (!isMobile) {
                  e.preventDefault();
                  setDragOverFolderId(item.id);
                  // Inicia um timer para abrir a pasta após 400ms
                  if (openFolderTimeout.current) clearTimeout(openFolderTimeout.current);
                  openFolderTimeout.current = setTimeout(() => {
                    setCurrentFolderId(item.id);
                  }, 400);
                }
              }}
              onDragLeave={() => {
                if (!isMobile) {
                  setDragOverFolderId(null);
                  if (openFolderTimeout.current) clearTimeout(openFolderTimeout.current);
                }
              }}
              onDrop={e => {
                if (!isMobile) {
                  e.preventDefault();
                  setDragOverFolderId(null);
                  if (openFolderTimeout.current) clearTimeout(openFolderTimeout.current);
                  if (draggedFileId) {
                    handleMoveFileToFolder(draggedFileId, item.id);
                    setDraggedFileId(null);
                  }
                }
              }}
            >
              <FolderIcon className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-gray-800 font-medium truncate block text-sm sm:text-base">{item.name}</span>
                <span className="text-xs sm:text-sm text-gray-500">Folder</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {isMobile && (
                  <button 
                    className="text-gray-400 hover:text-blue-600 p-2 rounded-full transition-colors" 
                    title="Move folder"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenMoveModal(item, 'folder');
                    }}
                  >
                    <Move className="w-4 h-4" />
                  </button>
                )}
                <div className="relative dropdown-container">
                  <button 
                    className="text-gray-400 hover:text-gray-700 p-1 rounded-full" 
                    title="More options"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openDropdownId === item.id && (
                    <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                      {isMobile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(null);
                            handleOpenMoveModal(item, 'folder');
                          }}
                          className="w-full px-3 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <Move className="w-3 h-3" />
                          <span>Move</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          handleOpenRenameFolder(item);
                        }}
                        className="w-full px-3 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Rename</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          handleOpenDeleteFolder(item);
                        }}
                        className="w-full px-3 py-1 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <Trash2 className="w-3 h-3" />
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
            movingFileId === item.id ? (
              <div
                key={item.id}
                className="bg-gray-100 rounded-lg p-3 sm:p-4 flex items-center gap-3 sm:gap-4 animate-pulse border border-gray-100"
                style={{ opacity: 0.5 }}
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ) : (
              <div
                key={item.id}
                className="group relative bg-gray-50 rounded-lg p-3 sm:p-4 flex items-center gap-3 sm:gap-4 shadow hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-400"
                onClick={() => setSelectedFile(item)}
                title={`Open file ${item.filename}`}
                draggable={!isMobile}
                onTouchStart={(e) => handleTouchStart(e, item, 'file')}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
                onDragStart={() => {
                  if (!isMobile) setDraggedFileId(item.id);
                }}
                onDragEnd={() => {
                  if (!isMobile) setDraggedFileId(null);
                }}
                style={{ opacity: movingFileId ? 0.5 : 1, transition: 'opacity 0.3s' }}
              >
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-gray-800 font-medium truncate block text-sm sm:text-base">{item.filename}</span>
                  <span className="text-xs sm:text-sm text-gray-500">
                    {item.created_at ? formatDate(item.created_at) : 'Unknown date'}
                  </span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button 
                    className="text-gray-400 hover:text-blue-600 p-2 rounded-full transition-colors" 
                    title="View document"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(item.translated_file_url, '_blank');
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    className="text-gray-400 hover:text-green-600 p-2 rounded-full transition-colors" 
                    title="Download document"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const response = await fetch(item.translated_file_url);
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
                    <Download className="w-4 h-4" />
                  </button>
                  {isMobile && (
                    <button 
                      className="text-gray-400 hover:text-blue-600 p-2 rounded-full transition-colors" 
                      title="Move file"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenMoveModal(item, 'file');
                      }}
                    >
                      <Move className="w-4 h-4" />
                    </button>
                  )}
                  <button className="text-gray-400 hover:text-gray-700 p-2 rounded-full" title="More options">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
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

      {/* Preview/Details Modal */}
      {selectedFile && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 w-full max-w-md sm:min-w-[400px] relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
              onClick={() => setSelectedFile(null)}
              aria-label="Close modal"
            >
              ×
            </button>
            <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-gray-900">File Details</h3>
            <div className="space-y-3 mb-4 sm:mb-6">
              <div>
                <span className="font-medium text-gray-700 text-sm sm:text-base">Name:</span> 
                {isRenaming ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter new file name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameFile();
                        } else if (e.key === 'Escape') {
                          handleCancelRename();
                        }
                      }}
                    />
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleRenameFile}
                        className="flex-1 sm:flex-none px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelRename}
                        className="flex-1 sm:flex-none px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="ml-2 text-gray-900 text-sm sm:text-base">{selectedFile.filename}</span>
                )}
              </div>
              <div>
                <span className="font-medium text-gray-700 text-sm sm:text-base">Type:</span> 
                <span className="ml-2 text-gray-900 text-sm sm:text-base">
                  {selectedFile.filename?.split('.').pop()?.toUpperCase() || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 text-sm sm:text-base">Created:</span> 
                <span className="ml-2 text-gray-900 text-sm sm:text-base">
                  {selectedFile.created_at ? formatDate(selectedFile.created_at) : 'Unknown date'}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button 
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                onClick={() => {
                  window.open(selectedFile.translated_file_url, '_blank');
                }}
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <button 
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
                onClick={async () => {
                  try {
                    const response = await fetch(selectedFile.translated_file_url);
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
                    alert('Error downloading file. Please try again.');
                  }
                }}
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3">
              <button 
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                onClick={() => {
                  setIsRenaming(true);
                  setNewFileName(selectedFile.filename);
                }}
                disabled={isRenaming}
              >
                Rename
              </button>
              <button 
                className="flex-1 px-4 py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors text-sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedFile && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 w-full max-w-md sm:min-w-[400px] relative animate-fade-in">
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">Confirm Delete</h3>
            <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base">
              Are you sure you want to delete <strong>"{selectedFile.filename}"</strong>? 
              This action will remove the file from your documents list, but the file will remain in our system.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button 
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
                onClick={() => {
                  handleDeleteFile();
                  setShowDeleteConfirm(false);
                }}
              >
                Delete
              </button>
              <button 
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {showRenameFolderModal && selectedFolder && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 w-full max-w-md sm:min-w-[400px] relative animate-fade-in">
            <button
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
              onClick={() => {
                setShowRenameFolderModal(false);
                setSelectedFolder(null);
                setEditingFolderName('');
              }}
              aria-label="Close modal"
            >
              ×
            </button>
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">Rename Folder</h3>
            <div className="mb-4 sm:mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name
              </label>
              <input
                type="text"
                value={editingFolderName}
                onChange={(e) => setEditingFolderName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Enter new folder name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameFolder();
                  } else if (e.key === 'Escape') {
                    setShowRenameFolderModal(false);
                    setSelectedFolder(null);
                    setEditingFolderName('');
                  }
                }}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleRenameFolder}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
              >
                Rename
              </button>
              <button
                onClick={() => {
                  setShowRenameFolderModal(false);
                  setSelectedFolder(null);
                  setEditingFolderName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Modal */}
      {showDeleteFolderModal && selectedFolder && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 w-full max-w-md sm:min-w-[400px] relative animate-fade-in">
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">Confirm Delete</h3>
            <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base">
              Are you sure you want to delete the folder <strong>"{selectedFolder.name}"</strong>? 
              This action cannot be undone and will remove the folder and all its contents.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => {
                  handleDeleteFolder();
                  setShowDeleteFolderModal(false);
                  setSelectedFolder(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
              >
                Delete
              </button>
              <button
                onClick={() => {
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

      {/* Move Modal */}
      {showMoveModal && itemToMove && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 w-full max-w-md sm:min-w-[400px] relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
              onClick={() => {
                setShowMoveModal(false);
                setItemToMove(null);
              }}
              aria-label="Close modal"
            >
              ×
            </button>
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">Move {itemToMove.type === 'file' ? 'File' : 'Folder'}</h3>
            <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base">
              Select where you want to move <strong>"{itemToMove.name}"</strong>:
            </p>
            
            <div className="space-y-2 mb-4 sm:mb-6">
              {/* Option to move to root */}
              <button
                onClick={() => handleMoveItem(null)}
                className="w-full p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FolderIcon className="w-6 h-6 text-gray-500" />
                  <div>
                    <span className="font-medium text-gray-900 text-sm sm:text-base">Root Level</span>
                    <p className="text-xs sm:text-sm text-gray-500">Move to main documents folder</p>
                  </div>
                </div>
              </button>

              {/* Available folders */}
              {getAvailableFoldersForMove().map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleMoveItem(folder.id)}
                  className="w-full p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FolderIcon className="w-6 h-6 text-yellow-500" />
                    <div>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">{folder.name}</span>
                      <p className="text-xs sm:text-sm text-gray-500">Move to this folder</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {getAvailableFoldersForMove().length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">No other folders available to move to.</p>
              </div>
            )}

            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setItemToMove(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Touch Drag Indicator */}
      {isMobile && touchDraggedItem && (
        <div 
          className="fixed pointer-events-none z-[9999] bg-white rounded-lg shadow-lg border-2 border-blue-400 p-2 opacity-80"
          style={{
            left: touchDragPosition.x - 30,
            top: touchDragPosition.y - 30,
            transform: 'translate(-50%, -50%)',
            transition: 'none'
          }}
        >
          <div className="flex items-center gap-2">
            {touchDraggedItem.type === 'file' ? (
              <FileText className="w-4 h-4 text-blue-500" />
            ) : (
              <FolderIcon className="w-4 h-4 text-yellow-500" />
            )}
            <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">
              {touchDraggedItem.type === 'file' 
                ? currentDocuments.find(d => d.id === touchDraggedItem.id)?.filename || 'File'
                : currentFolders.find(f => f.id === touchDraggedItem.id)?.name || 'Folder'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 