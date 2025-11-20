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

// Interface para um documento individual
interface DocumentItem {
  fileId?: string;
  filePath?: string;
  documentId: string;
  pages: number;
  isNotarized: boolean;
  isBankStatement: boolean;
  filename: string;
  originalFilename?: string;
  fileSize?: number;
  fileType?: string;
  originalLanguage?: string;
  targetLanguage?: string;
  documentType?: string;
  sourceCurrency?: string;
  targetCurrency?: string;
}

// Interface para tipar o corpo da requisição (múltiplos documentos)
interface RequestBodyMultiple {
  documents: DocumentItem[];
  userId: string;
  userEmail: string;
  isMobile: boolean;
  clientName?: string;
  totalAmount?: number;
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

// Interface para informações do ambiente
interface EnvironmentInfo {
  environment: 'production' | 'test';
  isProduction: boolean;
  isTest: boolean;
  referer: string;
  origin: string;
  host: string;
  userAgent: string;
}

/**
 * Detecta o ambiente baseado nos headers HTTP da requisição
 * Produção: quando o header contém 'lushamerica.com'
 * Teste: qualquer outro caso (localhost, outros domínios, etc.)
 */
function detectEnvironment(req: Request): EnvironmentInfo {
  const referer = req.headers.get('referer') || '';
  const origin = req.headers.get('origin') || '';
  const host = req.headers.get('host') || '';
  const userAgent = req.headers.get('user-agent') || '';

  // Detect production: if any header contains lushamerica.com
  const isProductionDomain = 
    referer.includes('lushamerica.com') ||
    origin.includes('lushamerica.com') ||
    host.includes('lushamerica.com');

  // Determine environment: production > test
  let environment: 'production' | 'test';
  if (isProductionDomain) {
    environment = 'production';
  } else {
    environment = 'test';
  }

  const envInfo: EnvironmentInfo = {
    environment,
    isProduction: isProductionDomain,
    isTest: !isProductionDomain,
    referer,
    origin,
    host,
    userAgent
  };

  // Log environment detection for debugging
  console.log('🔍 Environment Detection:', {
    referer,
    origin,
    host,
    environment,
    userAgent: userAgent.substring(0, 100) + '...', // Truncate for readability
    isProductionDomain
  });
  console.log(`🎯 Environment detected: ${environment.toUpperCase()}`);

  return envInfo;
}

/**
 * Obtém as variáveis de ambiente do Stripe baseado no ambiente detectado
 * Produção: tenta STRIPE_SECRET_KEY_PROD, se não existir usa STRIPE_SECRET_KEY
 * Teste: usa STRIPE_SECRET_KEY_TEST
 */
function getStripeEnvironmentVariables(envInfo: EnvironmentInfo): { secretKey: string } {
  let secretKey = '';

  if (envInfo.isProduction) {
    // Produção: tenta PROD primeiro, depois fallback para STRIPE_SECRET_KEY
    secretKey = Deno.env.get('STRIPE_SECRET_KEY_PROD') || Deno.env.get('STRIPE_SECRET_KEY') || '';
    console.log('🔍 Ambiente: PRODUCTION');
  } else {
    // Teste: usa STRIPE_SECRET_KEY_TEST
    secretKey = Deno.env.get('STRIPE_SECRET_KEY_TEST') || '';
    console.log('🔍 Ambiente: TEST');
  }

  console.log(`🔑 Stripe Config (${envInfo.environment}):`, {
    secretKey: secretKey ? `${secretKey.substring(0, 20)}...` : '❌ Não configurada',
    source: envInfo.isProduction 
      ? (Deno.env.get('STRIPE_SECRET_KEY_PROD') ? 'STRIPE_SECRET_KEY_PROD' : 'STRIPE_SECRET_KEY')
      : 'STRIPE_SECRET_KEY_TEST'
  });

  if (!secretKey) {
    const expectedVar = envInfo.isProduction 
      ? 'STRIPE_SECRET_KEY_PROD ou STRIPE_SECRET_KEY'
      : 'STRIPE_SECRET_KEY_TEST';
    throw new Error(`${expectedVar} não configurada`);
  }

  return { secretKey };
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

    const requestBody = await req.json() as RequestBodyMultiple;
    console.log('🔍 DEBUG: Request body recebido:', JSON.stringify(requestBody, null, 2));

    const { documents, userId, userEmail, isMobile, clientName } = requestBody;

    console.log('🔍 DEBUG: Processando múltiplos documentos:', documents.length);

    // Validações
    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }
    if (!userEmail) {
      throw new Error('Email do usuário é obrigatório');
    }
    if (!documents || documents.length === 0) {
      throw new Error('Nenhum documento fornecido');
    }

    // Validar cada documento
    for (const doc of documents) {
      if (!doc.pages || doc.pages < 1) {
        throw new Error(`Número de páginas inválido para documento ${doc.filename || doc.documentId}`);
      }
      if (!doc.documentId) {
        throw new Error(`Document ID é obrigatório para documento ${doc.filename || 'desconhecido'}`);
      }
      const fileIdentifier = isMobile ? (doc.filePath || doc.fileId) : doc.fileId;
      if (!fileIdentifier) {
        throw new Error(`ID ou caminho do arquivo é obrigatório para documento ${doc.filename || doc.documentId}`);
      }
    }
    
