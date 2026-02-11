import React from 'react';
import { Menu, User, ShieldCheck } from 'lucide-react';
import { Sidebar } from './Sidebar';
import type { CustomUser } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import LanguageSelector from './LanguageSelector';

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
      <div className="flex-1 lg:ml-72 min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-2">
                <img 
                  src="/logo_tfoe.png" 
                  alt="TFOE Logo" 
                  className="h-10 w-auto flex-shrink-0 object-contain"
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
        <div className="hidden lg:block bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm">
                 <ShieldCheck className="w-6 h-6 text-[#163353]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-slate-500 font-medium">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-5">
              <div className="pr-2 border-r border-slate-100">
                <LanguageSelector />
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/finance/profile')}
                  className="flex items-center space-x-3 p-2 pr-4 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100 shadow-sm group"
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
        
        {/* Content area - com padding-top para o header fixo */}
        <div className="min-h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
