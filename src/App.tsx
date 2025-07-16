import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useDocuments, useAllDocuments } from './hooks/useDocuments';
import { useFolders } from './hooks/useFolders';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Home } from './pages/Home';
import { Translations } from './pages/Translations';
import { AdminDashboard } from './pages/AdminDashboard';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { DocumentVerification } from './pages/DocumentVerification';
import Login from './pages/Login';
import { Register } from './pages/Register';
import { DocumentManager } from './pages/DocumentManager';
import { Home as HomeIcon, FileText, Search, User as UserIcon, Shield, LogIn, UserPlus, LogOut, Upload as UploadIcon } from 'lucide-react';

import { Page } from './types/Page';
import { Database } from './lib/database.types';
import type { User as UserType } from './hooks/useAuth';
import Upload from './pages/CustomerDashboard/Upload';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AuthRedirect from './components/AuthRedirect';
import DocumentManagerPage from './pages/DocumentManager';
import AuthenticatorDashboard from './pages/DocumentManager/AuthenticatorDashboard';

type Document = Database['public']['Tables']['documents']['Row'];
type Folder = Database['public']['Tables']['folders']['Row'];
type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
type FolderInsert = Database['public']['Tables']['folders']['Insert'];

export type { UserType, Document, Folder };

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  
  // Auth hook
  const { user, loading: authLoading, signOut } = useAuth();
  
  // Documents hooks
  const { documents, createDocument, updateDocumentStatus } = useDocuments(user?.id);
  const { documents: allDocuments, updateDocumentStatus: updateAllDocumentStatus } = useAllDocuments();
  
  // Folders hook
  const { folders, createFolder, updateFolder, deleteFolder } = useFolders(user?.id);

  // Remover handleLogin e lógica de login, pois agora está no contexto

  const handleLogout = () => {
    console.log('[App] handleLogout chamado');
    signOut();
    setCurrentPage('home');
  };

  const handleDocumentUpload = async (documentData: Omit<DocumentInsert, 'user_id'>) => {
    try {
      await createDocument(documentData);
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  };

  const handleDocumentStatusUpdate = async (documentId: string, status: Document['status']) => {
    try {
      if (user?.role === 'admin') {
        await updateAllDocumentStatus(documentId, status);
      } else {
        await updateDocumentStatus(documentId, status);
      }
    } catch (error) {
      console.error('Error updating document status:', error);
      throw error;
    }
  };

  const handleFolderCreate = async (folderData: Omit<FolderInsert, 'user_id'>) => {
    try {
      await createFolder(folderData);
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  };

  const handleFolderUpdate = async (folderId: string, updates: { name?: string; color?: string }) => {
    try {
      await updateFolder(folderId, updates);
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  };

  const handleFolderDelete = async (folderId: string) => {
    try {
      await deleteFolder(folderId);
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  };

  const handleViewDocument = (document: Document) => {
    console.log('View document:', document);
  };

  console.log('DEBUG: App render', { currentPage, user });

  // Auto-navigate based on user role
  React.useEffect(() => {
    console.log('[App] useEffect [user, authLoading]', { user, authLoading, currentPage });
    if (!authLoading) {
      if (user && (currentPage !== (user.role === 'admin' ? 'admin' : 'dashboard-customer'))) {
        console.log('[App] Navegando para dashboard conforme role', { role: user.role });
        setCurrentPage(user.role === 'admin' ? 'admin' : 'dashboard-customer');
      } else if (!user && currentPage !== 'login') {
        console.log('[App] Usuário não autenticado, navegando para login');
        setCurrentPage('login');
      }
    }
  }, [user, authLoading]);

  // Bloquear loading apenas para páginas protegidas
  const protectedPages: Page[] = ['dashboard-customer', 'admin', 'upload'];
  if (authLoading && protectedPages.includes(currentPage)) {
    console.log('[App] authLoading=true, exibindo tela de loading', { currentPage });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-900 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">TFE</span>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  console.log('[App] authLoading false, renderizando página', { currentPage, user });

  // Define navigation items based on user status
  const getNavItems = () => {
    const baseItems = [
      { id: 'home', label: 'Home', icon: HomeIcon, page: 'home' as Page },
      { id: 'translations', label: 'Translations', icon: FileText, page: 'translations' as Page },
      { id: 'verify', label: 'Verify Document', icon: Search, page: 'verify' as Page },
    ];

    if (user) {
      const userItems = [
        { id: 'dashboard', label: 'Dashboard', icon: UserIcon, page: 'dashboard-customer' as Page },
        { id: 'upload', label: 'Upload', icon: UploadIcon, page: 'upload' as Page },
      ];
      if (user.role === 'admin') {
        userItems.push({ id: 'admin', label: 'Admin Panel', icon: Shield, page: 'admin' as Page });
      }
      if (user.role === 'authenticator' || user.role === 'admin') {
        userItems.push({ id: 'authenticator', label: 'Painel do Autenticador', icon: Shield, page: '/authenticator' });
      }
      return [...baseItems, ...userItems];
    } else {
      return [
        ...baseItems,
        { id: 'login', label: 'Login', icon: LogIn, page: 'login' as Page },
        { id: 'register', label: 'Register', icon: UserPlus, page: 'register' as Page },
      ];
    }
  };

  const location = useLocation();

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'translations':
        return <Translations />;
      case 'dashboard-customer':
        return (
          <CustomerDashboard 
            user={user} 
            documents={documents}
            folders={folders}
            onDocumentUpload={handleDocumentUpload}
            onFolderCreate={handleFolderCreate}
            onFolderUpdate={handleFolderUpdate}
            onFolderDelete={handleFolderDelete}
            onViewDocument={handleViewDocument}
          />
        );
      case 'upload':
        return <Upload user={user} documents={documents} onDocumentUpload={handleDocumentUpload} />;
      case 'documents':
        return (
          <DocumentManager
            user={user}
            documents={documents}
            folders={folders}
            onDocumentUpload={handleDocumentUpload}
            onFolderCreate={handleFolderCreate}
            onFolderUpdate={handleFolderUpdate}
            onFolderDelete={handleFolderDelete}
            onViewDocument={handleViewDocument}
          />
        );
      case 'admin':
        return (
          <AdminDashboard 
            documents={allDocuments}
            onStatusUpdate={handleDocumentStatusUpdate}
          />
        );
      case 'verify':
        return <DocumentVerification />;
      case 'login':
        return <Login />;
      case 'register':
        return <Register />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} />
      <AuthRedirect>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/translations" element={<Translations />} />
          <Route path="/verify" element={<DocumentVerification />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={user ? (
            <div className="flex">
              <Sidebar navItems={getNavItems()} user={user} onLogout={handleLogout} />
              <main className="flex-1">
                <CustomerDashboard user={user} documents={documents} folders={folders} onDocumentUpload={handleDocumentUpload} onFolderCreate={handleFolderCreate} onFolderUpdate={handleFolderUpdate} onFolderDelete={handleFolderDelete} onViewDocument={handleViewDocument} />
              </main>
            </div>
          ) : <Navigate to="/login" />} />
          <Route path="/admin" element={user && user.role === 'admin' ? (
            <div className="flex">
              <Sidebar navItems={getNavItems()} user={user} onLogout={handleLogout} />
              <main className="flex-1">
                <AdminDashboard documents={allDocuments} onStatusUpdate={handleDocumentStatusUpdate} />
              </main>
            </div>
          ) : <Navigate to="/login" />} />
          <Route path="/upload" element={user ? (
        <div className="flex">
              <Sidebar navItems={getNavItems()} user={user} onLogout={handleLogout} />
          <main className="flex-1">
                <Upload user={user} documents={documents} onDocumentUpload={handleDocumentUpload} />
          </main>
        </div>
          ) : <Navigate to="/login" />} />
          <Route path="/documents" element={user ? (
            <div className="flex">
              <Sidebar navItems={getNavItems()} user={user} onLogout={handleLogout} />
              <main className="flex-1">
                <DocumentManager user={user} documents={documents} folders={folders} onDocumentUpload={handleDocumentUpload} onFolderCreate={handleFolderCreate} onFolderUpdate={handleFolderUpdate} onFolderDelete={handleFolderDelete} onViewDocument={handleViewDocument} />
          </main>
        </div>
          ) : <Navigate to="/login" />} />
          <Route path="/authenticator" element={user && (user.role === 'authenticator' || user.role === 'admin') ? (
        <div className="flex">
          <Sidebar navItems={getNavItems()} user={user} onLogout={handleLogout} />
          <main className="flex-1">
            <AuthenticatorDashboard />
          </main>
        </div>
      ) : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthRedirect>
    </div>
  );
}

export default App;