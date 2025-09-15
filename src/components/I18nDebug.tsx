import React, { useEffect, useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import i18n from '../lib/i18n';

export const I18nDebug: React.FC = () => {
  const { t, currentLanguage, changeLanguage } = useI18n();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo({
        contextLanguage: currentLanguage,
        i18nLanguage: i18n.language,
        i18nLanguages: i18n.languages,
        i18nIsInitialized: i18n.isInitialized,
        i18nOptions: i18n.options,
        localStorage: localStorage.getItem('i18nextLng'),
        availableResources: Object.keys(i18n.store.data),
        currentResource: i18n.store.data[i18n.language] || 'No resource found'
      });
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 1000);
    return () => clearInterval(interval);
  }, [currentLanguage]);

  const testTranslation = (key: string) => {
    const result = t(key);
    console.log(`Testing key "${key}":`, result);
    return result;
  };

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg m-4">
      <h3 className="text-lg font-bold mb-4 text-red-800">I18n Debug Panel</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="font-semibold text-red-700">Context State</h4>
          <p><strong>Current Language:</strong> {currentLanguage}</p>
          <p><strong>Context t() function:</strong> {typeof t}</p>
        </div>
        
        <div>
          <h4 className="font-semibold text-red-700">i18next State</h4>
          <p><strong>i18n Language:</strong> {debugInfo.i18nLanguage}</p>
          <p><strong>Is Initialized:</strong> {debugInfo.i18nIsInitialized ? 'Yes' : 'No'}</p>
          <p><strong>Available Languages:</strong> {debugInfo.i18nLanguages?.join(', ')}</p>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-red-700">Translation Tests</h4>
        <div className="space-y-2">
          <p><strong>company.name:</strong> {testTranslation('company.name')}</p>
          <p><strong>hero.title1:</strong> {testTranslation('hero.title1')}</p>
          <p><strong>dashboard.welcome:</strong> {testTranslation('dashboard.welcome')}</p>
          <p><strong>navigation.documents:</strong> {testTranslation('navigation.documents')}</p>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-red-700">Language Controls</h4>
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

      <div className="mb-4">
        <h4 className="font-semibold text-red-700">Debug Info</h4>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      <div>
        <h4 className="font-semibold text-red-700">Console Commands</h4>
        <p className="text-sm text-gray-600">
          Open browser console and run: <code>i18n.language</code>, <code>i18n.isInitialized</code>
        </p>
      </div>
    </div>
  );
};
