import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface para informações do ambiente
interface EnvironmentInfo {
  environment: 'production' | 'test';
  isProduction: boolean;
  isTest: boolean;
  referer: string;
  origin: string;
  host: string;
  userAgent: string;
}

/**
 * Detecta o ambiente baseado nos headers HTTP da requisição
 * Produção: quando o header contém 'lushamerica.com'
 * Teste: qualquer outro caso (localhost, outros domínios, etc.)
 */
function detectEnvironment(req: Request): EnvironmentInfo {
  const referer = req.headers.get('referer') || '';
  const origin = req.headers.get('origin') || '';
  const host = req.headers.get('host') || '';
  const userAgent = req.headers.get('user-agent') || '';

  // Detect production: if any header contains lushamerica.com
  const isProductionDomain = 
    referer.includes('lushamerica.com') ||
    origin.includes('lushamerica.com') ||
    host.includes('lushamerica.com');

  // Determine environment: production > test
  let environment: 'production' | 'test';
  if (isProductionDomain) {
    environment = 'production';
  } else {
    environment = 'test';
  }

  const envInfo: EnvironmentInfo = {
    environment,
    isProduction: isProductionDomain,
    isTest: !isProductionDomain,
    referer,
    origin,
    host,
    userAgent
  };

  // Log environment detection for debugging
  console.log('🔍 Environment Detection:', {
    referer,
    origin,
    host,
    environment,
    userAgent: userAgent.substring(0, 100) + '...',
    isProductionDomain
  });
  console.log(`🎯 Environment detected: ${environment.toUpperCase()}`);

  return envInfo;
}

/**
 * Obtém as variáveis de ambiente do Stripe baseado no ID da sessão
 * Sessões de teste (cs_test_): usa STRIPE_SECRET_KEY_TEST
 * Sessões de produção (cs_live_): usa STRIPE_SECRET_KEY_PROD ou STRIPE_SECRET_KEY (fallback)
 */
function getStripeSecretKey(envInfo: EnvironmentInfo, sessionId: string): string {
  // Detectar se a sessão é de teste ou produção baseado no ID
  // Sessões de teste começam com cs_test_, sessões de produção com cs_live_
  const isTestSession = sessionId.startsWith('cs_test_');
  const isLiveSession = sessionId.startsWith('cs_live_');

  let secretKey = '';
  let source = '';

  if (isTestSession) {
    // Sessão de teste - usar chave de teste
    secretKey = Deno.env.get('STRIPE_SECRET_KEY_TEST') || '';
    source = 'STRIPE_SECRET_KEY_TEST';
    console.log('🔍 Sessão detectada como TEST (cs_test_)');
  } else if (isLiveSession) {
    // Sessão de produção - tentar PROD primeiro, depois fallback para STRIPE_SECRET_KEY
    secretKey = Deno.env.get('STRIPE_SECRET_KEY_PROD') || Deno.env.get('STRIPE_SECRET_KEY') || '';
    source = Deno.env.get('STRIPE_SECRET_KEY_PROD') ? 'STRIPE_SECRET_KEY_PROD' : 'STRIPE_SECRET_KEY';
    console.log('🔍 Sessão detectada como PRODUCTION (cs_live_)');
  } else {
    // Tentar baseado no ambiente detectado
    if (envInfo.isProduction) {
      secretKey = Deno.env.get('STRIPE_SECRET_KEY_PROD') || Deno.env.get('STRIPE_SECRET_KEY') || '';
      source = Deno.env.get('STRIPE_SECRET_KEY_PROD') ? 'STRIPE_SECRET_KEY_PROD' : 'STRIPE_SECRET_KEY';
    } else {
      secretKey = Deno.env.get('STRIPE_SECRET_KEY_TEST') || '';
      source = 'STRIPE_SECRET_KEY_TEST';
    }
    console.log(`🔍 Usando ambiente detectado: ${envInfo.environment}`);
  }

  console.log(`🔑 Stripe Config:`, {
    secretKey: secretKey ? `${secretKey.substring(0, 20)}...` : '❌ Não configurada',
    sessionId: sessionId.substring(0, 20) + '...',
    isTestSession,
    isLiveSession,
    source
  });

  if (!secretKey) {
    const expectedVar = isTestSession 
      ? 'STRIPE_SECRET_KEY_TEST'
      : (isLiveSession ? 'STRIPE_SECRET_KEY_PROD ou STRIPE_SECRET_KEY' : 'Chave apropriada');
    throw new Error(`${expectedVar} não configurada`);
  }

  return secretKey;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Obter dados do corpo da requisição
    const { sessionId } = await req.json();

    console.log('DEBUG: Buscando informações da sessão:', sessionId);

    // Validações
    if (!sessionId) {
      throw new Error('Session ID é obrigatório');
    }

    // Detectar ambiente e obter chave do Stripe apropriada
    const envInfo = detectEnvironment(req);
    const stripeSecretKey = getStripeSecretKey(envInfo, sessionId);

    // Importar Stripe dinamicamente
    const stripe = new (await import('https://esm.sh/stripe@14.21.0')).default(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });

    // Buscar informações da sessão
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log('DEBUG: Sessão encontrada:', session.id);

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        metadata: session.metadata,
        paymentStatus: session.payment_status,
        status: session.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('ERROR:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
}); 