    // Detectar ambiente e obter chaves do Stripe apropriadas
    const envInfo = detectEnvironment(req);
    const stripeConfig = getStripeEnvironmentVariables(envInfo);
    const stripeSecretKey = stripeConfig.secretKey;
    
    // Obter variáveis do Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey) {
      throw new Error(`STRIPE_SECRET_KEY_${envInfo.isProduction ? 'PROD' : 'TEST'} não configurada`);
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Variáveis de ambiente do Supabase não configuradas. A sessão não será salva no banco de dados.');
    }

    // Calcular preço total e criar line items para cada documento
    let totalPrice = 0;
    const lineItems: any[] = [];
    const documentIds: string[] = [];
    const allMetadata: any = {
      userId,
      userEmail,
      isMobile: isMobile.toString(),
      clientName: clientName || '',
      documentCount: documents.length.toString(),
    };

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const docPrice = calculatePrice(doc.pages, doc.isNotarized, doc.isBankStatement);
      totalPrice += docPrice;
      
      const fileIdentifier = isMobile ? (doc.filePath || doc.fileId) : doc.fileId;
      const serviceDescription = generateServiceDescription(doc.pages, doc.isNotarized, doc.isBankStatement);
      
      // Adicionar line item para este documento
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Document Translation ${i + 1}`,
            description: `${doc.originalFilename || doc.filename} - ${serviceDescription}`,
          },
          unit_amount: Math.round(docPrice * 100), // Stripe usa centavos
        },
        quantity: 1,
      });

      // Adicionar metadados do documento
      documentIds.push(doc.documentId);
      allMetadata[`doc${i}_fileId`] = fileIdentifier || '';
      allMetadata[`doc${i}_filename`] = doc.filename || '';
      allMetadata[`doc${i}_originalFilename`] = doc.originalFilename || doc.filename || '';
      allMetadata[`doc${i}_pages`] = doc.pages.toString();
      allMetadata[`doc${i}_isNotarized`] = doc.isNotarized.toString();
      allMetadata[`doc${i}_isBankStatement`] = doc.isBankStatement.toString();
      allMetadata[`doc${i}_documentId`] = doc.documentId;
      allMetadata[`doc${i}_fileSize`] = doc.fileSize?.toString() || '';
      allMetadata[`doc${i}_fileType`] = doc.fileType || '';
      allMetadata[`doc${i}_originalLanguage`] = doc.originalLanguage || '';
      allMetadata[`doc${i}_targetLanguage`] = doc.targetLanguage || '';
      allMetadata[`doc${i}_documentType`] = doc.documentType || '';
      allMetadata[`doc${i}_sourceCurrency`] = doc.sourceCurrency || '';
      allMetadata[`doc${i}_targetCurrency`] = doc.targetCurrency || '';
    }

    allMetadata.totalPrice = totalPrice.toString();
    allMetadata.documentIds = documentIds.join(',');

    console.log('DEBUG: Preço total calculado:', totalPrice);
    console.log('DEBUG: Número de line items:', lineItems.length);
    console.log(`✅ Stripe config loaded for ${envInfo.environment} environment`);

    // Inicializar o cliente Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-04-10',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Criar sessão de Checkout do Stripe com múltiplos line items
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/payment-cancelled?document_ids=${documentIds.join(',')}`,
      locale: 'en',
      billing_address_collection: 'auto',
      metadata: allMetadata,
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

        // Marcar todos os documentos como aguardando pagamento Stripe
        for (const docId of documentIds) {
          const { error: docError } = await supabaseClient
            .from('documents')
            .update({ 
              status: 'stripe_pending',
              updated_at: new Date().toISOString()
            })
            .eq('id', docId);

          if (docError) {
            console.error(`❌ Erro ao marcar documento ${docId} como Stripe pending:`, docError);
          } else {
            console.log(`✅ Documento ${docId} marcado como Stripe pending`);
          }
        }

        // Salvar metadados completos
        const metadataToSave = {
          documents: documents.map(doc => ({
            fileId: isMobile ? (doc.filePath || doc.fileId) : doc.fileId,
            documentId: doc.documentId,
            filename: doc.filename,
            originalFilename: doc.originalFilename || doc.filename,
            pages: doc.pages,
            isNotarized: doc.isNotarized,
            isBankStatement: doc.isBankStatement,
            fileSize: doc.fileSize,
            fileType: doc.fileType,
            originalLanguage: doc.originalLanguage,
            targetLanguage: doc.targetLanguage,
            documentType: doc.documentType,
            sourceCurrency: doc.sourceCurrency,
            targetCurrency: doc.targetCurrency,
          })),
          userId,
          userEmail,
          totalPrice,
          isMobile,
          clientName,
        };

        console.log('DEBUG: Tentando inserir na tabela stripe_sessions...');
        console.log('DEBUG: Dados a serem inseridos:', {
          session_id: session.id,
          document_ids: documentIds,
          user_id: userId,
          metadata: metadataToSave,
          payment_status: 'pending',
          amount: totalPrice,
          currency: 'usd'
        });

        // Inserir uma sessão para cada documento (ou uma sessão com múltiplos documentos)
        const { data: insertData, error: insertError } = await supabaseClient
          .from('stripe_sessions')
          .insert({
            session_id: session.id,
            document_id: documentIds[0] || null, // Primeiro documento como referência principal
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
        } else {
          console.log('DEBUG: Sessão inserida na tabela stripe_sessions com sucesso:', session.id);
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

