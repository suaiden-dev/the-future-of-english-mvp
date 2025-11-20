// Utilitário para agendar limpeza automática de documentos Stripe pendentes
// Este arquivo pode ser usado para configurar um cron job ou chamada periódica

export async function cleanupStripePendingDocuments() {
  try {
    console.log('🧹 Iniciando limpeza automática de documentos Stripe pendentes');
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.log('⚠️ Usuário não autenticado, pulando limpeza');
      return;
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/cleanup-stripe-pending`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Limpeza automática concluída:', result);
    } else {
      console.error('❌ Erro na limpeza automática:', await response.text());
    }
  } catch (error) {
    console.error('❌ Erro ao executar limpeza automática:', error);
  }
}

// Função para configurar limpeza periódica (executar a cada 2 minutos para teste)
export function setupStripeCleanupScheduler() {
  // Limpar documentos Stripe pendentes a cada 2 minutos (para teste)
  const interval = setInterval(cleanupStripePendingDocuments, 2 * 60 * 1000);
  
  console.log('⏰ Agendador de limpeza Stripe configurado (2 minutos - TESTE)');
  
  return () => {
    clearInterval(interval);
    console.log('🛑 Agendador de limpeza Stripe parado');
  };
}
