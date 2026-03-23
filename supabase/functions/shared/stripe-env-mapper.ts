import { EnvironmentInfo } from './environment-detector.ts';

// Interface para variáveis de ambiente do Stripe
export interface StripeEnvironmentVariables {
  secretKey: string;
  webhookSecret: string;
  publishableKey: string;
}

/**
 * Mapeia as variáveis de ambiente do Stripe baseado no ambiente detectado
 * Usa sufixo _PROD para produção e _TEST para teste
 */
export function getStripeEnvironmentVariables(envInfo: EnvironmentInfo): StripeEnvironmentVariables {
  let secretKey: string | undefined;
  let webhookSecret: string | undefined;
  let publishableKey: string | undefined;

  if (envInfo.isProduction) {
    // Produção usa as chaves principais (live) ou explícitas _PROD
    secretKey = Deno.env.get('STRIPE_SECRET_KEY_PROD') || Deno.env.get('STRIPE_SECRET_KEY');
    webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_PROD') || Deno.env.get('STRIPE_WEBHOOK_SECRET');
    publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY_PROD') || Deno.env.get('STRIPE_PUBLISHABLE_KEY');
  } else {
    // Teste usa explicitamente _TEST
    secretKey = Deno.env.get('STRIPE_SECRET_KEY_TEST');
    webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST');
    publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY_TEST');
  }

  const config = {
    secretKey: secretKey || '',
    webhookSecret: webhookSecret || '',
    publishableKey: publishableKey || ''
  };

  console.log(`🔑 Stripe Config (${envInfo.environment}):`, {
    secretKey: config.secretKey ? `${config.secretKey.substring(0, 20)}...` : '❌ Não configurada',
    webhookSecret: config.webhookSecret ? `${config.webhookSecret.substring(0, 20)}...` : '❌ Não configurada',
    publishableKey: config.publishableKey ? `${config.publishableKey.substring(0, 20)}...` : '❌ Não configurada'
  });

  return config;
}

