import { supabase } from './supabase';

/**
 * Envia um email usando a Edge Function send-email
 */
export async function sendEmail(
    to: string,
    subject: string,
    html: string,
    fromName?: string
) {
    try {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: { to, subject, html, fromName },
        });

        if (error) {
            console.error('Error sending email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (err) {
        console.error('Error in sendEmail:', err);
        return { success: false, error: err };
    }
}

/**
 * Envia um email com anexos
 */
export async function sendEmailWithAttachment(
    to: string,
    subject: string,
    html: string,
    attachments: Array<{
        filename: string;
        content: string; // Base64
        contentType?: string;
    }>,
    fromName?: string
) {
    try {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: { to, subject, html, attachments, fromName },
        });

        if (error) {
            console.error('Error sending email with attachment:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (err) {
        console.error('Error in sendEmailWithAttachment:', err);
        return { success: false, error: err };
    }
}

/**
 * Template HTML para notificação de novo contato
 */
export function createContactNotificationEmail(data: {
    name: string;
    email: string;
    phone?: string;
    message: string;
    source?: string;
}) {

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
        }
        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .logo {
            width: 130px;
            height: auto;
        }
        .content {
            padding: 40px 30px;
            color: #1e293b;
        }
        .content h1 {
            margin: 0 0 20px 0;
            font-size: 24px;
            color: #1e3a8a;
        }
        .info-row {
            margin: 15px 0;
            padding: 15px;
            background-color: #f1f5f9;
            border-radius: 6px;
        }
        .info-label {
            font-weight: 600;
            color: #475569;
            margin-bottom: 5px;
        }
        .info-value {
            color: #1e293b;
            word-wrap: break-word;
        }
        .message-box {
            margin: 20px 0;
            padding: 20px;
            background-color: #f8fafc;
            border-left: 4px solid #3b82f6;
            border-radius: 4px;
        }
        .footer {
            padding: 20px 30px;
            background-color: #f8fafc;
            text-align: center;
            color: #64748b;
            font-size: 12px;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            background-color: #3b82f6;
            color: white;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h2 style="color: white; margin: 0; font-size: 20px;">Novo Contato Recebido</h2>
        </div>
        
        <div class="content">
            <h1>Novo Lead das Landing Pages</h1>
            
            ${data.source ? `<p><span class="badge">${data.source}</span></p>` : ''}
            
            <div class="info-row">
                <div class="info-label">Nome:</div>
                <div class="info-value">${data.name}</div>
            </div>
            
            <div class="info-row">
                <div class="info-label">Email:</div>
                <div class="info-value"><a href="mailto:${data.email}" style="color: #3b82f6; text-decoration: none;">${data.email}</a></div>
            </div>
            
            ${data.phone ? `
            <div class="info-row">
                <div class="info-label">Telefone:</div>
                <div class="info-value"><a href="tel:${data.phone}" style="color: #3b82f6; text-decoration: none;">${data.phone}</a></div>
            </div>
            ` : ''}
            
            <div class="message-box">
                <div class="info-label">Mensagem:</div>
                <div class="info-value" style="margin-top: 10px; white-space: pre-wrap;">${data.message}</div>
            </div>
            
            <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
                <strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
            </p>
        </div>
        
        <div class="footer">
            <p style="margin: 0;">Este é um email automático do sistema The Future of English</p>
            <p style="margin: 5px 0 0 0;">Por favor, responda diretamente ao lead o mais rápido possível</p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Envia notificação de novo contato para a equipe
 */
export async function sendContactNotification(contactData: {
    name: string;
    email: string;
    phone?: string;
    message: string;
    source?: string;
}) {
    // Email da equipe que receberá as notificações
    const notificationEmail = 'apps@thefutureofenglish.com';

    const html = createContactNotificationEmail(contactData);

    return await sendEmail(
        notificationEmail,
        `🔔 Novo Contato: ${contactData.name}`,
        html,
        'The Future of English - Sistema'
    );
}
