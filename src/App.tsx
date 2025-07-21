import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useDocuments, useAllDocuments } from './hooks/useDocuments';
import { useFolders } from './hooks/useFolders';
import { ToastProvider } from './contexts/ToastContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { NotificationBell } from './components/NotificationBell';
import { Home } from './pages/Home';
import { Translations } from './pages/Translations';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserManagement } from './pages/AdminDashboard/UserManagement';
import { AuthenticatorControl } from './pages/AdminDashboard/AuthenticatorControl';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { DocumentVerification } from './pages/DocumentVerification';
import Login from './pages/Login';
import { Register } from './pages/Register';
import { DocumentManager } from './pages/DocumentManager';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentCancelled } from './pages/PaymentCancelled';
import { Home as HomeIcon, FileText, Search, User as UserIcon, Shield, LogIn, UserPlus, LogOut, Upload as UploadIcon, Menu, X, Users, UserCheck, Folder, User } from 'lucide-react';

import { Page } from './types/Page';
import { Database } from './lib/database.types';
import Upload from './pages/CustomerDashboard/Upload';
import DocumentProgress from './pages/CustomerDashboard/DocumentProgress';
import ProfilePage from './pages/CustomerDashboard/ProfilePage';
import UploadDocument from './pages/CustomerDashboard/UploadDocument';
import MyDocumentsPage from './pages/CustomerDashboard/MyDocumentsPage';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthRedirect from './components/AuthRedirect';
import DocumentManagerPage from './pages/DocumentManager/index';
import AuthenticatorDashboard from './pages/DocumentManager/AuthenticatorDashboard';
import DocumentsToAuthenticate from './pages/DocumentManager/DocumentsToAuthenticate';

type Document = Database['public']['Tables']['documents']['Row'];
type Folder = Database['public']['Tables']['folders']['Row'];
type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
type FolderInsert = Database['public']['Tables']['folders']['Insert'];

