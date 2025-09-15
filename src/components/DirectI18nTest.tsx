import React, { useState, useEffect } from 'react';
import i18n from '../lib/i18n';

export const DirectI18nTest: React.FC = () => {
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [testResults, setTestResults] = useState<any>({});

  useEffect(() => {
    const updateTestResults = () => {
      setTestResults({
        i18nLanguage: i18n.language,
        i18nIsInitialized: i18n.isInitialized,
        i18nLanguages: i18n.languages,
        localStorage: localStorage.getItem('i18nextLng'),
        testTranslation: i18n.t('about.title'),
        testNavigation: i18n.t('navigation.translations'),
        availableResources: Object.keys(i18n.store.data || {}),
        currentResource: i18n.store.data?.[i18n.language] ? 'Resource found' : 'No resource'
      });
    };

    updateTestResults();
    const interval = setInterval(updateTestResults, 1000);
    return () => clearInterval(interval);
  }, []);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  return (
    <div className="p-4 bg-red-100 border border-red-400 rounded-lg m-4">
      <h3 className="text-lg font-bold mb-4 text-red-800">🔧 Direct i18next Test</h3>
      
      <div className="mb-4 space-y-2">
        <p><strong>🌐 i18n Language:</strong> {currentLang}</p>
        <p><strong>📝 Direct Translation:</strong> {i18n.t('about.title')}</p>
        <p><strong>🔤 Navigation:</strong> {i18n.t('navigation.translations')}</p>
        <p><strong>✅ Is Initialized:</strong> {i18n.isInitialized ? 'Yes' : 'No'}</p>
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

      <div className="mb-4">
        <h4 className="font-semibold text-red-700 mb-2">Debug Info:</h4>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
          {JSON.stringify(testResults, null, 2)}
        </pre>
      </div>

      <div className="text-sm text-red-700">
        <p><strong>💡 Este componente testa o i18next diretamente, sem o contexto React</strong></p>
        <p><strong>🔧 Se funcionar aqui mas não no contexto, o problema está no I18nContext</strong></p>
      </div>
    </div>
  );
};
