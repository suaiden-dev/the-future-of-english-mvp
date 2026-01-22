import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PaymentNotificationPayload {
  payment_id: string;
  user_id: string;
  document_id: string;
  payment_method: 'stripe' | 'zelle';
  amount: number;
  filename: string;
  notification_type: 'payment_received' | 'payment_approved' | 'payment_rejected';
  status?: string;
}

interface NotificationRecipient {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

interface NotificationResult {
  recipient: string;
  role: string;
  status: 'success' | 'failed' | 'error';
  response?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  console.log(`[${new Date().toISOString()}] Payment Notifications Function called`);
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

    // Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get('PROJECT_URL');
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY');

    console.log('DEBUG: Verificando variáveis de ambiente...');
    console.log('DEBUG: PROJECT_URL:', supabaseUrl ? '✅ Configurada' : '❌ Não configurada');
    console.log('DEBUG: SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Configurada' : '❌ Não configurada');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('ERROR: Variáveis de ambiente não configuradas');
      throw new Error('Environment variables not configured');
    }

    // Criar cliente Supabase com service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Obter o payload da requisição
    const payload: PaymentNotificationPayload = await req.json();
    console.log('DEBUG: Payload recebido:', JSON.stringify(payload, null, 2));

    // Validar campos obrigatórios
    if (!payload.payment_id || !payload.user_id || !payload.document_id || !payload.payment_method) {
      throw new Error('Missing required fields in payload');
    }

    // Buscar dados do usuário que fez o pagamento
    console.log('DEBUG: Buscando dados do usuário que fez o pagamento...');
    const { data: payingUser, error: userError } = await supabase
      .from('profiles')
      .select('name, email, phone')
      .eq('id', payload.user_id)
      .single();

    if (userError || !payingUser) {
      console.error('ERROR: Erro ao buscar dados do usuário:', userError);
      throw new Error('Failed to fetch user data');
    }

    console.log('DEBUG: Dados do usuário encontrados:', {
      name: payingUser.name,
      email: payingUser.email,
      phone: payingUser.phone || 'Não informado'
    });

    // Determinar destinatários baseado no tipo de notificação
    let recipients: NotificationRecipient[] = [];
    
    if (payload.notification_type === 'payment_approved' || payload.notification_type === 'payment_rejected') {
      // Para aprovação/rejeição, notificar apenas o cliente
      console.log('DEBUG: Buscando dados do cliente para notificação de aprovação/rejeição...');
      const { data: clientProfile, error: clientError } = await supabase
        .from('profiles')
        .select('id, name, email, role, phone')
        .eq('id', payload.user_id)
        .single();

      if (clientError || !clientProfile) {
        console.error('ERROR: Erro ao buscar dados do cliente:', clientError);
        throw new Error('Failed to fetch client data');
      }

      recipients = [clientProfile];
      console.log('DEBUG: Cliente encontrado para notificação:', clientProfile.email);
    } else {
      // Para novos pagamentos, determinar destinatários baseado no status
      if (payload.payment_method === 'zelle' && payload.status === 'comprovante requer revisão manual') {
        // Para Zelle que precisa revisão manual, notificar apenas admins
        console.log('DEBUG: Buscando apenas administradores para revisão manual Zelle...');
        const { data: adminProfiles, error: recipientsError } = await supabase
          .from('profiles')
          .select('id, name, email, role')
          .in('role', ['admin', 'finance']);

        if (recipientsError || !adminProfiles || adminProfiles.length === 0) {
          console.error('ERROR: Erro ao buscar administradores:', recipientsError);
          throw new Error('Failed to fetch admin recipients');
        }

        recipients = adminProfiles;
        console.log('DEBUG: Administradores encontrados para revisão manual:', recipients.length);
      } else {
        // Para outros pagamentos (Stripe, Zelle válido), notificar admins e autenticadores
        console.log('DEBUG: Buscando administradores e autenticadores...');
        const { data: adminProfiles, error: recipientsError } = await supabase
          .from('profiles')
          .select('id, name, email, role')
          .in('role', ['admin', 'authenticator', 'finance']);

        if (recipientsError || !adminProfiles || adminProfiles.length === 0) {
          console.error('ERROR: Erro ao buscar destinatários:', recipientsError);
          throw new Error('Failed to fetch notification recipients');
        }

        recipients = adminProfiles;
        console.log('DEBUG: Administradores/autenticadores encontrados:', recipients.length);
      }
    }

    // Determinar o tipo de notificação e status
    let notificationType: string;
    let statusMessage: string;

    console.log('DEBUG: Processando notificação - tipo:', payload.notification_type, 'método:', payload.payment_method, 'status:', payload.status);

