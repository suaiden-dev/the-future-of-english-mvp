import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Obter o corpo da requisição
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      throw new Error('Stripe signature missing');
    }

    // Obter chaves do Stripe das variáveis de ambiente
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('DEBUG: Verificando variáveis de ambiente...');
    console.log('DEBUG: STRIPE_SECRET_KEY:', stripeSecretKey ? 'SET' : 'NOT SET');
    console.log('DEBUG: STRIPE_WEBHOOK_SECRET:', stripeWebhookSecret ? 'SET' : 'NOT SET');
    console.log('DEBUG: SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET');

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
  
  try {
    const {
      fileId,
      userId,
      filename,
      pages,
      isCertified,
      isNotarized,
      isBankStatement,
      totalPrice
    } = session.metadata;

    console.log('DEBUG: Metadados da sessão:', {
      fileId, userId, filename, pages, isCertified, isNotarized, isBankStatement, totalPrice
    });

    // Verificar se o usuário existe na tabela profiles
    console.log('DEBUG: Verificando se usuário existe...');
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      console.error('ERROR: Usuário não encontrado:', userError);
      throw new Error('User not found');
    }

    console.log('DEBUG: Usuário encontrado:', userProfile);

    // Criar documento real no banco (sem file_url por enquanto)
    // O arquivo será enviado posteriormente na página de sucesso
    console.log('DEBUG: Criando documento real no banco');
    
    const { data: newDocument, error: createError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        filename: filename,
        pages: parseInt(pages),
        status: 'pending',
        total_cost: parseFloat(totalPrice),
        tipo_trad: isCertified === 'true' ? 'Certificado' : 'Notorizado',
        valor: parseFloat(totalPrice),
        is_bank_statement: isBankStatement === 'true',
        idioma_raiz: 'Portuguese', // Assumindo português
        file_id: fileId, // Salvar o fileId para referência
        verification_code: `TFE${Math.random().toString(36).substr(2, 6).toUpperCase()}` // Gerar código único
      })
      .select()
      .single();

    if (createError) {
      console.error('ERROR: Erro ao criar documento:', createError);
      throw new Error('Failed to create document');
    }

    console.log('DEBUG: Documento criado com sucesso:', newDocument);
    
    // Atualizar o documento com status processing
    const { data: updatedDocument, error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', newDocument.id)
      .select()
      .single();

    if (updateError) {
      console.error('ERROR: Erro ao atualizar documento:', updateError);
      throw new Error('Failed to update document');
    }

    console.log('DEBUG: Documento atualizado com sucesso:', updatedDocument);

    // Criar registro na tabela documents_to_be_verified
    console.log('DEBUG: Criando documento para verificação...');
    const { data: verificationDoc, error: verificationError } = await supabase
      .from('documents_to_be_verified')
      .insert({
        user_id: userId,
        filename: filename,
        pages: parseInt(pages),
        status: 'pending',
        total_cost: parseFloat(totalPrice),
        is_bank_statement: isBankStatement === 'true',
        source_language: 'portuguese', // Assumindo português como idioma fonte
        target_language: 'english', // Assumindo inglês como idioma destino
        translation_status: 'pending',
        file_id: fileId, // Salvar o fileId para referência
        verification_code: newDocument.verification_code // Usar o mesmo código do documento principal
      })
      .select()
      .single();

    if (verificationError) {
      console.error('ERROR: Erro ao criar documento para verificação:', verificationError);
      throw new Error('Failed to create verification document');
    }

    console.log('DEBUG: Documento para verificação criado:', verificationDoc);
    
    const realDocumentId = newDocument.id;

    // Salvar a sessão na tabela stripe_sessions
    console.log('DEBUG: Salvando sessão na tabela...');
    const { data: sessionData, error: sessionError } = await supabase
      .from('stripe_sessions')
      .upsert({
        session_id: session.id,
        document_id: realDocumentId,
        metadata: session.metadata,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (sessionError) {
      console.error('ERROR: Erro ao salvar sessão na tabela:', sessionError);
    } else {
      console.log('DEBUG: Sessão salva na tabela:', sessionData);
    }

    // Log do pagamento bem-sucedido
    console.log('SUCCESS: Pagamento processado com sucesso para documento:', realDocumentId);
    console.log('SUCCESS: Documento criado no banco. Arquivo será enviado na página de sucesso.');

  } catch (error) {
    console.error('ERROR: Erro ao processar checkout session:', error);
    throw error;
  }
} 