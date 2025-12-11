/**
 * Utilitários para simulação de falhas de upload durante testes
 * 
 * ATENÇÃO: Estas funções são apenas para desenvolvimento e testes.
 * Não devem ser usadas em produção para simular falhas reais.
 */

/**
 * Verifica se deve simular erro de upload baseado em parâmetro da URL
 * Funciona apenas em ambiente de desenvolvimento
 */
export function shouldSimulateUploadError(): boolean {
  // Apenas em desenvolvimento
  if (!import.meta.env.DEV) {
    return false;
  }

  // Verificar parâmetro na URL
  const urlParams = new URLSearchParams(window.location.search);
  const simulateError = urlParams.get('simulate_upload_error');
  
  return simulateError === 'true';
}

/**
 * Verifica se deve simular erro de upload baseado em localStorage
 * Funciona apenas em ambiente de desenvolvimento
 */
export function shouldSimulateUploadErrorFromStorage(): boolean {
  // Apenas em desenvolvimento
  if (!import.meta.env.DEV) {
    return false;
  }

  const stored = localStorage.getItem('simulate_upload_error');
  return stored === 'true';
}

/**
 * Função unificada para verificar se simulação está ativa
 */
export function isUploadErrorSimulationActive(): boolean {
  return shouldSimulateUploadError() || shouldSimulateUploadErrorFromStorage();
}

/**
 * Ativa simulação de erro de upload via localStorage
 * Apenas em desenvolvimento
 */
export function enableUploadErrorSimulation(): void {
  if (import.meta.env.DEV) {
    localStorage.setItem('simulate_upload_error', 'true');
    console.log('✅ Simulação de erro de upload ativada (localStorage)');
  } else {
    console.warn('⚠️ Simulação de erro apenas disponível em desenvolvimento');
  }
}

/**
 * Desativa simulação de erro de upload
 */
export function disableUploadErrorSimulation(): void {
  localStorage.removeItem('simulate_upload_error');
  console.log('✅ Simulação de erro de upload desativada');
}

