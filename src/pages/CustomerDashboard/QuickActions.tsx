import React from 'react';
import { Upload, Search, FileText, MessageCircle, Download, HelpCircle, ArrowUpRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';

interface QuickActionsProps {
  onUploadClick: () => void;
  hasCompletedDocuments: boolean;
}

export function QuickActions({ onUploadClick, hasCompletedDocuments }: QuickActionsProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  
  const actions = [
    {
      id: 'upload',
      title: t('dashboard.quickActions.actions.upload.title'),
      description: t('dashboard.quickActions.actions.upload.description'),
      icon: Upload,
      color: 'bg-gradient-to-br from-blue-500 to-tfe-red-950 hover:from-blue-600 hover:to-blue-700',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
      onClick: onUploadClick
    },
    {
      id: 'verify',
      title: t('dashboard.quickActions.actions.verify.title'),
      description: t('dashboard.quickActions.actions.verify.description'),
      icon: Search,
      color: 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
      onClick: () => navigate('/verify')
    },
    {
      id: 'translations',
      title: t('dashboard.quickActions.actions.translations.title'),
      description: t('dashboard.quickActions.actions.translations.description'),
      icon: FileText,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
      onClick: () => navigate('/translations')
    },
    {
      id: 'contact',
      title: t('dashboard.quickActions.actions.contact.title'),
      description: t('dashboard.quickActions.actions.contact.description'),
      icon: MessageCircle,
      color: 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
      onClick: () => {
        // Placeholder for contact support
        console.log('Contact support clicked');
      }
    }
  ];

  // Add download action if user has completed documents
  if (hasCompletedDocuments) {
    actions.splice(1, 0, {
      id: 'download',
      title: t('dashboard.quickActions.actions.download.title'),
      description: t('dashboard.quickActions.actions.download.description'),
      icon: Download,
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
      onClick: () => {
        // This would typically open a modal or navigate to downloads
        console.log('Download completed translations');
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('dashboard.quickActions.title')}</h3>
        <p className="text-lg text-gray-600">{t('dashboard.quickActions.description')}</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`${action.color} ${action.textColor} p-5 rounded-xl transition-all duration-200 text-left group hover:shadow-lg hover:scale-[1.02] transform`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`${action.iconBg} p-2 rounded-lg`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1 group-hover:text-gray-100">
                  {action.title}
                </h4>
                <p className="text-sm text-white/80 group-hover:text-white/90 leading-relaxed">
                  {action.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-tfe-blue-100">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-2 h-2 bg-tfe-blue-500 rounded-full"></div>
            <span className="text-xs font-medium text-tfe-blue-700 uppercase tracking-wide">{t('dashboard.quickActions.stats.pricing')}</span>
          </div>
          <div className="text-2xl font-bold text-tfe-blue-950">$20</div>
          <div className="text-sm text-tfe-blue-600">{t('dashboard.quickActions.stats.perPage')}</div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs font-medium text-green-700 uppercase tracking-wide">{t('dashboard.quickActions.stats.turnaround')}</span>
          </div>
          <div className="text-2xl font-bold text-green-900">24-48h</div>
          <div className="text-sm text-green-600">{t('dashboard.quickActions.stats.deliveryTime')}</div>
        </div>
      </div>
      
      {/* Features List */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('dashboard.quickActions.features.title')}</h4>
        {[
          t('dashboard.quickActions.features.list.uscisAccepted'),
          t('dashboard.quickActions.features.list.officialCertification'),
          t('dashboard.quickActions.features.list.digitalVerification'),
          t('dashboard.quickActions.features.list.support')
        ].map((feature, index) => (
          <div key={index} className="flex items-center space-x-3">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">{feature}</span>
          </div>
        ))}
      </div>
      
      {/* Help Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-start space-x-3">
          <div className="bg-gray-100 p-2 rounded-lg">
            <HelpCircle className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 mb-1">{t('dashboard.quickActions.help.title')}</p>
            <p className="text-xs text-gray-600 mb-3">
              {t('dashboard.quickActions.help.description')}
            </p>
            <div className="flex space-x-2">
              <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md transition-colors">
                {t('dashboard.quickActions.help.buttons.viewFaq')}
              </button>
              <button 
                onClick={() => {
                  // Placeholder for contact support
                  console.log('Contact support clicked');
                }}
                className="text-xs bg-tfe-blue-100 hover:bg-tfe-blue-200 text-tfe-blue-700 px-3 py-1 rounded-md transition-colors"
              >
                {t('dashboard.quickActions.help.buttons.contactSupport')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}