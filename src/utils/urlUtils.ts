/**
 * Utilitários para gerenciar URLs de redirecionamento
 */

/**
 * Obtém a URL base correta baseada no ambiente
 */
export function getBaseUrl(): string {
  // Em produção, usar window.location.origin
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  
  // Em desenvolvimento, usar localhost
  return 'http://127.0.0.1:3000';
}

/**
 * Obtém a URL completa para reset de senha
 */
export function getResetPasswordUrl(): string {
  return `${getBaseUrl()}/reset-password`;
}

/**
 * Obtém a URL completa para callback de autenticação
 */
export function getAuthCallbackUrl(): string {
  return `${getBaseUrl()}/auth/callback`;
}

/**
 * Verifica se a URL atual é localhost
 */
export function isLocalhost(): boolean {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname === '0.0.0.0';
}

/**
 * Obtém a URL do site para configuração do Supabase
 */
export function getSiteUrl(): string {
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  
  // Em desenvolvimento, usar localhost
  return 'http://127.0.0.1:3000';
} 