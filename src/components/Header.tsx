import React from 'react';
import { User, LogOut, Shield, Home, FileText, Search, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Page = 'mentorship' | 'translations' | 'dashboard-customer' | 'admin' | 'verify' | 'login' | 'register';

interface HeaderProps {
  user: any | null; // Changed from UserType to any as UserType is no longer imported
  onLogout: () => void;
  currentPage?: Page;
  onMobileMenuOpen?: () => void;
}

export function Header({ user, onLogout, currentPage, onMobileMenuOpen }: HeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo - Visible on all screen sizes */}
          <div className="flex items-center min-w-0 flex-shrink-0 flex-1">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-1.5 sm:space-x-2 lg:space-x-3 text-tfe-blue-950 hover:text-tfe-blue-700 transition-colors"
            >
              <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2">
                <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-gradient-to-br from-tfe-red-600 to-tfe-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs sm:text-sm">TFE</span>
                </div>
                <h3 className="text-sm sm:text-base lg:text-xl font-bold truncate max-w-[120px] sm:max-w-[200px] lg:max-w-none">The Future of English</h3>
              </div>
            </button>
          </div>

          {/* Mobile Menu Button - Always visible on mobile */}
          <div className="flex items-center lg:hidden flex-shrink-0">
            <button
              onClick={() => {
                console.log('[Header] Mobile menu button clicked');
                if (onMobileMenuOpen) {
                  onMobileMenuOpen();
                } else {
                  console.warn('[Header] onMobileMenuOpen not provided');
                }
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open menu"
              title="Open menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Navigation - Hidden on mobile and small tablets */}
          <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center space-x-1 px-2 xl:px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'mentorship' 
                  ? 'bg-tfe-blue-50 text-tfe-blue-950' 
                  : 'text-gray-600 hover:text-tfe-blue-950'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden xl:inline">Mentorship</span>
            </button>
            
            <button
              onClick={() => navigate('/translations')}
              className={`flex items-center space-x-1 px-2 xl:px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'translations' 
                  ? 'bg-tfe-blue-50 text-tfe-blue-950' 
                  : 'text-gray-600 hover:text-tfe-blue-950'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden xl:inline">Translations</span>
            </button>
            
            <button
              onClick={() => navigate('/verify')}
              className={`flex items-center space-x-1 px-2 xl:px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'verify' 
                  ? 'bg-tfe-blue-50 text-tfe-blue-950' 
                  : 'text-gray-600 hover:text-tfe-blue-950'
              }`}
            >
              <Search className="w-4 h-4" />
              <span className="hidden xl:inline">Verify</span>
            </button>
          </nav>

          {/* User Actions - Desktop only */}
          <div className="hidden lg:flex items-center space-x-2 xl:space-x-4 min-w-0">
            {user ? (
              <div className="flex items-center space-x-2 xl:space-x-4 min-w-0">
                {user.role === 'admin' && (
                  <button
                    onClick={() => navigate('/admin')}
                    className={`flex items-center space-x-1 px-2 xl:px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === 'admin' 
                        ? 'bg-tfe-red-50 text-tfe-red-950' 
                        : 'text-gray-600 hover:text-tfe-red-950'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden xl:inline">Admin</span>
                  </button>
                )}
                
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`flex items-center space-x-1 px-2 xl:px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'dashboard-customer' 
                      ? 'bg-tfe-blue-50 text-tfe-blue-950' 
                      : 'text-gray-600 hover:text-tfe-blue-950'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="hidden xl:inline">Dashboard</span>
                </button>
                
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-sm text-gray-600 truncate max-w-32 xl:max-w-48">
                    Welcome, {user.user_metadata?.name || user.email}
                  </span>
                  <button
                    onClick={onLogout}
                    className="flex items-center space-x-1 px-2 xl:px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-tfe-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden xl:inline">Logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate('/login')}
                  className="px-3 xl:px-4 py-2 text-sm font-medium text-tfe-blue-950 hover:text-tfe-blue-700 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-3 xl:px-4 py-2 text-sm font-medium text-white bg-tfe-blue-950 hover:bg-tfe-blue-800 rounded-md transition-colors"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}