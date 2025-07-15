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
import type { User } from './hooks/useAuth';
import Upload from './pages/CustomerDashboard/Upload';

type Document = Database['public']['Tables']['documents']['Row'];
type Folder = Database['public']['Tables']['folders']['Row'];
type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
type FolderInsert = Database['public']['Tables']['folders']['Insert'];

export type { User, Document, Folder };

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
    if (!authLoading && user) {
      // Se o usuário está logado e está em página de auth, navegar para dashboard
      if (currentPage === 'login' || currentPage === 'register') {
        const targetPage = user.role === 'admin' ? 'admin' : 'dashboard-customer';
        console.log('[App] Navegando após login para:', targetPage);
        setCurrentPage(targetPage);
      }
    } else if (!authLoading && !user && ['dashboard-customer', 'admin', 'upload', 'documents'].includes(currentPage)) {
      // Se não está logado e está em página protegida, ir para login
      setCurrentPage('login');
    }
  }, [user, authLoading, currentPage]);

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
      
      return [...baseItems, ...userItems];
    } else {
      return [
        ...baseItems,
        { id: 'login', label: 'Login', icon: LogIn, page: 'login' as Page },
        { id: 'register', label: 'Register', icon: UserPlus, page: 'register' as Page },
      ];
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={setCurrentPage} />;
      case 'translations':
        return <Translations onNavigate={setCurrentPage} />;
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
            onNavigate={setCurrentPage}
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
        return <Login onNavigate={setCurrentPage} />;
      case 'register':
        return <Register onNavigate={setCurrentPage} />;
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show sidebar and different layout for dashboard pages */}
      {(currentPage === 'dashboard-customer' || currentPage === 'admin' || currentPage === 'documents' || currentPage === 'upload') && user ? (
        <div className="flex">
          <Sidebar 
            navItems={getNavItems()} 
            onNavigate={setCurrentPage} 
            currentPage={currentPage}
            user={user}
            onLogout={handleLogout}
          />
          <main className="flex-1">
            {renderPage()}
          </main>
        </div>
      ) : (
        <div>
          <Header 
            user={user} 
            onNavigate={setCurrentPage} 
            onLogout={handleLogout}
            currentPage={currentPage}
          />
          <main>
            {renderPage()}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;