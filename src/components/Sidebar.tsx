import { LogOut, User, ChevronDown, ChevronRight } from 'lucide-react';
import type { CustomUser } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  page: string;
}

interface SidebarProps {
  navItems: NavItem[];
  user: CustomUser | null;
  onLogout: () => void;
  showLogo?: boolean;
}

export function Sidebar({ navItems, user, onLogout, showLogo = true }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (page: string) => {
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
    <div className="w-72 bg-white border-r border-slate-100 h-screen flex flex-col sticky top-0 overflow-hidden">
      {/* Top Section / Logo */}
      <div className="p-8 pb-4">
        {showLogo && (
          <div className="mb-8 flex justify-center">
            <button
              onClick={() => navigate('/')}
              className="focus:outline-none transition-transform hover:scale-105 active:scale-95"
              aria-label="Go to Home"
            >
              <img 
                src="/logo_tfoe.png" 
                alt="TFOE Logo" 
                className="h-24 w-auto object-contain" 
              />
            </button>
          </div>
        )}
      </div>

      {/* Navigation section */}
      <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
        <nav className="space-y-2">
          {navItems && navItems.length > 0 && navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePage(item.page);
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.page)}
                className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 relative hover:scale-[1.02] active:scale-[0.98] ${
                  isActive
                    ? 'bg-slate-50 text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
                }`}
              >
                {/* Active Indicator Strip */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C71B2D] rounded-r-md shadow-[0_0_10px_rgba(199,27,45,0.3)] animate-in slide-in-from-left-1 duration-300" />
                )}

                <div className="flex items-center gap-4">
                  {Icon && (
                    <div className={`transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-[#163353]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  )}
                  <span className={`text-[15px] tracking-tight transition-all duration-300 ${isActive ? 'font-bold' : 'font-medium group-hover:pl-0.5'}`}>
                    {item.label}
                  </span>
                </div>

                {!isActive ? (
                   <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
                ) : (
                   <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Section (Footer style as in premium dashboards) */}
      {user && (
        <div className="p-4 mt-auto border-t border-slate-100 bg-white">
          <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-50 mb-3">
             <div className="w-10 h-10 bg-[#163353] rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-[#163353]/10">
                <User className="w-5 h-5" />
             </div>
             <div className="flex-1 min-w-0 pr-2">
                <p className="text-[12px] font-bold text-slate-900 truncate tracking-tight">{user.user_metadata?.name || 'Guest User'}</p>
                <p className="text-[10px] text-slate-400 truncate tracking-wide uppercase">{user.role || 'User'}</p>
             </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-[18px] transition-all duration-300 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-[#C71B2D]/5 hover:text-[#C71B2D] active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminate Session</span>
          </button>
        </div>
      )}
    </div>
  );
}