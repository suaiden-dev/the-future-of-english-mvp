import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Função para calcular o preço baseado nos critérios do modal de upload
function calculatePrice(pages: number, isCertified: boolean, isNotarized: boolean, isBankStatement: boolean): number {
  let pricePerPage = 0;
  
  // Novo modelo de preços: apenas "Certified / Notarized" a $20 por página
  if (isBankStatement) {
    pricePerPage = 25; // $20 base + $5 bank statement fee
  } else {
    pricePerPage = 20; // $20 per page para Certified / Notarized
  }
  
  return pricePerPage * pages;
}

// Function to generate service description
function generateServiceDescription(pages: number, isCertified: boolean, isNotarized: boolean, isBankStatement: boolean): string {
  const services = ['Certified / Notarized'];
  
  if (isBankStatement) services.push('Bank Statement');
  
  const serviceText = ` (${services.join(', ')})`;
  return `Document Translation - ${pages} page${pages > 1 ? 's' : ''}${serviceText}`;
}

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

    // Obter dados do corpo da requisição
    const { 
      pages, 
      isCertified, 
      isNotarized, 
      isBankStatement, 
      fileId, 
      filePath,
      isMobile,
      userId,
      userEmail, // Adicionar email do usuário
      filename,
      fileSize,
      fileType,
      originalLanguage,
      documentId, // Adicionar documentId
      clientName // Adicionar clientName
    } = await req.json();

    console.log('DEBUG: Dados recebidos:', {
      pages, isCertified, isNotarized, isBankStatement, fileId, filePath, isMobile, userId, userEmail, filename, fileSize, fileType, originalLanguage, clientName
    });

    // Validações
    if (!pages || pages < 1) {
      throw new Error('Número de páginas inválido');
    }
    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }
    
    // Validação específica para mobile vs desktop
    if (isMobile) {
      if (!filePath && !fileId) {
        throw new Error('Caminho do arquivo ou ID do arquivo é obrigatório para dispositivos móveis');
      }
    } else {
      if (!fileId) {
        throw new Error('ID do arquivo é obrigatório para desktop');
      }
    }

    // Usar fileId para desktop ou filePath para mobile
    const fileIdentifier = isMobile ? (filePath || fileId) : fileId;

    // Calcular preço
    const totalPrice = calculatePrice(pages, isCertified, isNotarized, isBankStatement);
    const serviceDescription = generateServiceDescription(pages, isCertified, isNotarized, isBankStatement);

    console.log('DEBUG: Preço calculado:', totalPrice);
    console.log('DEBUG: Descrição do serviço:', serviceDescription);

    // Obter chave secreta do Stripe das variáveis de ambiente
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY não configurada');
    }

    // Importar Stripe dinamicamente
    const stripe = new (await import('https://esm.sh/stripe@14.21.0')).default(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail, // Pré-preencher email do usuário
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Document Translation',
              description: serviceDescription,
              metadata: {
                fileId: fileIdentifier,
                userId,
                userEmail, // Adicionar email nos metadados
                filename,
                pages: pages.toString(),
                isCertified: (isCertified || false).toString(),
                isNotarized: (isNotarized || false).toString(),
                isBankStatement: (isBankStatement || false).toString(),
                isMobile: (isMobile || false).toString(),
                fileSize: fileSize?.toString() || '',
                fileType: fileType || '',
                originalLanguage: originalLanguage || '',
                documentId: documentId || '', // Adicionar documentId aos metadados
                clientName: clientName || '', // Adicionar clientName aos metadados
              },
            },
            unit_amount: Math.round(totalPrice * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/payment-cancelled?document_id=${documentId || ''}`, // Adiciona validação para documentId
      locale: 'en', // Force English language
      billing_address_collection: 'auto',
      currency: 'usd', // Force USD currency
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
      metadata: {
        fileId: fileIdentifier,
        userId,
        userEmail, // Adicionar email nos metadados
        filename,
        pages: pages.toString(),
        isCertified: (isCertified || false).toString(),
        isNotarized: (isNotarized || false).toString(),
        isBankStatement: (isBankStatement || false).toString(),
        totalPrice: totalPrice.toString(),
        isMobile: (isMobile || false).toString(),
        fileSize: fileSize?.toString() || '',
        fileType: fileType || '',
        originalLanguage: originalLanguage || '',
        documentId: documentId || '', // Adicionar documentId aos metadados
        clientName: clientName || '', // Adicionar clientName aos metadados
      },
    });

    console.log('DEBUG: Sessão do Stripe criada:', session.id);

    // Inserir dados da sessão na tabela stripe_sessions
    try {
      // Criar cliente Supabase para inserir na tabela
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
        
        console.log('DEBUG: Tentando inserir na tabela stripe_sessions');
        console.log('DEBUG: Session ID:', session.id);
        console.log('DEBUG: Document ID:', documentId);
        console.log('DEBUG: User ID:', userId);
        
        const { data: sessionRecord, error: insertError } = await supabaseClient
          .from('stripe_sessions')
          .insert({
            session_id: session.id,
            document_id: documentId || null,
            user_id: userId,
            metadata: {
              fileId: fileIdentifier,
              userId,
              userEmail,
              filename,
              pages,
              isCertified,
              isNotarized,
              isBankStatement,
              totalPrice,
              isMobile,
              fileSize,
              fileType,
              originalLanguage,
              documentId,
              clientName
            },
            payment_status: 'pending',
            amount: totalPrice,
            currency: 'USD'
          })
          .select()
          .single();

        if (insertError) {
          console.error('WARNING: Erro ao inserir na tabela stripe_sessions:', insertError);
          console.error('DEBUG: Detalhes do erro:', JSON.stringify(insertError, null, 2));
          // Não falhar se isso der erro, apenas log
        } else {
          console.log('DEBUG: Sessão inserida na tabela stripe_sessions com sucesso');
          console.log('DEBUG: Session ID salvo:', session.id);
          console.log('DEBUG: Document ID:', documentId);
          console.log('DEBUG: User ID:', userId);
          console.log('DEBUG: Record ID:', sessionRecord.id);
        }
      } else {
        console.error('WARNING: Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas');
        console.error('DEBUG: SUPABASE_URL:', supabaseUrl);
        console.error('DEBUG: SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '***' : 'não configurada');
      }
    } catch (dbError) {
      console.error('WARNING: Erro ao inserir na tabela stripe_sessions:', dbError);
      console.error('DEBUG: Stack trace:', dbError.stack);
      // Não falhar se isso der erro, apenas log
    }

    return new Response(
      JSON.stringify({ 
        sessionId: session.id, 
        url: session.url,
        totalPrice 
      }),
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