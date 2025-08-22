import React from 'react';
import { Menu, User } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from './NotificationBell';
import type { CustomUser } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
  user: CustomUser;
  onLogout: () => void;
  onMobileMenuOpen: () => void;
  navItems: any[];
  title?: string;
  subtitle?: string;
}

export function AdminLayout({ 
  children, 
  user, 
  onLogout, 
  onMobileMenuOpen, 
  navItems,
  title = "Admin Dashboard",
  subtitle
}: AdminLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar - fixo */}
      <div className="hidden lg:block fixed left-0 top-0 h-full z-40">
        <Sidebar navItems={navItems} user={user} onLogout={onLogout} showLogo={true} />
      </div>
      
      {/* Main content area - com margem para a sidebar fixa */}
      <div className="flex-1 lg:ml-64 min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-2">
                <img 
                  src="/logo.png" 
                  alt="Lush America Translations" 
                  className="w-8 h-8 flex-shrink-0 object-contain"
                />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                  {subtitle && (
                    <p className="text-xs text-gray-600">{subtitle}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <NotificationBell />
              <button
                onClick={onMobileMenuOpen}
                className="p-2 text-gray-400 hover:text-gray-600"
                aria-label="Open menu"
                title="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Desktop header - fixo */}
        <div className="hidden lg:block fixed top-0 right-0 left-64 bg-white shadow-sm border-b border-gray-200 px-6 py-4 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Header left side - empty for now */}
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <button
                onClick={() => navigate('/finance/profile')}
                className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
                title="Go to Profile"
              >
                <User className="w-5 h-5" />
                <span className="text-sm font-medium">{user?.user_metadata?.name || 'User'}</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Content area - com padding-top para o header fixo */}
        <div className="pt-16 lg:pt-20 min-h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
