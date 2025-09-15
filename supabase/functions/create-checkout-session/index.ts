import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

// Definição dos cabeçalhos CORS para reutilização
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Interface para tipar o corpo da requisição
interface RequestBody {
  pages: number;
  isCertified: boolean;
  isNotarized: boolean;
  isBankStatement: boolean;
  fileId?: string;
  filePath?: string;
  isMobile: boolean;
  userId: string;
  userEmail: string;
  filename: string;
  fileSize?: number;
  fileType?: string;
  originalLanguage?: string;
  targetLanguage?: string;
  documentType?: string;
  documentId?: string;
  clientName?: string;
  sourceCurrency?: string;
  targetCurrency?: string;
}

// Função para calcular o preço baseado nos critérios
function calculatePrice(pages: number, isNotarized: boolean, isBankStatement: boolean): number {
  let basePrice = isNotarized ? 20 : 15; // $20 para Notarized, $15 para Certified
  let bankFee = isBankStatement ? 10 : 0; // $10 taxa adicional para extratos bancários
  return pages * (basePrice + bankFee);
}

// Função para gerar a descrição do serviço
function generateServiceDescription(pages: number, isNotarized: boolean, isBankStatement: boolean): string {
  const services = [isNotarized ? 'Notarized' : 'Certified'];
  if (isBankStatement) services.push('Bank Statement');
  
  const serviceText = ` (${services.join(', ')})`;
  return `Document Translation - ${pages} page${pages > 1 ? 's' : ''}${serviceText}`;
}

Deno.serve(async (req: Request) => {
  // O manuseio de preflight (OPTIONS) deve ser a primeira coisa na função
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validar método HTTP
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Obter dados do corpo da requisição e aplicar tipagem
    const {
      pages,
      isCertified,
      isNotarized,
      isBankStatement,
      fileId,
      filePath,
      isMobile,
      userId,
      userEmail,
      filename,
      fileSize,
      fileType,
      originalLanguage,
      targetLanguage,
      documentType,
      documentId,
      clientName,
      sourceCurrency,
      targetCurrency
    } = await req.json() as RequestBody;

    console.log('DEBUG: Dados recebidos:', {
      pages, isCertified, isNotarized, isBankStatement, fileId, filePath, isMobile, userId, userEmail, filename, fileSize, fileType, originalLanguage, targetLanguage, documentType, clientName, sourceCurrency, targetCurrency
    });

    console.log('DEBUG: VERIFICAÇÃO CRÍTICA - CAMPOS IMPORTANTES:');
    console.log('DEBUG: documentType type:', typeof documentType, 'value:', documentType);
    console.log('DEBUG: targetLanguage type:', typeof targetLanguage, 'value:', targetLanguage);
    console.log('DEBUG: sourceCurrency type:', typeof sourceCurrency, 'value:', sourceCurrency);
    console.log('DEBUG: targetCurrency type:', typeof targetCurrency, 'value:', targetCurrency);
    console.log('DEBUG: isNotarized type:', typeof isNotarized, 'value:', isNotarized);

    // Validações de entrada
    if (!pages || pages < 1) {
      throw new Error('Número de páginas inválido');
    }
    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }
    if (!userEmail) {
      throw new Error('Email do usuário é obrigatório');
    }
    
    // Validação específica para mobile vs desktop
    const fileIdentifier = isMobile ? (filePath || fileId) : fileId;
    if (!fileIdentifier) {
      throw new Error('ID ou caminho do arquivo é obrigatório');
    }
    
    // Obter chaves de API das variáveis de ambiente com validação
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY não configurada');
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Variáveis de ambiente do Supabase não configuradas. A sessão não será salva no banco de dados.');
    }

    // Calcular preço e descrição
    const totalPrice = calculatePrice(pages, isNotarized, isBankStatement);
    const serviceDescription = generateServiceDescription(pages, isNotarized, isBankStatement);

    console.log('DEBUG: Preço calculado:', totalPrice);
    console.log('DEBUG: Descrição do serviço:', serviceDescription);

    // Inicializar o cliente Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-04-10', // Usar uma versão de API válida e recente
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Criar sessão de Checkout do Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Document Translation',
              description: serviceDescription,
            },
            unit_amount: Math.round(totalPrice * 100), // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/payment-cancelled?document_id=${documentId || ''}`,
      locale: 'en',
      billing_address_collection: 'auto',
      metadata: {
        fileId: fileIdentifier,
        userId,
        userEmail,
        filename: filename || '',
        pages: pages.toString(),
        isCertified: (isCertified || false).toString(),
        isNotarized: (isNotarized || false).toString(),
        isBankStatement: (isBankStatement || false).toString(),
        isMobile: (isMobile || false).toString(),
        fileSize: fileSize?.toString() || '',
        fileType: fileType || '',
        originalLanguage: originalLanguage || '',
        targetLanguage: targetLanguage || '',
        documentType: documentType || '',
        documentId: documentId || '',
        clientName: clientName || '',
        sourceCurrency: sourceCurrency || '',
        targetCurrency: targetCurrency || '',
        totalPrice: totalPrice.toString(),
      },
    });

    console.log('DEBUG: Sessão do Stripe criada:', session.id);

    // Inserir dados da sessão na tabela do Supabase se as chaves estiverem disponíveis
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
        
        const metadataToSave = {
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
          targetLanguage,
          documentType,
          documentId,
          clientName,
          sourceCurrency,
          targetCurrency,
        };

        console.log('DEBUG: Tentando inserir na tabela stripe_sessions...');
        console.log('DEBUG: Dados a serem inseridos:', {
          session_id: session.id,
          document_id: documentId || null,
          user_id: userId,
          metadata: metadataToSave,
          payment_status: 'pending',
          amount: totalPrice,
          currency: 'usd'
        });

        const { data: insertData, error: insertError } = await supabaseClient
          .from('stripe_sessions')
          .insert({
            session_id: session.id,
            document_id: documentId || null,
            user_id: userId,
            metadata: metadataToSave,
            payment_status: 'pending',
            amount: totalPrice,
            currency: 'usd'
          })
          .select();

        if (insertError) {
          console.error('ERROR: Erro ao inserir na tabela stripe_sessions:', insertError);
          console.error('DEBUG: Detalhes do erro stripe_sessions:', JSON.stringify(insertError, null, 2));
          console.error('DEBUG: Código do erro stripe_sessions:', insertError.code);
          console.error('DEBUG: Mensagem do erro stripe_sessions:', insertError.message);
        } else {
          console.log('DEBUG: Sessão inserida na tabela stripe_sessions com sucesso:', session.id);
          console.log('DEBUG: Dados inseridos stripe_sessions:', JSON.stringify(insertData, null, 2));
        }
      } catch (dbError) {
        console.error('WARNING: Erro crítico ao tentar salvar sessão no banco de dados:', dbError);
      }
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
        // É crucial incluir os cabeçalhos CORS também nas respostas de erro
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});