export type { Document, Folder };

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Auth hook
  const { user, loading: authLoading, signOut } = useAuth();
  
  // Documents hooks
  const { documents, createDocument, updateDocumentStatus } = useDocuments(user?.id);
  const { documents: allDocuments, updateDocumentStatus: updateAllDocumentStatus } = useAllDocuments();
  
  // Folders hook
  const { folders, createFolder, updateFolder, deleteFolder } = useFolders(user?.id);

  // Remover handleLogin e lógica de login, pois agora está no contexto

  const navigate = useNavigate();

  const handleLogout = () => {
    console.log('[App] handleLogout chamado');
    signOut();
    navigate('/login'); // Redireciona para login após logout
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

  const location = useLocation();

  console.log('DEBUG: App render', { user });

  // Bloquear loading apenas para páginas protegidas
  const protectedPages: Page[] = ['dashboard-customer', 'admin', 'upload'];
  if (authLoading && protectedPages.includes(location.pathname as Page)) {
    console.log('[App] authLoading=true, exibindo tela de loading', { pathname: location.pathname });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <img 
            src="/logo_tfoe.png" 
            alt="The Future of English Logo" 
            className="h-16 w-auto mx-auto mb-4"
          />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  console.log('[App] authLoading false, renderizando página', { pathname: location.pathname, user });

  // Define navigation items based on user status
  const getNavItems = () => {
    console.log('[App] getNavItems chamado com user:', user);
    
    const baseItems = [
      { id: 'home', label: 'Home', icon: HomeIcon, page: 'home' as Page },
      { id: 'translations', label: 'Translations', icon: FileText, page: 'translations' as Page },
      { id: 'verify', label: 'Verify Document', icon: Search, page: 'verify' as Page },
    ];

    if (user) {
      console.log('[App] User role:', user.role);
      
      // Itens para autenticador
      if (user.role === 'authenticator') {
        const items = [
          { id: 'authenticator-dashboard', label: 'Authenticator Dashboard', icon: Shield, page: '/authenticator' },
          { id: 'documents', label: 'Documents to Authenticate', icon: FileText, page: '/documents' },
        ];
        console.log('[App] Retornando itens para autenticador:', items);
        return items;
      }
      
      // Itens para admin - foco no controle e monitoramento
      if (user.role === 'admin') {
        const items = [
          { id: 'admin', label: 'Admin Dashboard', icon: Shield, page: 'admin' as Page },
          { id: 'user-management', label: 'User Management', icon: Users, page: 'user-management' as Page },
          { id: 'authenticator-control', label: 'Authenticator Control', icon: UserCheck, page: 'authenticator-control' as Page },
        ];
        console.log('[App] Retornando itens para admin:', items);
        return items;
      }
      
      // Itens para usuário comum - apenas itens do dashboard
      const userItems = [
        { id: 'dashboard', label: 'Overview', icon: UserIcon, page: '/dashboard' },
        { id: 'upload-document', label: 'Get Translation', icon: UploadIcon, page: '/dashboard/upload' },
        { id: 'my-translations', label: 'My Translations', icon: FileText, page: '/dashboard/progress' },
        { id: 'my-documents', label: 'My Documents', icon: Folder, page: '/dashboard/documents' },
        { id: 'profile', label: 'Profile', icon: UserIcon, page: '/dashboard/profile' },
      ];
      
      console.log('[App] Retornando itens para usuário:', userItems);
      return userItems;
    } else {
      const result = [
        ...baseItems,
        { id: 'login', label: 'Login', icon: LogIn, page: 'login' as Page },
        { id: 'register', label: 'Register', icon: UserPlus, page: 'register' as Page },
      ];
      console.log('[App] Retornando itens para usuário não logado:', result);
      return result;
    }
  };

  // Mobile menu component
  const MobileMenu = () => (
    <div className={`fixed inset-0 z-50 lg:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50" 
        onClick={() => setIsMobileMenuOpen(false)}
      />
      
      {/* Menu */}
      <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <img 
              src="/logo_tfoe.png" 
              alt="The Future of English Logo" 
              className="h-8 w-auto"
            />
            <span className="text-lg font-bold text-gray-900">Menu</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4">
          <Sidebar 
            navItems={getNavItems()} 
            user={user} 
            onLogout={() => {
              handleLogout();
              setIsMobileMenuOpen(false);
            }} 
          />
        </div>
      </div>
    </div>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <MobileMenu />
      
      {/* Renderiza Header apenas em rotas públicas */}
      {['/', '/translations', '/verify', '/login', '/register'].includes(location.pathname) && (
        <Header user={user} onLogout={handleLogout} />
      )}
      
      <AuthRedirect>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/translations" element={<Translations />} />
          <Route path="/verify" element={<DocumentVerification />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancelled" element={<PaymentCancelled />} />
          <Route path="/dashboard/*" element={user && user.role === 'user' ? (
            <div className="flex flex-col lg:flex-row">
              {/* Mobile header */}
              <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-red-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">TFE</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">Dashboard</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <NotificationBell />
                    <button
                      onClick={() => setIsMobileMenuOpen(true)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      aria-label="Open menu"
                      title="Open menu"
                    >
                      <Menu className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Desktop sidebar */}
              <div className="hidden lg:block">
                <Sidebar navItems={getNavItems()} user={user} onLogout={handleLogout} />
              </div>
              
              {/* Main content */}
              <main className="flex-1 lg:ml-0">
                {/* Desktop header que complementa a sidebar */}
                <div className="hidden lg:block bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                    </div>
                    <div className="flex items-center space-x-4">
                      <NotificationBell />
                      <button
                        onClick={() => navigate('/dashboard/profile')}
                        className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
                        title="Go to Profile"
                      >
                        <User className="w-5 h-5" />
                        <span className="text-sm font-medium">{user?.user_metadata?.name || 'User'}</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                <Routes>
                  <Route path="/" element={<CustomerDashboard user={user} documents={documents} folders={folders} onDocumentUpload={handleDocumentUpload} onFolderCreate={handleFolderCreate} onFolderUpdate={handleFolderUpdate} onFolderDelete={handleFolderDelete} onViewDocument={handleViewDocument} />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/documents" element={<MyDocumentsPage />} />
                  <Route path="/progress" element={<DocumentProgress />} />
                  <Route path="/upload" element={<UploadDocument />} />
                </Routes>
              </main>
            </div>
          ) : <Navigate to="/login" />} />
          <Route path="/authenticator/*" element={user && (user.role === 'authenticator' || user.role === 'admin') ? (
            <DocumentManagerPage />
          ) : <Navigate to="/login" />} />
          <Route path="/admin" element={user && user.role === 'admin' ? (
            <div className="flex flex-col lg:flex-row">
              {/* Mobile header */}
              <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex justify-center">
                      <img 
                        src="/logo_tfoe.png" 
                        alt="The Future of English Logo" 
                        className="h-8 w-auto"
                      />
                    </div>
                    <span className="text-lg font-bold text-gray-900">Admin Panel</span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    aria-label="Open menu"
                    title="Open menu"
                  >
                    <Menu className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {/* Desktop sidebar */}
              <div className="hidden lg:block">
                <Sidebar navItems={getNavItems()} user={user} onLogout={handleLogout} />
              </div>
              
              {/* Main content */}
              <main className="flex-1 lg:ml-0">
                <AdminDashboard documents={allDocuments} onStatusUpdate={handleDocumentStatusUpdate} />
              </main>
            </div>
          ) : <Navigate to="/login" />} />
          <Route path="/user-management" element={user && user.role === 'admin' ? (
            <div className="flex flex-col lg:flex-row">
              {/* Mobile header */}
              <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex justify-center">
                      <img 
                        src="/logo_tfoe.png" 
                        alt="The Future of English Logo" 
                        className="h-8 w-auto"
                      />
                    </div>
                    <span className="text-lg font-bold text-gray-900">User Management</span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    aria-label="Open menu"
                    title="Open menu"
                  >
                    <Menu className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {/* Desktop sidebar */}
              <div className="hidden lg:block">
                <Sidebar navItems={getNavItems()} user={user} onLogout={handleLogout} />
              </div>
              
              {/* Main content */}
              <main className="flex-1 lg:ml-0">
                <UserManagement />
              </main>
            </div>
          ) : <Navigate to="/login" />} />
          <Route path="/authenticator-control" element={user && user.role === 'admin' ? (
            <div className="flex flex-col lg:flex-row">
              {/* Mobile header */}
              <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex justify-center">
                      <img 
                        src="/logo_tfoe.png" 
                        alt="The Future of English Logo" 
                        className="h-8 w-auto"
                      />
                    </div>
                    <span className="text-lg font-bold text-gray-900">Authenticator Control</span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    aria-label="Open menu"
                    title="Open menu"
                  >
                    <Menu className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {/* Desktop sidebar */}
              <div className="hidden lg:block">
                <Sidebar navItems={getNavItems()} user={user} onLogout={handleLogout} />
              </div>
              
              {/* Main content */}
              <main className="flex-1 lg:ml-0">
                <AuthenticatorControl />
              </main>
            </div>
          ) : <Navigate to="/login" />} />
          <Route path="/upload" element={user ? (
            <Upload user={user} documents={documents} onDocumentUpload={handleDocumentUpload} />
          ) : <Navigate to="/login" />} />
          <Route path="/dashboard/progress" element={user && user.role === 'user' ? (
            <div className="flex flex-col lg:flex-row">
              {/* Mobile header */}
              <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-red-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">TFE</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">Progress</span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    aria-label="Open menu"
                    title="Open menu"
                  >
                    <Menu className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {/* Desktop sidebar */}
              <div className="hidden lg:block">
                <Sidebar navItems={getNavItems()} user={user} onLogout={handleLogout} />
              </div>
              
              {/* Main content */}
              <main className="flex-1 lg:ml-0">
                <DocumentProgress />
              </main>
            </div>
          ) : <Navigate to="/login" />} />
          <Route path="/documents" element={user ? (
            user.role === 'authenticator' || user.role === 'admin' ? (
              <DocumentManagerPage />
            ) : (
              <div className="flex flex-col lg:flex-row">
                {/* Mobile header */}
                <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-red-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">TFE</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">Documents</span>
                    </div>
                    <button
                      onClick={() => setIsMobileMenuOpen(true)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      aria-label="Open menu"
                      title="Open menu"
                    >
                      <Menu className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                
                {/* Desktop sidebar */}
                <div className="hidden lg:block">
                  <Sidebar navItems={getNavItems()} user={user} onLogout={handleLogout} />
                </div>
                
                {/* Main content */}
                <main className="flex-1 lg:ml-0">
                  <DocumentManager user={user} documents={documents} folders={folders} onDocumentUpload={handleDocumentUpload} onFolderCreate={handleFolderCreate} onFolderUpdate={handleFolderUpdate} onFolderDelete={handleFolderDelete} onViewDocument={handleViewDocument} />
                </main>
              </div>
            )
          ) : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthRedirect>
    </div>
    </ToastProvider>
  );
}

export default App;