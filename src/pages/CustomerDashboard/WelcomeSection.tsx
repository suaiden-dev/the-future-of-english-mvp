import React from 'react';
import { User, Upload } from 'lucide-react';
import { CustomUser } from '../../hooks/useAuth';
import { useI18n } from '../../contexts/I18nContext';

interface WelcomeSectionProps {
  user: CustomUser | null;
  onUploadClick: () => void;
}

export function WelcomeSection({ user, onUploadClick }: WelcomeSectionProps) {
  const { t } = useI18n();
  return (
    <div className="relative bg-white/80 backdrop-blur-xl rounded-[30px] p-8 mb-8 border border-gray-200 shadow-lg overflow-hidden">
      {/* Decorative accent blob */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#C71B2D]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#163353]/5 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-[#C71B2D]/10 backdrop-blur-sm rounded-full flex items-center justify-center mr-4 border border-[#C71B2D]/20">
              <User className="w-6 h-6 text-[#C71B2D]" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900">{t('dashboard.welcomeBack')}, {user?.user_metadata?.name || t('common.user')}!</h1>
            </div>
          </div>
          <p className="text-gray-600 mb-6 max-w-2xl text-lg leading-relaxed">
            {t('dashboard.uploadDescription')}
          </p>
        </div>
        <div className="hidden md:block flex items-center gap-4">
          <button
            onClick={onUploadClick}
            className="relative bg-[#C71B2D] hover:bg-[#A01624] text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider transition-all hover:scale-105 hover:shadow-[0_8px_30px_rgba(199,27,45,0.3)] flex items-center space-x-2 overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            <Upload className="w-5 h-5 relative z-10" />
            <span className="relative z-10">{t('documents.uploadDocument')}</span>
          </button>
        </div>
      </div>
      
      {/* Mobile upload button */}
      <div className="md:hidden mt-4 flex items-center gap-4">
        <button
          onClick={onUploadClick}
          className="relative flex-1 bg-[#C71B2D] hover:bg-[#A01624] text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider transition-all hover:scale-105 hover:shadow-[0_8px_30px_rgba(199,27,45,0.3)] flex items-center justify-center space-x-2 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
          <Upload className="w-5 h-5 relative z-10" />
          <span className="relative z-10">{t('documents.uploadDocument')}</span>
        </button>
      </div>
    </div>
  );
}