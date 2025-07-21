import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Função para calcular o preço baseado nos critérios do modal de upload
function calculatePrice(pages: number, isCertified: boolean, isNotarized: boolean, isBankStatement: boolean): number {
  let pricePerPage = 0;
  
  // Calcular preço baseado no tipo de tradução e se é extrato bancário
  if (isBankStatement) {
    // Preços para extratos bancários
    if (isCertified) {
      pricePerPage = 25; // Certificado + extrato bancário
    } else if (isNotarized) {
      pricePerPage = 35; // Notorizado + extrato bancário
    }
  } else {
    // Preços normais
    if (isCertified) {
      pricePerPage = 15; // Certificado normal
    } else if (isNotarized) {
      pricePerPage = 20; // Notorizado normal
    }
  }
  
  return pricePerPage * pages;
}

// Function to generate service description
function generateServiceDescription(pages: number, isCertified: boolean, isNotarized: boolean, isBankStatement: boolean): string {
  const services = [];
  
  if (isCertified) services.push('Certified');
  if (isNotarized) services.push('Notarized');
  if (isBankStatement) services.push('Bank Statement');
  
  const serviceText = services.length > 0 ? ` (${services.join(', ')})` : '';
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
      originalLanguage
    } = await req.json();

    console.log('DEBUG: Dados recebidos:', {
      pages, isCertified, isNotarized, isBankStatement, fileId, filePath, isMobile, userId, userEmail, filename, fileSize, fileType, originalLanguage
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
              },
            },
            unit_amount: Math.round(totalPrice * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/payment-cancelled`,
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
      },
    });

    console.log('DEBUG: Sessão do Stripe criada:', session.id);

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