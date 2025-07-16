import React, { useState, useRef } from 'react';
import { Folder as FolderIcon, FileText, Plus, Upload as UploadIcon, MoreVertical, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useFolders } from '../../hooks/useFolders';
import { useTranslatedDocuments } from '../../hooks/useDocuments';
import { Tooltip } from 'react-tooltip';
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { folders, createFolder, loading: foldersLoading } = useFolders(user?.id);
  const { documents, loading: docsLoading, refetch } = useTranslatedDocuments(user?.id);

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
      const { data, error } = await window.supabase
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

  async function handlePersonalUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`${user.id}/${Date.now()}_${file.name}`, file, { upsert: true });
      if (uploadError) throw uploadError;
      const filePath = uploadData?.path;
      const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;
      // Inserir na tabela documents
      const { error: insertError } = await supabase.from('documents').insert({
        user_id: user.id,
        filename: file.name,
        file_url: publicUrl,
        pages: 1,
        status: 'pending',
        total_cost: 0
      });
      if (insertError) throw insertError;
      if (typeof refetch === 'function') await refetch();
    } catch (err) {
      alert('Error uploading document: ' + (err as any).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Função para montar o caminho (breadcrumb) até a pasta atual
  function getBreadcrumbPath() {
    const path: { id: string | null, name: string }[] = [];
    let folder = folders.find(f => f.id === currentFolderId) || null;
    while (folder) {
      path.unshift({ id: folder.id, name: folder.name });
      folder = folders.find(f => f.id === folder.parent_id) || null;
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

  return (
    <div className="max-w-5xl mx-auto mt-10 bg-white rounded-xl shadow p-8 min-h-[70vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2 min-w-0">
          {currentFolderId && (
            <button onClick={handleGoBack} className="p-2 rounded hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <nav className="flex items-center gap-1 text-lg font-medium min-w-0 overflow-x-auto whitespace-nowrap">
            {collapsedBreadcrumb.map((crumb, idx) => (
              <React.Fragment key={crumb.id ?? `crumb-${idx}`}>
                {crumb.isEllipsis ? (
                  <div
                    className="px-2 py-1 rounded text-gray-500 cursor-default"
                    title={crumb.tooltip}
                    style={{ display: 'inline-block', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    ...
                  </div>
                ) : (
                  <div
                    className={`px-2 py-1 rounded transition-colors duration-150 ${dragOverBreadcrumb === (crumb.id ?? 'root') ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-400' : 'text-gray-900'} ${idx === collapsedBreadcrumb.length - 1 ? 'font-bold' : 'cursor-pointer hover:bg-gray-100'}`}
                    style={{ display: 'inline-block', maxWidth: collapsedBreadcrumb.length > 4 ? 120 : 'none', overflow: collapsedBreadcrumb.length > 4 ? 'hidden' : 'visible', textOverflow: collapsedBreadcrumb.length > 4 ? 'ellipsis' : 'clip' }}
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
                {idx < collapsedBreadcrumb.length - 1 && <span className="mx-1 text-gray-400">&gt;</span>}
              </React.Fragment>
            ))}
          </nav>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handlePersonalUpload}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt"
          />
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Upload personal document"
          >
            <UploadIcon className="w-5 h-5" /> {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            onClick={() => setShowNewFolder(true)}
          >
            <Plus className="w-5 h-5" /> New Folder
          </button>
        </div>
      </div>
      {showNewFolder && (
        <form onSubmit={handleCreateFolder} className="mb-6 flex gap-2 items-center">
          <input
            type="text"
            className="border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Folder name"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            autoFocus
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">Create</button>
          <button type="button" className="text-gray-500 px-3 py-2" onClick={() => setShowNewFolder(false)}>Cancel</button>
        </form>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6"
        onDragOver={e => {
          // Só ativa se estiver arrastando e não sobre uma pasta
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
        style={{ minHeight: 120, background: dragOverRoot && draggedFileId ? '#e0f2fe' : '#fff', transition: 'background 0.2s' }}
      >
        {foldersLoading && <span>Loading folders...</span>}
        {currentFolders.map((item) => (
          <div
            key={item.id}
            className={`group relative bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center shadow hover:shadow-md transition cursor-pointer border border-gray-100 hover:border-blue-400 ${dragOverFolderId === item.id ? 'ring-2 ring-blue-400' : ''}`}
            onClick={() => setCurrentFolderId(item.id)}
            title={`Open folder ${item.name}`}
            onDragOver={e => {
              e.preventDefault();
              setDragOverFolderId(item.id);
              // Inicia um timer para abrir a pasta após 400ms
              if (openFolderTimeout.current) clearTimeout(openFolderTimeout.current);
              openFolderTimeout.current = setTimeout(() => {
                setCurrentFolderId(item.id);
              }, 400);
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
            <FolderIcon className="w-10 h-10 text-yellow-500 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-gray-800 font-medium text-center truncate w-full">{item.name}</span>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 p-1 rounded-full" title="More options">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        ))}
        {docsLoading && (
          <div className="col-span-2 md:col-span-4 flex gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl p-4 flex-1 min-h-[90px] animate-pulse" />
            ))}
          </div>
        )}
        {currentDocuments.map((item) => (
          movingFileId === item.id ? (
            <div
              key={item.id}
              className="group relative bg-gray-100 rounded-xl p-4 flex flex-col items-center justify-center shadow animate-pulse border border-gray-100"
              style={{ minHeight: 90, minWidth: 90, opacity: 0.5 }}
            />
          ) : (
            <div
              key={item.id}
              className="group relative bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center shadow hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-400"
              onClick={() => setSelectedFile(item)}
              title={`Open file ${item.filename}`}
              draggable
              onDragStart={() => setDraggedFileId(item.id)}
              onDragEnd={() => setDraggedFileId(null)}
              style={{ opacity: movingFileId ? 0.5 : 1, transition: 'opacity 0.3s' }}
            >
              <FileText className="w-10 h-10 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-gray-800 font-medium text-center truncate w-full">{item.filename}</span>
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 p-1 rounded-full" title="More options">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          )
        ))}
      </div>
      {/* Preview/Details Modal (mock) */}
      {selectedFile && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 min-w-[320px] relative animate-fade-in">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setSelectedFile(null)}
              aria-label="Close modal"
            >
              ×
            </button>
            <h3 className="text-xl font-bold mb-4 text-gray-900">File Details</h3>
            <div className="mb-2">
              <span className="font-medium text-gray-700">Name:</span> {selectedFile.filename}
            </div>
            <div className="mb-2">
              <span className="font-medium text-gray-700">Type:</span> File
            </div>
            <div className="mb-2">
              <span className="font-medium text-gray-700">URL:</span> <a href={selectedFile.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Open</a>
            </div>
            <div className="mt-6 flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Download</button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">Rename</button>
              <button className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 