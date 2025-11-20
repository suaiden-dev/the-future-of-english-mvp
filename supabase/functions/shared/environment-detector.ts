// Interface para informações do ambiente
export interface EnvironmentInfo {
  environment: 'production' | 'test';
  isProduction: boolean;
  isTest: boolean;
  referer: string;
  origin: string;
  host: string;
  userAgent: string;
}

// Interface para webhook secrets
export interface WebhookSecret {
  env: 'production' | 'staging' | 'test';
  secret: string;
}

/**
 * Detecta o ambiente baseado nos headers HTTP da requisição
 * Produção: quando o header contém 'lushamerica.com' ou quando é um webhook do Stripe com chaves de produção
 * Teste: qualquer outro caso (localhost, outros domínios, etc.)
 */
export function detectEnvironment(req: Request): EnvironmentInfo {
  const referer = req.headers.get('referer') || '';
  const origin = req.headers.get('origin') || '';
  const host = req.headers.get('host') || '';
  const userAgent = req.headers.get('user-agent') || '';

  // Detect production: if any header contains lushamerica.com OR if it's a Stripe webhook
  // Stripe webhooks don't have referer/origin, so we need to check for Stripe user agent
  const isStripeWebhook = userAgent.includes('Stripe/');
  const isProductionDomain = 
    referer.includes('lushamerica.com') ||
    origin.includes('lushamerica.com') ||
    host.includes('lushamerica.com');

  // For Stripe webhooks, we need to determine environment differently
  // Check if we have production environment variables available
  const hasProdKeys = Deno.env.get('STRIPE_SECRET_KEY_PROD') && 
                     Deno.env.get('STRIPE_WEBHOOK_SECRET_PROD');

  const isProduction = isProductionDomain || (isStripeWebhook && hasProdKeys);

  // Determine environment: production > test
  let environment: 'production' | 'test';
  if (isProduction) {
    environment = 'production';
  } else {
    environment = 'test';
  }

  const envInfo: EnvironmentInfo = {
    environment,
    isProduction,
    isTest: !isProduction,
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
    userAgent: userAgent.substring(0, 100) + '...', // Truncate for readability
    isStripeWebhook,
    isProductionDomain,
    hasProdKeys
  });
  console.log(`🎯 Environment detected: ${environment.toUpperCase()}`);

  return envInfo;
}

/**
 * Retorna todos os webhook secrets disponíveis (para validação de múltiplos ambientes)
 */
export function getAllWebhookSecrets(): WebhookSecret[] {
  const secrets: WebhookSecret[] = [];

  const prodSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_PROD');
  const stagingSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_STAGING');
  const testSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST');

  if (prodSecret) {
    secrets.push({ env: 'production', secret: prodSecret });
  }

  if (stagingSecret) {
    secrets.push({ env: 'staging', secret: stagingSecret });
  }

  if (testSecret) {
    secrets.push({ env: 'test', secret: testSecret });
  }

  console.log(`[webhook-secrets] Encontrados ${secrets.length} webhook secrets disponíveis:`, 
    secrets.map(s => `${s.env}: ${s.secret.substring(0, 20)}...`));

  return secrets;
}

