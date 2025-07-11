import React from 'react';
import { Upload, Search, FileText, MessageCircle, Download, HelpCircle } from 'lucide-react';

interface QuickActionsProps {
  onUploadClick: () => void;
  onNavigate: (page: string) => void;
  hasCompletedDocuments: boolean;
}

export function QuickActions({ onUploadClick, onNavigate, hasCompletedDocuments }: QuickActionsProps) {
  const actions = [
    {
      id: 'upload',
      title: 'Upload Document',
      description: 'Start a new translation',
      icon: Upload,
      color: 'bg-blue-600 hover:bg-blue-700',
      onClick: onUploadClick
    },
    {
      id: 'verify',
      title: 'Verify Document',
      description: 'Check document authenticity',
      icon: Search,
      color: 'bg-green-600 hover:bg-green-700',
      onClick: () => onNavigate('verify')
    },
    {
      id: 'translations',
      title: 'Translation Services',
      description: 'Learn about our services',
      icon: FileText,
      color: 'bg-purple-600 hover:bg-purple-700',
      onClick: () => onNavigate('translations')
    },
    {
      id: 'contact',
      title: 'Contact Support',
      description: 'Get help and support',
      icon: MessageCircle,
      color: 'bg-orange-600 hover:bg-orange-700',
      onClick: () => onNavigate('contact')
    }
  ];

  // Add download action if user has completed documents
  if (hasCompletedDocuments) {
    actions.splice(1, 0, {
      id: 'download',
      title: 'Download Translations',
      description: 'Access completed documents',
      icon: Download,
      color: 'bg-emerald-600 hover:bg-emerald-700',
      onClick: () => {
        // This would typically open a modal or navigate to downloads
        console.log('Download completed translations');
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h3>
        <p className="text-sm text-gray-600">Common tasks and shortcuts</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`${action.color} text-white p-4 rounded-lg transition-colors text-left group`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white group-hover:text-gray-100">
                    {action.title}
                  </p>
                  <p className="text-sm text-gray-100 group-hover:text-gray-200">
                    {action.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Help Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center space-x-3 text-gray-600">
          <HelpCircle className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">Need Help?</p>
            <p className="text-xs text-gray-500">
              Check our FAQ or contact support for assistance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}