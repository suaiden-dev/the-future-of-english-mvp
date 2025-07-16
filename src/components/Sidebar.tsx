import React from 'react';
import { LogOut, User } from 'lucide-react';
import type { CustomUser } from '../hooks/useAuth';
import { FileText as FileTextIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 mb-4 focus:outline-none group"
            aria-label="Ir para Home"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-red-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-sm">TFE</span>
            </div>
            <span className="text-lg font-bold text-gray-900 group-hover:underline">TheFutureOfEnglish</span>
          </button>
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
          {user && user.role === 'user' && (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M13 5v6h6m-6 0v6m0 0H7m6 0h6" /></svg>
                <span className="font-medium">Overview</span>
              </button>
              <button
                onClick={() => navigate('/dashboard/my-documents')}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5" /></svg>
                <span className="font-medium">My Documents</span>
              </button>
              <button
                onClick={() => navigate('/dashboard/upload')}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="font-medium">Upload Document</span>
              </button>
              <button
                onClick={() => navigate('/dashboard/profile')}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <User className="w-5 h-5 text-gray-400" />
                <span className="font-medium">Profile</span>
              </button>
            </>
          )}
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