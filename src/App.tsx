import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useDocuments, useAllDocuments } from './hooks/useDocuments';
import { useFolders } from './hooks/useFolders';
import { ToastProvider } from './contexts/ToastContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { NotificationBell } from './components/NotificationBell';
import { Footer } from './components/Footer';
import { Mentorship } from './pages/Home';
import { Translations } from './pages/Translations';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserManagement } from './pages/AdminDashboard/UserManagement';
import { AuthenticatorControl } from './pages/AdminDashboard/AuthenticatorControl';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { DocumentVerification } from './pages/DocumentVerification';
import Login from './pages/Login';
import { Register } from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
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

  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  const handleDocumentUpload = async (documentData: Omit<DocumentInsert, 'user_id'>) => {
    try {
      await createDocument(documentData);
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  };

  const handleDocumentStatusUpdate = async (documentId: string, status: 'pending' | 'processing' | 'completed') => {
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

  const handleFolderUpdate = async (folderId: string, updates: { name?: string; color?: string; parent_id?: string | null }) => {
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

  // Bloquear loading apenas para páginas protegidas
  const protectedPages: Page[] = ['dashboard-customer', 'admin', 'upload'];
  if (authLoading && protectedPages.includes(location.pathname as Page)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-tfe-red-600 to-tfe-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TFE</span>
              </div>
              <h3 className="text-xl font-bold">The Future of English</h3>
            </div>
          </div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Define navigation items based on user status and current page
  const getNavItems = () => {
    
    const baseItems = [
      { id: 'mentorship', label: 'Mentorship', icon: HomeIcon, page: 'mentorship' as Page },
      { id: 'translations', label: 'Translations', icon: FileText, page: 'translations' as Page },
      { id: 'verify', label: 'Verify Document', icon: Search, page: 'verify' as Page },
    ];

    // Se não está logado, retorna itens básicos + login/register
    if (!user) {
      const result = [
        ...baseItems,
        { id: 'login', label: 'Login', icon: LogIn, page: 'login' as Page },
        { id: 'register', label: 'Register', icon: UserPlus, page: 'register' as Page },
      ];
      return result;
    }

    // Verificar se está nas páginas do Dashboard ou outras páginas específicas
    const isDashboardArea = location.pathname.startsWith('/dashboard') || 
                           location.pathname.startsWith('/admin') || 
                           location.pathname.startsWith('/authenticator');
    
    // Se está na área de Dashboard, mostrar apenas itens do Dashboard (botão Home é separado)
    if (isDashboardArea) {
      if (user.role === 'authenticator') {
        const items = [
          { id: 'authenticator-dashboard', label: 'Authenticator Dashboard', icon: Shield, page: '/authenticator' },
          { id: 'documents', label: 'Documents to Authenticate', icon: FileText, page: '/documents' },
        ];
        return items;
      }
      
      if (user.role === 'admin') {
        const items = [
          { id: 'admin', label: 'Admin Dashboard', icon: Shield, page: 'admin' as Page },
          { id: 'user-management', label: 'User Management', icon: Users, page: 'user-management' as Page },
          { id: 'authenticator-control', label: 'Authenticator Control', icon: UserCheck, page: 'authenticator-control' as Page },
        ];
        return items;
      }
      
      // Usuário comum no dashboard
      const userItems = [
        { id: 'dashboard', label: 'Overview', icon: UserIcon, page: '/dashboard' },
        { id: 'upload-document', label: 'Get Translation', icon: UploadIcon, page: '/dashboard/upload' },
        { id: 'my-translations', label: 'My Translations', icon: FileText, page: '/dashboard/progress' },
        { id: 'my-documents', label: 'My Documents', icon: Folder, page: '/dashboard/documents' },
        { id: 'profile', label: 'Profile', icon: UserIcon, page: '/dashboard/profile' },
      ];
      
      return userItems;
    }
    
    // Se está na Home ou outras páginas públicas, mostrar itens da Home + ir para Dashboard
    const homeItems = [
      ...baseItems,
      { id: 'go-to-dashboard', label: 'My Dashboard →', icon: UserIcon, page: '/dashboard' },
    ];
    
    return homeItems;
  };

  // Mobile menu component
  const MobileMenu = () => {
    return (
      <div className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Menu */}
        <div className={`fixed left-0 top-0 h-full w-72 sm:w-80 max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
            <button
              onClick={() => {
                navigate('/');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center space-x-2 min-w-0 text-tfe-blue-950 hover:text-tfe-blue-700 transition-colors p-1 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-tfe-red-600 to-tfe-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs sm:text-sm">TFE</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold truncate">The Future of English</h3>
              </div>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Close menu"
              title="Close menu"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          
          <div className="p-3 sm:p-4 h-full overflow-y-auto">
            {/* Botão Back to Home para área do Dashboard */}
            {user && (location.pathname.startsWith('/dashboard') || 
                     location.pathname.startsWith('/admin') || 
                     location.pathname.startsWith('/authenticator')) && (
              <div className="mb-4">
                <button
                  onClick={() => {
                    navigate('/');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-600 hover:text-tfe-blue-600 hover:bg-tfe-blue-50 rounded-lg transition-colors"
                >
                  <HomeIcon className="w-5 h-5" />
                  <span className="font-medium">← Back to Home</span>
                </button>
              </div>
            )}
            
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
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <MobileMenu />
      
      {/* Renderiza Header apenas em rotas públicas */}
      {['/', '/translations', '/verify', '/login', '/register'].includes(location.pathname) && (
        <Header 
          user={user} 
          onLogout={handleLogout} 
          onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
        />
      )}
      
      <AuthRedirect>
        <Routes>
          <Route path="/" element={<Mentorship />} />
          <Route path="/translations" element={<Translations />} />
          <Route path="/verify" element={<DocumentVerification />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancelled" element={<PaymentCancelled />} />
          
          {/* Dashboard routes for regular users */}
          <Route path="/dashboard/*" element={user && user.role === 'user' ? (
            <div className="flex flex-col lg:flex-row">
              {/* Mobile header */}
              <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-tfe-red-600 to-tfe-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">TFE</span>
                      </div>
                      <h3 className="text-xl font-bold">The Future of English</h3>
                    </div>
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
          
          {/* Authenticator routes */}
          <Route path="/authenticator/*" element={user && (user.role === 'authenticator' || user.role === 'admin') ? (
            <DocumentManagerPage />
          ) : <Navigate to="/login" />} />
          
          {/* Admin routes */}
          <Route path="/admin" element={user && user.role === 'admin' ? (
            <div className="flex flex-col lg:flex-row">
              {/* Mobile header */}
              <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-tfe-red-600 to-tfe-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">TFE</span>
                      </div>
                      <h3 className="text-xl font-bold">The Future of English</h3>
                    </div>
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
                      <div className="w-8 h-8 bg-gradient-to-r from-tfe-red-950 to-tfe-blue-950 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                        TFE
                      </div>
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
                  <div className="flex items-center space-x-3">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-tfe-red-950 to-tfe-blue-950 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                        TFE
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900">
                        The Future of English
                      </div>
                      <div className="text-xs text-gray-600">
                        Professional Translation
                      </div>
                    </div>
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
          
          {/* Legacy routes for backward compatibility */}
          <Route path="/upload" element={user ? (
            <Upload user={user} documents={documents} onDocumentUpload={handleDocumentUpload} />
          ) : <Navigate to="/login" />} />
          
          <Route path="/dashboard/progress" element={user && user.role === 'user' ? (
            <div className="flex flex-col lg:flex-row">
              {/* Mobile header */}
              <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-tfe-red-950 to-tfe-blue-950 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                        TFE
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900">
                        The Future of English
                      </div>
                      <div className="text-xs text-gray-600">
                        Professional Translation
                      </div>
                    </div>
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
          
          {/* Documents route - simplified */}
          <Route path="/documents" element={user ? (
            user.role === 'authenticator' || user.role === 'admin' ? (
              <DocumentManagerPage />
            ) : (
              <MyDocumentsPage />
            )
          ) : <Navigate to="/login" />} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthRedirect>
      
      {/* Footer - Show on all pages */}
      <Footer />
    </div>
    </ToastProvider>
  );
}

export default App;