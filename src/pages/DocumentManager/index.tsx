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
import { useLocation, Navigate } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';

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

const DocumentManager: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" color="blue" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Renderizar dashboard baseado no role do usuário
  if (user.role === 'authenticator') {
    return <AuthenticatorLayout />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Usuário comum - redirecionar para dashboard do cliente
  return <Navigate to="/dashboard" replace />;
};

export default DocumentManager;