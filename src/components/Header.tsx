import { User, LogOut, Home, FileText, Search, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import LanguageSelector from './LanguageSelector';

type Page = 'mentorship' | 'translations' | 'dashboard-customer' | 'admin' | 'verify' | 'login' | 'register';

interface HeaderProps {
  user: any | null; // Changed from UserType to any as UserType is no longer imported
  onLogout: () => void;
  currentPage?: Page;
  onMobileMenuOpen?: () => void;
}

export function Header({ user, onLogout, currentPage, onMobileMenuOpen }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo - Visible on all screen sizes */}
          <div className="flex items-center min-w-0 flex-shrink-0">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-1.5 sm:space-x-2 text-tfe-blue-950 hover:text-tfe-blue-700 transition-colors"
            >
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-tfe-red-600 to-tfe-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs sm:text-sm">TFE</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-tfe-blue-950 hidden sm:block">
                  The Future of English
                </h3>
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
          <nav className="hidden lg:flex items-center space-x-2 xl:space-x-4 flex-1 justify-center">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center space-x-1 px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'mentorship' 
                  ? 'bg-tfe-blue-50 text-tfe-blue-950' 
                  : 'text-gray-600 hover:text-tfe-blue-950'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
            
            <button
              onClick={() => navigate('/translations')}
              className={`flex items-center space-x-1 px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'translations' 
                  ? 'bg-tfe-blue-50 text-tfe-blue-950' 
                  : 'text-gray-600 hover:text-tfe-blue-950'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Translations</span>
            </button>
            

            
            <button
              onClick={() => navigate('/verify')}
              className={`flex items-center space-x-1 px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'verify' 
                  ? 'bg-tfe-blue-50 text-tfe-blue-950' 
                  : 'text-gray-600 hover:text-tfe-blue-950'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Verify</span>
            </button>
          </nav>

          {/* User Actions - Desktop only */}
          <div className="hidden lg:flex items-center space-x-2 xl:space-x-4 min-w-0">
            {user ? (
              <div className="flex items-center space-x-2 xl:space-x-4 min-w-0">
                
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`flex items-center space-x-1 px-2 xl:px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'dashboard-customer' 
                      ? 'bg-tfe-blue-50 text-tfe-blue-950' 
                      : 'text-gray-600 hover:text-tfe-blue-950'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                
                                <div className="flex items-center space-x-2 min-w-0">
                  <LanguageSelector />
                  <span className="text-sm text-gray-600 truncate max-w-32 xl:max-w-48">
                    {t('dashboard.welcome')}, {user.user_metadata?.name || user.email}
                  </span>
                  <button
                    onClick={onLogout}
                    className="flex items-center space-x-1 px-2 xl:px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-tfe-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                                  <LanguageSelector />
                  <button
                    onClick={() => navigate('/login')}
                    className="px-3 xl:px-4 py-2 text-sm font-medium text-tfe-blue-950 hover:text-tfe-blue-700 transition-colors"
                  >
                    {t('navigation.login')}
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-3 xl:px-4 py-2 text-sm font-medium text-white bg-tfe-blue-950 hover:bg-tfe-blue-800 rounded-md transition-colors"
                  >
                    {t('navigation.register')}
                  </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}