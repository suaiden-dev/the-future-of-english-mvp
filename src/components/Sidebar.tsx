import React from 'react';
import { LogOut, User } from 'lucide-react';
import type { CustomUser } from '../hooks/useAuth';
import { FileText as FileTextIcon } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Upload } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  page: string;
}

interface SidebarProps {
  navItems: NavItem[];
  user: CustomUser | null;
  onLogout: () => void;
}

export function Sidebar({ navItems, user, onLogout }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  console.log('DEBUG: Sidebar renderizada com navItems:', navItems);
  console.log('DEBUG: User role:', user?.role);

  const handleNavigation = (page: string) => {
    console.log('DEBUG: Navegando para:', page);
    if (page.startsWith('/')) {
      navigate(page);
    } else {
      navigate(`/${page}`);
    }
  };

  const isActivePage = (page: string) => {
    if (page.startsWith('/')) {
      return location.pathname === page;
    }
    return location.pathname === `/${page}`;
  };

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex justify-center mb-4">
          <button
            onClick={() => navigate('/')}
              className="focus:outline-none group"
            aria-label="Ir para Home"
          >
              <img 
                src="/logo_tfoe.png" 
                alt="The Future of English Logo" 
                className="h-24 w-auto group-hover:scale-105 transition-transform"
              />
            </button>
            </div>
          {user && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{user.user_metadata?.name || 'Usuário'}</p>
              <p className="text-xs text-gray-600">{user.email || ''}</p>
              <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                user.role === 'admin'
                  ? 'bg-red-100 text-red-800'
                  : user.role === 'authenticator'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {user.role === 'admin'
                  ? 'Administrator'
                  : user.role === 'authenticator'
                  ? 'Authenticator'
                  : 'User'}
              </span>
            </div>
          )}
        </div>
        <nav className="space-y-2">
          {/* Renderizar itens de navegação dinâmicos */}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePage(item.page);
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.page)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-900 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}

          {/* Seção de logout e voltar para home */}
          {user && (
            <div className="mt-8 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  console.log('[Sidebar] Navegando para / (Back to Home)');
                  navigate('/');
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900 mb-2"
              >
                <FileTextIcon className="w-5 h-5 text-gray-400" />
                <span className="font-medium">Back to Home</span>
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="w-5 h-5 text-red-500" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}