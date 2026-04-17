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
      color: 'bg-[#C71B2D] hover:bg-[#A01624]',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
      shadow: 'hover:shadow-[0_0_40px_rgba(199,27,45,0.4)]',
      onClick: onUploadClick
    },
    {
      id: 'verify',
      title: t('dashboard.quickActions.actions.verify.title'),
      description: t('dashboard.quickActions.actions.verify.description'),
      icon: Search,
      color: 'bg-[#163353] hover:bg-[#0F2340]',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
      shadow: 'hover:shadow-[0_0_40px_rgba(22,51,83,0.4)]',
      onClick: () => navigate('/verify')
    },
    {
      id: 'translations',
      title: t('dashboard.quickActions.actions.translations.title'),
      description: t('dashboard.quickActions.actions.translations.description'),
      icon: FileText,
      color: 'bg-[#163353] hover:bg-[#0F2340]',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
      shadow: 'hover:shadow-[0_0_40px_rgba(22,51,83,0.4)]',
      onClick: () => navigate('/translations')
    },
    {
      id: 'contact',
      title: t('dashboard.quickActions.actions.contact.title'),
      description: t('dashboard.quickActions.actions.contact.description'),
      icon: MessageCircle,
      color: 'bg-slate-700 hover:bg-slate-600',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
      shadow: 'hover:shadow-[0_0_30px_rgba(100,116,139,0.3)]',
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
      color: 'bg-emerald-600 hover:bg-emerald-700',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
      shadow: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.4)]',
      onClick: () => {
        // This would typically open a modal or navigate to downloads
        console.log('Download completed translations');
      }
    });
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[30px] shadow-sm border border-gray-200 shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-black text-gray-900 mb-2">{t('dashboard.quickActions.title')}</h3>
        <p className="text-lg text-gray-600">{t('dashboard.quickActions.description')}</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`${action.color} ${action.textColor} ${action.shadow} p-5 rounded-2xl transition-all duration-200 text-left group hover:scale-105 transform`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`${action.iconBg} p-2 rounded-lg backdrop-blur-sm`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <h4 className="font-bold text-white mb-1 group-hover:text-gray-100">
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
        <div className="bg-gray-50/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-2 h-2 bg-[#C71B2D] rounded-full"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('dashboard.quickActions.stats.pricing')}</span>
          </div>
          <div className="text-2xl font-black text-gray-900">$20</div>
          <div className="text-sm text-gray-600">{t('dashboard.quickActions.stats.perPage')}</div>
        </div>
        
        <div className="bg-gray-50/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('dashboard.quickActions.stats.turnaround')}</span>
          </div>
          <div className="text-2xl font-black text-gray-900">24-48h</div>
          <div className="text-sm text-gray-600">{t('dashboard.quickActions.stats.deliveryTime')}</div>
        </div>
      </div>
      
      {/* Features List */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">{t('dashboard.quickActions.features.title')}</h4>
        {[
          t('dashboard.quickActions.features.list.officialCertification'),
          t('dashboard.quickActions.features.list.digitalVerification'),
          t('dashboard.quickActions.features.list.support')
        ].map((feature, index) => (
          <div key={index} className="flex items-center space-x-3">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">{feature}</span>
          </div>
        ))}
      </div>
      
    </div>
  );
}