    switch (payload.notification_type) {
      case 'payment_received':
        if (payload.payment_method === 'stripe') {
          notificationType = 'Payment Stripe';
          statusMessage = 'pagamento aprovado automaticamente';
        } else {
          notificationType = 'Payment Zelle';
          statusMessage = payload.status || 'aguardando aprovação de pagamento';
        }
        console.log('DEBUG: Notificação Zelle - status final:', statusMessage);
        break;
      case 'payment_approved':
        notificationType = 'Payment Approved';
        statusMessage = 'pagamento aprovado';
        break;
      case 'payment_rejected':
        notificationType = 'Payment Rejected';
        statusMessage = 'pagamento rejeitado';
        break;
      default:
        notificationType = 'Payment Notification';
        statusMessage = payload.status || 'status desconhecido';
    }

    // Enviar notificações para cada destinatário
    const notificationResults: NotificationResult[] = [];
    const webhookUrl = 'https://nwh.thefutureofenglish.com/webhook/notificatfoe';

    for (const recipient of recipients) {
      let notificationPayload: any;
      
      if (payload.notification_type === 'payment_approved' || payload.notification_type === 'payment_rejected') {
        // Para aprovação/rejeição, notificar o cliente
        notificationPayload = {
          user_name: recipient.name || 'Cliente',
          user_email: recipient.email,
          notification_type: notificationType,
          timestamp: new Date().toISOString(),
          filename: payload.filename || 'Documento',
          document_id: payload.document_id,
          status: statusMessage,
          // Dados do cliente (que está sendo notificado)
          client_name: recipient.name || 'Cliente',
          client_phone: recipient.phone || 'Não informado',
          payment_amount: payload.amount || 0,
          payment_method: payload.payment_method,
          recipient_role: 'customer'
        };
      } else {
        // Para novos pagamentos, notificar admins/autenticadores
        notificationPayload = {
          user_name: recipient.name, // Nome do admin/autenticador que vai receber
          user_email: recipient.email, // Email do admin/autenticador que vai receber
          notification_type: notificationType,
          timestamp: new Date().toISOString(),
          filename: payload.filename || 'Documento',
          document_id: payload.document_id,
          status: statusMessage,
          // Dados do cliente que fez o pagamento
          client_name: payingUser.name || 'Cliente',
          client_phone: payingUser.phone || 'Não informado',
          payment_amount: payload.amount || 0,
          payment_method: payload.payment_method,
          recipient_role: recipient.role
        };
        
        console.log('DEBUG: Payload para admin/autenticador:', {
          user_name: notificationPayload.user_name,
          user_email: notificationPayload.user_email,
          client_name: notificationPayload.client_name,
          recipient_role: notificationPayload.recipient_role
        });
      }

      try {
        console.log(`DEBUG: Enviando notificação para ${recipient.role}: ${recipient.email}`);
        console.log('DEBUG: Payload da notificação:', JSON.stringify(notificationPayload, null, 2));

        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'Supabase-Payment-Notifications/1.0'
          },
          body: JSON.stringify(notificationPayload)
        });

        const responseText = await webhookResponse.text();
        
        if (webhookResponse.ok) {
          console.log(`SUCCESS: Notificação enviada com sucesso para ${recipient.email}`);
          notificationResults.push({
            recipient: recipient.email,
            role: recipient.role,
            status: 'success',
            response: responseText
          });
        } else {
          console.error(`WARNING: Falha ao enviar notificação para ${recipient.email}:`, webhookResponse.status, responseText);
          notificationResults.push({
            recipient: recipient.email,
            role: recipient.role,
            status: 'failed',
            error: `HTTP ${webhookResponse.status}: ${responseText}`
          });
        }
      } catch (notificationError) {
        console.error(`ERROR: Erro ao enviar notificação para ${recipient.email}:`, notificationError);
        notificationResults.push({
          recipient: recipient.email,
          role: recipient.role,
          status: 'error',
          error: notificationError.message
        });
      }
    }

    // Contar sucessos e falhas
    const successCount = notificationResults.filter(r => r.status === 'success').length;
    const failureCount = notificationResults.filter(r => r.status !== 'success').length;

    console.log(`SUCCESS: Notificações enviadas - ${successCount} sucessos, ${failureCount} falhas`);

    // Retornar resultado
    return new Response(
      JSON.stringify({
        success: true,
        message: `Notificações processadas: ${successCount} enviadas, ${failureCount} falharam`,
        payment_id: payload.payment_id,
        notification_type: notificationType,
        recipients_notified: successCount,
        recipients_failed: failureCount,
        results: notificationResults,
        timestamp: new Date().toISOString()
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
        success: false,
        error: error.message || 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
