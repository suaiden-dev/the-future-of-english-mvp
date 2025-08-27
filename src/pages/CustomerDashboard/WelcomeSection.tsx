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
    <div className="bg-gradient-to-r from-tfe-blue-950 to-red-600 text-white rounded-2xl p-8 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">{t('dashboard.welcomeBack')}, {user?.user_metadata?.name || t('common.user')}!</h1>
              <p className="text-tfe-blue-100 text-lg">{user?.email}</p>
            </div>
          </div>
          <p className="text-tfe-blue-100 mb-6 max-w-2xl text-lg leading-relaxed">
            {t('dashboard.uploadDescription')}
          </p>
        </div>
        <div className="hidden md:block flex items-center gap-4">
          <button
            onClick={onUploadClick}
            className="bg-white text-tfe-blue-950 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>{t('documents.uploadDocument')}</span>
          </button>
        </div>
      </div>
      
      {/* Mobile upload button */}
      <div className="md:hidden mt-4 flex items-center gap-4">
        <button
          onClick={onUploadClick}
          className="flex-1 bg-white text-tfe-blue-950 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
        >
          <Upload className="w-5 h-5" />
          <span>{t('documents.uploadDocument')}</span>
        </button>
      </div>
    </div>
  );
}