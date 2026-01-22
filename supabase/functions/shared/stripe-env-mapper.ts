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
  let suffix: string;
  if (envInfo.isProduction) {
    suffix = 'PROD';
  } else {
    suffix = 'TEST';
  }

  const config = {
    secretKey: Deno.env.get(`STRIPE_SECRET_KEY_${suffix}`) || '',
    webhookSecret: Deno.env.get(`STRIPE_WEBHOOK_SECRET_${suffix}`) || '',
    publishableKey: Deno.env.get(`STRIPE_PUBLISHABLE_KEY_${suffix}`) || ''
  };

  console.log(`🔑 Stripe Config (${envInfo.environment}):`, {
    secretKey: config.secretKey ? `${config.secretKey.substring(0, 20)}...` : '❌ Não configurada',
    webhookSecret: config.webhookSecret ? `${config.webhookSecret.substring(0, 20)}...` : '❌ Não configurada',
    publishableKey: config.publishableKey ? `${config.publishableKey.substring(0, 20)}...` : '❌ Não configurada'
  });

  return config;
}

