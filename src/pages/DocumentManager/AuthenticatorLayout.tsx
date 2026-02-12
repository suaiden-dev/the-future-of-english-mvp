import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AuthenticatorDashboard from './AuthenticatorDashboard';
import TranslatedDocuments from './TranslatedDocuments';
import AuthenticatorOverview from './AuthenticatorOverview';
import AuthenticatorUpload from './AuthenticatorUpload';
import AuthenticatorFailedUploads from './AuthenticatorFailedUploads';
import { FileText, CheckCircle, LogOut, Menu, X, User, Upload, Home as HomeIcon, AlertTriangle, ShieldCheck, ChevronRight, ChevronDown } from 'lucide-react';
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Menu */}
      <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-r border-slate-100">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2">
              <img
                src="/logo_tfoe.png"
                alt="TFOE Logo"
                className="h-12 w-auto flex-shrink-0 object-contain"
              />
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4">
          {/* User Info */}
          {user && (
            <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-50 mb-6">
              <div className="w-10 h-10 bg-[#163353] rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-[#163353]/10">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-slate-900 truncate tracking-tight">{user.user_metadata?.name || 'Authenticator'}</p>
                <p className="text-[10px] text-slate-400 truncate tracking-wide uppercase">{user.role === 'admin' ? 'Administrator' : 'Authenticator'}</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="space-y-2 mb-4">
            <button
              onClick={() => {
                navigate('/authenticator');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 relative hover:scale-[1.02] active:scale-[0.98] ${
                currentPage === 'overview'
                  ? 'bg-slate-50 text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
              }`}
            >
              {currentPage === 'overview' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C71B2D] rounded-r-md shadow-[0_0_10px_rgba(199,27,45,0.3)]" />
              )}
              <div className="flex items-center gap-4">
                <div className={`transition-all duration-300 ${currentPage === 'overview' ? 'text-[#163353]' : 'text-slate-400'}`}>
                  <HomeIcon className="w-5 h-5" />
                </div>
                <span className={`text-[15px] tracking-tight transition-all duration-300 ${currentPage === 'overview' ? 'font-bold' : 'font-medium'}`}>
                  Overview
                </span>
              </div>
              {currentPage !== 'overview' ? (
                <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all duration-300" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <button
              onClick={() => {
                navigate('/authenticator/authenticate');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 relative hover:scale-[1.02] active:scale-[0.98] ${
                currentPage === 'authenticate'
                  ? 'bg-slate-50 text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
              }`}
            >
              {currentPage === 'authenticate' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C71B2D] rounded-r-md shadow-[0_0_10px_rgba(199,27,45,0.3)]" />
              )}
              <div className="flex items-center gap-4">
                <div className={`transition-all duration-300 ${currentPage === 'authenticate' ? 'text-[#163353]' : 'text-slate-400'}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <span className={`text-[15px] tracking-tight transition-all duration-300 ${currentPage === 'authenticate' ? 'font-bold' : 'font-medium'}`}>
                  Authenticate Documents
                </span>
              </div>
              {currentPage !== 'authenticate' ? (
                <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all duration-300" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <button
              onClick={() => {
                navigate('/authenticator/translated');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 relative hover:scale-[1.02] active:scale-[0.98] ${
                currentPage === 'translated'
                  ? 'bg-slate-50 text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
              }`}
            >
              {currentPage === 'translated' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C71B2D] rounded-r-md shadow-[0_0_10px_rgba(199,27,45,0.3)]" />
              )}
              <div className="flex items-center gap-4">
                <div className={`transition-all duration-300 ${currentPage === 'translated' ? 'text-[#163353]' : 'text-slate-400'}`}>
                  <CheckCircle className="w-5 h-5" />
                </div>
                <span className={`text-[15px] tracking-tight transition-all duration-300 ${currentPage === 'translated' ? 'font-bold' : 'font-medium'}`}>
                  Translated Documents
                </span>
              </div>
              {currentPage !== 'translated' ? (
                <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all duration-300" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <button
              onClick={() => {
                navigate('/authenticator/upload');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 relative hover:scale-[1.02] active:scale-[0.98] ${
                currentPage === 'upload'
                  ? 'bg-slate-50 text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
              }`}
            >
              {currentPage === 'upload' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C71B2D] rounded-r-md shadow-[0_0_10px_rgba(199,27,45,0.3)]" />
              )}
              <div className="flex items-center gap-4">
                <div className={`transition-all duration-300 ${currentPage === 'upload' ? 'text-[#163353]' : 'text-slate-400'}`}>
                  <Upload className="w-5 h-5" />
                </div>
                <span className={`text-[15px] tracking-tight transition-all duration-300 ${currentPage === 'upload' ? 'font-bold' : 'font-medium'}`}>
                  Upload Document
                </span>
              </div>
              {currentPage !== 'upload' ? (
                <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all duration-300" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <button
              onClick={() => {
                navigate('/authenticator/failed-uploads');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 relative hover:scale-[1.02] active:scale-[0.98] ${
                currentPage === 'failed-uploads'
                  ? 'bg-slate-50 text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
              }`}
            >
              {currentPage === 'failed-uploads' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C71B2D] rounded-r-md shadow-[0_0_10px_rgba(199,27,45,0.3)]" />
              )}
              <div className="flex items-center gap-4">
                <div className={`transition-all duration-300 ${currentPage === 'failed-uploads' ? 'text-[#163353]' : 'text-slate-400'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className={`text-[15px] tracking-tight transition-all duration-300 ${currentPage === 'failed-uploads' ? 'font-bold' : 'font-medium'}`}>
                  Failed Uploads
                </span>
              </div>
              {currentPage !== 'failed-uploads' ? (
                <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all duration-300" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </nav>

          {/* Logout */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-[18px] transition-all duration-300 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-[#C71B2D]/5 hover:text-[#C71B2D] active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>Terminate Session</span>
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
        <div className="flex flex-col h-screen bg-white border-r border-slate-100 overflow-hidden">
          {/* Logo */}
          <div className="p-8 pb-4">
            <div className="mb-4 flex justify-center">
              <button
                onClick={() => navigate('/authenticator')}
                className="focus:outline-none transition-transform hover:scale-105 active:scale-95"
                aria-label="Go to Overview"
              >
                <img
                  src="/logo_tfoe.png"
                  alt="TFOE Logo"
                  className="h-20 w-auto object-contain"
                />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
            <nav className="space-y-2">
              <button
                onClick={() => navigate('/authenticator')}
                className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 relative hover:scale-[1.02] active:scale-[0.98] ${
                  currentPage === 'overview'
                    ? 'bg-slate-50 text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
                }`}
              >
                {/* Active Indicator Strip */}
                {currentPage === 'overview' && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C71B2D] rounded-r-md shadow-[0_0_10px_rgba(199,27,45,0.3)] animate-in slide-in-from-left-1 duration-300" />
                )}

                <div className="flex items-center gap-4">
                  <div className={`transition-all duration-300 group-hover:scale-110 ${currentPage === 'overview' ? 'text-[#163353]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                    <HomeIcon className="w-5 h-5" />
                  </div>
                  <span className={`text-[15px] tracking-tight transition-all duration-300 ${currentPage === 'overview' ? 'font-bold' : 'font-medium group-hover:pl-0.5'}`}>
                    Overview
                  </span>
                </div>

                {currentPage !== 'overview' ? (
                  <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <button
                onClick={() => navigate('/authenticator/authenticate')}
                className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 relative hover:scale-[1.02] active:scale-[0.98] ${
                  currentPage === 'authenticate'
                    ? 'bg-slate-50 text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
                }`}
              >
                {currentPage === 'authenticate' && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C71B2D] rounded-r-md shadow-[0_0_10px_rgba(199,27,45,0.3)] animate-in slide-in-from-left-1 duration-300" />
                )}

                <div className="flex items-center gap-4">
                  <div className={`transition-all duration-300 group-hover:scale-110 ${currentPage === 'authenticate' ? 'text-[#163353]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className={`text-[15px] tracking-tight transition-all duration-300 ${currentPage === 'authenticate' ? 'font-bold' : 'font-medium group-hover:pl-0.5'}`}>
                    Authenticate Documents
                  </span>
                </div>

                {currentPage !== 'authenticate' ? (
                  <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <button
                onClick={() => navigate('/authenticator/translated')}
                className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 relative hover:scale-[1.02] active:scale-[0.98] ${
                  currentPage === 'translated'
                    ? 'bg-slate-50 text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
                }`}
              >
                {currentPage === 'translated' && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C71B2D] rounded-r-md shadow-[0_0_10px_rgba(199,27,45,0.3)] animate-in slide-in-from-left-1 duration-300" />
                )}

                <div className="flex items-center gap-4">
                  <div className={`transition-all duration-300 group-hover:scale-110 ${currentPage === 'translated' ? 'text-[#163353]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <span className={`text-[15px] tracking-tight transition-all duration-300 ${currentPage === 'translated' ? 'font-bold' : 'font-medium group-hover:pl-0.5'}`}>
                    Translated Documents
                  </span>
                </div>

                {currentPage !== 'translated' ? (
                  <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <button
                onClick={() => navigate('/authenticator/upload')}
                className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 relative hover:scale-[1.02] active:scale-[0.98] ${
                  currentPage === 'upload'
                    ? 'bg-slate-50 text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
                }`}
              >
                {currentPage === 'upload' && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C71B2D] rounded-r-md shadow-[0_0_10px_rgba(199,27,45,0.3)] animate-in slide-in-from-left-1 duration-300" />
                )}

                <div className="flex items-center gap-4">
                  <div className={`transition-all duration-300 group-hover:scale-110 ${currentPage === 'upload' ? 'text-[#163353]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className={`text-[15px] tracking-tight transition-all duration-300 ${currentPage === 'upload' ? 'font-bold' : 'font-medium group-hover:pl-0.5'}`}>
                    Upload Document
                  </span>
                </div>

                {currentPage !== 'upload' ? (
                  <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <button
                onClick={() => navigate('/authenticator/failed-uploads')}
                className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 relative hover:scale-[1.02] active:scale-[0.98] ${
                  currentPage === 'failed-uploads'
                    ? 'bg-slate-50 text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
                }`}
              >
                {currentPage === 'failed-uploads' && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C71B2D] rounded-r-md shadow-[0_0_10px_rgba(199,27,45,0.3)] animate-in slide-in-from-left-1 duration-300" />
                )}

                <div className="flex items-center gap-4">
                  <div className={`transition-all duration-300 group-hover:scale-110 ${currentPage === 'failed-uploads' ? 'text-[#163353]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span className={`text-[15px] tracking-tight transition-all duration-300 ${currentPage === 'failed-uploads' ? 'font-bold' : 'font-medium group-hover:pl-0.5'}`}>
                    Failed Uploads
                  </span>
                </div>

                {currentPage !== 'failed-uploads' ? (
                  <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </nav>
          </div>

          {/* User Section (Footer) */}
          {user && (
            <div className="p-4 mt-auto border-t border-slate-100 bg-white">
              <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-50 mb-3">
                <div className="w-10 h-10 bg-[#163353] rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-[#163353]/10">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-[12px] font-bold text-slate-900 truncate tracking-tight">{user.user_metadata?.name || 'Authenticator'}</p>
                  <p className="text-[10px] text-slate-400 truncate tracking-wide uppercase">{user.role === 'admin' ? 'Administrator' : 'Authenticator'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-[18px] transition-all duration-300 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-[#C71B2D]/5 hover:text-[#C71B2D] active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Terminate Session</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-72">
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
