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
  console.log(`Headers:`, Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
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

    console.log('DEBUG: Body length:', body.length);
    console.log('DEBUG: Signature present:', !!signature);
    console.log('DEBUG: Signature value:', signature ? signature.substring(0, 20) + '...' : 'null');

    if (!signature) {
      console.error('ERROR: Stripe signature missing');
      throw new Error('Stripe signature missing');
    }

    // Obter chaves do Stripe das variáveis de ambiente
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('PROJECT_URL');
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY');

    console.log('DEBUG: Verificando variáveis de ambiente...');
    console.log('DEBUG: STRIPE_SECRET_KEY:', stripeSecretKey ? '✅ Configurada' : '❌ Não configurada');
    console.log('DEBUG: STRIPE_WEBHOOK_SECRET:', stripeWebhookSecret ? '✅ Configurada' : '❌ Não configurada');
    console.log('DEBUG: PROJECT_URL:', supabaseUrl ? '✅ Configurada' : '❌ Não configurada');
    console.log('DEBUG: SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Configurada' : '❌ Não configurada');

    if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('ERROR: Variáveis de ambiente não configuradas');
      throw new Error('Environment variables not configured');
    }

    // Importar Stripe dinamicamente
    const stripe = new (await import('https://esm.sh/stripe@14.21.0')).default(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });

    // Criar cliente Supabase com service_role para contornar RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

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
      console.log('DEBUG: Session ID para atualizar:', session.id);
      
      const { data: sessionUpdateData, error: sessionUpdateError } = await supabase
        .from('stripe_sessions')
        .update({
          payment_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('session_id', session.id)
        .select();

      if (sessionUpdateError) {
        console.error('ERROR: Erro ao atualizar stripe_sessions:', sessionUpdateError);
        console.error('DEBUG: Detalhes do erro stripe_sessions:', JSON.stringify(sessionUpdateError, null, 2));
        console.error('DEBUG: Código do erro stripe_sessions:', sessionUpdateError.code);
        console.error('DEBUG: Mensagem do erro stripe_sessions:', sessionUpdateError.message);
        // Não falhar se isso der erro, apenas log
      } else {
        console.log('DEBUG: stripe_sessions atualizado com sucesso para completed');
        console.log('DEBUG: Dados atualizados stripe_sessions:', JSON.stringify(sessionUpdateData, null, 2));
      }
    } catch (sessionError) {
      console.error('ERROR: Exceção ao atualizar stripe_sessions:', sessionError);
      // Não falhar se isso der erro
    }

    // Criar registro na tabela payments
    try {
      console.log('DEBUG: Criando registro na tabela payments');
      console.log('DEBUG: Cliente Supabase criado:', supabase ? '✅' : '❌');
      
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

      console.log('DEBUG: Dados do pagamento a serem inseridos:', JSON.stringify(paymentData, null, 2));
      console.log('DEBUG: Tentando inserir na tabela payments...');
      
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) {
        console.error('ERROR: Erro ao criar registro na tabela payments:', paymentError);
        console.error('DEBUG: Detalhes do erro:', JSON.stringify(paymentError, null, 2));
        console.error('DEBUG: Código do erro:', paymentError.code);
        console.error('DEBUG: Mensagem do erro:', paymentError.message);
        console.error('DEBUG: Detalhes do erro:', paymentError.details);
        throw new Error('Failed to create payment record');
      } else {
        console.log('DEBUG: Registro criado na tabela payments com sucesso:', paymentRecord.id);
        console.log('DEBUG: Dados do registro criado:', JSON.stringify(paymentRecord, null, 2));
      }
      
      // Enviar notificação de pagamento para admins e autenticadores
      try {
        console.log('DEBUG: Enviando notificação de pagamento Stripe via payment-notifications function');
        
        const notificationPayload = {
          payment_id: paymentRecord.id,
          user_id: userId,
          document_id: documentId,
          payment_method: 'stripe',
          amount: parseFloat(totalPrice || '0'),
          filename: filename || 'Unknown Document',
          notification_type: 'payment_received'
        };
        
        console.log('DEBUG: Payload para payment-notifications:', JSON.stringify(notificationPayload, null, 2));
        
        const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/payment-notifications`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify(notificationPayload)
        });
        
        if (notificationResponse.ok) {
          const notificationResult = await notificationResponse.json();
          console.log('SUCCESS: Notificações de pagamento Stripe enviadas:', notificationResult.message);
        } else {
          const errorText = await notificationResponse.text();
          console.error('WARNING: Falha ao enviar notificações de pagamento Stripe:', notificationResponse.status, errorText);
        }
      } catch (notificationError) {
        console.error('WARNING: Erro ao enviar notificações de pagamento Stripe:', notificationError);
        // Não falhar o processo por causa da notificação
      }
      
      // Notificar autenticadores sobre documento pendente (Stripe = aprovação automática)
      try {
        console.log('DEBUG: Enviando notificação para autenticadores sobre documento pendente');
        
        // Buscar todos os autenticadores
        const { data: authenticators, error: authError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('role', 'authenticator');

        if (!authError && authenticators && authenticators.length > 0) {
          // Buscar dados do usuário que fez o pagamento
          const { data: user } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', userId)
            .single();

          // Enviar notificação para cada autenticador
          for (const authenticator of authenticators) {
            const authNotificationPayload = {
              user_name: authenticator.name || authenticator.email || 'Authenticator',
              user_email: authenticator.email,
              notification_type: 'Authenticator Pending Documents Notification',
              timestamp: new Date().toISOString(),
              filename: filename || 'Unknown Document',
              document_id: documentId,
              status: 'pending_authentication',
              client_name: user?.name || 'Unknown Client',
              client_email: user?.email || 'unknown@email.com'
            };
            
            try {
              const authWebhookResponse = await fetch('https://nwh.thefutureofenglish.com/webhook/notthelush1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(authNotificationPayload)
              });
              
              if (authWebhookResponse.ok) {
                console.log(`SUCCESS: Notificação para autenticador enviada: ${authenticator.email}`);
              } else {
                console.error(`WARNING: Falha ao enviar notificação para autenticador ${authenticator.email}:`, authWebhookResponse.status);
              }
            } catch (authNotificationError) {
              console.error(`ERROR: Erro ao enviar notificação para autenticador ${authenticator.email}:`, authNotificationError);
            }
          }
          
          console.log(`SUCCESS: Notificações enviadas para ${authenticators.length} autenticadores`);
        } else {
          console.log('INFO: Nenhum autenticador encontrado para notificar');
        }
      } catch (authNotificationError) {
        console.error('WARNING: Erro ao enviar notificações para autenticadores:', authNotificationError);
        // Não falhar o processo por causa da notificação
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