import { Menu } from 'lucide-react';
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
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo - Visible on all screen sizes */}
          <div className="flex items-center min-w-0 flex-shrink-0">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-1.5 sm:space-x-2 text-tfe-blue-950 hover:text-tfe-blue-700 transition-colors"
            >
                <img 
                  src="/logo_tfoe.png" 
                  alt="TFOE Logo" 
                  className="h-8 sm:h-10 w-auto object-contain" 
                />
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
          <nav className="hidden lg:flex pl-2 items-center space-x-3 xl:space-x-6 flex-1 justify-center">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center space-x-1 pl-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'mentorship' 
                  ? 'bg-tfe-blue-50 text-tfe-blue-950' 
                  : 'text-gray-600 hover:text-tfe-blue-950'
              }`}
            >
              <span>Home</span>
            </button>
            
            <button
              onClick={() => navigate('/translations')}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'translations' 
                  ? 'bg-tfe-blue-50 text-tfe-blue-950' 
                  : 'text-gray-600 hover:text-tfe-blue-950'
              }`}
            >
              <span>Translations</span>
            </button>
            
            <button
              onClick={() => navigate('/initial')}
              className={`flex items-center space-x-1 px-1 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/initial'
                  ? 'bg-tfe-blue-50 text-tfe-blue-950' 
                  : 'text-gray-600 hover:text-tfe-blue-950'
              }`}
            >
              <span>Initial</span>
            </button>
            
            <button
              onClick={() => navigate('/transfer')}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/transfer'
                  ? 'bg-tfe-blue-50 text-tfe-blue-950' 
                  : 'text-gray-600 hover:text-tfe-blue-950'
              }`}
            >
              <span>Transfer</span>
            </button>
            
            <button
              onClick={() => navigate('/cos')}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/cos'
                  ? 'bg-tfe-blue-50 text-tfe-blue-950' 
                  : 'text-gray-600 hover:text-tfe-blue-950'
              }`}
            >
              <span>COS</span>
            </button>
            
          </nav>

          {/* User Actions - Desktop only */}
          <div className="hidden lg:flex items-center space-x-4 xl:space-x-8 min-w-0">
            {user ? (
              <div className="flex items-center space-x-2 xl:space-x-4 min-w-0">
                
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`flex items-center space-x-1 px-3 xl:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'dashboard-customer' 
                      ? 'bg-tfe-blue-50 text-tfe-blue-950' 
                      : 'text-gray-600 hover:text-tfe-blue-950'
                  }`}
                >
                  <span>Dashboard</span>
                </button>
                
                <div className="flex items-center space-x-4 xl:space-x-6 min-w-0">
                  <LanguageSelector />
                  <span className="text-sm text-gray-600 truncate max-w-32 xl:max-w-48">
                    {t('dashboard.welcome')}, {user.user_metadata?.name || user.email}
                  </span>
                  <button
                    onClick={onLogout}
                    className="flex items-center space-x-1 px-2 xl:px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-tfe-red-600 transition-colors"
                  >
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