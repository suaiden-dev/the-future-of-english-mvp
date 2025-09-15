import React from 'react';
import { useI18n } from '../contexts/I18nContext';

export const SimpleTranslationTest: React.FC = () => {
  const { t, currentLanguage, changeLanguage } = useI18n();

  return (
    <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-lg m-4">
      <h3 className="text-lg font-bold mb-4 text-yellow-800">🔍 Translation Test</h3>
      
      <div className="mb-4 space-y-2">
        <p><strong>🌐 Current Language:</strong> {currentLanguage}</p>
        <p><strong>📝 Test Key:</strong> {t('about.title')}</p>
        <p><strong>🔤 Raw Result:</strong> "{t('about.title')}"</p>
        <p><strong>📊 Navigation:</strong> {t('navigation.translations')}</p>
        <p><strong>🏠 Home:</strong> {t('navigation.home')}</p>
      </div>

      <div className="space-x-2 mb-4">
        <button
          onClick={() => changeLanguage('en')}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          🇺🇸 English
        </button>
        <button
          onClick={() => changeLanguage('pt')}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          🇧🇷 Português
        </button>
        <button
          onClick={() => changeLanguage('es')}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          🇪🇸 Español
        </button>
      </div>

      <div className="text-sm text-yellow-700">
        <p><strong>💡 Dica:</strong> Abra o console do navegador para ver logs do i18next</p>
        <p><strong>🔧 Status:</strong> Se as traduções não funcionarem, há um problema na configuração</p>
      </div>
    </div>
  );
};
