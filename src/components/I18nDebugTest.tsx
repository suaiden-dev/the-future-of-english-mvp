import React, { useState, useEffect } from 'react';
import i18n from '../lib/i18n';

export const I18nDebugTest: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    const updateDebugInfo = () => {
      const info = {
        // Status do i18next
        isInitialized: i18n.isInitialized,
        language: i18n.language,
        languages: i18n.languages,
        resolvedLanguage: i18n.resolvedLanguage,
        
        // Recursos disponíveis
        availableNamespaces: i18n.reportNamespaces?.getUsedNamespaces() || [],
        availableLanguages: Object.keys(i18n.store.data || {}),
        
        // Teste de traduções específicas
        heroTitle1: i18n.t('hero.title1'),
        heroTitle2: i18n.t('hero.title2'),
        heroTitle3: i18n.t('hero.title3'),
        heroTitle4: i18n.t('hero.title4'),
        heroDescription: i18n.t('hero.description'),
        heroSuccessRate: i18n.t('hero.successRate'),
        heroStartNow: i18n.t('hero.startNow'),
        heroTalkToSpecialist: i18n.t('hero.talkToSpecialist'),
        heroPersonalized: i18n.t('hero.personalized'),
        heroFastResults: i18n.t('hero.fastResults'),
        
        // Teste de traduções do about
        aboutTitle: i18n.t('about.title'),
        aboutTitleUs: i18n.t('about.titleUs'),
        aboutDescription: i18n.t('about.description'),
        
        // LocalStorage
        localStorageLang: localStorage.getItem('i18nextLng'),
        
        // Timestamp para forçar atualização
        timestamp: new Date().toISOString()
      };
      
      setDebugInfo(info);
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 2000);
    return () => clearInterval(interval);
  }, [forceUpdate]);

  const changeLanguage = (lang: string) => {
    console.log(`Changing language to: ${lang}`);
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    setForceUpdate(prev => prev + 1);
  };

  const testTranslation = (key: string) => {
    const result = i18n.t(key);
    console.log(`Translation for "${key}":`, result);
    return result;
  };

  return (
    <div className="p-4 bg-blue-100 border border-blue-400 rounded-lg m-4">
      <h3 className="text-lg font-bold mb-4 text-blue-800">🔍 i18next Debug Test</h3>
      
      {/* Status básico */}
      <div className="mb-4 p-3 bg-white rounded border">
        <h4 className="font-semibold mb-2">📊 Status do i18next:</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><strong>Inicializado:</strong> {debugInfo.isInitialized ? '✅ Sim' : '❌ Não'}</div>
          <div><strong>Idioma atual:</strong> {debugInfo.language}</div>
          <div><strong>Idioma resolvido:</strong> {debugInfo.resolvedLanguage}</div>
          <div><strong>Idiomas disponíveis:</strong> {debugInfo.availableLanguages?.join(', ')}</div>
        </div>
      </div>

      {/* Teste de traduções do Hero */}
      <div className="mb-4 p-3 bg-white rounded border">
        <h4 className="font-semibold mb-2">🎯 Traduções do Hero:</h4>
        <div className="space-y-1 text-sm">
          <div><strong>title1:</strong> "{debugInfo.heroTitle1}"</div>
          <div><strong>title2:</strong> "{debugInfo.heroTitle2}"</div>
          <div><strong>title3:</strong> "{debugInfo.heroTitle3}"</div>
          <div><strong>title4:</strong> "{debugInfo.heroTitle4}"</div>
          <div><strong>description:</strong> "{debugInfo.heroDescription}"</div>
          <div><strong>successRate:</strong> "{debugInfo.heroSuccessRate}"</div>
          <div><strong>startNow:</strong> "{debugInfo.heroStartNow}"</div>
          <div><strong>talkToSpecialist:</strong> "{debugInfo.heroTalkToSpecialist}"</div>
          <div><strong>personalized:</strong> "{debugInfo.heroPersonalized}"</div>
          <div><strong>fastResults:</strong> "{debugInfo.heroFastResults}"</div>
        </div>
      </div>

      {/* Teste de traduções do About */}
      <div className="mb-4 p-3 bg-white rounded border">
        <h4 className="font-semibold mb-2">📝 Traduções do About:</h4>
        <div className="space-y-1 text-sm">
          <div><strong>title:</strong> "{debugInfo.aboutTitle}"</div>
          <div><strong>titleUs:</strong> "{debugInfo.aboutTitleUs}"</div>
          <div><strong>description:</strong> "{debugInfo.aboutDescription}"</div>
        </div>
      </div>

      {/* Botões de idioma */}
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

      {/* Botão de teste */}
      <div className="mb-4">
        <button
          onClick={() => {
            console.log('=== TESTE DE TRADUÇÕES ===');
            testTranslation('hero.title1');
            testTranslation('hero.description');
            testTranslation('about.title');
            testTranslation('navigation.translations');
          }}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          🧪 Testar Traduções no Console
        </button>
      </div>

      {/* Informações completas */}
      <div className="mb-4">
        <h4 className="font-semibold text-blue-700 mb-2">🔧 Debug Info Completo:</h4>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      <div className="text-sm text-blue-700">
        <p><strong>💡 Instruções:</strong></p>
        <p>1. Clique nos botões de idioma para testar</p>
        <p>2. Abra o console do navegador (F12) para ver logs</p>
        <p>3. Se as traduções não mudarem, há um problema na configuração</p>
      </div>
    </div>
  );
};
