import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { detectEnvironment } from '../shared/environment-detector.ts';
import { getStripeEnvironmentVariables } from '../shared/stripe-env-mapper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function syncStripeSessions(supabase: any, stripe: Stripe, stripeConfig: any): Promise<{ checked: number, updated: number }> {
  console.log(`🔄 [LIST-CLEANUP] Sincronizando sessões Stripe pending...`);
  
  try {
    // Buscar sessões pending que foram atualizadas há mais de 30 minutos
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: pendingSessions, error: queryError } = await supabase
      .from('stripe_sessions')
      .select('id, session_id, payment_status, updated_at')
      .eq('payment_status', 'pending')
      .lt('updated_at', thirtyMinutesAgo);

    if (queryError) {
      console.error('❌ [LIST-CLEANUP] Erro ao buscar sessões pending:', queryError);
      return { checked: 0, updated: 0 };
    }

    if (!pendingSessions || pendingSessions.length === 0) {
      console.log('✅ [LIST-CLEANUP] Nenhuma sessão pending para sincronizar');
      return { checked: 0, updated: 0 };
    }

    console.log(`🔍 [LIST-CLEANUP] Verificando ${pendingSessions.length} sessões pending no Stripe...`);

    let checkedCount = 0;
    let updatedCount = 0;

    // Verificar cada sessão no Stripe (com limite para não sobrecarregar)
    const sessionsToCheck = pendingSessions.slice(0, 50); // Limite de 50 por execução
    
    for (const session of sessionsToCheck) {
      try {
        checkedCount++;

        // Verificar se a sessão é de produção (cs_live_) mas estamos em ambiente de teste
        const isLiveSession = session.session_id.startsWith('cs_live_');
        const isTestEnvironment = stripeConfig.environment.environment === 'test';
        
        if (isLiveSession && isTestEnvironment) {
          console.log(`⚠️ [LIST-CLEANUP] Sessão ${session.session_id} (live) ignorada - ambiente test não pode verificar sessões de produção`);
          continue;
        }

        // Consultar a sessão no Stripe
        const stripeSession = await stripe.checkout.sessions.retrieve(session.session_id);

        // Verificar se o status mudou
        let newStatus = session.payment_status;
        let shouldUpdate = false;

        if (stripeSession.status === 'expired') {
          newStatus = 'expired';
          shouldUpdate = true;
          console.log(`✅ [LIST-CLEANUP] Sessão ${session.session_id} expirada no Stripe`);
        } else if (stripeSession.status === 'complete' && stripeSession.payment_status === 'paid') {
          newStatus = 'completed';
          shouldUpdate = true;
          console.log(`✅ [LIST-CLEANUP] Sessão ${session.session_id} completada no Stripe`);
        } else if (stripeSession.status === 'open') {
          // Verificar se expirou por tempo (Stripe expira após 24h)
          const expiresAt = stripeSession.expires_at ? new Date(stripeSession.expires_at * 1000) : null;
          if (expiresAt && expiresAt < new Date()) {
            newStatus = 'expired';
            shouldUpdate = true;
            console.log(`✅ [LIST-CLEANUP] Sessão ${session.session_id} expirada por tempo`);
          }
        }

        // Atualizar o banco se necessário
        if (shouldUpdate) {
          const { error: updateError } = await supabase
            .from('stripe_sessions')
            .update({
              payment_status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', session.id);

          if (updateError) {
            console.error(`❌ [LIST-CLEANUP] Erro ao atualizar sessão ${session.session_id}:`, updateError);
          } else {
            updatedCount++;
          }
        }

        // Pequeno delay para não sobrecarregar a API do Stripe
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (sessionError: any) {
        // Se o erro for "No such checkout.session", verificar se é realmente um erro ou incompatibilidade de ambiente
        if (sessionError.message && sessionError.message.includes('No such checkout.session')) {
          const isLiveSession = session.session_id.startsWith('cs_live_');
          const isTestEnvironment = stripeConfig.environment.environment === 'test';
          
          // Se for sessão de produção em ambiente de teste, apenas pular (não podemos verificar)
          if (isLiveSession && isTestEnvironment) {
            console.log(`⚠️ [LIST-CLEANUP] Sessão ${session.session_id} (live) não pode ser verificada em ambiente test - ignorando`);
            continue;
          }
          
          // Se for sessão de teste e não existe, marcar como expirada (sessão realmente não existe)
          console.log(`⚠️ [LIST-CLEANUP] Sessão ${session.session_id} não encontrada no Stripe, marcando como expirada`);
          
          const { error: updateError } = await supabase
            .from('stripe_sessions')
            .update({
              payment_status: 'expired',
              updated_at: new Date().toISOString()
            })
            .eq('id', session.id);

          if (!updateError) {
            updatedCount++;
            console.log(`✅ [LIST-CLEANUP] Sessão ${session.session_id} marcada como expirada`);
          }
        } else {
          console.error(`❌ [LIST-CLEANUP] Erro ao verificar sessão ${session.session_id}:`, sessionError.message);
        }
      }
    }

    console.log(`✅ [LIST-CLEANUP] Sincronização concluída: ${checkedCount} verificadas, ${updatedCount} atualizadas`);
    return { checked: checkedCount, updated: updatedCount };

  } catch (error: any) {
    console.error('❌ [LIST-CLEANUP] Erro na sincronização de sessões Stripe:', error.message);
    return { checked: 0, updated: 0 };
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const supabaseUrl = Deno.env.get('PROJECT_URL') || Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Environment variables not configured');
    }

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verificar usuário autenticado
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verificar role (apenas admin ou lush-admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'lush-admin')) {
      throw new Error('Forbidden: Admin access required');
    }

    console.log(`🔍 [LIST-CLEANUP] Iniciando verificação de documentos draft por ${user.email}`);

    // Detectar ambiente e configurar Stripe
    const envInfo = detectEnvironment(req);
    const stripeConfig = getStripeEnvironmentVariables(envInfo);

    if (!stripeConfig.secretKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2024-12-18.acacia',
    });

    // Sincronizar sessões Stripe primeiro
    const syncResult = await syncStripeSessions(supabase, stripe, { ...stripeConfig, environment: envInfo });
    console.log(`🔄 [LIST-CLEANUP] Sincronização: ${syncResult.checked} verificadas, ${syncResult.updated} atualizadas`);

    // Buscar documentos sem pagamento confirmado criados há mais de 30 minutos
    // Incluir documentos com status 'draft', 'processing' ou 'pending' que não têm pagamento completed
    const now = Date.now();
    const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000).toISOString();

    // Primeiro, buscar todos os documentos candidatos (draft, processing, pending)
    const { data: allCandidates, error: queryError } = await supabase
      .from('documents')
      .select('id, filename, file_url, user_id, created_at, status')
      .in('status', ['draft', 'processing', 'pending'])
      .lt('created_at', thirtyMinutesAgo);

    if (queryError) {
      console.error('❌ [LIST-CLEANUP] Erro ao buscar documentos:', queryError);
      throw new Error('Failed to fetch draft documents');
    }

    // ✅ OTIMIZADO: Buscar todos os pagamentos e sessões de uma vez (batch queries)
    const candidateDocIds = (allCandidates || []).map(doc => doc.id);
    
    // Buscar TODOS os pagamentos para os documentos candidatos de uma vez
    const { data: allPayments } = await supabase
      .from('payments')
      .select('id, document_id, status, payment_method')
      .in('document_id', candidateDocIds);
    
    // Buscar TODAS as sessões Stripe para os documentos candidatos de uma vez
    const { data: allSessions } = await supabase
      .from('stripe_sessions')
      .select('session_id, document_id, payment_status, updated_at')
      .in('document_id', candidateDocIds);
    
    // Criar mapas para lookup rápido
    const paymentsByDocId = new Map<string, any[]>();
    (allPayments || []).forEach(payment => {
      if (!paymentsByDocId.has(payment.document_id)) {
        paymentsByDocId.set(payment.document_id, []);
      }
      paymentsByDocId.get(payment.document_id)!.push(payment);
    });
    
    const sessionsByDocId = new Map<string, any[]>();
    (allSessions || []).forEach(session => {
      if (!sessionsByDocId.has(session.document_id)) {
        sessionsByDocId.set(session.document_id, []);
      }
      sessionsByDocId.get(session.document_id)!.push(session);
    });
    
    // Filtrar apenas os que não têm pagamento completed
    // IMPORTANTE: Verificar também pagamentos Zelle e outros métodos
    const documentsWithoutPayment: any[] = [];
    const isTestEnvironment = stripeConfig.environment.environment === 'test';
    
    for (const doc of allCandidates || []) {
      const docPayments = paymentsByDocId.get(doc.id) || [];
      const docSessions = sessionsByDocId.get(doc.id) || [];
      
      // Verificar se tem pagamento completed
      const hasCompletedPayment = docPayments.some(p => p.status === 'completed');
      
      // Verificar se tem pagamento Zelle (completed, pending_verification ou pending)
      const hasZellePayment = docPayments.some(p => 
        p.payment_method === 'zelle' && 
        ['completed', 'pending_verification', 'pending'].includes(p.status)
      );
      
      // Verificar se tem sessão Stripe de produção (em ambiente de teste, proteger esses documentos)
      const hasLiveSession = docSessions.some(s => 
        s.session_id.startsWith('cs_live_')
      );
      
      // Se tem pagamento completed OU pagamento Zelle OU sessão Stripe de produção, proteger
      if (hasCompletedPayment || hasZellePayment || (hasLiveSession && isTestEnvironment)) {
        // Tem pagamento ou sessão de produção - não incluir na lista de sem pagamento
        continue;
      }
      
      // Se chegou aqui, realmente não tem pagamento
      documentsWithoutPayment.push(doc);
    }

    const draftsToReview = documentsWithoutPayment;

    if (queryError) {
      console.error('❌ [LIST-CLEANUP] Erro ao buscar documentos draft:', queryError);
      throw new Error('Failed to fetch draft documents');
    }

    console.log(`📋 [LIST-CLEANUP] Encontrados ${draftsToReview?.length || 0} documentos draft para revisão`);

    const documentsToCleanup: any[] = [];
    const documentsToKeep: any[] = [];

    // ✅ OTIMIZADO: Processar cada documento usando os mapas já criados (sem queries adicionais)
    for (const doc of draftsToReview || []) {
      try {
        // Usar os mapas já criados (sem fazer queries adicionais)
        const sessions = sessionsByDocId.get(doc.id) || [];
        const payments = paymentsByDocId.get(doc.id) || [];

        // LÓGICA DE SEGURANÇA - só incluir se realmente seguro para apagar
        // Proteger se tem qualquer pagamento (completed, Zelle pending_verification, etc)
        if (payments.length > 0) {
          const hasCompletedPayment = payments.some(p => p.status === 'completed');
          const hasZellePayment = payments.some(p => p.payment_method === 'zelle');
          
          if (hasCompletedPayment || hasZellePayment) {
            documentsToKeep.push({
              ...doc,
              reason: hasCompletedPayment ? 'Tem pagamento completed' : 'Tem pagamento Zelle',
              sessions: sessions,
              payments: payments
            });
            continue;
          }
        }
        
        // Verificar se tem sessão Stripe de produção em ambiente de teste (proteger)
        if (sessions.length > 0) {
          const hasLiveSession = sessions.some(s => s.session_id.startsWith('cs_live_'));
          
          if (hasLiveSession && isTestEnvironment) {
            documentsToKeep.push({
              ...doc,
              reason: 'Sessão Stripe de produção (protegida em ambiente de teste)',
              sessions: sessions,
              payments: payments
            });
            continue;
          }
        }

        if (sessions.length === 0) {
          // Sem sessão Stripe = seguro para apagar
          documentsToCleanup.push({
            ...doc,
            reason: 'Sem sessão Stripe',
            sessions: [],
            payments: []
          });
          continue;
        }

        // Se tem sessão, verificar se expirou
        const session = sessions[0];
        const sessionUpdatedAt = session.updated_at ? new Date(session.updated_at).getTime() : now;
        // Cutoff de inatividade para considerar sessão como expirada: 24 horas
        const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

        // Sessões marcadas como expired ou failed são seguras para apagar
        if (session.payment_status === 'expired' || session.payment_status === 'failed') {
          documentsToCleanup.push({
            ...doc,
            reason: `Sessão Stripe ${session.payment_status}`,
            sessions: sessions,
            payments: []
          });
          continue;
        }

        // Sessão completed = sempre protegido
        if (session.payment_status === 'completed') {
          documentsToKeep.push({
            ...doc,
            reason: 'Sessão Stripe completed',
            sessions: sessions,
            payments: []
          });
          continue;
        }

        // Sessões pending: verificar se são antigas ou recentes
        if (session.payment_status === 'pending') {
          // Se foi atualizada há mais de 24 horas, considerar expirada
          if (sessionUpdatedAt < twentyFourHoursAgo) {
            documentsToCleanup.push({
              ...doc,
              reason: 'Sessão Stripe pending antiga (mais de 24 horas)',
              sessions: sessions,
              payments: []
            });
          } else {
            // Sessão pending recente = proteger
            documentsToKeep.push({
              ...doc,
              reason: 'Sessão Stripe pending',
              sessions: sessions,
              payments: []
            });
          }
          continue;
        }

        // Outros casos: considerar antigo se mais de 24 horas
        if (sessionUpdatedAt < twentyFourHoursAgo) {
          documentsToCleanup.push({
            ...doc,
            reason: 'Sessão Stripe antiga (mais de 24 horas)',
            sessions: sessions,
            payments: []
          });
        } else {
          documentsToKeep.push({
            ...doc,
            reason: 'Sessão Stripe recente (menos de 24 horas)',
            sessions: sessions,
            payments: []
          });
        }

      } catch (docError) {
        console.error(`❌ [LIST-CLEANUP] Erro ao processar documento ${doc.id}:`, docError);
        documentsToKeep.push({
          ...doc,
          reason: 'Erro no processamento',
          sessions: [],
          payments: []
        });
      }
    }

    console.log(`✅ [LIST-CLEANUP] Categorização concluída:`);
    console.log(`   - Seguros para remover: ${documentsToCleanup.length}`);
    console.log(`   - Protegidos: ${documentsToKeep.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        documentsToCleanup,
        documentsToKeep,
        syncResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ [LIST-CLEANUP] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

