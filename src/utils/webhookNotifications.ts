import { supabase } from '../lib/supabase';

const WEBHOOK_URL = 'https://nwh.thefutureofenglish.com/webhook/notthelush';

interface NotificationPayload {
  user_name: string;
  user_email: string;
  notification_type: string;
  document_info?: {
    filename?: string;
    document_id?: string;
    status?: string;
  };
  payment_info?: {
    amount?: number;
    currency?: string;
    payment_id?: string;
  };
}

// Tipos de notificação
export const NOTIFICATION_TYPES = {
  UPLOAD: 'Document Upload Notification',
  PAYMENT: 'Payment Notification', 
  TRANSLATION_STARTED: 'Translation In Progress Notification',
  TRANSLATION_COMPLETED: 'Translation Completed Notification'
} as const;

// Função auxiliar para buscar dados do usuário
async function getUserInfo(userId: string): Promise<{ name: string; email: string }> {
  try {
    // Buscar dados do perfil na tabela profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', userId)
      .single();

    if (profile && profile.name && profile.email) {
      return {
        name: profile.name,
        email: profile.email
      };
    }

    // Se não encontrar no profiles, buscar nos dados de autenticação
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authUser.user) {
      throw new Error(`Usuário não encontrado: ${userId}`);
    }

    return {
      name: authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'Usuário',
      email: authUser.user.email || 'email@example.com'
    };
  } catch (error) {
    console.error('Erro ao buscar informações do usuário:', error);
    return {
      name: 'Usuário',
      email: 'email@example.com'
    };
  }
}

export async function sendWebhookNotification(payload: NotificationPayload): Promise<void> {
  try {
    console.log('🔔 Sending webhook notification:', payload);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_name: payload.user_name,
        user_email: payload.user_email,
        notification_type: payload.notification_type,
        timestamp: new Date().toISOString(),
        ...payload.document_info,
        ...payload.payment_info
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    console.log('✅ Webhook notification sent successfully');
  } catch (error) {
    console.error('❌ Error sending webhook notification:', error);
    // Não fazemos throw do erro para não quebrar o fluxo principal
  }
}

// Notificação de upload de documento
export async function notifyDocumentUpload(userId: string, filename: string, documentId?: string) {
  const userInfo = await getUserInfo(userId);

  await sendWebhookNotification({
    user_name: userInfo.name,
    user_email: userInfo.email,
    notification_type: NOTIFICATION_TYPES.UPLOAD,
    document_info: {
      filename: filename,
      document_id: documentId || '',
      status: 'pending'
    }
  });
}

// Notificação de pagamento
export async function notifyPayment(userId: string, paymentInfo: { amount: number; currency: string; payment_id: string }) {
  const userInfo = await getUserInfo(userId);

  await sendWebhookNotification({
    user_name: userInfo.name,
    user_email: userInfo.email,
    notification_type: NOTIFICATION_TYPES.PAYMENT,
    payment_info: {
      amount: paymentInfo.amount,
      currency: paymentInfo.currency,
      payment_id: paymentInfo.payment_id
    }
  });
}

// Notificação de início de tradução
export async function notifyTranslationStarted(userId: string, filename: string, documentId?: string) {
  const userInfo = await getUserInfo(userId);

  await sendWebhookNotification({
    user_name: userInfo.name,
    user_email: userInfo.email,
    notification_type: NOTIFICATION_TYPES.TRANSLATION_STARTED,
    document_info: {
      filename: filename,
      document_id: documentId || '',
      status: 'processing'
    }
  });
}

// Notificação de tradução completa
export async function notifyTranslationCompleted(userId: string, filename: string, documentId?: string) {
  const userInfo = await getUserInfo(userId);

  await sendWebhookNotification({
    user_name: userInfo.name,
    user_email: userInfo.email,
    notification_type: NOTIFICATION_TYPES.TRANSLATION_COMPLETED,
    document_info: {
      filename: filename,
      document_id: documentId || '',
      status: 'completed'
    }
  });
}
