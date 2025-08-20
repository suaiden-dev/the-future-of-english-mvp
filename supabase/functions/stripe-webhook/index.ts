import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  console.log(`[${new Date().toISOString()}] Webhook Stripe chamado`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Obter o corpo da requisição
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      throw new Error('Stripe signature missing');
    }

    // Obter chaves do Stripe das variáveis de ambiente
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('PROJECT_URL');
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY');

    if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Environment variables not configured');
    }

    // Importar Stripe dinamicamente
    const stripe = new (await import('https://esm.sh/stripe@14.21.0')).default(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar assinatura do webhook
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      throw new Error('Webhook signature verification failed');
    }

    console.log('DEBUG: Webhook event received:', event.type);
    console.log('DEBUG: Event data:', JSON.stringify(event.data.object, null, 2));

    // Processar eventos específicos
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object, supabase);
        break;
      
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object.id);
        break;
      
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
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

async function handleCheckoutSessionCompleted(session: any, supabase: any) {
  console.log('DEBUG: Processando checkout session completed:', session.id);
  console.log('DEBUG: Sessão completa:', JSON.stringify(session, null, 2));
  
  try {
    const {
      fileId,
      userId,
      filename,
      pages,
      isCertified,
      isNotarized,
      isBankStatement,
      totalPrice,
      documentId
    } = session.metadata;

    console.log('DEBUG: Metadados da sessão:', {
      fileId, userId, filename, pages, isCertified, isNotarized, isBankStatement, totalPrice, documentId
    });

    if (!documentId) {
      console.log('WARNING: documentId não encontrado nos metadados, pulando processamento');
      return;
    }

    if (!userId) {
      console.log('WARNING: userId não encontrado nos metadados, pulando processamento');
      return;
    }

    // Atualizar o documento existente com status processing
    console.log('DEBUG: Atualizando documento existente para status processing');
    
    const { data: updatedDocument, error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('ERROR: Erro ao atualizar documento:', updateError);
      throw new Error('Failed to update document');
    }

    console.log('DEBUG: Documento atualizado com sucesso:', updatedDocument);

    // Atualizar o status da sessão na tabela stripe_sessions
    try {
      console.log('DEBUG: Atualizando stripe_sessions para completed');
      
      const { error: sessionUpdateError } = await supabase
        .from('stripe_sessions')
        .update({
          payment_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('session_id', session.id);

      if (sessionUpdateError) {
        console.error('WARNING: Erro ao atualizar stripe_sessions:', sessionUpdateError);
        // Não falhar se isso der erro, apenas log
      } else {
        console.log('DEBUG: stripe_sessions atualizado com sucesso para completed');
      }
    } catch (sessionError) {
      console.log('WARNING: Erro ao atualizar stripe_sessions:', sessionError);
      // Não falhar se isso der erro
    }

    // Criar registro na tabela payments
    try {
      console.log('DEBUG: Criando registro na tabela payments');
      
      const paymentData = {
        document_id: documentId,
        user_id: userId,
        stripe_session_id: session.id,
        amount: parseFloat(totalPrice || '0'),
        currency: 'USD',
        status: 'completed',
        payment_method: 'card',
        payment_date: new Date().toISOString()
      };

      console.log('DEBUG: Dados do pagamento a serem inseridos:', paymentData);
      
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) {
        console.error('ERROR: Erro ao criar registro na tabela payments:', paymentError);
        console.error('DEBUG: Detalhes do erro:', JSON.stringify(paymentError, null, 2));
        throw new Error('Failed to create payment record');
      } else {
        console.log('DEBUG: Registro criado na tabela payments com sucesso:', paymentRecord.id);
      }
    } catch (paymentError) {
      console.error('ERROR: Erro ao criar registro na tabela payments:', paymentError);
      throw paymentError;
    }

    // Log do pagamento bem-sucedido
    console.log('SUCCESS: Pagamento processado com sucesso para documento:', documentId);
    console.log('SUCCESS: Documento atualizado para status processing.');
    console.log('SUCCESS: Registro criado na tabela payments.');
    console.log('SUCCESS: stripe_sessions atualizado para completed.');

  } catch (error) {
    console.error('ERROR: Erro ao processar checkout session:', error);
    console.error('DEBUG: Stack trace:', error.stack);
    throw error;
  }
} 