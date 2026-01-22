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
    const stripeSecretKeyTest = Deno.env.get('STRIPE_SECRET_KEY_TEST');
    const stripeSecretKeyProd = Deno.env.get('STRIPE_SECRET_KEY_PROD') || Deno.env.get('STRIPE_SECRET_KEY');
    const stripeSecretKeyDefault = Deno.env.get('STRIPE_SECRET_KEY');
    
    const stripeWebhookSecretTest = Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST');
    const stripeWebhookSecretProd = Deno.env.get('STRIPE_WEBHOOK_SECRET_PROD') || Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    const supabaseUrl = Deno.env.get('PROJECT_URL');
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY');

    console.log('DEBUG: Verificando variáveis de ambiente...');
    console.log('DEBUG: STRIPE_SECRET_KEY_TEST:', stripeSecretKeyTest ? '✅ Configurada' : '❌ Não configurada');
    console.log('DEBUG: STRIPE_SECRET_KEY_PROD:', Deno.env.get('STRIPE_SECRET_KEY_PROD') ? '✅ Configurada' : '❌ Não configurada (usando STRIPE_SECRET_KEY como fallback)');
    console.log('DEBUG: STRIPE_SECRET_KEY:', stripeSecretKeyDefault ? '✅ Configurada' : '❌ Não configurada');
    console.log('DEBUG: STRIPE_WEBHOOK_SECRET_TEST:', stripeWebhookSecretTest ? '✅ Configurada' : '❌ Não configurada');
    console.log('DEBUG: STRIPE_WEBHOOK_SECRET_PROD:', Deno.env.get('STRIPE_WEBHOOK_SECRET_PROD') ? '✅ Configurada' : '❌ Não configurada (usando STRIPE_WEBHOOK_SECRET como fallback)');
    console.log('DEBUG: STRIPE_WEBHOOK_SECRET:', stripeWebhookSecret ? '✅ Configurada' : '❌ Não configurada');
    console.log('DEBUG: PROJECT_URL:', supabaseUrl ? '✅ Configurada' : '❌ Não configurada');
    console.log('DEBUG: SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Configurada' : '❌ Não configurada');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('ERROR: Variáveis de ambiente essenciais não configuradas');
      throw new Error('Environment variables not configured');
    }

    // Criar cliente Supabase com service_role para contornar RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Tentar validar assinatura do webhook com múltiplos secrets
    // E usar a secret key correspondente ao webhook secret que funcionar
    let event;
    let usedSecretKey: string | null = null;
    let usedWebhookSecret: string | null = null;
    
    const webhookSecrets = [
      { secret: stripeWebhookSecretProd, secretKey: stripeSecretKeyProd, env: 'PROD' },
      { secret: stripeWebhookSecretTest, secretKey: stripeSecretKeyTest, env: 'TEST' },
      { secret: stripeWebhookSecret, secretKey: stripeSecretKeyDefault, env: 'DEFAULT' }
    ].filter(w => w.secret && w.secretKey); // Remover secrets vazios

    console.log(`DEBUG: Tentando validar com ${webhookSecrets.length} webhook secret(s)`);

    let lastError: Error | null = null;
    for (const { secret, secretKey, env } of webhookSecrets) {
      try {
        console.log(`DEBUG: Tentando validar com webhook secret ${env}...`);
        
        // Usar a secret key correspondente para inicializar o Stripe
        const stripe = new (await import('https://esm.sh/stripe@14.21.0')).default(secretKey, {
          apiVersion: '2024-12-18.acacia',
        });
        
        event = await stripe.webhooks.constructEventAsync(body, signature, secret);
        usedSecretKey = secretKey;
        usedWebhookSecret = secret;
        console.log(`✅ Webhook validado com sucesso usando secret ${env}`);
        break;
      } catch (err) {
        console.log(`⚠️ Falha ao validar com secret ${env}:`, err.message);
        lastError = err;
        continue;
      }
    }

    if (!event || !usedSecretKey) {
      console.error('ERROR: Falha ao validar webhook com todos os secrets disponíveis');
      console.error('ERROR: Último erro:', lastError?.message);
      throw new Error('Webhook signature verification failed with all available secrets');
    }

    // Inicializar Stripe com a chave que funcionou
    const stripe = new (await import('https://esm.sh/stripe@14.21.0')).default(usedSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });

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
    const metadata = session.metadata || {};
    const userId = metadata.userId;
    const documentCount = parseInt(metadata.documentCount || '1', 10);
    const hasDoc0Metadata = metadata.doc0_documentId !== undefined;
    const isMultipleDocuments = documentCount > 1 || hasDoc0Metadata;

    console.log('DEBUG: Número de documentos:', documentCount);
    console.log('DEBUG: É múltiplos documentos?', isMultipleDocuments);

    if (!userId) {
      console.log('WARNING: userId não encontrado nos metadados, pulando processamento');
      return;
    }

    const supabaseUrl = Deno.env.get('PROJECT_URL');
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY');

    // Processar múltiplos documentos ou documento único
    if (isMultipleDocuments) {
      console.log('✅ MÚLTIPLOS DOCUMENTOS DETECTADOS - Processando...');
      
      const documentIdsStr = metadata.documentIds || '';
      const documentIds = documentIdsStr ? documentIdsStr.split(',').filter((id: string) => id.trim()) : [];
      
      // Se não tiver documentIds no formato string, coletar dos metadados doc0_*, doc1_*, etc.
      if (documentIds.length === 0) {
        for (let i = 0; i < documentCount; i++) {
          const docId = metadata[`doc${i}_documentId`];
          if (docId) {
            documentIds.push(docId);
          }
        }
      }
      
      console.log('DEBUG: IDs dos documentos encontrados:', documentIds);

      if (documentIds.length === 0) {
        console.error('ERROR: Nenhum document ID encontrado para múltiplos documentos');
        return;
      }

      // Para múltiplos documentos, criar apenas 1 registro de pagamento com o valor total
      // antes de processar os documentos
      const totalAmountPaid = session.amount_total ? session.amount_total / 100 : 0;
      if (totalAmountPaid > 0) {
        console.log('DEBUG: Criando registro único de pagamento para múltiplos documentos');
        console.log('DEBUG: Valor total pago:', totalAmountPaid);
        
        // Extrair valores dos metadados (com markup de taxas)
        const baseAmount = metadata.base_amount ? parseFloat(metadata.base_amount) : totalAmountPaid;
        const grossAmount = metadata.gross_amount ? parseFloat(metadata.gross_amount) : totalAmountPaid;
        const feeAmount = metadata.fee_amount ? parseFloat(metadata.fee_amount) : 0;
        
        console.log('DEBUG: Valores extraídos dos metadados:', {
          baseAmount,
          grossAmount,
          feeAmount
        });
        
        // Usar o primeiro documento como referência (document_id é obrigatório)
        const firstDocumentId = documentIds[0].trim();
        
        const paymentData = {
          document_id: firstDocumentId,
          user_id: userId,
          stripe_session_id: session.id,
          amount: baseAmount,        // Valor líquido (receita real)
          base_amount: baseAmount,   // Valor base (líquido desejado)
          gross_amount: grossAmount, // Valor bruto cobrado
          fee_amount: feeAmount,    // Taxa do Stripe paga pelo usuário
          currency: 'USD',
          status: 'completed',
          payment_method: 'card',
          payment_date: new Date().toISOString()
        };

        console.log('DEBUG: Dados do pagamento único a serem inseridos:', JSON.stringify(paymentData, null, 2));
        
        const { data: paymentRecord, error: paymentError } = await supabase
          .from('payments')
          .insert(paymentData)
          .select()
          .single();

        if (paymentError) {
          console.error('ERROR: Erro ao criar registro único de pagamento:', paymentError);
          console.error('DEBUG: Detalhes do erro:', JSON.stringify(paymentError, null, 2));
          // Não falhar o processo, apenas logar o erro
        } else {
          console.log('SUCCESS: Registro único de pagamento criado com sucesso:', paymentRecord.id);
          console.log('DEBUG: Valor total registrado:', paymentRecord.amount);
          
          // Criar comissões de afiliado diretamente no webhook (backup do trigger)
          // Isso garante que todas as comissões sejam criadas mesmo se o trigger falhar
          try {
            console.log('DEBUG: Criando comissões de afiliado para múltiplos documentos');
            
            // Buscar affiliate_id do usuário
            const { data: affiliateData, error: affiliateError } = await supabase
              .from('affiliate_referrals')
              .select('affiliate_id, referral_code')
              .eq('referred_user_id', userId)
              .is('payment_id', null)
              .order('created_at', { ascending: true })
              .limit(1)
              .single();
            
            if (!affiliateError && affiliateData) {
              // Extrair documentIds - usar o array documentIds que já foi extraído anteriormente
              // Também tentar buscar do array documents nos metadados se disponível
              let documentIdsForCommission = documentIds.filter((id: string) => id && id.trim());
              
              // Se não encontrou, tentar buscar do array documents nos metadados
              if (documentIdsForCommission.length === 0 && metadata.documents && Array.isArray(metadata.documents)) {
                documentIdsForCommission = metadata.documents
                  .map((doc: any) => doc.documentId)
                  .filter((id: string) => id && id.trim());
              }
              
              console.log('DEBUG: Document IDs para comissão:', documentIdsForCommission);
              console.log('DEBUG: Quantidade de documentos para comissão:', documentIdsForCommission.length);
              
              // Criar uma comissão para cada documento
              for (const docId of documentIdsForCommission) {
                if (!docId || !docId.trim()) continue;
                
                try {
                  const { error: commissionError } = await supabase
                    .from('affiliate_referrals')
                    .insert({
                      affiliate_id: affiliateData.affiliate_id,
                      referred_user_id: userId,
                      referral_code: affiliateData.referral_code,
                      status: 'confirmed',
                      commission_amount: 1.00,
                      available_for_withdrawal_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                      payment_id: paymentRecord.id,
                      document_id: docId.trim(),
                      created_at: new Date().toISOString()
                    })
                    .select();
                  
                  if (commissionError) {
                    // Se for erro de conflito (já existe), não é problema
                    if (commissionError.code === '23505') {
                      console.log('DEBUG: Comissão já existe para documento', docId, '(ignorando)');
                    } else {
                      console.error('WARNING: Erro ao criar comissão para documento', docId, ':', commissionError);
                    }
                  } else {
                    console.log('SUCCESS: Comissão criada para documento', docId);
                  }
                } catch (err) {
                  console.error('WARNING: Exceção ao criar comissão para documento', docId, ':', err);
                }
              }
            } else {
              console.log('DEBUG: Usuário não foi referido por afiliado ou erro ao buscar:', affiliateError);
            }
          } catch (commissionError) {
            console.error('WARNING: Erro ao processar comissões de afiliado:', commissionError);
            // Não falhar o processo por causa das comissões
          }
          
          // Enviar notificação de pagamento para admins e autenticadores
          try {
            console.log('DEBUG: Enviando notificação de pagamento único para múltiplos documentos');
            
            const notificationPayload = {
              payment_id: paymentRecord.id,
              user_id: userId,
              document_id: firstDocumentId, // Usar o primeiro documento como referência
              payment_method: 'stripe',
              amount: paymentRecord.amount,
              filename: `Multiple Documents (${documentIds.length})`,
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
              console.log('SUCCESS: Notificações de pagamento único enviadas:', notificationResult.message);
            } else {
              const errorText = await notificationResponse.text();
              console.error('WARNING: Falha ao enviar notificações de pagamento único:', notificationResponse.status, errorText);
            }
          } catch (notificationError) {
            console.error('WARNING: Erro ao enviar notificações de pagamento único:', notificationError);
            // Não falhar o processo por causa da notificação
          }
        }
      }

      // Processar cada documento (sem criar pagamentos adicionais)
      for (const docDocumentId of documentIds) {
        if (!docDocumentId || !docDocumentId.trim()) {
          continue;
        }

        await processDocument(docDocumentId, userId, session, supabase, metadata, supabaseUrl, supabaseServiceKey, true); // true = skipPayment
      }
    } else {
      // Documento único (retrocompatibilidade)
      console.log('✅ DOCUMENTO ÚNICO DETECTADO - Processando...');
      
      const {
        fileId,
        filename,
        pages,
        isCertified,
        isNotarized,
        isBankStatement,
        totalPrice,
        documentId,
        base_amount,
        gross_amount,
        fee_amount
      } = metadata;

      if (!documentId) {
        console.log('WARNING: documentId não encontrado nos metadados, pulando processamento');
        return;
      }

      await processDocument(documentId, userId, session, supabase, metadata, supabaseUrl, supabaseServiceKey);
    }

    console.log('SUCCESS: Todos os documentos processados com sucesso');

  } catch (error) {
    console.error('ERROR: Erro ao processar checkout session:', error);
    console.error('DEBUG: Stack trace:', error.stack);
    throw error;
  }
}

