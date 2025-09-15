import React from 'react';
import { useI18n } from '../contexts/I18nContext';

export const TranslationTest: React.FC = () => {
  const { t, currentLanguage, changeLanguage } = useI18n();

  return (
    <div className="p-4 bg-gray-100 rounded-lg m-4">
      <h3 className="text-lg font-bold mb-4">Translation Test</h3>
      
      <div className="mb-4">
        <p><strong>Current Language:</strong> {currentLanguage}</p>
        <p><strong>Welcome:</strong> {t('dashboard.welcome')}</p>
        <p><strong>Dashboard:</strong> {t('navigation.dashboard')}</p>
        <p><strong>Documents:</strong> {t('navigation.documents')}</p>
      </div>

      <div className="space-x-2">
        <button
          onClick={() => changeLanguage('en')}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          English
        </button>
        <button
          onClick={() => changeLanguage('pt')}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Português
        </button>
        <button
          onClick={() => changeLanguage('es')}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Español
        </button>
      </div>
    </div>
  );
};
