import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AuthenticatorDashboard from './AuthenticatorDashboard';
import TranslatedDocuments from './TranslatedDocuments';
import AuthenticatorOverview from './AuthenticatorOverview';
import AuthenticatorUpload from './AuthenticatorUpload';
import AuthenticatorFailedUploads from './AuthenticatorFailedUploads';
import { FileText, CheckCircle, LogOut, Menu, X, User, Upload, Home as HomeIcon, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { NotificationBell } from '../../components/NotificationBell';
import { OverviewProvider } from '../../contexts/OverviewContext';
import LanguageSelector from '../../components/LanguageSelector';

export default function AuthenticatorLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);



  // Determine current page from URL
  const getCurrentPage = () => {
    if (location.pathname.includes('/authenticate')) return 'authenticate';
    if (location.pathname.includes('/translated')) return 'translated';
    if (location.pathname.includes('/upload')) return 'upload';
    if (location.pathname.includes('/failed-uploads')) return 'failed-uploads';
    return 'overview';
  };

  const currentPage = getCurrentPage();

  const getHeaderInfo = () => {
    switch(currentPage) {
      case 'authenticate': return { title: 'Authenticate Documents', subtitle: 'Verify and process pending document requests' };
      case 'translated': return { title: 'Translated Documents', subtitle: 'View and manage all successfully translated documents' };
      case 'upload': return { title: 'Upload Document', subtitle: 'Manually upload documents to the system' };
      case 'failed-uploads': return { title: 'Failed Uploads', subtitle: 'Review and fix documents with processing errors' };
      default: return { title: user?.role === 'admin' ? 'Admin Overview' : 'Authenticator Overview', subtitle: 'Welcome back! Here\'s the complete system overview.' };
    }
  };

  const headerInfo = getHeaderInfo();

  if (!user || (user.role !== 'authenticator' && user.role !== 'admin')) {
    return <div>Access denied. Only authenticators can view this page.</div>;
  }

  const handleLogout = () => {
    signOut();
  };

  const handleNavigation = (page: 'overview' | 'authenticate' | 'translated' | 'upload' | 'failed-uploads') => {
    if (page === 'overview') {
      navigate('/authenticator');
    } else if (page === 'authenticate') {
      navigate('/authenticator/authenticate');
    } else if (page === 'translated') {
      navigate('/authenticator/translated');
    } else if (page === 'upload') {
      navigate('/authenticator/upload');
    } else if (page === 'failed-uploads') {
      navigate('/authenticator/failed-uploads');
    }
    setIsMobileMenuOpen(false);
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
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2">
              <img 
                src="/logo_tfoe.png" 
                alt="TFOE Logo" 
                className="h-10 w-auto flex-shrink-0 object-contain"
              />
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4">
          {/* User Info */}
          {user && (
            <div className="bg-gray-50 p-3 rounded-lg mb-6">
              <p className="text-sm font-medium text-gray-900">{user.user_metadata?.name || 'Authenticator'}</p>
              <p className="text-xs text-gray-600">{user.email || ''}</p>
              <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                user.role === 'admin'
                  ? 'bg-tfe-red-100 text-tfe-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {user.role === 'admin' ? 'Administrator' : 'Authenticator'}
              </span>
            </div>
          )}
          
          {/* Navigation */}
          <nav className="space-y-2">
            <button
              onClick={() => navigate('/authenticator')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                currentPage === 'overview'
                  ? 'bg-tfe-blue-50 text-tfe-blue-700 border border-tfe-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <HomeIcon className="w-5 h-5" />
              <span className="font-medium">Overview</span>
            </button>
            
            <button
              onClick={() => navigate('/authenticator/authenticate')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                currentPage === 'authenticate'
                  ? 'bg-tfe-blue-50 text-tfe-blue-700 border border-tfe-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Authenticate Documents</span>
            </button>
            
            <button
              onClick={() => navigate('/authenticator/translated')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                currentPage === 'translated'
                  ? 'bg-tfe-blue-50 text-tfe-blue-700 border border-tfe-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Translated Documents</span>
            </button>
            
            <button
              onClick={() => navigate('/authenticator/upload')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                currentPage === 'upload'
                  ? 'bg-tfe-blue-50 text-tfe-blue-700 border border-tfe-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Upload className="w-5 h-5" />
              <span className="font-medium">Upload Document</span>
            </button>
            
            <button
              onClick={() => navigate('/authenticator/failed-uploads')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                currentPage === 'failed-uploads'
                  ? 'bg-tfe-blue-50 text-tfe-blue-700 border border-tfe-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Failed Uploads</span>
            </button>
          </nav>

          

          {/* Logout */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-tfe-red-600 hover:bg-tfe-red-50 hover:text-tfe-red-700"
            >
              <LogOut className="w-5 h-5 text-tfe-red-500" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Menu */}
      <MobileMenu />

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white shadow-sm border-r border-gray-200">
          <div className="flex items-center justify-center p-8 border-b border-gray-100">
            <img 
              src="/logo_tfoe.png" 
              alt="TFOE Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="p-6">
              {/* User Info */}
              {user && (
                <div className="bg-gray-50 p-3 rounded-lg mb-6">
                  <p className="text-sm font-medium text-gray-900">{user.user_metadata?.name || 'Authenticator'}</p>
                  <p className="text-xs text-gray-600">{user.email || ''}</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                    user.role === 'admin'
                      ? 'bg-tfe-red-100 text-tfe-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {user.role === 'admin' ? 'Administrator' : 'Authenticator'}
                  </span>
                </div>
              )}
              
              {/* Navigation */}
              <nav className="space-y-2">
                <button
                  onClick={() => navigate('/authenticator')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    currentPage === 'overview'
                      ? 'bg-tfe-blue-50 text-tfe-blue-700 border border-tfe-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <HomeIcon className="w-5 h-5" />
                  <span className="font-medium">Overview</span>
                </button>
                
                <button
                  onClick={() => navigate('/authenticator/authenticate')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    currentPage === 'authenticate'
                      ? 'bg-tfe-blue-50 text-tfe-blue-700 border border-tfe-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">Authenticate Documents</span>
                </button>
                
                <button
                  onClick={() => navigate('/authenticator/translated')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    currentPage === 'translated'
                      ? 'bg-tfe-blue-50 text-tfe-blue-700 border border-tfe-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Translated Documents</span>
                </button>
                
                <button
                  onClick={() => navigate('/authenticator/upload')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    currentPage === 'upload'
                      ? 'bg-tfe-blue-50 text-tfe-blue-700 border border-tfe-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">Upload Document</span>
                </button>
                
                <button
                  onClick={() => navigate('/authenticator/failed-uploads')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    currentPage === 'failed-uploads'
                      ? 'bg-tfe-blue-50 text-tfe-blue-700 border border-tfe-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Failed Uploads</span>
                </button>
              </nav>


              {/* Logout */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-tfe-red-600 hover:bg-tfe-red-50 hover:text-tfe-red-700"
                >
                  <LogOut className="w-5 h-5 text-tfe-red-500" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-600"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2">
                <img 
                  src="/logo_tfoe.png" 
                  alt="TFOE Logo" 
                  className="h-10 w-auto object-contain"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <NotificationBell />
              {user && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.user_metadata?.name || 'Authenticator'}</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    user.role === 'admin'
                      ? 'bg-tfe-red-100 text-tfe-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'Auth'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {/* Desktop header que complementa a sidebar */}
          <div className="hidden lg:block bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm">
                   <ShieldCheck className="w-6 h-6 text-[#163353]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 leading-tight">
                    {headerInfo.title}
                  </h1>
                  <p className="text-sm text-slate-500 font-medium">
                    {headerInfo.subtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-5">
                <div className="pr-2 border-r border-slate-100">
                  <LanguageSelector />
                </div>
                <div className="flex items-center gap-4">
                  <NotificationBell />
                  <button
                    onClick={() => navigate('/authenticator')}
                    className="flex items-center space-x-3 p-2 pr-4 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100 shadow-sm group"
                    title="Go to Overview"
                  >
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                      <User className="w-4 h-4 text-[#163353]" />
                    </div>
                    <span className="text-sm font-bold truncate max-w-[150px]">{user?.user_metadata?.name || 'Authenticator'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <OverviewProvider>
            <Routes>
              <Route path="/" element={<AuthenticatorOverview />} />
              <Route path="/authenticate" element={<AuthenticatorDashboard />} />
              <Route path="/translated" element={<TranslatedDocuments />} />
              <Route path="/upload" element={<AuthenticatorUpload />} />
              <Route path="/failed-uploads" element={<AuthenticatorFailedUploads />} />
            </Routes>
          </OverviewProvider>
        </div>
      </div>
    </div>
  );
} 
