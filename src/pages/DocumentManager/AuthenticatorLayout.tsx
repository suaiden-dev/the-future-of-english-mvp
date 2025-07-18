import React, { useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { useAuth } from '../../hooks/useAuth';
import AuthenticatorDashboard from './AuthenticatorDashboard';
import TranslatedDocuments from './TranslatedDocuments';
import AuthenticatorOverview from './AuthenticatorOverview';
import { FileText, CheckCircle, LogOut, Home, Menu, X } from 'lucide-react';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { NotificationBell } from '../../components/NotificationBell';
import { OverviewProvider } from '../../contexts/OverviewContext';

export default function AuthenticatorLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine current page from URL
  const getCurrentPage = () => {
    if (location.pathname.includes('/authenticate')) return 'authenticate';
    if (location.pathname.includes('/translated')) return 'translated';
    return 'overview';
  };

  const currentPage = getCurrentPage();

  console.log('[AuthenticatorLayout] Usuário:', user);
  console.log('[AuthenticatorLayout] Role:', user?.role);
  console.log('[AuthenticatorLayout] Current page:', currentPage);

  if (!user || (user.role !== 'authenticator' && user.role !== 'admin')) {
    console.log('[AuthenticatorLayout] Acesso negado - role:', user?.role);
    return <div>Access denied. Only authenticators can view this page.</div>;
  }

  const navItems = [
    {
      id: 'authenticate',
      label: 'Authenticate Documents',
      icon: FileText,
      page: 'authenticate'
    },
    {
      id: 'translated',
      label: 'Translated Documents',
      icon: CheckCircle,
      page: 'translated'
    }
  ];

  const handleLogout = () => {
    signOut();
  };

  const handleNavigation = (page: 'overview' | 'authenticate' | 'translated') => {
    if (page === 'overview') {
      navigate('/authenticator');
    } else if (page === 'authenticate') {
      navigate('/authenticator/authenticate');
    } else if (page === 'translated') {
      navigate('/authenticator/translated');
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
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TFE</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Menu</span>
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
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {user.role === 'admin' ? 'Administrator' : 'Authenticator'}
              </span>
            </div>
          )}
          
          {/* Navigation */}
          <nav className="space-y-2">
            <button
              onClick={() => handleNavigation('overview')}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                currentPage === 'overview'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Overview</span>
            </button>
            
            <button
              onClick={() => handleNavigation('authenticate')}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                currentPage === 'authenticate'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Authenticate Documents</span>
            </button>
            
            <button
              onClick={() => handleNavigation('translated')}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                currentPage === 'translated'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Translated Documents</span>
            </button>
          </nav>

          {/* Logout */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="w-5 h-5 text-red-500" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Menu */}
      <MobileMenu />

      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:block w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-6">
          <div className="mb-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 mb-4 focus:outline-none group hover:opacity-80 transition-opacity"
              aria-label="Ir para Home"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-red-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-sm">TFE</span>
              </div>
              <span className="text-lg font-bold text-gray-900 group-hover:underline">TheFutureOfEnglish</span>
            </button>
            {user && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{user.user_metadata?.name || 'Authenticator'}</p>
                <p className="text-xs text-gray-600">{user.email || ''}</p>
                <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                  user.role === 'admin'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {user.role === 'admin' ? 'Administrator' : 'Authenticator'}
                </span>
              </div>
            )}
          </div>
          
          {/* Navigation */}
          <nav className="space-y-2">
            <button
              onClick={() => navigate('/authenticator')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                currentPage === 'overview'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Overview</span>
            </button>
            
            <button
              onClick={() => navigate('/authenticator/authenticate')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                currentPage === 'authenticate'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
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
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Translated Documents</span>
            </button>
          </nav>

          {/* Logout */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="w-5 h-5 text-red-500" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-600"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">TFE</span>
                </div>
                <span className="text-lg font-bold text-gray-900">Authenticator</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <NotificationBell />
              {user && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.user_metadata?.name || 'Authenticator'}</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    user.role === 'admin'
                      ? 'bg-red-100 text-red-800'
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
          <OverviewProvider>
            <Routes>
              <Route path="/" element={<AuthenticatorOverview onNavigate={handleNavigation} />} />
              <Route path="/authenticate" element={<AuthenticatorDashboard />} />
              <Route path="/translated" element={<TranslatedDocuments />} />
            </Routes>
          </OverviewProvider>
        </div>
      </div>
    </div>
  );
} 