async function processDocument(documentId: string, userId: string, session: any, supabase: any, metadata: any, supabaseUrl: string | undefined, supabaseServiceKey: string | undefined, skipPayment: boolean = false) {
  try {
    console.log(`DEBUG: Processando documento ${documentId}`);

    // Buscar dados do documento do banco de dados
    const { data: documentData, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (docError || !documentData) {
      console.error('ERROR: Erro ao buscar documento:', docError);
      throw new Error('Failed to fetch document');
    }

    console.log('DEBUG: Dados do documento encontrados:', documentData);

    // Determinar índice do documento para buscar metadados corretos
    let docIndex = -1;
    const documentIdsStr = metadata.documentIds || '';
    const documentIds = documentIdsStr ? documentIdsStr.split(',').map((id: string) => id.trim()) : [];
    docIndex = documentIds.indexOf(documentId);
    
    // Se não encontrou no array, tentar buscar pelos metadados doc0_*, doc1_*, etc.
    if (docIndex === -1) {
      for (let i = 0; i < 10; i++) { // Limitar a 10 documentos
        if (metadata[`doc${i}_documentId`] === documentId) {
          docIndex = i;
          break;
        }
      }
    }

    // Buscar metadados do documento (múltiplos ou único)
    const docFilename = docIndex >= 0 ? metadata[`doc${docIndex}_filename`] : metadata.filename || documentData.filename;
    const docPages = docIndex >= 0 ? parseInt(metadata[`doc${docIndex}_pages`] || '1', 10) : parseInt(metadata.pages || documentData.pages || '1', 10);
    const docIsNotarized = docIndex >= 0 ? metadata[`doc${docIndex}_isNotarized`] === 'true' : metadata.isNotarized === 'true';
    const docIsBankStatement = docIndex >= 0 ? metadata[`doc${docIndex}_isBankStatement`] === 'true' : metadata.isBankStatement === 'true';
    const docOriginalLanguage = docIndex >= 0 ? metadata[`doc${docIndex}_originalLanguage`] : metadata.originalLanguage || documentData.original_language || 'Portuguese';
    const docTargetLanguage = docIndex >= 0 ? metadata[`doc${docIndex}_targetLanguage`] : metadata.targetLanguage || documentData.target_language || 'English';
    const docDocumentType = docIndex >= 0 ? metadata[`doc${docIndex}_documentType`] : metadata.documentType || documentData.document_type || 'Certified';
    const docSourceCurrency = docIndex >= 0 ? metadata[`doc${docIndex}_sourceCurrency`] : metadata.sourceCurrency || null;
    const docTargetCurrency = docIndex >= 0 ? metadata[`doc${docIndex}_targetCurrency`] : metadata.targetCurrency || null;
    const docFileId = docIndex >= 0 ? (metadata[`doc${docIndex}_filePath`] || metadata[`doc${docIndex}_fileId`]) : metadata.fileId || documentData.file_id;

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

    // Criar registro na tabela payments (pular se skipPayment for true - pagamento já foi criado para múltiplos documentos)
    if (!skipPayment) {
      try {
        console.log('DEBUG: Criando registro na tabela payments');
        console.log('DEBUG: Cliente Supabase criado:', supabase ? '✅' : '❌');
        
        // Obter valor total pago do Stripe (em centavos, converter para dólares)
        const totalAmountPaid = session.amount_total ? session.amount_total / 100 : 0;
        console.log('DEBUG: Valor total pago (do Stripe):', totalAmountPaid);
        
        // Extrair valores dos metadados (com markup de taxas)
        const baseAmount = base_amount ? parseFloat(base_amount) : (totalAmountPaid > 0 ? totalAmountPaid : parseFloat(metadata.totalPrice || '0'));
        const grossAmount = gross_amount ? parseFloat(gross_amount) : totalAmountPaid;
        const feeAmount = fee_amount ? parseFloat(fee_amount) : 0;
        
        console.log('DEBUG: Valores extraídos dos metadados:', {
          baseAmount,
          grossAmount,
          feeAmount
        });
        
        // Para documento único, usar baseAmount como amount (receita líquida)
        const paymentAmount = baseAmount;
        
        console.log('DEBUG: Valor final a ser registrado no pagamento (líquido):', paymentAmount);

        const paymentData = {
          document_id: documentId,
          user_id: userId,
          stripe_session_id: session.id,
          amount: paymentAmount,        // Valor líquido (receita real)
          base_amount: baseAmount,      // Valor base (líquido desejado)
          gross_amount: grossAmount,    // Valor bruto cobrado
          fee_amount: feeAmount,       // Taxa do Stripe paga pelo usuário
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

        // O envio para tradução é feito pela página PaymentSuccess.tsx após o upload do arquivo
        // Não é necessário enviar aqui para evitar duplicação
        console.log('✅ Documento processado. O envio para tradução será feito pela página PaymentSuccess.');
        
        // Enviar notificação de pagamento para admins e autenticadores
        try {
          console.log('DEBUG: Enviando notificação de pagamento Stripe via payment-notifications function');
          
          const notificationPayload = {
            payment_id: paymentRecord.id,
            user_id: userId,
            document_id: documentId,
            payment_method: 'stripe',
            amount: paymentAmount,
            filename: docFilename || 'Unknown Document',
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
      } catch (paymentError) {
        console.error('ERROR: Erro ao criar registro na tabela payments:', paymentError);
        throw paymentError;
      }
    } else {
      console.log('DEBUG: Pagamento já foi criado para múltiplos documentos, pulando criação individual');
      // O envio para tradução é feito pela página PaymentSuccess.tsx após o upload do arquivo
      console.log('✅ Documento processado. O envio para tradução será feito pela página PaymentSuccess.');
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
              filename: docFilename || 'Unknown Document',
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

    // Log do processamento bem-sucedido
    console.log('SUCCESS: Documento processado com sucesso:', documentId);
    console.log('SUCCESS: Documento atualizado para status processing.');
    if (!skipPayment) {
      console.log('SUCCESS: Registro criado na tabela payments.');
    }
    console.log('SUCCESS: stripe_sessions atualizado para completed.');

  } catch (error) {
    console.error('ERROR: Erro ao processar checkout session:', error);
    console.error('DEBUG: Stack trace:', error.stack);
    throw error;
  }
} 