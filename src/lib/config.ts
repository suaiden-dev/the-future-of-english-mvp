// Configuração centralizada para todas as variáveis de ambiente
export const config = {
  // Supabase
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  // Edge Functions URLs
  edgeFunctions: {
    baseUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`,
    createCheckoutSession: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
    getSessionInfo: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-session-info`,
    updateDocument: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-document`,
    sendTranslationWebhook: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-translation-webhook`,
    updateBankStatementValidation: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-bank-statement-validation`,
  },
  
  // Storage URLs
  storage: {
    baseUrl: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public`,
    documents: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/documents`,
    logos: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos`,
  },
  
  // API URLs
  api: {
    rest: `${import.meta.env.VITE_SUPABASE_URL}/rest/v1`,
  }
};

// Função para obter Bearer Token para Edge Functions
export const getEdgeFunctionAuthHeader = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
});

// Validação das variáveis de ambiente
export const validateConfig = () => {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return true;
};

// Inicializar validação
validateConfig();
