import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useDocuments, useAllDocuments } from './hooks/useDocuments';
import { useFolders } from './hooks/useFolders';
import { ToastProvider } from './contexts/ToastContext';
import { I18nProvider } from './contexts/I18nContext';
import { Toaster } from 'sonner';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AdminLayout } from './components/AdminLayout';
import { NotificationBell } from './components/NotificationBell';
import LanguageSelector from './components/LanguageSelector';
import { Mentorship as Home } from './pages/Home';
import { Translations } from './pages/Translations';
import { AdminDashboard } from './pages/AdminDashboard';

import { UserManagement } from './pages/AdminDashboard/UserManagement';
import { AuthenticatorControl } from './pages/AdminDashboard/AuthenticatorControl';
import { AffiliateWithdrawals } from './pages/AdminDashboard/AffiliateWithdrawals';
import { ActionLogs } from './pages/AdminDashboard/ActionLogs';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { FinanceDashboard } from './pages/FinanceDashboard';
import { DocumentVerification } from './pages/DocumentVerification';
import Login from './pages/Login';
import { Register } from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import DocumentManager from './pages/DocumentManager';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentCancelled } from './pages/PaymentCancelled';
import { ZelleCheckout } from './pages/ZelleCheckout';
import { AffiliatesRegister } from './pages/AffiliatesRegister';
import { AffiliatesLogin } from './pages/AffiliatesLogin';
import { AffiliateDashboard } from './pages/AffiliateDashboard';
import { Home as HomeIcon, FileText, Search, User as UserIcon, Shield, LogIn, UserPlus, Upload as UploadIcon, Menu, X, Users, UserCheck, Folder, User, DollarSign, Activity, MessageSquare, ShieldCheck } from 'lucide-react';

import { Page } from './types/Page';
import { Database } from './lib/database.types';
import { Upload } from './pages/CustomerDashboard/Upload';
import DocumentProgress from './pages/CustomerDashboard/DocumentProgress';
import ProfilePage from './pages/CustomerDashboard/ProfilePage';
import UploadDocument from './pages/CustomerDashboard/UploadDocument';
import MyDocumentsPage from './pages/CustomerDashboard/MyDocumentsPage';
import { DocumentsRetryList } from './pages/CustomerDashboard/DocumentsRetryList';
import { DocumentRetryUpload } from './pages/CustomerDashboard/DocumentRetryUpload';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthRedirect from './components/AuthRedirect';
import DocumentManagerPage from './pages/DocumentManager/index';

type Document = Database['public']['Tables']['documents']['Row'];
type Folder = Database['public']['Tables']['folders']['Row'];
type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
type FolderInsert = Database['public']['Tables']['folders']['Insert'];

