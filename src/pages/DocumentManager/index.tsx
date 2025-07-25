import React, { useState } from 'react';
import { 
  Folder as FolderIcon, 
  FileText, 
  Plus, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Upload,
  ArrowLeft,
  Search,
  Grid,
  List,
  Download,
  Eye,
  Copy
} from 'lucide-react';
import { Document, Folder } from '../../App';
import { getStatusColor, getStatusIcon } from '../../utils/documentUtils';
import AuthenticatorLayout from './AuthenticatorLayout';
import { useAuth } from '../../hooks/useAuth';

interface DocumentManagerProps {
  user: { id: string } | null;
  documents: Document[];
  folders: Folder[];
  onDocumentUpload: (document: Document) => void;
  onFolderCreate: (folder: Folder) => void;
  onFolderUpdate: (folderId: string, updates: Partial<Folder>) => void;
  onFolderDelete: (folderId: string) => void;
  onViewDocument: (document: Document) => void;
}

export default function DocumentManagerPage() {
  const { user, loading } = useAuth();

  console.log('[DocumentManager] Usuário logado:', user);
  console.log('[DocumentManager] Role do usuário:', user?.role);
  console.log('[DocumentManager] Loading:', loading);
  
  if (loading) return <div>Carregando...</div>;
  if (!user) return <div>Você precisa estar logado para acessar esta página.</div>;

  if (user.role === 'authenticator' || user.role === 'admin') {
    console.log('[DocumentManager] Exibindo dashboard do autenticador para role:', user.role);
    return <AuthenticatorLayout />;
  }

  console.log('[DocumentManager] Exibindo dashboard do cliente para role:', user.role);
  // Dashboard padrão do cliente
  // ... aqui você pode importar e renderizar o dashboard do cliente, se existir ...
  return <div>Dashboard do cliente (em construção)</div>;
}

