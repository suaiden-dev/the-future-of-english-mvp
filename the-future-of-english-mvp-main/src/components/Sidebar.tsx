import React from 'react';
import { LogOut, User } from 'lucide-react';
import { User as UserType, Document, Folder } from '../App';
import { FolderOpen, FileText as FileTextIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  page: any;
}

interface SidebarProps {
  navItems: NavItem[];
  onNavigate: (page: any) => void;
  currentPage: string;
  user: UserType | null;
  onLogout: () => void;
}

export function Sidebar({ navItems, onNavigate, currentPage, user, onLogout }: SidebarProps) {
  const dashboardNavItems = [
    { id: 'overview', label: 'Overview', icon: User, page: 'dashboard-customer' },
    { id: 'documents', label: 'My Documents', icon: FolderOpen, page: 'documents' },
    { id: 'upload', label: 'Upload', icon: FileTextIcon, page: 'upload' },
    { id: 'translations', label: 'Translations', icon: FileTextIcon, page: 'translations' },
    { id: 'verify', label: 'Verify Document', icon: FileTextIcon, page: 'verify' },
  ];

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TFE</span>
            </div>
            <span className="text-lg font-bold text-gray-900">TheFutureOfEnglish</span>
          </div>
          {user && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-600">{user.email}</p>
              <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {user.role === 'admin' ? 'Administrator' : 'User'}
              </span>
            </div>
          )}
        </div>
        
        <nav className="space-y-2">
          {dashboardNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.page)}
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
          
          {user && (
            <div className="mt-8 pt-4 border-t border-gray-200">
              <button
                onClick={() => onNavigate('home')}
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