export type { Document, Folder };

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Auth hook
  const { user, loading: authLoading, signOut } = useAuth();

  // Limpeza automática agora é feita via cron job do Supabase
  // Não precisa mais do agendador no frontend

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

  const getDashboardHeaderInfo = () => {
    const p = location.pathname;
    if (p.includes('/dashboard/profile')) return { title: 'User Profile', subtitle: 'Manage your personal information and preferences' };
    if (p.includes('/dashboard/documents')) return { title: 'My Documents', subtitle: 'Access and manage all your uploaded documents' };
    if (p.includes('/dashboard/progress')) return { title: 'Document Progress', subtitle: 'Track the status of your translation requests' };
    if (p.includes('/dashboard/upload')) return { title: 'Upload Document', subtitle: 'Submit new documents for translation' };
    return { title: 'Customer Dashboard', subtitle: 'Welcome back! Here is your document overview.' };
  };

  const dashboardHeader = getDashboardHeaderInfo();

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


  // Bloquear loading apenas para pÃ¡ginas protegidas
  const protectedPages: Page[] = ['dashboard-customer', 'admin', 'upload'];
  if (authLoading && protectedPages.includes(location.pathname as Page)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/logo.png"
                alt="The Future of English"
                className="w-8 h-8 flex-shrink-0 object-contain"
              />
              <h3 className="text-xl font-bold">
                <span className="text-tfe-blue-950">THE FUTURE</span>
                <span className="text-tfe-red-950"> OF ENGLISH</span>
              </h3>
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
      { id: 'home', label: 'Home', page: '/' as Page },
      { id: 'translations', label: 'Translations', page: 'translations' as Page },
      { id: 'verify', label: 'Verify Document', page: 'verify' as Page },
    ];

    // Se nÃ£o estÃ¡ logado, retorna itens bÃ¡sicos + login/register
    if (!user) {
      const result = [
        ...baseItems,
        { id: 'login', label: 'Login', page: 'login' as Page },
        { id: 'register', label: 'Register', page: 'register' as Page },
      ];
      return result;
    }

    // Verificar se estÃ¡ nas pÃ¡ginas do Dashboard ou outras pÃ¡ginas especÃ­ficas
    const isDashboardArea = location.pathname.startsWith('/dashboard') ||
      location.pathname.startsWith('/admin') ||
      location.pathname.startsWith('/authenticator') ||
      location.pathname.startsWith('/finance') ||
      location.pathname === '/user-management' ||
      location.pathname === '/authenticator-control' ||
      location.pathname === '/admin/affiliate-withdrawals' ||
      location.pathname === '/admin/action-logs';

    // Se estÃ¡ na Ã¡rea de Dashboard, mostrar apenas itens do Dashboard (botÃ£o Home Ã© separado)
    if (isDashboardArea) {
      if (user.role === 'authenticator') {
        const items = [
          { id: 'authenticator-dashboard', label: 'Authenticator Dashboard', page: '/authenticator' },
          { id: 'documents', label: 'Documents to Authenticate', page: '/documents' },
        ];
        return items;
      }

      if (user.role === 'admin') {
        const items = [
          { id: 'admin', label: 'Admin Dashboard', page: 'admin' as Page },
          { id: 'action-logs', label: 'Action Logs', page: '/admin/action-logs' },
          { id: 'user-management', label: 'User Management', page: 'user-management' as Page },
          { id: 'authenticator-control', label: 'Authenticator Control', page: 'authenticator-control' as Page },
        ];
        return items;
      }

      if (user.role === 'finance') {
        const items = [
          { id: 'finance-dashboard', label: 'Finance Dashboard', page: '/finance' },
          { id: 'action-logs', label: 'Action Logs', page: '/admin/action-logs' },
          { id: 'profile', label: 'Profile', page: '/finance/profile' },
        ];
        return items;
      }

      // UsuÃ¡rio comum no dashboard
      const userItems = [
        { id: 'dashboard', label: 'Overview', page: '/dashboard' },
        { id: 'upload-document', label: 'Get Translation', page: '/dashboard/upload' },
        { id: 'my-translations', label: 'My Translations', page: '/dashboard/progress' },
        { id: 'my-documents', label: 'My Documents', page: '/dashboard/documents' },
        { id: 'profile', label: 'Profile', page: '/dashboard/profile' },
      ];

      return userItems;
    }

    // Se estÃ¡ na Home ou outras pÃ¡ginas pÃºblicas, mostrar itens da Home + ir para Dashboard
    const homeItems = [
      ...baseItems,
      { id: 'go-to-dashboard', label: 'My Dashboard â†’', page: '/dashboard' },
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
        <div className={`fixed left-0 top-0 h-full w-72 sm:w-80 max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
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
                <img
                  src="/logo.png"
                  alt="The Future of English"
                  className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 object-contain"
                />
                <h3 className="text-lg sm:text-xl font-bold truncate">
                  <span className="text-tfe-blue-950">THE FUTURE</span>
                  <span className="text-tfe-red-950"> OF ENGLISH</span>
                </h3>
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
            {/* BotÃ£o Back to Home para Ã¡rea do Dashboard */}
            {user && (location.pathname.startsWith('/dashboard') ||
              location.pathname.startsWith('/admin') ||
              location.pathname.startsWith('/authenticator') ||
              location.pathname.startsWith('/finance')) && (
                <div className="mb-4">
                  <button
                    onClick={() => {
                      navigate('/');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-600 hover:text-tfe-blue-600 hover:bg-tfe-blue-50 rounded-lg transition-colors"
                  >
                    <HomeIcon className="w-5 h-5" />
                    <span className="font-medium">â† Back to Home</span>
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
              showLogo={false}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <I18nProvider>
      <ToastProvider>
        <Toaster position="top-right" richColors />
        <div className="min-h-screen bg-gray-50">
          {/* Mobile menu */}
          <MobileMenu />

          {/* Renderiza Header apenas em rotas públicas */}
          {(['/', '/translations', '/verify', '/login', '/register', '/affiliates/register', '/affiliates/login'].includes(location.pathname) ||
            (location.pathname.startsWith('/affiliates') && !location.pathname.startsWith('/affiliates/dashboard'))) && (
              <Header
                user={user}
                onLogout={handleLogout}
                onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
              />
            )}

          <AuthRedirect>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/translations" element={<Translations />} />

              <Route path="/verify" element={<DocumentVerification />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/affiliates/register" element={<AffiliatesRegister />} />
              <Route path="/affiliates/login" element={<AffiliatesLogin />} />
              <Route path="/affiliates/dashboard" element={<AffiliateDashboard />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancelled" element={<PaymentCancelled />} />
              <Route path="/zelle-checkout" element={<ZelleCheckout />} />

              {/* Dashboard routes for regular users */}
              <Route path="/dashboard/*" element={user && user.role === 'user' ? (
                <div className="flex flex-col lg:flex-row">
                  {/* Mobile header */}
                  <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-[#C71B2D] uppercase tracking-widest mb-0.5">{dashboardHeader.title}</span>
                          <div className="flex items-center gap-2">
                            <img
                              src="/logo_tfoe.png"
                              alt="TFOE Logo"
                              className="h-6 w-auto flex-shrink-0 object-contain"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <LanguageSelector />
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
                  <div className="hidden lg:block sticky top-0 h-screen self-start">
                    <Sidebar navItems={getNavItems()} user={user} onLogout={handleLogout} />
                  </div>

                  {/* Main content */}
                  <main className="flex-1 lg:ml-0">
                    {/* Desktop header que complementa a sidebar */}
                    <div className="max-lg:hidden flex bg-white border-b border-slate-200 px-8 py-5 w-full">
                      <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-4">

                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center">
                            <LanguageSelector />
                          </div>
                          <div className="h-8 w-px bg-slate-100" />
                          <div className="flex items-center gap-4">
                            <NotificationBell />
                            <button
                              onClick={() => navigate('/dashboard/profile')}
                              className="flex items-center space-x-3 p-1.5 pr-4 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100 shadow-sm group"
                              title="Go to Profile"
                            >
                              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                                <User className="w-4 h-4 text-[#163353]" />
                              </div>
                              <span className="text-sm font-bold truncate max-w-[150px]">{user?.user_metadata?.name || 'User'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>


                    <Routes>
                      <Route path="/" element={<CustomerDashboard user={user} documents={documents} folders={folders} onDocumentUpload={handleDocumentUpload} onFolderCreate={handleFolderCreate} onFolderUpdate={handleFolderUpdate} onFolderDelete={handleFolderDelete} onViewDocument={handleViewDocument} />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/documents" element={<MyDocumentsPage />} />
                      <Route path="/progress" element={<DocumentProgress />} />
                      <Route path="/upload" element={<UploadDocument />} />
                      <Route path="/retry-upload" element={<DocumentsRetryList />} />
                      <Route path="/retry-upload/single/:documentId" element={<DocumentRetryUpload />} />
                    </Routes>
                  </main>
                </div>
              ) : <Navigate to="/login" />} />

              {/* Authenticator routes */}
              <Route path="/authenticator/*" element={user && (user.role === 'authenticator' || user.role === 'admin') ? (
                <DocumentManager />
              ) : <Navigate to="/login" />} />

              {/* Admin routes with shared layout */}
              <Route path="/admin" element={user && user.role === 'admin' ? (
                <AdminLayout
                  user={user}
                  onLogout={handleLogout}
                  onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
                  navItems={getNavItems()}
                >
                  <AdminDashboard documents={allDocuments} onStatusUpdate={handleDocumentStatusUpdate} />
                </AdminLayout>
              ) : <Navigate to="/login" />} />

              {/* Finance routes */}
              <Route path="/finance/*" element={user && user.role === 'finance' ? (
                <AdminLayout
                  user={user}
                  onLogout={handleLogout}
                  onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
                  navItems={getNavItems()}
                  title="Finance Dashboard"
                  subtitle="Monitor payments, track translations, and generate business reports"
                >
                  <Routes>
                    <Route path="/" element={<FinanceDashboard documents={documents} />} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Routes>
                </AdminLayout>
              ) : <Navigate to="/login" />} />

              <Route path="/user-management" element={user && user.role === 'admin' ? (
                <AdminLayout
                  user={user}
                  onLogout={handleLogout}
                  onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
                  navItems={getNavItems()}
                  title="User Management"
                >
                  <UserManagement />
                </AdminLayout>
              ) : <Navigate to="/login" />} />

              <Route path="/admin/affiliate-withdrawals" element={user && (user.role === 'admin' || user.role === 'finance') ? (
                <AdminLayout
                  user={user}
                  onLogout={handleLogout}
                  onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
                  navItems={getNavItems()}
                  title="Solicitações de Saque de Afiliados"
                >
                  <AffiliateWithdrawals />
                </AdminLayout>
              ) : <Navigate to="/login" />} />

              <Route path="/authenticator-control" element={user && user.role === 'admin' ? (
                <AdminLayout
                  user={user}
                  onLogout={handleLogout}
                  onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
                  navItems={getNavItems()}
                  title="Authenticator Control"
                  subtitle="Professional Translation"
                >
                  <AuthenticatorControl />
                </AdminLayout>
              ) : <Navigate to="/login" />} />

              <Route path="/admin/action-logs" element={user && (user.role === 'admin' || user.role === 'finance') ? (
                <AdminLayout
                  user={user}
                  onLogout={handleLogout}
                  onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
                  navItems={getNavItems()}
                  title="Action Logs"
                >
                  <ActionLogs />
                </AdminLayout>
              ) : <Navigate to="/login" />} />



              {/* Legacy routes for backward compatibility */}
              <Route path="/upload" element={user ? (
                <Upload user={user} documents={documents} onDocumentUpload={handleDocumentUpload} />
              ) : <Navigate to="/login" />} />

              <Route path="/dashboard/progress" element={user && user.role === 'user' ? (
                <div className="flex flex-col lg:flex-row">
                  {/* Mobile header */}
                  <div className="lg:hidden sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center gap-2">
                          <img
                            src="/logo.png"
                            alt="The Future of English"
                            className="w-8 h-8 flex-shrink-0 object-contain"
                          />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900">
                            <span className="text-tfe-blue-950">THE FUTURE</span>
                            <span className="text-tfe-red-950"> OF ENGLISH</span>
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


        </div>
      </ToastProvider>
    </I18nProvider>
  );
}

export default App;

//teste