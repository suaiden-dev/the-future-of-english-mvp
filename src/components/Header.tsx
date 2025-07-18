import React from 'react';
import { User, LogOut, Shield, Home, FileText, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Page = 'home' | 'translations' | 'dashboard-customer' | 'admin' | 'verify' | 'login' | 'register';

interface HeaderProps {
  user: any | null; // Changed from UserType to any as UserType is no longer imported
  onLogout: () => void;
  currentPage?: Page;
}

export function Header({ user, onLogout, currentPage }: HeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-blue-900 hover:text-blue-700 transition-colors"
            >
              <img 
                src="/logo_tfoe.png" 
                alt="The Future of English Logo" 
                className="h-20 w-auto"
              />
            </button>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'home' 
                  ? 'bg-blue-50 text-blue-900' 
                  : 'text-gray-600 hover:text-blue-900'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
            
            <button
              onClick={() => navigate('/translations')}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'translations' 
                  ? 'bg-blue-50 text-blue-900' 
                  : 'text-gray-600 hover:text-blue-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Translations</span>
            </button>
            
            <button
              onClick={() => navigate('/verify')}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'verify' 
                  ? 'bg-blue-50 text-blue-900' 
                  : 'text-gray-600 hover:text-blue-900'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Verify Document</span>
            </button>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                {user.role === 'admin' && (
                  <button
                    onClick={() => navigate('/admin')}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === 'admin' 
                        ? 'bg-red-50 text-red-900' 
                        : 'text-gray-600 hover:text-red-900'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </button>
                )}
                
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'dashboard-customer' 
                      ? 'bg-blue-50 text-blue-900' 
                      : 'text-gray-600 hover:text-blue-900'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Welcome, {user.name || user.email}</span>
                                                                          <button
                    onClick={onLogout}
                    className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-sm font-medium text-blue-900 hover:text-blue-700 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md transition-colors"
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