export function DocumentManager({
  user,
  documents,
  folders,
  onDocumentUpload,
  onFolderCreate,
  onFolderUpdate,
  onFolderDelete,
  onViewDocument
}: DocumentManagerProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  const folderColors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-purple-100 text-purple-800',
    'bg-red-100 text-red-800',
    'bg-yellow-100 text-yellow-800',
    'bg-indigo-100 text-indigo-800'
  ];

  const currentFolders = folders.filter(folder => folder.parent_id === currentFolderId);
  const currentDocuments = documents.filter(doc => doc.folder_id === currentFolderId);
  
  const filteredFolders = currentFolders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredDocuments = currentDocuments.filter(doc =>
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCurrentPath = () => {
    const path = [];
    let currentId = currentFolderId;
    
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parent_id || null;
      } else {
        break;
      }
    }
    
    return path;
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || !user) return;

    const newFolder: Folder = {
      id: Date.now().toString(),
      user_id: user.id,
      name: newFolderName.trim(),
      parent_id: currentFolderId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), // Adicionado para corrigir o erro
      color: folderColors[Math.floor(Math.random() * folderColors.length)]
    };

    onFolderCreate(newFolder);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleEditFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setEditingFolderId(folderId);
      setEditingFolderName(folder.name);
    }
  };

  const handleSaveEdit = () => {
    if (!editingFolderName.trim()) return;

    onFolderUpdate(editingFolderId!, { name: editingFolderName.trim() });
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const handleDeleteFolder = (folderId: string) => {
    if (window.confirm('Are you sure you want to delete this folder? This action cannot be undone.')) {
      onFolderDelete(folderId);
    }
  };

  const handleUploadDocument = () => {
    // setShowUploadModal(true); // This line was removed as per the edit hint
  };

  // const handleDocumentUploadComplete = (document: Document) => { // This function was removed as per the edit hint
  //   // Add the current folder ID to the document
  //   const documentWithFolder = {
  //     ...document,
  //     folderId: currentFolderId
  //   };
  //   onDocumentUpload(documentWithFolder);
  //   setShowUploadModal(false);
  // };

  const copyVerificationCode = (code: string) => {
    navigator.clipboard.writeText(code);
    // You could add a toast notification here
  };

  const breadcrumbs = getCurrentPath();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                <button
                  onClick={() => setCurrentFolderId(null)}
                  className="hover:text-blue-600 transition-colors"
                >
                  Home
                </button>
                {breadcrumbs.map((folder, index) => (
                  <React.Fragment key={folder.id}>
                    <span>/</span>
                    <button
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {folder.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Folder</span>
              </button>
              <button 
                onClick={handleUploadDocument}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
            </div>
          </div>

          {/* Search and View Controls */}
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents and folders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-80"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Back Button */}
        {currentFolderId && (
          <div className="mb-4">
            <button
              onClick={() => {
                const currentFolder = folders.find(f => f.id === currentFolderId);
                setCurrentFolderId(currentFolder?.parent_id || null);
              }}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {viewMode === 'grid' ? (
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Create Folder Card */}
                {isCreatingFolder && (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center space-y-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Folder name"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                    <div className="flex space-x-1">
                      <button
                        onClick={handleCreateFolder}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingFolder(false);
                          setNewFolderName('');
                        }}
                        className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Folders */}
                {filteredFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    {editingFolderId === folder.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          autoFocus
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                        />
                        <div className="flex space-x-1">
                          <button
                            onClick={handleSaveEdit}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingFolderId(null);
                              setEditingFolderName('');
                            }}
                            className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          onClick={() => setCurrentFolderId(folder.id)}
                          className="flex flex-col items-center space-y-2"
                        >
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${folder.color || 'bg-blue-100 text-blue-800'}`}>
                            <FolderIcon className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-medium text-gray-900 text-center truncate w-full">
                            {folder.name}
                          </span>
                        </div>
                        
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="relative">
                            <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px] opacity-0 group-hover:opacity-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditFolder(folder.id);
                                }}
                                className="w-full px-3 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Rename</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFolder(folder.id);
                                }}
                                className="w-full px-3 py-1 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* Documents */}
                {filteredDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-gray-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 text-center truncate w-full">
                        {document.filename}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(document.status)}`}>
                        {getStatusIcon(document.status)}
                        <span className="ml-1 capitalize">{document.status}</span>
                      </span>
                    </div>
                    
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => onViewDocument(document)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          title="View Details"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        {document.status === 'completed' && (
                          <button
                            className="p-1 text-gray-400 hover:text-green-600 rounded"
                            title="Download"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {document.verification_code && (
                      <div className="absolute bottom-2 left-2 right-2 bg-gray-50 rounded p-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-gray-600 truncate">
                            {document.verification_code}
                          </span>
                          <button
                            onClick={() => copyVerificationCode(document.verification_code!)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Copy Code"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modified
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFolders.map((folder) => (
                    <tr key={folder.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded flex items-center justify-center mr-3 ${folder.color || 'bg-blue-100 text-blue-800'}`}>
                            <FolderIcon className="w-4 h-4" />
                          </div>
                          <button
                            onClick={() => setCurrentFolderId(folder.id)}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                          >
                            {folder.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Folder
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(folder.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">-</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditFolder(folder.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFolder(folder.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDocuments.map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center mr-3">
                            <FileText className="w-4 h-4 text-gray-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{document.filename}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Document
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(document.upload_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(document.status)}`}>
                          {getStatusIcon(document.status)}
                          <span className="ml-1 capitalize">{document.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => onViewDocument(document)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {document.status === 'completed' && (
                            <button className="text-green-600 hover:text-green-800">
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredFolders.length === 0 && filteredDocuments.length === 0 && (
            <div className="p-12 text-center">
              <FolderIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No results found' : 'This folder is empty'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Create a new folder or upload documents to get started'
                }
              </p>
              {!searchTerm && (
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setIsCreatingFolder(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Folder</span>
                  </button>
                  <button
                    onClick={handleUploadDocument}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Document</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}