import React from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from './NotificationBell';
import type { CustomUser } from '../hooks/useAuth';

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
  return (
    <div className="flex flex-col lg:flex-row">
      {/* Mobile header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-tfe-red-600 to-tfe-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TFE</span>
              </div>
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
      
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar navItems={navItems} user={user} onLogout={onLogout} />
      </div>
      
      {/* Main content */}
      <main className="flex-1 lg:ml-0">
        {children}
      </main>
    </div>
  );
}
